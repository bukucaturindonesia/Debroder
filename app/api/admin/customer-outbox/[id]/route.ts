import { operationsErrorResponse, requireOperationsActor } from "@/lib/operations-auth";
type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await requireOperationsActor(request, "customer.outbox.manage");
    const { id } = await context.params;
    const body = await request.json() as { action?: string; content?: string; error?: string };
    if (!new Set(["prepare", "sent", "failed", "retry", "cancel"]).has(body.action ?? "")) {
      return Response.json({ error: "Aksi outbox tidak valid." }, { status: 400 });
    }
    const { data, error } = await actor.client.rpc("update_customer_outbox_v1", {
      p_outbox_id: id,
      p_action: body.action,
      p_content: body.content?.trim() || null,
      p_error: body.error?.trim() || null
    });
    if (error) throw error;
    return Response.json({ outbox: data });
  } catch (error) {
    return operationsErrorResponse(error);
  }
}
