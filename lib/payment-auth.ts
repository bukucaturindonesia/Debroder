import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { getAdminSupabaseClient } from "@/lib/supabase/admin";
import { getPublicSupabaseEnv } from "@/lib/env";
import {
  adminGuestErrorResponse,
  assertAdminRequestMethodAllowed
} from "@/lib/admin-role-security";
import { isPaymentRole } from "@/lib/payments";
import {
  canonicalErrorResponse,
  createServerRequestContext
} from "@/lib/observability/server";

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
  assertAdminRequestMethodAllowed(role, request.method);
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

export function paymentErrorResponse(error: unknown, request?: Request): Response {
  const guestResponse = adminGuestErrorResponse(error);
  if (guestResponse) return guestResponse;
  const context = createServerRequestContext(request, "admin payment");
  if (error instanceof PaymentAuthError) {
    return canonicalErrorResponse({
      error,
      context,
      definition: {
        code: error.status === 401
          ? "PAYMENT_AUTHENTICATION_REQUIRED"
          : error.status === 403
            ? "PAYMENT_ACCESS_DENIED"
            : "PAYMENT_SERVICE_UNAVAILABLE",
        message: error.status >= 500
          ? "Layanan pembayaran belum tersedia."
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
      code: "PAYMENT_OPERATION_FAILED",
      message: "Operasi pembayaran gagal. Coba lagi.",
      status: 500
    }
  });
}
