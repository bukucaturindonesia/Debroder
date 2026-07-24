import { hashPaymentToken } from "@/lib/payment-token";
import { getAdminSupabaseClient } from "@/lib/supabase/admin";
import { publicApiErrorResponse } from "@/lib/public-api-error";
import {
  createServerRequestContext,
  logServerError,
  logServerEvent,
  observabilityResponseHeaders,
  type ServerRequestContext
} from "@/lib/observability/server";

const ALLOWED_TYPES = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["application/pdf", "pdf"]
]);
const MAX_BYTES = 5 * 1024 * 1024;
type Context = { params: Promise<{ token: string }> };
type AdminClient = NonNullable<ReturnType<typeof getAdminSupabaseClient>>;
type PublicPaymentItemRow = {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  custom_project_id: string | null;
};
type PublicPaymentSubmissionRow = {
  id: string;
  payment_number: string;
  status: string;
  review_outcome: string | null;
  rejection_reason: string | null;
  reported_amount: number | null;
  amount: number;
  submitted_at: string | null;
};
type PublicPaymentMethodRow = {
  id: string;
  method_code: string;
  method_type: string;
  display_name: string;
  bank_name: string | null;
  account_number: string | null;
  account_holder: string | null;
  qris_image_url: string | null;
  instructions: string | null;
  expires_in_hours: number | null;
};
type PublicPaymentFulfillmentRow = {
  method: string;
  status: string;
  courier: string | null;
  tracking_number: string | null;
};

async function resolveActiveStage(
  client: AdminClient,
  orderId: string,
  context: ServerRequestContext
) {
  try {
    const { data, error } = await client.rpc("resolve_order_active_stage_v1", { p_order_id: orderId });
    if (error) {
      logServerError(context, error, {
        event: "public_payment.active_stage_unavailable",
        entityType: "order",
        entityId: orderId
      });
      return null;
    }
    return data;
  } catch (error) {
    logServerError(context, error, {
      event: "public_payment.active_stage_unavailable",
      entityType: "order",
      entityId: orderId
    });
    return null;
  }
}

async function resolveLink(token: string) {
  const client = getAdminSupabaseClient();
  if (!client) throw new Error("Layanan pembayaran belum dikonfigurasi.");
  const { data: link, error } = await client.from("payment_submission_links")
    .select("id,order_id,expires_at,max_uses,used_count,revoked_at,archived_at,created_at")
    .eq("token_hash", hashPaymentToken(token)).maybeSingle();
  if (error) throw error;
  if (!link || link.revoked_at || link.archived_at
    || new Date(link.expires_at).getTime() <= Date.now()
    || link.used_count >= link.max_uses) return null;
  return { client, link };
}

