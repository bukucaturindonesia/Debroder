import { operationsErrorResponse, requireOperationsActor } from "@/lib/operations-auth";

export async function GET(request: Request) {
  try {
    const actor = await requireOperationsActor(request, "order.task.read");
    const url = new URL(request.url);
    const scope = url.searchParams.get("scope") ?? "active";
    const status = url.searchParams.get("status")?.trim();
    const priority = url.searchParams.get("priority")?.trim();
    const assigned = url.searchParams.get("assigned")?.trim();
    const search = (url.searchParams.get("search") ?? "").trim().replace(/[,%()]/g, " ").slice(0, 100);

    let query = actor.client
      .from("order_tasks")
      .select("id,task_key,order_id,task_type,status,priority,assigned_role,assigned_to,title,description,related_path,stage_snapshot,due_at,acknowledged_at,started_at,blocked_at,blocked_reason,resolved_at,resolution,escalated_at,created_at,updated_at,orders!inner(order_number,customer_name,status,payment_status,delivery_method)")
      .is("archived_at", null)
      .order("priority", { ascending: false })
      .order("due_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(250);

    if (scope === "active") query = query.in("status", ["open", "acknowledged", "in_progress", "blocked"]);
    if (scope === "resolved") query = query.in("status", ["resolved", "cancelled"]);
    if (status) query = query.eq("status", status);
    if (priority) query = query.eq("priority", priority);
    if (assigned === "me") query = query.eq("assigned_to", actor.user.id);
    if (assigned === "unassigned") query = query.is("assigned_to", null);
    if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);

    const [rows, activeCount, overdueCount, mineCount] = await Promise.all([
      query,
      actor.client.from("order_tasks").select("id", { count: "exact", head: true }).is("archived_at", null).in("status", ["open", "acknowledged", "in_progress", "blocked"]),
      actor.client.from("order_tasks").select("id", { count: "exact", head: true }).is("archived_at", null).in("status", ["open", "acknowledged", "in_progress", "blocked"]).lt("due_at", new Date().toISOString()),
      actor.client.from("order_tasks").select("id", { count: "exact", head: true }).is("archived_at", null).in("status", ["open", "acknowledged", "in_progress", "blocked"]).eq("assigned_to", actor.user.id)
    ]);
    const firstError = rows.error || activeCount.error || overdueCount.error || mineCount.error;
    if (firstError) throw firstError;

    return Response.json({
      tasks: rows.data ?? [],
      counts: { active: activeCount.count ?? 0, overdue: overdueCount.count ?? 0, mine: mineCount.count ?? 0 },
      role: actor.role,
      userId: actor.user.id
    }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    return operationsErrorResponse(error);
  }
}
