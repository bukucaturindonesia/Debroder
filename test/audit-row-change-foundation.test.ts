import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationsPath = "supabase/migrations";
const baseline = readFileSync(
  `${migrationsPath}/20260816102253_debroder_fresh_database_baseline.sql`,
  "utf8"
);
const phase11Security = readFileSync(
  `${migrationsPath}/20260712155146_v1_2_phase_11_fulfillment_security.sql`,
  "utf8"
);
const phase13 = readFileSync(
  `${migrationsPath}/20260713090000_v1_2_phase_13_role_catalog_and_rls_alignment.sql`,
  "utf8"
);
const manifest = readFileSync("DEBRODER_FRESH_DATABASE_REPLAY_MANIFEST.md", "utf8");
const ledger = readFileSync("DEBRODER_BASELINE_COVERAGE_LEDGER.md", "utf8");

const auditFunction = baseline.match(
  /create or replace function public\.audit_row_change\(\)[\s\S]*?\n\$\$;/iu
)?.[0] ?? "";

describe("audit_row_change baseline foundation", () => {
  it("owns the recovered trigger function before all active consumers", () => {
    expect(auditFunction).toContain("returns trigger");
    expect(auditFunction).toMatch(/language\s+plpgsql/iu);
    expect(auditFunction).toMatch(/security\s+definer/iu);
    expect(auditFunction).toMatch(/set\s+search_path\s*=\s*''/iu);
    expect(baseline.indexOf("create table if not exists public.system_audit_log")).toBeGreaterThanOrEqual(0);
    expect(baseline.indexOf("create table if not exists public.system_audit_log")).toBeLessThan(
      baseline.indexOf("create or replace function public.audit_row_change()")
    );
    expect(manifest.indexOf("20260816102253_debroder_fresh_database_baseline.sql")).toBeLessThan(
      manifest.indexOf("20260712155146_v1_2_phase_11_fulfillment_security.sql")
    );
    expect(manifest.indexOf("20260712155146_v1_2_phase_11_fulfillment_security.sql")).toBeLessThan(
      manifest.indexOf("20260713090000_v1_2_phase_13_role_catalog_and_rls_alignment.sql")
    );
  });

  it("preserves the historical row lifecycle semantics", () => {
    expect(auditFunction).toContain("if tg_op = 'INSERT' then");
    expect(auditFunction).toContain("elsif tg_op = 'UPDATE' then");
    expect(auditFunction).toContain("old_json := to_jsonb(old)");
    expect(auditFunction).toContain("new_json := to_jsonb(new)");
    expect(auditFunction).toContain("action_name := 'created'");
    expect(auditFunction).toContain("action_name := 'archived'");
    expect(auditFunction).toContain("action_name := 'restored'");
    expect(auditFunction).toContain("action_name := 'updated'");
    expect(auditFunction).toContain("action_name := 'deleted'");
    expect(auditFunction).toContain("insert into public.system_audit_log");
    expect(auditFunction).toContain("tg_table_name");
    expect(auditFunction).toContain("auth.uid()");
    expect(auditFunction).toContain("public.current_actor_role()");
    expect(auditFunction).toContain("'trigger'");
    expect(auditFunction).toContain("if tg_op = 'DELETE' then");
    expect(auditFunction).toContain("return old;");
    expect(auditFunction).toContain("return new;");
    expect(auditFunction).not.toMatch(/return\s+new\s*;[\s\S]*?insert into/iu);
  });

  it("uses the single append-only system audit authority", () => {
    expect(auditFunction).toContain("public.system_audit_log");
    expect(baseline).toMatch(/create table if not exists public\.system_audit_log\s*\([\s\S]*?actor_id uuid references auth\.users\(id\) on delete set null[\s\S]*?metadata jsonb not null default '\{\}'::jsonb[\s\S]*?created_at timestamptz not null default now\(\)/iu);
    expect(baseline).toContain("create trigger prevent_system_audit_change");
    expect(baseline).toContain("raise exception 'Audit log is append-only'");
    expect(ledger).toContain("audit_row_change");
    expect(ledger).toContain("system_audit_log");
  });

  it("closes direct execution and does not create a no-op or public API", () => {
    expect(baseline).toContain(
      "revoke all on function public.audit_row_change() from public, anon, authenticated, service_role;"
    );
    expect(baseline).not.toMatch(/grant\s+execute\s+on\s+function\s+public\.audit_row_change\(\)/iu);
    expect(auditFunction).toMatch(/insert into public\.system_audit_log/iu);
    expect(auditFunction).not.toMatch(/begin\s+return\s+new\s*;\s*end/iu);
    expect(auditFunction).not.toMatch(/set\s+search_path\s*=\s*public/iu);
  });

  it("covers every active consumer in the replay chain", () => {
    expect(phase11Security).toContain("audit_fulfillments_changes");
    expect(phase11Security).toContain("execute function public.audit_row_change()");

    expect(phase13).toContain("audit_profiles_role_changes");
    for (const tableName of [
      "quotation_items",
      "quotation_item_services",
      "order_items",
      "order_item_services",
      "mockup_files",
      "mockup_parts",
      "qc_files",
      "fulfillment_files"
    ]) {
      expect(phase13).toContain(`'${tableName}'`);
    }
    expect(phase13).toContain("public.audit_row_change()");
    expect(phase13).not.toContain("audit_row_change() to public");
  });
});
