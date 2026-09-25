import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260819060740_wave_0_ready_stock_pricing_status_compatibility.sql"
  ),
  "utf8"
);

describe("Ready Stock pricing-status compatibility (STATIC CONTRACT EVIDENCE)", () => {
  it("patches the canonical 12-argument creator without widening the status check", () => {
    expect(migration).toContain(
      "public.create_public_checkout_order(text,text,text,text,text,text,text,text,uuid,text,text,jsonb)"
    );
    expect(migration).toContain("legacy_literal text := $literal$'confirmed'$literal$");
    expect(migration).toContain("canonical_literal text := $literal$'final'$literal$");
    expect(migration).toContain("Required checkout creator is missing");
    expect(migration).not.toContain("add constraint order_items_pricing_status_check");
    expect(migration).not.toContain("'confirmed','estimated','quotation_required'");
  });

  it("fails closed when the recovered function body drifts", () => {
    expect(migration).toContain("pricing compatibility marker is not exactly one occurrence");
    expect(migration).toContain("pricing compatibility patch made no change");
    expect(migration).toContain("execute patched_definition");
  });
});
