import { resolveAdminOrderWorkspaceKind } from "@/lib/admin-order-detail";
import { resolveCanonicalOrderActiveStage } from "@/lib/canonical-order-stage";
import type {
  AdminOrderDetailReadModel,
  AdminOrderDomainSummary,
  AdminOrderFulfillmentSummary,
  AdminOrderItemPricingStatus,
  AdminOrderListReadModel,
  AdminOrderPaymentSummary,
  AdminOrderPricingStatus,
  AdminOrderQualityControlSummary,
  AdminOrderReadModelItem,
  AdminOrderReadModelOrder
} from "@/lib/admin-orders/contracts";

export class AdminOrderReadModelError extends Error {}

export function projectAdminOrderListReadModel(
  value: unknown,
  projectedAt = new Date().toISOString()
): AdminOrderListReadModel {
  const orders = arrayRecords(value).map((row) => {
    const id = requiredText(row.id, "Order tanpa id.");
    const fulfillment = latestActive(
      row.fulfillments,
      (candidate) => text(candidate.status) !== "cancelled"
    );
    return {
      id,
      order_number: requiredText(row.order_number, `Order ${id} tanpa nomor.`),
      customer_name: requiredText(row.customer_name, `Order ${id} tanpa nama pelanggan.`),
      company_name: nullableText(row.company_name),
      status: requiredText(row.status, `Order ${id} tanpa status.`),
      pricing_status: pricingStatus(row.pricing_status),
      payment_status: text(row.payment_status) || "unpaid",
      fulfillment_status: fulfillment ? text(fulfillment.status) || null : null,
      total_amount: amount(row.total_amount),
      created_at: requiredText(row.created_at, `Order ${id} tanpa waktu pembuatan.`),
      updated_at: requiredText(row.updated_at, `Order ${id} tanpa waktu pembaruan.`)
    };
  });
  return { orders, projected_at: projectedAt };
}

export function projectAdminOrderDetailReadModel(
  value: unknown,
  projectedAt = new Date().toISOString()
): AdminOrderDetailReadModel | null {
  const row = record(value);
  if (!row) return null;

  const order = projectOrder(row);
  const items = activeRecords(row.order_items)
    .sort(ascendingCreatedAt)
    .map(projectItem);
  const jobRow = latestActive(row.job_orders);
  const fulfillmentRow = latestActive(
    row.fulfillments,
    (candidate) => text(candidate.status) !== "cancelled"
  );
  const paymentRow = latestActive(row.order_payments);
  const qualityControlRow = jobRow ? latestActive(jobRow.qc_records) : null;

  const jobOrder = jobRow ? projectDomain(jobRow) : null;
  const fulfillment = fulfillmentRow ? projectFulfillment(fulfillmentRow) : null;
  const latestPayment = paymentRow ? projectPayment(paymentRow) : null;
  const qualityControl = qualityControlRow ? projectQualityControl(qualityControlRow) : null;

  const activeStage = resolveCanonicalOrderActiveStage({
    orderId: order.id,
    orderNumber: order.order_number,
    status: order.status,
    paymentStatus: order.payment_status,
    latestPaymentStatus: latestPayment?.status ?? null,
    latestPaymentReviewOutcome: latestPayment?.review_outcome ?? null,
    fulfillmentStatus: fulfillment?.status ?? null,
    fulfillmentMethod: fulfillment?.method ?? order.delivery_method,
    paymentMethod: order.payment_method,
    pricingStatus: order.pricing_status,
    customQuoteStatus: order.custom_quote_status,
    isCustom: resolveAdminOrderWorkspaceKind(order.custom_project_snapshot) === "custom",
    whatsappConfirmed: Boolean(order.whatsapp_confirmed_at),
    paymentRequirementMet: order.payment_requirement_met,
    paymentProductionEligible: order.payment_production_eligible,
    paymentEffectiveTotal: order.payment_effective_total,
    hasVerifiedPayment: order.payment_effective_total > 0,
    hasJobOrder: Boolean(jobOrder),
    jobOrderStatus: jobOrder?.status ?? null,
    qualityControlStatus: qualityControl?.result ?? qualityControl?.status ?? null,
    finalVerificationCompleted: Boolean(fulfillment?.final_verified_at),
    trackingNumber: fulfillment?.tracking_number ?? null,
    taskRevision: fulfillment?.updated_at
      ?? jobOrder?.updated_at
      ?? latestPayment?.updated_at
      ?? order.updated_at
  });

  return {
    order,
    items,
    job_order: jobOrder,
    quality_control: qualityControl,
    fulfillment,
    latest_payment: latestPayment,
    active_stage: activeStage,
    revision: latestRevision([
      order.updated_at,
      ...items.map((item) => item.created_at),
      jobOrder?.updated_at,
      qualityControl?.updated_at,
      fulfillment?.updated_at,
      latestPayment?.updated_at
    ]),
    projected_at: projectedAt
  };
}

