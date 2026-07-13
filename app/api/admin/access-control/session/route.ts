import { phase13ErrorResponse, requirePhase13Actor } from "@/lib/phase13-auth";

export async function GET(request: Request) {
  try {
    const actor = await requirePhase13Actor(request);
    const { data, error } = await actor.adminClient
      .from("role_permissions")
      .select("permission_key,granted")
      .eq("role", actor.role)
      .eq("granted", true);
    if (error) throw new Error(error.message);
    return Response.json({
      role: actor.role,
      permissions: (data ?? []).map((row: { permission_key: string }) => row.permission_key)
    });
  } catch (error) {
    return phase13ErrorResponse(error);
  }
}
