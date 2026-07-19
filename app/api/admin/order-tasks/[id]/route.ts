import { operationsErrorResponse, requireOperationsActor } from "@/lib/operations-auth";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await requireOperationsActor(request, "order.task.manage");
    const { id } = await context.params;
    const body = await request.json() as { action?: string; assignedTo?: string | null; reason?: string | null };
    if (!/^[0-9a-f-]{36}$/i.test(id) || !new Set(["acknowledge", "start", "block", "resolve", "cancel", "assign"]).has(body.action ?? "")) {
      return Response.json({ error: "Aksi tugas tidak valid." }, { status: 400 });
    }
    const { data, error } = await actor.client.rpc("update_order_task_v1", {
      p_task_id: id,
      p_action: body.action,
      p_assigned_to: body.assignedTo === "self" ? actor.user.id : body.assignedTo || null,
      p_reason: body.reason?.trim() || null
    });
    if (error) throw error;
    return Response.json({ task: data });
  } catch (error) {
    return operationsErrorResponse(error);
  }
}
