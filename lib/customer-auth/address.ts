import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
import type { customerAddressSchema, CustomerAddress } from "@/lib/customer-auth/contracts";

type AddressInput = z.infer<typeof customerAddressSchema>;
type RegionRow = {
  code: string;
  name: string;
  level: string;
  parent_code: string | null;
  postal_codes: string[] | null;
};

export async function canonicalCustomerAddress(
  client: SupabaseClient,
  value: AddressInput
) {
  const codes = [
    value.address.provinceId,
    value.address.regencyId,
    value.address.districtId,
    value.address.villageId
  ];
  const { data, error } = await client
    .from("indonesia_regions")
    .select("code,name,level,parent_code,postal_codes")
    .in("code", codes)
    .eq("is_active", true);
  if (error) throw new Error(`Address region lookup failed: ${error.message}`);
  const rows = (data ?? []) as RegionRow[];
  const byCode = new Map(rows.map((row) => [row.code, row]));
  const province = byCode.get(value.address.provinceId);
  const regency = byCode.get(value.address.regencyId);
  const district = byCode.get(value.address.districtId);
  const village = byCode.get(value.address.villageId);
  if (
    !province || province.level !== "province" || province.parent_code !== null
    || !regency || regency.level !== "regency" || regency.parent_code !== province.code
    || !district || district.level !== "district" || district.parent_code !== regency.code
    || !village || village.level !== "village" || village.parent_code !== district.code
  ) {
    throw new Error("ADDRESS_REGION_INVALID");
  }
  if ((village.postal_codes ?? []).length > 0 && !(village.postal_codes ?? []).includes(value.address.postalCode)) {
    throw new Error("ADDRESS_POSTAL_INVALID");
  }

  const address = value.address;
  const formattedAddress = [
    address.recipientName,
    address.recipientPhone,
    address.addressDetail,
    address.houseNumber ? `No. ${address.houseNumber}` : "",
    address.rt ? `RT ${address.rt}` : "",
    address.rw ? `RW ${address.rw}` : "",
    village.name,
    district.name,
    regency.name,
    province.name,
    address.postalCode,
    address.landmark ? `Patokan: ${address.landmark}` : ""
  ].filter(Boolean).join(", ");

  return {
    label: value.label,
    is_default: value.isDefault,
    recipient_name: address.recipientName,
    recipient_phone: address.recipientPhone,
    province_code: province.code,
    regency_code: regency.code,
    district_code: district.code,
    village_code: village.code,
    postal_code: address.postalCode,
    address_detail: address.addressDetail,
    house_number: address.houseNumber || null,
    rt: address.rt || null,
    rw: address.rw || null,
    landmark: address.landmark || null,
    courier_note: address.courierNote || null,
    formatted_address: formattedAddress
  };
}

export function mapCustomerAddress(row: Record<string, unknown>): CustomerAddress {
  return {
    id: String(row.id),
    label: String(row.label),
    isDefault: row.is_default === true,
    formattedAddress: String(row.formatted_address),
    address: {
      recipientName: String(row.recipient_name),
      recipientPhone: String(row.recipient_phone),
      provinceId: String(row.province_code),
      regencyId: String(row.regency_code),
      districtId: String(row.district_code),
      villageId: String(row.village_code),
      postalCode: String(row.postal_code),
      addressDetail: String(row.address_detail),
      houseNumber: typeof row.house_number === "string" ? row.house_number : "",
      rt: typeof row.rt === "string" ? row.rt : "",
      rw: typeof row.rw === "string" ? row.rw : "",
      landmark: typeof row.landmark === "string" ? row.landmark : "",
      courierNote: typeof row.courier_note === "string" ? row.courier_note : ""
    }
  };
}
