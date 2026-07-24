import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolveCarrierTrackingTarget } from "@/lib/carrier-tracking";
import { resolveCanonicalOrderActiveStage } from "@/lib/canonical-order-stage";
import { resolveCustomerOrderPresentation } from "@/lib/customer-order-presentation";
import { buildCompactOrderJourney } from "@/lib/order-journey";
import { resolveOrderActiveStage, type OrderActiveStageResolution } from "@/lib/order-active-stage";

const read = (path: string) => readFileSync(path, "utf8");

function staleStage(activeStage: string): OrderActiveStageResolution {
  return {
    activeStage,
    lifecycleKind: "ready_stock",
    responsibility: "customer",
    responsibilityLabel: "TINDAKAN ANDA",
    tone: "action",
    customerStatusLabel: "Menunggu Persetujuan Anda",
    adminStatusLabel: "Menunggu Persetujuan Pelanggan",
    customerTitle: "Periksa total pesanan",
    customerDescription: "Status lama dari RPC.",
    adminTaskType: null,
    primaryAction: "approve_total",
    secondaryAction: "track",
    previousStage: "Penetapan Ongkir",
    nextStage: "Pembayaran",
    nextStep: "Setujui total.",
    blockingReason: "Keputusan pelanggan belum diterima.",
    warning: null,
    warnings: [],
    taskKey: null,
    isTerminal: false
  };
}

describe("B4-O1 Order Command Center and status integrity", () => {
  it("lets current payment evidence outrank a stale customer-approval RPC payload", () => {
    const presentation = resolveCustomerOrderPresentation({
      status: "awaiting_customer_approval",
      paymentStatus: "pending_verification",
      latestPaymentStatus: "pending",
      fulfillmentMethod: "shipping",
      paymentMethod: "bank_transfer",
      isCustom: false,
      activeStage: staleStage("customer_approval")
    });

    expect(presentation.activeStage.activeStage).toBe("payment_review");
    expect(presentation.title).toBe("Pembayaran sedang diperiksa");
  });

  it("lets in-transit fulfillment outrank stale order and RPC summaries", () => {
    const presentation = resolveCustomerOrderPresentation({
      status: "completed",
      paymentStatus: "paid",
      fulfillmentStatus: "in_transit",
      fulfillmentMethod: "shipping",
      paymentMethod: "bank_transfer",
      paymentRequirementMet: true,
      paymentProductionEligible: true,
      paymentEffectiveTotal: 100_000,
      hasVerifiedPayment: true,
      activeStage: staleStage("order_review")
    });

    expect(presentation.activeStage.activeStage).toBe("shipping");
    expect(presentation.currentStage).toBe("Sedang Dikirim");
    expect(presentation.activeStage.isTerminal).toBe(false);
  });

  it("shows exactly six command-center stages", () => {
    const stage = resolveOrderActiveStage({
      status: "processing",
      paymentStatus: "paid",
      fulfillmentStatus: "packing",
      fulfillmentMethod: "shipping",
      paymentMethod: "bank_transfer",
      paymentRequirementMet: true,
      paymentProductionEligible: true,
      paymentEffectiveTotal: 100_000,
      hasVerifiedPayment: true
    });
    const journey = buildCompactOrderJourney({ stage, fulfillmentMethod: "shipping" });
    expect(journey).toHaveLength(6);
    expect(journey.map((step) => step.label)).toEqual([
      "Pesanan Masuk",
      "Verifikasi & Harga",
      "Pembayaran",
      "Persiapan / Produksi",
      "Pengiriman",
      "Selesai"
    ]);
  });

  it("does not finish when a package is only handed to a courier", () => {
    for (const fulfillmentStatus of ["shipped", "in_transit"]) {
      const stage = resolveCanonicalOrderActiveStage({
        status: "completed",
        paymentStatus: "paid",
        fulfillmentStatus,
        fulfillmentMethod: "shipping",
        paymentMethod: "bank_transfer",
        paymentRequirementMet: true,
        paymentProductionEligible: true,
        paymentEffectiveTotal: 100_000,
        hasVerifiedPayment: true
      });
      expect(stage.activeStage).toBe("shipping");
      expect(stage.isTerminal).toBe(false);
    }
  });

  it("finishes only after delivery or pickup completion", () => {
    expect(resolveCanonicalOrderActiveStage({
      status: "completed",
      paymentStatus: "paid",
      fulfillmentStatus: "delivered",
      fulfillmentMethod: "shipping"
    }).isTerminal).toBe(true);
    expect(resolveCanonicalOrderActiveStage({
      status: "completed",
      paymentStatus: "paid",
      fulfillmentStatus: "picked_up",
      fulfillmentMethod: "pickup"
    }).isTerminal).toBe(true);
  });

  it("uses official courier tracking landing pages and keeps copy fallback", () => {
    expect(resolveCarrierTrackingTarget("JNT", "JNT-123")).toMatchObject({
      carrierLabel: "J&T Express",
      trackingNumber: "JNT-123",
      href: "https://www.jet.co.id/track"
    });
    expect(resolveCarrierTrackingTarget("JNE Express", "JNE-123")?.href)
      .toBe("https://www.jne.co.id/tracking-package");
    expect(resolveCarrierTrackingTarget("Kurir Lokal", "LOCAL-1")).toBeNull();
  });

  it("makes the command center default and preserves the full legacy detail", () => {
    const route = read("app/admin/orders/[id]/page.tsx");
    const commandCenter = read("components/admin/OrderCommandCenterAdmin.tsx");
    const readModel = read("lib/admin-orders/read-model.ts");
    expect(route).toContain("<OrderCommandCenterAdmin orderId={id} />");
    expect(route).toContain("<OrderDetailAdmin orderId={id} />");
    expect(route).toContain('view === "full"');
    expect(commandCenter).toContain('type CommandTab = "summary" | "payment" | "operations" | "fulfillment" | "history"');
    expect(commandCenter).toContain("readModel.active_stage");
    expect(readModel).toContain("resolveCanonicalOrderActiveStage({");
    expect(commandCenter).not.toContain('rpc("resolve_order_active_stage_v1"');
  });

  it("keeps only one operational detail tab visible at a time", () => {
    const commandCenter = read("components/admin/OrderCommandCenterAdmin.tsx");
    expect(commandCenter).toContain('tab === "summary"');
    expect(commandCenter).toContain('tab === "payment"');
    expect(commandCenter).toContain('tab === "operations"');
    expect(commandCenter).toContain('tab === "fulfillment"');
    expect(commandCenter).toContain('tab === "history"');
    expect(commandCenter).toContain("Detail Lengkap");
  });
});
