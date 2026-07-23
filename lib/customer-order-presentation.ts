import { buildOrderJourney, type OrderJourneyStep } from "@/lib/order-journey";
import { resolveCanonicalOrderActiveStage } from "@/lib/canonical-order-stage";
import {
  resolveOrderActiveStageFromServer,
  type OrderActiveStageInput,
  type OrderActiveStageResolution
} from "@/lib/order-active-stage";

const PAYMENT_REVIEW_CUSTOMER_TITLE = "Pembayaran sedang diperiksa";

export type CustomerOrderResponsibility = "customer" | "debroder" | "none";
export type CustomerOrderTone = "action" | "processing" | "success" | "warning";
export type CustomerOrderAction =
  | "verify_whatsapp"
  | "approve_quote"
  | "approve_total"
  | "pay"
  | "resubmit_payment"
  | "contact_admin"
  | "pickup"
  | "track_only"
  | null;

export type CustomerOrderPresentationInput = OrderActiveStageInput & {
  activeStage?: OrderActiveStageResolution | null;
};

export type CustomerOrderPresentation = {
  responsibility: CustomerOrderResponsibility;
  responsibilityLabel: string;
  tone: CustomerOrderTone;
  title: string;
  description: string;
  nextStep: string;
  previousStage: string;
  currentStage: string;
  nextStage: string;
  action: CustomerOrderAction;
  blockingReason: string | null;
  warning: string | null;
  journey: OrderJourneyStep[];
  activeStage: OrderActiveStageResolution;
  fulfillmentMethod: string | null;
};

// Browser dan Admin memakai resolver TypeScript yang sama. Nilai RPC lama hanya
// dianggap payload kompatibilitas dan tidak boleh mengalahkan fakta pembayaran,
// fulfillment, QC, atau produksi terbaru yang sudah diberikan pada input.
export function resolveCustomerOrderPresentation(
  input: CustomerOrderPresentationInput
): CustomerOrderPresentation {
  const canonicalStage = resolveCanonicalOrderActiveStage(input);
  // Preserve the frozen compatibility contract while passing the already-resolved
  // canonical stage as the authoritative payload. Stale RPC data never wins here.
  const stage = resolveOrderActiveStageFromServer(input, canonicalStage);
  return {
    responsibility: stage.responsibility,
    responsibilityLabel: stage.responsibilityLabel,
    tone: stage.tone,
    title: stage.activeStage === "payment_review"
      ? PAYMENT_REVIEW_CUSTOMER_TITLE
      : stage.customerTitle,
    description: stage.customerDescription,
    nextStep: stage.nextStep,
    previousStage: stage.previousStage,
    currentStage: stage.customerStatusLabel,
    nextStage: stage.nextStage,
    action: customerAction(stage),
    blockingReason: stage.blockingReason,
    warning: stage.warning,
    journey: buildOrderJourney({ stage, fulfillmentMethod: input.fulfillmentMethod }),
    activeStage: stage,
    fulfillmentMethod: input.fulfillmentMethod ?? null
  };
}

function customerAction(stage: OrderActiveStageResolution): CustomerOrderAction {
  switch (stage.primaryAction) {
    case "verify_whatsapp":
      return "verify_whatsapp";
    case "approve_quote":
      return "approve_quote";
    case "approve_total":
      return "approve_total";
    case "open_payment":
      return "pay";
    case "resubmit_payment":
      return "resubmit_payment";
    case "handover_pickup":
      return "pickup";
    case "contact_admin":
      return "contact_admin";
    default:
      return "track_only";
  }
}
