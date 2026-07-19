"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";

type Setting = {
  id: string;
  method_code: string;
  method_type: "bank_transfer" | "qris" | "ewallet";
  display_name: string;
  bank_name: string | null;
  account_number: string | null;
  account_holder: string | null;
  qris_image_url: string | null;
  instructions: string;
  expires_in_hours: number;
  sort_order: number;
  is_active: boolean;
  updated_at: string;
};

const EMPTY = {
  id: "",
  methodCode: "",
  methodType: "bank_transfer",
  displayName: "",
  bankName: "",
  accountNumber: "",
  accountHolder: "",
  qrisImageUrl: "",
  instructions: "",
  expiresInHours: "24",
  sortOrder: "100",
  isActive: false
};

export function PaymentSettingsAdmin() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const request = useCallback(async (init?: RequestInit) => {
    const client = createSupabaseClient();
    const { data } = await client?.auth.getSession() ?? { data: { session: null } };
    const response = await fetch("/api/admin/payment-settings", {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${data.session?.access_token ?? ""}`,
        ...init?.headers
      },
      cache: "no-store"
    });
    const payload = await response.json() as { settings?: Setting[]; canManage?: boolean; error?: string };
    if (!response.ok) throw new Error(payload.error || "Pengaturan pembayaran gagal diproses.");
    return payload;
  }, []);

  const load = useCallback(async () => {
    try {
      const payload = await request();
      setSettings(payload.settings ?? []);
      setCanManage(Boolean(payload.canManage));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Pengaturan pembayaran gagal dimuat.");
    }
  }, [request]);

  useEffect(() => { void load(); }, [load]);

  function edit(setting: Setting) {
    setForm({
      id: setting.id,
      methodCode: setting.method_code,
      methodType: setting.method_type,
      displayName: setting.display_name,
      bankName: setting.bank_name ?? "",
      accountNumber: setting.account_number ?? "",
      accountHolder: setting.account_holder ?? "",
      qrisImageUrl: setting.qris_image_url ?? "",
      instructions: setting.instructions,
      expiresInHours: String(setting.expires_in_hours),
      sortOrder: String(setting.sort_order),
      isActive: setting.is_active
    });
    setMessage("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !canManage) return;
    setBusy(true);
    setMessage("");
    try {
      await request({
        method: "POST",
        body: JSON.stringify({
          ...form,
          expiresInHours: Number(form.expiresInHours),
          sortOrder: Number(form.sortOrder)
        })
      });
      setMessage("Pengaturan pembayaran berhasil disimpan dan dicatat pada audit log.");
      setForm(EMPTY);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Pengaturan pembayaran gagal disimpan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="border border-brand-softGray bg-white">
      <summary className="cursor-pointer list-none p-5 font-semibold">Pengaturan Metode Pembayaran</summary>
      <div className="border-t border-brand-softGray p-5">
        <p className="text-sm leading-6 text-brand-charcoal/60">Sumber terpusat untuk rekening, QRIS, instruksi, urutan, status aktif, dan masa berlaku. Pelanggan hanya melihat metode aktif.</p>
        {message ? <div className="mt-4 border border-brand-softGray bg-brand-offWhite p-3 text-sm font-semibold">{message}</div> : null}
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {settings.map((setting) => (
            <article key={setting.id} className="border border-brand-softGray p-4 text-sm">
              <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{setting.display_name}</h3><p className="mt-1 text-brand-charcoal/55">{setting.method_code} · {setting.method_type}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${setting.is_active ? "bg-emerald-50 text-emerald-800" : "bg-brand-offWhite"}`}>{setting.is_active ? "Aktif" : "Nonaktif"}</span></div>
              <p className="mt-3">{setting.bank_name || "Kanal digital"}{setting.account_number ? ` · ${setting.account_number}` : ""}{setting.account_holder ? ` · ${setting.account_holder}` : ""}</p>
              {canManage ? <button type="button" onClick={() => edit(setting)} className="mt-4 min-h-10 rounded-full border border-brand-charcoal px-4 font-semibold">Edit</button> : null}
            </article>
          ))}
          {!settings.length ? <p className="border border-dashed border-brand-softGray p-5 text-sm text-brand-charcoal/55">Belum ada metode pembayaran. Aktifkan metode hanya setelah data tujuan lengkap.</p> : null}
        </div>

        {canManage ? (
          <form onSubmit={save} className="mt-6 grid gap-4 border-t border-brand-softGray pt-6 sm:grid-cols-2">
            <h3 className="font-semibold sm:col-span-2">{form.id ? "Edit Metode" : "Tambah Metode"}</h3>
            <Input label="Kode internal" value={form.methodCode} onChange={(value) => setForm({ ...form, methodCode: value })} placeholder="bca_utama" required />
            <label className="grid gap-2 text-sm font-semibold">Jenis<select value={form.methodType} onChange={(event) => setForm({ ...form, methodType: event.target.value })} className="min-h-11 rounded-lg border border-brand-softGray px-3"><option value="bank_transfer">Transfer bank</option><option value="qris">QRIS</option><option value="ewallet">Dompet digital</option></select></label>
            <Input label="Nama tampil" value={form.displayName} onChange={(value) => setForm({ ...form, displayName: value })} required />
            <Input label="Bank / kanal" value={form.bankName} onChange={(value) => setForm({ ...form, bankName: value })} />
            <Input label="Nomor rekening / tujuan" value={form.accountNumber} onChange={(value) => setForm({ ...form, accountNumber: value })} />
            <Input label="Nama pemilik" value={form.accountHolder} onChange={(value) => setForm({ ...form, accountHolder: value })} />
            <Input label="URL gambar QRIS (HTTPS/path internal)" value={form.qrisImageUrl} onChange={(value) => setForm({ ...form, qrisImageUrl: value })} />
            <Input label="Masa berlaku (jam)" type="number" min="1" max="720" value={form.expiresInHours} onChange={(value) => setForm({ ...form, expiresInHours: value })} required />
            <Input label="Urutan" type="number" value={form.sortOrder} onChange={(value) => setForm({ ...form, sortOrder: value })} required />
            <label className="flex min-h-11 items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} /> Aktif untuk pelanggan</label>
            <label className="grid gap-2 text-sm font-semibold sm:col-span-2">Instruksi<textarea rows={4} value={form.instructions} onChange={(event) => setForm({ ...form, instructions: event.target.value })} className="rounded-lg border border-brand-softGray p-3 font-normal" /></label>
            <div className="flex flex-wrap gap-3 sm:col-span-2"><button disabled={busy} className="min-h-11 rounded-full bg-brand-charcoal px-5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Menyimpan..." : "Simpan Metode"}</button>{form.id ? <button type="button" onClick={() => setForm(EMPTY)} className="min-h-11 rounded-full border border-brand-softGray px-5 text-sm font-semibold">Batal Edit</button> : null}</div>
          </form>
        ) : <p className="mt-5 text-sm text-brand-charcoal/55">Akses Anda hanya dapat melihat pengaturan pembayaran.</p>}
      </div>
    </details>
  );
}

function Input({ label, value, onChange, ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="grid gap-2 text-sm font-semibold">{label}<input {...props} value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 rounded-lg border border-brand-softGray px-3 font-normal" /></label>;
}
