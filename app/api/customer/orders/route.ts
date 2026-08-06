import { customerAuthErrorResponse, requireVerifiedCustomer } from "@/lib/customer-auth/server";
import { getAdminSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const customer = await requireVerifiedCustomer(request);
    const client = getAdminSupabaseClient();
    if (!client) return Response.json({ code: "CUSTOMER_ORDER_UNAVAILABLE", error: "Riwayat pesanan belum tersedia." }, { status: 503 });
    const { data, error } = await client
      .from("orders")
      .select("id,order_number,status,payment_status,delivery_method,total_amount,created_at,updated_at")
      .eq("customer_user_id", customer.user.id)
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return Response.json({
      orders: (data ?? []).map((row) => ({
        id: row.id,
        orderNumber: row.order_number,
        status: row.status,
        paymentStatus: row.payment_status,
        fulfillmentMethod: row.delivery_method,
        total: Number(row.total_amount ?? 0),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))
    }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    return customerAuthErrorResponse(error);
  }
}
