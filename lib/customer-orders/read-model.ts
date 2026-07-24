import { resolveCanonicalOrderActiveStage } from "@/lib/canonical-order-stage";
import type {
  CustomerOrderCancellationReadModel,
  CustomerOrderConfirmationReadModel,
  CustomerOrderCustomQuoteReadModel,
  CustomerOrderItemPricingStatus,
  CustomerOrderItemReadModel,
  CustomerOrderPaymentLinkReadModel,
  CustomerOrderPickupReadModel,
  CustomerOrderPricingStatus,
  CustomerOrderRefundReadModel,
  CustomerOrderShippingQuoteReadModel,
  CustomerOrderTrackingReadModel
} from "@/lib/customer-orders/contracts";
import {
  customerOrderStatusLabel,
  customerPaymentStatusLabel,
  maskAddress,
  maskPhone,
  type TrackingAuthorizationRow
} from "@/lib/order-tracking";
import type { OrderActiveStageResolution } from "@/lib/order-active-stage";

export class CustomerOrderReadModelError extends Error {}

export type CustomerOrderServerProjection = {
  authorization: TrackingAuthorizationRow;
  paymentLinkOrder: {
    id: string;
    order_number: string;
    status: string;
    payment_status: string;
    pricing_status: CustomerOrderPricingStatus;
    total_amount: number;
    whatsapp_confirmed_at: string | null;
    archived_at: null;
    custom_project_snapshot: unknown;
    custom_quote_status: string | null;
    custom_quote_locked_at: string | null;
    custom_quote_locked_total: number | null;
    payment_method: string;
  };
  customerName: string;
  customerPhone: string;
  shippingAddress: string | null;
  order: {
    orderNumber: string;
    createdAt: string;
    status: string;
    paymentStatus: string;
    fulfillmentMethod: string;
    paymentMethod: string;
    subtotal: number;
    shippingCost: number | null;
    shippingCourier: string | null;
    shippingService: string | null;
    shippingEstimate: string | null;
    total: number;
    amountPaid: number;
    remainingBalance: number;
    whatsappConfirmationExpiresAt: string | null;
    whatsappConfirmedAt: string | null;
    reservationExpiresAt: string | null;
    finalTotalApprovedAt: string | null;
    trackingTokenExpiresAt: string | null;
    pricingStatus: CustomerOrderPricingStatus;
    customQuoteStatus: string | null;
    customQuoteVersion: number | null;
    customQuoteLockedAt: string | null;
  };
  items: CustomerOrderItemReadModel[];
  shippingQuote: CustomerOrderShippingQuoteReadModel | null;
  customQuote: CustomerOrderCustomQuoteReadModel | null;
  cancellation: CustomerOrderCancellationReadModel | null;
  refund: CustomerOrderRefundReadModel | null;
  pickup: CustomerOrderPickupReadModel | null;
  fulfillment: {
    method: string;
    status: string;
    courier: string | null;
    trackingNumber: string | null;
    finalVerifiedAt: string | null;
    updatedAt: string | null;
  } | null;
  activeStage: OrderActiveStageResolution;
  revision: string;
  projectedAt: string;
};

