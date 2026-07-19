import { createHash } from "node:crypto";
import { ensureAutomaticPaymentLink } from "@/lib/automatic-payment-link-v2";
import { getAdminSupabaseClient } from "@/lib/supabase/client";

type Context = { params: Promise<{ token: string }> };
type PublicOrderRow = {
  id: string; order_number: string; customer_name: string; customer_phone: string | null; status: string; payment_status: string;
  delivery_method: string; payment_method: string; subtotal_amount: number; shipping_cost: number | null;
  shipping_courier: string | null; shipping_service: string | null; shipping_estimate: string | null; total_amount: number;
  whatsapp_confirmation_expires_at: string | null; whatsapp_confirmed_at: string | null; reservation_expires_at: string | null;
  final_total_approved_at: string | null; public_access_token_expires_at: string | null; created_at: string;
  pricing_status?: string | null;
  custom_quote_version: number | null; custom_quote_status: string | null; custom_quote_locked_at: string | null;
};

type PublicPaymentLink = {
  url: string | null;
  expiresAt: string | null;
  unavailableReason: string | null;
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

async function resolvePublicPaymentLink(
  client: NonNullable<ReturnType<typeof getAdminSupabaseClient>>,
  order: PublicOrderRow
): Promise<PublicPaymentLink> {
  if (order.payment_method !== "bank_transfer" || order.status !== "awaiting_payment") {
    return { url: null, expiresAt: null, unavailableReason: null };
  }

  try {
    const result = await ensureAutomaticPaymentLink(client, {
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      payment_status: order.payment_status,
      pricing_status: order.pricing_status ?? null,
      total_amount: Number(order.total_amount ?? 0),
      whatsapp_confirmed_at: order.whatsapp_confirmed_at,
      archived_at: null
    });

    return {
      url: relativePaymentPath(result.publicUrl),
      expiresAt: result.link?.expires_at ?? null,
      unavailableReason: result.blocker
    };
  } catch (error) {
    console.error("Public order payment link unavailable", {
      orderId: order.id,
      error: error instanceof Error ? error.name : "unknown"
    });
    return {
      url: null,
      expiresAt: null,
      unavailableReason: "Instruksi pembayaran belum tersedia."
    };
  }
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
      "whatsapp_confirmed_at", "reservation_expires_at", "final_total_approved_at", "public_access_token_expires_at", "pricing_status", "created_at",
      "custom_quote_version", "custom_quote_status", "custom_quote_locked_at"
    ].join(",")).eq("public_access_token_hash", tokenHash(token)).is("archived_at", null).maybeSingle();
    if (error || !order) return Response.json({ error: "Order tidak ditemukan atau tautan tidak aktif." }, { status: 404 });
    const row = order as unknown as PublicOrderRow;
    if (row.public_access_token_expires_at && new Date(row.public_access_token_expires_at).getTime() <= Date.now()) {
      return Response.json({ error: "Tautan order sudah kedaluwarsa. Gunakan nomor WhatsApp atau minta tautan baru." }, { status: 410 });
    }

    const [{ data: items }, { data: reservations }, { data: quote }, { data: customQuote }, payment, activeStage] = await Promise.all([
      client.from("order_items").select("id,product_name,variant_name,color,size,sku,quantity,unit_price,subtotal,custom_project_id,pricing_status").eq("order_id", row.id).is("archived_at", null).order("created_at"),
      client.from("stock_reservations").select("status,quantity,expires_at").eq("order_id", row.id).eq("status", "active"),
      client.from("order_shipping_quotes").select("version,courier,service,cost,estimate,total_snapshot,status,created_at").eq("order_id", row.id).order("version", { ascending: false }).limit(1).maybeSingle(),
      row.custom_quote_version ? client.from("custom_order_quotation_versions").select("version_number,status,quoted_total,pricing_components,design_version_snapshot,valid_until,sent_at,locked_at").eq("order_id", row.id).eq("version_number", row.custom_quote_version).maybeSingle() : Promise.resolve({ data: null }),
      resolvePublicPaymentLink(client, row),
      client.rpc("resolve_order_active_stage_v1", { p_order_id: row.id })
        .then(({ data, error }) => error ? null : data)
        .catch(() => null)
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
        trackingTokenExpiresAt: row.public_access_token_expires_at,
        createdAt: row.created_at,
        pricingStatus: row.pricing_status ?? "final",
        customQuoteStatus: row.custom_quote_status,
        customQuoteVersion: row.custom_quote_version,
        customQuoteLockedAt: row.custom_quote_locked_at
      },
      items: items ?? [],
      reservation: reservations?.[0] ?? null,
      quote: quote ?? null,
      customQuote: customQuote ?? null,
      payment,
      activeStage
    }, { headers: { "cache-control": "no-store, private" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Order gagal dimuat." }, { status: 500 });
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const { token } = await context.params;
    if (!validToken(token)) return Response.json({ error: "Tautan order tidak valid." }, { status: 400 });
    const body = await request.json() as { action?: string; acknowledgement?: string; reason?: string };
    if (!new Set(["approve_total", "approve_custom_quote", "request_custom_revision"]).has(body.action ?? "")) return Response.json({ error: "Aksi tidak didukung." }, { status: 400 });
    const client = getAdminSupabaseClient();
    if (!client) return Response.json({ error: "Layanan order belum dikonfigurasi." }, { status: 503 });
    const { data, error } = body.action === "approve_total"
      ? await client.rpc("approve_public_order_total", { p_access_token_hash: tokenHash(token) })
      : await client.rpc("decide_public_custom_order_quotation_v1", {
          p_access_token_hash: tokenHash(token),
          p_decision: body.action === "approve_custom_quote" ? "approve" : "revision_requested",
          p_acknowledgement: body.acknowledgement?.trim() || "",
          p_reason: body.reason?.trim() || null
        });
    if (error) throw new Error(error.message);
    return Response.json({ status: (data as { status?: string } | null)?.status ?? "awaiting_payment" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Total gagal disetujui.";
    return Response.json({ error: message }, { status: /stok/i.test(message) ? 409 : 400 });
  }
}
