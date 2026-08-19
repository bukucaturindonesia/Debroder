import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const correction = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260818082607_wave_0_public_store_scope_customer_rls.sql"
  ),
  "utf8"
);

describe("customer/store-scope RLS correction (STATIC CONTRACT EVIDENCE)", () => {
  it("exempts customer identities without a staff profile role from restrictive staff scope", () => {
    expect(correction).toContain("public.current_actor_role() is null");
    expect(correction).toContain("'global dashboard store scope stores'");
    expect(correction).toContain("public.can_access_store(id)");
  });

  it("keeps store-admin scope restrictive across the same policy family", () => {
    expect(correction).toContain("'global dashboard store scope orders'");
    expect(correction).toContain("'global dashboard store scope inventory locations'");
    expect(correction).toContain("global dashboard store scope work items");
    expect(correction).toContain("global dashboard store scope qc records");
    expect(correction).toMatch(/as\s+restrictive\s+for\s+select\s+to\s+authenticated/giu);
  });
});
