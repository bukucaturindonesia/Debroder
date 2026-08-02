import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { getAdminSupabaseClient } from "@/lib/supabase/admin";
import { getPublicSupabaseEnv } from "@/lib/env";
import {
  adminGuestErrorResponse,
  assertAdminRequestMethodAllowed
} from "@/lib/admin-role-security";
import {
  getRoleLabel,
  isAccountEnabled,
  isAccountStatus,
  parseAdminRole,
  type AccountStatus,
  type AdminAccessSnapshot,
  type AdminRole
} from "@/lib/access-control";
import {
  canonicalErrorResponse,
  createServerRequestContext
} from "@/lib/observability/server";

export type Phase13Actor = {
  user: User;
  role: AdminRole;
  displayName: string;
  accountStatus: AccountStatus;
  primaryStoreId: string | null;
  primaryStoreName: string | null;
  allStoreAccess: boolean;
  permissions: string[];
  access: AdminAccessSnapshot;
  client: SupabaseClient;
  adminClient: SupabaseClient;
};

export type Phase13AuthErrorCode =
  | "ADMIN_AUTHENTICATION_REQUIRED"
  | "ADMIN_ACCOUNT_DISABLED"
  | "ADMIN_PROFILE_INCOMPLETE"
  | "ADMIN_ACCESS_DENIED"
  | "ADMIN_SERVICE_UNAVAILABLE";

export class Phase13AuthError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code: Phase13AuthErrorCode = status === 401
      ? "ADMIN_AUTHENTICATION_REQUIRED"
      : status === 403
        ? "ADMIN_ACCESS_DENIED"
        : "ADMIN_SERVICE_UNAVAILABLE"
  ) {
    super(message);
  }
}

