import "server-only";
import { createHash, createHmac } from "node:crypto";
import { z } from "zod";
import { getAdminSupabaseClient } from "@/lib/supabase/admin";
import { optionalVerifiedCustomer } from "@/lib/customer-auth/server";
import { deriveCheckoutTrackingToken } from "@/lib/order-tracking";
import { readCheckoutJsonBody } from "@/lib/checkout-abuse-protection";
import {
  basketSchema,
  checkoutSchema,
  type FastBasket,
  type FastPreview,
  type FastQuote,
} from "./contracts";
import { basketFingerprint, readQuote, signQuote } from "./quote";
import {
  FastCheckoutError,
  midtransConfig,
  MidtransClient,
  paymentState,
  RajaOngkirClient,
  validSignature,
} from "./providers";

export const sha256 = (s: string) =>
  createHash("sha256").update(s).digest("hex");
export function assertFastStaging() {
  let ref = "",
    host = "",
    protocol = "";
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "");
    host = url.hostname;
    protocol = url.protocol;
    ref = host.split(".")[0];
  } catch {
    /* blocked below */
  }
  if (
    process.env.DEBRODER_ENV !== "staging" ||
    !ref ||
    protocol !== "https:" ||
    host !== `${ref}.supabase.co` ||
    ref === "lzennundwqqtyvvcnzbg" ||
    ref !== process.env.FAST_CHECKOUT_SUPABASE_PROJECT_REF
  )
    throw new FastCheckoutError("FAST_ENVIRONMENT_BLOCKED");
}
export function fastEnabled() {
  return process.env.DEBRODER_FAST_CHECKOUT_ENABLED === "1";
}
export function fastContext() {
  assertFastStaging();
  if (!fastEnabled()) throw new FastCheckoutError("FAST_DISABLED");
  const client = getAdminSupabaseClient();
  const secret = process.env.FAST_CHECKOUT_SIGNING_SECRET;
  if (!client || !secret || secret.length < 32)
    throw new FastCheckoutError("FAST_NOT_CONFIGURED");
  return { client, secret };
}
export async function rpc<T>(
  name: string,
  args: Record<string, unknown>,
): Promise<T> {
  const { client } = fastContext();
  const { data, error } = await client.rpc(name, args);
  if (error)
    throw new FastCheckoutError(
      /^FAST_[A-Z_]+$/.test(error.message)
        ? error.message
        : "FAST_DATABASE_UNAVAILABLE",
      409,
    );
  return data as T;
}
export async function settings() {
  const { client } = fastContext();
  const { data, error } = await client
    .from("fast_checkout_settings")
    .select("*")
    .eq("id", true)
    .single();
  if (error || !data) throw new FastCheckoutError("FAST_NOT_CONFIGURED");
  return data as {
    origin_id: number | null;
    origin_label: string;
    couriers: string[];
    pickup_enabled: boolean;
    pickup_location_ids: string[];
    payment_enabled: boolean;
    updated_at: string;
  };
}
export async function limit(request: Request, operation: string, maximum = 20) {
  const { secret } = fastContext();
  // Trust Vercel's overwritten forwarding header only on Vercel. Otherwise
  // share a conservative bucket rather than trusting client-supplied IPs.
  const ip =
    process.env.VERCEL === "1"
      ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0] ||
        "unknown"
      : "local";
  const key = createHmac("sha256", secret)
    .update(`${operation}:${ip}`)
    .digest("hex");
  if (
    !(await rpc<boolean>("fast_checkout_limit_v1", {
      p_key_hash: key,
      p_limit: maximum,
    }))
  )
    throw new FastCheckoutError("FAST_RATE_LIMITED", 429);
}
export async function preview(
  items: FastBasket,
  shipping = true,
): Promise<FastPreview> {
  const p = await rpc<Omit<FastPreview, "fingerprint">>(
    "fast_checkout_preview_v1",
    { p_items: items, p_shipping: shipping },
  );
  if (!Number.isSafeInteger(p.subtotal) || p.subtotal <= 0)
    throw new FastCheckoutError("FAST_PRICE_INVALID", 409);
  return { ...p, fingerprint: basketFingerprint(items) };
}
export async function destinations(request: Request) {
  await limit(request, "destinations");
  const query = new URL(request.url).searchParams.get("q") || "";
  const { secret } = fastContext();
  const results = await new RajaOngkirClient(
    process.env.RAJAONGKIR_API_KEY || "",
  ).destinations(query);
  // Short-lived signed destination: no browser-invented provider ID/labels.
  return {
    destinations: results.map((destination) => ({
      ...destination,
      token: signQuote(
        {
          version: 1,
          destination,
          issuedAt: Date.now(),
          expiresAt: Date.now() + 15 * 60 * 1000,
        } as FastQuote,
        secret,
      ),
    })),
  };
}
export async function quotes(request: Request) {
  await limit(request, "quotes", 12);
  const body = z
    .object({ items: basketSchema, destinationToken: z.string().max(8000) })
    .strict()
    .parse(await readCheckoutJsonBody(request));
  const { secret } = fastContext();
  const destination = readQuote(body.destinationToken, secret).destination;
  const cfg = await settings();
  if (!cfg.origin_id || !cfg.couriers.length)
    throw new FastCheckoutError("SHIPPING_NOT_CONFIGURED");
  const p = await preview(body.items);
  const rates = await new RajaOngkirClient(
    process.env.RAJAONGKIR_API_KEY || "",
  ).rates(cfg.origin_id, destination.id, p.weight, cfg.couriers, p.dimensions);
  if (!rates.length) throw new FastCheckoutError("SHIPPING_UNAVAILABLE");
  return {
    subtotal: p.subtotal,
    quotes: rates.map((rate) => {
      const quote: FastQuote = {
        version: 1,
        origin: cfg.origin_id!,
        destination,
        rate,
        ...p,
        settingsVersion: cfg.updated_at,
        issuedAt: Date.now(),
        expiresAt: Date.now() + 5 * 60 * 1000,
      };
      return {
        rate,
        expiresAt: quote.expiresAt,
        token: signQuote(quote, secret),
      };
    }),
  };
}
export async function createCheckout(request: Request) {
  await limit(request, "checkout", 8);
  midtransConfig(); // Fail before order creation if sandbox keys are absent.
  const input = checkoutSchema.parse(await readCheckoutJsonBody(request));
  const { client, secret } = fastContext();
  const customer = await optionalVerifiedCustomer(request);
  if (
    customer &&
    input.customer.email.toLowerCase() !== customer.profile.email.toLowerCase()
  )
    throw new FastCheckoutError("FAST_CUSTOMER_INVALID", 403);
  const serverKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serverKey) throw new FastCheckoutError("FAST_NOT_CONFIGURED");
  const token = deriveCheckoutTrackingToken(input.idempotencyKey, serverKey);
  const hash = sha256(JSON.stringify(input));
  // Recover committed orders before validating expired quotes or new prices.
  const existing = await client
    .from("fast_checkout_sessions")
    .select("order_id,request_hash")
    .eq("request_key", input.idempotencyKey)
    .maybeSingle();
  if (existing.error) throw new FastCheckoutError("FAST_DATABASE_UNAVAILABLE");
  let quote: FastQuote | null = null;
  if (!existing.data) {
    if (input.fulfillment === "shipping") {
      quote = readQuote(input.quoteToken || "", secret);
      const p = await preview(input.items);
      if (
        quote.fingerprint !== p.fingerprint ||
        quote.subtotal !== p.subtotal ||
        quote.weight !== p.weight ||
        JSON.stringify(quote.dimensions) !== JSON.stringify(p.dimensions)
      )
        throw new FastCheckoutError("FAST_QUOTE_INVALID", 409);
      // Fresh provider quote before commit; never charge an expired cached rate.
      const cfg = await settings();
      const live = await new RajaOngkirClient(
        process.env.RAJAONGKIR_API_KEY || "",
      ).rates(
        quote.origin,
        quote.destination.id,
        p.weight,
        cfg.couriers,
        p.dimensions,
      );
      if (
        !live.some(
          (r) =>
            r.code === quote!.rate.code &&
            r.service === quote!.rate.service &&
            r.cost === quote!.rate.cost,
        )
      )
        throw new FastCheckoutError("SHIPPING_PRICE_CHANGED", 409);
    }
  } else if (existing.data.request_hash !== hash)
    throw new FastCheckoutError("FAST_IDEMPOTENCY_CONFLICT", 409);
  const order = await rpc<{
    order_id: string;
    order_number: string;
    total: number;
  }>("fast_checkout_create_v1", {
    p_input: input,
    p_quote: quote,
    p_request_hash: hash,
    p_access_hash: sha256(token),
    p_customer_id: customer?.user.id ?? null,
  });
  return {
    orderId: order.order_id,
    orderNumber: order.order_number,
    total: order.total,
    trackingToken: token,
    confirmationUrl: `/order-confirmation/${encodeURIComponent(token)}`,
  };
}
export async function authorizedOrder(orderId: string, token: string) {
  const { client } = fastContext();
  const { data, error } = await client
    .from("orders")
    .select(
      "id,order_number,customer_name,customer_email,customer_phone,total_amount,subtotal_amount,shipping_cost,payment_status,status,public_access_token_hash,public_access_token_expires_at",
    )
    .eq("id", orderId)
    .is("archived_at", null)
    .maybeSingle();
  if (
    error ||
    !data ||
    data.public_access_token_hash !== sha256(token) ||
    !data.public_access_token_expires_at ||
    new Date(data.public_access_token_expires_at).getTime() <= Date.now()
  )
    throw new FastCheckoutError("FAST_ORDER_ACCESS_DENIED", 403);
  return data;
}
export async function snap(request: Request) {
  await limit(request, "snap", 12);
  const input = z
    .object({ orderId: z.uuid(), trackingToken: z.string().min(32).max(200) })
    .strict()
    .parse(await readCheckoutJsonBody(request));
  const o = await authorizedOrder(input.orderId, input.trackingToken);
  if (o.payment_status === "paid") return { paid: true };
  const config = midtransConfig();
  const attempt = await rpc<{
    id: string;
    claimed: boolean;
    snap_token: string | null;
    redirect_url: string | null;
    provider_order_id: string;
    amount: number;
  }>("fast_payment_claim_v1", {
    p_order_id: o.id,
    p_merchant_id: config.merchantId,
  });
  if (!attempt.claimed) {
    if (attempt.snap_token && attempt.redirect_url)
      return {
        token: attempt.snap_token,
        redirectUrl: attempt.redirect_url,
        clientKey: config.clientKey,
      };
    throw new FastCheckoutError("PAYMENT_CREATION_UNCERTAIN");
  }
  const { client } = fastContext();
  const rows = await client
    .from("order_items")
    .select("id,product_name,unit_price,quantity")
    .eq("order_id", o.id)
    .is("archived_at", null);
  if (rows.error || !rows.data?.length)
    throw new FastCheckoutError("FAST_DATABASE_UNAVAILABLE");
  const items = rows.data.map((x) => ({
    id: x.id,
    name: x.product_name.slice(0, 50),
    price: Number(x.unit_price),
    quantity: x.quantity,
  }));
  if (o.shipping_cost > 0)
    items.push({
      id: "shipping",
      name: "Ongkos kirim",
      price: Number(o.shipping_cost),
      quantity: 1,
    });
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (!site || !/^https?:\/\//.test(site))
    throw new FastCheckoutError("FAST_SITE_URL_REQUIRED");
  const session = await new MidtransClient(config).create(
    attempt.provider_order_id,
    Number(attempt.amount),
    items,
    { name: o.customer_name, email: o.customer_email, phone: o.customer_phone },
    `${site.replace(/\/$/, "")}/checkout`,
  );
  const saved = await client
    .from("fast_payment_attempts")
    .update({
      snap_token: session.token,
      redirect_url: session.redirectUrl,
      status: "pending",
      updated_at: new Date().toISOString(),
    })
    .eq("id", attempt.id)
    .eq("status", "creating")
    .select("id");
  // A webhook may beat this save. Preserve uncertainty; never create another
  // provider ID after timeout/failed persistence of the token.
  if (saved.error || saved.data?.length !== 1)
    throw new FastCheckoutError("PAYMENT_CREATION_UNCERTAIN");
  return { ...session, clientKey: config.clientKey };
}
export async function applyStatus(body: Record<string, unknown>) {
  const config = midtransConfig();
  if (
    body.merchant_id !== config.merchantId ||
    body.currency !== "IDR" ||
    typeof body.order_id !== "string" ||
    typeof body.transaction_id !== "string" ||
    !/^\d+(?:\.00)?$/.test(String(body.gross_amount))
  )
    throw new FastCheckoutError("PAYMENT_NOTIFICATION_INVALID", 400);
  if (
    body.transaction_status === "partial_refund" ||
    (body.transaction_status === "refund" &&
      Number(body.refund_amount) !== Number(body.gross_amount))
  )
    throw new FastCheckoutError("PAYMENT_REFUND_REVIEW_REQUIRED", 409);
  return rpc("fast_payment_apply_v1", {
    p_provider_order_id: body.order_id,
    p_transaction_id: body.transaction_id,
    p_merchant_id: config.merchantId,
    p_amount: Number(body.gross_amount),
    p_state: paymentState(body),
    p_event_hash: sha256(JSON.stringify(body)),
  });
}
export async function notification(request: Request) {
  fastContext();
  const body = await readCheckoutJsonBody(request);
  const config = midtransConfig();
  if (
    !body ||
    typeof body !== "object" ||
    !validSignature(body as Record<string, unknown>, config.serverKey)
  )
    throw new FastCheckoutError("PAYMENT_SIGNATURE_INVALID", 403);
  // Signature does not cover transaction_status. Fetch authenticated current
  // status to defeat altered statuses and out-of-order notifications.
  const current = await new MidtransClient(config).status(
    (body as { order_id: string }).order_id,
  );
  return applyStatus(current);
}
export async function status(request: Request) {
  await limit(request, "status", 30);
  const input = z
    .object({ orderId: z.uuid(), trackingToken: z.string().min(32).max(200) })
    .parse(await readCheckoutJsonBody(request));
  await authorizedOrder(input.orderId, input.trackingToken);
  const { client } = fastContext();
  const a = await client
    .from("fast_payment_attempts")
    .select("provider_order_id,status")
    .eq("order_id", input.orderId)
    .order("attempt_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (a.error) throw new FastCheckoutError("FAST_DATABASE_UNAVAILABLE");
  if (a.data && !["paid", "refunded"].includes(a.data.status)) {
    try {
      await applyStatus(
        await new MidtransClient(midtransConfig()).status(
          a.data.provider_order_id,
        ),
      );
    } catch {
      /* A Snap session without a selected method can return provider 404.
      Keep the existing attempt; this never authorizes creating a replacement. */
    }
  }
  const o = await authorizedOrder(input.orderId, input.trackingToken);
  return {
    paymentStatus: o.payment_status,
    orderStatus: o.status,
    confirmationUrl: `/order-confirmation/${encodeURIComponent(input.trackingToken)}`,
  };
}
export async function api(action: () => Promise<unknown>) {
  try {
    return Response.json(await action(), {
      headers: { "cache-control": "private, no-store" },
    });
  } catch (error) {
    const code =
      error instanceof FastCheckoutError ? error.code : "FAST_REQUEST_INVALID";
    const statusCode =
      error instanceof FastCheckoutError
        ? error.status
        : error instanceof z.ZodError
          ? 400
          : 503;
    return Response.json(
      {
        code,
        error: code.startsWith("SHIPPING")
          ? "Ongkir belum dapat dihitung. Silakan coba lagi."
          : "Proses belum dapat dilanjutkan. Data Anda tetap tersimpan.",
      },
      {
        status: statusCode,
        headers: {
          "cache-control": "private, no-store",
          ...(statusCode === 429 ? { "retry-after": "60" } : {}),
        },
      },
    );
  }
}
