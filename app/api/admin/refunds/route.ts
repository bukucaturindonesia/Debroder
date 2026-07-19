import { operationsErrorResponse, requireOperationsActor } from "@/lib/operations-auth";

export async function GET(request: Request) {
  try {
    const actor = await requireOperationsActor(request, "refund.read");
    const [requests, cases] = await Promise.all([
      actor.client.from("order_cancellation_requests").select("id,order_id,request_key,reason,status,requires_refund,verified_amount_snapshot,requested_at,decided_at,decision_reason,orders(order_number,customer_name,status,payment_status,total_amount)").order("created_at", { ascending: false }).limit(200),
      actor.client.from("refund_cases").select("id,refund_number,cancellation_request_id,order_id,amount,status,destination_name,destination_account,destination_bank,approved_at,sent_at,confirmed_at,failed_reason,notes,orders(order_number,customer_name),refund_allocations(id,source_payment_id,amount,adjustment_id),refund_evidence(id,bucket,object_path,file_name,mime_type,size_bytes,transfer_reference,transferred_at,created_at)").order("created_at", { ascending: false }).limit(200)
    ]);
    const firstError = requests.error || cases.error;
    if (firstError) throw firstError;
    return Response.json({ requests: requests.data ?? [], refunds: cases.data ?? [], role: actor.role }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    return operationsErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireOperationsActor(request, "refund.manage");
    const body = await request.json() as { action?: string; requestId?: string; approve?: boolean; reason?: string };
    if (body.action !== "decide_cancellation" || !body.requestId) {
      return Response.json({ error: "Aksi refund tidak valid." }, { status: 400 });
    }
    const { data, error } = await actor.client.rpc("decide_order_cancellation_v1", {
      p_request_id: body.requestId,
      p_approve: body.approve === true,
      p_reason: body.reason?.trim() || "Keputusan Admin"
    });
    if (error) throw error;
    return Response.json({ ok: true, result: data });
  } catch (error) {
    return operationsErrorResponse(error);
  }
}
