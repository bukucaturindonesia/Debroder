import { createHash, randomBytes } from "node:crypto";

/**
 * Server-only helpers for public payment-link tokens.
 * Keep Node crypto outside lib/payments.ts because that shared module is also
 * imported by client-side admin components.
 */
export function createPaymentToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashPaymentToken(token) };
}

export function hashPaymentToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
