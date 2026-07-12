import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  resolve("supabase/migrations/20260712142905_v1_2_phase_5b_payment_completion.sql"),
  "utf8"
).toLowerCase();
const securitySql = readFileSync(
  resolve("supabase/migrations/20260712143745_v1_2_phase_5b_payment_audit_lock.sql"),
  "utf8"
).toLowerCase();

describe("Phase 5B migration security contract", () => {
  it("creates token, adjustment, and append-only history tables", () => {
    expect(sql).toContain("create table if not exists public.payment_submission_links");
    expect(sql).toContain("create table if not exists public.payment_adjustments");
    expect(sql).toContain("create table if not exists public.payment_activity_history");
    expect(sql).toContain("riwayat pembayaran bersifat append-only");
  });

  it("locks public submission behind hash, expiry, rate, and idempotency checks", () => {
    expect(sql).toContain("token_hash text not null unique");
    expect(sql).toContain("expires_at <= now()");
    expect(sql).toContain("submission_idempotency_key");
    expect(sql).toContain("interval '10 seconds'");
  });

  it("keeps mutations server-only and RLS read-only", () => {
    expect(sql).toContain("revoke all on function public.submit_customer_order_payment");
    expect(sql).toContain("grant execute on function public.submit_customer_order_payment");
    expect(sql).toContain("alter table public.payment_adjustments enable row level security");
    expect(sql).not.toMatch(/create policy[\s\S]+for all[\s\S]+payment_adjustments/);
  });

  it("enforces permanent link deletion and payment audit in database functions", () => {
    expect(securitySql).toContain("permanently_delete_payment_submission_link");
    expect(securitySql).toContain("array['superadmin','super_admin']");
    expect(securitySql).toContain("capture_order_payment_activity");
    expect(securitySql).toContain("payment_verified");
    expect(securitySql).toContain("alter table public.payment_number_sequences enable row level security");
    expect(securitySql).toContain("revoke execute on function public.create_order_payment");
    expect(securitySql).toContain("revoke all on function public.submit_public_payment_proof");
  });
});
