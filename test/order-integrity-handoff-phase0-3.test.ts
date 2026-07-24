import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  resolveOrderActiveStage,
  resolveOrderActiveStageFromServer
} from "@/lib/order-active-stage";
import { resolveCustomerOrderPresentation } from "@/lib/customer-order-presentation";
import {
  isActiveOrderTaskStatus,
  orderTaskStatusLabel,
  orderTaskTypeLabel
} from "@/lib/order-tasks";

const read = (path: string) => readFileSync(path, "utf8");

describe("Order Integrity & Handoff Foundation Phase 0-3", () => {
  it("uses canonical precedence: terminal > hard integrity > operational > verified > payment review > approval", () => {
    const cancelled = resolveOrderActiveStage({
      orderId: "order-1",
      status: "cancelled",
      paymentStatus: "pending_verification",
      latestPaymentStatus: "pending",
      fulfillmentMethod: "shipping",
      paymentMethod: "bank_transfer"
    });
    expect(cancelled).toMatchObject({
      activeStage: "cancelled",
      isTerminal: true,
      adminTaskType: "resolve_integrity"
    });
    expect(cancelled.warnings).toContain("Pesanan terminal masih memiliki pembayaran yang menunggu pemeriksaan.");

    const hardBlock = resolveOrderActiveStage({
      orderId: "order-integrity",
      status: "under_review",
      paymentStatus: "unpaid",
      paymentMethod: "bank_transfer",
      fulfillmentMethod: "shipping",
      paymentRequirementMet: true,
      paymentProductionEligible: true,
      paymentEffectiveTotal: 0,
      hasVerifiedPayment: false
    });
    expect(hardBlock).toMatchObject({
      activeStage: "integrity_review",
      responsibility: "debroder",
      adminTaskType: "resolve_integrity"
    });

    const shipped = resolveOrderActiveStage({
      orderId: "order-2",
      status: "awaiting_payment",
      paymentStatus: "paid",
      paymentRequirementMet: true,
      paymentEffectiveTotal: 100_000,
      hasVerifiedPayment: true,
      fulfillmentStatus: "shipped",
      fulfillmentMethod: "shipping",
      paymentMethod: "bank_transfer",
      trackingNumber: "RESI-1"
    });
    expect(shipped).toMatchObject({ activeStage: "shipping", responsibility: "none" });

    const review = resolveOrderActiveStage({
      orderId: "order-3",
      status: "awaiting_customer_approval",
      paymentStatus: "pending_verification",
      latestPaymentStatus: "pending",
      fulfillmentMethod: "shipping",
      paymentMethod: "bank_transfer",
      isCustom: true
    });
    expect(review).toMatchObject({
      activeStage: "payment_review",
      adminTaskType: "review_payment",
      responsibility: "debroder"
    });
    expect(review.warning).toContain("status order belum berada pada tahap pembayaran");
  });

  it("routes Ready Stock and Custom to different post-payment work", () => {
    const ready = resolveOrderActiveStage({
      orderId: "ready-1",
      status: "awaiting_payment",
      paymentStatus: "paid",
      paymentRequirementMet: true,
      paymentProductionEligible: true,
      paymentEffectiveTotal: 45_000,
      hasVerifiedPayment: true,
      fulfillmentMethod: "pickup",
      paymentMethod: "bank_transfer",
      isCustom: false
    });
    expect(ready).toMatchObject({
      activeStage: "preparing_goods",
      adminTaskType: "prepare_ready_stock",
      primaryAction: "prepare_goods"
    });

    const custom = resolveOrderActiveStage({
      orderId: "custom-1",
      status: "awaiting_payment",
      paymentStatus: "paid",
      paymentRequirementMet: true,
      paymentProductionEligible: true,
      paymentEffectiveTotal: 100_000,
      hasVerifiedPayment: true,
      fulfillmentMethod: "shipping",
      paymentMethod: "bank_transfer",
      isCustom: true,
      hasJobOrder: false
    });
    expect(custom).toMatchObject({
      activeStage: "job_order_required",
      adminTaskType: "create_job_order",
      primaryAction: "create_job_order"
    });
  });

  it("maps packing to final check and never exposes pickup before final handoff status", () => {
    expect(resolveOrderActiveStage({
      orderId: "packing-1",
      status: "processing",
      paymentStatus: "paid",
      paymentRequirementMet: true,
      paymentEffectiveTotal: 45_000,
      hasVerifiedPayment: true,
      fulfillmentStatus: "packing",
      fulfillmentMethod: "pickup",
      paymentMethod: "bank_transfer"
    })).toMatchObject({
      activeStage: "final_check",
      adminTaskType: "run_final_check",
      customerStatusLabel: "Pengecekan Akhir"
    });
  });

  it("keeps pay-at-store pickup actionable without pretending a bank payment exists", () => {
    const stage = resolveOrderActiveStage({
      orderId: "pickup-1",
      status: "ready_for_pickup",
      paymentStatus: "unpaid",
      fulfillmentStatus: "ready_for_pickup",
      fulfillmentMethod: "pickup",
      paymentMethod: "pay_at_store"
    });
    expect(stage).toMatchObject({
      activeStage: "ready_for_pickup",
      responsibility: "customer",
      primaryAction: "handover_pickup",
      customerTitle: "Barang siap diambil dan dibayar di toko"
    });
  });

  it("safely fills missing server presentation fields from the pure resolver", () => {
    const stage = resolveOrderActiveStageFromServer({
      orderId: "server-1",
      status: "awaiting_payment",
      paymentStatus: "pending_verification",
      fulfillmentMethod: "shipping",
      paymentMethod: "bank_transfer"
    }, {
      activeStage: "payment_review",
      adminTaskType: "review_payment",
      primaryAction: "review_payment"
    });
    expect(stage.customerTitle).toBe("Pembayaran sedang diperiksa");
    expect(stage.responsibilityLabel).toBe("SEDANG DIPROSES DEBRODER");
    expect(stage.nextStep).toContain("dana ditemukan");
  });

  it("keeps the Customer Order Hub and Admin detail on the canonical resolver", () => {
    const presentation = resolveCustomerOrderPresentation({
      orderId: "order-4",
      status: "awaiting_payment",
      paymentStatus: "pending_verification",
      fulfillmentMethod: "shipping",
      paymentMethod: "bank_transfer"
    });
    expect(presentation).toMatchObject({
      responsibility: "debroder",
      title: "Pembayaran sedang diperiksa",
      action: "track_only"
    });
    expect(read("lib/customer-order-presentation.ts")).toContain("resolveOrderActiveStageFromServer");
    expect(read("lib/order-tracking.ts")).toContain("resolveOrderActiveStage");
    expect(read("lib/admin-orders/read-model.ts")).toContain("resolveCanonicalOrderActiveStage");
    expect(read("components/admin/OrderDetailAdmin.tsx")).toContain("readModel.active_stage");
    expect(read("components/admin/OrderDetailAdmin.tsx")).not.toContain('rpc("resolve_order_active_stage_v1"');
  });

  it("defines typed task labels and active-state semantics", () => {
    expect(orderTaskTypeLabel("review_payment")).toBe("Periksa Pembayaran");
    expect(orderTaskStatusLabel("blocked")).toBe("Terhambat");
    expect(isActiveOrderTaskStatus("in_progress")).toBe(true);
    expect(isActiveOrderTaskStatus("resolved")).toBe(false);
  });

  it("defines additive findings, canonical RPC, durable ledger, evidence guards and idempotent sync", () => {
    const migration = read("supabase/migrations/20260720010000_order_integrity_handoff_phase0_3.sql");
    expect(migration).toContain("create table if not exists public.order_integrity_findings");
    expect(migration).toContain("create table if not exists public.order_tasks");
    expect(migration).toContain("create table if not exists public.order_task_history");
    expect(migration).toContain("public.resolve_order_active_stage_v1");
    expect(migration).toContain("public.evaluate_order_integrity_v1");
    expect(migration).toContain("public.sync_order_operational_task_v1");
    expect(migration).toContain("public.update_order_task_v1");
    expect(migration).toContain("guard_fulfillment_method_invariants_v1");
    expect(migration).toContain("guard_job_order_release_invariants_v1");
    expect(migration).toContain("guard_verified_payment_evidence_v1");
    expect(migration).toContain("verified_payment_missing_evidence");
    expect(migration).toContain("handover_without_final_check");
    expect(migration).toContain("fulfillment_before_payment");
    expect(migration).toContain("unique(order_id, code)");
    expect(migration).toContain("task_key text not null unique");
    expect(migration).not.toMatch(/\btruncate\b/i);
    expect(migration).not.toMatch(/drop\s+table/i);
    expect(migration).not.toMatch(/delete\s+from\s+public\.(orders|order_payments|fulfillments|job_orders)/i);
  });

  it("ships Phase 0 reports and the invariant matrix", () => {
    expect(read("docs/ORDER_INTEGRITY_AUDIT_REPORT.md")).toContain("ORD-DEB-2026-0029");
    expect(read("docs/ORDER_INTEGRITY_AUDIT_REPORT.md")).toContain("Legacy verified payments");
    expect(read("docs/DATA_REPAIR_PLAN.md")).toContain("No repair executed");
    expect(read("docs/ORDER_INVARIANT_MATRIX.md")).toContain("Canonical precedence");
  });
});
