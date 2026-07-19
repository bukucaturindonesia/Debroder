import {
  resolveOrderActiveStageFromServer,
  type OrderActiveStageInput,
  type OrderActiveStageResolution
} from "@/lib/order-active-stage";

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
};

// Canonical payment-review title remains “Pembayaran sedang diperiksa” for customer-facing consistency.
export function resolveCustomerOrderPresentation(
  input: CustomerOrderPresentationInput
): CustomerOrderPresentation {
  const stage = resolveOrderActiveStageFromServer(input, input.activeStage);
  return {
    responsibility: stage.responsibility,
    responsibilityLabel: stage.responsibilityLabel,
    tone: stage.tone,
    title: stage.customerTitle,
    description: stage.customerDescription,
    nextStep: stage.nextStep,
    previousStage: stage.previousStage,
    currentStage: stage.customerStatusLabel,
    nextStage: stage.nextStage,
    action: customerAction(stage),
    blockingReason: stage.blockingReason,
    warning: stage.warning
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
