"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { AccountPanel } from "@/components/customer-account/CustomerAccountFrame";
import { useCustomerAuth } from "@/components/customer-auth/CustomerAuthProvider";
import type { CustomerAddress } from "@/lib/customer-auth/contracts";
import { EMPTY_STRUCTURED_ADDRESS, StructuredIndonesiaAddress } from "@/components/checkout/StructuredIndonesiaAddress";
import type { StructuredIndonesiaAddressInput } from "@/lib/indonesia-address";

export function AccountAddresses() {
  const auth = useCustomerAuth();
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [label, setLabel] = useState("Alamat Utama");
  const [address, setAddress] = useState<StructuredIndonesiaAddressInput>(EMPTY_STRUCTURED_ADDRESS);
  const [formatted, setFormatted] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [isDefault, setIsDefault] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!auth.accessToken) return;
    setLoading(true);
    try {
      const response = await fetch("/api/customer/addresses", { cache: "no-store", headers: { authorization: `Bearer ${auth.accessToken}` } });
      const payload = await response.json().catch(() => ({})) as { addresses?: CustomerAddress[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "Alamat belum dapat dimuat.");
      setAddresses(payload.addresses ?? []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Alamat belum dapat dimuat.");
    } finally { setLoading(false); }
  }, [auth.accessToken]);

  useEffect(() => { void load(); }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth.accessToken || !confirmed) return setError("Konfirmasi alamat sebelum menyimpan.");
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch(editingId ? `/api/customer/addresses/${editingId}` : "/api/customer/addresses", {
        method: editingId ? "PATCH" : "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${auth.accessToken}` },
        body: JSON.stringify({ label, isDefault, formattedAddress: formatted, address })
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Alamat belum dapat disimpan.");
      resetForm();
      setMessage(editingId ? "Alamat berhasil diperbarui." : "Alamat berhasil disimpan.");
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Alamat belum dapat disimpan."); }
    finally { setSaving(false); }
  }

  async function remove(id: string) {
    if (!auth.accessToken || !window.confirm("Hapus alamat ini dari akun?")) return;
    setError("");
    const response = await fetch(`/api/customer/addresses/${id}`, { method: "DELETE", headers: { authorization: `Bearer ${auth.accessToken}` } });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({})) as { error?: string };
      setError(payload.error || "Alamat belum dapat dihapus.");
      return;
    }
    if (editingId === id) resetForm();
    await load();
  }

  async function makeDefault(item: CustomerAddress) {
    if (!auth.accessToken || item.isDefault) return;
    setError("");
    const response = await fetch(`/api/customer/addresses/${item.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", authorization: `Bearer ${auth.accessToken}` },
      body: JSON.stringify({ label: item.label, isDefault: true, formattedAddress: item.formattedAddress, address: item.address })
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({})) as { error?: string };
      setError(payload.error || "Alamat utama belum dapat diubah.");
      return;
    }
    await load();
  }

  function edit(item: CustomerAddress) {
    setEditingId(item.id);
    setLabel(item.label);
    setAddress(item.address);
    setFormatted(item.formattedAddress);
    setConfirmed(false);
    setIsDefault(item.isDefault);
    setMessage(""); setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setLabel("Alamat Utama");
    setAddress(EMPTY_STRUCTURED_ADDRESS);
    setFormatted("");
    setConfirmed(false);
    setIsDefault(addresses.length === 0);
  }

  return <AccountPanel eyebrow="Alamat" title="Alamat tersimpan" description="Alamat tersimpan dapat dipakai kembali saat checkout. Data wilayah divalidasi melalui katalog Indonesia yang sama dengan checkout.">
    {loading ? <p className="text-sm text-black/55">Memuat alamat...</p> : null}
    <div className="grid gap-3 sm:grid-cols-2">{addresses.map((item) => <article key={item.id} className="rounded-2xl border border-black/10 p-5"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{item.label}</p>{item.isDefault ? <p className="mt-1 text-xs font-semibold text-emerald-700">Alamat utama</p> : null}</div></div><p className="mt-3 text-sm leading-6 text-black/60">{item.formattedAddress}</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => edit(item)} className="min-h-10 rounded-full border border-black/15 px-4 text-xs font-semibold">Ubah</button>{!item.isDefault ? <button type="button" onClick={() => void makeDefault(item)} className="min-h-10 rounded-full border border-black/15 px-4 text-xs font-semibold">Jadikan Utama</button> : null}<button type="button" onClick={() => void remove(item.id)} className="min-h-10 rounded-full border border-red-200 px-4 text-xs font-semibold text-red-700">Hapus</button></div></article>)}</div>

    <form onSubmit={submit} className="mt-8 border-t border-black/10 pt-8">
      <h2 className="text-xl font-semibold">{editingId ? "Ubah alamat" : "Tambah alamat"}</h2>
      <label className="mt-5 grid max-w-md gap-2 text-sm font-semibold">Label alamat<input value={label} onChange={(event) => setLabel(event.target.value)} minLength={2} maxLength={60} required className="min-h-11 rounded-xl border border-black/15 px-3" /></label>
      <div className="mt-5"><StructuredIndonesiaAddress value={address} confirmed={confirmed} onChange={(next) => { setAddress(next); setConfirmed(false); }} onConfirmedChange={setConfirmed} onFormattedAddressChange={setFormatted} /></div>
      <label className="mt-5 flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={isDefault} onChange={(event) => setIsDefault(event.target.checked)} /> Jadikan alamat utama</label>
      {message ? <p className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{message}</p> : null}
      {error ? <p role="alert" className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p> : null}
      <div className="mt-5 flex flex-wrap gap-3"><button type="submit" disabled={saving || !confirmed} className="min-h-12 rounded-full bg-black px-6 text-sm font-semibold text-white disabled:opacity-45">{saving ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Simpan Alamat"}</button>{editingId ? <button type="button" onClick={resetForm} className="min-h-12 rounded-full border border-black/15 px-6 text-sm font-semibold">Batal</button> : null}</div>
    </form>
  </AccountPanel>;
}
