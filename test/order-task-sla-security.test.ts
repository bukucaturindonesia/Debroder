import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath =
  "supabase/migrations/20260817151630_order_task_sla_policies_security.sql";
const migration = readFileSync(migrationPath, "utf8");

describe("order task SLA policy security correction", () => {
  it("enables RLS and keeps the operational SLA catalog server-only", () => {
    expect(migration.trim().toLowerCase().startsWith("begin;")).toBe(true);
    expect(migration.trim().toLowerCase().endsWith("commit;")).toBe(true);
    expect(migration).toContain(
      "alter table public.order_task_sla_policies enable row level security"
    );
    expect(migration).toContain(
      "revoke all on table public.order_task_sla_policies from public, anon, authenticated"
    );
    expect(migration).toContain(
      "grant select, insert, update, delete on table public.order_task_sla_policies to service_role"
    );
    expect(migration).not.toMatch(/create\s+policy[\s\S]*order_task_sla_policies/iu);
    expect(migration).not.toMatch(/^\s*grant\b[^\r\n]*\bto\s+(?:public|anon|authenticated)\b/imu);
  });

  it("is forward-only and records a security checkpoint without deleting data", () => {
    expect(migration).not.toMatch(/\bdrop\s+table\b|\btruncate\b|\bdelete\s+from\b/iu);
    expect(migration).toContain("order_task_sla_policies_rls_enabled");
    expect(migration).toContain("direct_anon_access");
    expect(migration).toContain("direct_authenticated_access");
  });
});
