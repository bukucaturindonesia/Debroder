import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath =
  "supabase/migrations/20260724011535_p8b_size_adjustment_data_mutation_v1.sql";
const migration = readFileSync(migrationPath, "utf8");
const verification = readFileSync(
  "supabase/sql/05_p8b_size_adjustment_verification_read_only.sql",
  "utf8"
);

describe("P8B approved size-adjustment data mutation", () => {
  it("binds mutation to the exact owner-approved P8A cohort", () => {
    expect(migration).toContain("candidate_count <> 287");
    expect(migration).toContain(
      "c8de001d6a246fe4465873326b7ad634"
    );
    expect(migration).toContain("active_count <> 45 or draft_count <> 242");
    expect(migration).toContain("before_adjustment <> 0");
    expect(migration).toContain("('2XL', 10000, 190)");
    expect(migration).toContain("('3XL', 20000, 76)");
    expect(migration).toContain("('4XL', 30000, 21)");
  });

  it("aborts on duplicate, missing SKU, drift, or new override evidence", () => {
    expect(migration).toContain("P8B_ABORT_MISSING_SKU");
    expect(migration).toContain("P8B_ABORT_DUPLICATE_MASTER");
    expect(migration).toContain("P8B_ABORT_DUPLICATE_VARIANT_SIZE");
    expect(migration).toContain("P8B_ABORT_DUPLICATE_SKU");
    expect(migration).toContain("P8B_ABORT_OVERRIDE_EVIDENCE");
    expect(migration).toContain("event_code = 'VARIANT_PRICE_CHANGED'");
  });

  it("updates only sellable size adjustment and leaves exclusions untouched", () => {
    expect(migration).toContain(
      "update public.product_variant_sizes sellable"
    );
    expect(migration).toContain(
      "price_adjustment = candidate.after_adjustment"
    );
    expect(migration).not.toMatch(
      /update\s+public\.(orders|order_items|products|product_variants|product_size_master)\b/i
    );
    expect(migration).not.toContain("'XS', 0, 25");
    expect(migration).not.toContain("Mix Size");
  });

  it("writes one before/after audit per changed SKU in the same transaction", () => {
    expect(migration.trim().toLowerCase().startsWith("begin;")).toBe(true);
    expect(migration.trim().toLowerCase().endsWith("commit;")).toBe(true);
    expect(migration).toContain("insert into public.system_audit_log");
    expect(migration).toContain("'SIZE_ADJUSTMENT_POLICY_APPLIED'");
    expect(migration).toContain("'price_adjustment', candidate.before_adjustment");
    expect(migration).toContain("'price_adjustment', candidate.after_adjustment");
    expect(migration).toContain("inserted_audit_count <> 287");
    expect(migration).toContain("updated_count <> 287");
  });

  it("keeps the postcheck read-only and verifies audit plus excluded Mix Size", () => {
    expect(verification).toContain("managed_mismatch_count");
    expect(verification).toContain("audit_row_count");
    expect(verification).toContain("audit_fingerprint");
    expect(verification).toContain("unlinked_mix_size_nonzero_adjustment_count");
    expect(verification).not.toMatch(
      /\b(insert|update|delete|truncate|alter|drop|create|grant|revoke)\b/i
    );
  });
});
