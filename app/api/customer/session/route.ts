import { customerProfileUpdateSchema } from "@/lib/customer-auth/contracts";
import {
  customerAuthErrorResponse,
  requireVerifiedCustomer
} from "@/lib/customer-auth/server";
import { getAdminSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const customer = await requireVerifiedCustomer(request);
    return Response.json({ profile: customer.profile }, {
      headers: { "cache-control": "private, no-store" }
    });
  } catch (error) {
    return customerAuthErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const customer = await requireVerifiedCustomer(request);
    const parsed = customerProfileUpdateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json({ code: "CUSTOMER_PROFILE_INVALID", error: parsed.error.issues[0]?.message ?? "Data profil tidak valid." }, { status: 400 });
    }
    const client = getAdminSupabaseClient();
    if (!client) return Response.json({ code: "CUSTOMER_AUTH_UNAVAILABLE", error: "Layanan akun belum tersedia." }, { status: 503 });
    const { data, error } = await client
      .from("customer_profiles")
      .update({
        full_name: parsed.data.fullName,
        phone: parsed.data.phone || null,
        updated_at: new Date().toISOString()
      })
      .eq("id", customer.user.id)
      .select("id,email,full_name,phone,account_status,email_verified_at")
      .single();
    if (error || !data) throw new Error(error?.message ?? "Profile update returned no data.");
    return Response.json({
      profile: {
        id: data.id,
        email: data.email,
        fullName: data.full_name,
        phone: data.phone,
        accountStatus: data.account_status,
        emailVerifiedAt: data.email_verified_at
      }
    }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    return customerAuthErrorResponse(error);
  }
}
