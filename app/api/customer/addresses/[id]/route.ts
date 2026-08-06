import { canonicalCustomerAddress, mapCustomerAddress } from "@/lib/customer-auth/address";
import { customerAddressSchema } from "@/lib/customer-auth/contracts";
import { customerAuthErrorResponse, requireVerifiedCustomer } from "@/lib/customer-auth/server";
import { getAdminSupabaseClient } from "@/lib/supabase/admin";

const ADDRESS_SELECT = "id,label,is_default,recipient_name,recipient_phone,province_code,regency_code,district_code,village_code,postal_code,address_detail,house_number,rt,rw,landmark,courier_note,formatted_address";
type Context = { params: Promise<{ id: string }> };
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: Context) {
  try {
    const customer = await requireVerifiedCustomer(request);
    const { id } = await context.params;
    if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id)) return Response.json({ code: "CUSTOMER_ADDRESS_INVALID", error: "Alamat tidak valid." }, { status: 400 });
    const parsed = customerAddressSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return Response.json({ code: "CUSTOMER_ADDRESS_INVALID", error: parsed.error.issues[0]?.message ?? "Alamat tidak valid." }, { status: 400 });
    const client = getAdminSupabaseClient();
    if (!client) return Response.json({ code: "CUSTOMER_ADDRESS_UNAVAILABLE", error: "Alamat belum tersedia." }, { status: 503 });
    const canonical = await canonicalCustomerAddress(client, parsed.data);
    if (canonical.is_default) {
      const { error: resetError } = await client.from("customer_addresses").update({ is_default: false }).eq("customer_id", customer.user.id);
      if (resetError) throw new Error(resetError.message);
    }
    const { data, error } = await client
      .from("customer_addresses")
      .update(canonical)
      .eq("id", id)
      .eq("customer_id", customer.user.id)
      .select(ADDRESS_SELECT)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return Response.json({ code: "CUSTOMER_ADDRESS_NOT_FOUND", error: "Alamat tidak ditemukan." }, { status: 404 });
    return Response.json({ address: mapCustomerAddress(data as Record<string, unknown>) });
  } catch (error) {
    if (error instanceof Error && (error.message === "ADDRESS_REGION_INVALID" || error.message === "ADDRESS_POSTAL_INVALID")) {
      return Response.json({ code: "CUSTOMER_ADDRESS_INVALID", error: "Wilayah atau kode pos tidak sesuai katalog resmi." }, { status: 400 });
    }
    return customerAuthErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const customer = await requireVerifiedCustomer(request);
    const { id } = await context.params;
    if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id)) return Response.json({ code: "CUSTOMER_ADDRESS_INVALID", error: "Alamat tidak valid." }, { status: 400 });
    const client = getAdminSupabaseClient();
    if (!client) return Response.json({ code: "CUSTOMER_ADDRESS_UNAVAILABLE", error: "Alamat belum tersedia." }, { status: 503 });
    const { data: existing, error: readError } = await client
      .from("customer_addresses")
      .select("id,is_default")
      .eq("id", id)
      .eq("customer_id", customer.user.id)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!existing) return Response.json({ code: "CUSTOMER_ADDRESS_NOT_FOUND", error: "Alamat tidak ditemukan." }, { status: 404 });
    const { error } = await client.from("customer_addresses").delete().eq("id", id).eq("customer_id", customer.user.id);
    if (error) throw new Error(error.message);
    if (existing.is_default) {
      const { data: next } = await client.from("customer_addresses").select("id").eq("customer_id", customer.user.id).order("created_at").limit(1).maybeSingle();
      if (next?.id) await client.from("customer_addresses").update({ is_default: true }).eq("id", next.id).eq("customer_id", customer.user.id);
    }
    return new Response(null, { status: 204 });
  } catch (error) {
    return customerAuthErrorResponse(error);
  }
}