export function projectCustomerOrderServerReadModel(
  value: unknown,
  projectedAt = new Date().toISOString()
): CustomerOrderServerProjection | null {
  const row = record(value);
  if (!row) return null;

  const id = requiredText(row.id, "Order pelanggan tanpa id.");
  const orderNumber = requiredText(row.order_number, `Order ${id} tanpa nomor.`);
  const customerName = requiredText(row.customer_name, `Order ${id} tanpa nama pelanggan.`);
  const customerPhone = requiredText(row.customer_phone, `Order ${id} tanpa nomor pelanggan.`);
  const status = requiredText(row.status, `Order ${id} tanpa status.`);
  const paymentMethod = requiredText(row.payment_method, `Order ${id} tanpa metode pembayaran.`);
  const pricing = pricingStatus(row.pricing_status);
  const items = activeRecords(row.order_items)
    .sort(ascendingCreatedAt)
    .map(projectItem);
  const fulfillmentRow = latestActive(
    row.fulfillments,
    (candidate) => text(candidate.status) !== "cancelled"
  );
  const paymentRow = latestActive(row.order_payments);
  const jobRow = latestActive(row.job_orders);
  const qualityControlRow = jobRow ? latestActive(jobRow.qc_records) : null;
  const fulfillment = fulfillmentRow ? {
    method: requiredText(fulfillmentRow.method, "Fulfillment tanpa metode."),
    status: requiredText(fulfillmentRow.status, "Fulfillment tanpa status."),
    courier: nullableText(fulfillmentRow.courier),
    trackingNumber: nullableText(fulfillmentRow.tracking_number),
    finalVerifiedAt: nullableText(fulfillmentRow.final_verified_at),
    updatedAt: nullableText(fulfillmentRow.updated_at)
  } : null;
  const effectivePayment = effectivePaymentStatus(
    requiredText(row.payment_status, `Order ${id} tanpa status pembayaran.`),
    paymentRow
  );
  const amountPaid = amount(row.payment_effective_total);
  const customProjectSnapshot = row.custom_project_snapshot ?? [];
  const customQuoteStatus = nullableText(row.custom_quote_status);
  const customQuoteVersion = nullableInteger(row.custom_quote_version);
  const customQuoteLockedAt = nullableText(row.custom_quote_locked_at);
  const customQuoteLockedTotal = nullableAmount(row.custom_quote_locked_total);
  const whatsappConfirmedAt = nullableText(row.whatsapp_confirmed_at);
  const paymentRequirementMet = boolean(row.payment_requirement_met);
  const paymentProductionEligible = boolean(row.payment_production_eligible);
  const isCustom = items.some((item) => Boolean(item.customProjectId))
    || (Array.isArray(customProjectSnapshot) && customProjectSnapshot.length > 0);

  const activeStage = resolveCanonicalOrderActiveStage({
    orderId: id,
    orderNumber,
    status,
    paymentStatus: effectivePayment,
    latestPaymentStatus: paymentRow ? nullableText(paymentRow.status) : null,
    latestPaymentReviewOutcome: paymentRow ? nullableText(paymentRow.review_outcome) : null,
    fulfillmentStatus: fulfillment?.status ?? null,
    fulfillmentMethod: fulfillment?.method ?? text(row.delivery_method),
    paymentMethod,
    pricingStatus: pricing,
    customQuoteStatus,
    customQuoteVersion,
    isCustom,
    whatsappConfirmed: Boolean(whatsappConfirmedAt),
    paymentRequirementMet,
    paymentProductionEligible,
    paymentEffectiveTotal: amountPaid,
    hasVerifiedPayment: amountPaid > 0,
    hasJobOrder: Boolean(jobRow),
    jobOrderStatus: jobRow ? nullableText(jobRow.status) : null,
    qualityControlStatus: qualityControlRow
      ? nullableText(qualityControlRow.result) ?? nullableText(qualityControlRow.status)
      : null,
    finalVerificationCompleted: Boolean(fulfillment?.finalVerifiedAt),
    trackingNumber: fulfillment?.trackingNumber ?? null,
    taskRevision: latestRevision([
      nullableText(row.updated_at),
      fulfillment?.updatedAt,
      paymentRow ? nullableText(paymentRow.updated_at) : null,
      jobRow ? nullableText(jobRow.updated_at) : null,
      qualityControlRow ? nullableText(qualityControlRow.updated_at) : null
    ])
  });

  return {
    authorization: {
      id,
      public_access_token_hash: nullableText(row.public_access_token_hash),
      public_access_token_expires_at: nullableText(row.public_access_token_expires_at),
      customer_phone: customerPhone
    },
    paymentLinkOrder: {
      id,
      order_number: orderNumber,
      status,
      payment_status: effectivePayment,
      pricing_status: pricing,
      total_amount: amount(row.total_amount),
      whatsapp_confirmed_at: whatsappConfirmedAt,
      archived_at: null,
      custom_project_snapshot: customProjectSnapshot,
      custom_quote_status: customQuoteStatus,
      custom_quote_locked_at: customQuoteLockedAt,
      custom_quote_locked_total: customQuoteLockedTotal,
      payment_method: paymentMethod
    },
    customerName,
    customerPhone,
    shippingAddress: nullableText(row.shipping_address),
    order: {
      orderNumber,
      createdAt: requiredText(row.created_at, `Order ${id} tanpa waktu pembuatan.`),
      status,
      paymentStatus: effectivePayment,
      fulfillmentMethod: fulfillment?.method ?? requiredText(row.delivery_method, `Order ${id} tanpa metode penyerahan.`),
      paymentMethod,
      subtotal: amount(row.subtotal_amount),
      shippingCost: nullableAmount(row.shipping_cost),
      shippingCourier: nullableText(row.shipping_courier),
      shippingService: nullableText(row.shipping_service),
      shippingEstimate: nullableText(row.shipping_estimate),
      total: amount(row.total_amount),
      amountPaid,
      remainingBalance: amount(row.payment_balance),
      whatsappConfirmationExpiresAt: nullableText(row.whatsapp_confirmation_expires_at),
      whatsappConfirmedAt,
      reservationExpiresAt: nullableText(row.reservation_expires_at),
      finalTotalApprovedAt: nullableText(row.final_total_approved_at),
      trackingTokenExpiresAt: nullableText(row.public_access_token_expires_at),
      pricingStatus: pricing,
      customQuoteStatus,
      customQuoteVersion,
      customQuoteLockedAt
    },
    items,
    shippingQuote: projectLatestShippingQuote(row.order_shipping_quotes),
    customQuote: projectActiveCustomQuote(
      row.custom_order_quotation_versions,
      customQuoteVersion
    ),
    cancellation: projectLatestCancellation(row.order_cancellation_requests),
    refund: projectLatestRefund(row.refund_cases),
    pickup: projectLatestPickup(row.pickup_preparations),
    fulfillment,
    activeStage,
    revision: latestRevision(collectRevisionValues(row)),
    projectedAt
  };
}

