import { randomUUID } from "node:crypto";
import { hashPaymentToken } from "@/lib/payments";
import { getAdminSupabaseClient } from "@/lib/supabase/client";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "application/pdf"]);
const MAX_BYTES = 5 * 1024 * 1024;
type Context = { params: Promise<{ token: string }> };

async function resolveLink(token: string) {
  const client = getAdminSupabaseClient();
  if (!client) throw new Error("Layanan pembayaran belum dikonfigurasi.");
  const { data: link } = await client.from("payment_submission_links")
    .select("id,order_id,expires_at,max_uses,used_count,revoked_at,archived_at")
    .eq("token_hash", hashPaymentToken(token)).maybeSingle();
  if (!link || link.revoked_at || link.archived_at || new Date(link.expires_at).getTime() <= Date.now() || link.used_count >= link.max_uses) return null;
  return { client, link };
}

export async function GET(_request: Request, context: Context) {
  try {
    const { token } = await context.params;
    const resolved = await resolveLink(token);
    if (!resolved) return Response.json({ error: "Tautan pembayaran tidak aktif atau sudah kedaluwarsa." }, { status: 404 });
    const { data: order, error } = await resolved.client.from("orders")
      .select("order_number,total_amount,payment_effective_total,payment_balance,payment_required_amount,payment_requirement_met,currency,pricing_status")
      .eq("id", resolved.link.order_id).is("archived_at", null).maybeSingle();
    if (error || !order) return Response.json({ error: "Pesanan tidak tersedia." }, { status: 404 });
    if (order.pricing_status !== "final" || Number(order.total_amount) <= 0) {
      return Response.json({ code: "PAYMENT_PRICING_NOT_FINAL", error: "Pembayaran belum tersedia sampai harga order ditetapkan final." }, { status: 409 });
    }
    return Response.json({
      orderNumber: order.order_number, currency: order.currency,
      totalAmount: Number(order.total_amount), effectivePaid: Number(order.payment_effective_total),
      outstandingBalance: Number(order.payment_balance), requiredAmount: Number(order.payment_required_amount),
      requirementMet: Boolean(order.payment_requirement_met), expiresAt: resolved.link.expires_at,
      remainingUses: resolved.link.max_uses - resolved.link.used_count
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Data pembayaran gagal dimuat." }, { status: 500 });
  }
}

export async function POST(request: Request, context: Context) {
  let uploaded: { bucket: string; path: string } | null = null;
  try {
    const { token } = await context.params;
    const resolved = await resolveLink(token);
    if (!resolved) return Response.json({ error: "Tautan pembayaran tidak aktif atau sudah kedaluwarsa." }, { status: 404 });
    const { data: payableOrder, error: payableOrderError } = await resolved.client.from("orders")
      .select("pricing_status,total_amount")
      .eq("id", resolved.link.order_id)
      .is("archived_at", null)
      .maybeSingle();
    if (payableOrderError || !payableOrder) return Response.json({ error: "Pesanan tidak tersedia." }, { status: 404 });
    if (payableOrder.pricing_status !== "final" || Number(payableOrder.total_amount) <= 0) {
      return Response.json({ code: "PAYMENT_PRICING_NOT_FINAL", error: "Pembayaran diblokir sampai harga order ditetapkan final." }, { status: 409 });
    }
    const form = await request.formData();
    const amount = Math.round(Number(form.get("amount")));
    const paidAt = String(form.get("paidAt") ?? "");
    const method = String(form.get("method") ?? "");
    const channelName = String(form.get("channelName") ?? "").trim();
    const senderName = String(form.get("senderName") ?? "").trim();
    const referenceNumber = String(form.get("referenceNumber") ?? "").trim();
    const customerNotes = String(form.get("customerNotes") ?? "").trim();
    const idempotencyKey = String(form.get("idempotencyKey") ?? "").trim();
    const proof = form.get("proof");
    if (!Number.isSafeInteger(amount) || amount <= 0) return Response.json({ error: "Nominal pembayaran tidak valid." }, { status: 400 });
    if (!paidAt || Number.isNaN(new Date(paidAt).getTime())) return Response.json({ error: "Tanggal pembayaran tidak valid." }, { status: 400 });
    if (!/^[a-zA-Z0-9_-]{16,100}$/.test(idempotencyKey)) return Response.json({ error: "Kunci pengiriman tidak valid." }, { status: 400 });
    if (method !== "bank_transfer" || senderName.length < 2 || senderName.length > 150) return Response.json({ error: "Nama pengirim dan metode transfer bank wajib diisi." }, { status: 400 });
    if (!(proof instanceof File) || proof.size <= 0 || proof.size > MAX_BYTES || !ALLOWED_TYPES.has(proof.type)) {
      return Response.json({ error: "Bukti wajib PNG, JPG, atau PDF maksimal 5 MB." }, { status: 400 });
    }
    const extension = proof.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "file";
    const path = `public/${resolved.link.order_id}/${randomUUID()}.${extension}`;
    const { error: uploadError } = await resolved.client.storage.from("payment-proofs").upload(path, proof, {
      upsert: false, contentType: proof.type, cacheControl: "3600"
    });
    if (uploadError) throw new Error(`Bukti gagal diunggah: ${uploadError.message}`);
    uploaded = { bucket: "payment-proofs", path };
    const { data, error } = await resolved.client.rpc("submit_customer_order_payment", {
      p_token_hash: hashPaymentToken(token), p_idempotency_key: idempotencyKey,
      p_amount: amount, p_paid_at: new Date(paidAt).toISOString(), p_method: method,
      p_channel_name: channelName || null, p_reference_number: referenceNumber || null,
      p_customer_notes: [`Nama pengirim: ${senderName}`, customerNotes].filter(Boolean).join("\n"), p_proof_bucket: uploaded.bucket,
      p_proof_path: uploaded.path, p_proof_file_name: proof.name,
      p_proof_mime_type: proof.type, p_proof_size_bytes: proof.size
    });
    if (error) throw new Error(error.message);
    const row = Array.isArray(data) ? data[0] : data;
    return Response.json({ paymentNumber: row?.payment_number, status: "pending" }, { status: 201 });
  } catch (error) {
    if (uploaded) {
      const client = getAdminSupabaseClient();
      if (client) await client.storage.from(uploaded.bucket).remove([uploaded.path]);
    }
    return Response.json({ error: error instanceof Error ? error.message : "Pembayaran gagal dikirim." }, { status: 400 });
  }
}
