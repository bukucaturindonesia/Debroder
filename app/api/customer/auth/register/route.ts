import { customerRegistrationSchema } from "@/lib/customer-auth/contracts";
import { createCustomerAuthServerClient } from "@/lib/customer-auth/anon-server";
import { getSiteUrl } from "@/lib/env";
import { verifyRecaptchaToken } from "@/lib/recaptcha-server";
import { getAdminSupabaseClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const raw = await request.json().catch(() => null);
  const record = raw && typeof raw === "object" && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : {};
  const parsed = customerRegistrationSchema.safeParse(record);
  if (!parsed.success) {
    return Response.json({ code: "CUSTOMER_REGISTER_INVALID", error: parsed.error.issues[0]?.message ?? "Data pendaftaran tidak valid." }, { status: 400 });
  }
  const recaptcha = await verifyRecaptchaToken(
    typeof record.recaptchaToken === "string" ? record.recaptchaToken : null,
    "customer_register"
  );
  if (!recaptcha.valid) {
    return Response.json({ code: "CUSTOMER_REGISTER_SECURITY", error: recaptcha.message ?? "Verifikasi keamanan gagal." }, { status: recaptcha.configured ? 403 : 503 });
  }

  const admin = getAdminSupabaseClient();
  const auth = createCustomerAuthServerClient();
  if (!admin || !auth) return Response.json({ code: "CUSTOMER_AUTH_UNAVAILABLE", error: "Layanan akun belum tersedia." }, { status: 503 });

  const { data: internal, error: internalError } = await admin.rpc(
    "customer_email_is_internal_v1",
    { p_email: parsed.data.email }
  );
  if (internalError) {
    return Response.json({ code: "CUSTOMER_AUTH_UNAVAILABLE", error: "Pemeriksaan akun belum tersedia." }, { status: 503 });
  }
  if (internal === true) {
    return Response.json({ accepted: true, message: "Periksa email Anda untuk melanjutkan pendaftaran." }, { status: 202 });
  }

  const termsAcceptedAt = new Date().toISOString();
  const { data: signUpData, error } = await auth.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/callback?next=%2Faccount`,
      data: {
        full_name: parsed.data.fullName,
        account_type: "customer",
        terms_accepted_at: termsAcceptedAt
      }
    }
  });
  if (error && !/already|registered|exists/i.test(error.message)) {
    return Response.json({ code: "CUSTOMER_REGISTER_FAILED", error: "Pendaftaran belum dapat diproses. Coba lagi." }, { status: 503 });
  }
  if (signUpData.session) {
    return Response.json({
      code: "CUSTOMER_EMAIL_CONFIRMATION_REQUIRED",
      error: "Verifikasi email belum diwajibkan pada konfigurasi autentikasi. Aktifkan Confirm Email sebelum membuka pendaftaran pelanggan."
    }, { status: 503 });
  }

  const isNewIdentity = Boolean(signUpData.user && (signUpData.user.identities?.length ?? 0) > 0);
  if (isNewIdentity && signUpData.user) {
    const { error: provisionError } = await admin.auth.admin.updateUserById(signUpData.user.id, {
      app_metadata: {
        account_type: "customer",
        signup_channel: "debroder_public_v1",
        terms_accepted_at: termsAcceptedAt
      }
    });
    if (provisionError) {
      return Response.json({
        code: "CUSTOMER_PROVISION_FAILED",
        error: "Akun belum dapat disiapkan. Coba lagi atau hubungi bantuan DEBRODER."
      }, { status: 503 });
    }
  }

  return Response.json({ accepted: true, message: "Periksa email Anda untuk melanjutkan pendaftaran." }, { status: 202 });
}
