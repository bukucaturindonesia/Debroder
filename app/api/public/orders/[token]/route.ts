import { createHash } from "node:crypto";
import { getAdminSupabaseClient } from "@/lib/supabase/client";

type Context = { params: Promise<{ token: string }> };
type PublicOrderRow = {
  id: string; order_number: string; customer_name: string; customer_phone: string | null; status: string; payment_status: string;
  delivery_method: string; payment_method: string; subtotal_amount: number; shipping_cost: number | null;
  shipping_courier: string | null; shipping_service: string | null; shipping_estimate: string | null; total_amount: number;
  whatsapp_confirmation_expires_at: string | null; whatsapp_confirmed_at: string | null; reservation_expires_at: string | null;
  final_total_approved_at: string | null; created_at: string;
};

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function validToken(token: string) {
  return /^[a-zA-Z0-9_-]{32,160}$/.test(token);
}

function maskPhone(phone: string | null) {
  if (!phone) return "";
  return phone.length <= 6 ? "***" : `${phone.slice(0, 4)}***${phone.slice(-3)}`;
}

export async function GET(_request: Request, context: Context) {
  try {
    const { token } = await context.params;
    if (!validToken(token)) return Response.json({ error: "Tautan order tidak valid." }, { status: 400 });
    const client = getAdminSupabaseClient();
    if (!client) return Response.json({ error: "Layanan order belum dikonfigurasi." }, { status: 503 });

    const { data: order, error } = await client.from("orders").select([
      "id", "order_number", "customer_name", "customer_phone", "status", "payment_status",
      "delivery_method", "payment_method", "subtotal_amount", "shipping_cost", "shipping_courier",
      "shipping_service", "shipping_estimate", "total_amount", "whatsapp_confirmation_expires_at",
      "whatsapp_confirmed_at", "reservation_expires_at", "final_total_approved_at", "created_at"
    ].join(",")).eq("public_access_token_hash", tokenHash(token)).is("archived_at", null).maybeSingle();
    if (error || !order) return Response.json({ error: "Order tidak ditemukan atau tautan tidak aktif." }, { status: 404 });
    const row = order as unknown as PublicOrderRow;

    const [{ data: items }, { data: reservations }, { data: quote }] = await Promise.all([
      client.from("order_items").select("id,product_name,variant_name,color,size,sku,quantity,unit_price,subtotal").eq("order_id", row.id).is("archived_at", null).order("created_at"),
      client.from("stock_reservations").select("status,quantity,expires_at").eq("order_id", row.id).eq("status", "active"),
      client.from("order_shipping_quotes").select("version,courier,service,cost,estimate,total_snapshot,status,created_at").eq("order_id", row.id).order("version", { ascending: false }).limit(1).maybeSingle()
    ]);

    return Response.json({
      order: {
        orderNumber: row.order_number,
        customerName: row.customer_name,
        maskedPhone: maskPhone(row.customer_phone),
        status: row.status,
        paymentStatus: row.payment_status,
        fulfillmentMethod: row.delivery_method,
        paymentMethod: row.payment_method,
        subtotal: Number(row.subtotal_amount ?? 0),
        shippingCost: row.shipping_cost === null ? null : Number(row.shipping_cost),
        shippingCourier: row.shipping_courier,
        shippingService: row.shipping_service,
        shippingEstimate: row.shipping_estimate,
        total: Number(row.total_amount ?? 0),
        whatsappConfirmationExpiresAt: row.whatsapp_confirmation_expires_at,
        whatsappConfirmedAt: row.whatsapp_confirmed_at,
        reservationExpiresAt: row.reservation_expires_at,
        finalTotalApprovedAt: row.final_total_approved_at,
        createdAt: row.created_at
      },
      items: items ?? [],
      reservation: reservations?.[0] ?? null,
      quote: quote ?? null
    }, { headers: { "cache-control": "no-store, private" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Order gagal dimuat." }, { status: 500 });
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const { token } = await context.params;
    if (!validToken(token)) return Response.json({ error: "Tautan order tidak valid." }, { status: 400 });
    const body = await request.json() as { action?: string };
    if (body.action !== "approve_total") return Response.json({ error: "Aksi tidak didukung." }, { status: 400 });
    const client = getAdminSupabaseClient();
    if (!client) return Response.json({ error: "Layanan order belum dikonfigurasi." }, { status: 503 });
    const { data, error } = await client.rpc("approve_public_order_total", { p_access_token_hash: tokenHash(token) });
    if (error) throw new Error(error.message);
    return Response.json({ status: (data as { status?: string } | null)?.status ?? "awaiting_payment" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Total gagal disetujui.";
    return Response.json({ error: message }, { status: /stok/i.test(message) ? 409 : 400 });
  }
}
