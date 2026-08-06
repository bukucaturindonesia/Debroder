import { customerRecoverySchema } from "@/lib/customer-auth/contracts";
import { createCustomerAuthServerClient } from "@/lib/customer-auth/anon-server";
import { getSiteUrl } from "@/lib/env";
import { verifyRecaptchaToken } from "@/lib/recaptcha-server";
import { getAdminSupabaseClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const raw = await request.json().catch(() => null);
  const record = raw && typeof raw === "object" && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : {};
  const parsed = customerRecoverySchema.safeParse(record);
  if (!parsed.success) return Response.json({ code: "CUSTOMER_RECOVERY_INVALID", error: "Email tidak valid." }, { status: 400 });
  const recaptcha = await verifyRecaptchaToken(
    typeof record.recaptchaToken === "string" ? record.recaptchaToken : null,
    "customer_password_recovery"
  );
  if (!recaptcha.valid) return Response.json({ code: "CUSTOMER_RECOVERY_SECURITY", error: recaptcha.message ?? "Verifikasi keamanan gagal." }, { status: recaptcha.configured ? 403 : 503 });

  const admin = getAdminSupabaseClient();
  const auth = createCustomerAuthServerClient();
  if (!admin || !auth) return Response.json({ code: "CUSTOMER_AUTH_UNAVAILABLE", error: "Layanan akun belum tersedia." }, { status: 503 });
  const { data: internal, error: internalError } = await admin.rpc(
    "customer_email_is_internal_v1",
    { p_email: parsed.data.email }
  );
  if (internalError) return Response.json({ code: "CUSTOMER_AUTH_UNAVAILABLE", error: "Pemeriksaan akun belum tersedia." }, { status: 503 });
  if (internal !== true) {
    await auth.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${getSiteUrl()}/reset-password`
    });
  }
  return Response.json({ accepted: true, message: "Jika email terdaftar sebagai pelanggan, tautan pemulihan akan dikirim." }, { status: 202 });
}
