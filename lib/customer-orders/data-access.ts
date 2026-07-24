import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

const CUSTOMER_ORDER_GRAPH_SELECT = [
  "id",
  "order_number",
  "customer_name",
  "customer_phone",
  "status",
  "payment_status",
  "delivery_method",
  "payment_method",
  "shipping_address",
  "subtotal_amount",
  "shipping_cost",
  "shipping_courier",
  "shipping_service",
  "shipping_estimate",
  "total_amount",
  "payment_effective_total",
  "payment_balance",
  "payment_requirement_met",
  "payment_production_eligible",
  "public_access_token_hash",
  "public_access_token_expires_at",
  "whatsapp_confirmation_expires_at",
  "whatsapp_confirmed_at",
  "reservation_expires_at",
  "final_total_approved_at",
  "pricing_status",
  "custom_project_snapshot",
  "custom_quote_version",
  "custom_quote_status",
  "custom_quote_locked_at",
  "custom_quote_locked_total",
  "created_at",
  "updated_at",
  "archived_at",
  "order_items(id,product_name,variant_name,color,size,sku,quantity,unit_price,subtotal,custom_project_id,pricing_status,created_at,updated_at,archived_at)",
  "stock_reservations(id,status,quantity,expires_at,created_at,updated_at)",
  "order_shipping_quotes(id,version,courier,service,cost,estimate,total_snapshot,status,created_at,approved_at)",
  "custom_order_quotation_versions(id,version_number,status,quoted_total,pricing_components,design_version_snapshot,valid_until,sent_at,locked_at,created_at)",
  "fulfillments(id,method,status,courier,tracking_number,scheduled_at,ready_at,shipped_at,delivered_at,picked_up_at,final_verified_at,created_at,updated_at,archived_at)",
  "order_payments(id,status,review_outcome,amount,verified_amount,created_at,updated_at,archived_at)",
  "pickup_preparations(id,status,ready_at,pickup_deadline,extension_requested_at,requested_deadline,expired_at,created_at,updated_at)",
  "order_cancellation_requests(id,status,reason,requires_refund,requested_at,decision_reason,created_at,updated_at)",
  "refund_cases(id,refund_number,status,amount,sent_at,confirmed_at,created_at,updated_at)",
  "job_orders(id,status,created_at,updated_at,archived_at,qc_records(id,status,result,created_at,updated_at,archived_at))"
].join(",");

export async function selectCustomerOrderGraphByTokenHash(
  client: SupabaseClient,
  accessTokenHash: string
): Promise<unknown | null> {
  const { data, error } = await client
    .from("orders")
    .select(CUSTOMER_ORDER_GRAPH_SELECT)
    .eq("public_access_token_hash", accessTokenHash)
    .is("archived_at", null)
    .maybeSingle();
  if (error) throw new Error(`Customer order token read failed: ${error.message}`);
  return data ?? null;
}

export async function selectCustomerOrderGraphByOrderNumber(
  client: SupabaseClient,
  orderNumber: string
): Promise<unknown | null> {
  const { data, error } = await client
    .from("orders")
    .select(CUSTOMER_ORDER_GRAPH_SELECT)
    .eq("order_number", orderNumber)
    .is("archived_at", null)
    .maybeSingle();
  if (error) throw new Error(`Customer order tracking read failed: ${error.message}`);
  return data ?? null;
}

