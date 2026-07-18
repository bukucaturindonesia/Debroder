import type { NotificationEventRow, NotificationRow } from "@/lib/notifications";

const SAFE_TARGETS = [
  /^\/admin\/orders\/[0-9a-f-]{36}(?:#(?:payment|commerce|custom-pricing|order-data))?$/i,
  /^\/admin\/orders\/quotations\/[0-9a-f-]{36}$/i,
  /^\/admin\/payments(?:\?.*)?$/i,
  /^\/admin\/job-orders\/[0-9a-f-]{36}$/i,
  /^\/admin\/quality-control(?:\?.*)?$/i,
  /^\/admin\/fulfillments\/[0-9a-f-]{36}$/i,
  /^\/admin\/notifications\/[0-9a-f-]{36}$/i
];

export function safeNotificationPath(value: string | null | undefined) {
  if (!value || value.includes("//") || value.includes("..")) return null;
  return SAFE_TARGETS.some((pattern) => pattern.test(value)) ? value : null;
}

export function resolveNotificationTarget(
  notification: Pick<NotificationRow, "id" | "related_path">,
  event?: Pick<NotificationEventRow, "entity_type" | "entity_id" | "payload"> | null
) {
  const stored = safeNotificationPath(notification.related_path);
  if (stored) return stored;
  if (!event) return `/admin/notifications/${notification.id}`;
  const payload = event.payload ?? {};
  const orderId = uuid(payload.order_id) || uuid(payload.orderId);
  const jobOrderId = uuid(payload.job_order_id) || uuid(payload.jobOrderId);
  switch (event.entity_type) {
    case "order": return `/admin/orders/${event.entity_id}`;
    case "order_payment": return orderId ? `/admin/orders/${orderId}#payment` : `/admin/payments?payment=${event.entity_id}`;
    case "quotation": return `/admin/orders/quotations/${event.entity_id}`;
    case "job_order": return `/admin/job-orders/${event.entity_id}`;
    case "qc_record": return `/admin/quality-control?record=${event.entity_id}${jobOrderId ? `&job_order=${jobOrderId}` : ""}`;
    case "fulfillment": return `/admin/fulfillments/${event.entity_id}`;
    default: return `/admin/notifications/${notification.id}`;
  }
}

function uuid(value: unknown) {
  return typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value) ? value : null;
}
