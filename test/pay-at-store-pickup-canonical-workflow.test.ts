import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolveCanonicalOrderActiveStage } from "@/lib/canonical-order-stage";
import { resolveCustomerOrderPresentation } from "@/lib/customer-order-presentation";
import { buildCompactOrderJourney } from "@/lib/order-journey";
import { resolveOrderActiveStage, type OrderActiveStageInput } from "@/lib/order-active-stage";

const migrationPath = "supabase/migrations/20260801115245_pay_at_store_pickup_canonical_workflow_v1.sql";
const migration = readFileSync(migrationPath, "utf8");
const taskLedgerMigration = readFileSync(
  "supabase/migrations/20260801134645_pay_at_store_pickup_task_ledger_alignment_v1.sql",
  "utf8"
);
const paymentResolverMigration = readFileSync(
  "supabase/migrations/20260801200909_pay_at_store_pickup_payment_resolver_null_alignment_v1.sql",
  "utf8"
);
const cashEvidenceMigration = readFileSync(
  "supabase/migrations/20260801204856_pay_at_store_cash_evidence_alignment_v1.sql",
  "utf8"
);
const fulfillmentUi = readFileSync("components/admin/FulfillmentDetailAdmin.tsx", "utf8");
const customerRead = readFileSync("lib/customer-orders/data-access.ts", "utf8");
const nextConfig = readFileSync("next.config.ts", "utf8");

function pickup(input: Partial<OrderActiveStageInput> = {}) {
  return resolveOrderActiveStage({
    orderId: "order-pickup-1",
    status: "processing",
    paymentStatus: "unpaid",
    fulfillmentStatus: "ready_for_pickup",
    fulfillmentMethod: "pickup",
    paymentMethod: "pay_at_store",
    ...input
  });
}

