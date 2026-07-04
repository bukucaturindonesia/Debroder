/* eslint-disable @next/next/no-img-element */
"use client";

import { FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";
import type { CmsBanner } from "@/lib/types";

type MediaChoice = {
  id: string;
  name: string;
  public_url: string;
  media_type: "image" | "video";
};

const emptyBanner: CmsBanner = {
  name: "",
  media_type: "image",
  desktop_media_url: "",
  mobile_media_url: "",
  poster_url: "",
  eyebrow: "",
  title: "",
  subtitle: "",
  cta_label: "",
  cta_url: "",
  is_active: true,
  sort_order: 0
};

export function CampaignBannerAdmin() {
  const [banners, setBanners] = useState<CmsBanner[]>([]);
  const [media, setMedia] = useState<MediaChoice[]>([]);
  const [form, setForm] = useState<CmsBanner>({ ...emptyBanner });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadData() {
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setLoading(true);
    const [bannerResult, mediaResult] = await Promise.all([
      supabase.from("cms_banners").select("*").order("sort_order", { ascending: true }),
      supabase.from("media_assets").select("id,name,public_url,media_type").eq("status_aktif", true).order("created_at", { ascending: false })
    ]);
    setLoading(false);

    if (bannerResult.error) {
      setStatus(`Campaign Banner belum siap: ${bannerResult.error.message}`);
      return;
    }

    setBanners((bannerResult.data || []) as CmsBanner[]);
    setMedia((mediaResult.data || []) as MediaChoice[]);
    setStatus("");
  }

  useEffect(() => {
    loadData();
  }, []);

  const primaryMedia = useMemo(
    () => media.filter((asset) => asset.media_type === form.media_type),
    [form.media_type, media]
  );
  const imageMedia = useMemo(
    () => media.filter((asset) => asset.media_type === "image"),
    [media]
  );

  function update<K extends keyof CmsBanner>(key: K, value: CmsBanner[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function reset() {
    setEditingId(null);
    setForm({ ...emptyBanner });
  }

  function startEdit(banner: CmsBanner) {
    setEditingId(banner.id || null);
    setForm({ ...emptyBanner, ...banner });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveBanner(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim() || !form.title.trim() || !form.desktop_media_url.trim()) {
      setStatus("Nama internal, title, dan media desktop wajib diisi.");
      return;
    }

    const supabase = createSupabaseClient();
    if (!supabase) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      media_type: form.media_type,
      desktop_media_url: form.desktop_media_url.trim(),
      mobile_media_url: form.mobile_media_url?.trim() || null,
      poster_url: form.poster_url?.trim() || null,
      eyebrow: form.eyebrow.trim(),
      title: form.title.trim(),
      subtitle: form.subtitle.trim(),
      cta_label: form.cta_label.trim(),
      cta_url: form.cta_url.trim(),
      is_active: form.is_active,
      sort_order: Number(form.sort_order)
    };
    const result = editingId
      ? await supabase.from("cms_banners").update(payload).eq("id", editingId)
      : await supabase.from("cms_banners").insert(payload);
    setSaving(false);

    if (result.error) {
      setStatus(`Campaign banner gagal disimpan: ${result.error.message}`);
      return;
    }

    setStatus("Campaign banner disimpan ke Supabase.");
    reset();
    await loadData();
  }

  async function deleteBanner(banner: CmsBanner) {
    if (!banner.id || !window.confirm(`Hapus campaign banner "${banner.name}"?`)) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from("cms_banners").delete().eq("id", banner.id);
    setStatus(error ? `Banner gagal dihapus: ${error.message}` : "Campaign banner dihapus.");
    if (!error) await loadData();
  }

  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
      <form onSubmit={saveBanner} className="bg-white p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div><h2 className="text-xl font-semibold">{editingId ? "Edit campaign" : "Campaign baru"}</h2><p className="mt-1 text-sm text-brand-charcoal/55">Pilih foto atau video dari Media Library.</p></div>
          {editingId ? <button type="button" onClick={reset} className="text-sm font-semibold underline">Batal</button> : null}
        </div>
        {status ? <p role="status" className="mt-4 bg-brand-offWhite p-3 text-sm font-semibold">{status}</p> : null}

        <div className="mt-5 grid gap-4">
          <Field label="Nama internal"><input required value={form.name} onChange={(event) => update("name", event.target.value)} /></Field>
          <Field label="Tipe media"><select value={form.media_type} onChange={(event) => update("media_type", event.target.value as CmsBanner["media_type"])}><option value="image">Image</option><option value="video">Video</option></select></Field>
          <Field label="Media desktop"><select required value={form.desktop_media_url} onChange={(event) => update("desktop_media_url", event.target.value)}><option value="">Pilih media...</option>{primaryMedia.map((asset) => <option key={asset.id} value={asset.public_url}>{asset.name}</option>)}</select></Field>
          <Field label="Media mobile (opsional)"><select value={form.mobile_media_url || ""} onChange={(event) => update("mobile_media_url", event.target.value)}><option value="">Gunakan media desktop</option>{primaryMedia.map((asset) => <option key={asset.id} value={asset.public_url}>{asset.name}</option>)}</select></Field>
          {form.media_type === "video" ? <Field label="Poster image"><select value={form.poster_url || ""} onChange={(event) => update("poster_url", event.target.value)}><option value="">Tanpa poster</option>{imageMedia.map((asset) => <option key={asset.id} value={asset.public_url}>{asset.name}</option>)}</select></Field> : null}
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Eyebrow"><input value={form.eyebrow} onChange={(event) => update("eyebrow", event.target.value)} /></Field><Field label="Urutan"><input type="number" min="0" value={form.sort_order} onChange={(event) => update("sort_order", Number(event.target.value))} /></Field></div>
          <Field label="Title"><input required value={form.title} onChange={(event) => update("title", event.target.value)} /></Field>
          <Field label="Subtitle"><textarea rows={3} value={form.subtitle} onChange={(event) => update("subtitle", event.target.value)} /></Field>
          <div className="grid gap-4 sm:grid-cols-2"><Field label="CTA label"><input value={form.cta_label} onChange={(event) => update("cta_label", event.target.value)} /></Field><Field label="CTA URL"><input value={form.cta_url} onChange={(event) => update("cta_url", event.target.value)} /></Field></div>
          <label className="flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.is_active} onChange={(event) => update("is_active", event.target.checked)} className="h-4 w-4 accent-brand-green" />Aktif di landing page</label>
          <button disabled={saving} className="min-h-11 rounded-full bg-brand-green px-6 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Menyimpan..." : "Simpan campaign"}</button>
        </div>
      </form>

      <section className="bg-white p-5 sm:p-6">
        <h2 className="text-xl font-semibold">Daftar campaign</h2>
        {loading ? <div className="mt-5 h-32 animate-pulse bg-brand-offWhite" /> : banners.length ? <div className="mt-5 grid gap-4">{banners.map((banner) => (
          <article key={banner.id} className="grid gap-4 border border-brand-softGray p-4 sm:grid-cols-[120px_1fr_auto] sm:items-center">
            <div className="relative aspect-[4/3] overflow-hidden bg-brand-charcoal">
              {banner.media_type === "video" ? <video src={banner.desktop_media_url} poster={banner.poster_url || undefined} muted playsInline className="h-full w-full object-cover" /> : <img src={banner.desktop_media_url} alt={banner.title} className="h-full w-full object-cover" />}
            </div>
            <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-charcoal/45">{banner.media_type} / {banner.is_active ? "Aktif" : "Nonaktif"}</p><h3 className="mt-2 truncate font-semibold">{banner.name}</h3><p className="mt-1 truncate text-sm text-brand-charcoal/60">{banner.title}</p></div>
            <div className="flex gap-2 sm:flex-col"><button type="button" onClick={() => startEdit(banner)} className="rounded-full border border-brand-softGray px-4 py-2 text-xs font-semibold">Edit</button><button type="button" onClick={() => deleteBanner(banner)} className="rounded-full px-4 py-2 text-xs font-semibold text-red-700">Hapus</button></div>
          </article>
        ))}</div> : <p className="mt-5 bg-brand-offWhite p-5 text-sm text-brand-charcoal/60">Belum ada campaign banner.</p>}
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-2 text-sm font-semibold [&_input]:min-h-11 [&_input]:rounded-lg [&_input]:border [&_input]:border-brand-softGray [&_input]:px-4 [&_select]:min-h-11 [&_select]:rounded-lg [&_select]:border [&_select]:border-brand-softGray [&_select]:bg-white [&_select]:px-4 [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-brand-softGray [&_textarea]:p-4 [&_input]:font-normal [&_select]:font-normal [&_textarea]:font-normal">{label}{children}</label>;
}
