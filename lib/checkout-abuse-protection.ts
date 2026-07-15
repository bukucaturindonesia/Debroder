import { createHmac } from "node:crypto";
import type { PublicCheckoutRequest } from "@/lib/commerce-checkout";

export const MAX_CHECKOUT_BODY_BYTES = 64 * 1024;

export class CheckoutBodyError extends Error {
  constructor(
    public readonly code: "CHECKOUT_PAYLOAD_TOO_LARGE" | "CHECKOUT_INVALID_JSON",
    public readonly status: 413 | 400
  ) {
    super(code);
  }
}

export type CheckoutAbuseDecision = {
  allowed: boolean;
  idempotent_retry?: boolean;
  code?: "idempotency_payload_conflict" | "fingerprint_burst" | "fingerprint_daily" | "phone_burst";
  retry_after_seconds?: number;
};

export async function readCheckoutJsonBody(request: Request, maxBytes = MAX_CHECKOUT_BODY_BYTES): Promise<unknown> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength) {
    const parsedLength = Number(declaredLength);
    if (Number.isFinite(parsedLength) && parsedLength > maxBytes) {
      throw new CheckoutBodyError("CHECKOUT_PAYLOAD_TOO_LARGE", 413);
    }
  }

  if (!request.body) throw new CheckoutBodyError("CHECKOUT_INVALID_JSON", 400);

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let rawBody = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel("checkout payload too large");
        throw new CheckoutBodyError("CHECKOUT_PAYLOAD_TOO_LARGE", 413);
      }
      rawBody += decoder.decode(value, { stream: true });
    }
    rawBody += decoder.decode();
  } finally {
    reader.releaseLock();
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    throw new CheckoutBodyError("CHECKOUT_INVALID_JSON", 400);
  }
}

export function createCheckoutAbuseHashes(
  request: Request,
  body: PublicCheckoutRequest,
  secret: string
) {
  const forwardedAddress = firstForwardedAddress(request.headers);
  const userAgent = compactHeader(request.headers.get("user-agent"), 256);
  const language = compactHeader(request.headers.get("accept-language"), 128);
  const fingerprintMaterial = `${forwardedAddress}|${userAgent}|${language}`;

  return {
    idempotencyKeyHash: keyedHash(secret, "idempotency", body.idempotencyKey),
    payloadHash: keyedHash(secret, "payload", canonicalCheckoutPayload(body)),
    fingerprintHash: keyedHash(secret, "fingerprint", fingerprintMaterial),
    phoneHash: keyedHash(secret, "phone", body.customer.phone)
  };
}

export function canonicalCheckoutPayload(body: PublicCheckoutRequest) {
  return JSON.stringify({
    customer: {
      name: body.customer.name,
      phone: body.customer.phone,
      email: body.customer.email ?? null,
      notes: body.customer.notes ?? null
    },
    fulfillment: {
      method: body.fulfillment.method,
      address: body.fulfillment.address ?? null,
      pickupLocationId: body.fulfillment.pickupLocationId ?? null,
      paymentMethod: body.fulfillment.paymentMethod
    },
    items: [...body.items]
      .sort((left, right) => left.variantSizeId.localeCompare(right.variantSizeId))
      .map((item) => ({
        variantSizeId: item.variantSizeId,
        quantity: item.quantity,
        note: item.note ?? null
      }))
  });
}

function keyedHash(secret: string, domain: string, value: string) {
  return createHmac("sha256", secret)
    .update(`debroder:checkout-security:${domain}:${value}`)
    .digest("hex");
}

function firstForwardedAddress(headers: Headers) {
  const raw = headers.get("x-vercel-forwarded-for")
    ?? headers.get("x-forwarded-for")
    ?? headers.get("x-real-ip")
    ?? "unknown";
  return compactHeader(raw.split(",")[0], 128) || "unknown";
}

function compactHeader(value: string | null | undefined, maxLength: number) {
  return (value ?? "")
    .replace(/[\r\n\0]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}
