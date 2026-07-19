import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
const migrationPath = "supabase/migrations/20260720020000_order_operations_phase4_13.sql";

describe("DEBRODER Order Operations Phase 4-13", () => {
  it("builds one transactional handoff and customer outbox foundation", () => {
    const sql = read(migrationPath);
    expect(sql).toContain("create table if not exists public.order_handoff_state");
    expect(sql).toContain("public.sync_order_handoff_v2");
    expect(sql).toContain("public.sync_order_operational_task_v1");
    expect(sql).toContain("create table if not exists public.customer_notification_outbox");
    expect(sql).toContain("public.enqueue_customer_notification_v1");
    expect(sql).toContain("unique(event_key,channel)");
  });

  it("keeps exception tasks independent and creates an outbox-failure task until retry succeeds", () => {
    const sql = read(migrationPath);
    expect(sql).toContain(`task_type in (
      'review_new_order'`);
    expect(sql).toContain("public.sync_customer_outbox_failure_task_v1");
    expect(sql).toContain("'outbox_failure','open','high','admin'");
    expect(sql).toContain("Outbox tidak lagi berstatus gagal");
    expect(sql).toContain("recipient=excluded.recipient");
  });

  it("persists checkout recovery before the first request and exposes a safe recovery endpoint", () => {
    const client = read("components/checkout/CheckoutClient.tsx");
    const route = read("app/api/checkout/route.ts");
    expect(client).toContain("debroder-checkout-recovery-v1");
    expect(client).toContain("sessionStorage.setItem(RECOVERY_KEY");
    expect(client.indexOf("sessionStorage.setItem(RECOVERY_KEY")).toBeLessThan(client.indexOf("fetch(\"/api/checkout\""));
    expect(route).toContain("export async function GET(request: Request)");
    expect(route).toContain("deriveCheckoutTrackingToken");
    expect(route).toContain("CHECKOUT_RECOVERY_CONFLICT");
  });

  it("adds location-aware stock, pickup reservation, transfer, readiness and no-show handling", () => {
    const sql = read(migrationPath);
    for (const contract of [
      "create table if not exists public.inventory_locations",
      "create table if not exists public.inventory_balances",
      "create table if not exists public.inventory_movements",
      "create table if not exists public.stock_transfers",
      "create table if not exists public.pickup_preparations",
      "public.create_pickup_transfer_v1",
      "public.receive_stock_transfer_v1",
      "public.mark_pickup_ready_v1",
      "public.request_pickup_extension_for_order_v1",
      "public.process_pickup_deadlines_v1",
      "public.complete_pickup_handover_v1",
      "public.inventory_location_available_for_order_v1",
      "public.sync_legacy_inventory_from_variant_v1"
    ]) expect(sql).toContain(contract);
    expect(sql).toContain("Stok fisik di lokasi pickup belum lengkap");
    expect(sql).toContain("status='no_show'");
    expect(sql).toContain("reservations belonging to other orders");
    expect(sql).toContain("and not exists(\n      select 1 from public.pickup_preparation_items pi");
    expect(sql).toContain("debroder.skip_inventory_legacy_sync");
  });

  it("never treats proof submission as payment verification and handles pay-at-store atomically", () => {
    const sql = read(migrationPath);
    expect(sql).toContain("if o.payment_method='pay_at_store'");
    expect(sql).toContain("'verified','admin','verified',true,true,true,true,true");
    expect(sql).toContain("perform public.refresh_order_payment_summary(o.id)");
    expect(sql).toContain("if not o.payment_production_eligible then raise exception 'Pembayaran belum memenuhi syarat'");
  });

  it("hardens all public error boundaries without returning raw database errors", () => {
    const helper = read("lib/public-api-error.ts");
    expect(helper).toContain("reference");
    expect(helper).toContain("PUBLIC_OPERATION_FAILED");
    for (const path of [
      "app/api/checkout/route.ts",
      "app/api/public/orders/[token]/route.ts",
      "app/api/public/payments/[token]/route.ts",
      "app/api/public/order-actions/route.ts"
    ]) expect(read(path)).toContain("publicApiErrorResponse");
    expect(read("app/api/public/orders/[token]/route.ts")).not.toMatch(/Response\.json\([^\n]*error\.message/);
    expect(read("app/api/public/payments/[token]/route.ts")).not.toMatch(/Response\.json\([^\n]*error\.message/);
  });

  it("recognizes historical verified funds even when the order summary is stale", () => {
    const sql = read(migrationPath);
    expect(sql).toContain("public.order_verified_funds_v1");
    expect(sql).toContain("p.status='verified' or p.review_outcome='verified'");
    expect(sql).toContain("where id=allocation.source_payment_id and (status='verified' or review_outcome='verified')");
    expect(sql).toContain("Bukti pembayaran yang sedang diperiksa harus diselesaikan sebelum pembatalan diputuskan");
  });

  it("requires a real private storage object before a refund can be marked sent", () => {
    const sql = read(migrationPath);
    const evidenceRoute = read("app/api/admin/refunds/[id]/evidence/route.ts");
    expect(sql).toContain("from storage.objects so");
    expect(sql).toContain("p_object_path not like case_value.id::text || '/%'");
    expect(sql).toContain("Bukti transfer refund tidak ditemukan di storage");
    expect(sql).toContain("Bukti refund sudah terikat pada kasus lain");
    expect(evidenceRoute).toContain('admin.storage.from("refund-evidence").upload');
    expect(evidenceRoute).toContain("validSignature");
    expect(evidenceRoute).toContain("remove([uploadedPath])");
  });

  it("uses role-and-assignment RLS and explicitly aligns Quality Control access", () => {
    const sql = read(migrationPath);
    expect(sql).toContain('drop policy if exists "order tasks readable by role or assignment"');
    expect(sql).toContain('drop policy if exists "order task history readable through visible task"');
    expect(sql).toContain('create policy "order tasks readable by role or assignment"');
    expect(sql).toContain("assigned_to=auth.uid()");
    expect(sql).toContain("assigned_role=public.current_actor_role()");
    expect(sql).toContain("('quality_control','order.task.read',true");
    expect(sql).toContain("('quality_control','order.task.manage',true");
    expect(sql).toContain("('quality_control','operations.read',true");
    expect(read("components/admin/layout/admin-navigation.ts")).toContain('"quality_control", "store_staff"');
  });

  it("keeps every new RLS policy redeploy-safe", () => {
    const sql = read(migrationPath);
    const policies = [...sql.matchAll(/create policy\s+"([^"]+)"\s+on\s+([\w.]+)/gi)];
    expect(policies.length).toBeGreaterThan(10);
    for (const match of policies) {
      const name = match[1];
      const table = match[2];
      expect(sql.toLowerCase()).toContain(`drop policy if exists "${name.toLowerCase()}" on ${table.toLowerCase()}`);
    }
  });

  it("adds SLA escalation and a role-aware Admin Task Inbox", () => {
    const sql = read(migrationPath);
    expect(sql).toContain("create table if not exists public.order_task_sla_policies");
    expect(sql).toContain("public.escalate_overdue_order_tasks_v1");
    expect(read("app/api/admin/order-tasks/route.ts")).toContain('requireOperationsActor(request, "order.task.read")');
    expect(read("components/admin/OrderTaskInboxAdmin.tsx")).toContain("Terlambat");
    expect(read("components/admin/layout/admin-navigation.ts")).toContain("Kotak Tugas");
  });

  it("excludes health_reconcile tasks from terminal-task findings to prevent self-loops", () => {
    const sql = read(migrationPath);
    expect(sql).toContain("t.task_type<>'health_reconcile'");
    expect(sql).toContain("task_type='health_reconcile'");
    expect(sql).toContain("Temuan rekonsiliasi tidak lagi terdeteksi");
    expect(sql).toContain("active_reservation_overbooked");
    expect(sql).toContain("location_ledger_mismatch");
    expect(sql).toContain("return jsonb_build_object('run_id',run_value.id,'status','failed')");
  });

  it("maps canonical stages without inventing a second lifecycle and blocks progress during cancellation", () => {
    const sql = read(migrationPath);
    for (const stage of [
      "payment_review", "job_order_required", "preparing_goods", "production",
      "quality_control", "packing", "final_check", "ready_for_pickup"
    ]) expect(sql).toContain(`when '${stage}'`);
    expect(sql).toContain("public.guard_active_cancellation_progress_v1");
    expect(sql).toContain("Produksi diblokir selama proses pembatalan");
    expect(sql).toContain("Penyerahan diblokir selama proses pembatalan");
  });

  it("ships all five operations pages and their authenticated APIs", () => {
    for (const path of [
      "app/admin/order-tasks/page.tsx",
      "app/admin/inventory-operations/page.tsx",
      "app/admin/refunds/page.tsx",
      "app/admin/customer-outbox/page.tsx",
      "app/admin/operations-health/page.tsx",
      "app/api/admin/order-tasks/route.ts",
      "app/api/admin/inventory-operations/route.ts",
      "app/api/admin/refunds/route.ts",
      "app/api/admin/customer-outbox/route.ts",
      "app/api/admin/operations-health/route.ts"
    ]) expect(read(path).length).toBeGreaterThan(100);
  });

  it("is forward-only and does not delete core commerce data", () => {
    const sql = read(migrationPath);
    expect(sql).not.toMatch(/\btruncate\b/i);
    expect(sql).not.toMatch(/drop\s+table/i);
    expect(sql).not.toMatch(/delete\s+from\s+public\.(orders|order_items|order_payments|fulfillments|job_orders|stock_reservations)/i);
    expect(sql.trim().toLowerCase().startsWith("begin;")).toBe(true);
    expect(sql.trim().toLowerCase().endsWith("commit;")).toBe(true);
  });
});
