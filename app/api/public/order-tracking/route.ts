import {
  authorizeGuestTracking,
  customerOrderStatusLabel,
  customerPaymentStatusLabel,
  isTrackingRateLimited,
  maskAddress,
  maskPhone,
  normalizeOrderNumber,
  sha256,
  TRACKING_RATE_LIMIT_MINUTES,
  trackingNextStep
} from "@/lib/order-tracking";
import { ensureAutomaticPaymentLink, type AutomaticPaymentOrder } from "@/lib/automatic-payment-link-v2";
import { getAdminSupabaseClient } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

type TrackingOrderRow = {
  id: string;
  order_number: string;
  customer_phone: string;
  status: string;
  payment_status: string;
  delivery_method: string;
  payment_method: string;
  shipping_address: string | null;
  subtotal_amount: number;
  shipping_cost: number | null;
  shipping_courier: string | null;
  shipping_service: string | null;
  shipping_estimate: string | null;
  total_amount: number;
  payment_effective_total: number;
  payment_balance: number;
  public_access_token_hash: string | null;
  public_access_token_expires_at: string | null;
  whatsapp_confirmed_at: string | null;
  created_at: string;
  pricing_status?: string;
};

type LatestPaymentRow = {
  status: string | null;
  review_outcome: string | null;
};

