import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import {
  destinationSchema,
  type Destination,
  type ShippingRate,
} from "./contracts";

export class FastCheckoutError extends Error {
  constructor(
    public code: string,
    public status = 503,
  ) {
    super(code);
  }
}
export async function providerJson(
  url: string,
  init: RequestInit,
  fetcher = fetch,
) {
  let response: Response;
  try {
    response = await fetcher(url, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new FastCheckoutError("PROVIDER_UNAVAILABLE");
  }
  if (!response.ok) throw new FastCheckoutError("PROVIDER_UNAVAILABLE");
  const value = await response.json().catch(() => null);
  if (!value || typeof value !== "object")
    throw new FastCheckoutError("PROVIDER_INVALID_RESPONSE");
  return value;
}
export class RajaOngkirClient {
  constructor(
    private key: string,
    private fetcher = fetch,
  ) {
    if (!key) throw new FastCheckoutError("SHIPPING_NOT_CONFIGURED");
  }
  async destinations(search: string): Promise<Destination[]> {
    if (search.trim().length < 3 || search.length > 100)
      throw new FastCheckoutError("DESTINATION_INVALID", 400);
    const value = await providerJson(
      `https://rajaongkir.komerce.id/api/v1/destination/domestic-destination?${new URLSearchParams({ search, limit: "8", offset: "0" })}`,
      { headers: { key: this.key } },
      this.fetcher,
    );
    if (value.meta?.code !== 200 || !Array.isArray(value.data))
      throw new FastCheckoutError("SHIPPING_UNAVAILABLE");
    return value.data.map((row: unknown) => destinationSchema.parse(row));
  }
  async rates(
    origin: number,
    destination: number,
    weight: number,
    couriers: string[],
    dimensions: { length: number; width: number; height: number },
  ): Promise<ShippingRate[]> {
    if (
      ![origin, destination, weight, ...Object.values(dimensions)].every(
        (n) => Number.isSafeInteger(n) && n > 0,
      ) ||
      !couriers.length ||
      couriers.some((code) => !/^[a-z]{2,20}$/.test(code))
    )
      throw new FastCheckoutError("SHIPPING_INPUT_INVALID", 409);
    const value = await providerJson(
      "https://rajaongkir.komerce.id/api/v1/calculate/domestic-cost",
      {
        method: "POST",
        headers: {
          key: this.key,
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          origin: String(origin),
          destination: String(destination),
          weight: String(weight),
          courier: couriers.join(":"),
          price: "lowest",
          length: String(dimensions.length),
          width: String(dimensions.width),
          height: String(dimensions.height),
        }),
      },
      this.fetcher,
    );
    if (value.meta?.code !== 200 || !Array.isArray(value.data))
      throw new FastCheckoutError("SHIPPING_UNAVAILABLE");
    const rates: ShippingRate[] = value.data.filter(
      (row: ShippingRate) =>
        couriers.includes(row.code) &&
        typeof row.service === "string" &&
        row.service.length > 0 &&
        Number.isSafeInteger(row.cost) &&
        row.cost > 0 &&
        typeof row.etd === "string",
    );
    // Return real service labels/ETAs. Lowest, middle and highest cost are
    // alternatives, not invented delivery-speed promises.
    const sorted = [...rates].sort((a, b) => a.cost - b.cost);
    return [
      ...new Map(
        [sorted[0], sorted[Math.floor(sorted.length / 2)], sorted.at(-1)]
          .filter((x): x is ShippingRate => Boolean(x))
          .map((x) => [`${x.code}:${x.service}`, x]),
      ).values(),
    ];
  }
}

export function midtransConfig(
  env: Record<string, string | undefined> = process.env,
) {
  // Production is deliberately fail-closed in this sandbox-first package.
  if (
    env.MIDTRANS_ENV !== "sandbox" ||
    !env.MIDTRANS_SERVER_KEY ||
    !env.MIDTRANS_CLIENT_KEY ||
    !env.MIDTRANS_MERCHANT_ID
  )
    throw new FastCheckoutError("PAYMENT_NOT_CONFIGURED");
  return {
    serverKey: env.MIDTRANS_SERVER_KEY,
    clientKey: env.MIDTRANS_CLIENT_KEY,
    merchantId: env.MIDTRANS_MERCHANT_ID,
  };
}
export function validSignature(
  body: Record<string, unknown>,
  serverKey: string,
) {
  if (
    ![
      body.order_id,
      body.status_code,
      body.gross_amount,
      body.signature_key,
    ].every((x) => typeof x === "string") ||
    !/^[a-f0-9]{128}$/i.test(String(body.signature_key))
  )
    return false;
  const expected = createHash("sha512")
    .update(
      `${body.order_id}${body.status_code}${body.gross_amount}${serverKey}`,
    )
    .digest();
  return timingSafeEqual(
    expected,
    Buffer.from(String(body.signature_key), "hex"),
  );
}
export function paymentState(body: Record<string, unknown>) {
  if (body.currency !== "IDR") return "pending";
  const status = body.transaction_status;
  if (
    body.status_code === "200" &&
    (status === "settlement" || status === "capture") &&
    (status === "capture"
      ? body.fraud_status === "accept"
      : !body.fraud_status || body.fraud_status === "accept")
  )
    return "paid";
  if (["deny", "cancel", "expire"].includes(String(status)))
    return String(status);
  if (status === "refund") return "refunded";
  return "pending";
}
export class MidtransClient {
  constructor(
    private config: ReturnType<typeof midtransConfig>,
    private fetcher = fetch,
  ) {}
  private headers() {
    return {
      authorization: `Basic ${Buffer.from(`${this.config.serverKey}:`).toString("base64")}`,
      "content-type": "application/json",
    };
  }
  async create(
    orderId: string,
    amount: number,
    items: Array<{ id: string; name: string; price: number; quantity: number }>,
    customer: { name: string; email: string; phone: string },
    returnUrl: string,
  ) {
    if (
      !/^[\w.~\-]{1,50}$/.test(orderId) ||
      !Number.isSafeInteger(amount) ||
      amount <= 0 ||
      items.some(
        (x) =>
          !Number.isSafeInteger(x.price) ||
          x.price < 0 ||
          !Number.isSafeInteger(x.quantity) ||
          x.quantity <= 0,
      ) ||
      items.reduce((sum, x) => sum + x.price * x.quantity, 0) !== amount
    )
      throw new FastCheckoutError("PAYMENT_TOTAL_INVALID", 409);
    const value = await providerJson(
      "https://app.sandbox.midtrans.com/snap/v1/transactions",
      {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({
          transaction_details: { order_id: orderId, gross_amount: amount },
          item_details: items,
          customer_details: {
            first_name: customer.name,
            email: customer.email,
            phone: customer.phone,
          },
          callbacks: { finish: returnUrl },
          credit_card: { secure: true },
          expiry: { unit: "minutes", duration: 30 },
        }),
      },
      this.fetcher,
    );
    if (
      typeof value.token !== "string" ||
      !safeSnapRedirect(value.redirect_url)
    )
      throw new FastCheckoutError("PAYMENT_INVALID_RESPONSE");
    return { token: value.token, redirectUrl: value.redirect_url as string };
  }
  async status(id: string) {
    return providerJson(
      `https://api.sandbox.midtrans.com/v2/${encodeURIComponent(id)}/status`,
      { headers: this.headers() },
      this.fetcher,
    );
  }
}
export function safeSnapRedirect(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const u = new URL(value);
    return (
      u.protocol === "https:" &&
      u.hostname === "app.sandbox.midtrans.com" &&
      u.pathname.startsWith("/snap/")
    );
  } catch {
    return false;
  }
}
