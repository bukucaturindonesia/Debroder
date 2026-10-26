import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/checkout/route";
import { canonicalCheckoutPayload, createCheckoutAbuseHashes } from "@/lib/checkout-abuse-protection";
import { parsePublicCheckoutRequest } from "@/lib/commerce-checkout";
import { deriveCheckoutTrackingToken, sha256 } from "@/lib/order-tracking";
import type { InstantServiceSelection } from "@/lib/instant-custom";

const db = vi.hoisted(() => ({ rpc: vi.fn(), maybeSingle: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  getAdminSupabaseClient: () => ({
    rpc: db.rpc,
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: db.maybeSingle }) }) })
  })
}));
vi.mock("@/lib/server-env", () => ({
  getAdminSupabaseEnv: () => ({ url: "https://database.invalid", serviceRoleKey: "local-test-only" })
}));
vi.mock("@/lib/customer-auth/server", () => ({ optionalVerifiedCustomer: async () => null }));

const secret = "local-test-only";
const key = "local_addon_integrity_12345";
const service: InstantServiceSelection = {
  serviceId: "33333333-3333-4333-8333-333333333333",
  inputs: { placement: "back", name: "LOCAL TEST" },
  uploadIds: ["55555555-5555-4555-8555-555555555555", "44444444-4444-4444-8444-444444444444"],
  uploadSessionToken: "local_upload_session",
  note: "Below collar"
};

function payload(services: InstantServiceSelection[] = [structuredClone(service)]) {
  return {
    idempotencyKey: key,
    accessToken: "a".repeat(64),
    customer: { name: "Local Test", phone: "628000000001", email: "test@example.invalid" },
    fulfillment: {
      method: "pickup", pickupLocationId: "11111111-1111-4111-8111-111111111111", paymentMethod: "bank_transfer"
    },
    items: [{ variantSizeId: "22222222-2222-4222-8222-222222222222", quantity: 2, services }]
  };
}

function request(body = payload()) {
  return new Request("https://checkout.invalid/api/checkout", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body)
  });
}

function hashes(body = payload()) {
  return createCheckoutAbuseHashes(request(body), parsePublicCheckoutRequest(body)!, secret);
}

// Frozen pre-fix contract, independent of the serializer under test. It omitted
// services for BOTH regular and add-on items; never use this as a server fallback.
function legacyHash() {
  const body = payload();
  const canonical = JSON.stringify({
    customer: { ...body.customer, notes: null },
    fulfillment: { method: "pickup", address: null, addressSnapshot: null,
      pickupLocationId: body.fulfillment.pickupLocationId, paymentMethod: "bank_transfer" },
    items: [{ variantSizeId: body.items[0].variantSizeId, quantity: 2, note: null }],
    customProjects: []
  });
  return createHmac("sha256", secret).update(`debroder:checkout-security:payload:${canonical}`).digest("hex");
}

