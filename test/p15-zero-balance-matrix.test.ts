import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath =
  "supabase/migrations/20260727073246_p15_zero_balance_matrix_completion_v1.sql";
const duplicatePrimaryPath =
  "supabase/migrations/20260724041102_p15_inventory_authority_stock_ownership_v1.sql";
const appliedPrimaryPath =
  "supabase/migrations/20260724054241_p15_inventory_authority_stock_ownership_v1.sql";

const migration = readFileSync(migrationPath, "utf8");

describe("P15 zero-balance matrix completion", () => {
  it("keeps one canonical applied primary migration in source", () => {
    expect(existsSync(appliedPrimaryPath)).toBe(true);
    expect(existsSync(duplicatePrimaryPath)).toBe(false);

    const primaryMigrations = readdirSync("supabase/migrations").filter((name) =>
      name.endsWith("_p15_inventory_authority_stock_ownership_v1.sql")
    );

    expect(primaryMigrations).toEqual([
      "20260724054241_p15_inventory_authority_stock_ownership_v1.sql"
    ]);
  });

  it("locks the exact proven remote cohort and fails closed on drift", () => {
    expect(migration).toContain("missing_count <> 96");
    expect(migration).toContain(
      "0487ad98308bf4a7265752e364c54e4d"
    );
    expect(migration).toContain("P15 zero-balance cohort drift");
    expect(migration).toContain("P15 zero-balance insertion mismatch");
    expect(migration).toContain(
      "P15 zero-balance completion changed inventory totals"
    );
    expect(migration).toContain(
      "P15 zero-balance matrix remains incomplete"
    );
  });

  it("creates only zero balances and never invents stock", () => {
    expect(migration).toContain(
      "insert into public.inventory_balances("
    );
    expect(migration).toContain(
      "on conflict(location_id, variant_size_id) do nothing"
    );
    expect(migration).toContain("'initial_on_hand_per_row', 0");
    expect(migration).toContain("'initial_reserved_per_row', 0");
    expect(migration).not.toMatch(
      /on_hand_quantity[\s\S]{0,120}\b20\b/i
    );
    expect(migration).not.toMatch(
      /update\s+public\.inventory_balances[\s\S]{0,180}set\s+on_hand_quantity/i
    );
    expect(migration).not.toMatch(
      /delete\s+from\s+public\.(inventory_balances|inventory_movements|stock_reservations)/i
    );
  });

  it("maintains the matrix for future active products, variants, SKUs, and locations", () => {
    for (const trigger of [
      "ensure_sellable_inventory_balance_matrix_v1",
      "ensure_variant_inventory_balance_matrix_v1",
      "ensure_product_inventory_balance_matrix_v1",
      "ensure_location_inventory_balance_matrix_v1"
    ]) {
      expect(migration).toContain(`create trigger ${trigger}`);
    }

    expect(migration).toContain(
      "create or replace function public.ensure_active_inventory_balance_matrix_v1("
    );
    expect(migration).toContain(
      "grant execute on function public.ensure_active_inventory_balance_matrix_v1("
    );
    expect(migration).toContain("to service_role");
  });

  it("locks security-definer search paths and removes browser execution", () => {
    expect(migration.match(/security definer/g)?.length).toBe(5);
    expect(migration.match(/set search_path = ''/g)?.length).toBe(5);
    expect(migration).toContain(
      "from public, anon, authenticated"
    );
  });

  it("records immutable audit evidence for the remote correction", () => {
    expect(migration).toContain(
      "'p15_zero_balance_matrix_completed'"
    );
    expect(migration).toContain(
      "'cohort_fingerprint', cohort_fingerprint"
    );
    expect(migration).toContain(
      "'before_on_hand', before_on_hand"
    );
    expect(migration).toContain(
      "'after_on_hand', after_on_hand"
    );
  });
});
