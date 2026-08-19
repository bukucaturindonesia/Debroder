import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260817154449_product_compatibility_enum_safety.sql",
  "utf8"
);
const compact = migration.replace(/\s+/g, " ").toLowerCase();

describe("product compatibility enum safety correction", () => {
  it("replaces the enum-unsafe compatibility function through a repository migration", () => {
    expect(compact).toContain("create or replace function public.sync_products_v1_compat()");
    expect(compact).toContain("set search_path = ''");
    expect(compact).toContain("new.status is null");
    expect(compact).not.toContain("nullif(new.status, '')");
  });

  it("preserves canonical product authority and trigger-only execution", () => {
    expect(compact).toContain("new.status_aktif := (new.status = 'active')");
    expect(compact).toContain("new.price := new.base_price");
    expect(compact).toContain("new.harga := new.base_price");
    expect(compact).toContain(
      "revoke all on function public.sync_products_v1_compat() from public, anon, authenticated, service_role"
    );
  });

  it("does not create a second product table, wrapper, or data seed", () => {
    expect(compact).not.toMatch(/create\s+table|insert\s+into\s+public\./i);
    expect(compact).not.toMatch(/create\s+function\s+public\.gen_random_bytes/i);
  });
});
