import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { normalizeWhatsapp } from "@/lib/commerce-checkout";

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
  const labels: Record<string, string> = {
    baru: "Pesanan diterima",
    pending_confirmation: "Menunggu verifikasi WhatsApp",
    awaiting_shipping_quote: "Ongkir sedang diperiksa",
    awaiting_customer_approval: "Menunggu persetujuan total",
    awaiting_payment: "Menunggu pembayaran",
    under_review: "Custom Project sedang direview",
    confirmed: "Pesanan dikonfirmasi",
    processing: "Sedang diproses",
    in_progress: "Sedang diproses",
    ready_for_pickup: "Siap diambil",
    siap_diambil: "Siap diambil",
    ready_to_ship: "Siap dikirim",
    shipped: "Dikirim",
    delivered: "Terkirim",
    picked_up: "Sudah diambil",
    completed: "Selesai",
    selesai: "Selesai",
    expired: "Kedaluwarsa",
    cancelled: "Dibatalkan"
  };
  return labels[status] ?? "Pesanan sedang diproses";
}

export function customerPaymentStatusLabel(status: string) {
  const labels: Record<string, string> = {
    unpaid: "Belum dibayar",
    belum_bayar: "Belum dibayar",
    pending_verification: "Menunggu verifikasi pembayaran",
    menunggu_verifikasi: "Menunggu verifikasi pembayaran",
    partially_paid: "Dibayar sebagian",
    paid: "Lunas",
    terverifikasi: "Lunas",
    rejected: "Bukti pembayaran ditolak",
    ditolak: "Bukti pembayaran ditolak",
    expired: "Pembayaran kedaluwarsa",
    refunded: "Dikembalikan"
  };
  return labels[status] ?? "Sedang diperiksa";
}

export function trackingNextStep(input: {
  status: string;
  paymentStatus: string;
  fulfillmentMethod: string;
  trackingNumber?: string | null;
}) {
  if (["completed", "selesai", "delivered", "picked_up"].includes(input.status)) {
    return "Pesanan selesai. Simpan nomor order untuk kebutuhan layanan setelah pembelian.";
  }
  if (["cancelled", "expired"].includes(input.status)) {
    return "Hubungi DEBRODER bila Anda ingin membuat atau mengaktifkan kembali pesanan.";
  }
  if (input.status === "pending_confirmation") return "Verifikasi nomor WhatsApp melalui petunjuk pada konfirmasi order.";
  if (input.status === "awaiting_shipping_quote") return "Tunggu Admin menetapkan kurir dan ongkir.";
  if (input.status === "awaiting_customer_approval") return "Buka tautan konfirmasi order dan setujui total akhir setelah memeriksa ongkir.";
  if (input.status === "under_review") return "Tunggu Admin memeriksa desain, layanan, lead time, dan harga Custom Project pada order yang sama.";
  if (["unpaid", "belum_bayar", "rejected", "ditolak"].includes(input.paymentStatus)) return "Selesaikan atau unggah ulang pembayaran pada tautan pembayaran order yang sama.";
  if (["pending_verification", "menunggu_verifikasi"].includes(input.paymentStatus)) return "Tunggu Admin memeriksa bukti pembayaran Anda.";
  if (input.status === "ready_for_pickup" || input.status === "siap_diambil") return "Datang ke lokasi pickup dengan membawa nomor order dan nomor WhatsApp yang digunakan saat checkout.";
  if (input.status === "shipped") return input.trackingNumber ? "Gunakan nomor resi untuk memantau paket sampai diterima." : "Pesanan sedang dikirim. Nomor resi akan ditampilkan setelah tersedia.";
  return input.fulfillmentMethod === "pickup"
    ? "Tunggu pembaruan kesiapan pickup dari DEBRODER."
    : "Tunggu pembaruan proses dan pengiriman dari DEBRODER.";
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
