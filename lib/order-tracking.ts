import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { normalizeWhatsapp } from "@/lib/commerce-checkout";
import { getOrderStatusLabel, getPaymentStatusLabel } from "@/lib/ui-language";
import { resolveOrderActiveStage } from "@/lib/order-active-stage";

export const TRACKING_TOKEN_DAYS = 90;
export const TRACKING_RATE_LIMIT_ATTEMPTS = 5;
export const TRACKING_RATE_LIMIT_MINUTES = 15;

export type TrackingAuthorizationRow = {
  id: string;
  public_access_token_hash: string | null;
  public_access_token_expires_at: string | null;
  customer_phone: string | null;
};

export type TrackingAuthorizationResult =
  | { ok: true; method: "token" | "whatsapp" }
  | { ok: false; reason: "not_found" | "invalid_credentials" | "expired_token" };

export function createTrackingToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: sha256(token) };
}

export function deriveCheckoutTrackingToken(idempotencyKey: string, serverSecret: string) {
  return createHmac("sha256", serverSecret)
    .update(`debroder:guest-order-tracking:${idempotencyKey}`)
    .digest("base64url");
}

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function normalizeOrderNumber(value: unknown) {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  return /^[A-Z0-9][A-Z0-9-]{4,63}$/.test(normalized) ? normalized : "";
}

export function validTrackingToken(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{32,160}$/.test(value);
}

export function authorizeGuestTracking(
  order: TrackingAuthorizationRow | null,
  credentials: { token?: unknown; whatsapp?: unknown },
  now = new Date()
): TrackingAuthorizationResult {
  if (!order) return { ok: false, reason: "not_found" };

  const token = validTrackingToken(credentials.token) ? credentials.token : "";
  const phone = normalizeWhatsapp(typeof credentials.whatsapp === "string" ? credentials.whatsapp : "");
  let tokenExpired = false;

  if (token && order.public_access_token_hash) {
    tokenExpired = Boolean(
      order.public_access_token_expires_at &&
      new Date(order.public_access_token_expires_at).getTime() <= now.getTime()
    );
    if (!tokenExpired && safeEqual(sha256(token), order.public_access_token_hash)) {
      return { ok: true, method: "token" };
    }
  }

  const storedPhone = normalizeWhatsapp(order.customer_phone ?? "");
  if (phone.length >= 9 && storedPhone.length >= 9 && safeEqual(phone, storedPhone)) {
    return { ok: true, method: "whatsapp" };
  }

  if (tokenExpired && !phone) return { ok: false, reason: "expired_token" };
  return { ok: false, reason: "invalid_credentials" };
}

export function isTrackingRateLimited(failedAttempts: number | null | undefined) {
  return Number(failedAttempts ?? 0) >= TRACKING_RATE_LIMIT_ATTEMPTS;
}

export function maskPhone(phone: string | null) {
  const normalized = normalizeWhatsapp(phone ?? "");
  if (normalized.length < 7) return "***";
  return `${normalized.slice(0, 4)}***${normalized.slice(-3)}`;
}

export function maskAddress(address: string | null) {
  const clean = (address ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return null;
  const parts = clean.split(",").map((part) => part.trim()).filter(Boolean);
  const locality = parts.length > 1 ? parts[parts.length - 1] : "";
  const prefix = `${clean.slice(0, Math.min(10, clean.length))}***`;
  return locality && !prefix.toLowerCase().includes(locality.toLowerCase())
    ? `${prefix}, ${locality}`
    : prefix;
}

export function customerOrderStatusLabel(status: string) {
  return getOrderStatusLabel(status, "customer");
}

export function customerPaymentStatusLabel(status: string) {
  return getPaymentStatusLabel(status, "customer");
}

export function trackingNextStep(input: {
  status: string;
  paymentStatus: string;
  fulfillmentMethod: string;
  paymentMethod?: string | null;
  fulfillmentStatus?: string | null;
  trackingNumber?: string | null;
  isCustom?: boolean;
  paymentRequirementMet?: boolean;
  paymentProductionEligible?: boolean;
  hasJobOrder?: boolean;
  jobOrderStatus?: string | null;
  qualityControlStatus?: string | null;
}) {
  return resolveOrderActiveStage({
    status: input.status,
    paymentStatus: input.paymentStatus,
    fulfillmentStatus: input.fulfillmentStatus,
    fulfillmentMethod: input.fulfillmentMethod,
    paymentMethod: input.paymentMethod,
    trackingNumber: input.trackingNumber,
    isCustom: input.isCustom,
    paymentRequirementMet: input.paymentRequirementMet,
    paymentProductionEligible: input.paymentProductionEligible,
    hasJobOrder: input.hasJobOrder,
    jobOrderStatus: input.jobOrderStatus,
    qualityControlStatus: input.qualityControlStatus
  }).nextStep;
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
