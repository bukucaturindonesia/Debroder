/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import {
  archiveCmsContent,
  cmsBadgeClass,
  cmsStatusLabel,
  publishCmsNow,
  restoreCmsDraft,
  saveCmsDraft,
  scheduleCmsPublish
} from "@/lib/cms-workflow";
import { JERSEY_ORDER_STEPS, JERSEY_SECTION_TYPES, safeJerseyHref } from "@/lib/jersey-experience";
import { createSupabaseClient } from "@/lib/supabase";
import type { CmsBanner } from "@/lib/types";

type MediaChoice = { id: string; name: string; public_url: string; media_type: "image" | "video" };
type SaveMode = "draft" | "published" | "scheduled";

const emptySection: CmsBanner = {
  name: "",
  media_type: "image",
  desktop_media_url: "",
  mobile_media_url: "",
  poster_url: "",
  eyebrow: "DEBRODER JERSEY",
  title: "",
  subtitle: "",
  cta_label: "",
  cta_url: "",
  secondary_cta_label: "",
  secondary_cta_url: "",
  text_position: "left",
  experience_key: "jersey",
  section_type: "split_campaign",
  section_key: "",
  image_alt: "",
  object_position: "center center",
  mobile_object_position: "center center",
  focal_x: 50,
  focal_y: 50,
  focal_zoom: 1,
  mobile_focal_x: 50,
  mobile_focal_y: 50,
  mobile_focal_zoom: 1,
  metadata: {},
  is_active: true,
  sort_order: 10,
  status: "draft"
};

const typeLabels: Record<string, string> = {
  split_campaign: "Split Campaign Poster",
  poster_carousel: "Team / Style Carousel",
  wide_campaign: "Wide Editorial Campaign",
  custom_cta: "Custom Jersey CTA",
  team_package_campaign: "Paket Tim Campaign",
  order_steps: "Cara Order",
  closing_campaign: "Closing Campaign"
};

function validTarget(value?: string | null) {
  return !value?.trim() || safeJerseyHref(value, "__invalid__") !== "__invalid__";
}

