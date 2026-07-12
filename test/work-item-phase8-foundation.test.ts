import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  WORK_ITEM_STATUS_LABELS,
  canArchiveWorkItem,
  canEditWorkItem,
  getPhase8WorkItemTransitions,
  isWorkItemSuperAdmin
} from "@/lib/work-items";

const migration = [
  "20260712115943_v1_2_phase_8_work_item_schema_and_audit.sql",
  "20260712120223_v1_2_phase_8_work_item_creation_and_dependencies.sql",
  "20260712120309_v1_2_phase_8_work_item_status_and_archive.sql",
  "20260712120353_v1_2_phase_8_work_item_security_and_delete.sql"
]
  .map((file) => readFileSync(resolve("supabase/migrations", file), "utf8"))
  .join("\n")
  .toLowerCase();
const navigation = readFileSync(resolve("components/admin/layout/admin-navigation.ts"), "utf8");
const jobOrderDetail = readFileSync(resolve("components/admin/JobOrderDetailAdmin.tsx"), "utf8");
const workItemAdmin = readFileSync(resolve("components/admin/WorkItemAdmin.tsx"), "utf8");
const workItemDetail = readFileSync(resolve("components/admin/WorkItemDetailAdmin.tsx"), "utf8");

describe("Phase 8 Work Item helpers", () => {
  it("keeps controlled preparation statuses before production execution", () => {
    expect(WORK_ITEM_STATUS_LABELS.draft).toBe("Draft");
    expect(WORK_ITEM_STATUS_LABELS.ready).toBe("Siap Dikerjakan");
    expect(getPhase8WorkItemTransitions("draft")).toEqual(["ready", "cancelled"]);
    expect(getPhase8WorkItemTransitions("ready")).toEqual(["draft", "cancelled"]);
    expect(getPhase8WorkItemTransitions("in_progress")).toEqual([]);
  });

  it("keeps edit, archive, and permanent delete restrictions", () => {
    expect(canEditWorkItem("draft")).toBe(true);
    expect(canEditWorkItem("ready")).toBe(true);
    expect(canEditWorkItem("in_progress")).toBe(false);
    expect(canArchiveWorkItem("draft")).toBe(true);
    expect(canArchiveWorkItem("in_progress")).toBe(false);
    expect(isWorkItemSuperAdmin("superadmin")).toBe(true);
    expect(isWorkItemSuperAdmin("owner")).toBe(false);
  });
});

describe("Phase 8 database contract", () => {
  it("creates revision, dependency, deletion audit, and immutable history", () => {
    expect(migration).toContain("create table if not exists public.work_item_revisions");
    expect(migration).toContain("create table if not exists public.work_item_dependency_history");
    expect(migration).toContain("create table if not exists public.work_item_deletion_audit");
    expect(migration).toContain("prevent_work_item_history_mutation");
    expect(migration).toContain("work_item yang sudah mempunyai catatan qc tidak dapat dihapus permanen");
  });

  it("allocates numbers before inserting strict Work Item rows", () => {
    const functionStart = migration.indexOf("create or replace function public.generate_job_order_work_items");
    const allocationIndex = migration.indexOf("number_value:=public.issue_document_number", functionStart);
    const insertIndex = migration.indexOf("insert into public.work_items", functionStart);
    expect(functionStart).toBeGreaterThan(-1);
    expect(allocationIndex).toBeGreaterThan(functionStart);
    expect(insertIndex).toBeGreaterThan(allocationIndex);
    expect(migration).toContain("alter table public.work_items alter column work_item_number set not null");
  });

  it("locks direct table writes and public RPC execution", () => {
    expect(migration).toContain("revoke insert,update,delete,truncate,references,trigger");
    expect(migration).toContain("from public,anon");
    expect(migration).toContain("production staff read work_items");
    expect(migration).toContain("hanya super admin yang dapat menghapus permanen");
  });

  it("prevents duplicate generation and dependency cycles", () => {
    expect(migration).toContain("work_items_idempotency_unique");
    expect(migration).toContain("work-item:order-item:");
    expect(migration).toContain("work-item:service:");
    expect(migration).toContain("dependensi membentuk siklus");
  });
});

describe("Phase 8 discoverability and lifecycle", () => {
  it("adds Work Item to navigation and Job Order detail", () => {
    expect(navigation).toContain('href: "/admin/work-items"');
    expect(navigation).toContain('pathname.startsWith("/admin/work-items")');
    expect(jobOrderDetail).toContain('/admin/work-items?job_order=${row.id}');
  });

  it("exposes create, view, edit, archive, restore, and permanent delete actions", () => {
    expect(workItemAdmin).toContain("Tambah Work Item");
    expect(workItemAdmin).toContain("Lihat Detail");
    expect(workItemAdmin).toContain("Gudang Arsip");
    expect(workItemAdmin).toContain("Pulihkan");
    expect(workItemAdmin).toContain("Hapus Permanen");
    expect(workItemDetail).toContain("Edit Work Item");
    expect(workItemDetail).toContain("Tugaskan Work Item");
    expect(workItemDetail).toContain("Tambah Dependensi");
  });
});
