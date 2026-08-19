import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260818003941_order_handoff_trigger_record_safety.sql",
  "utf8"
);
const compact = migration.replace(/\s+/g, " ").toLowerCase();

describe("order handoff trigger record safety correction", () => {
  it("resolves cross-table order ids without static record-field collisions", () => {
    expect(compact).toContain("create or replace function public.refresh_order_integrity_task_trigger_v1()");
    expect(compact).toContain("create or replace function public.sync_order_handoff_trigger_v2()");
    expect(compact).toContain("create or replace function public.guard_active_cancellation_progress_v1()");
    expect(compact).toContain("pg_catalog.to_jsonb(new)->>'order_id'");
    expect(compact).not.toMatch(/new\.order_id/iu);
    expect(compact).not.toMatch(/case\s+tg_table_name[\s\S]*new\.order_id/iu);
  });

  it("preserves the trigger-only security boundary", () => {
    expect(compact.match(/set search_path = ''/g)?.length).toBe(3);
    expect(compact).toContain(
      "revoke all on function public.sync_order_handoff_trigger_v2() from public, anon, authenticated"
    );
    expect(compact).toContain(
      "grant execute on function public.sync_order_handoff_trigger_v2() to service_role"
    );
    expect(compact).not.toContain("grant execute on function public.sync_order_handoff_trigger_v2() to public");
    expect(compact).not.toContain("grant execute on function public.sync_order_handoff_trigger_v2() to anon");
  });

  it("contains no seed data, alternate authority, or stub behavior", () => {
    expect(compact).not.toMatch(/insert\s+into\s+public\./iu);
    expect(compact).not.toMatch(/create\s+table\s+public\./iu);
    expect(compact).toContain("perform public.sync_order_handoff_v2(target_order_id,null)");
    expect(compact).toContain("perform public.sync_order_operational_task_v1(target_order_id,null)");
  });
});
