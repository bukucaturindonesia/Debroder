import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const baseline = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260816102253_debroder_fresh_database_baseline.sql"),
  "utf8"
);

describe("order currency foundation contract", () => {
  it("represents the currency field required by current order/payment readers", () => {
    expect(baseline).toMatch(/create table if not exists public\.orders[\s\S]*?currency text not null default 'IDR' check \(currency = 'IDR'\)/i);
  });

  it("does not introduce a second currency authority", () => {
    const ordersDefinition = baseline.match(/create table if not exists public\.orders[\s\S]*?\n\);/i)?.[0] ?? "";
    expect(ordersDefinition.match(/\bcurrency text not null default 'IDR'/gi)).toHaveLength(1);
    expect(baseline).not.toMatch(/alter table public\.order_payments[\s\S]*?add column[\s\S]*?currency/i);
  });
});