export async function requirePhase13Actor(
  request: Request,
  permission?: string
): Promise<Phase13Actor> {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token) throw new Phase13AuthError(401, "Sesi admin diperlukan.");

  const adminClient = getAdminSupabaseClient();
  const env = getPublicSupabaseEnv();
  if (!adminClient || !env) throw new Phase13AuthError(503, "Supabase admin belum dikonfigurasi.");

  const { data, error } = await adminClient.auth.getUser(token);
  if (error || !data.user) throw new Phase13AuthError(401, "Sesi admin tidak valid.");

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("role,display_name,email,account_status,primary_store_id,all_store_access")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError) throw new Phase13AuthError(503, "Profil admin belum dapat diperiksa.");
  if (!profile) {
    throw new Phase13AuthError(403, "Profil admin belum lengkap.", "ADMIN_PROFILE_INCOMPLETE");
  }

  const role = parseAdminRole(profile.role);
  const accountStatus = isAccountStatus(profile.account_status) ? profile.account_status : null;
  if (!role || !accountStatus) {
    throw new Phase13AuthError(403, "Role atau status profil admin tidak valid.", "ADMIN_PROFILE_INCOMPLETE");
  }
  if (!isAccountEnabled(accountStatus)) {
    throw new Phase13AuthError(403, "Akun admin sedang dinonaktifkan.", "ADMIN_ACCOUNT_DISABLED");
  }
  assertAdminRequestMethodAllowed(role, request.method);

  const primaryStoreId = typeof profile.primary_store_id === "string" ? profile.primary_store_id : null;
  const allStoreAccess = profile.all_store_access === true;
  assertCanonicalScope(role, primaryStoreId, allStoreAccess);

  const client = createClient(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${token}` } }
  });

  const { data: activeSession, error: sessionError } = await client.rpc("is_current_admin_session");
  if (sessionError) {
    throw new Phase13AuthError(503, "Pemeriksaan sesi admin sedang tidak tersedia.");
  }
  if (activeSession !== true) {
    throw new Phase13AuthError(401, "Sesi admin perlu diaktifkan kembali.");
  }

  const permissionRole = role === "super_admin" ? "superadmin" : role;
  const [permissionResult, storeResult] = await Promise.all([
    adminClient
      .from("role_permissions")
      .select("permission_key")
      .eq("role", permissionRole)
      .eq("granted", true),
    primaryStoreId
      ? adminClient.from("stores").select("id,nama_store,status_aktif").eq("id", primaryStoreId).maybeSingle()
      : Promise.resolve({ data: null, error: null })
  ]);

  if (permissionResult.error) {
    throw new Phase13AuthError(503, "Pemeriksaan permission sedang tidak tersedia.");
  }
  if (storeResult.error) {
    throw new Phase13AuthError(503, "Scope toko belum dapat diperiksa.");
  }
  if (primaryStoreId && (!storeResult.data || storeResult.data.status_aktif !== true)) {
    throw new Phase13AuthError(403, "Scope toko tidak aktif atau tidak ditemukan.", "ADMIN_PROFILE_INCOMPLETE");
  }

  const permissions = (permissionResult.data ?? [])
    .map((row) => row.permission_key)
    .filter((value): value is string => typeof value === "string");

  if (permission) {
    const { data: allowed, error: permissionError } = await client.rpc("has_permission", {
      p_permission_key: permission
    });
    if (permissionError) {
      throw new Phase13AuthError(503, "Pemeriksaan permission sedang tidak tersedia.");
    }
    if (allowed !== true) {
      throw new Phase13AuthError(403, "Permission tidak mencukupi untuk tindakan ini.");
    }
  }

  const displayName = cleanDisplayName(profile.display_name, profile.email, data.user.email);
  const primaryStoreName = typeof storeResult.data?.nama_store === "string"
    ? storeResult.data.nama_store
    : null;
  const scopeLabel = allStoreAccess ? "SEMUA TOKO" : primaryStoreName || "SCOPE BELUM LENGKAP";
  const access: AdminAccessSnapshot = {
    userId: data.user.id,
    email: typeof profile.email === "string" ? profile.email : data.user.email ?? null,
    displayName,
    role,
    roleLabel: getRoleLabel(role),
    accountStatus,
    primaryStoreId,
    primaryStoreName,
    allStoreAccess,
    scopeLabel,
    permissions,
    readOnly: role === "admin_guest"
  };

  return {
    user: data.user,
    role,
    displayName,
    accountStatus,
    primaryStoreId,
    primaryStoreName,
    allStoreAccess,
    permissions,
    access,
    client,
    adminClient
  };
}

function assertCanonicalScope(
  role: AdminRole,
  primaryStoreId: string | null,
  allStoreAccess: boolean
) {
  if (role === "store_admin" && (allStoreAccess || !primaryStoreId)) {
    throw new Phase13AuthError(403, "Scope Store Admin belum lengkap.", "ADMIN_PROFILE_INCOMPLETE");
  }
  if (role === "head_store" && !allStoreAccess) {
    throw new Phase13AuthError(403, "Scope Head Store belum lengkap.", "ADMIN_PROFILE_INCOMPLETE");
  }
  if (["owner", "product_content_manager", "order_cs_admin", "finance_admin"].includes(role) && !allStoreAccess) {
    throw new Phase13AuthError(403, "Scope global akun belum lengkap.", "ADMIN_PROFILE_INCOMPLETE");
  }
}

function cleanDisplayName(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "Admin DEBRODER";
}

export function phase13ErrorResponse(error: unknown, request?: Request): Response {
  const guestResponse = adminGuestErrorResponse(error);
  if (guestResponse) return guestResponse;
  const context = createServerRequestContext(request, "admin role and audit");
  if (error instanceof Phase13AuthError) {
    return canonicalErrorResponse({
      error,
      context,
      definition: {
        code: error.code,
        message: error.status >= 500 ? "Layanan panel Admin belum tersedia." : error.message,
        status: error.status
      },
      log: error.status >= 500
    });
  }
  return canonicalErrorResponse({
    error,
    context,
    definition: {
      code: "ADMIN_OPERATION_FAILED",
      message: "Operasi Role & Audit gagal. Coba lagi.",
      status: 500
    }
  });
}
