import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  FULFILLMENT_METHOD_LABELS,
  FULFILLMENT_STATUS_LABELS,
  canArchiveFulfillment,
  canEditFulfillment,
  fulfillmentTransitionNeedsReason,
  getFulfillmentTransitions,
  safeFulfillmentFileName
} from "@/lib/fulfillments";

const migrationFiles = [
  "20260712154540_v1_2_phase_11_fulfillment_schema_and_audit.sql",
  "20260712154619_v1_2_phase_11_fulfillment_create_and_update.sql",
  "20260712154659_v1_2_phase_11_fulfillment_status_and_sync.sql",
  "20260712154952_v1_2_phase_11_fulfillment_lifecycle.sql",
  "20260712155021_v1_2_phase_11_fulfillment_delete_audit.sql",
  "20260712155146_v1_2_phase_11_fulfillment_security.sql",
  "20260712155210_v1_2_phase_11_fulfillment_table_grants.sql",
  "20260712155229_v1_2_phase_11_fulfillment_rpc_grants.sql",
  "20260712155253_v1_2_phase_11_fulfillment_bucket.sql",
  "20260712155305_v1_2_phase_11_fulfillment_storage_policy_cleanup.sql",
  "20260712155315_v1_2_phase_11_fulfillment_storage_read.sql",
  "20260712155326_v1_2_phase_11_fulfillment_storage_upload.sql",
  "20260712155341_v1_2_phase_11_fulfillment_storage_delete.sql",
  "20260713002645_v1_2_phase_11_archived_file_cleanup.sql",
  "20260713003444_v1_2_phase_11_history_trigger_alignment.sql"
];

const migrations = migrationFiles
  .map((file) => readFileSync(resolve("supabase/migrations", file), "utf8"))
  .join("\n")
  .toLowerCase();
const baseline = readFileSync(
  resolve("supabase/migrations/20260816102253_debroder_fresh_database_baseline.sql"),
  "utf8"
).toLowerCase();
const phase11Schema = readFileSync(
  resolve("supabase/migrations/20260712154540_v1_2_phase_11_fulfillment_schema_and_audit.sql"),
  "utf8"
).toLowerCase();
const phase11DeleteAudit = readFileSync(
  resolve("supabase/migrations/20260712155021_v1_2_phase_11_fulfillment_delete_audit.sql"),
  "utf8"
).toLowerCase();
const phase11RpcGrants = readFileSync(
  resolve("supabase/migrations/20260712155229_v1_2_phase_11_fulfillment_rpc_grants.sql"),
  "utf8"
).toLowerCase();
const baselineFulfillmentRevisionDefinition = baseline.match(
  /create table if not exists public\.fulfillment_revisions \([\s\S]*?\n\);/u
)?.[0] ?? "";
const baselineFulfillmentDeletionAuditDefinition = baseline.match(
  /create table if not exists public\.fulfillment_deletion_audit \([\s\S]*?\n\);/u
)?.[0] ?? "";
const navigation = readFileSync(resolve("components/admin/layout/admin-navigation.ts"), "utf8");
const listUi = readFileSync(resolve("components/admin/FulfillmentAdmin.tsx"), "utf8");
const detailUi = readFileSync(resolve("components/admin/FulfillmentDetailAdmin.tsx"), "utf8");
const orderDetail = readFileSync(resolve("components/admin/OrderDetailAdmin.tsx"), "utf8");

describe("Phase 11 fulfillment helpers", () => {
  it("labels shipping, pickup, and fulfillment statuses", () => {
    expect(FULFILLMENT_METHOD_LABELS.shipping).toBe("Pengiriman");
    expect(FULFILLMENT_METHOD_LABELS.pickup).toContain("Ambil");
    expect(FULFILLMENT_STATUS_LABELS.ready_to_ship).toContain("Siap");
    expect(FULFILLMENT_STATUS_LABELS.picked_up).toContain("Diambil");
  });

  it("uses method-aware transitions", () => {
    expect(getFulfillmentTransitions("shipping", "packing")).toContain("ready_to_ship");
    expect(getFulfillmentTransitions("pickup", "packing")).toContain("ready_for_pickup");
    expect(getFulfillmentTransitions("shipping", "delivered")).toEqual([]);
    expect(fulfillmentTransitionNeedsReason("problem")).toBe(true);
    expect(fulfillmentTransitionNeedsReason("cancelled")).toBe(true);
  });

  it("enforces lifecycle helper gates", () => {
    expect(canEditFulfillment("preparing", null)).toBe(true);
    expect(canEditFulfillment("delivered", null)).toBe(false);
    expect(canArchiveFulfillment("delivered", null)).toBe(true);
    expect(canArchiveFulfillment("packing", null)).toBe(false);
    expect(safeFulfillmentFileName(" Bukti Serah Terima 01.JPG ")).toBe("bukti-serah-terima-01.jpg");
  });
});

