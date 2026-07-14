import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { getAdminSupabaseClient } from "@/lib/supabase/client";
import { getPublicSupabaseEnv } from "@/lib/env";
import { isPaymentRole } from "@/lib/payments";

export type PaymentActor = { user: User; role: string; client: SupabaseClient };

export async function requirePaymentActor(request: Request): Promise<PaymentActor> {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token) throw new PaymentAuthError(401, "Sesi admin diperlukan.");

  const adminClient = getAdminSupabaseClient();
  const env = getPublicSupabaseEnv();
  if (!adminClient || !env) throw new PaymentAuthError(503, "Supabase admin belum dikonfigurasi.");
  const { data, error } = await adminClient.auth.getUser(token);
  if (error || !data.user) throw new PaymentAuthError(401, "Sesi admin tidak valid.");

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();
  const role = typeof profile?.role === "string" ? profile.role.toLowerCase() : "";
  if (profileError || !isPaymentRole(role)) throw new PaymentAuthError(403, "Akses pembayaran ditolak.");
  const client = createClient(env.url, env.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
  return { user: data.user, role, client };
}

export class PaymentAuthError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export function paymentErrorResponse(error: unknown): Response {
  if (error instanceof PaymentAuthError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  return Response.json(
    { error: error instanceof Error ? error.message : "Operasi pembayaran gagal." },
    { status: 500 }
  );
}
