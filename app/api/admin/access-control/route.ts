import { getSiteUrl } from "@/lib/env";
import { adminAccountInviteSchema, invitationStatus, normalizeAccountListQuery } from "@/lib/admin-account-management";
import { phase13ErrorResponse, requirePhase13Actor } from "@/lib/phase13-auth";

export const dynamic = "force-dynamic";

const PROFILE_FIELDS = "id,email,role,display_name,account_status,primary_store_id,all_store_access,active_session_id,session_version,last_login_at,password_changed_at,activated_at,suspended_at,inactive_at,locked_at,lifecycle_reason,created_at,updated_at";

export async function GET(request: Request) {
  try {
    const actor = await requirePhase13Actor(request, "access_control.read");
    const query = normalizeAccountListQuery(new URL(request.url).searchParams);
    const [profiles, definitions, matrix, stores, authUsers] = await Promise.all([
      actor.adminClient.from("profiles").select(PROFILE_FIELDS).order("email"),
      actor.adminClient.from("permission_definitions").select("permission_key,module,label,description").order("module").order("permission_key"),
      actor.adminClient.from("role_permissions").select("role,permission_key,granted,updated_by,updated_at").order("role").order("permission_key"),
      actor.adminClient.from("stores").select("id,nama_store,status_aktif").eq("status_aktif", true).order("nama_store"),
      actor.adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
    ]);
    const firstError = profiles.error || definitions.error || matrix.error || stores.error || authUsers.error;
    if (firstError) throw new Error(firstError.message);

    const authById = new Map((authUsers.data?.users ?? []).map((user) => [user.id, user]));
    const storeById = new Map((stores.data ?? []).map((store) => [store.id, store.nama_store]));
    const accounts = (profiles.data ?? []).map((profile) => {
      const authUser = authById.get(profile.id);
      authById.delete(profile.id);
      return {
        ...profile,
        display_name: profile.display_name || profile.email || "Admin DEBRODER",
        invitation_status: invitationStatus({
          authExists: Boolean(authUser),
          profileExists: true,
          invitedAt: authUser?.invited_at ?? null,
          confirmedAt: authUser?.email_confirmed_at ?? null,
          accountStatus: profile.account_status
        }),
        auth_state: authUser ? "linked" : "missing_auth",
        auth_created_at: authUser?.created_at ?? null,
        invited_at: authUser?.invited_at ?? null,
        confirmed_at: authUser?.email_confirmed_at ?? null,
        store_name: profile.primary_store_id ? storeById.get(profile.primary_store_id) ?? null : null
      };
    });

    for (const authUser of authById.values()) {
      accounts.push({
        id: authUser.id,
        email: authUser.email ?? null,
        role: "",
        display_name: authUser.email ?? "Auth tanpa Profil",
        account_status: "INACTIVE",
        primary_store_id: null,
        all_store_access: false,
        active_session_id: null,
        session_version: 0,
        last_login_at: authUser.last_sign_in_at ?? null,
        password_changed_at: null,
        activated_at: null,
        suspended_at: null,
        inactive_at: null,
        locked_at: null,
        lifecycle_reason: null,
        created_at: authUser.created_at,
        updated_at: authUser.updated_at ?? authUser.created_at,
        invitation_status: "Auth tanpa Profil",
        auth_state: "missing_profile",
        auth_created_at: authUser.created_at,
        invited_at: authUser.invited_at ?? null,
        confirmed_at: authUser.email_confirmed_at ?? null,
        store_name: null
      });
    }

    const filtered = accounts.filter((account) => {
      if (query.search && !`${account.display_name} ${account.email || ""}`.toLowerCase().includes(query.search)) return false;
      if (query.role && account.role !== query.role) return false;
      if (query.status && account.account_status !== query.status) return false;
      if (query.storeId && account.primary_store_id !== query.storeId) return false;
      return true;
    }).sort((left, right) => String(left.email || "").localeCompare(String(right.email || "")));
    const start = (query.page - 1) * query.pageSize;

    return Response.json({
      accounts: filtered.slice(start, start + query.pageSize),
      definitions: definitions.data ?? [],
      rolePermissions: matrix.data ?? [],
      stores: stores.data ?? [],
      actorRole: actor.role,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total: filtered.length,
        pages: Math.max(1, Math.ceil(filtered.length / query.pageSize))
      }
    }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    return phase13ErrorResponse(error, request);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePhase13Actor(request, "access_control.manage");
    const parsed = adminAccountInviteSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0]?.message || "Data undangan tidak valid." }, { status: 400 });
    }
    const input = parsed.data;

    const [profileDuplicate, authUsers] = await Promise.all([
      actor.adminClient.from("profiles").select("id").ilike("email", input.email).limit(1),
      actor.adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
    ]);
    if (profileDuplicate.error || authUsers.error) throw new Error(profileDuplicate.error?.message || authUsers.error?.message);
    const authDuplicate = (authUsers.data?.users ?? []).some((user) => user.email?.trim().toLowerCase() === input.email);
    if ((profileDuplicate.data?.length ?? 0) > 0 || authDuplicate) {
      return Response.json({ error: "Email tersebut sudah terdaftar." }, { status: 409 });
    }

    const invited = await actor.adminClient.auth.admin.inviteUserByEmail(input.email, {
      redirectTo: `${getSiteUrl()}/admin/login?invited=1`,
      data: { display_name: input.displayName }
    });
    if (invited.error || !invited.data.user) throw new Error(invited.error?.message || "Undangan Auth gagal dibuat.");

    const profile = await actor.client.rpc("initialize_admin_invitation_profile_v1", {
      p_profile_id: invited.data.user.id,
      p_email: input.email,
      p_display_name: input.displayName,
      p_role: input.role,
      p_primary_store_id: input.primaryStoreId,
      p_all_store_access: input.allStoreAccess,
      p_reason: input.reason
    });

    if (profile.error) {
      await actor.adminClient.auth.admin.updateUserById(invited.data.user.id, { ban_duration: "876000h" });
      throw new Error("Undangan dibuat tetapi profil gagal disiapkan; akun baru telah dikunci untuk pemulihan aman.");
    }

    return Response.json({ account: profile.data, message: "Undangan Admin berhasil dikirim." }, {
      status: 201,
      headers: { "cache-control": "private, no-store" }
    });
  } catch (error) {
    return phase13ErrorResponse(error, request);
  }
}
