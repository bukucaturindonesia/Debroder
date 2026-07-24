import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { getAdminSupabaseClient } from "@/lib/supabase/admin";
import { getPublicSupabaseEnv } from "@/lib/env";
import {
  adminGuestErrorResponse,
  assertAdminRequestMethodAllowed
} from "@/lib/admin-role-security";
import { canCreateRepeatOrder } from "@/lib/repeat-orders";
import { isAdminRole } from "@/lib/access-control";
import {
  canonicalErrorResponse,
  createServerRequestContext
} from "@/lib/observability/server";

export type RepeatOrderActor = {
  user: User;
  role: string;
  client: SupabaseClient;
  adminClient: SupabaseClient;
};

export class RepeatOrderAuthError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export async function requireRepeatOrderActor(
  request: Request,
  options: { create?: boolean } = {}
): Promise<RepeatOrderActor> {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token) throw new RepeatOrderAuthError(401, "Sesi admin diperlukan.");

  const adminClient = getAdminSupabaseClient();
  const env = getPublicSupabaseEnv();
  if (!adminClient || !env) throw new RepeatOrderAuthError(503, "Supabase admin belum dikonfigurasi.");

  const { data, error } = await adminClient.auth.getUser(token);
  if (error || !data.user) throw new RepeatOrderAuthError(401, "Sesi admin tidak valid.");

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();
  const role = typeof profile?.role === "string" ? profile.role.toLowerCase() : "";
  assertAdminRequestMethodAllowed(role, request.method);
  if (profileError || !isAdminRole(role)) throw new RepeatOrderAuthError(403, "Akses panel admin ditolak.");

  const client = createClient(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${token}` } }
  });

  const requiredPermissions = options.create
    ? ["order.read", "quotation.write"]
    : ["order.read"];
  for (const permission of requiredPermissions) {
    const { data: allowed, error: permissionError } = await client.rpc("has_permission", {
      p_permission_key: permission
    });
    if (permissionError || allowed !== true) {
      throw new RepeatOrderAuthError(403, "Permission tidak mencukupi untuk Repeat Order.");
    }
  }

  if (options.create && !canCreateRepeatOrder(role)) {
    throw new RepeatOrderAuthError(403, "Role ini tidak diizinkan membuat Repeat Order.");
  }

  return { user: data.user, role, client, adminClient };
}

export function repeatOrderErrorResponse(error: unknown, request?: Request): Response {
  const guestResponse = adminGuestErrorResponse(error);
  if (guestResponse) return guestResponse;
  const context = createServerRequestContext(request, "admin repeat order");
  if (error instanceof RepeatOrderAuthError) {
    return canonicalErrorResponse({
      error,
      context,
      definition: {
        code: error.status === 401
          ? "REPEAT_ORDER_AUTHENTICATION_REQUIRED"
          : error.status === 403
            ? "REPEAT_ORDER_ACCESS_DENIED"
            : "REPEAT_ORDER_SERVICE_UNAVAILABLE",
        message: error.status >= 500
          ? "Layanan Repeat Order belum tersedia."
          : error.message,
        status: error.status
      },
      log: error.status >= 500
    });
  }
  return canonicalErrorResponse({
    error,
    context,
    definition: {
      code: "REPEAT_ORDER_OPERATION_FAILED",
      message: "Operasi Repeat Order gagal. Coba lagi.",
      status: 500
    }
  });
}
