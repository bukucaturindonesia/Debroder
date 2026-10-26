import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { canonicalCheckoutServices, createCheckoutAbuseHashes } from "@/lib/checkout-abuse-protection";
import type { PublicCheckoutRequest } from "@/lib/commerce-checkout";

const read = (name: string) => readFileSync(`supabase/migrations/${name}`, "utf8").replace(/\r\n/g, "\n");
const migration = read("20261021034105_p0_instant_checkout_lock_v1.sql");
const originalMigration = read("20260726160000_global_ready_stock_instant_custom_v1.sql");
const definition = originalMigration.match(/create or replace function public\.create_public_instant_checkout_order\([\s\S]*?\$function\$;/)![0];
const bodyOf = (sql: string) => sql.match(/\$function\$([\s\S]*?)\$function\$/)![1];
const marker = migration.match(/lookup_marker constant text := '([^']+)';/)![1];
const lock = migration.match(/lock_statement constant text := '(.*)';/)![1].replace(/''/g, "'");
const acceptedBodies = [...migration.matchAll(/'([a-f0-9]{32})'/g)].map((match) => match[1]);

// Offline transformation only: no SQL is executed by these tests. The accepted
// source body is the exact repository definition, also captured in staging.
function patchDefinition(sql: string) {
  const digest = createHash("md5").update(bodyOf(sql)).digest("hex");
  if (!acceptedBodies.includes(digest)) throw new Error("unreviewed body");
  if (sql.split(marker).length !== 2) throw new Error("ambiguous lookup");
  return sql.replace(marker, `${lock}\n${marker}`);
}
const patched = patchDefinition(definition);