function projectOrder(row: Record<string, unknown>): AdminOrderReadModelOrder {
  const id = requiredText(row.id, "Order tanpa id.");
  return {
    id,
    order_number: requiredText(row.order_number, `Order ${id} tanpa nomor.`),
    quotation_id: nullableText(row.quotation_id),
    customer_name: requiredText(row.customer_name, `Order ${id} tanpa nama pelanggan.`),
    company_name: nullableText(row.company_name),
    customer_phone: requiredText(row.customer_phone, `Order ${id} tanpa nomor pelanggan.`),
    customer_email: nullableText(row.customer_email),
    shipping_address: text(row.shipping_address),
    delivery_method: text(row.delivery_method) || "pickup",
    customer_notes: text(row.customer_notes),
    admin_notes: text(row.admin_notes),
    status: requiredText(row.status, `Order ${id} tanpa status.`),
    pricing_status: pricingStatus(row.pricing_status),
    custom_quote_status: nullableText(row.custom_quote_status),
    custom_project_snapshot: row.custom_project_snapshot ?? [],
    source_snapshot: row.source_snapshot ?? {},
    subtotal_amount: amount(row.subtotal_amount),
    total_amount: amount(row.total_amount),
    payment_required_amount: nullableAmount(row.payment_required_amount),
    payment_effective_total: amount(row.payment_effective_total),
    payment_production_eligible: boolean(row.payment_production_eligible),
    payment_requirement_met: boolean(row.payment_requirement_met),
    payment_balance: amount(row.payment_balance),
    payment_method: nullableText(row.payment_method),
    payment_status: text(row.payment_status) || "unpaid",
    currency: text(row.currency) || "IDR",
    converted_at: nullableText(row.converted_at),
    archived_at: nullableText(row.archived_at),
    checkout_source: nullableText(row.checkout_source),
    whatsapp_confirmed_at: nullableText(row.whatsapp_confirmed_at),
    created_at: requiredText(row.created_at, `Order ${id} tanpa waktu pembuatan.`),
    updated_at: requiredText(row.updated_at, `Order ${id} tanpa waktu pembaruan.`)
  };
}

function projectItem(row: Record<string, unknown>): AdminOrderReadModelItem {
  const id = requiredText(row.id, "Item order tanpa id.");
  return {
    id,
    product_name: requiredText(row.product_name, `Item ${id} tanpa nama produk.`),
    variant_name: nullableText(row.variant_name),
    color: text(row.color),
    size: text(row.size),
    sku: nullableText(row.sku),
    quantity: integer(row.quantity),
    unit_price: amount(row.unit_price),
    subtotal: amount(row.subtotal),
    notes: text(row.notes),
    config_snapshot: row.config_snapshot ?? {},
    required_services: row.required_services ?? [],
    estimated_total: nullableAmount(row.estimated_total),
    pricing_status: itemPricingStatus(row.pricing_status),
    custom_project_id: nullableText(row.custom_project_id),
    custom_project_item_id: nullableText(row.custom_project_item_id),
    pricing_snapshot: row.pricing_snapshot ?? {},
    created_at: requiredText(row.created_at, `Item ${id} tanpa waktu pembuatan.`)
  };
}

function projectDomain(row: Record<string, unknown>): AdminOrderDomainSummary {
  return {
    id: requiredText(row.id, "Domain order tanpa id."),
    status: requiredText(row.status, "Domain order tanpa status."),
    updated_at: nullableText(row.updated_at)
  };
}

function projectQualityControl(row: Record<string, unknown>): AdminOrderQualityControlSummary {
  return {
    ...projectDomain(row),
    result: nullableText(row.result)
  };
}

function projectFulfillment(row: Record<string, unknown>): AdminOrderFulfillmentSummary {
  return {
    ...projectDomain(row),
    method: requiredText(row.method, "Fulfillment tanpa metode."),
    courier: nullableText(row.courier),
    tracking_number: nullableText(row.tracking_number),
    final_verified_at: nullableText(row.final_verified_at)
  };
}

function projectPayment(row: Record<string, unknown>): AdminOrderPaymentSummary {
  return {
    id: requiredText(row.id, "Pembayaran tanpa id."),
    payment_number: requiredText(row.payment_number, "Pembayaran tanpa nomor."),
    amount: amount(row.amount),
    verified_amount: nullableAmount(row.verified_amount),
    status: requiredText(row.status, "Pembayaran tanpa status."),
    review_outcome: nullableText(row.review_outcome),
    updated_at: nullableText(row.updated_at)
  };
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

function pricingStatus(value: unknown): AdminOrderPricingStatus {
  if (value === "final" || value === "estimated" || value === "quotation_required") return value;
  throw new AdminOrderReadModelError("Status harga order tidak dikenali.");
}

function itemPricingStatus(value: unknown): AdminOrderItemPricingStatus {
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

function nullableText(value: unknown) {
  return text(value) || null;
}

function requiredText(value: unknown, message: string) {
  const result = text(value);
  if (!result) throw new AdminOrderReadModelError(message);
  return result;
}

function amount(value: unknown) {
  const result = number(value);
  if (!Number.isSafeInteger(result) || result < 0) {
    throw new AdminOrderReadModelError("Nilai transaksi tidak valid.");
  }
  return result;
}

function nullableAmount(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  return amount(value);
}

function integer(value: unknown) {
  const result = amount(value);
  if (result < 1) throw new AdminOrderReadModelError("Quantity item tidak valid.");
  return result;
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
