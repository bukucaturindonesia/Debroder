import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const baseline = readFileSync(
  "supabase/migrations/20260816102253_debroder_fresh_database_baseline.sql",
  "utf8"
);
const containment = readFileSync(
  "supabase/migrations/20260721090000_p0_security_critical_legacy_containment_c1.sql",
  "utf8"
);
const manifest = readFileSync("DEBRODER_FRESH_DATABASE_REPLAY_MANIFEST.md", "utf8");
const ledger = readFileSync("DEBRODER_BASELINE_COVERAGE_LEDGER.md", "utf8");
const currentPublicRoute = readFileSync(
  "app/api/public/payments/[token]/route.ts",
  "utf8"
);

const compact = (source: string) => source.replace(/\s+/gu, " ").toLowerCase();
const compactContainment = compact(containment);

describe("STATIC CONTRACT EVIDENCE — legacy payment-proof containment", () => {
  it("accepts the intentionally absent retired objects on a fresh install", () => {
    expect(baseline).not.toMatch(
      /create\s+(?:or\s+replace\s+)?function\s+public\.(?:create_public_order|submit_public_payment_proof)/iu
    );
    expect(compactContainment).toContain("if create_order_oid is not null then");
    expect(compactContainment).toContain("if submit_proof_oid is not null then");
    expect(compactContainment).not.toMatch(
      /raise exception 'expected (?:create_public_order|submit_public_payment_proof) signature is missing'/iu
    );
    expect(compactContainment).toContain("if policy_count > 0 then");
    expect(compactContainment).not.toContain("order-uploads bucket is missing");
    expect(compactContainment).toContain("if found and bucket_is_public then");
  });

  it("preserves anti-drift validation when a legacy function exists", () => {
    expect(containment).toContain("pg_catalog.pg_get_functiondef($1::oid)");
    expect(containment).toContain(
      "7a46727b98bd2cff278f7052c25711d175613f3aac6ee888615d5448641055f9"
    );
    expect(containment).toContain(
      "aecdbdcf357d7fbf8e835e404a13045f231eccdb4faf00059f6aa2a63ba2c1ca"
    );
    expect(compactContainment).toContain("create_public_order definition changed");
    expect(compactContainment).toContain("submit_public_payment_proof definition changed");
    expect(compactContainment).toContain("pg_catalog.pg_get_userbyid(p.proowner)");
    expect(compactContainment).toContain("unexpected create_public_order owner");
    expect(compactContainment).toContain("unexpected submit_public_payment_proof owner");
    expect(compactContainment).toContain("unexpected create_public_order acl state");
    expect(compactContainment).toContain("unexpected submit_public_payment_proof acl state");
    expect(compactContainment).toContain(
      "the historical schema grants anon/authenticated and does not grant service_role"
    );
  });

  it("contains existing legacy RPCs and the historical upload policy conditionally", () => {
    expect(compactContainment).toContain(
      "execute 'revoke all privileges on function public.create_public_order(text,text,text,uuid,text,text,text,integer,text,text,text,text) from public,anon,authenticated'"
    );
    expect(compactContainment).toContain(
      "execute 'grant execute on function public.create_public_order(text,text,text,uuid,text,text,text,integer,text,text,text,text) to service_role'"
    );
    expect(compactContainment).toContain(
      "execute 'revoke all privileges on function public.submit_public_payment_proof(uuid,text,text,text) from public,anon,authenticated'"
    );
    expect(compactContainment).toContain(
      "execute 'grant execute on function public.submit_public_payment_proof(uuid,text,text,text) to service_role'"
    );
    expect(compactContainment).toContain("if legacy_policy_exists then");
    expect(compactContainment).toContain(
      "execute 'drop policy \"customers can upload order files\" on storage.objects'"
    );
    expect(compactContainment).toContain(
      "unexpected order-uploads anonymous insert policy state"
    );
    expect(compactContainment).toContain(
      "order-uploads bucket unexpectedly became public"
    );
  });

  it("fails closed for unexpected identity or partial ACL state", () => {
    expect(compactContainment).toContain("not ( (");
    expect(compactContainment).toContain("unexpected create_public_order acl state");
    expect(compactContainment).toContain("unexpected submit_public_payment_proof acl state");
    expect(compactContainment).toContain("unexpected order-uploads policy count");
    expect(compactContainment).toContain("unexpected order-uploads anonymous insert policy state");
    expect(compactContainment).not.toMatch(
      /exception\s+when\s+others|exception\s+when\s+sqlstate/iu
    );
    expect(compactContainment).not.toMatch(
      /grant\s+execute\s+on\s+function[^;]+\s+to\s+(?:public|anon|authenticated)/iu
    );
  });

  it("keeps the canonical current payment API and replay boundary unchanged", () => {
    expect(currentPublicRoute).toContain('rpc("submit_customer_order_payment_v2"');
    expect(currentPublicRoute).toContain('.storage.from("payment-proofs").upload');
    expect(compact(baseline)).toContain("create table if not exists public.order_payments");
    expect(compact(baseline)).not.toContain("submit_public_payment_proof");
    expect(compact(manifest)).toContain(
      "20260721090000_p0_security_critical_legacy_containment_c1.sql` | run"
    );
    expect(ledger).toContain("LEGACY_CONTAINMENT_OBJECT_MATRIX");
  });
});
