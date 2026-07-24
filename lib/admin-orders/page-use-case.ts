import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  selectAdminOrderDetailGraph,
  selectAdminOrderListGraph
} from "@/lib/admin-orders/data-access";
import {
  projectAdminOrderDetailReadModel,
  projectAdminOrderListReadModel
} from "@/lib/admin-orders/read-model";

export async function loadAdminOrderListPage(client: SupabaseClient) {
  return projectAdminOrderListReadModel(await selectAdminOrderListGraph(client));
}

export async function loadAdminOrderDetailPage(client: SupabaseClient, orderId: string) {
  return projectAdminOrderDetailReadModel(await selectAdminOrderDetailGraph(client, orderId));
}
