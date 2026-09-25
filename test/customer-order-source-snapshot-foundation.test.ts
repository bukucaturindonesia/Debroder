import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const baseline = readFileSync(
  "supabase/migrations/20260816102253_debroder_fresh_database_baseline.sql",
  "utf8"
);
const customerMigration = readFileSync(
  "supabase/migrations/20260806214500_customer_account_email_verification_v1.sql",
  "utf8"
);

describe("customer order source snapshot foundation (STATIC CONTRACT EVIDENCE)", () => {
  it("establishes the order snapshot column before customer claim consumers", () => {
    const ordersStart = baseline.indexOf("create table if not exists public.orders");
    const ordersEnd = baseline.indexOf("create table if not exists public.order_items", ordersStart);
    const orders = baseline.slice(ordersStart, ordersEnd);
    expect(orders).toContain("source_snapshot jsonb not null default '{}'::jsonb");
    expect(customerMigration).toContain("source_snapshot = coalesce(source_snapshot, '{}'::jsonb)");
  });

  it("does not replace the snapshot with a second order authority", () => {
    expect(baseline).not.toMatch(/create table if not exists public\.order_source_snapshots/i);
    expect(baseline).not.toMatch(/create table if not exists public\.customer_order_snapshots/i);
  });
});
