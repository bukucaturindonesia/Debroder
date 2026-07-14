import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { getAdminSupabaseClient } from "@/lib/supabase/client";
import { getPublicSupabaseEnv } from "@/lib/env";
import { isAdminRole } from "@/lib/access-control";

export type Phase13Actor = {
  user: User;
  role: string;
  client: SupabaseClient;
  adminClient: SupabaseClient;
};

export class Phase13AuthError extends Error {
  constructor(public readonly status: number, message: string) {
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
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();
  const role = typeof profile?.role === "string" ? profile.role.toLowerCase() : "";
  if (profileError || !isAdminRole(role)) throw new Phase13AuthError(403, "Akses panel admin ditolak.");

  const client = createClient(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${token}` } }
  });

  if (permission) {
    const { data: allowed, error: permissionError } = await client.rpc("has_permission", {
      p_permission_key: permission
    });
    if (permissionError || allowed !== true) {
      throw new Phase13AuthError(403, "Permission tidak mencukupi untuk tindakan ini.");
    }
  }

  return { user: data.user, role, client, adminClient };
}

export function phase13ErrorResponse(error: unknown): Response {
  if (error instanceof Phase13AuthError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  return Response.json(
    { error: error instanceof Error ? error.message : "Operasi Role & Audit gagal." },
    { status: 500 }
  );
}
