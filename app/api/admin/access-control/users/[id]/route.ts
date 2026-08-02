import {
  AdminAccountConflict,
  adminAccountAccessSchema,
  assertSafeAccountTarget,
  invitationStatus
} from "@/lib/admin-account-management";
import { phase13ErrorResponse, requirePhase13Actor } from "@/lib/phase13-auth";

const PROFILE_FIELDS = "id,email,role,display_name,account_status,primary_store_id,all_store_access,active_session_id,session_version,last_login_at,password_changed_at,activated_at,suspended_at,inactive_at,locked_at,lifecycle_reason,created_at,updated_at";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePhase13Actor(request, "access_control.read");
    const { id } = await context.params;
    const [profile, authUser, permissions, activity, stores] = await Promise.all([
      actor.adminClient.from("profiles").select(PROFILE_FIELDS).eq("id", id).maybeSingle(),
      actor.adminClient.auth.admin.getUserById(id),
      actor.adminClient.from("role_permissions").select("permission_key,granted").eq("role", "__pending__"),
      actor.adminClient.from("system_audit_log").select("id,action,old_value,new_value,actor_id,actor_role,source,reason,request_id,metadata,created_at").eq("entity_type", "admin_profile").eq("entity_id", id).order("created_at", { ascending: false }).limit(100),
      actor.adminClient.from("stores").select("id,nama_store,status_aktif").order("nama_store")
    ]);
    if (profile.error || activity.error || stores.error) throw new Error(profile.error?.message || activity.error?.message || stores.error?.message);
    if (!profile.data && authUser.error) return Response.json({ error: "Akun Admin tidak ditemukan." }, { status: 404 });

    const permissionRole = profile.data?.role === "super_admin" ? "superadmin" : profile.data?.role;
    const rolePermissions = permissionRole
      ? await actor.adminClient.from("role_permissions").select("permission_key,granted").eq("role", permissionRole).eq("granted", true)
      : permissions;
    if (rolePermissions.error) throw new Error(rolePermissions.error.message);

    const user = authUser.data?.user ?? null;
    return Response.json({
      account: profile.data ? {
        ...profile.data,
        invitation_status: invitationStatus({
          authExists: Boolean(user),
          profileExists: true,
          invitedAt: user?.invited_at ?? null,
          confirmedAt: user?.email_confirmed_at ?? null,
          accountStatus: profile.data.account_status
        }),
        auth_state: user ? "linked" : "missing_auth",
        auth_created_at: user?.created_at ?? null,
        invited_at: user?.invited_at ?? null,
        confirmed_at: user?.email_confirmed_at ?? null,
        last_auth_activity_at: user?.last_sign_in_at ?? null
      } : {
        id,
        email: user?.email ?? null,
        display_name: user?.email ?? "Auth tanpa Profil",
        role: "",
        account_status: "INACTIVE",
        primary_store_id: null,
        all_store_access: false,
        invitation_status: "Auth tanpa Profil",
        auth_state: "missing_profile",
        auth_created_at: user?.created_at ?? null,
        invited_at: user?.invited_at ?? null,
        confirmed_at: user?.email_confirmed_at ?? null,
        last_auth_activity_at: user?.last_sign_in_at ?? null,
        created_at: user?.created_at ?? null,
        updated_at: user?.updated_at ?? null,
        last_login_at: user?.last_sign_in_at ?? null
      },
      permissions: (rolePermissions.data ?? []).map((row) => row.permission_key),
      activity: activity.data ?? [],
      stores: stores.data ?? [],
      activeSessionPresent: Boolean(profile.data?.active_session_id)
    }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    return phase13ErrorResponse(error, request);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePhase13Actor(request, "access_control.manage");
    const { id } = await context.params;
    const parsed = adminAccountAccessSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0]?.message || "Perubahan akses tidak valid." }, { status: 400 });
    }

    const [current, ownerCount] = await Promise.all([
      actor.adminClient.from("profiles").select("id,email,role,account_status,primary_store_id,all_store_access").eq("id", id).maybeSingle(),
      actor.adminClient.from("profiles").select("id", { count: "exact", head: true }).eq("role", "owner").in("account_status", ["TESTING", "ACTIVE"])
    ]);
    if (current.error || ownerCount.error) throw new Error(current.error?.message || ownerCount.error?.message);
    if (!current.data) return Response.json({ error: "Profil tidak ditemukan." }, { status: 404 });

    assertSafeAccountTarget({
      actorId: actor.user.id,
      targetId: id,
      currentRole: current.data.role,
      nextRole: parsed.data.role,
      nextStatus: parsed.data.accountStatus,
      activeOwnerCount: ownerCount.count ?? 0
    });

    const { data, error } = await actor.client.rpc("update_admin_account_access_v1", {
      p_profile_id: id,
      p_role: parsed.data.role,
      p_account_status: parsed.data.accountStatus,
      p_primary_store_id: parsed.data.primaryStoreId,
      p_all_store_access: parsed.data.allStoreAccess,
      p_reason: parsed.data.reason
    });
    if (error) throw new Error(error.message);
    return Response.json({ profile: data }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    if (error instanceof AdminAccountConflict) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return phase13ErrorResponse(error, request);
  }
}
