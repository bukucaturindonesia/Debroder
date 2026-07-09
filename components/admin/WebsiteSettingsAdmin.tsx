"use client";

import { FormEvent, useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";

type WebsiteSetting = {
  id: string;
  setting_key: string;
  label: string;
  value: unknown;
  description: string;
  group_name: string;
};

const emptyForm = {
  setting_key: "",
  label: "",
  value: "{}",
  description: "",
  group_name: "general"
};

export function WebsiteSettingsAdmin() {
  const [settings, setSettings] = useState<WebsiteSetting[]>([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadSettings() {
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase.from("website_settings").select("*").order("group_name").order("setting_key");
    setLoading(false);
    if (error) {
      setStatus(`Website Settings belum siap: ${error.message}`);
      return;
    }
    setSettings((data || []) as WebsiteSetting[]);
    setStatus("");
  }

  useEffect(() => {
    loadSettings();
  }, []);

  function reset() {
    setEditingId(null);
    setForm({ ...emptyForm });
  }

  function startEdit(setting: WebsiteSetting) {
    setEditingId(setting.id);
    setForm({
      setting_key: setting.setting_key,
      label: setting.label,
      value: JSON.stringify(setting.value, null, 2),
      description: setting.description || "",
      group_name: setting.group_name || "general"
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveSetting(event: FormEvent) {
    event.preventDefault();
    let parsedValue: unknown;
    try {
      parsedValue = JSON.parse(form.value);
    } catch {
      setStatus("Value harus berupa JSON yang valid.");
      return;
    }

    const supabase = createSupabaseClient();
    if (!supabase) return;
    setSaving(true);
    const payload = {
      setting_key: form.setting_key.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_"),
      label: form.label.trim(),
      value: parsedValue,
      description: form.description.trim(),
      group_name: form.group_name.trim() || "general"
    };
    const result = editingId
      ? await supabase.from("website_settings").update(payload).eq("id", editingId)
      : await supabase.from("website_settings").insert(payload);
    setSaving(false);

    if (result.error) {
      setStatus(`Pengaturan gagal disimpan: ${result.error.message}`);
      return;
    }
    setStatus("Website setting disimpan.");
    reset();
    await loadSettings();
  }

  async function deleteSetting(setting: WebsiteSetting) {
    if (!window.confirm(`Hapus pengaturan "${setting.label}"?`)) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from("website_settings").delete().eq("id", setting.id);
    setStatus(error ? `Pengaturan gagal dihapus: ${error.message}` : "Pengaturan dihapus.");
    if (!error) await loadSettings();
  }

  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(300px,.75fr)_minmax(0,1.25fr)]">
      <form onSubmit={saveSetting} className="bg-white p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">{editingId ? "Edit setting" : "Setting baru"}</h2>{editingId ? <button type="button" onClick={reset} className="text-sm font-semibold underline">Batal</button> : null}</div>
        {status ? <p role="status" className="mt-4 bg-brand-offWhite p-3 text-sm font-semibold">{status}</p> : null}
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-semibold">Key<input required value={form.setting_key} onChange={(event) => setForm((current) => ({ ...current, setting_key: event.target.value }))} disabled={!!editingId} className="min-h-11 rounded-lg border border-brand-softGray px-4 font-normal disabled:bg-brand-offWhite" /></label>
          <label className="grid gap-2 text-sm font-semibold">Label<input required value={form.label} onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))} className="min-h-11 rounded-lg border border-brand-softGray px-4 font-normal" /></label>
          <label className="grid gap-2 text-sm font-semibold">Grup<input value={form.group_name} onChange={(event) => setForm((current) => ({ ...current, group_name: event.target.value }))} className="min-h-11 rounded-lg border border-brand-softGray px-4 font-normal" /></label>
          <label className="grid gap-2 text-sm font-semibold">Value JSON<textarea required rows={8} value={form.value} onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))} className="rounded-lg border border-brand-softGray p-4 font-mono text-xs font-normal" /></label>
          <label className="grid gap-2 text-sm font-semibold">Deskripsi<textarea rows={3} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="rounded-lg border border-brand-softGray p-4 font-normal" /></label>
          <button disabled={saving} className="min-h-11 rounded-full bg-brand-green px-6 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Menyimpan..." : "Simpan setting"}</button>
        </div>
      </form>

      <section className="bg-white p-5 sm:p-6">
        <h2 className="text-xl font-semibold">Website Settings</h2>
        {loading ? <div className="mt-5 h-36 animate-pulse bg-brand-offWhite" /> : settings.length ? <div className="mt-5 grid gap-3">{settings.map((setting) => (
          <article key={setting.id} className="grid gap-4 border border-brand-softGray p-4 sm:grid-cols-[1fr_auto] sm:items-start">
            <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-charcoal/45">{setting.group_name} / {setting.setting_key}</p><h3 className="mt-2 font-semibold">{setting.label}</h3>{setting.description ? <p className="mt-1 text-sm text-brand-charcoal/60">{setting.description}</p> : null}<pre className="mt-3 max-h-32 overflow-auto bg-brand-offWhite p-3 text-xs">{JSON.stringify(setting.value, null, 2)}</pre></div>
            <div className="flex gap-2 sm:flex-col"><button type="button" onClick={() => startEdit(setting)} className="rounded-full border border-brand-softGray px-4 py-2 text-xs font-semibold">Edit</button><button type="button" onClick={() => deleteSetting(setting)} className="rounded-full px-4 py-2 text-xs font-semibold text-red-700">Hapus</button></div>
          </article>
        ))}</div> : <p className="mt-5 bg-brand-offWhite p-5 text-sm text-brand-charcoal/60">Belum ada website setting.</p>}
      </section>
    </div>
  );
}
