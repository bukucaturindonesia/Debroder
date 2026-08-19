import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const baseline = readFileSync(
  "supabase/migrations/20260816102253_debroder_fresh_database_baseline.sql",
  "utf8"
);
const phase5b = readFileSync(
  "supabase/migrations/20260712142905_v1_2_phase_5b_payment_completion.sql",
  "utf8"
);
const phase5bLock = readFileSync(
  "supabase/migrations/20260712143745_v1_2_phase_5b_payment_audit_lock.sql",
  "utf8"
);
const laterPaymentIntegrity = readFileSync(
  "supabase/migrations/20260719140000_payment_verification_and_fulfillment.sql",
  "utf8"
);
const manifest = readFileSync("DEBRODER_FRESH_DATABASE_REPLAY_MANIFEST.md", "utf8");
const ledger = readFileSync("DEBRODER_BASELINE_COVERAGE_LEDGER.md", "utf8");

const compact = (source: string) => source.replace(/\s+/gu, " ").toLowerCase();
const compactBaseline = compact(baseline);

function functionBlock(functionName: string): string {
  const start = baseline.search(
    new RegExp(`create\\s+or\\s+replace\\s+function\\s+public\\.${functionName}\\b`, "iu")
  );
  if (start < 0) return "";
  const next = baseline.indexOf("\ncreate or replace function public.", start + 1);
  return baseline.slice(start, next < 0 ? baseline.length : next);
}

const paymentFunctions = [
  ["update_order_payment_draft", "payment.create"],
  ["verify_order_payment", "payment.verify"],
  ["reject_order_payment", "payment.reject"],
  ["archive_order_payment", "payment.archive"],
  ["restore_order_payment", "payment.archive"],
  ["permanently_delete_order_payment", "is_superadmin"]
] as const;

describe("Phase 5A payment foundation baseline contract", () => {
  it("defines the exact callable family before the Phase 5B ACL migration", () => {
    const signatures = [
      /create\s+or\s+replace\s+function\s+public\.update_order_payment_draft\(\s*p_payment_id\s+uuid,\s*p_amount\s+bigint,\s*p_paid_at\s+timestamptz,\s*p_method\s+text,\s*p_channel_name\s+text\s+default\s+null,\s*p_reference_number\s+text\s+default\s+null,\s*p_customer_notes\s+text\s+default\s+null,\s*p_admin_notes\s+text\s+default\s+null\s*\)/iu,
      /create\s+or\s+replace\s+function\s+public\.verify_order_payment\(\s*p_payment_id\s+uuid,\s*p_admin_notes\s+text\s+default\s+null\s*\)/iu,
      /create\s+or\s+replace\s+function\s+public\.reject_order_payment\(\s*p_payment_id\s+uuid,\s*p_reason\s+text\s*\)/iu,
      /create\s+or\s+replace\s+function\s+public\.archive_order_payment\(\s*p_payment_id\s+uuid,\s*p_reason\s+text\s+default\s+null\s*\)/iu,
      /create\s+or\s+replace\s+function\s+public\.restore_order_payment\(\s*p_payment_id\s+uuid\s*\)/iu,
      /create\s+or\s+replace\s+function\s+public\.permanently_delete_order_payment\(\s*p_payment_id\s+uuid\s*\)/iu
    ];

    for (const signature of signatures) expect(baseline).toMatch(signature);
    expect(compact(phase5bLock)).toContain(
      "revoke execute on function public.update_order_payment_draft(uuid,bigint,timestamptz,text,text,text,text,text)"
    );
    expect(compact(manifest).indexOf("20260816102253_debroder_fresh_database_baseline.sql"))
      .toBeLessThan(compact(manifest).indexOf("20260712143745_v1_2_phase_5b_payment_audit_lock.sql"));
  });

  it("represents the Phase 5A tables, fields, constraints, indexes, and trigger", () => {
    expect(compactBaseline).toContain("create table if not exists public.payment_number_sequences");
    expect(compactBaseline).toContain("create table if not exists public.order_payments");
    expect(compactBaseline).toContain("payment_number text not null unique");
    expect(compactBaseline).toContain("order_id uuid not null references public.orders(id) on delete cascade");
    expect(compactBaseline).toContain("amount bigint not null check (amount > 0)");
    expect(compactBaseline).toContain("method text not null check (method in ('bank_transfer','cash','qris','ewallet','other'))");
    expect(compactBaseline).toContain("create index if not exists order_payments_order_id_idx");
    expect(compactBaseline).toContain("create index if not exists order_payments_status_idx");
    expect(compactBaseline).toContain("create index if not exists order_payments_archived_at_idx");
    expect(compactBaseline).toContain("create trigger order_payments_set_updated_at");
    expect(compactBaseline).toContain("alter table public.order_payments enable row level security");
    expect(compactBaseline).toContain("create or replace function public.next_payment_number");
    expect(compactBaseline).toContain("create or replace function public.refresh_order_payment_summary");
    expect(compactBaseline).toContain("create or replace function public.create_order_payment");
  });

  it("keeps the payment authority singular and the incremental boundary explicit", () => {
    expect((compactBaseline.match(/create table if not exists public\.order_payments/g) ?? []).length).toBe(1);
    expect(compactBaseline).not.toContain("payment_ledger");
    expect(compact(phase5b)).toContain("create table if not exists public.payment_submission_links");
    expect(compact(phase5b)).toContain("create table if not exists public.payment_adjustments");
    expect(compact(phase5b)).toContain("create table if not exists public.payment_activity_history");
    expect(ledger).toContain("one canonical `public.order_payments` authority");
  });

  it("requires explicit secure-definer authorization and denies public/anonymous mutation", () => {
    for (const [functionName, authorization] of paymentFunctions) {
      const block = functionBlock(functionName);
      expect(block, `${functionName} must exist in the baseline`).not.toBe("");
      expect(block).toMatch(/security\s+definer/iu);
      expect(block).toMatch(/set\s+search_path\s*=\s*''/iu);
      if (authorization === "is_superadmin") {
        expect(block).toMatch(/public\.is_superadmin\(\)/iu);
      } else {
        expect(block).toContain(`public.has_permission('${authorization}')`);
      }
      expect(compactBaseline).toContain(
        `revoke all on function public.${functionName}`
      );
      expect(compactBaseline).not.toMatch(
        new RegExp(`grant execute on function public\\.${functionName}[^;]+ to (?:public|anon)`, "iu")
      );
    }
  });

  it("prevents draft compatibility writes from rewriting verified financial state", () => {
    const block = functionBlock("update_order_payment_draft");
    expect(block).toMatch(/status\s+in\s*\(\s*'draft'\s*,\s*'pending'\s*\)/iu);
    expect(block).toMatch(/archived_at\s+is\s+null/iu);
    expect(block).not.toMatch(/set\s+status\s*=/iu);
    expect(block).toMatch(/p_amount\s+is\s+null\s+or\s+p_amount\s*<=\s*0/iu);
    expect(block).toMatch(/p_method\s+is\s+null\s+or\s+p_method\s+not\s+in/iu);
    expect(block).toContain("public.can_access_order(order_id_value)");
  });

  it("retains duplicate and amount integrity protections at the canonical boundaries", () => {
    expect(compactBaseline).toContain("payment_number text not null unique");
    expect(compactBaseline).toContain("amount bigint not null check (amount > 0)");
    expect(compact(phase5b)).toContain("submission_idempotency_key");
    expect(compact(laterPaymentIntegrity)).toContain("order_payments_verified_reference_unique_idx");
    expect(compact(laterPaymentIntegrity)).toContain("where status='verified'");
  });
});
