import { phase13ErrorResponse, requirePhase13Actor } from "@/lib/phase13-auth";

export async function GET(request: Request) {
  try {
    const actor = await requirePhase13Actor(request, "access_control.read");
    const [profiles, definitions, matrix] = await Promise.all([
      actor.adminClient.from("profiles").select("id,email,role,created_at,updated_at").order("email"),
      actor.adminClient.from("permission_definitions").select("permission_key,module,label,description").order("module").order("permission_key"),
      actor.adminClient.from("role_permissions").select("role,permission_key,granted,updated_by,updated_at").order("role").order("permission_key")
    ]);
    const firstError = profiles.error || definitions.error || matrix.error;
    if (firstError) throw new Error(firstError.message);
    return Response.json({
      profiles: profiles.data ?? [],
      definitions: definitions.data ?? [],
      rolePermissions: matrix.data ?? [],
      actorRole: actor.role
    });
  } catch (error) {
    return phase13ErrorResponse(error);
  }
}
