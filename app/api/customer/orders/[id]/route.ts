import {
  completeCustomerOrderTrackingPage,
  loadCustomerOrderTrackingProjection
} from "@/lib/customer-orders/page-use-case";
import { customerAuthErrorResponse, requireVerifiedCustomer } from "@/lib/customer-auth/server";
import { getAdminSupabaseClient } from "@/lib/supabase/admin";

type Context = { params: Promise<{ id: string }> };
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: Context) {
  try {
    const customer = await requireVerifiedCustomer(request);
    const { id } = await context.params;
    const candidate = decodeURIComponent(id).trim();
    if (!candidate || candidate.length > 100) {
      return Response.json({ code: "CUSTOMER_ORDER_INVALID", error: "Pesanan tidak valid." }, { status: 400 });
    }
    const client = getAdminSupabaseClient();
    if (!client) return Response.json({ code: "CUSTOMER_ORDER_UNAVAILABLE", error: "Pesanan belum tersedia." }, { status: 503 });
    let query = client
      .from("orders")
      .select("id,order_number")
      .eq("customer_user_id", customer.user.id)
      .is("archived_at", null);
    query = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(candidate)
      ? query.eq("id", candidate)
      : query.eq("order_number", candidate);
    const { data: owned, error: ownedError } = await query.maybeSingle();
    if (ownedError) throw new Error(ownedError.message);
    if (!owned) return Response.json({ code: "CUSTOMER_ORDER_NOT_FOUND", error: "Pesanan tidak ditemukan." }, { status: 404 });
    const projection = await loadCustomerOrderTrackingProjection(client, owned.order_number);
    if (!projection) return Response.json({ code: "CUSTOMER_ORDER_NOT_FOUND", error: "Pesanan tidak ditemukan." }, { status: 404 });
    const readModel = await completeCustomerOrderTrackingPage(client, projection);
    return Response.json(readModel, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    return customerAuthErrorResponse(error);
  }
}