export function JerseyExperienceAdmin() {
  const [sections, setSections] = useState<CmsBanner[]>([]);
  const [media, setMedia] = useState<MediaChoice[]>([]);
  const [form, setForm] = useState<CmsBanner>({ ...emptySection });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [scheduleAt, setScheduleAt] = useState("");
  const [orderSteps, setOrderSteps] = useState(JERSEY_ORDER_STEPS.join("\n"));
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadData() {
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setLoading(true);
    const [sectionResult, mediaResult] = await Promise.all([
      supabase.from("cms_banners").select("*").eq("experience_key", "jersey").order("sort_order", { ascending: true }),
      supabase.from("media_assets").select("id,name,public_url,media_type").eq("status_aktif", true).order("created_at", { ascending: false })
    ]);
    setLoading(false);
    if (sectionResult.error) {
      setMessage(`CMS Jersey belum siap: ${sectionResult.error.message}`);
      return;
    }
    setSections((sectionResult.data || []) as CmsBanner[]);
    setMedia((mediaResult.data || []) as MediaChoice[]);
    setMessage("");
  }

  useEffect(() => { void loadData(); }, []);

  const compatibleMedia = useMemo(
    () => media.filter((asset) => asset.media_type === form.media_type),
    [form.media_type, media]
  );

  function update<K extends keyof CmsBanner>(key: K, value: CmsBanner[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function reset() {
    setEditingId(null);
    setScheduleAt("");
    setOrderSteps(JERSEY_ORDER_STEPS.join("\n"));
    setForm({ ...emptySection });
  }

  function edit(section: CmsBanner) {
    setEditingId(section.id || null);
    setForm({ ...emptySection, ...section });
    const items = section.metadata?.items;
    setOrderSteps(Array.isArray(items) ? items.filter((item): item is string => typeof item === "string").join("\n") : JERSEY_ORDER_STEPS.join("\n"));
    setScheduleAt(section.publish_at ? new Date(section.publish_at).toISOString().slice(0, 16) : "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const mode = (submitter?.value || "draft") as SaveMode;
    if (!form.name.trim() || !form.title.trim() || !form.section_key?.trim()) {
      setMessage("Nama internal, section key, dan headline wajib diisi.");
      return;
    }
    if (form.section_type !== "order_steps" && !form.desktop_media_url.trim()) {
      setMessage("Media desktop wajib diisi untuk campaign visual.");
      return;
    }
    if (!validTarget(form.cta_url) || !validTarget(form.secondary_cta_url)) {
      setMessage("CTA ditolak karena tidak mengarah ke route resmi Jersey, produk, help, atau WhatsApp.");
      return;
    }
    if (mode === "scheduled" && !scheduleAt) {
      setMessage("Tanggal dan waktu publish wajib diisi untuk penjadwalan.");
      return;
    }

    const payload = {
      name: form.name.trim(), media_type: form.media_type,
      desktop_media_url: form.desktop_media_url.trim() || "/brand/debroder/social-preview.png",
      mobile_media_url: form.mobile_media_url?.trim() || null,
      poster_url: form.poster_url?.trim() || null,
      eyebrow: form.eyebrow.trim(), title: form.title.trim(), subtitle: form.subtitle.trim(),
      cta_label: form.cta_label.trim(), cta_url: form.cta_url.trim(),
      secondary_cta_label: form.secondary_cta_label?.trim() || "",
      secondary_cta_url: form.secondary_cta_url?.trim() || "",
      text_position: form.text_position || "left", experience_key: "jersey",
      section_type: form.section_type, section_key: form.section_key?.trim() || "",
      image_alt: form.image_alt?.trim() || form.title.trim(),
      object_position: form.object_position || "center center",
      mobile_object_position: form.mobile_object_position || "center center",
      focal_x: Number(form.focal_x ?? 50), focal_y: Number(form.focal_y ?? 50), focal_zoom: Number(form.focal_zoom ?? 1),
      mobile_focal_x: Number(form.mobile_focal_x ?? 50), mobile_focal_y: Number(form.mobile_focal_y ?? 50), mobile_focal_zoom: Number(form.mobile_focal_zoom ?? 1),
      metadata: form.section_type === "order_steps"
        ? { items: orderSteps.split("\n").map((item) => item.trim()).filter(Boolean) }
        : (form.metadata || {}),
      is_active: form.is_active, sort_order: Number(form.sort_order)
    };

    const supabase = createSupabaseClient();
    if (!supabase) return;
    setSaving(true);
    let contentId = editingId;
    if (!contentId) {
      const inserted = await supabase.from("cms_banners").insert({ ...payload, status: "draft" }).select("id").single();
      if (inserted.error || !inserted.data?.id) {
        setSaving(false);
        setMessage(`Section gagal dibuat: ${inserted.error?.message || "ID tidak tersedia"}`);
        return;
      }
      contentId = String(inserted.data.id);
    }

    const result = mode === "published"
      ? await publishCmsNow(supabase, "cms_banners", contentId, payload)
      : mode === "scheduled"
        ? await scheduleCmsPublish(supabase, "cms_banners", contentId, payload, scheduleAt)
        : await saveCmsDraft(supabase, "cms_banners", contentId, payload);
    setSaving(false);
    if (!result.success) {
      setMessage(`Section gagal disimpan: ${result.error.message}`);
      return;
    }
    setMessage(mode === "published" ? "Section dipublikasikan." : mode === "scheduled" ? "Section dijadwalkan." : "Draft section disimpan.");
    reset();
    await loadData();
  }

  async function lifecycle(section: CmsBanner, action: "archive" | "restore") {
    if (!section.id) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;
    const result = action === "archive"
      ? await archiveCmsContent(supabase, "cms_banners", section.id)
      : await restoreCmsDraft(supabase, "cms_banners", section.id);
    setMessage(result.success ? (action === "archive" ? "Section diarsipkan." : "Section dipulihkan sebagai draft.") : result.error.message);
    if (result.success) await loadData();
  }

  return (
    <main className="grid gap-6">
      <header className="bg-white p-5 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-green">Commerce Experience</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">CMS / Jersey</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-brand-charcoal/60">Kelola campaign `/jersey`. Hero tetap memakai Page Hero dengan key `jersey`; produk, harga, SKU, varian, dan stok tetap dikelola PIM.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/admin/page-hero" className="rounded-full bg-brand-green px-5 py-2.5 text-sm font-semibold text-white">Kelola Hero Jersey</Link>
          <Link href="/jersey" target="_blank" className="rounded-full border border-brand-softGray px-5 py-2.5 text-sm font-semibold">Preview `/jersey`</Link>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,.95fr)_minmax(0,1.05fr)]">
        <form onSubmit={save} className="bg-white p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div><h2 className="text-xl font-semibold">{editingId ? "Edit section" : "Section baru"}</h2><span className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${cmsBadgeClass(form)}`}>{cmsStatusLabel(form)}</span></div>
            {editingId ? <button type="button" onClick={reset} className="text-sm font-semibold underline">Batal</button> : null}
          </div>
          {message ? <p role="status" className="mt-4 bg-brand-offWhite p-3 text-sm font-semibold">{message}</p> : null}
          <div className="mt-5 grid gap-4">
            <Field label="Tipe section"><select value={form.section_type} onChange={(event) => update("section_type", event.target.value)}>{JERSEY_SECTION_TYPES.map((type) => <option key={type} value={type}>{typeLabels[type]}</option>)}</select></Field>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Nama internal"><input value={form.name} onChange={(event) => update("name", event.target.value)} /></Field><Field label="Section key"><input value={form.section_key || ""} onChange={(event) => update("section_key", event.target.value)} placeholder="football" /></Field></div>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Tipe media"><select value={form.media_type} onChange={(event) => update("media_type", event.target.value as CmsBanner["media_type"])}><option value="image">Image</option><option value="video">Video</option></select></Field><Field label="Sort order"><input type="number" value={form.sort_order} onChange={(event) => update("sort_order", Number(event.target.value))} /></Field></div>
            {form.section_type !== "order_steps" ? <>
              <Field label="Media desktop dari Media Library"><select value={form.desktop_media_url} onChange={(event) => update("desktop_media_url", event.target.value)}><option value="">Pilih media...</option>{compatibleMedia.map((asset) => <option key={asset.id} value={asset.public_url}>{asset.name}</option>)}</select></Field>
              <Field label="URL media desktop"><input value={form.desktop_media_url} onChange={(event) => update("desktop_media_url", event.target.value)} placeholder="/brand/... atau https://..." /></Field>
              <Field label="Media mobile dari Media Library"><select value={form.mobile_media_url || ""} onChange={(event) => update("mobile_media_url", event.target.value)}><option value="">Gunakan desktop</option>{compatibleMedia.map((asset) => <option key={asset.id} value={asset.public_url}>{asset.name}</option>)}</select></Field>
              <Field label="URL media mobile"><input value={form.mobile_media_url || ""} onChange={(event) => update("mobile_media_url", event.target.value)} /></Field>
              <Field label="Alt text"><input value={form.image_alt || ""} onChange={(event) => update("image_alt", event.target.value)} /></Field>
              <div className="grid gap-4 sm:grid-cols-2"><Field label="Focal desktop"><input value={form.object_position || ""} onChange={(event) => update("object_position", event.target.value)} placeholder="50% 50%" /></Field><Field label="Focal mobile"><input value={form.mobile_object_position || ""} onChange={(event) => update("mobile_object_position", event.target.value)} placeholder="50% 50%" /></Field></div>
            </> : null}
            <Field label="Eyebrow"><input value={form.eyebrow} onChange={(event) => update("eyebrow", event.target.value)} /></Field>
            <Field label="Headline"><input value={form.title} onChange={(event) => update("title", event.target.value)} /></Field>
            <Field label="Supporting copy"><textarea rows={3} value={form.subtitle} onChange={(event) => update("subtitle", event.target.value)} /></Field>
            {form.section_type === "order_steps" ? <Field label="Langkah (satu per baris)"><textarea rows={9} value={orderSteps} onChange={(event) => setOrderSteps(event.target.value)} /></Field> : null}
            <div className="grid gap-4 sm:grid-cols-2"><Field label="CTA utama"><input value={form.cta_label} onChange={(event) => update("cta_label", event.target.value)} /></Field><Field label="Target CTA utama"><input value={form.cta_url} onChange={(event) => update("cta_url", event.target.value)} placeholder="/jersey/shop" /></Field></div>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="CTA kedua"><input value={form.secondary_cta_label || ""} onChange={(event) => update("secondary_cta_label", event.target.value)} /></Field><Field label="Target CTA kedua"><input value={form.secondary_cta_url || ""} onChange={(event) => update("secondary_cta_url", event.target.value)} placeholder="/jersey/configurator" /></Field></div>
            <label className="flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.is_active} onChange={(event) => update("is_active", event.target.checked)} className="h-4 w-4 accent-brand-green" />Visible saat status sudah tayang</label>
            <Field label="Jadwal publish"><input type="datetime-local" value={scheduleAt} onChange={(event) => setScheduleAt(event.target.value)} /></Field>
            <div className="flex flex-wrap gap-3"><SaveButton value="draft" disabled={saving}>Simpan Draft</SaveButton><SaveButton value="scheduled" disabled={saving}>Schedule</SaveButton><SaveButton value="published" primary disabled={saving}>Publish</SaveButton></div>
          </div>
        </form>

        <section className="bg-white p-5 sm:p-7">
          <h2 className="text-xl font-semibold">Section Jersey</h2>
          <p className="mt-1 text-sm text-brand-charcoal/55">Urutan publik dikunci oleh tipe section; sort order mengatur item di dalam tipe yang sama.</p>
          {loading ? <div className="mt-5 h-40 animate-pulse bg-brand-offWhite" /> : sections.length ? <div className="mt-5 grid gap-4">{sections.map((section) => (
            <article key={section.id} className="grid gap-4 border border-brand-softGray p-4 sm:grid-cols-[96px_1fr_auto] sm:items-center">
              <div className="aspect-[4/5] overflow-hidden bg-brand-offWhite">{section.desktop_media_url ? <img src={section.desktop_media_url} alt={section.image_alt || section.title} className="h-full w-full object-cover" style={{ objectPosition: section.object_position }} /> : null}</div>
              <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-green">{typeLabels[section.section_type || ""] || section.section_type}</p><h3 className="mt-1 truncate font-semibold">{section.title}</h3><p className="mt-1 truncate text-xs text-brand-charcoal/50">{section.section_key} · sort {section.sort_order}</p><span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${cmsBadgeClass(section)}`}>{cmsStatusLabel(section)}</span></div>
              <div className="flex flex-wrap gap-2 sm:flex-col"><button type="button" onClick={() => edit(section)} className="rounded-full border border-brand-softGray px-4 py-2 text-xs font-semibold">Edit</button>{section.status === "archived" ? <button type="button" onClick={() => void lifecycle(section, "restore")} className="rounded-full px-4 py-2 text-xs font-semibold text-brand-green">Restore</button> : <button type="button" onClick={() => void lifecycle(section, "archive")} className="rounded-full px-4 py-2 text-xs font-semibold text-red-700">Archive</button>}</div>
            </article>
          ))}</div> : <p className="mt-5 bg-brand-offWhite p-5 text-sm text-brand-charcoal/60">Belum ada section Jersey. Halaman publik tetap memakai fallback aset dan konten existing hingga campaign dipublikasikan.</p>}
        </section>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-2 text-sm font-semibold [&_input]:min-h-11 [&_input]:rounded-lg [&_input]:border [&_input]:border-brand-softGray [&_input]:px-4 [&_select]:min-h-11 [&_select]:rounded-lg [&_select]:border [&_select]:border-brand-softGray [&_select]:bg-white [&_select]:px-4 [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-brand-softGray [&_textarea]:p-4 [&_input]:font-normal [&_select]:font-normal [&_textarea]:font-normal">{label}{children}</label>;
}

function SaveButton({ value, children, primary = false, disabled }: { value: SaveMode; children: ReactNode; primary?: boolean; disabled: boolean }) {
  return <button type="submit" value={value} disabled={disabled} className={`min-h-11 rounded-full px-5 text-sm font-semibold disabled:opacity-50 ${primary ? "bg-brand-green text-white" : "border border-brand-charcoal"}`}>{children}</button>;
}