describe("instant13 forward migration static contract", () => {
  it("changes only one statement in the audited body, before the original early return", () => {
    expect(patched.replace(`${lock}\n`, "")).toBe(definition);
    const source = bodyOf(patched);
    expect(source.indexOf(lock)).toBeLessThan(source.indexOf(marker));
    const earlyReturn = source.indexOf("return result_value;");
    expect(earlyReturn).toBeLessThan(source.indexOf("result_value := public.create_public_checkout_order("));
    for (const mutation of ["update public.order_items", "update public.orders", "insert into public.system_audit_log"]) {
      expect(earlyReturn).toBeLessThan(source.indexOf(mutation));
    }
  });

  it("shares the exact base12 transaction lock and enforces that prerequisite", () => {
    const recovery = read("20261020163915_p0_regular_checkout_recovery_v1.sql");
    expect(recovery.replace(/''/g, "'")).toContain(lock.trim());
    expect(lock).toBe("  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('ready-stock-checkout:' || p_idempotency_key, 0));");
    expect(migration).toContain("regular checkout recovery base12 lock must be applied first");
    expect(patched).not.toMatch(/pg_advisory_unlock|pg_advisory_lock\(/);
  });

  it("preserves signatures, defaults, owner, ACL and function settings; other overloads remain unchanged", () => {
    expect(patched.split("as $function$")[0]).toBe(definition.split("as $function$")[0]);
    expect(patched).toContain("security definer\nset search_path = ''");
    expect((migration.match(/::regprocedure/g) ?? [])).toHaveLength(5); // regular12/13/14, instant13/14
    expect(migration).toContain("'contract', pg_catalog.to_jsonb(p) - 'prosrc'");
    expect(migration).toContain("case when p.oid = instant_oid then null else p.prosrc end");
    expect(migration).toContain("contracts_after is distinct from contracts_before");
    expect(migration).toContain("p.pronargdefaults <> 0");
    expect(migration).toContain("p.provolatile <> 'v'");
    expect(migration).toContain("array['search_path=\"\"']::text[]");
    for (const role of ["anon", "authenticated", "service_role"]) {
      expect(migration).toContain(`pg_catalog.has_function_privilege('${role}', p.oid, 'EXECUTE')`);
    }
    expect(migration).toContain("pg_catalog.aclexplode"); // also rejects PUBLIC/other direct grants
  });

  it("aborts on definition drift or reapplication instead of rewriting an unknown function", () => {
    expect(() => patchDefinition(definition.replace("service_total :=", "service_total := 1 +"))).toThrow("unreviewed body");
    expect(() => patchDefinition(patched)).toThrow("unreviewed body");
  });

  it("does not execute a checkout, backfill business rows, relax RLS or modify the immutable trigger", () => {
    const executable = migration.replace(/--[^\n]*/g, "");
    expect(executable).toMatch(/^begin;/);
    expect(executable.trim()).toMatch(/commit;$/);
    expect(executable).not.toMatch(/\b(insert into|delete from|update public\.|alter table|drop |grant |revoke |disable row level security)\b/i);
    expect(executable).toContain("execute patched_definition;");
    expect(patched.slice(patched.indexOf("if jsonb_typeof(p_items)"))).toBe(definition.slice(definition.indexOf("if jsonb_typeof(p_items)")));
    const immutable = read("20260723193533_p7b_policy_database_alignment_v1.sql");
    expect(immutable).toContain("new.pricing_snapshot is distinct from old.pricing_snapshot");
    expect(immutable).toContain("Historical Ready Stock pricing snapshot bersifat immutable");
    expect(migration).not.toContain("create or replace function public.prevent_public_ready_stock");
  });
});

function payload(): PublicCheckoutRequest {
  return {
    idempotencyKey: "local_concurrency_key_123", accessToken: "a".repeat(64),
    customer: { name: "Local Test", phone: "628000000001", email: "test@example.invalid" },
    fulfillment: { method: "pickup", pickupLocationId: "11111111-1111-4111-8111-111111111111", paymentMethod: "bank_transfer" },
    items: [{ variantSizeId: "22222222-2222-4222-8222-222222222222", quantity: 2, services: [{
      serviceId: "33333333-3333-4333-8333-333333333333", inputs: { placement: "back" },
      uploadIds: ["44444444-4444-4444-8444-444444444444"], uploadSessionToken: "local_session_123", note: "Below collar"
    }] }], customProjects: [], configuredItems: []
  };
}
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

type ModelOrder = Readonly<{ id: number; snapshot: string }>;
// A deliberately explicit transaction model, NOT a Postgres interpreter/test.
// The negative control executes the original lookup-before-lock schedule. The
// candidate schedule is selected from the transformed SQL statement ordering.
class CheckoutModel {
  orders = new Map<string, ModelOrder>();
  ledger = new Map<string, string>();
  tails = new Map<string, Promise<void>>();
  catalogVersion = 1;
  effects = { lookups: 0, baseCalls: 0, baseCreations: 0, pricing: 0, serviceSync: 0, audit: 0 };
  afterLookup: () => Promise<void> = async () => {};
  beforeCommit: () => Promise<void> = async () => {};
  constructor(private readonly sql: string) {}

  async checkout(body: PublicCheckoutRequest) {
    const hashes = createCheckoutAbuseHashes(new Request("https://local.invalid/api/checkout"), body, "local-only-secret");
    const previous = this.ledger.get(hashes.idempotencyKeyHash);
    if (previous && previous !== hashes.payloadHash) throw new Error("idempotency_payload_conflict");
    this.ledger.set(hashes.idempotencyKeyHash, hashes.payloadHash);

    const lockKey = `ready-stock-checkout:${body.idempotencyKey}`;
    let release: (() => void) | undefined;
    const acquire = async () => {
      if (release) return; // base12 reacquisition in the SAME transaction
      const prior = this.tails.get(lockKey) ?? Promise.resolve();
      const held = deferred();
      this.tails.set(lockKey, held.promise);
      await prior;
      release = () => {
        held.resolve();
        if (this.tails.get(lockKey) === held.promise) this.tails.delete(lockKey);
      };
    };
    try {
      if (this.sql.indexOf(lock) >= 0 && this.sql.indexOf(lock) < this.sql.indexOf(marker)) await acquire();
      this.effects.lookups++;
      const existing = this.orders.get(body.idempotencyKey);
      if (existing) return existing;
      await this.afterLookup();
      this.effects.baseCalls++;
      await acquire(); // base12 boundary
      const baseExisting = this.orders.get(body.idempotencyKey);
      if (!baseExisting) this.effects.baseCreations++;
      const snapshot = JSON.stringify({ catalogVersion: this.catalogVersion,
        lines: body.items.map((item) => ({ quantity: item.quantity, services: canonicalCheckoutServices(item.services) })) });
      if (baseExisting && baseExisting.snapshot !== snapshot) throw new Error("immutable snapshot");
      this.effects.pricing++;
      if (!baseExisting) this.effects.serviceSync++;
      this.effects.audit++;
      const order = baseExisting ?? Object.freeze({ id: this.orders.size + 1, snapshot });
      await this.beforeCommit();
      this.orders.set(body.idempotencyKey, order);
      return order;
    } finally { release?.(); }
  }
}

describe("isolated concurrency schedule model (NOT database-runtime proof)", () => {
  it("reproduces the old double-pricing schedule as a negative control", async () => {
    const model = new CheckoutModel(definition);
    const bothMissed = deferred();
    let arrivals = 0;
    model.afterLookup = async () => { if (++arrivals === 2) bothMissed.resolve(); await bothMissed.promise; };
    const [first, second] = await Promise.all([model.checkout(payload()), model.checkout(payload())]);
    expect(first.id).toBe(second.id);
    expect(model.effects).toMatchObject({ baseCalls: 2, baseCreations: 1, pricing: 2, serviceSync: 1, audit: 2 });
  });

  it("blocks the second same-key lookup until commit and skips ALL repeated side effects", async () => {
    const model = new CheckoutModel(patched);
    const entered = deferred();
    const commit = deferred();
    model.beforeCommit = async () => { entered.resolve(); await commit.promise; };
    const first = model.checkout(payload());
    await entered.promise;
    const second = model.checkout(payload());
    await Promise.resolve();
    expect(model.orders.size).toBe(0);
    expect(model.effects.lookups).toBe(1);
    commit.resolve();
    const [a, b] = await Promise.all([first, second]);
    expect(a).toBe(b);
    expect(model.orders.size).toBe(1);
    expect(model.effects).toEqual({ lookups: 2, baseCalls: 1, baseCreations: 1, pricing: 1, serviceSync: 1, audit: 1 });
    expect(model.tails.size).toBe(0);
  });

  it.each(["service", "inputs", "notes", "upload", "session", "remove"])("V2 rejects changed %s on the same key while creation is pending", async (field) => {
    const model = new CheckoutModel(patched);
    const entered = deferred();
    const commit = deferred();
    model.beforeCommit = async () => { entered.resolve(); await commit.promise; };
    const first = model.checkout(payload());
    await entered.promise;
    const changed = payload();
    const selection = changed.items[0].services![0];
    if (field === "service") selection.serviceId = "55555555-5555-4555-8555-555555555555";
    if (field === "inputs") selection.inputs.placement = "front";
    if (field === "notes") selection.note = "Above hem";
    if (field === "upload") selection.uploadIds = ["66666666-6666-4666-8666-666666666666"];
    if (field === "session") selection.uploadSessionToken = "different_local_session";
    if (field === "remove") changed.items[0].services = [];
    try {
      await expect(model.checkout(changed)).rejects.toThrow("idempotency_payload_conflict");
      expect(model.effects.lookups).toBe(1);
    } finally { commit.resolve(); }
    await first;
    expect(model.orders.size).toBe(1);
    expect(model.effects).toMatchObject({ baseCalls: 1, baseCreations: 1, pricing: 1, serviceSync: 1, audit: 1 });
  });

  it("returns an existing immutable snapshot without revalidation/repricing after catalog changes", async () => {
    const model = new CheckoutModel(patched);
    const first = await model.checkout(payload());
    const snapshot = first.snapshot;
    model.catalogVersion = 2;
    const retry = await model.checkout(payload());
    expect(retry).toBe(first);
    expect(retry.snapshot).toBe(snapshot);
    expect(Object.isFrozen(retry)).toBe(true);
    expect(model.effects).toMatchObject({ baseCalls: 1, baseCreations: 1, pricing: 1, serviceSync: 1, audit: 1 });
  });
});