export async function POST(request: Request) {
  const client = getAdminSupabaseClient();
  if (!client) return safeResponse({ error: "Layanan tracking belum dikonfigurasi." }, 503);

  const fingerprint = requestFingerprint(request);
  const body = await readBody(request);
  const orderNumber = normalizeOrderNumber(body.orderNumber);
  const orderFingerprint = sha256(orderNumber || "invalid-order-number");

  const since = new Date(Date.now() - TRACKING_RATE_LIMIT_MINUTES * 60_000).toISOString();
  const { count, error: rateError } = await client
    .from("system_audit_log")
    .select("id", { count: "exact", head: true })
    .eq("source", "guest_order_tracking")
    .eq("action", "guest_tracking_denied")
    .gte("created_at", since)
    .filter("metadata->>fingerprint", "eq", fingerprint);
  if (rateError) return safeResponse({ error: "Perlindungan tracking sedang tidak tersedia. Coba beberapa saat lagi." }, 503);

  if (isTrackingRateLimited(count)) {
    await auditDenied(client, null, fingerprint, orderFingerprint, "rate_limited", request);
    return safeResponse({ error: "Terlalu banyak percobaan. Coba lagi 15 menit kemudian." }, 429);
  }

  if (!orderNumber) {
    const audited = await auditDenied(client, null, fingerprint, orderFingerprint, "invalid_order_number", request);
    if (!audited) return safeResponse({ error: "Perlindungan tracking sedang tidak tersedia. Coba beberapa saat lagi." }, 503);
    return safeResponse({ error: "Data tracking tidak cocok atau pesanan tidak tersedia." }, 404);
  }

  const { data, error } = await client
    .from("orders")
    .select([
      "id", "order_number", "customer_phone", "status", "payment_status", "delivery_method", "payment_method",
      "shipping_address", "subtotal_amount", "shipping_cost", "shipping_courier", "shipping_service",
      "shipping_estimate", "total_amount", "payment_effective_total", "payment_balance",
      "public_access_token_hash", "public_access_token_expires_at", "pricing_status", "created_at",
      "whatsapp_confirmed_at"
    ].join(","))
    .eq("order_number", orderNumber)
    .is("archived_at", null)
    .maybeSingle();
  if (error) return safeResponse({ error: "Tracking pesanan belum dapat dimuat." }, 503);

  const order = data as unknown as TrackingOrderRow | null;
  const authorization = authorizeGuestTracking(order, { token: body.token, whatsapp: body.whatsapp });
  if (!authorization.ok) {
    const audited = await auditDenied(client, order?.id ?? null, fingerprint, orderFingerprint, authorization.reason, request);
    if (!audited) return safeResponse({ error: "Perlindungan tracking sedang tidak tersedia. Coba beberapa saat lagi." }, 503);
    const expired = authorization.reason === "expired_token";
    return safeResponse({ error: expired ? "Tautan tracking telah kedaluwarsa. Gunakan nomor WhatsApp atau minta tautan baru." : "Data tracking tidak cocok atau pesanan tidak tersedia." }, expired ? 410 : 404);
  }
  if (!order) return safeResponse({ error: "Data tracking tidak cocok atau pesanan tidak tersedia." }, 404);

  const paymentLink = order.payment_method === "bank_transfer" && order.status === "awaiting_payment"
    ? await ensureAutomaticPaymentLink(client, order as AutomaticPaymentOrder).catch(() => null)
    : null;

  const [itemsResult, quoteResult, fulfillmentResult, latestPaymentResult, activeStageResult, pickupResult, cancellationResult, refundResult] = await Promise.all([
    client.from("order_items")
      .select("id,product_name,variant_name,color,size,sku,quantity,unit_price,subtotal,custom_project_id,pricing_status")
      .eq("order_id", order.id).is("archived_at", null).order("created_at"),
    client.from("order_shipping_quotes")
      .select("version,courier,service,cost,estimate,total_snapshot,status,created_at")
      .eq("order_id", order.id).order("version", { ascending: false }).limit(1).maybeSingle(),
    client.from("fulfillments")
      .select("method,status,courier,tracking_number,scheduled_at,ready_at,shipped_at,delivered_at,picked_up_at")
      .eq("order_id", order.id).is("archived_at", null).neq("status", "cancelled")
      .order("created_at", { ascending: false }).limit(1).maybeSingle(),
    client.from("order_payments")
      .select("status,review_outcome")
      .eq("order_id", order.id).is("archived_at", null)
      .order("created_at", { ascending: false }).limit(1).maybeSingle(),
    client.rpc("resolve_order_active_stage_v1", { p_order_id: order.id }),
    client.from("pickup_preparations")
      .select("id,status,ready_at,pickup_deadline,extension_requested_at,requested_deadline,expired_at")
      .eq("order_id", order.id).maybeSingle(),
    client.from("order_cancellation_requests")
      .select("id,status,reason,requires_refund,requested_at,decision_reason")
      .eq("order_id", order.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    client.from("refund_cases")
      .select("id,refund_number,status,amount,sent_at,confirmed_at")
      .eq("order_id", order.id).order("created_at", { ascending: false }).limit(1).maybeSingle()
  ]);

  const fulfillment = fulfillmentResult.data as {
    method?: string; status?: string; courier?: string | null; tracking_number?: string | null;
    scheduled_at?: string | null; ready_at?: string | null; shipped_at?: string | null;
    delivered_at?: string | null; picked_up_at?: string | null;
  } | null;
  const latestPayment = latestPaymentResult.data as LatestPaymentRow | null;
  const paymentStatus = effectivePaymentStatus(order.payment_status, latestPayment);
  const trackingNumber = fulfillment?.tracking_number ?? null;

  return safeResponse({
    order: {
      orderNumber: order.order_number,
      createdAt: order.created_at,
      maskedPhone: maskPhone(order.customer_phone),
      maskedAddress: order.delivery_method === "shipping" ? maskAddress(order.shipping_address) : null,
      status: order.status,
      statusLabel: customerOrderStatusLabel(order.status),
      paymentStatus,
      paymentStatusLabel: customerPaymentStatusLabel(paymentStatus),
      subtotal: Number(order.subtotal_amount ?? 0),
      shippingCost: order.shipping_cost === null ? null : Number(order.shipping_cost),
      total: Number(order.total_amount ?? 0),
      amountPaid: Number(order.payment_effective_total ?? 0),
      remainingBalance: Number(order.payment_balance ?? 0),
      fulfillmentMethod: fulfillment?.method ?? order.delivery_method,
      paymentMethod: order.payment_method,
      courier: fulfillment?.courier ?? order.shipping_courier,
      trackingNumber,
      pickupStatus: order.delivery_method === "pickup" ? fulfillment?.status ?? order.status : null,
      fulfillmentStatus: fulfillment?.status ?? null,
      nextStep: trackingNextStep({
        status: fulfillment?.status ?? order.status,
        paymentStatus,
        fulfillmentMethod: fulfillment?.method ?? order.delivery_method,
        trackingNumber
      }),
      pricingStatus: order.pricing_status ?? "final",
      paymentUrl: relativePaymentPath(paymentLink?.publicUrl ?? null),
      activeStage: activeStageResult.error ? null : activeStageResult.data
    },
    items: itemsResult.data ?? [],
    customerOperations: {
      cancellation: cancellationResult.data ?? null,
      refund: refundResult.data ? {
        ...refundResult.data,
        amount: Number(refundResult.data.amount ?? 0)
      } : null,
      pickup: pickupResult.data ?? null
    },
    shippingQuote: quoteResult.data ? {
      version: Number(quoteResult.data.version),
      courier: quoteResult.data.courier,
      service: quoteResult.data.service,
      cost: Number(quoteResult.data.cost),
      estimate: quoteResult.data.estimate,
      total: Number(quoteResult.data.total_snapshot),
      status: quoteResult.data.status,
      createdAt: quoteResult.data.created_at
    } : null
  }, 200);
}

function effectivePaymentStatus(orderStatus: string, latest: LatestPaymentRow | null) {
  const status = normalized(latest?.status);
  const outcome = normalized(latest?.review_outcome);
  if (status === "pending" || outcome === "pending") return "pending_verification";
  const correction = ["rejected", "ditolak", "funds_not_found", "correction_requested", "correction_required", "needs_correction", "proof_unclear"];
  if (correction.includes(status) || correction.includes(outcome)) return "rejected";
  const verified = ["verified", "paid", "terverifikasi"];
  if (verified.includes(status) || verified.includes(outcome)) return "paid";
  return orderStatus;
}

function normalized(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function relativePaymentPath(publicUrl: string | null) {
  if (!publicUrl) return null;
  if (publicUrl.startsWith("/")) return publicUrl;
  try {
    const url = new URL(publicUrl);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

async function readBody(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    return {
      orderNumber: body.orderNumber,
      token: body.token,
      whatsapp: body.whatsapp
    };
  } catch {
    return { orderNumber: null, token: null, whatsapp: null };
  }
}

function requestFingerprint(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const realIp = request.headers.get("x-real-ip")?.trim() ?? forwarded;
  const agent = request.headers.get("user-agent")?.slice(0, 300) ?? "unknown";
  return sha256(`${realIp}|${agent}`);
}

async function auditDenied(
  client: NonNullable<ReturnType<typeof getAdminSupabaseClient>>,
  orderId: string | null,
  fingerprint: string,
  orderFingerprint: string,
  reason: string,
  request: Request
) {
  const { error } = await client.from("system_audit_log").insert({
    entity_type: "order",
    entity_id: orderId,
    action: "guest_tracking_denied",
    actor_role: "guest",
    source: "guest_order_tracking",
    reason,
    request_id: request.headers.get("x-vercel-id")?.slice(0, 200) ?? null,
    metadata: { fingerprint, order_fingerprint: orderFingerprint }
  });
  return !error;
}

function safeResponse(body: Record<string, unknown>, status: number) {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store, private",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff"
    }
  });
}