describe("server add-on fingerprint", () => {
  it("is deterministic and does not mutate the submitted selections", () => {
    const body = payload();
    const before = structuredClone(body);
    expect(hashes(body)).toEqual(hashes(structuredClone(body)));
    expect(body).toEqual(before);
  });

  it.each([
    ["service", { serviceId: "66666666-6666-4666-8666-666666666666" }],
    ["inputs", { inputs: { placement: "front", name: "LOCAL TEST" } }],
    ["notes", { note: "Above hem" }],
    ["artwork/upload", { uploadIds: ["77777777-7777-4777-8777-777777777777"] }],
    ["upload ownership reference", { uploadSessionToken: "another_local_session" }]
  ] satisfies Array<[string, Partial<InstantServiceSelection>]>) ("distinguishes different %s", (_label, change) => {
    expect(hashes(payload([{ ...service, ...change }])).payloadHash).not.toBe(hashes().payloadHash);
  });

  it("distinguishes removing all services, including from legacy entries", () => {
    expect(hashes(payload([])).payloadHash).not.toBe(hashes().payloadHash);
    expect(hashes(payload([])).payloadHash).not.toBe(legacyHash());
    expect(hashes().payloadHash).not.toBe(legacyHash());
    expect(JSON.parse(canonicalCheckoutPayload(parsePublicCheckoutRequest(payload([]))!)))
      .toHaveProperty("readyStockPayloadVersion", 2);
  });

  it("canonicalizes line, service, input-key and upload ordering", () => {
    const other = { ...service, serviceId: "88888888-8888-4888-8888-888888888888" };
    const first = payload([other, service]);
    first.items.push({ ...first.items[0], variantSizeId: "99999999-9999-4999-8999-999999999999" });
    const second = structuredClone(first);
    second.items.reverse();
    for (const item of second.items) {
      item.services.reverse();
      for (const selection of item.services) {
        selection.inputs = { name: "LOCAL TEST", placement: "back" };
        selection.uploadIds.reverse();
      }
    }
    expect(hashes(first).payloadHash).toBe(hashes(second).payloadHash);
  });

  it("ignores browser hashes/prices and retains hash-only identity output", () => {
    const raw = { ...payload(), payloadHash: "browser-controlled", price: 1 };
    Object.assign(raw.items[0].services[0], { price: 1, stock: 999 });
    expect(hashes(raw)).toEqual(hashes());
    const output = JSON.stringify(hashes(raw));
    for (const value of Object.values(hashes(raw))) expect(value).toMatch(/^[a-f0-9]{64}$/);
    for (const sensitive of [secret, key, service.uploadSessionToken!, service.note!, raw.customer.phone]) {
      expect(output).not.toContain(sensitive);
    }
  });

  it("leaves non-Ready-Stock serialization unchanged", () => {
    const body = parsePublicCheckoutRequest(payload())!;
    body.items = [];
    const serialized = JSON.parse(canonicalCheckoutPayload(body));
    expect(serialized).not.toHaveProperty("readyStockPayloadVersion");
    expect(serialized.items).toEqual([]);
  });
});

