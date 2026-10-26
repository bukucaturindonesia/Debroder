import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { FastBasket, FastQuote } from "./contracts";
import { FastCheckoutError } from "./providers";
export function basketFingerprint(items: FastBasket) {
  return createHash("sha256")
    .update(
      JSON.stringify(
        [...items].sort((a, b) =>
          a.variantSizeId.localeCompare(b.variantSizeId),
        ),
      ),
    )
    .digest("hex");
}
export function signQuote(quote: FastQuote, secret: string) {
  const data = Buffer.from(JSON.stringify(quote)).toString("base64url");
  return `${data}.${createHmac("sha256", secret).update(data).digest("base64url")}`;
}
export function readQuote(
  token: string,
  secret: string,
  now = Date.now(),
): FastQuote {
  try {
    const [data, signature, extra] = token.split(".");
    const expected = createHmac("sha256", secret).update(data).digest();
    const actual = Buffer.from(signature, "base64url");
    if (
      extra ||
      actual.length !== expected.length ||
      !timingSafeEqual(actual, expected)
    )
      throw new Error();
    const quote = JSON.parse(
      Buffer.from(data, "base64url").toString(),
    ) as FastQuote;
    if (
      quote.version !== 1 ||
      !Number.isSafeInteger(quote.expiresAt) ||
      quote.expiresAt <= now ||
      quote.issuedAt > now
    )
      throw new Error();
    return quote;
  } catch {
    throw new FastCheckoutError("SHIPPING_QUOTE_EXPIRED", 409);
  }
}
