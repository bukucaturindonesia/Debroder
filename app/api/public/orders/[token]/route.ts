import {
  completeCustomerOrderConfirmationPage,
  loadCustomerOrderConfirmationProjection
} from "@/lib/customer-orders/page-use-case";
import { sha256, validTrackingToken } from "@/lib/order-tracking";
import {
  publicApiErrorResponse,
  safePublicResponse
} from "@/lib/public-api-error";
import { getAdminSupabaseClient } from "@/lib/supabase/admin";

type Context = { params: Promise<{ token: string }> };

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: Context) {
  try {
    const { token } = await context.params;
    if (!validTrackingToken(token)) {
      return customerOrderError(
        "CUSTOMER_ORDER_INVALID_REQUEST",
        "Tautan order tidak valid.",
        400
      );
    }

    const client = getAdminSupabaseClient();
    if (!client) {
      return customerOrderError(
        "CUSTOMER_ORDER_UNAVAILABLE",
        "Layanan order belum dikonfigurasi.",
        503
      );
    }

    const projection = await loadCustomerOrderConfirmationProjection(
      client,
      sha256(token)
    );
    if (!projection) {
      return customerOrderError(
        "CUSTOMER_ORDER_NOT_FOUND",
        "Order tidak ditemukan atau tautan tidak aktif.",
        404
      );
    }
    if (isExpired(projection.authorization.public_access_token_expires_at)) {
      return customerOrderError(
        "CUSTOMER_ORDER_ACCESS_EXPIRED",
        "Tautan order sudah kedaluwarsa. Gunakan nomor WhatsApp atau minta tautan baru.",
        410
      );
    }

    const readModel = await completeCustomerOrderConfirmationPage(client, projection);
    return safePublicResponse(readModel);
  } catch (error) {
    return publicApiErrorResponse(error, "customer order confirmation read", {
      code: "CUSTOMER_ORDER_UNAVAILABLE",
      message: "Pesanan belum dapat dimuat. Coba lagi.",
      status: 500
    });
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const { token } = await context.params;
    if (!validTrackingToken(token)) {
      return customerOrderError(
        "CUSTOMER_ORDER_INVALID_REQUEST",
        "Tautan order tidak valid.",
        400
      );
    }
    const body = await readAction(request);
    if (!body) {
      return customerOrderError(
        "CUSTOMER_ORDER_INVALID_REQUEST",
        "Aksi tidak didukung.",
        400
      );
    }
    const client = getAdminSupabaseClient();
    if (!client) {
      return customerOrderError(
        "CUSTOMER_ORDER_UNAVAILABLE",
        "Layanan order belum dikonfigurasi.",
        503
      );
    }

    const { data, error } = body.action === "approve_total"
      ? await client.rpc("approve_public_order_total", {
        p_access_token_hash: sha256(token)
      })
      : await client.rpc("decide_public_custom_order_quotation_v1", {
        p_access_token_hash: sha256(token),
        p_decision: body.action === "approve_custom_quote"
          ? "approve"
          : "revision_requested",
        p_acknowledgement: body.acknowledgement,
        p_reason: body.reason
      });
    if (error) throw new Error(error.message);

    return safePublicResponse({
      status: recordText(data, "status") || "awaiting_payment"
    });
  } catch (error) {
    return publicApiErrorResponse(error, "customer order action", {
      code: "CUSTOMER_ORDER_ACTION_FAILED",
      message: "Tindakan pesanan belum dapat diproses. Muat ulang status lalu coba lagi.",
      status: 409
    });
  }
}

async function readAction(request: Request) {
  const value: unknown = await request.json().catch(() => null);
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = Object.fromEntries(Object.entries(value));
  if (row.action === "approve_total") {
    return {
      action: "approve_total" as const,
      acknowledgement: "",
      reason: null
    };
  }
  if (row.action === "approve_custom_quote" || row.action === "request_custom_revision") {
    return {
      action: row.action,
      acknowledgement: typeof row.acknowledgement === "string"
        ? row.acknowledgement.trim()
        : "",
      reason: typeof row.reason === "string" && row.reason.trim()
        ? row.reason.trim()
        : null
    };
  }
  return null;
}

function recordText(value: unknown, key: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const record = Object.fromEntries(Object.entries(value));
  return typeof record[key] === "string" ? record[key] : "";
}

function isExpired(value: string | null) {
  if (!value) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp <= Date.now();
}

function customerOrderError(code: string, error: string, status: number) {
  return safePublicResponse({ code, error }, status);
}
