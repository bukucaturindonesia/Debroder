"use client";

import { useEffect, useMemo, useState } from "react";
import type { IndonesiaRegionLevel, IndonesiaRegionOption, StructuredIndonesiaAddressInput } from "@/lib/indonesia-address";

export const EMPTY_STRUCTURED_ADDRESS: StructuredIndonesiaAddressInput = {
  recipientName: "", recipientPhone: "", provinceId: "", regencyId: "", districtId: "", villageId: "",
  postalCode: "", addressDetail: "", houseNumber: "", rt: "", rw: "", landmark: "", courierNote: ""
};

export function StructuredIndonesiaAddress({ value, confirmed, onChange, onConfirmedChange, onFormattedAddressChange }: {
  value: StructuredIndonesiaAddressInput;
  confirmed: boolean;
  onChange: (value: StructuredIndonesiaAddressInput) => void;
  onConfirmedChange: (value: boolean) => void;
  onFormattedAddressChange?: (value: string) => void;
}) {
  const [provinces, setProvinces] = useState<IndonesiaRegionOption[]>([]);
  const [regencies, setRegencies] = useState<IndonesiaRegionOption[]>([]);
  const [districts, setDistricts] = useState<IndonesiaRegionOption[]>([]);
  const [villages, setVillages] = useState<IndonesiaRegionOption[]>([]);
  const [loading, setLoading] = useState("province");
  const [error, setError] = useState("");

  useEffect(() => { void loadRegions("province", "", setProvinces, setLoading, setError); }, []);
  useEffect(() => { if (value.provinceId) void loadRegions("regency", value.provinceId, setRegencies, setLoading, setError); else setRegencies([]); }, [value.provinceId]);
  useEffect(() => { if (value.regencyId) void loadRegions("district", value.regencyId, setDistricts, setLoading, setError); else setDistricts([]); }, [value.regencyId]);
  useEffect(() => { if (value.districtId) void loadRegions("village", value.districtId, setVillages, setLoading, setError); else setVillages([]); }, [value.districtId]);

  const selectedVillage = villages.find((region) => region.code === value.villageId);
  const summary = useMemo(() => [
    value.recipientName,
    value.recipientPhone,
    value.addressDetail,
    value.houseNumber ? `No. ${value.houseNumber}` : "",
    value.rt ? `RT ${value.rt}` : "",
    value.rw ? `RW ${value.rw}` : "",
    villages.find((item) => item.code === value.villageId)?.name,
    districts.find((item) => item.code === value.districtId)?.name,
    regencies.find((item) => item.code === value.regencyId)?.name,
    provinces.find((item) => item.code === value.provinceId)?.name,
    value.postalCode,
    value.landmark ? "Patokan: " + value.landmark : ""
  ].filter(Boolean).join(", "), [districts, provinces, regencies, value, villages]);

  useEffect(() => { onFormattedAddressChange?.(summary); }, [onFormattedAddressChange, summary]);

  const setField = (field: keyof StructuredIndonesiaAddressInput, next: string) => {
    onConfirmedChange(false);
    onChange({ ...value, [field]: next });
  };
  const complete = Boolean(value.recipientName.trim().length >= 2 && /^\d{9,15}$/.test(value.recipientPhone.replace(/\D/g, "")) && value.provinceId && value.regencyId && value.districtId && value.villageId && /^\d{5}$/.test(value.postalCode) && value.addressDetail.trim().length >= 5 && (!value.rt || /^\d{1,3}$/.test(value.rt)) && (!value.rw || /^\d{1,3}$/.test(value.rw)));

  return <div className="grid gap-5">
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Nama penerima"><input value={value.recipientName} onChange={(event) => setField("recipientName", event.target.value)} autoComplete="name" minLength={2} maxLength={150} required /></Field>
      <Field label="WhatsApp / telepon penerima"><input value={value.recipientPhone} onChange={(event) => setField("recipientPhone", event.target.value)} autoComplete="tel" inputMode="tel" required /></Field>
      <RegionField label="Provinsi" options={provinces} value={value.provinceId} loading={loading === "province"} onChange={(code) => onChange({ ...value, provinceId: code, regencyId: "", districtId: "", villageId: "", postalCode: "" })} />
      <RegionField label="Kabupaten / kota" options={regencies} value={value.regencyId} loading={loading === "regency"} disabled={!value.provinceId} onChange={(code) => onChange({ ...value, regencyId: code, districtId: "", villageId: "", postalCode: "" })} />
      <RegionField label="Kecamatan" options={districts} value={value.districtId} loading={loading === "district"} disabled={!value.regencyId} onChange={(code) => onChange({ ...value, districtId: code, villageId: "", postalCode: "" })} />
      <RegionField label="Kelurahan / desa" options={villages} value={value.villageId} loading={loading === "village"} disabled={!value.districtId} onChange={(code) => { const region = villages.find((item) => item.code === code); onChange({ ...value, villageId: code, postalCode: region?.postalCodes.length === 1 ? region.postalCodes[0] : "" }); }} />
      <Field label="Kode pos"><input value={value.postalCode} onChange={(event) => setField("postalCode", event.target.value.replace(/\D/g, "").slice(0, 5))} inputMode="numeric" pattern="[0-9]{5}" list="custom-postal-codes" required /><datalist id="custom-postal-codes">{(selectedVillage?.postalCodes ?? []).map((code) => <option key={code} value={code} />)}</datalist></Field>
      <Field label="Nomor rumah / gedung"><input value={value.houseNumber} onChange={(event) => setField("houseNumber", event.target.value)} maxLength={80} /></Field>
      <Field label="RT"><input value={value.rt} onChange={(event) => setField("rt", event.target.value.replace(/\D/g, "").slice(0, 3))} inputMode="numeric" /></Field>
      <Field label="RW"><input value={value.rw} onChange={(event) => setField("rw", event.target.value.replace(/\D/g, "").slice(0, 3))} inputMode="numeric" /></Field>
      <div className="sm:col-span-2"><Field label="Rincian alamat"><textarea value={value.addressDetail} onChange={(event) => setField("addressDetail", event.target.value)} rows={3} minLength={5} maxLength={500} required /></Field></div>
      <Field label="Patokan"><input value={value.landmark} onChange={(event) => setField("landmark", event.target.value)} maxLength={300} /></Field>
      <Field label="Catatan kurir"><input value={value.courierNote} onChange={(event) => setField("courierNote", event.target.value)} maxLength={500} /></Field>
    </div>
    {error ? <p role="alert" className="border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{error} Pengiriman belum dapat dipilih sampai data wilayah resmi tersedia.</p> : null}
    <div className="rounded-2xl bg-[#f6f5f0] p-4 text-sm"><p className="font-semibold">Konfirmasi alamat</p><p className="mt-2 leading-6 text-black/60">{summary || "Lengkapi wilayah dan rincian alamat."}</p>{confirmed ? <button type="button" onClick={() => onConfirmedChange(false)} className="mt-3 min-h-11 rounded-full border border-black/20 bg-white px-4 font-semibold">Ubah Alamat</button> : <label className="mt-3 flex min-h-11 items-center gap-3 font-semibold"><input type="checkbox" checked={confirmed} disabled={!complete} onChange={(event) => onConfirmedChange(event.target.checked)} /> Gunakan Alamat Ini</label>}</div>
  </div>;
}

function RegionField({ label, options, value, loading, disabled, onChange }: { label: string; options: IndonesiaRegionOption[]; value: string; loading: boolean; disabled?: boolean; onChange: (value: string) => void }) {
  const [query, setQuery] = useState("");
  useEffect(() => setQuery(""), [options]);
  const visible = query ? options.filter((option) => option.name.toLocaleLowerCase("id").includes(query.toLocaleLowerCase("id"))) : options;
  return <div className="grid gap-2"><label className="text-sm font-semibold">{label}</label><input type="search" value={query} disabled={disabled || loading} onChange={(event) => setQuery(event.target.value)} placeholder={`Cari ${label.toLowerCase()}`} className="min-h-10 rounded-xl border border-black/10 px-3 text-sm" /><select value={value} disabled={disabled || loading} required onChange={(event) => { onChange(event.target.value); setQuery(""); }} className="min-h-11 rounded-xl border border-black/15 bg-white px-3 text-sm"><option value="">{loading ? "Memuat..." : `Pilih ${label.toLowerCase()}`}</option>{visible.map((option) => <option key={option.code} value={option.code}>{option.name}</option>)}</select></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2 text-sm font-semibold [&_input]:min-h-11 [&_input]:rounded-xl [&_input]:border [&_input]:border-black/15 [&_input]:px-3 [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-black/15 [&_textarea]:p-3">{label}{children}</label>;
}

async function loadRegions(level: IndonesiaRegionLevel, parentCode: string, setter: (rows: IndonesiaRegionOption[]) => void, setLoading: (value: string) => void, setError: (value: string) => void) {
  setLoading(level); setError("");
  try {
    const query = new URLSearchParams({ level });
    if (parentCode) query.set("parent_code", parentCode);
    const response = await fetch(`/api/public/indonesia-regions?${query}`, { cache: "force-cache" });
    const payload = await response.json() as { regions?: IndonesiaRegionOption[]; error?: string };
    if (!response.ok) throw new Error(payload.error || "Katalog wilayah gagal dimuat.");
    setter(payload.regions ?? []);
    if (!(payload.regions ?? []).length) setError("Data wilayah untuk pilihan ini belum dikonfigurasi.");
  } catch (reason) {
    setter([]);
    setError(reason instanceof Error ? reason.message : "Katalog wilayah gagal dimuat.");
  } finally { setLoading(""); }
}
