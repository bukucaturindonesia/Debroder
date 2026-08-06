import { canonicalCustomerAddress, mapCustomerAddress } from "@/lib/customer-auth/address";
import { customerAddressSchema } from "@/lib/customer-auth/contracts";
import { customerAuthErrorResponse, requireVerifiedCustomer } from "@/lib/customer-auth/server";
import { getAdminSupabaseClient } from "@/lib/supabase/admin";

const ADDRESS_SELECT = "id,label,is_default,recipient_name,recipient_phone,province_code,regency_code,district_code,village_code,postal_code,address_detail,house_number,rt,rw,landmark,courier_note,formatted_address";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const customer = await requireVerifiedCustomer(request);
    const client = getAdminSupabaseClient();
    if (!client) return Response.json({ code: "CUSTOMER_ADDRESS_UNAVAILABLE", error: "Alamat belum tersedia." }, { status: 503 });
    const { data, error } = await client
      .from("customer_addresses")
      .select(ADDRESS_SELECT)
      .eq("customer_id", customer.user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return Response.json({ addresses: (data ?? []).map((row) => mapCustomerAddress(row as Record<string, unknown>)) }, {
      headers: { "cache-control": "private, no-store" }
    });
  } catch (error) {
    return customerAuthErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const customer = await requireVerifiedCustomer(request);
    const parsed = customerAddressSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return Response.json({ code: "CUSTOMER_ADDRESS_INVALID", error: parsed.error.issues[0]?.message ?? "Alamat tidak valid." }, { status: 400 });
    const client = getAdminSupabaseClient();
    if (!client) return Response.json({ code: "CUSTOMER_ADDRESS_UNAVAILABLE", error: "Alamat belum tersedia." }, { status: 503 });
    const { count, error: countError } = await client
      .from("customer_addresses")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", customer.user.id);
    if (countError) throw new Error(countError.message);
    if ((count ?? 0) >= 10) return Response.json({ code: "CUSTOMER_ADDRESS_LIMIT", error: "Maksimal 10 alamat tersimpan." }, { status: 409 });
    const canonical = await canonicalCustomerAddress(client, parsed.data);
    const shouldDefault = canonical.is_default || (count ?? 0) === 0;
    if (shouldDefault) {
      const { error: resetError } = await client.from("customer_addresses").update({ is_default: false }).eq("customer_id", customer.user.id);
      if (resetError) throw new Error(resetError.message);
    }
    const { data, error } = await client
      .from("customer_addresses")
      .insert({ ...canonical, is_default: shouldDefault, customer_id: customer.user.id })
      .select(ADDRESS_SELECT)
      .single();
    if (error || !data) throw new Error(error?.message ?? "Address insert returned no data.");
    return Response.json({ address: mapCustomerAddress(data as Record<string, unknown>) }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && (error.message === "ADDRESS_REGION_INVALID" || error.message === "ADDRESS_POSTAL_INVALID")) {
      return Response.json({ code: "CUSTOMER_ADDRESS_INVALID", error: "Wilayah atau kode pos tidak sesuai katalog resmi." }, { status: 400 });
    }
    return customerAuthErrorResponse(error);
  }
}
