import {
  isAccountStatus,
  isAssignableAdminRole,
  isAssignableOperationalAdminRole,
  validateOperationalRoleAssignment,
  validateRoleAssignment
} from "@/lib/access-control";
import { phase13ErrorResponse, requirePhase13Actor } from "@/lib/phase13-auth";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePhase13Actor(request, "access_control.manage");
    const { id } = await context.params;
    const body = (await request.json()) as {
      role?: unknown;
      accountStatus?: unknown;
      primaryStoreId?: unknown;
      allStoreAccess?: unknown;
      reason?: unknown;
    };

    const isLegacyRoleOnlyRequest = body.accountStatus === undefined &&
      body.primaryStoreId === undefined &&
      body.allStoreAccess === undefined &&
      body.reason === undefined;

    if (isLegacyRoleOnlyRequest) {
      return updateLegacyRole(actor, id, body.role);
    }

    return updateOperationalAccount(actor, id, body);
  } catch (error) {
    return phase13ErrorResponse(error, request);
  }
}

async function updateLegacyRole(
  actor: Awaited<ReturnType<typeof requirePhase13Actor>>,
  id: string,
  role: unknown
) {
  const errors = validateRoleAssignment(role);
  if (errors.length || !isAssignableAdminRole(role)) {
    return Response.json({ error: errors[0] || "Role tidak valid." }, { status: 400 });
  }
  if (id === actor.user.id && role !== "superadmin") {
    return Response.json(
      { error: "Super Admin tidak dapat menurunkan role akun sendiri." },
      { status: 409 }
    );
  }

  const { data: current, error: currentError } = await actor.adminClient
    .from("profiles")
    .select("id,email,role")
    .eq("id", id)
    .maybeSingle();
  if (currentError) throw new Error(currentError.message);
  if (!current) return Response.json({ error: "Profil tidak ditemukan." }, { status: 404 });

  if ((current.role === "superadmin" || current.role === "super_admin") && role !== current.role) {
    const { count, error: countError } = await actor.adminClient
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .in("role", ["superadmin", "super_admin"]);
    if (countError) throw new Error(countError.message);
    if ((count ?? 0) <= 1) {
      return Response.json(
        { error: "Role Super Admin terakhir tidak boleh diturunkan." },
        { status: 409 }
      );
    }
  }

  const { data, error } = await actor.client.rpc("update_profile_role", {
    p_profile_id: id,
    p_role: role
  });
  if (error) throw new Error(error.message);
  return Response.json(
    { profile: data },
    { headers: { "cache-control": "private, no-store" } }
  );
}

async function updateOperationalAccount(
  actor: Awaited<ReturnType<typeof requirePhase13Actor>>,
  id: string,
  body: {
    role?: unknown;
    accountStatus?: unknown;
    primaryStoreId?: unknown;
    allStoreAccess?: unknown;
    reason?: unknown;
  }
) {
  const errors = validateOperationalRoleAssignment(body.role);
  if (errors.length || !isAssignableOperationalAdminRole(body.role)) {
    return Response.json({ error: errors[0] || "Role tidak valid." }, { status: 400 });
  }
  if (!isAccountStatus(body.accountStatus)) {
    return Response.json({ error: "Status akun tidak valid." }, { status: 400 });
  }
  if (
    body.primaryStoreId !== null &&
    body.primaryStoreId !== undefined &&
    typeof body.primaryStoreId !== "string"
  ) {
    return Response.json({ error: "Store utama tidak valid." }, { status: 400 });
  }
  if (typeof body.allStoreAccess !== "boolean") {
    return Response.json({ error: "Scope seluruh store tidak valid." }, { status: 400 });
  }
  if (typeof body.reason !== "string" || body.reason.trim().length < 8) {
    return Response.json({ error: "Alasan perubahan minimal 8 karakter." }, { status: 400 });
  }

  const { data: target, error: targetError } = await actor.adminClient
    .from("profiles")
    .select("id,email,role")
    .eq("id", id)
    .maybeSingle();
  if (targetError) throw new Error(targetError.message);
  if (!target) return Response.json({ error: "Profil tidak ditemukan." }, { status: 404 });

  const email = typeof target.email === "string" ? target.email.toLowerCase() : "";
  const protectedRole = target.role === "owner" ||
    target.role === "superadmin" ||
    target.role === "super_admin";
  if (email === "fahmi@debroder.com" || protectedRole) {
    return Response.json({ error: "Akun Owner atau Super Admin dilindungi." }, { status: 409 });
  }

  const { data, error } = await actor.client.rpc("update_admin_account_access_v1", {
    p_profile_id: id,
    p_role: body.role,
    p_account_status: body.accountStatus,
    p_primary_store_id: body.primaryStoreId ?? null,
    p_all_store_access: body.allStoreAccess,
    p_reason: body.reason.trim()
  });
  if (error) throw new Error(error.message);
  return Response.json(
    { profile: data },
    { headers: { "cache-control": "private, no-store" } }
  );
}
