import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

const ADMIN_ORDER_LIST_SELECT = [
  "id",
  "order_number",
  "customer_name",
  "company_name",
  "status",
  "pricing_status",
  "payment_status",
  "total_amount",
  "created_at",
  "updated_at",
  "fulfillments(status,created_at,archived_at)"
].join(",");

const ADMIN_ORDER_DETAIL_SELECT = [
  "id",
  "order_number",
  "quotation_id",
  "customer_name",
  "company_name",
  "customer_phone",
  "customer_email",
  "shipping_address",
  "delivery_method",
  "customer_notes",
  "admin_notes",
  "status",
  "pricing_status",
  "custom_quote_status",
  "custom_project_snapshot",
  "source_snapshot",
  "subtotal_amount",
  "total_amount",
  "payment_required_amount",
  "payment_effective_total",
  "payment_balance",
  "payment_method",
  "payment_status",
  "payment_production_eligible",
  "payment_requirement_met",
  "currency",
  "converted_at",
  "archived_at",
  "checkout_source",
  "whatsapp_confirmed_at",
  "created_at",
  "updated_at",
  "order_items(id,product_name,variant_name,color,size,sku,quantity,unit_price,subtotal,notes,config_snapshot,required_services,estimated_total,pricing_status,custom_project_id,custom_project_item_id,pricing_snapshot,created_at,archived_at)",
  "order_payments(id,payment_number,amount,verified_amount,status,review_outcome,updated_at,created_at,archived_at)",
  "fulfillments(id,method,status,courier,tracking_number,final_verified_at,updated_at,created_at,archived_at)",
  "job_orders(id,status,updated_at,created_at,archived_at,qc_records(id,status,result,updated_at,created_at,archived_at))"
].join(",");

export async function selectAdminOrderListGraph(client: SupabaseClient): Promise<unknown> {
  const { data, error } = await client
    .from("orders")
    .select(ADMIN_ORDER_LIST_SELECT)
    .is("archived_at", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Admin order list read failed: ${error.message}`);
  return data ?? [];
}

export async function selectAdminOrderDetailGraph(
  client: SupabaseClient,
  orderId: string
): Promise<unknown | null> {
  const { data, error } = await client
    .from("orders")
    .select(ADMIN_ORDER_DETAIL_SELECT)
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw new Error(`Admin order detail read failed: ${error.message}`);
  return data ?? null;
}
