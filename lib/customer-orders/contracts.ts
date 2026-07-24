import type { OrderActiveStageResolution } from "@/lib/order-active-stage";

export type CustomerOrderPricingStatus = "final" | "estimated" | "quotation_required";
export type CustomerOrderItemPricingStatus = CustomerOrderPricingStatus | "confirmed";

export type CustomerOrderItemReadModel = {
  id: string;
  productName: string;
  variantName: string | null;
  color: string;
  size: string;
  sku: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  customProjectId: string | null;
  pricingStatus: CustomerOrderItemPricingStatus;
};

export type CustomerOrderShippingQuoteReadModel = {
  version: number;
  courier: string;
  service: string;
  cost: number;
  estimate: string | null;
  total: number;
  status: string;
  createdAt: string;
};

export type CustomerOrderCustomQuoteReadModel = {
  versionNumber: number;
  status: string;
  quotedTotal: number;
  pricingComponents: unknown;
  designVersionSnapshot: unknown;
  validUntil: string;
  sentAt: string;
  lockedAt: string | null;
};

export type CustomerOrderPaymentLinkReadModel = {
  url: string | null;
  expiresAt: string | null;
  unavailableReason: string | null;
};

export type CustomerOrderBaseReadModel = {
  revision: string;
  projectedAt: string;
  terminal: boolean;
  order: {
    orderNumber: string;
    createdAt: string;
    maskedPhone: string;
    status: string;
    paymentStatus: string;
    fulfillmentMethod: string;
    paymentMethod: string;
    subtotal: number;
    shippingCost: number | null;
    total: number;
    pricingStatus: CustomerOrderPricingStatus;
  };
  items: CustomerOrderItemReadModel[];
  shippingQuote: CustomerOrderShippingQuoteReadModel | null;
  payment: CustomerOrderPaymentLinkReadModel;
  activeStage: OrderActiveStageResolution;
};

export type CustomerOrderConfirmationReadModel = CustomerOrderBaseReadModel & {
  kind: "confirmation";
  order: CustomerOrderBaseReadModel["order"] & {
    customerName: string;
    shippingCourier: string | null;
    shippingService: string | null;
    shippingEstimate: string | null;
    whatsappConfirmationExpiresAt: string | null;
    whatsappConfirmedAt: string | null;
    reservationExpiresAt: string | null;
    finalTotalApprovedAt: string | null;
    trackingTokenExpiresAt: string | null;
    customQuoteStatus: string | null;
    customQuoteVersion: number | null;
    customQuoteLockedAt: string | null;
  };
  customQuote: CustomerOrderCustomQuoteReadModel | null;
};

export type CustomerOrderCancellationReadModel = {
  id: string;
  status: string;
  reason: string;
  requiresRefund: boolean;
  requestedAt: string;
  decisionReason: string | null;
};

export type CustomerOrderRefundReadModel = {
  id: string;
  refundNumber: string;
  status: string;
  amount: number;
  sentAt: string | null;
  confirmedAt: string | null;
};

export type CustomerOrderPickupReadModel = {
  id: string;
  status: string;
  readyAt: string | null;
  pickupDeadline: string | null;
  extensionRequestedAt: string | null;
  requestedDeadline: string | null;
  expiredAt: string | null;
};

export type CustomerOrderTrackingReadModel = CustomerOrderBaseReadModel & {
  kind: "tracking";
  order: CustomerOrderBaseReadModel["order"] & {
    maskedAddress: string | null;
    statusLabel: string;
    paymentStatusLabel: string;
    amountPaid: number;
    remainingBalance: number;
    courier: string | null;
    trackingNumber: string | null;
    pickupStatus: string | null;
    fulfillmentStatus: string | null;
    nextStep: string;
  };
  customerOperations: {
    cancellation: CustomerOrderCancellationReadModel | null;
    refund: CustomerOrderRefundReadModel | null;
    pickup: CustomerOrderPickupReadModel | null;
  };
};

export type CustomerOrderTrackingCredentials = {
  orderNumber: string;
  token?: string;
  whatsapp?: string;
};

export type CustomerOrderApiErrorCode =
  | "CUSTOMER_ORDER_INVALID_REQUEST"
  | "CUSTOMER_ORDER_NOT_FOUND"
  | "CUSTOMER_ORDER_ACCESS_EXPIRED"
  | "CUSTOMER_ORDER_ACCESS_DENIED"
  | "CUSTOMER_ORDER_RATE_LIMITED"
  | "CUSTOMER_ORDER_UNAVAILABLE"
  | "CUSTOMER_ORDER_ACTION_FAILED";

