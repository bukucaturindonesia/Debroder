import "server-only";

import type { User } from "@supabase/supabase-js";
import { getAdminSupabaseClient } from "@/lib/supabase/admin";
import type { CustomerProfile } from "@/lib/customer-auth/contracts";

export class CustomerAuthError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
  }
}

export type VerifiedCustomer = {
  user: User;
  token: string;
  profile: CustomerProfile;
};

export async function requireVerifiedCustomer(request: Request): Promise<VerifiedCustomer> {
  const token = bearerToken(request);
  if (!token) throw new CustomerAuthError(401, "CUSTOMER_AUTH_REQUIRED", "Silakan masuk ke akun pelanggan.");
  const client = getAdminSupabaseClient();
  if (!client) throw new CustomerAuthError(503, "CUSTOMER_AUTH_UNAVAILABLE", "Layanan akun belum tersedia.");

  const { data, error } = await client.auth.getUser(token);
  const user = data.user;
  if (error || !user) throw new CustomerAuthError(401, "CUSTOMER_AUTH_INVALID", "Sesi pelanggan sudah berakhir.");
  if (!user.email || !isVerifiedCustomerIdentity(user)) {
    throw new CustomerAuthError(403, "CUSTOMER_EMAIL_NOT_VERIFIED", "Email pelanggan belum diverifikasi.");
  }
  if (
    user.app_metadata?.account_type !== "customer"
    || user.app_metadata?.signup_channel !== "debroder_public_v1"
  ) {
    throw new CustomerAuthError(403, "CUSTOMER_ACCOUNT_NOT_PROVISIONED", "Akun ini belum terdaftar sebagai akun pelanggan DEBRODER.");
  }

  const { data: internalProfile, error: internalError } = await client
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (internalError) throw new CustomerAuthError(503, "CUSTOMER_AUTH_UNAVAILABLE", "Pemeriksaan akun belum tersedia.");
  if (internalProfile) {
    throw new CustomerAuthError(403, "CUSTOMER_INTERNAL_ACCOUNT", "Akun internal harus masuk melalui jalur Admin.");
  }

  const normalizedEmail = user.email.trim().toLowerCase();
  const termsAcceptedAt = verifiedTimestamp(user.app_metadata?.terms_accepted_at);
  if (!termsAcceptedAt) {
    throw new CustomerAuthError(403, "CUSTOMER_ACCOUNT_NOT_PROVISIONED", "Persetujuan akun pelanggan belum tercatat dengan aman.");
  }
  const metadataName = text(user.user_metadata?.full_name) || text(user.user_metadata?.name);
  const fallbackName = normalizedEmail.split("@")[0]?.replace(/[._-]+/g, " ").trim() || "Pelanggan DEBRODER";
  const { data: existing, error: existingError } = await client
    .from("customer_profiles")
    .select("id,email,full_name,phone,account_status,email_verified_at")
    .eq("id", user.id)
    .maybeSingle();
  if (existingError) throw new CustomerAuthError(503, "CUSTOMER_PROFILE_UNAVAILABLE", "Profil pelanggan belum tersedia.");

  if (!existing) {
    // Callback verification and the root customer-auth provider can request the
    // same profile at nearly the same time. Provision atomically so concurrent
    // requests converge on one immutable customer identity.
    const { error: provisionError } = await client.from("customer_profiles").upsert({
      id: user.id,
      email: normalizedEmail,
      full_name: metadataName || fallbackName,
      phone: null,
      account_status: "ACTIVE",
      email_verified_at: user.email_confirmed_at,
      terms_accepted_at: termsAcceptedAt
    }, {
      onConflict: "id",
      ignoreDuplicates: true
    });
    if (provisionError) {
      throw new CustomerAuthError(503, "CUSTOMER_PROFILE_UNAVAILABLE", "Profil pelanggan belum dapat dibuat.");
    }
  } else if (existing.email !== normalizedEmail) {
    throw new CustomerAuthError(409, "CUSTOMER_EMAIL_CHANGED", "Perubahan email akun belum dapat diproses melalui profil pelanggan.");
  }

  const { data: row, error: profileError } = await client
    .from("customer_profiles")
    .select("id,email,full_name,phone,account_status,email_verified_at")
    .eq("id", user.id)
    .single();
  if (profileError || !row) throw new CustomerAuthError(503, "CUSTOMER_PROFILE_UNAVAILABLE", "Profil pelanggan belum tersedia.");
  if (row.account_status !== "ACTIVE") {
    throw new CustomerAuthError(403, "CUSTOMER_ACCOUNT_DISABLED", "Akun pelanggan sedang tidak aktif.");
  }

  const { error: claimError } = await client.rpc("claim_verified_customer_orders_v1", {
    p_customer_user_id: user.id
  });
  if (claimError) throw new CustomerAuthError(503, "CUSTOMER_ORDER_CLAIM_UNAVAILABLE", "Riwayat pesanan belum dapat disinkronkan.");

  return {
    user,
    token,
    profile: {
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      phone: row.phone,
      accountStatus: row.account_status,
      emailVerifiedAt: row.email_verified_at
    }
  };
}

export async function optionalVerifiedCustomer(request: Request): Promise<VerifiedCustomer | null> {
  if (!bearerToken(request)) return null;
  return requireVerifiedCustomer(request);
}

export function customerAuthErrorResponse(error: unknown) {
  if (error instanceof CustomerAuthError) {
    return Response.json({ code: error.code, error: error.message }, {
      status: error.status,
      headers: { "cache-control": "private, no-store" }
    });
  }
  return Response.json({ code: "CUSTOMER_ACCOUNT_FAILED", error: "Layanan akun belum dapat memproses permintaan." }, {
    status: 500,
    headers: { "cache-control": "private, no-store" }
  });
}

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 150) : "";
}

function isVerifiedCustomerIdentity(user: User) {
  if (!user.email_confirmed_at || !user.confirmation_sent_at) return false;
  const sent = Date.parse(user.confirmation_sent_at);
  const confirmed = Date.parse(user.email_confirmed_at);
  return Number.isFinite(sent) && Number.isFinite(confirmed) && confirmed >= sent;
}

function verifiedTimestamp(value: unknown) {
  if (typeof value !== "string") return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}
