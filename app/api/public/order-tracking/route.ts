import type { SupabaseClient } from "@supabase/supabase-js";
import {
  completeCustomerOrderTrackingPage,
  loadCustomerOrderTrackingProjection
} from "@/lib/customer-orders/page-use-case";
import {
  authorizeGuestTracking,
  isTrackingRateLimited,
  normalizeOrderNumber,
  sha256,
  TRACKING_RATE_LIMIT_MINUTES
} from "@/lib/order-tracking";
import {
  publicApiErrorResponse,
  safePublicResponse
} from "@/lib/public-api-error";
import { getAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  createServerRequestContext,
  logServerError,
  observabilityResponseHeaders,
  type ServerRequestContext
} from "@/lib/observability/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const observability = createServerRequestContext(
    request,
    "customer order tracking read"
  );
  try {
    const client = getAdminSupabaseClient();
    if (!client) {
      return customerOrderError(
        observability,
        "CUSTOMER_ORDER_UNAVAILABLE",
        "Layanan tracking belum dikonfigurasi.",
        503
      );
    }

    const fingerprint = requestFingerprint(request);
    const body = await readBody(request);
    const orderNumber = normalizeOrderNumber(body.orderNumber);
    const orderFingerprint = sha256(orderNumber || "invalid-order-number");

    if (!orderNumber) {
      return denyTrackingAccess({
        client,
        orderId: null,
        fingerprint,
        orderFingerprint,
        reason: "invalid_order_number",
        request,
        observability
      });
    }

    const projection = await loadCustomerOrderTrackingProjection(client, orderNumber);
    const authorization = authorizeGuestTracking(
      projection?.authorization ?? null,
      { token: body.token, whatsapp: body.whatsapp }
    );
    if (!authorization.ok) {
      return denyTrackingAccess({
        client,
        orderId: projection?.authorization.id ?? null,
        fingerprint,
        orderFingerprint,
        reason: authorization.reason,
        request,
        observability
      });
    }
    if (!projection) {
      return customerOrderError(
        observability,
        "CUSTOMER_ORDER_ACCESS_DENIED",
        "Data tracking tidak cocok atau pesanan tidak tersedia.",
        404
      );
    }

    const readModel = await completeCustomerOrderTrackingPage(
      client,
      projection,
      observability
    );
    return safePublicResponse(
      readModel,
      200,
      observabilityResponseHeaders(observability)
    );
  } catch (error) {
    return publicApiErrorResponse(error, "customer order tracking read", {
      code: "CUSTOMER_ORDER_UNAVAILABLE",
      message: "Tracking pesanan belum dapat dimuat. Coba lagi.",
      status: 503
    }, observability);
  }
}

async function denyTrackingAccess({
  client,
  orderId,
  fingerprint,
  orderFingerprint,
  reason,
  request,
  observability
}: {
  client: SupabaseClient;
  orderId: string | null;
  fingerprint: string;
  orderFingerprint: string;
  reason: string;
  request: Request;
  observability: ServerRequestContext;
}) {
  const since = new Date(
    Date.now() - TRACKING_RATE_LIMIT_MINUTES * 60_000
  ).toISOString();
  const { count, error } = await client
    .from("system_audit_log")
    .select("id", { count: "exact", head: true })
    .eq("source", "guest_order_tracking")
    .eq("action", "guest_tracking_denied")
    .gte("created_at", since)
    .filter("metadata->>fingerprint", "eq", fingerprint);
  if (error) {
    return customerOrderError(
      observability,
      "CUSTOMER_ORDER_UNAVAILABLE",
      "Perlindungan tracking sedang tidak tersedia. Coba beberapa saat lagi.",
      503
    );
  }

  if (isTrackingRateLimited(count)) {
    await auditDenied(
      client,
      orderId,
      fingerprint,
      orderFingerprint,
      "rate_limited",
      request,
      observability
    );
    return customerOrderError(
      observability,
      "CUSTOMER_ORDER_RATE_LIMITED",
      "Terlalu banyak percobaan. Coba lagi 15 menit kemudian.",
      429
    );
  }

  const audited = await auditDenied(
    client,
    orderId,
    fingerprint,
    orderFingerprint,
    reason,
    request,
    observability
  );
  if (!audited) {
    return customerOrderError(
      observability,
      "CUSTOMER_ORDER_UNAVAILABLE",
      "Perlindungan tracking sedang tidak tersedia. Coba beberapa saat lagi.",
      503
    );
  }

  if (reason === "expired_token") {
    return customerOrderError(
      observability,
      "CUSTOMER_ORDER_ACCESS_EXPIRED",
      "Tautan tracking telah kedaluwarsa. Gunakan nomor WhatsApp atau minta tautan baru.",
      410
    );
  }
  return customerOrderError(
    observability,
    "CUSTOMER_ORDER_ACCESS_DENIED",
    "Data tracking tidak cocok atau pesanan tidak tersedia.",
    404
  );
}

async function readBody(request: Request) {
  const value: unknown = await request.json().catch(() => null);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { orderNumber: null, token: null, whatsapp: null };
  }
  const body = Object.fromEntries(Object.entries(value));
  return {
    orderNumber: body.orderNumber,
    token: body.token,
    whatsapp: body.whatsapp
  };
}

function requestFingerprint(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const realIp = request.headers.get("x-real-ip")?.trim() ?? forwarded;
  const agent = request.headers.get("user-agent")?.slice(0, 300) ?? "unknown";
  return sha256(`${realIp}|${agent}`);
}

async function auditDenied(
  client: SupabaseClient,
  orderId: string | null,
  fingerprint: string,
  orderFingerprint: string,
  reason: string,
  request: Request,
  observability: ServerRequestContext
) {
  const { error } = await client.from("system_audit_log").insert({
    entity_type: "order",
    entity_id: orderId,
    action: "guest_tracking_denied",
    actor_role: "guest",
    source: "guest_order_tracking",
    reason,
    request_id: request.headers.get("x-vercel-id")?.slice(0, 200) ?? null,
    metadata: {
      fingerprint,
      order_fingerprint: orderFingerprint
    }
  });
  if (error) {
    logServerError(observability, error, {
      event: "customer_order_tracking.audit_write_failed",
      entityType: "order",
      entityId: orderId,
      reason
    });
  }
  return !error;
}

function customerOrderError(
  context: ServerRequestContext,
  code: string,
  error: string,
  status: number
) {
  return safePublicResponse(
    { code, error },
    status,
    observabilityResponseHeaders(context)
  );
}
