import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { getAdminSupabaseClient } from "@/lib/supabase/admin";
import { getPublicSupabaseEnv } from "@/lib/env";
import { adminGuestErrorResponse, assertAdminRequestMethodAllowed } from "@/lib/admin-role-security";
import {
  canonicalErrorResponse,
  createServerRequestContext
} from "@/lib/observability/server";

export type OperationsActor = {
  user: User;
  role: string;
  client: SupabaseClient;
};

export async function requireOperationsActor(
  request: Request,
  permission: string = "operations.read"
): Promise<OperationsActor> {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token) throw new OperationsAuthError(401, "Sesi admin diperlukan.");

  const adminClient = getAdminSupabaseClient();
  const env = getPublicSupabaseEnv();
  if (!adminClient || !env) throw new OperationsAuthError(503, "Layanan operasional belum dikonfigurasi.");

  const { data, error } = await adminClient.auth.getUser(token);
  if (error || !data.user) throw new OperationsAuthError(401, "Sesi admin tidak valid.");

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();
  if (profileError || typeof profile?.role !== "string") {
    throw new OperationsAuthError(403, "Role admin tidak tersedia.");
  }

  const role = profile.role.toLowerCase();
  assertAdminRequestMethodAllowed(role, request.method);
  const client = createClient(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
  const { data: allowed, error: permissionError } = await client.rpc("has_permission", {
    p_permission_key: permission
  });
  if (permissionError || allowed !== true) {
    throw new OperationsAuthError(403, "Akses operasional ditolak.");
  }

  return { user: data.user, role, client };
}

export class OperationsAuthError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export function operationsErrorResponse(error: unknown, request?: Request) {
  const guest = adminGuestErrorResponse(error);
  if (guest) return guest;
  const context = createServerRequestContext(request, "admin operations");
  if (error instanceof OperationsAuthError) {
    return canonicalErrorResponse({
      error,
      context,
      definition: {
        code: error.status === 401
          ? "OPERATIONS_AUTHENTICATION_REQUIRED"
          : error.status === 403
            ? "OPERATIONS_ACCESS_DENIED"
            : "OPERATIONS_UNAVAILABLE",
        message: error.status >= 500
          ? "Layanan operasi belum tersedia."
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
      code: "OPERATIONS_FAILED",
      message: "Operasi belum dapat diproses. Coba lagi.",
      status: 500
    }
  });
}
