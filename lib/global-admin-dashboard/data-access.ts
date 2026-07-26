import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { DashboardRawData } from "@/lib/global-admin-dashboard/domain";

type DashboardModule = DashboardRawData["issues"][number]["module"];

async function runQuery(
  module: DashboardModule,
  query: PromiseLike<{ data: unknown; error: { message: string } | null }>,
  issues: DashboardRawData["issues"]
): Promise<unknown[]> {
  try {
    const { data, error } = await query;
    if (error) {
      issues.push({ module, message: `Data ${module} tidak tersedia.` });
      return [];
    }
    return Array.isArray(data) ? data : [];
  } catch {
    issues.push({ module, message: `Data ${module} tidak tersedia.` });
    return [];
  }
}

export async function selectGlobalAdminDashboardGraph(
  client: SupabaseClient,
  range: { start: string; end: string; storeId?: string | null }
): Promise<DashboardRawData> {
  const issues: DashboardRawData["issues"] = [];
  let storesQuery = client
    .from("stores")
    .select("id,nama_store,status_aktif,status,urutan")
    .order("urutan", { ascending: true });
  let locationsQuery = client
    .from("inventory_locations")
    .select("id,store_id,active")
    .eq("active", true);
  if (range.storeId) {
    storesQuery = storesQuery.eq("id", range.storeId);
    locationsQuery = locationsQuery.eq("store_id", range.storeId);
  }
  const [orders, stores, inventoryLocations, inventoryBalances, products] = await Promise.all([
    runQuery(
      "orders",
      client
        .from("orders")
        .select([
          "id",
          "order_number",
          "customer_name",
          "status",
          "total_amount",
          "payment_status",
          "pricing_status",
          "custom_quote_status",
          "custom_project_snapshot",
          "created_at",
          "updated_at",
          "archived_at",
          "order_items(id,quantity,sku,variant_size_id,custom_project_id,config_snapshot,pricing_snapshot,archived_at)"
        ].join(","))
        .gte("created_at", range.start)
        .lt("created_at", range.end)
        .order("created_at", { ascending: false })
        .limit(2000),
      issues
    ),
    runQuery(
      "stores",
      storesQuery,
      issues
    ),
    runQuery(
      "inventory",
      locationsQuery,
      issues
    ),
    runQuery(
      "inventory",
      client
        .from("inventory_balances")
        .select("location_id,variant_size_id,on_hand_quantity,reserved_quantity,available_quantity")
        .limit(10000),
      issues
    ),
    runQuery(
      "inventory",
      client
        .from("products")
        .select([
          "id",
          "sku",
          "image_url",
          "gambar_url",
          "gallery_urls",
          "base_price",
          "price",
          "harga",
          "status",
          "status_aktif",
          "updated_at",
          "product_variants(id,sku,is_active,status,product_variant_sizes(id,sku,is_active,status))"
        ].join(","))
        .limit(5000),
      issues
    )
  ]);

  const orderIds = orders
    .map((row) => row && typeof row === "object" ? String((row as { id?: unknown }).id ?? "") : "")
    .filter(Boolean);

  if (orderIds.length === 0) {
    return {
      orders,
      payments: [],
      refunds: [],
      assignments: [],
      stores,
      inventoryLocations,
      inventoryBalances,
      products,
      jobOrders: [],
      workItems: [],
      qualityControls: [],
      fulfillments: [],
      issues
    };
  }

  const [payments, refunds, assignments, jobOrders, fulfillments] = await Promise.all([
    runQuery(
      "payments",
      client
        .from("order_payments")
        .select("id,order_id,status,amount,verified_amount,verified_at,created_at,archived_at")
        .in("order_id", orderIds)
        .is("archived_at", null)
        .limit(5000),
      issues
    ),
    runQuery(
      "payments",
      client
        .from("refund_cases")
        .select("id,order_id,status,amount,sent_at,confirmed_at,created_at")
        .in("order_id", orderIds)
        .limit(2000),
      issues
    ),
    runQuery(
      "stores",
      client
        .from("order_store_assignments")
        .select("order_id,receiving_store_id,production_store_id,pickup_store_id")
        .in("order_id", orderIds),
      issues
    ),
    runQuery(
      "operations",
      client
        .from("job_orders")
        .select("id,order_id,status,target_date,archived_at")
        .in("order_id", orderIds)
        .limit(2000),
      issues
    ),
    runQuery(
      "operations",
      client
        .from("fulfillments")
        .select("id,order_id,method,status,final_verified_at,archived_at")
        .in("order_id", orderIds)
        .limit(2000),
      issues
    )
  ]);

  const jobOrderIds = jobOrders
    .map((row) => row && typeof row === "object" ? String((row as { id?: unknown }).id ?? "") : "")
    .filter(Boolean);
  const [workItems, qualityControls] = jobOrderIds.length
    ? await Promise.all([
        runQuery(
          "operations",
          client
            .from("work_items")
            .select("id,job_order_id,status,archived_at")
            .in("job_order_id", jobOrderIds)
            .limit(5000),
          issues
        ),
        runQuery(
          "operations",
          client
            .from("qc_records")
            .select("id,job_order_id,status,archived_at")
            .in("job_order_id", jobOrderIds)
            .limit(5000),
          issues
        )
      ])
    : [[], []];

  return {
    orders,
    payments,
    refunds,
    assignments,
    stores,
    inventoryLocations,
    inventoryBalances,
    products,
    jobOrders,
    workItems,
    qualityControls,
    fulfillments,
    issues
  };
}
