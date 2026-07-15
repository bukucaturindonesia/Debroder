import { isAssignableAdminRole, validateRoleAssignment } from "@/lib/access-control";
import { phase13ErrorResponse, requirePhase13Actor } from "@/lib/phase13-auth";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePhase13Actor(request, "access_control.manage");
    const { id } = await context.params;
    const body = (await request.json()) as { role?: unknown };
    const errors = validateRoleAssignment(body.role);
    if (errors.length || !isAssignableAdminRole(body.role)) {
      return Response.json({ error: errors[0] || "Role tidak valid." }, { status: 400 });
    }
    if (id === actor.user.id && body.role !== "superadmin") {
      return Response.json({ error: "Super Admin tidak dapat menurunkan role akun sendiri." }, { status: 409 });
    }

    const { data: current, error: currentError } = await actor.adminClient
      .from("profiles")
      .select("id,email,role")
      .eq("id", id)
      .maybeSingle();
    if (currentError) throw new Error(currentError.message);
    if (!current) return Response.json({ error: "Profil tidak ditemukan." }, { status: 404 });

    if ((current.role === "superadmin" || current.role === "super_admin") && body.role !== current.role) {
      const { count, error: countError } = await actor.adminClient
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .in("role", ["superadmin", "super_admin"]);
      if (countError) throw new Error(countError.message);
      if ((count ?? 0) <= 1) {
        return Response.json({ error: "Role Super Admin terakhir tidak boleh diturunkan." }, { status: 409 });
      }
    }

    const { data, error } = await actor.client.rpc("update_profile_role", {
      p_profile_id: id,
      p_role: body.role
    });
    if (error) throw new Error(error.message);
    return Response.json({ profile: data });
  } catch (error) {
    return phase13ErrorResponse(error);
  }
}
