import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const baseline = readFileSync(
  "supabase/migrations/20260816102253_debroder_fresh_database_baseline.sql",
  "utf8"
);
const phase5bCompletion = readFileSync(
  "supabase/migrations/20260712142905_v1_2_phase_5b_payment_completion.sql",
  "utf8"
);
const currentPaymentV2 = readFileSync(
  "supabase/migrations/20260719140000_payment_verification_and_fulfillment.sql",
  "utf8"
);
const phase5bLock = readFileSync(
  "supabase/migrations/20260712143745_v1_2_phase_5b_payment_audit_lock.sql",
  "utf8"
);
const currentPublicRoute = readFileSync(
  "app/api/public/payments/[token]/route.ts",
  "utf8"
);
const historicalSchema = readFileSync("supabase/schema.sql", "utf8");

const compact = (source: string) => source.replace(/\s+/gu, " ").toLowerCase();
const compactBaseline = compact(baseline);
const compactPhase5bCompletion = compact(phase5bCompletion);
const compactPhase5bLock = compact(phase5bLock);

describe("public payment proof foundation correction", () => {
  it("records the exact historical contract without replaying it", () => {
    expect(historicalSchema).toMatch(
      /create\s+or\s+replace\s+function\s+public\.submit_public_payment_proof\(\s*p_order_id\s+uuid,\s*p_order_number\s+text,\s*p_customer_phone\s+text,\s*p_payment_proof_path\s+text\s*\)[\s\S]*?returns\s+boolean/iu
    );
    expect(historicalSchema).toMatch(
      /submit_public_payment_proof\(uuid,\s*text,\s*text,\s*text\)[\s\S]*?to\s+anon,\s*authenticated/iu
    );
    expect(baseline).not.toMatch(
      /create\s+or\s+replace\s+function\s+public\.submit_public_payment_proof/iu
    );
    expect(compactPhase5bLock).toContain(
      "public.submit_public_payment_proof(uuid,text,text,text)"
    );
    expect(compactPhase5bLock).toContain("pg_catalog.to_regprocedure(");
    expect(compactPhase5bLock).toContain(
      "execute 'revoke all on function public.submit_public_payment_proof(uuid,text,text,text) from public,anon,authenticated'"
    );
  });

  it("keeps the canonical customer flow token-bound and server-only", () => {
    expect(currentPublicRoute).toContain("hashPaymentToken(token)");
    expect(currentPublicRoute).toContain("payment_submission_links");
    expect(currentPublicRoute).toContain('rpc("submit_customer_order_payment_v2"');
    expect(currentPublicRoute).toContain('.storage.from("payment-proofs").upload');
    expect(currentPublicRoute).toContain("public/${resolved.link.order_id}/");

    const currentV2 = compact(currentPaymentV2);
    expect(currentV2).toContain("where token_hash=p_token_hash");
    expect(currentV2).toContain("link_row.order_id");
    expect(currentV2).toContain("submission_idempotency_key");
    expect(currentV2).toContain("result_payment.order_id<>link_row.order_id");
    expect(currentV2).toContain("p_proof_bucket<>'payment-proofs'");
    expect(currentV2).toContain("'pending'");
    expect(compactPhase5bLock).not.toMatch(
      /grant\s+execute\s+on\s+function\s+public\.submit_public_payment_proof[^;]*\s+to\s+(?:public|anon|authenticated)/iu
    );
  });

  it("proves every Phase 5B security target is resolvable or explicitly conditional", () => {
    const baselineTargets = [
      "create_order_payment(uuid,bigint,timestamptz,text,text,text,text,text,text,text,text,text,bigint)",
      "update_order_payment_draft(uuid,bigint,timestamptz,text,text,text,text,text)",
      "verify_order_payment(uuid,text)",
      "reject_order_payment(uuid,text)",
      "archive_order_payment(uuid,text)",
      "restore_order_payment(uuid)",
      "permanently_delete_order_payment(uuid)",
      "next_payment_number()",
      "refresh_order_payment_summary(uuid)"
    ];

    for (const target of baselineTargets) {
      expect(compactBaseline).toContain(`public.${target}`);
      expect(compactPhase5bLock).toContain(`public.${target}`);
    }

    expect(compactPhase5bCompletion).toContain(
      "create or replace function public.payment_actor_role(p_actor uuid)"
    );
    expect(compactPhase5bCompletion).toContain(
      "create or replace function public.payment_actor_has_role(p_actor uuid, p_roles text[])"
    );
    expect(compactPhase5bLock).toContain(
      "create or replace function public.permanently_delete_payment_submission_link"
    );
    expect(compactPhase5bLock).toContain(
      "create or replace function public.capture_order_payment_activity"
    );

    expect(compactPhase5bLock).toContain(
      "if pg_catalog.to_regprocedure( 'public.submit_public_payment_proof(uuid,text,text,text)' ) is not null"
    );
    expect(compactPhase5bLock).not.toMatch(
      /create\s+(?:or\s+replace\s+)?function\s+public\.submit_public_payment_proof/iu
    );
  });

  it("does not reintroduce the historical anonymous mutation or a second payment authority", () => {
    expect(compactBaseline).not.toContain("submit_public_payment_proof");
    expect(compactBaseline).toContain("create table if not exists public.order_payments");
    expect((compactBaseline.match(/create table if not exists public\.order_payments/g) ?? []).length)
      .toBe(1);
    expect(compactPhase5bLock).toContain(
      "revoke all on function public.submit_public_payment_proof(uuid,text,text,text) from public,anon,authenticated"
    );
    expect(compactPhase5bLock).not.toMatch(
      /grant\s+(?:execute|all)[^;]*submit_public_payment_proof[^;]*\b(?:public|anon|authenticated)\b/iu
    );
  });
});
