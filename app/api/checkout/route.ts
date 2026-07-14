import { createHash } from "node:crypto";
import { parsePublicCheckoutRequest } from "@/lib/commerce-checkout";
import { deriveCheckoutTrackingToken } from "@/lib/order-tracking";
import { getAdminSupabaseEnv } from "@/lib/env";
import { getAdminSupabaseClient } from "@/lib/supabase/client";

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function POST(request: Request) {
  try {
    const body = parsePublicCheckoutRequest(await request.json());
    if (!body) return Response.json({ error: "Data checkout tidak valid." }, { status: 400 });

    const client = getAdminSupabaseClient();
    const adminEnv = getAdminSupabaseEnv();
    if (!client || !adminEnv) return Response.json({ error: "Layanan checkout belum dikonfigurasi." }, { status: 503 });

    const derivedTrackingToken = deriveCheckoutTrackingToken(body.idempotencyKey, adminEnv.serviceRoleKey);
    const { data: existingOrder } = await client
      .from("orders")
      .select("public_access_token_hash")
      .eq("public_idempotency_key", body.idempotencyKey)
      .maybeSingle();
    const storedHash = typeof existingOrder?.public_access_token_hash === "string" ? existingOrder.public_access_token_hash : "";
    const trackingToken = !storedHash || storedHash === sha256(derivedTrackingToken)
      ? derivedTrackingToken
      : storedHash === sha256(body.accessToken)
        ? body.accessToken
        : "";
    if (!trackingToken) return Response.json({ error: "Token retry checkout tidak cocok." }, { status: 409 });

    const { data, error } = await client.rpc("create_public_checkout_order", {
      p_idempotency_key: body.idempotencyKey,
      p_access_token_hash: sha256(trackingToken),
      p_whatsapp_confirmation_hash: sha256(body.confirmationCode),
      p_customer_name: body.customer.name,
      p_customer_phone: body.customer.phone,
      p_customer_email: body.customer.email ?? null,
      p_delivery_method: body.fulfillment.method,
      p_shipping_address: body.fulfillment.address ?? null,
      p_pickup_location_id: body.fulfillment.pickupLocationId ?? null,
      p_payment_method: body.fulfillment.paymentMethod,
      p_customer_notes: body.customer.notes ?? null,
      p_items: body.items.map((item) => ({
        variant_size_id: item.variantSizeId,
        quantity: item.quantity,
        note: item.note ?? ""
      }))
    });
    if (error) throw new Error(error.message);

    const result = data as { order_id?: string; order_number?: string; status?: string } | null;
    if (!result?.order_number) throw new Error("Order tidak berhasil dibuat.");
    return Response.json({
      orderId: result.order_id,
      orderNumber: result.order_number,
      status: result.status,
      confirmationUrl: `/order-confirmation/${encodeURIComponent(trackingToken)}`,
      trackingUrl: `/track-order/${encodeURIComponent(result.order_number)}?token=${encodeURIComponent(trackingToken)}`,
      trackingToken
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout gagal diproses.";
    const status = /stok|maksimal dua|tidak lagi aktif|quotation/i.test(message) ? 409 : 400;
    return Response.json({ error: message }, { status });
  }
}
