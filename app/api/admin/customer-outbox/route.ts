import { operationsErrorResponse, requireOperationsActor } from "@/lib/operations-auth";

export async function GET(request: Request) {
  try {
    const actor = await requireOperationsActor(request, "customer.outbox.read");
    const url = new URL(request.url);
    const status = url.searchParams.get("status")?.trim();
    let query = actor.client.from("customer_notification_outbox")
      .select("id,event_key,order_id,event_type,channel,recipient,template_code,payload,prepared_content,status,attempt_count,next_attempt_at,prepared_at,sent_at,failed_at,last_error,related_path,created_at,updated_at,orders(order_number,customer_name,status)")
      .order("created_at", { ascending: false }).limit(250);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) throw error;
    return Response.json({ outbox: data ?? [], role: actor.role }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    return operationsErrorResponse(error);
  }
}
