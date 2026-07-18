export type AdminOrderWorkspaceKind = "standard" | "custom";

const KNOWN_ORDER_STATUSES = new Set([
  "baru",
  "pending_confirmation",
  "under_review",
  "awaiting_shipping_quote",
  "awaiting_customer_approval",
  "awaiting_payment",
  "processing",
  "ready_for_production",
  "in_production",
  "production",
  "quality_control",
  "packing",
  "ready_for_pickup",
  "ready_to_ship",
  "in_transit",
  "shipped",
  "delivered",
  "picked_up",
  "completed",
  "selesai",
  "cancelled",
  "dibatalkan",
  "expired"
]);

export function resolveAdminOrderWorkspaceKind(
  customProjectSnapshot: unknown
): AdminOrderWorkspaceKind {
  return Array.isArray(customProjectSnapshot) && customProjectSnapshot.length > 0
    ? "custom"
    : "standard";
}

export function adminOrderCompatibilityWarning(status: unknown) {
  const normalized = typeof status === "string" ? status.trim().toLowerCase() : "";
  if (normalized && KNOWN_ORDER_STATUSES.has(normalized)) return null;
  return "Sebagian state pesanan lama tidak dikenali. Periksa data sebelum melanjutkan.";
}

type DateStyle = "full" | "long" | "medium" | "short";
type TimeStyle = "full" | "long" | "medium" | "short";

export function formatAdminOrderDateTime(
  value: unknown,
  options: {
    fallback?: string;
    dateStyle?: DateStyle;
    timeStyle?: TimeStyle;
    timeZone?: string;
  } = {}
) {
  const date = parseAdminOrderDate(value);
  if (!date) return options.fallback ?? "—";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: options.dateStyle ?? "medium",
    timeStyle: options.timeStyle ?? "short",
    timeZone: options.timeZone
  }).format(date);
}

export function formatAdminOrderDate(
  value: unknown,
  fallback = "—"
) {
  const date = parseAdminOrderDate(value);
  if (!date) return fallback;
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(date);
}

export function formatAdminOrderDateTimeInput(value: unknown) {
  const date = parseAdminOrderDate(value);
  return date ? date.toISOString().slice(0, 16) : "";
}

function parseAdminOrderDate(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number" && !(value instanceof Date)) {
    return null;
  }
  if (typeof value === "string" && value.trim() === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}
