"use client";

import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { AccountPanel } from "@/components/customer-account/CustomerAccountFrame";
import { useCustomerAuth } from "@/components/customer-auth/CustomerAuthProvider";
import { customerProfileUpdateSchema } from "@/lib/customer-auth/contracts";

export function AccountProfile() {
  const auth = useCustomerAuth();
  const [name, setName] = useState(auth.profile?.fullName ?? "");
  const [phone, setPhone] = useState(auth.profile?.phone ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { setName(auth.profile?.fullName ?? ""); setPhone(auth.profile?.phone ?? ""); }, [auth.profile]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setMessage("");
    const parsed = customerProfileUpdateSchema.safeParse({ fullName: name, phone });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Profil tidak valid.");
    if (!auth.accessToken) return setError("Sesi pelanggan tidak tersedia.");
    setSaving(true);
    try {
      const response = await fetch("/api/customer/session", { method: "PATCH", headers: { "content-type": "application/json", authorization: `Bearer ${auth.accessToken}` }, body: JSON.stringify(parsed.data) });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Profil belum dapat disimpan.");
      await auth.refresh();
      setMessage("Profil berhasil diperbarui.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Profil belum dapat disimpan."); }
    finally { setSaving(false); }
  }

  return <AccountPanel eyebrow="Profil" title="Data pelanggan" description="Email menjadi identitas akun dan tidak dapat diubah dari halaman ini.">
    <form onSubmit={submit} className="grid max-w-xl gap-4">
      <Field label="Nama lengkap"><input value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={150} required /></Field>
      <Field label="Email terverifikasi"><input value={auth.profile?.email ?? ""} disabled /></Field>
      <Field label="Nomor kontak (opsional)"><input value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" autoComplete="tel" /></Field>
      <p className="text-xs leading-5 text-black/50">Nomor kontak dipakai untuk pengiriman dan bantuan, bukan untuk memverifikasi akun.</p>
      {message ? <p className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{message}</p> : null}
      {error ? <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p> : null}
      <button type="submit" disabled={saving} className="min-h-12 rounded-full bg-black px-6 text-sm font-semibold text-white disabled:opacity-45">{saving ? "Menyimpan..." : "Simpan Profil"}</button>
    </form>
  </AccountPanel>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-2 text-sm font-semibold [&_input]:min-h-12 [&_input]:rounded-xl [&_input]:border [&_input]:border-black/15 [&_input]:px-4 disabled:[&_input]:bg-black/5">{label}{children}</label>;
}