export async function GET(request: Request, context: Context) {
  const observability = createServerRequestContext(request, "public payment read");
  const respond = (body: unknown, status = 200) => paymentResponse(
    observability,
    body,
    status
  );
  try {
    const { token } = await context.params;
    const resolved = await resolveLink(token);
    if (!resolved) return respond({ error: "Tautan pembayaran tidak aktif atau sudah kedaluwarsa." }, 404);
    const { data: order, error } = await resolved.client.from("orders")
      .select("id,order_number,customer_name,status,delivery_method,payment_method,total_amount,payment_effective_total,payment_balance,payment_required_amount,payment_requirement_met,payment_status,currency,pricing_status")
      .eq("id", resolved.link.order_id).is("archived_at", null).maybeSingle();
    if (error) throw error;
    if (!order) return respond({ error: "Pesanan tidak tersedia." }, 404);
    if (order.pricing_status !== "final" || Number(order.total_amount) <= 0) {
      return respond({ code: "PAYMENT_PRICING_NOT_FINAL", error: "Pembayaran belum tersedia sampai harga order ditetapkan final." }, 409);
    }
    const [
      itemsResult,
      settingsResult,
      submissionsResult,
      fulfillmentResult,
      activeStage
    ] = await Promise.all([
      resolved.client.from("order_items")
        .select("id,product_name,quantity,unit_price,subtotal,custom_project_id")
        .eq("order_id", order.id)
        .is("archived_at", null)
        .order("created_at"),
      resolved.client.from("payment_method_settings")
        .select("id,method_code,method_type,display_name,bank_name,account_number,account_holder,qris_image_url,instructions,expires_in_hours,sort_order")
        .eq("is_active", true)
        .is("archived_at", null)
        .order("sort_order")
        .order("display_name"),
      resolved.client.from("order_payments")
        .select("id,payment_number,status,review_outcome,rejection_reason,reported_amount,amount,submitted_at")
        .eq("order_id", order.id)
        .eq("submission_source", "customer_link")
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(10),
      resolved.client.from("fulfillments")
        .select("method,status,courier,tracking_number")
        .eq("order_id", order.id)
        .is("archived_at", null)
        .neq("status", "cancelled")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      resolveActiveStage(resolved.client, order.id, observability)
    ]);
    const readError = [
      itemsResult.error,
      settingsResult.error,
      submissionsResult.error,
      fulfillmentResult.error
    ].find(Boolean);
    if (readError) throw readError;
    const items = itemsResult.data;
    const settings = settingsResult.data;
    const submissions = submissionsResult.data;
    const fulfillment = fulfillmentResult.data;
    const itemRows = (items ?? []) as PublicPaymentItemRow[];
    const submissionRows = (submissions ?? []) as PublicPaymentSubmissionRow[];
    const methodRows = (settings ?? []) as PublicPaymentMethodRow[];
    const fulfillmentRow = fulfillment as PublicPaymentFulfillmentRow | null;
    return respond({
      orderNumber: order.order_number,
      customerName: order.customer_name,
      orderStatus: order.status,
      fulfillmentMethod: fulfillmentRow?.method ?? order.delivery_method,
      fulfillmentStatus: fulfillmentRow?.status ?? null,
      courier: fulfillmentRow?.courier ?? null,
      trackingNumber: fulfillmentRow?.tracking_number ?? null,
      paymentMethod: order.payment_method,
      paymentStatus: order.payment_status,
      currency: order.currency,
      totalAmount: Number(order.total_amount),
      effectivePaid: Number(order.payment_effective_total),
      outstandingBalance: Number(order.payment_balance),
      requiredAmount: Number(order.payment_required_amount),
      requirementMet: Boolean(order.payment_requirement_met),
      expiresAt: resolved.link.expires_at,
      remainingUses: resolved.link.max_uses - resolved.link.used_count,
      isCustom: itemRows.some((item) => Boolean(item.custom_project_id)),
      activeStage,
      items: itemRows.map((item) => ({
        id: item.id,
        name: item.product_name,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unit_price),
        subtotal: Number(item.subtotal)
      })),
      submissions: submissionRows.map((submission) => ({
        id: submission.id,
        paymentNumber: submission.payment_number,
        status: submission.status,
        outcome: submission.review_outcome,
        reason: submission.rejection_reason,
        amount: Number(submission.reported_amount ?? submission.amount),
        submittedAt: submission.submitted_at
      })),
      methods: methodRows.map((setting) => ({
        id: setting.id,
        code: setting.method_code,
        type: setting.method_type,
        displayName: setting.display_name,
        bankName: setting.bank_name,
        accountNumber: setting.account_number,
        accountHolder: setting.account_holder,
        qrisImageUrl: setting.qris_image_url,
        instructions: setting.instructions,
        expiresInHours: setting.expires_in_hours
      }))
    });
  } catch (error) {
    return publicApiErrorResponse(error, "public payment read", {
      code: "PAYMENT_LOAD_FAILED",
      message: "Data pembayaran belum dapat dimuat. Coba lagi.",
      status: 500
    }, observability);
  }
}

