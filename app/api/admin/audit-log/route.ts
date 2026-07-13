import { phase13ErrorResponse, requirePhase13Actor } from "@/lib/phase13-auth";

export async function GET(request: Request) {
  try {
    const actor = await requirePhase13Actor(request, "audit.read");
    const url = new URL(request.url);
    const limit = Math.min(150, Math.max(1, Number(url.searchParams.get("limit")) || 80));
    const entity = url.searchParams.get("entity")?.trim();
    const action = url.searchParams.get("action")?.trim();
    const actorRole = url.searchParams.get("actorRole")?.trim();
    const before = url.searchParams.get("before")?.trim();

    let query = actor.client
      .from("system_audit_log")
      .select("id,entity_type,entity_id,action,old_value,new_value,actor_id,actor_role,source,reason,request_id,metadata,created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (entity) query = query.eq("entity_type", entity);
    if (action) query = query.eq("action", action);
    if (actorRole) query = query.eq("actor_role", actorRole);
    if (before) query = query.lt("created_at", before);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return Response.json({ entries: data ?? [], actorRole: actor.role });
  } catch (error) {
    return phase13ErrorResponse(error);
  }
}
