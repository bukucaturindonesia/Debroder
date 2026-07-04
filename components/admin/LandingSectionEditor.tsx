/* eslint-disable @next/next/no-img-element */
"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { LANDING_SECTION_DEFAULTS } from "@/lib/homepage-settings";
import { createSupabaseClient } from "@/lib/supabase";
import type { LandingSection } from "@/lib/types";

type MediaChoice = {
  id: string;
  name: string;
  public_url: string;
  media_type: "image" | "video";
};

export function LandingSectionEditor({ sectionKey }: { sectionKey: string }) {
  const fallback = LANDING_SECTION_DEFAULTS.find((item) => item.section_key === sectionKey);
  const [section, setSection] = useState<LandingSection | null>(null);
  const [media, setMedia] = useState<MediaChoice[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadData() {
    const supabase = createSupabaseClient();
    if (!supabase || !fallback) return;
    setLoading(true);

    await supabase.from("landing_sections").upsert(
      { ...fallback, metadata: {} },
      { onConflict: "section_key", ignoreDuplicates: true }
    );

    const [sectionResult, mediaResult] = await Promise.all([
      supabase.from("landing_sections").select("*").eq("section_key", sectionKey).maybeSingle(),
      supabase.from("media_assets").select("id,name,public_url,media_type").eq("status_aktif", true).order("created_at", { ascending: false })
    ]);

    setLoading(false);
    if (sectionResult.error || !sectionResult.data) {
      setStatus(`Pengaturan section belum siap: ${sectionResult.error?.message || "data tidak ditemukan"}`);
      return;
    }
    setSection(sectionResult.data as LandingSection);
    setMedia((mediaResult.data || []) as MediaChoice[]);
    setStatus("");
  }

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- initial section bootstrap

  const images = useMemo(() => media.filter((asset) => asset.media_type === "image"), [media]);
  const videos = useMemo(() => media.filter((asset) => asset.media_type === "video"), [media]);

  function update(patch: Partial<LandingSection>) {
    setSection((current) => current ? { ...current, ...patch } : current);
  }

  async function save() {
    if (!section) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setSaving(true);
    const { error } = await supabase.from("landing_sections").update({
      title: section.title.trim(),
      subtitle: section.subtitle.trim(),
      desktop_image_url: section.desktop_image_url || null,
      mobile_image_url: section.mobile_image_url || null,
      video_url: section.video_url || null,
      cta_label: section.cta_label?.trim() || "",
      cta_url: section.cta_url?.trim() || "",
      text_position: section.text_position || "left",
      is_visible: section.is_visible,
      sort_order: Number(section.sort_order),
      metadata: section.metadata || {}
    }).eq("section_key", section.section_key);
    setSaving(false);
    setStatus(error ? `Pengaturan section gagal disimpan: ${error.message}` : "Pengaturan section disimpan.");
  }

  if (!fallback) return null;
  if (loading || !section) return <div className="mt-6 h-44 animate-pulse bg-white" />;

  return (
    <section className="mt-6 border border-brand-softGray bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[.16em] text-brand-charcoal/45">Pengaturan section</p><h2 className="mt-2 text-xl font-semibold">{section.title}</h2></div>
        <label className="inline-flex min-h-11 items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={section.is_visible} onChange={(event) => update({ is_visible: event.target.checked })} className="sr-only" /><span className={`flex h-7 w-12 items-center rounded-full p-1 ${section.is_visible ? "justify-end bg-brand-green" : "justify-start bg-brand-charcoal/25"}`}><span className="h-5 w-5 rounded-full bg-white shadow" /></span>{section.is_visible ? "ON" : "OFF"}</label>
      </div>
      {status ? <p role="status" className="mt-4 bg-brand-offWhite p-3 text-sm font-semibold">{status}</p> : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Field label="Judul"><input value={section.title} onChange={(event) => update({ title: event.target.value })} /></Field>
        <Field label="Urutan tampil"><input type="number" min="0" value={section.sort_order} onChange={(event) => update({ sort_order: Number(event.target.value) })} /></Field>
        <Field label="Subtitle"><textarea rows={3} value={section.subtitle} onChange={(event) => update({ subtitle: event.target.value })} /></Field>
        <Field label="Posisi teks"><select value={section.text_position || "left"} onChange={(event) => update({ text_position: event.target.value as LandingSection["text_position"] })}><option value="left">Kiri</option><option value="center">Tengah</option><option value="right">Kanan</option></select></Field>
        <Field label="Gambar desktop"><select value={section.desktop_image_url || ""} onChange={(event) => update({ desktop_image_url: event.target.value })}><option value="">Tidak digunakan</option>{images.map((asset) => <option key={asset.id} value={asset.public_url}>{asset.name}</option>)}</select></Field>
        <Field label="Gambar mobile"><select value={section.mobile_image_url || ""} onChange={(event) => update({ mobile_image_url: event.target.value })}><option value="">Gunakan desktop / tidak digunakan</option>{images.map((asset) => <option key={asset.id} value={asset.public_url}>{asset.name}</option>)}</select></Field>
        <Field label="Video"><select value={section.video_url || ""} onChange={(event) => update({ video_url: event.target.value })}><option value="">Tanpa video</option>{videos.map((asset) => <option key={asset.id} value={asset.public_url}>{asset.name}</option>)}</select></Field>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="CTA label"><input value={section.cta_label || ""} onChange={(event) => update({ cta_label: event.target.value })} /></Field><Field label="CTA URL"><input value={section.cta_url || ""} onChange={(event) => update({ cta_url: event.target.value })} /></Field></div>
      </div>

      {section.desktop_image_url ? <div className="mt-5 overflow-hidden bg-brand-offWhite"><img src={section.desktop_image_url} alt="Preview section" className="aspect-[16/6] w-full object-cover" /></div> : null}
      <button type="button" onClick={save} disabled={saving} className="mt-5 min-h-11 rounded-full bg-brand-green px-6 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Menyimpan..." : "Simpan pengaturan section"}</button>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-2 text-sm font-semibold [&_input]:min-h-11 [&_input]:rounded-lg [&_input]:border [&_input]:border-brand-softGray [&_input]:px-4 [&_select]:min-h-11 [&_select]:rounded-lg [&_select]:border [&_select]:border-brand-softGray [&_select]:bg-white [&_select]:px-4 [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-brand-softGray [&_textarea]:p-4 [&_input]:font-normal [&_select]:font-normal [&_textarea]:font-normal">{label}{children}</label>;
}
