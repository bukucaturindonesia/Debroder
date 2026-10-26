export type CheckoutApiPayload = {
  code?: string;
  error?: string;
  reference?: string;
  found?: boolean;
  confirmationUrl?: string;
  trackingUrl?: string;
  trackingToken?: string;
  orderNumber?: string;
};
type RecoveryResult =
  | { kind: "found"; payload: CheckoutApiPayload }
  | { kind: "missing" }
  | { kind: "expired" }
  | { kind: "unsafe"; message: string; retryAfter: number }
  | { kind: "temporary"; message: string; retryAfter: number };

export async function recoverStoredCheckout(stored: { idempotencyKey: string }): Promise<RecoveryResult> {
  try {
    const response = await fetch(`/api/checkout?idempotencyKey=${encodeURIComponent(stored.idempotencyKey)}`, { cache: "no-store" });
    const payload = await readCheckoutPayload(response);
    if (response.ok && payload.found && payload.confirmationUrl) return { kind: "found", payload };
    if (response.ok && payload.found === false) return { kind: "missing" };
    // Only an explicit successful probe proves absence. A gateway/deployment
    // 404 leaves the original order outcome unknown, so retain its key.
    if (response.status === 410) return { kind: "expired" };
    const retryAfter = retryAfterFromResponse(response);
    if (response.status === 503 || response.status === 429) {
      return {
        kind: "temporary",
        message: payload.error || "Status checkout sebelumnya belum dapat diperiksa. Jangan membuat checkout baru.",
        retryAfter: retryAfter || 15
      };
    }
    return {
      kind: "unsafe",
      message: payload.error || "Checkout sebelumnya tidak dapat dipastikan dengan aman. Hubungi Admin DEBRODER.",
      retryAfter: 0
    };
  } catch {
    return {
      kind: "temporary",
      message: "Jaringan belum dapat memastikan checkout sebelumnya. Kunci lama tetap disimpan untuk mencegah order ganda.",
      retryAfter: 15
    };
  }
}

export async function readCheckoutPayload(response: Response): Promise<CheckoutApiPayload> {
  return response.json().catch(() => ({})) as Promise<CheckoutApiPayload>;
}

export function retryAfterFromResponse(response: Response) {
  const value = Number(response.headers.get("retry-after") || 0);
  return Number.isFinite(value) && value > 0 ? Math.ceil(value) : 0;
}