export async function POST(request: Request, context: Context) {
  const observability = createServerRequestContext(
    request,
    "public payment submission"
  );
  const respond = (body: unknown, status = 200) => paymentResponse(
    observability,
    body,
    status
  );
  let uploadedPath: string | null = null;
  try {
    const { token } = await context.params;
    const resolved = await resolveLink(token);
    if (!resolved) return respond({ error: "Tautan pembayaran tidak aktif atau sudah kedaluwarsa." }, 404);
    const { data: payableOrder, error: payableOrderError } = await resolved.client.from("orders")
      .select("pricing_status,total_amount")
      .eq("id", resolved.link.order_id)
      .is("archived_at", null)
      .maybeSingle();
    if (payableOrderError) throw payableOrderError;
    if (!payableOrder) return respond({ error: "Pesanan tidak tersedia." }, 404);
    if (payableOrder.pricing_status !== "final" || Number(payableOrder.total_amount) <= 0) {
      return respond({ code: "PAYMENT_PRICING_NOT_FINAL", error: "Pembayaran diblokir sampai harga order ditetapkan final." }, 409);
    }

    const form = await request.formData();
    const amount = Math.round(Number(form.get("amount")));
    const paidAt = String(form.get("paidAt") ?? "");
    const paymentMethodId = String(form.get("paymentMethodId") ?? "").trim();
    const channelName = String(form.get("channelName") ?? "").trim();
    const senderName = String(form.get("senderName") ?? "").trim();
    const referenceNumber = String(form.get("referenceNumber") ?? "").trim();
    const customerNotes = String(form.get("customerNotes") ?? "").trim();
    const idempotencyKey = String(form.get("idempotencyKey") ?? "").trim();
    const proof = form.get("proof");
    if (!Number.isSafeInteger(amount) || amount <= 0) return respond({ error: "Nominal pembayaran tidak valid." }, 400);
    const paidAtDate = new Date(paidAt);
    if (!paidAt || Number.isNaN(paidAtDate.getTime()) || paidAtDate.getTime() > Date.now() + 86_400_000) {
      return respond({ error: "Tanggal pembayaran tidak valid." }, 400);
    }
    if (!/^[a-zA-Z0-9_-]{16,100}$/.test(idempotencyKey)) return respond({ error: "Kunci pengiriman tidak valid." }, 400);
    if (!/^[0-9a-f-]{36}$/i.test(paymentMethodId) || senderName.length < 2 || senderName.length > 150 || channelName.length < 2) {
      return respond({ error: "Metode tujuan, nama pengirim, dan bank atau dompet pengirim wajib diisi." }, 400);
    }
    if (!(proof instanceof File) || proof.size <= 0 || proof.size > MAX_BYTES || !ALLOWED_TYPES.has(proof.type)) {
      return respond({ error: "Bukti wajib PNG, JPG, atau PDF maksimal 5 MB." }, 400);
    }
    if (!await hasValidFileSignature(proof)) {
      return respond({ error: "Isi file bukti tidak cocok dengan format yang diizinkan." }, 400);
    }

    const { data: method, error: methodError } = await resolved.client.from("payment_method_settings")
      .select("id")
      .eq("id", paymentMethodId)
      .eq("is_active", true)
      .is("archived_at", null)
      .maybeSingle();
    if (methodError) throw methodError;
    if (!method) return respond({ error: "Metode pembayaran tidak aktif. Muat ulang halaman." }, 409);

    const { data: existing, error: existingError } = await resolved.client.from("order_payments")
      .select("payment_number,status,order_id,submission_link_id")
      .eq("submission_idempotency_key", idempotencyKey)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) {
      if (existing.order_id !== resolved.link.order_id || existing.submission_link_id !== resolved.link.id) {
        return respond({ error: "Kunci pengiriman telah digunakan pada transaksi lain." }, 409);
      }
      return respond({ paymentNumber: existing.payment_number, status: existing.status, idempotent: true });
    }

    const extension = ALLOWED_TYPES.get(proof.type)!;
    uploadedPath = `public/${resolved.link.order_id}/${idempotencyKey}.${extension}`;
    const { error: uploadError } = await resolved.client.storage.from("payment-proofs").upload(uploadedPath, proof, {
      upsert: false,
      contentType: proof.type,
      cacheControl: "3600"
    });
    if (uploadError) throw new Error(`Bukti gagal diunggah: ${uploadError.message}`);

    const { data, error } = await resolved.client.rpc("submit_customer_order_payment_v2", {
      p_token_hash: hashPaymentToken(token),
      p_idempotency_key: idempotencyKey,
      p_amount: amount,
      p_paid_at: paidAtDate.toISOString(),
      p_destination_method_id: paymentMethodId,
      p_sender_name: senderName,
      p_channel_name: channelName,
      p_reference_number: referenceNumber || null,
      p_customer_notes: customerNotes || null,
      p_proof_bucket: "payment-proofs",
      p_proof_path: uploadedPath,
      p_proof_file_name: proof.name,
      p_proof_mime_type: proof.type,
      p_proof_size_bytes: proof.size
    });
    if (error) throw new Error(error.message);
    const row = Array.isArray(data) ? data[0] : data;
    uploadedPath = null;
    logServerEvent("info", observability, "public_payment.submitted", {
      entityType: "payment",
      entityId: typeof row?.payment_number === "string"
        ? row.payment_number
        : null
    });
    return respond({ paymentNumber: row?.payment_number, status: "pending" }, 201);
  } catch (error) {
    if (uploadedPath) {
      const client = getAdminSupabaseClient();
      if (client) {
        const { error: cleanupError } = await client.storage
          .from("payment-proofs")
          .remove([uploadedPath]);
        if (cleanupError) {
          logServerError(observability, cleanupError, {
            event: "public_payment.cleanup_failed"
          });
        }
      }
    }
    return publicApiErrorResponse(error, "public payment submission", {
      code: "PAYMENT_SUBMISSION_FAILED",
      message: "Bukti pembayaran belum dapat dikirim. Data Anda tetap aman; coba lagi.",
      status: 400
    }, observability);
  }
}

function paymentResponse(
  context: ServerRequestContext,
  body: unknown,
  status = 200
) {
  return Response.json(body, {
    status,
    headers: observabilityResponseHeaders(context)
  });
}

async function hasValidFileSignature(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  if (file.type === "image/png") {
    return bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10]
      .every((value, index) => bytes[index] === value);
  }
  if (file.type === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  }
  if (file.type === "application/pdf") {
    return bytes.length >= 5 && String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-";
  }
  return false;
}
