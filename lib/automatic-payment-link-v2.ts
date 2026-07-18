import type { SupabaseClient } from "@supabase/supabase-js";
import {
  deriveAutomaticPaymentToken,
  ensureAutomaticPaymentLink as ensureBaselineAutomaticPaymentLink,
  type AutomaticPaymentOrder as BaselineAutomaticPaymentOrder
} from "./automatic-payment-link";

export { deriveAutomaticPaymentToken };

export type AutomaticPaymentOrder = BaselineAutomaticPaymentOrder & {
  custom_project_snapshot?: unknown;
  custom_quote_status?: string | null;
  custom_quote_locked_at?: string | null;
  custom_quote_locked_total?: number | null;
};

const TERMINAL_ORDER_STATUSES = new Set(["cancelled", "dibatalkan", "expired", "completed", "selesai"]);
const PAID_STATUSES = new Set(["paid", "terverifikasi", "refunded"]);

export function automaticPaymentBlocker(order: AutomaticPaymentOrder): string | null {
  if (order.archived_at || TERMINAL_ORDER_STATUSES.has(order.status)) return "Pesanan tidak aktif.";
  if (!order.whatsapp_confirmed_at) return "Menunggu verifikasi pelanggan.";
  if (order.pricing_status !== "final" || Number(order.total_amount) <= 0) return "Menunggu penetapan harga final.";
  if (isCustomOrder(order) && (
    order.custom_quote_status !== "locked"
    || !order.custom_quote_locked_at
    || Number(order.custom_quote_locked_total) !== Number(order.total_amount)
  )) return "Menunggu persetujuan penawaran Custom dan penguncian harga.";
  if (PAID_STATUSES.has(order.payment_status)) return "Pembayaran pesanan sudah selesai.";
  return null;
}

export async function ensureAutomaticPaymentLink(
  client: SupabaseClient,
  inputOrder: AutomaticPaymentOrder,
  options: { rotate?: boolean; actorId?: string | null; reason?: string | null } = {}
) {
  let order = inputOrder;
  if (typeof order.custom_project_snapshot === "undefined") {
    const { data, error } = await client.from("orders")
      .select("custom_project_snapshot,custom_quote_status,custom_quote_locked_at,custom_quote_locked_total")
      .eq("id", order.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    order = { ...order, ...(data ?? {}) } as AutomaticPaymentOrder;
  }
  const blocker = automaticPaymentBlocker(order);
  if (blocker) return { blocker, publicUrl: null, link: null };
  return ensureBaselineAutomaticPaymentLink(client, order, options);
}

function isCustomOrder(order: AutomaticPaymentOrder) {
  return Array.isArray(order.custom_project_snapshot) && order.custom_project_snapshot.length > 0;
}
