export type IndonesiaRegionLevel = "province" | "regency" | "district" | "village";

export type IndonesiaRegionOption = {
  code: string;
  name: string;
  postalCodes: string[];
};

export type StructuredIndonesiaAddressInput = {
  recipientName: string;
  recipientPhone: string;
  provinceId: string;
  regencyId: string;
  districtId: string;
  villageId: string;
  postalCode: string;
  addressDetail: string;
  houseNumber: string;
  rt: string;
  rw: string;
  landmark: string;
  courierNote: string;
};

const REGION_CODE = /^[0-9A-Za-z.-]{1,24}$/;

export function parseStructuredIndonesiaAddress(value: unknown): StructuredIndonesiaAddressInput | null {
  if (!isRecord(value)) return null;
  const address: StructuredIndonesiaAddressInput = {
    recipientName: clean(value.recipientName, 150),
    recipientPhone: normalizePhone(clean(value.recipientPhone, 24)),
    provinceId: clean(value.provinceId, 24),
    regencyId: clean(value.regencyId, 24),
    districtId: clean(value.districtId, 24),
    villageId: clean(value.villageId, 24),
    postalCode: clean(value.postalCode, 5),
    addressDetail: clean(value.addressDetail, 500),
    houseNumber: clean(value.houseNumber, 80),
    rt: clean(value.rt, 3),
    rw: clean(value.rw, 3),
    landmark: clean(value.landmark, 300),
    courierNote: clean(value.courierNote, 500)
  };
  if (
    address.recipientName.length < 2
    || address.recipientPhone.length < 9
    || !REGION_CODE.test(address.provinceId)
    || !REGION_CODE.test(address.regencyId)
    || !REGION_CODE.test(address.districtId)
    || !REGION_CODE.test(address.villageId)
    || !/^\d{5}$/.test(address.postalCode)
    || address.addressDetail.length < 5
    || (address.rt && !/^\d{1,3}$/.test(address.rt))
    || (address.rw && !/^\d{1,3}$/.test(address.rw))
  ) return null;
  return address;
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
}

function clean(value: unknown, maxLength: number) {
  return typeof value === "string"
    ? value.trim().replace(/[\u0000-\u001f\u007f]/g, "").slice(0, maxLength)
    : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
