import { phase13ErrorResponse, requirePhase13Actor } from "@/lib/phase13-auth";

export async function GET(request: Request) {
  try {
    const actor = await requirePhase13Actor(request, "access_control.read");
    const [profiles, definitions, matrix, stores] = await Promise.all([
      actor.adminClient
        .from("profiles")
        .select("id,email,display_name,role,account_status,primary_store_id,all_store_access,active_session_id,session_version,activated_at,suspended_at,inactive_at,locked_at,lifecycle_reason,created_at,updated_at")
        .order("email"),
      actor.adminClient
        .from("permission_definitions")
        .select("permission_key,module,label,description")
        .order("module")
        .order("permission_key"),
      actor.adminClient
        .from("role_permissions")
        .select("role,permission_key,granted,updated_by,updated_at")
        .order("role")
        .order("permission_key"),
      actor.adminClient
        .from("stores")
        .select("id,nama_store")
        .eq("status_aktif", true)
        .order("urutan")
    ]);

    const firstError = profiles.error || definitions.error || matrix.error || stores.error;
    if (firstError) throw new Error(firstError.message);

    return Response.json({
      profiles: profiles.data ?? [],
      definitions: definitions.data ?? [],
      rolePermissions: matrix.data ?? [],
      stores: stores.data ?? [],
      actorRole: actor.role
    }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    return phase13ErrorResponse(error, request);
  }
}