export function toCustomerOrderConfirmationReadModel(
  projection: CustomerOrderServerProjection,
  payment: CustomerOrderPaymentLinkReadModel
): CustomerOrderConfirmationReadModel {
  return {
    kind: "confirmation",
    revision: projection.revision,
    projectedAt: projection.projectedAt,
    terminal: projection.activeStage.isTerminal,
    order: {
      ...baseOrder(projection),
      customerName: projection.customerName,
      shippingCourier: projection.order.shippingCourier,
      shippingService: projection.order.shippingService,
      shippingEstimate: projection.order.shippingEstimate,
      whatsappConfirmationExpiresAt: projection.order.whatsappConfirmationExpiresAt,
      whatsappConfirmedAt: projection.order.whatsappConfirmedAt,
      reservationExpiresAt: projection.order.reservationExpiresAt,
      finalTotalApprovedAt: projection.order.finalTotalApprovedAt,
      trackingTokenExpiresAt: projection.order.trackingTokenExpiresAt,
      customQuoteStatus: projection.order.customQuoteStatus,
      customQuoteVersion: projection.order.customQuoteVersion,
      customQuoteLockedAt: projection.order.customQuoteLockedAt
    },
    items: projection.items,
    shippingQuote: projection.shippingQuote,
    customQuote: projection.customQuote,
    payment,
    activeStage: projection.activeStage
  };
}

export function toCustomerOrderTrackingReadModel(
  projection: CustomerOrderServerProjection,
  payment: CustomerOrderPaymentLinkReadModel
): CustomerOrderTrackingReadModel {
  return {
    kind: "tracking",
    revision: projection.revision,
    projectedAt: projection.projectedAt,
    terminal: projection.activeStage.isTerminal,
    order: {
      ...baseOrder(projection),
      maskedAddress: projection.order.fulfillmentMethod === "shipping"
        ? maskAddress(projection.shippingAddress)
        : null,
      statusLabel: customerOrderStatusLabel(projection.order.status),
      paymentStatusLabel: customerPaymentStatusLabel(projection.order.paymentStatus),
      amountPaid: projection.order.amountPaid,
      remainingBalance: projection.order.remainingBalance,
      courier: projection.fulfillment?.courier ?? projection.order.shippingCourier,
      trackingNumber: projection.fulfillment?.trackingNumber ?? null,
      pickupStatus: projection.order.fulfillmentMethod === "pickup"
        ? projection.fulfillment?.status ?? projection.order.status
        : null,
      fulfillmentStatus: projection.fulfillment?.status ?? null,
      nextStep: projection.activeStage.nextStep
    },
    items: projection.items,
    shippingQuote: projection.shippingQuote,
    payment,
    activeStage: projection.activeStage,
    customerOperations: {
      cancellation: projection.cancellation,
      refund: projection.refund,
      pickup: projection.pickup
    }
  };
}