describe("Pay at Store + Store Pickup canonical P0 workflow", () => {
  it("projects the owner-approved seven stages in strict order", () => {
    const ready = pickup();
    const verification = pickup({ customerArrivedAt: "2026-08-01T01:00:00.000Z" });
    const payment = pickup({
      customerArrivedAt: "2026-08-01T01:00:00.000Z",
      finalVerificationCompleted: true
    });
    const handover = pickup({
      customerArrivedAt: "2026-08-01T01:00:00.000Z",
      finalVerificationCompleted: true,
      paymentRequirementMet: true,
      hasVerifiedPayment: true
    });
    const close = pickup({
      customerArrivedAt: "2026-08-01T01:00:00.000Z",
      finalVerificationCompleted: true,
      paymentRequirementMet: true,
      hasVerifiedPayment: true,
      handoverCompletedAt: "2026-08-01T01:05:00.000Z"
    });

    expect(ready).toMatchObject({ activeStage: "ready_for_pickup", primaryAction: "confirm_customer_arrival" });
    expect(verification).toMatchObject({ activeStage: "pickup_final_verification", primaryAction: "run_final_check" });
    expect(payment).toMatchObject({ activeStage: "pickup_payment", primaryAction: "record_pay_at_store_payment" });
    expect(handover).toMatchObject({ activeStage: "pickup_handover", primaryAction: "record_pickup_handover" });
    expect(close).toMatchObject({ activeStage: "pickup_completion", primaryAction: "complete_pickup_order" });

    const steps = buildCompactOrderJourney({
      stage: payment,
      fulfillmentMethod: "pickup",
      paymentMethod: "pay_at_store"
    });
    expect(steps.map((step) => step.label)).toEqual([
      "Pesanan Masuk",
      "Persiapan / Produksi",
      "Siap Diambil",
      "Verifikasi Akhir & Harga",
      "Pembayaran di Toko",
      "Serah Terima / Pickup",
      "Selesai"
    ]);
    expect(steps.map((step) => step.state)).toEqual([
      "done", "done", "done", "done", "current", "upcoming", "upcoming"
    ]);
  });

  it("keeps completion terminal even when a child projection is missing or stale", () => {
    expect(resolveCanonicalOrderActiveStage({
      orderId: "terminal-1",
      status: "completed",
      paymentStatus: "paid",
      fulfillmentMethod: "pickup",
      paymentMethod: "pay_at_store"
    })).toMatchObject({ activeStage: "completed", isTerminal: true });

    expect(resolveCanonicalOrderActiveStage({
      orderId: "terminal-2",
      status: "completed",
      paymentStatus: "paid",
      fulfillmentStatus: "ready_for_pickup",
      fulfillmentMethod: "pickup",
      paymentMethod: "pay_at_store"
    })).toMatchObject({ activeStage: "completed", isTerminal: true });
  });

  it("preserves prepaid pickup and shipping timing branches", () => {
    expect(resolveOrderActiveStage({
      status: "processing",
      paymentStatus: "paid",
      fulfillmentStatus: "packing",
      fulfillmentMethod: "pickup",
      paymentMethod: "bank_transfer",
      paymentRequirementMet: true
    }).activeStage).toBe("final_check");

    expect(resolveOrderActiveStage({
      status: "processing",
      paymentStatus: "paid",
      fulfillmentStatus: "ready_to_ship",
      fulfillmentMethod: "shipping",
      paymentMethod: "bank_transfer",
      paymentRequirementMet: true
    }).activeStage).toBe("ready_to_ship");

    expect(resolveOrderActiveStage({
      status: "processing",
      paymentStatus: "unpaid",
      fulfillmentStatus: "packing",
      fulfillmentMethod: "pickup",
      paymentMethod: "pay_at_store"
    }).activeStage).toBe("preparing_goods");
  });

  it("uses persisted milestone facts after refresh", () => {
    expect(resolveCustomerOrderPresentation({
      status: "processing",
      paymentStatus: "unpaid",
      fulfillmentStatus: "ready_for_pickup",
      fulfillmentMethod: "pickup",
      paymentMethod: "pay_at_store",
      customerArrivedAt: "2026-08-01T01:00:00.000Z",
      finalVerificationCompleted: true
    })).toMatchObject({ currentStage: "Pembayaran di Toko", activeStage: { activeStage: "pickup_payment" } });
  });

  it("ships additive milestones, stale guards, idempotent retries, audit history, and canonical price authority", () => {
    for (const column of ["customer_arrived_at", "handover_completed_at"]) {
      expect(migration).toContain(`add column if not exists ${column}`);
      expect(customerRead).toContain(column);
    }
    for (const rpc of [
      "begin_pickup_final_verification_v1",
      "record_pay_at_store_payment_v1",
      "record_pickup_handover_v1",
      "complete_pickup_order_v1"
    ]) {
      expect(migration).toContain(`function public.${rpc}`);
      expect(migration).toContain(`grant execute on function public.${rpc}`);
      expect(fulfillmentUi).toContain(`\"${rpc}\"`);
    }
    expect(migration).toContain("order_value.payment_balance");
    expect(migration).not.toContain("p_amount");
    expect(migration).toContain("Data ini telah diperbarui oleh admin lain");
    expect(migration).toContain("pickup_customer_arrived");
    expect(migration).toContain("fulfillment_final_verification_completed");
    expect(migration).toContain("pickup_handover_recorded");
    expect(migration).toContain("pickup_order_completed");
    expect(migration).toContain("where not exists");
    expect(migration).toContain("Bukti serah terima belum tersedia");
  });

  it("keeps every Pay at Store pickup task inside the canonical task ledger", () => {
    for (const taskType of [
      "confirm_customer_arrival",
      "record_pay_at_store_payment",
      "record_pickup_handover",
      "complete_pickup_order"
    ]) {
      expect(taskLedgerMigration).toContain(`'${taskType}'`);
      expect(taskLedgerMigration).toContain(`when '${taskType}' then 'store_staff'`);
    }
    expect(taskLedgerMigration).toContain("add constraint order_tasks_task_type_check");
    expect(taskLedgerMigration).toContain("create or replace function public.sync_order_operational_task_v1");
  });

  it("keeps a missing payment row in the canonical pickup payment stage", () => {
    expect(paymentResolverMigration).toContain(
      "payment_verified := coalesce(o.payment_requirement_met, false)"
    );
    expect(paymentResolverMigration).toContain(
      "or coalesce(o.payment_status in ('paid', 'verified', 'terverifikasi'), false)"
    );
    expect(paymentResolverMigration).toContain("or coalesce(p.status = 'verified', false)");
    expect(paymentResolverMigration).toContain("or coalesce(p.review_outcome = 'verified', false)");

    const paymentStage = paymentResolverMigration.indexOf("elsif not payment_verified then");
    const handoverStage = paymentResolverMigration.indexOf("elsif f.handover_completed_at is null then");
    expect(paymentStage).toBeGreaterThan(-1);
    expect(handoverStage).toBeGreaterThan(paymentStage);
    expect(paymentResolverMigration).toContain(
      "revoke all on function public._resolve_order_active_stage_v1(uuid) from public, anon, authenticated"
    );
    expect(paymentResolverMigration).toContain(
      "grant execute on function public._resolve_order_active_stage_v1(uuid) to service_role"
    );
  });

  it("records Pay at Store cash with complete canonical verification evidence", () => {
    expect(cashEvidenceMigration).toContain(
      "create or replace function public.record_pay_at_store_payment_v1"
    );
    expect(cashEvidenceMigration).toContain("public.has_permission('payment.create')");
    expect(cashEvidenceMigration).toContain("public.has_permission('payment.verify')");
    expect(cashEvidenceMigration).toContain(
      "cash_reference := format('PAY-AT-STORE:%s', order_value.id)"
    );
    expect(cashEvidenceMigration).toContain("review_outcome = 'verified'");
    expect(cashEvidenceMigration).toContain("check_funds_received = true");
    expect(cashEvidenceMigration).toContain("check_destination_account = true");
    expect(cashEvidenceMigration).toContain("check_amount = true");
    expect(cashEvidenceMigration).toContain("check_transaction_time = true");
    expect(cashEvidenceMigration).toContain("check_reference_unique = true");
    expect(cashEvidenceMigration).toContain("verified_amount = payment_value.amount");
    expect(cashEvidenceMigration).toContain("verified_destination_account = 'Kasir Pickup Toko'");
    expect(cashEvidenceMigration).toContain("verified_reference = cash_reference");
    expect(cashEvidenceMigration).not.toContain("perform public.verify_order_payment(");
    expect(cashEvidenceMigration).toContain(
      "grant execute on function public.record_pay_at_store_payment_v1(uuid, text, timestamptz)"
    );
  });

  it("resolves both reported metadata paths to tracked assets", () => {
    expect(nextConfig).toContain('/brand/debroder/open-graph-logo.png');
    expect(nextConfig).toContain('/brand/debroder/social-preview.png');
    expect(existsSync("public/debroder/open-graph-logo.png")).toBe(true);
    expect(existsSync("public/debroder/social-preview.png")).toBe(true);
  });
});
