import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath = "supabase/migrations/20260819091348_wave_0_trigger_function_acl_containment.sql";
const migration = readFileSync(migrationPath, "utf8");
const manifest = readFileSync("DEBRODER_FRESH_DATABASE_REPLAY_MANIFEST.md", "utf8");

const triggerFunctions = [
  "audit_role_permission_change",
  "capture_order_payment_activity",
  "enforce_paid_ready_stock_handover",
  "register_existing_document_number"
];

describe("trigger-only function ACL containment — STATIC CONTRACT EVIDENCE", () => {
  it("revokes direct execution for every recovered trigger-only SECURITY DEFINER function", () => {
    for (const functionName of triggerFunctions) {
      expect(migration).toContain(
        `revoke all on function public.${functionName}() from public, anon, authenticated, service_role;`
      );
    }
    expect(migration).not.toMatch(/grant\s+execute/i);
  });

  it("is reachable after the admin order read correction", () => {
    expect(manifest).toContain("20260819085144_wave_0_admin_order_read_grants.sql` | RUN");
    expect(manifest).toContain("20260819091348_wave_0_trigger_function_acl_containment.sql` | RUN");
  });
});
