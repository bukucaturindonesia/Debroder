import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PRICING_PARITY_ALIGNMENTS } from "@/lib/pricing-policy";

const migrationPath =
  "supabase/migrations/20260723193533_p7b_policy_database_alignment_v1.sql";
const migration = readFileSync(migrationPath, "utf8");

describe("P7B policy and database alignment", () => {
  it("enforces canonical Ready Stock cart limits at the database boundary", () => {
    expect(migration).toContain(
      "create or replace function public.enforce_public_ready_stock_cart_limits_v1()"
    );
    expect(migration).toContain("new.quantity < 1 or new.quantity > 100");
    expect(migration).toContain("ready_line_count > 50");
    expect(migration).toContain("ready_unit_count > 500");
    expect(migration).toContain(
      "before insert or update of order_id, custom_project_id, quantity"
    );
  });

  it("evaluates minimum and quotation policy from canonical product rules", () => {
    expect(migration).toContain("from public.product_minimum_rules rule");
    expect(migration).toContain("rule.status = 'active'");
    expect(migration).toContain(
      "product_quantity.quantity < minimum_quantity_value"
    );
    expect(migration).toContain(
      "product_quantity.quantity >= quotation_quantity_value"
    );
    expect(migration).toContain("group by oi.product_id");
  });

  it("keeps one checkout mode and server validation fail-closed", () => {
    expect(migration).toContain("if has_ready and has_custom then");
    expect(migration).toContain(
      "Satu checkout hanya boleh menggunakan satu mode pesanan"
    );
    expect(migration).toContain(
      "create constraint trigger trg_enforce_public_ready_stock_policy_v1"
    );
    expect(migration).toContain("deferrable initially deferred");
  });

  it("makes finalized Ready Stock pricing snapshots immutable", () => {
    expect(migration).toContain(
      "create or replace function public.prevent_public_ready_stock_pricing_snapshot_mutation_v1()"
    );
    expect(migration).toContain("old.pricing_snapshot = '{}'::jsonb");
    expect(migration).toContain(
      "new.pricing_snapshot is distinct from old.pricing_snapshot"
    );
    expect(migration).toContain(
      "Historical Ready Stock pricing snapshot bersifat immutable"
    );
  });

  it("keeps trigger functions least-privileged and the migration additive", () => {
    expect(migration.trim().toLowerCase().startsWith("begin;")).toBe(true);
    expect(migration.trim().toLowerCase().endsWith("commit;")).toBe(true);
    expect(migration).toContain("security definer");
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).not.toMatch(/\bdrop\s+(table|column)\b/i);
    expect(migration).not.toMatch(/\b(delete|truncate)\s+from\b/i);
    expect(migration).not.toMatch(/\bupdate\s+public\.(orders|order_items)\b/i);
  });

  it("records both P7A blockers as resolved by the exact P7B migration", () => {
    expect(PRICING_PARITY_ALIGNMENTS).toHaveLength(2);
    expect(PRICING_PARITY_ALIGNMENTS.every(
      (alignment) =>
        alignment.status === "RESOLVED"
        && alignment.resolvedBy === "P7B"
        && alignment.migration ===
          "20260723193533_p7b_policy_database_alignment_v1.sql"
    )).toBe(true);
  });
});