describe("HTTP retry contract with an isolated in-memory ledger (not SQL concurrency proof)", () => {
  let ledger: Map<string, string>;
  let saved: { id: string; order_number: string; status: string; public_access_token_hash: string;
    public_access_token_expires_at: null; snapshot: string } | null;

  beforeEach(() => {
    ledger = new Map();
    saved = null;
    db.rpc.mockReset();
    db.maybeSingle.mockImplementation(async () => ({ data: saved, error: null }));
    db.rpc.mockImplementation(async (name: string, args: Record<string, unknown>) => {
      if (name === "enforce_public_checkout_abuse_guard") {
        const id = String(args.p_idempotency_key_hash);
        const old = ledger.get(id);
        const allowed = old === undefined || old === args.p_payload_hash;
        if (allowed) ledger.set(id, String(args.p_payload_hash));
        return { data: { allowed, idempotent_retry: old !== undefined,
          ...(!allowed ? { code: "idempotency_payload_conflict" } : {}) }, error: null };
      }
      if (name === "activate_public_checkout_order_v2") {
        return { data: { status: "awaiting_payment" }, error: null };
      }
      if (!saved) saved = Object.freeze({
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", order_number: "LOCAL-ONLY-001", status: "awaiting_payment",
        public_access_token_hash: String(args.p_access_token_hash), public_access_token_expires_at: null,
        snapshot: JSON.stringify(args.p_items)
      });
      return { data: { order_id: saved.id, order_number: saved.order_number, status: saved.status }, error: null };
    });
  });

  it("keeps identical same-key retries on the same order and canonical RPC selections", async () => {
    const first = await POST(request());
    const before = saved;
    const reordered = payload([{ ...service, uploadIds: [...service.uploadIds].reverse(),
      inputs: { name: "LOCAL TEST", placement: "back" } }]);
    const retry = await POST(request(reordered));
    expect(first.status).toBe(201);
    expect(retry.status).toBe(200);
    expect((await first.json()).orderId).toBe((await retry.json()).orderId);
    expect(saved).toBe(before);
    const calls = db.rpc.mock.calls.filter(([name]) => name === "create_public_instant_checkout_order");
    expect(calls).toHaveLength(2);
    expect(calls[0][1].p_items).toEqual(calls[1][1].p_items);
    expect(ledger.size).toBe(1);
  });

  it("rejects same-key semantic mismatches without touching saved snapshots or creating another order", async () => {
    await POST(request());
    const before = saved;
    for (const services of [[{ ...service, note: "Changed" }], []]) {
      const response = await POST(request(payload(services)));
      expect(response.status).toBe(409);
      expect(await response.json()).toMatchObject({ code: "CHECKOUT_IDEMPOTENCY_CONFLICT", preserveIdempotencyKey: true });
    }
    expect(saved).toBe(before);
    expect(db.rpc.mock.calls.filter(([name]) => name.startsWith("create_public_"))).toHaveLength(1);
  });

  it("rejects a competing different payload while the first creation is still in flight", async () => {
    let entered!: () => void;
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { entered = resolve; });
    const barrier = new Promise<void>((resolve) => { release = resolve; });
    const implementation = db.rpc.getMockImplementation()!;
    db.rpc.mockImplementation(async (name: string, args: Record<string, unknown>) => {
      if (name === "create_public_instant_checkout_order") { entered(); await barrier; }
      return implementation(name, args);
    });
    const first = POST(request());
    await pending;
    try {
      const competing = await POST(request(payload([{ ...service, inputs: { name: "DIFFERENT" } }])));
      expect(competing.status).toBe(409);
      expect(saved).toBeNull();
      expect(db.rpc.mock.calls.filter(([name]) => name === "create_public_instant_checkout_order")).toHaveLength(1);
    } finally { release(); }
    expect((await first).status).toBe(201);
  });

  it.each([false, true])("recovers a persisted legacy order (add-on=%s) without replaying/repricing it", async (addon) => {
    ledger.set(hashes().idempotencyKeyHash, legacyHash());
    const trackingToken = deriveCheckoutTrackingToken(key, secret);
    saved = Object.freeze({ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", order_number: "LOCAL-LEGACY-001",
      status: "awaiting_payment", public_access_token_hash: sha256(trackingToken), public_access_token_expires_at: null,
      snapshot: JSON.stringify(payload(addon ? [service] : []).items) });
    const before = saved;
    const retry = await POST(request(payload(addon ? [service] : [])));
    expect(retry.status).toBe(409);
    const recovery = await GET(new Request(`https://checkout.invalid/api/checkout?idempotencyKey=${key}`));
    expect(recovery.status).toBe(200);
    expect(await recovery.json()).toMatchObject({ found: true, orderNumber: saved.order_number, trackingToken });
    expect(db.rpc).toHaveBeenCalledWith("activate_public_checkout_order_v2", expect.objectContaining({ p_order_id: saved.id }));
    expect(db.rpc.mock.calls.some(([name]) => name.startsWith("create_public_"))).toBe(false);
    expect(saved).toBe(before);
    expect(ledger.get(hashes().idempotencyKeyHash)).toBe(legacyHash());
  });

  it("fails closed for a legacy attempt without a saved order; never upgrades its ambiguous hash", async () => {
    ledger.set(hashes().idempotencyKeyHash, legacyHash());
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ preserveIdempotencyKey: true });
    const recovery = await GET(new Request(`https://checkout.invalid/api/checkout?idempotencyKey=${key}`));
    expect(await recovery.json()).toEqual({ found: false });
    expect(saved).toBeNull();
    expect(ledger.get(hashes().idempotencyKeyHash)).toBe(legacyHash());
    expect(db.rpc).toHaveBeenCalledTimes(1);
  });

  it("does not bypass authorization for an older order with a non-derived tracking token", async () => {
    ledger.set(hashes().idempotencyKeyHash, legacyHash());
    saved = Object.freeze({ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", order_number: "LOCAL-LEGACY-002",
      status: "awaiting_payment", public_access_token_hash: sha256("old-random-token"),
      public_access_token_expires_at: null, snapshot: "unchanged historical snapshot" });
    const before = saved;
    expect((await POST(request())).status).toBe(409);
    const recovery = await GET(new Request(`https://checkout.invalid/api/checkout?idempotencyKey=${key}`));
    expect(recovery.status).toBe(409);
    expect(await recovery.json()).toMatchObject({ code: "CHECKOUT_RECOVERY_CONFLICT" });
    expect(saved).toBe(before);
    expect(db.rpc).toHaveBeenCalledTimes(1);
  });
});
