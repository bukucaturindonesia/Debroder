import { authorizeGuestTracking, normalizeOrderNumber, sha256 } from "@/lib/order-tracking";
import { publicApiErrorResponse, safePublicResponse } from "@/lib/public-api-error";
import { getAdminSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const orderNumber = normalizeOrderNumber(body.orderNumber);
    const action = typeof body.action === "string" ? body.action : "";
    if (!orderNumber || !new Set(["request_cancellation", "request_pickup_extension"]).has(action)) {
      return safePublicResponse({ error: "Tindakan pesanan tidak valid." }, 400);
    }

    const client = getAdminSupabaseClient();
    if (!client) return safePublicResponse({ error: "Layanan pesanan belum tersedia." }, 503);

    const { data: order, error } = await client
      .from("orders")
      .select("id,order_number,customer_phone,public_access_token_hash,public_access_token_expires_at,status")
      .eq("order_number", orderNumber)
      .is("archived_at", null)
      .maybeSingle();
    if (error) throw error;

    const authorization = authorizeGuestTracking(order, { token: body.token, whatsapp: body.whatsapp });
    if (!authorization.ok || !order) {
      return safePublicResponse({ error: "Data pesanan tidak cocok atau sudah tidak tersedia." }, 404);
    }

    const since = new Date(Date.now() - 60 * 60_000).toISOString();
    const actionFingerprint = sha256(`${order.id}|${action}|${request.headers.get("x-forwarded-for") ?? "unknown"}`);
    const { count } = await client
      .from("system_audit_log")
      .select("id", { count: "exact", head: true })
      .eq("source", "public_order_action")
      .filter("metadata->>fingerprint", "eq", actionFingerprint)
      .gte("created_at", since);
    if (Number(count ?? 0) >= 5) {
      return safePublicResponse({ error: "Terlalu banyak permintaan. Coba lagi nanti." }, 429, { "retry-after": "3600" });
    }

    let result: unknown;
    if (action === "request_cancellation") {
      const reason = typeof body.reason === "string" ? body.reason.trim() : "";
      if (reason.length < 5 || reason.length > 1000) {
        return safePublicResponse({ error: "Jelaskan alasan pembatalan minimal 5 karakter." }, 400);
      }
      const response = await client.rpc("request_order_cancellation_for_order_v1", {
        p_order_id: order.id,
        p_reason: reason
      });
      if (response.error) throw response.error;
      result = response.data;
    } else {
      const reason = typeof body.reason === "string" ? body.reason.trim() : "";
      const requestedDeadline = typeof body.requestedDeadline === "string" ? body.requestedDeadline : "";
      if (reason.length < 5 || Number.isNaN(new Date(requestedDeadline).getTime())) {
        return safePublicResponse({ error: "Alasan dan waktu perpanjangan wajib diisi." }, 400);
      }
      const response = await client.rpc("request_pickup_extension_for_order_v1", {
        p_order_id: order.id,
        p_requested_deadline: new Date(requestedDeadline).toISOString(),
        p_reason: reason
      });
      if (response.error) throw response.error;
      result = response.data;
    }

    await client.from("system_audit_log").insert({
      entity_type: "order",
      entity_id: order.id,
      action,
      actor_role: "guest",
      source: "public_order_action",
      metadata: { fingerprint: actionFingerprint, authorization_method: authorization.method }
    });

    return safePublicResponse({ ok: true, action, result }, 201);
  } catch (error) {
    return publicApiErrorResponse(error, "public order action request", {
      code: "ORDER_ACTION_REQUEST_FAILED",
      message: "Permintaan belum dapat dikirim. Coba lagi atau hubungi Admin DEBRODER.",
      status: 409
    });
  }
}
