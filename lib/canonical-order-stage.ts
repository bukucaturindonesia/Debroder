import {
  resolveOrderActiveStage,
  type OrderActiveStageInput,
  type OrderActiveStageResolution
} from "@/lib/order-active-stage";

const ORDER_COMPLETION_SUMMARIES = new Set(["completed", "selesai"]);
const FULFILLMENT_COMPLETE = new Set(["delivered", "picked_up", "completed", "selesai"]);

/**
 * Canonical browser/admin resolver for B4-O1.
 *
 * Concrete child-domain facts outrank stale summary columns. In particular,
 * an order summary cannot close a shipment that is still with the courier.
 */
export function resolveCanonicalOrderActiveStage(
  input: OrderActiveStageInput
): OrderActiveStageResolution {
  const orderStatus = normalized(input.status);
  const fulfillmentStatus = normalized(input.fulfillmentStatus);

  if (ORDER_COMPLETION_SUMMARIES.has(orderStatus)
    && !FULFILLMENT_COMPLETE.has(fulfillmentStatus)) {
    if (fulfillmentStatus) {
      const stage = resolveOrderActiveStage({ ...input, status: "processing" });
      const warning = "Status selesai pada order diabaikan karena fulfillment belum delivered atau picked_up.";
      return {
        ...stage,
        warning: stage.warning ?? warning,
        warnings: unique([warning, ...stage.warnings])
      };
    }

    return completionIntegrityReview(input);
  }

  return resolveOrderActiveStage(input);
}

function completionIntegrityReview(input: OrderActiveStageInput): OrderActiveStageResolution {
  const lifecycleKind = input.isCustom ? "custom" : "ready_stock";
  const warning = "Pesanan berstatus selesai tetapi belum memiliki bukti fulfillment delivered atau picked_up.";
  return {
    activeStage: "integrity_review",
    lifecycleKind,
    responsibility: "debroder",
    responsibilityLabel: "SEDANG DIPROSES DEBRODER",
    tone: "warning",
    customerStatusLabel: "Status Sedang Diperbarui",
    adminStatusLabel: "Periksa Penyelesaian Pesanan",
    customerTitle: "Status pesanan sedang diperiksa",
    customerDescription: "Pesanan tetap tersimpan. Tim DEBRODER sedang memastikan bukti penerimaan atau serah-terima sebelum menutup pesanan.",
    adminTaskType: "resolve_integrity",
    primaryAction: "review_order",
    secondaryAction: "track",
    previousStage: "Pengiriman / Pickup",
    nextStage: "Selesai",
    nextStep: "Konfirmasi delivered atau picked_up setelah penerimaan benar-benar terbukti.",
    blockingReason: warning,
    warning,
    warnings: [warning],
    taskKey: canonicalTaskKey(input),
    isTerminal: false
  };
}

function canonicalTaskKey(input: OrderActiveStageInput) {
  const id = normalized(input.orderId) || normalized(input.orderNumber);
  return id ? `order:${id}:resolve_integrity:completion` : null;
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function normalized(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}