function baseOrder(projection: CustomerOrderServerProjection) {
  return {
    orderNumber: projection.order.orderNumber,
    createdAt: projection.order.createdAt,
    maskedPhone: maskPhone(projection.customerPhone),
    status: projection.order.status,
    paymentStatus: projection.order.paymentStatus,
    fulfillmentMethod: projection.order.fulfillmentMethod,
    paymentMethod: projection.order.paymentMethod,
    subtotal: projection.order.subtotal,
    shippingCost: projection.order.shippingCost,
    total: projection.order.total,
    pricingStatus: projection.order.pricingStatus
  };
}

function projectItem(row: Record<string, unknown>): CustomerOrderItemReadModel {
  const id = requiredText(row.id, "Item order pelanggan tanpa id.");
  return {
    id,
    productName: requiredText(row.product_name, `Item ${id} tanpa nama produk.`),
    variantName: nullableText(row.variant_name),
    color: text(row.color),
    size: text(row.size),
    sku: nullableText(row.sku),
    quantity: positiveInteger(row.quantity),
    unitPrice: amount(row.unit_price),
    subtotal: amount(row.subtotal),
    customProjectId: nullableText(row.custom_project_id),
    pricingStatus: itemPricingStatus(row.pricing_status)
  };
}

function projectLatestShippingQuote(value: unknown) {
  const row =
    arrayRecords(value).sort(
      (left, right) => number(right.version) - number(left.version)
    )[0] ?? null;
  if (!row) return null;
  return {
    version: positiveInteger(row.version),
    courier: requiredText(row.courier, "Quote ongkir tanpa kurir."),
    service: requiredText(row.service, "Quote ongkir tanpa layanan."),
    cost: amount(row.cost),
    estimate: nullableText(row.estimate),
    total: amount(row.total_snapshot),
    status: requiredText(row.status, "Quote ongkir tanpa status."),
    createdAt: requiredText(row.created_at, "Quote ongkir tanpa waktu pembuatan.")
  } satisfies CustomerOrderShippingQuoteReadModel;
}

function projectActiveCustomQuote(value: unknown, activeVersion: number | null) {
  if (activeVersion === null) return null;
  const row = arrayRecords(value).find(
    (candidate) => number(candidate.version_number) === activeVersion
  );
  if (!row) return null;
  return {
    versionNumber: positiveInteger(row.version_number),
    status: requiredText(row.status, "Penawaran Custom tanpa status."),
    quotedTotal: amount(row.quoted_total),
    pricingComponents: row.pricing_components ?? {},
    designVersionSnapshot: row.design_version_snapshot ?? {},
    validUntil: requiredText(row.valid_until, "Penawaran Custom tanpa masa berlaku."),
    sentAt: requiredText(row.sent_at, "Penawaran Custom tanpa waktu kirim."),
    lockedAt: nullableText(row.locked_at)
  } satisfies CustomerOrderCustomQuoteReadModel;
}

function projectLatestCancellation(value: unknown) {
  const row = latest(value);
  if (!row) return null;
  return {
    id: requiredText(row.id, "Permintaan pembatalan tanpa id."),
    status: requiredText(row.status, "Permintaan pembatalan tanpa status."),
    reason: requiredText(row.reason, "Permintaan pembatalan tanpa alasan."),
    requiresRefund: boolean(row.requires_refund),
    requestedAt: requiredText(row.requested_at, "Permintaan pembatalan tanpa waktu."),
    decisionReason: nullableText(row.decision_reason)
  } satisfies CustomerOrderCancellationReadModel;
}

function projectLatestRefund(value: unknown) {
  const row = latest(value);
  if (!row) return null;
  return {
    id: requiredText(row.id, "Refund tanpa id."),
    refundNumber: requiredText(row.refund_number, "Refund tanpa nomor."),
    status: requiredText(row.status, "Refund tanpa status."),
    amount: amount(row.amount),
    sentAt: nullableText(row.sent_at),
    confirmedAt: nullableText(row.confirmed_at)
  } satisfies CustomerOrderRefundReadModel;
}

function projectLatestPickup(value: unknown) {
  const row = latest(value);
  if (!row) return null;
  return {
    id: requiredText(row.id, "Persiapan pickup tanpa id."),
    status: requiredText(row.status, "Persiapan pickup tanpa status."),
    readyAt: nullableText(row.ready_at),
    pickupDeadline: nullableText(row.pickup_deadline),
    extensionRequestedAt: nullableText(row.extension_requested_at),
    requestedDeadline: nullableText(row.requested_deadline),
    expiredAt: nullableText(row.expired_at)
  } satisfies CustomerOrderPickupReadModel;
}

