import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath = "supabase/migrations/20260819085144_wave_0_admin_order_read_grants.sql";
const migration = readFileSync(migrationPath, "utf8");
const manifest = readFileSync("DEBRODER_FRESH_DATABASE_REPLAY_MANIFEST.md", "utf8");

describe("admin order read privilege contract — STATIC CONTRACT EVIDENCE", () => {
  it("restores only authenticated SELECT while preserving RLS as the boundary", () => {
    expect(migration).toContain("grant select on public.orders, public.order_items to authenticated;");
    expect(migration).not.toMatch(/grant\s+(insert|update|delete|all|truncate)\b[^;]*\borders\b/i);
    expect(migration).not.toMatch(/grant\s+(insert|update|delete|all|truncate)\b[^;]*\border_items\b/i);
    expect(migration).not.toMatch(/grant\s+select\s+on\s+public\.(orders|order_items)[^;]*\bto\s+(public|anon)\b/i);
    expect(migration).toContain("begin;");
    expect(migration).toContain("commit;");
  });

  it("is reachable after the current replay tail", () => {
    expect(manifest).toContain("20260819064125_wave_0_service_role_qc_read_contract.sql` | RUN");
    expect(manifest).toContain("20260819085144_wave_0_admin_order_read_grants.sql` | RUN");
  });
});
