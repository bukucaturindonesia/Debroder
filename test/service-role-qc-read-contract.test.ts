import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath = "supabase/migrations/20260819064125_wave_0_service_role_qc_read_contract.sql";
const migration = readFileSync(migrationPath, "utf8");
const manifest = readFileSync("DEBRODER_FRESH_DATABASE_REPLAY_MANIFEST.md", "utf8");

describe("service-role QC read contract — STATIC CONTRACT EVIDENCE", () => {
  it("grants only the trusted server role the missing QC relation read", () => {
    expect(migration).toContain("grant select on public.qc_records to service_role;");
    expect(migration).not.toMatch(/grant\s+(all|insert|update|delete|truncate)\b[^;]*qc_records[^;]*service_role/i);
    expect(migration).not.toMatch(/grant\s+select\s+on\s+public\.qc_records\s+to\s+(public|anon|authenticated)\b/i);
  });

  it("is reachable after the latest replay correction and preserves a single QC authority", () => {
    expect(manifest).toContain("20260819064125_wave_0_service_role_qc_read_contract.sql` | RUN");
    expect(manifest).toContain("20260819060740_wave_0_ready_stock_pricing_status_compatibility.sql` | RUN");
    expect(migration).not.toContain("create table");
    expect(migration).not.toContain("create function");
  });
});
