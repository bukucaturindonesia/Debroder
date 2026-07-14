import { getSiteUrl } from "@/lib/env";
import { createTrackingToken, TRACKING_TOKEN_DAYS } from "@/lib/order-tracking";
import { phase13ErrorResponse, requirePhase13Actor } from "@/lib/phase13-auth";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const actor = await requirePhase13Actor(request, "order.edit");
    const { id } = await context.params;
    if (!/^[0-9a-fA-F-]{36}$/.test(id)) return Response.json({ error: "Order tidak valid." }, { status: 400 });

    const { data: order, error: orderError } = await actor.adminClient
      .from("orders")
      .select("id,order_number,customer_phone")
      .eq("id", id)
      .is("archived_at", null)
      .maybeSingle();
    if (orderError) throw new Error(orderError.message);
    if (!order) return Response.json({ error: "Order aktif tidak ditemukan." }, { status: 404 });

    const tracking = createTrackingToken();
    const expiresAt = new Date(Date.now() + TRACKING_TOKEN_DAYS * 86_400_000).toISOString();
    const { error: updateError } = await actor.adminClient
      .from("orders")
      .update({
        public_access_token_hash: tracking.hash,
        public_access_token_expires_at: expiresAt,
        updated_by: actor.user.id,
        updated_at: new Date().toISOString()
      })
      .eq("id", id);
    if (updateError) throw new Error(updateError.message);

    const publicUrl = `${getSiteUrl()}/track-order/${encodeURIComponent(order.order_number)}?token=${encodeURIComponent(tracking.token)}`;
    const message = [
      `Halo, berikut tautan aman untuk memantau pesanan ${order.order_number}:`,
      publicUrl,
      "",
      "Tautan berlaku 90 hari. Jangan membagikan tautan ini kepada orang lain."
    ].join("\n");
    const phone = String(order.customer_phone ?? "").replace(/\D/g, "").replace(/^0/, "62");

    await actor.adminClient.from("system_audit_log").insert({
      entity_type: "order",
      entity_id: id,
      action: "guest_tracking_token_rotated",
      actor_id: actor.user.id,
      actor_role: actor.role,
      source: "guest_order_tracking",
      new_value: { expires_at: expiresAt },
      metadata: { order_number: order.order_number }
    });

    return Response.json({
      publicUrl,
      expiresAt,
      whatsappMessage: message,
      whatsappUrl: phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : null
    }, { status: 201, headers: { "cache-control": "no-store, private" } });
  } catch (error) {
    return phase13ErrorResponse(error);
  }
}