function effectivePaymentStatus(
  orderStatus: string,
  latestPayment: Record<string, unknown> | null
) {
  const status = normalized(latestPayment?.status);
  const outcome = normalized(latestPayment?.review_outcome);
  if (status === "pending" || outcome === "pending") return "pending_verification";
  if ([
    "rejected",
    "ditolak",
    "funds_not_found",
    "correction_requested",
    "correction_required",
    "needs_correction",
    "proof_unclear"
  ].includes(status) || [
    "rejected",
    "ditolak",
    "funds_not_found",
    "correction_requested",
    "correction_required",
    "needs_correction",
    "proof_unclear"
  ].includes(outcome)) return "rejected";
  if (["verified", "paid", "terverifikasi"].includes(status)
    || ["verified", "paid", "terverifikasi"].includes(outcome)) return "paid";
  return orderStatus;
}

function collectRevisionValues(row: Record<string, unknown>) {
  const values = [nullableText(row.updated_at), nullableText(row.created_at)];
  for (const key of [
    "order_items",
    "stock_reservations",
    "order_shipping_quotes",
    "custom_order_quotation_versions",
    "fulfillments",
    "order_payments",
    "pickup_preparations",
    "order_cancellation_requests",
    "refund_cases",
    "job_orders"
  ]) {
    for (const candidate of arrayRecords(row[key])) {
      values.push(
        nullableText(candidate.updated_at)
        ?? nullableText(candidate.approved_at)
        ?? nullableText(candidate.locked_at)
        ?? nullableText(candidate.sent_at)
        ?? nullableText(candidate.created_at)
      );
      if (key === "job_orders") {
        for (const qc of arrayRecords(candidate.qc_records)) {
          values.push(nullableText(qc.updated_at) ?? nullableText(qc.created_at));
        }
      }
    }
  }
  return values;
}

function latest(value: unknown) {
  return arrayRecords(value).sort(descendingCreatedAt)[0] ?? null;
}

function activeRecords(value: unknown) {
  return arrayRecords(value).filter((row) => row.archived_at === null);
}

function latestActive(
  value: unknown,
  predicate: (row: Record<string, unknown>) => boolean = () => true
) {
  return activeRecords(value).filter(predicate).sort(descendingCreatedAt)[0] ?? null;
}

function ascendingCreatedAt(left: Record<string, unknown>, right: Record<string, unknown>) {
  return timestamp(left.created_at) - timestamp(right.created_at);
}

function descendingCreatedAt(left: Record<string, unknown>, right: Record<string, unknown>) {
  return timestamp(right.created_at) - timestamp(left.created_at);
}

function latestRevision(values: Array<string | null | undefined>) {
  return values.filter((value): value is string => Boolean(value)).sort().at(-1) ?? "";
}

function pricingStatus(value: unknown): CustomerOrderPricingStatus {
  if (value === "final" || value === "estimated" || value === "quotation_required") return value;
  throw new CustomerOrderReadModelError("Status harga order pelanggan tidak dikenali.");
}

function itemPricingStatus(value: unknown): CustomerOrderItemPricingStatus {
  if (value === "confirmed") return value;
  return pricingStatus(value);
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : null;
}

function arrayRecords(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.flatMap((candidate) => {
      const row = record(candidate);
      return row ? [row] : [];
    })
    : [];
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalized(value: unknown) {
  return text(value).toLowerCase();
}

function nullableText(value: unknown) {
  return text(value) || null;
}

function requiredText(value: unknown, message: string) {
  const result = text(value);
  if (!result) throw new CustomerOrderReadModelError(message);
  return result;
}

function amount(value: unknown) {
  const result = number(value);
  if (!Number.isSafeInteger(result) || result < 0) {
    throw new CustomerOrderReadModelError("Nilai transaksi pelanggan tidak valid.");
  }
  return result;
}

function nullableAmount(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  return amount(value);
}

function positiveInteger(value: unknown) {
  const result = amount(value);
  if (result < 1) throw new CustomerOrderReadModelError("Nilai urutan atau quantity tidak valid.");
  return result;
}

function nullableInteger(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  return positiveInteger(value);
}

function number(value: unknown) {
  return typeof value === "number"
    ? value
    : typeof value === "string" && value.trim()
      ? Number(value)
      : Number.NaN;
}

function boolean(value: unknown) {
  return value === true;
}

function timestamp(value: unknown) {
  const parsed = Date.parse(text(value));
  return Number.isFinite(parsed) ? parsed : 0;
}