describe("Phase 11 database and UI contract", () => {
  it("ships atomic creation, status, archive, evidence, and delete audit", () => {
    expect(migrations).toContain("create or replace function public.create_fulfillment");
    expect(migrations).toContain("create or replace function public.update_fulfillment_details");
    expect(migrations).toContain("create or replace function public.transition_fulfillment_status");
    expect(migrations).toContain("create or replace function public.register_fulfillment_file");
    expect(migrations).toContain("create or replace function public.remove_fulfillment_file");
    expect(migrations).toContain("create or replace function public.permanently_delete_fulfillment");
    expect(migrations).toContain("fulfillment-proofs");
    expect(migrations).toContain("jumlah penyerahan melebihi jumlah yang lulus quality control");
  });

  it("keeps the baseline and Phase 11 deletion-audit shapes compatible", () => {
    expect(baselineFulfillmentRevisionDefinition).toMatch(
      /reason text not null check \(btrim\(reason\) <> ''\)[\s\S]*?unique\(fulfillment_id, revision_number\)/u
    );
    expect(baselineFulfillmentDeletionAuditDefinition).toMatch(
      /fulfillment_id uuid not null,[\s\S]*?fulfillment_number text,[\s\S]*?order_id uuid not null,[\s\S]*?snapshot jsonb not null,[\s\S]*?deleted_by uuid references auth\.users\(id\) on delete set null,[\s\S]*?deleted_at timestamptz not null default now\(\),[\s\S]*?reason text not null default 'hapus permanen dari gudang arsip'/u
    );
    expect(baseline).toContain(
      "create index if not exists fulfillment_deletion_audit_order_idx"
    );
    expect(phase11Schema).toContain(
      "create table if not exists public.fulfillment_deletion_audit"
    );
    expect(phase11Schema).toContain(
      "on public.fulfillment_deletion_audit(order_id,deleted_at desc)"
    );
  });

  it("preserves deletion-audit identity after source fulfillment deletion", () => {
    expect(baselineFulfillmentDeletionAuditDefinition).not.toMatch(
      /order_id uuid not null references/iu
    );
    expect(baselineFulfillmentDeletionAuditDefinition).not.toMatch(
      /fulfillment_id uuid not null references/iu
    );
    expect(phase11DeleteAudit).toContain(
      "insert into public.fulfillment_deletion_audit(fulfillment_id,fulfillment_number,order_id,snapshot,deleted_by)"
    );
    expect(phase11DeleteAudit).toContain(
      "delete from public.fulfillments where id=target_row.id"
    );
  });

  it("keeps the Phase 11 audit table append-only and staff-readable only", () => {
    expect(migrations).toContain(
      "create trigger prevent_fulfillment_deletion_audit_mutation"
    );
    expect(migrations).toContain(
      "revoke all on public.fulfillments,public.fulfillment_items,public.fulfillment_files,public.fulfillment_status_history,public.fulfillment_revisions,public.fulfillment_deletion_audit from public,anon"
    );
    expect(migrations).toContain(
      "grant select on public.fulfillments,public.fulfillment_items,public.fulfillment_files,public.fulfillment_status_history,public.fulfillment_revisions,public.fulfillment_deletion_audit to authenticated"
    );
  });

  it("contains retired RPC revokes without making fresh replay depend on them", () => {
    expect(phase11RpcGrants).toContain("if to_regprocedure('public.create_fulfillment(uuid,text,text,text,text,text,integer,timestamptz,text,jsonb)') is not null");
    expect(phase11RpcGrants).toContain("if to_regprocedure('public.update_fulfillment_draft(uuid,text,text,text,text,integer,timestamptz,text)') is not null");
    expect(phase11RpcGrants).toContain("if to_regprocedure('public.update_fulfillment_tracking(uuid,text,text,text)') is not null");
    expect(phase11RpcGrants).toContain("if to_regprocedure('public.transition_fulfillment_status(uuid,text,text)') is not null");
    expect(phase11RpcGrants).toContain("if to_regprocedure('public.refresh_order_fulfillment_status(uuid)') is not null");
    expect(phase11RpcGrants).toContain(
      "grant execute on function public.create_fulfillment(uuid,text,text,text,text,text,integer,timestamptz,text,jsonb,text) to authenticated"
    );
    expect(phase11RpcGrants).not.toMatch(
      /(?<!execute ')(?<!to_regprocedure\(')revoke all on function public\.create_fulfillment\(uuid,text,text,text,text,text,integer,timestamptz,text,jsonb\)/u
    );
  });

  it("keeps Phase 11 discoverable from navigation and order detail", () => {
    expect(navigation).toContain('href: "/admin/fulfillments"');
    expect(navigation).toContain("Detail Pengiriman");
    expect(orderDetail).toContain("Pengiriman / Pickup");
  });

  it("ships list, detail, archive, evidence, and permanent-delete UI", () => {
    expect(listUi).toContain("Siap Diserahkan");
    expect(listUi).toContain("Gudang Arsip");
    expect(detailUi).toContain("Alur Penyerahan Terpandu");
    expect(detailUi).toContain("Unggah Bukti");
    expect(detailUi).toContain("Hapus Permanen");
  });
});
