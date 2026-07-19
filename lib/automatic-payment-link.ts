import { createHmac, randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminSupabaseEnv, getSiteUrl } from "@/lib/env";
import { hashPaymentToken } from "@/lib/payment-token";

export type AutomaticPaymentOrder = {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  pricing_status: string | null;
  total_amount: number;
  whatsapp_confirmed_at: string | null;
  archived_at?: string | null;
};

const TERMINAL_ORDER_STATUSES = new Set(["cancelled", "dibatalkan", "expired", "completed", "selesai"]);
const PAID_STATUSES = new Set(["paid", "terverifikasi", "refunded"]);

export function automaticPaymentBlocker(order: AutomaticPaymentOrder): string | null {
  if (order.archived_at || TERMINAL_ORDER_STATUSES.has(order.status)) return "Pesanan tidak aktif.";
  if (!order.whatsapp_confirmed_at) return "Menunggu verifikasi pelanggan.";
  if (order.pricing_status !== "final" || Number(order.total_amount) <= 0) return "Menunggu penetapan harga final.";
  if (PAID_STATUSES.has(order.payment_status)) return "Pembayaran pesanan sudah selesai.";
  return null;
}

export function deriveAutomaticPaymentToken(orderId: string, linkId: string, secret: string) {
  return createHmac("sha256", secret)
    .update(`debroder:automatic-payment-link:${orderId}:${linkId}`)
    .digest("base64url");
}

export async function ensureAutomaticPaymentLink(
  client: SupabaseClient,
  order: AutomaticPaymentOrder,
  options: { rotate?: boolean; actorId?: string | null; reason?: string | null } = {}
) {
  const blocker = automaticPaymentBlocker(order);
  if (blocker) return { blocker, publicUrl: null, link: null };

  const env = getAdminSupabaseEnv();
  if (!env) throw new Error("Layanan pembayaran belum dikonfigurasi.");
  const now = new Date();
  const nowIso = now.toISOString();

  const [{ data: candidates, error: candidateError }, { data: activeMethods, error: methodError }] = await Promise.all([
    client.from("payment_submission_links")
      .select("id,expires_at,max_uses,used_count,revoked_at,archived_at,created_by")
      .eq("order_id", order.id)
      .order("created_at", { ascending: false }),
    client.from("payment_method_settings")
      .select("expires_in_hours")
      .eq("is_active", true)
      .is("archived_at", null)
      .order("sort_order")
  ]);
  if (candidateError) throw new Error(candidateError.message);
  if (methodError) throw new Error(methodError.message);
  if (!activeMethods?.length) return { blocker: "Metode pembayaran belum diaktifkan.", publicUrl: null, link: null };

  const active = (candidates ?? []).find((link) =>
    !link.created_by && !link.revoked_at && !link.archived_at && new Date(link.expires_at).getTime() > now.getTime() && Number(link.used_count) < Number(link.max_uses)
  );

  if (active && !options.rotate) {
    const token = deriveAutomaticPaymentToken(order.id, active.id, env.serviceRoleKey);
    return { blocker: null, publicUrl: `${getSiteUrl()}/payment/${token}`, link: active };
  }

  if (options.rotate && !options.reason?.trim()) throw new Error("Alasan terbitkan ulang wajib diisi.");

  const staleIds = (candidates ?? [])
    .filter((link) => !link.revoked_at && !link.archived_at)
    .map((link) => link.id);
  if (staleIds.length) {
    const { error } = await client.from("payment_submission_links").update({
      revoked_at: nowIso,
      revoked_by: options.actorId ?? null,
      revoke_reason: options.reason?.trim() || "Diganti otomatis oleh sistem"
    }).in("id", staleIds);
    if (error) throw new Error(error.message);
  }

  const linkId = randomUUID();
  const token = deriveAutomaticPaymentToken(order.id, linkId, env.serviceRoleKey);
  const expiryHours = Math.min(...activeMethods.map((method) => Number(method.expires_in_hours || 24)));
  const expiresAt = new Date(now.getTime() + expiryHours * 3_600_000).toISOString();
  const { data: created, error: createError } = await client.from("payment_submission_links").insert({
    id: linkId,
    order_id: order.id,
    token_hash: hashPaymentToken(token),
    expires_at: expiresAt,
    max_uses: 20,
    created_by: null
  }).select("id,expires_at,max_uses,used_count,revoked_at,archived_at,created_by").single();
  if (createError) {
    const { data: winner } = await client.from("payment_submission_links")
      .select("id,expires_at,max_uses,used_count,revoked_at,archived_at,created_by")
      .eq("order_id", order.id).is("created_by", null).is("revoked_at", null).is("archived_at", null)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!winner) throw new Error(createError.message);
    const winnerToken = deriveAutomaticPaymentToken(order.id, winner.id, env.serviceRoleKey);
    return { blocker: null, publicUrl: `${getSiteUrl()}/payment/${winnerToken}`, link: winner };
  }

  await client.from("system_audit_log").insert({
    entity_type: "order",
    entity_id: order.id,
    action: options.rotate ? "automatic_payment_link_reissued" : "automatic_payment_link_activated",
    actor_id: options.actorId ?? null,
    actor_role: options.actorId ? "staff" : "system",
    source: "automatic_payment_link",
    reason: options.reason?.trim() || null,
    new_value: { link_id: created.id, expires_at: created.expires_at }
  });

  return { blocker: null, publicUrl: `${getSiteUrl()}/payment/${token}`, link: created };
}
