/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
  archiveCmsContent,
  cmsBadgeClass,
  cmsStatusLabel,
  publishCmsNow,
  restoreCmsDraft,
  saveCmsDraft
} from "@/lib/cms-workflow";
import { createSupabaseClient } from "@/lib/supabase";
import type { CmsBanner } from "@/lib/types";

type MediaChoice = {
  id: string;
  name: string;
  public_url: string;
  media_type: "image" | "video";
};

type KaosSectionType =
  | "featured_editorial"
  | "banner_editorial_left"
  | "banner_editorial_right";

const sectionLabels: Record<KaosSectionType, string> = {
  featured_editorial: "Featured editorial",
  banner_editorial_left: "Banner kiri 400 × 500",
  banner_editorial_right: "Banner kanan 1200 × 500"
};

const sectionNotes: Record<KaosSectionType, string> = {
  featured_editorial: "Gunakan maksimal dua item. Media desktop disarankan 2000 × 2500 px (4:5).",
  banner_editorial_left: "Seluruh gambar menjadi link ke halaman Custom Kaos Polos. Media desktop disarankan 400 × 500 px.",
  banner_editorial_right: "Gambar tidak dapat diklik. Judul, deskripsi, dan CTA ditampilkan sebagai caption di bawah. Media desktop disarankan 1200 × 500 px."
};

function sectionGroup(type: KaosSectionType) {
  return type === "featured_editorial" ? "featured" : "editorial-banner";
}

const emptySection: CmsBanner = {
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
  text_position: "left",
  experience_key: "kaos-polos",
  section_type: "featured_editorial",
  section_key: "",
  section_group: "featured",
  section_heading: "",
  section_description: "",
  anchor_id: "",
  overlay_strength: 0,
  theme_variant: "light",
  image_alt: "",
  object_position: "center center",
  mobile_object_position: "center center",
  metadata: {},
  is_active: true,
  sort_order: 10,
  status: "draft"
};

function isKaosSectionType(value?: string | null): value is KaosSectionType {
  return value === "featured_editorial"
    || value === "banner_editorial_left"
    || value === "banner_editorial_right";
}

export function KaosPolosExperienceAdmin() {
  const [sections, setSections] = useState<CmsBanner[]>([]);
  const [media, setMedia] = useState<MediaChoice[]>([]);
  const [form, setForm] = useState<CmsBanner>({ ...emptySection });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setLoading(true);
    const [sectionResult, mediaResult] = await Promise.all([
      supabase
        .from("cms_banners")
        .select("*")
        .eq("experience_key", "kaos-polos")
        .in("section_type", [
          "featured_editorial",
          "banner_editorial_left",
          "banner_editorial_right"
        ])
        .order("sort_order", { ascending: true }),
      supabase
        .from("media_assets")
        .select("id,name,public_url,media_type")
        .eq("status_aktif", true)
        .order("created_at", { ascending: false })
    ]);
    setLoading(false);

    if (sectionResult.error) {
      setMessage("Konten Kaos Polos belum dapat dimuat. Coba lagi.");
      return;
    }

    setSections((sectionResult.data || []) as CmsBanner[]);
    setMedia((mediaResult.data || []) as MediaChoice[]);
    setMessage("");
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const imageMedia = useMemo(
    () => media.filter((asset) => asset.media_type === "image"),
    [media]
  );
  const selectedType = isKaosSectionType(form.section_type)
    ? form.section_type
    : "featured_editorial";

  function update<K extends keyof CmsBanner>(key: K, value: CmsBanner[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateSectionType(type: KaosSectionType) {
    setForm((current) => ({
      ...current,
      section_type: type,
      section_group: sectionGroup(type),
      cta_label: type === "banner_editorial_left" ? "" : current.cta_label,
      cta_url: type === "banner_editorial_left" ? "" : current.cta_url
    }));
  }

  function reset() {
    setEditingId(null);
    setForm({ ...emptySection });
  }

  function edit(section: CmsBanner) {
    const sectionType = isKaosSectionType(section.section_type)
      ? section.section_type
      : "featured_editorial";
    setEditingId(section.id || null);
    setForm({
      ...emptySection,
      ...section,
      section_type: sectionType,
      section_group: sectionGroup(sectionType)
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const mode = submitter?.value === "published" ? "published" : "draft";
    const sectionType = isKaosSectionType(form.section_type)
      ? form.section_type
      : "featured_editorial";

    if (!form.name.trim() || !form.desktop_media_url.trim()) {
      setMessage("Nama internal dan media desktop wajib diisi.");
      return;
    }
    if (mode === "published" && !form.image_alt?.trim()) {
      setMessage("Alt text wajib diisi sebelum publish.");
      return;
    }
    if (
      mode === "published"
      && sectionType === "banner_editorial_right"
      && !form.title.trim()
    ) {
      setMessage("Judul caption banner kanan wajib diisi sebelum publish.");
      return;
    }
    if (
      mode === "published"
      && form.cta_label.trim()
      && !form.cta_url.trim()
    ) {
      setMessage("URL CTA wajib diisi ketika label CTA digunakan.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      media_type: "image" as const,
      desktop_media_url: form.desktop_media_url.trim(),
      mobile_media_url: form.mobile_media_url?.trim() || null,
      poster_url: null,
      eyebrow: form.eyebrow.trim(),
      title: form.title.trim(),
      subtitle: form.subtitle.trim(),
      cta_label: sectionType === "banner_editorial_left" ? "" : form.cta_label.trim(),
      cta_url: sectionType === "banner_editorial_left" ? "" : form.cta_url.trim(),
      text_position: form.text_position || "left",
      experience_key: "kaos-polos",
      section_type: sectionType,
      section_key: form.section_key?.trim() || `${sectionType}-${Number(form.sort_order)}`,
      section_group: sectionGroup(sectionType),
      section_heading: form.section_heading?.trim() || "",
      section_description: form.section_description?.trim() || "",
      anchor_id: form.anchor_id?.trim() || "",
      overlay_strength: 0,
      theme_variant: "light",
      image_alt: form.image_alt?.trim() || form.title.trim() || form.name.trim(),
      object_position: form.object_position?.trim() || "center center",
      mobile_object_position: form.mobile_object_position?.trim() || form.object_position?.trim() || "center center",
      metadata: {
        ...(form.metadata || {}),
        recommended_desktop_size:
          sectionType === "banner_editorial_left"
            ? "400x500"
            : sectionType === "banner_editorial_right"
              ? "1200x500"
              : "2000x2500"
      },
      is_active: form.is_active,
      sort_order: Number(form.sort_order)
    };

    const supabase = createSupabaseClient();
    if (!supabase) return;
    setSaving(true);
    let contentId = editingId;

    if (!contentId) {
      const inserted = await supabase
        .from("cms_banners")
        .insert({
          ...payload,
          status: "draft",
          publish_at: null,
          published_at: null,
          archived_at: null
        })
        .select("id")
        .single();

      if (inserted.error || !inserted.data?.id) {
        setSaving(false);
        setMessage(`Konten gagal dibuat: ${inserted.error?.message || "ID tidak tersedia"}`);
        return;
      }
      contentId = String(inserted.data.id);
    }

    const result = mode === "published"
      ? await publishCmsNow(supabase, "cms_banners", contentId, payload)
      : await saveCmsDraft(supabase, "cms_banners", contentId, payload);

    setSaving(false);
    if (!result.success) {
      setMessage("Konten belum dapat disimpan. Periksa data lalu coba lagi.");
      return;
    }

    setMessage(
      mode === "published"
        ? "Konten Kaos Polos disimpan dan dipublikasikan."
        : "Konten Kaos Polos disimpan sebagai draft."
    );
    reset();
    await loadData();
  }

  async function toggleArchive(section: CmsBanner) {
    if (!section.id) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;
    const archived = section.status === "archived";
    const result = archived
      ? await restoreCmsDraft(supabase, "cms_banners", section.id)
      : await archiveCmsContent(supabase, "cms_banners", section.id);
    setMessage(
      result.success
        ? archived
          ? "Konten dipulihkan sebagai draft."
          : "Konten diarsipkan."
        : "Status konten belum dapat diubah."
    );
    if (result.success) await loadData();
  }

  return (
    <div className="space-y-6">
      <section className="bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-charcoal/45">
              CMS / Kaos Polos
            </p>
            <h1 className="mt-2 text-2xl font-semibold">Editorial Kaos Polos</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-brand-charcoal/60">
              Kelola dua Featured editorial serta pasangan banner 400 × 500 dan 1200 × 500. Hero tetap dikelola melalui Hero Halaman dengan page key <code>kaos-polos</code>.
            </p>
          </div>
          <Link
            href="/admin/page-hero"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand-charcoal px-5 text-sm font-semibold text-white"
          >
            Kelola Hero
          </Link>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
        <form onSubmit={save} className="bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">{editingId ? "Edit editorial" : "Tambah editorial"}</h2>
              <span className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${cmsBadgeClass(form)}`}>
                {cmsStatusLabel(form)}
              </span>
            </div>
            {editingId ? (
              <button type="button" onClick={reset} className="text-sm font-semibold underline">
                Batal
              </button>
            ) : null}
          </div>

          {message ? (
            <p role="status" className="mt-4 bg-brand-offWhite p-3 text-sm font-semibold">
              {message}
            </p>
          ) : null}

          <div className="mt-5 grid gap-4">
            <Field label="Jenis konten">
              <select value={selectedType} onChange={(event) => updateSectionType(event.target.value as KaosSectionType)}>
                {Object.entries(sectionLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </Field>
            <p className="bg-brand-offWhite p-3 text-xs leading-5 text-brand-charcoal/65">
              {sectionNotes[selectedType]}
            </p>
            <Field label="Nama internal">
              <input value={form.name} onChange={(event) => update("name", event.target.value)} />
            </Field>
            <Field label="Media desktop dari Galeri Media">
              <select value={form.desktop_media_url} onChange={(event) => update("desktop_media_url", event.target.value)}>
                <option value="">Pilih gambar...</option>
                {imageMedia.map((asset) => (
                  <option key={asset.id} value={asset.public_url}>{asset.name}</option>
                ))}
              </select>
            </Field>
            <Field label="URL gambar desktop">
              <input value={form.desktop_media_url} onChange={(event) => update("desktop_media_url", event.target.value)} placeholder="https://... atau /brand/..." />
            </Field>
            <Field label="Media mobile dari Galeri Media (opsional)">
              <select value={form.mobile_media_url || ""} onChange={(event) => update("mobile_media_url", event.target.value)}>
                <option value="">Gunakan gambar desktop</option>
                {imageMedia.map((asset) => (
                  <option key={asset.id} value={asset.public_url}>{asset.name}</option>
                ))}
              </select>
            </Field>
            <Field label="URL gambar mobile (opsional)">
              <input value={form.mobile_media_url || ""} onChange={(event) => update("mobile_media_url", event.target.value)} />
            </Field>
            <Field label="Alt text">
              <input value={form.image_alt || ""} onChange={(event) => update("image_alt", event.target.value)} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Posisi gambar desktop">
                <input value={form.object_position || "center center"} onChange={(event) => update("object_position", event.target.value)} placeholder="center center" />
              </Field>
              <Field label="Posisi gambar mobile">
                <input value={form.mobile_object_position || "center center"} onChange={(event) => update("mobile_object_position", event.target.value)} placeholder="center center" />
              </Field>
            </div>

            {selectedType !== "banner_editorial_left" ? (
              <>
                <Field label="Eyebrow (opsional)">
                  <input value={form.eyebrow} onChange={(event) => update("eyebrow", event.target.value)} />
                </Field>
                <Field label="Judul">
                  <input value={form.title} onChange={(event) => update("title", event.target.value)} />
                </Field>
                <Field label="Deskripsi (opsional)">
                  <textarea rows={3} value={form.subtitle} onChange={(event) => update("subtitle", event.target.value)} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Label CTA (opsional)">
                    <input value={form.cta_label} onChange={(event) => update("cta_label", event.target.value)} />
                  </Field>
                  <Field label="URL CTA (opsional)">
                    <input value={form.cta_url} onChange={(event) => update("cta_url", event.target.value)} />
                  </Field>
                </div>
              </>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Urutan">
                <input type="number" min="0" value={form.sort_order} onChange={(event) => update("sort_order", Number(event.target.value))} />
              </Field>
              <label className="flex min-h-11 items-center gap-2 text-sm font-semibold sm:self-end">
                <input type="checkbox" checked={form.is_active} onChange={(event) => update("is_active", event.target.checked)} className="h-4 w-4 accent-brand-green" />
                Aktif
              </label>
            </div>

            {form.desktop_media_url ? (
              <div className="overflow-hidden border border-brand-softGray bg-brand-offWhite">
                <div className={`relative w-full overflow-hidden bg-brand-charcoal ${selectedType === "banner_editorial_right" ? "aspect-[12/5]" : "aspect-[4/5]"}`}>
                  <img src={form.desktop_media_url} alt={form.image_alt || "Pratinjau editorial Kaos Polos"} className="h-full w-full object-cover" style={{ objectPosition: form.object_position || "center center" }} />
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="submit" name="save_mode" value="draft" disabled={saving} className="min-h-11 rounded-full border border-brand-charcoal px-6 text-sm font-semibold disabled:opacity-50">
                {saving ? "Menyimpan..." : "Simpan Draft"}
              </button>
              <button type="submit" name="save_mode" value="published" disabled={saving} className="min-h-11 rounded-full bg-brand-green px-6 text-sm font-semibold text-white disabled:opacity-50">
                {saving ? "Menerbitkan..." : "Simpan & Publish"}
              </button>
            </div>
          </div>
        </form>

        <section className="bg-white p-5 sm:p-6">
          <h2 className="text-xl font-semibold">Konten aktif dan draft</h2>
          <p className="mt-2 text-sm text-brand-charcoal/55">
            Public page membaca hanya konten aktif yang sudah dipublish. Featured mengambil maksimal dua item berdasarkan urutan.
          </p>
          {loading ? (
            <div className="mt-5 h-32 animate-pulse bg-brand-offWhite" />
          ) : sections.length ? (
            <div className="mt-5 grid gap-4">
              {sections.map((section) => (
                <article key={section.id} className="grid gap-4 border border-brand-softGray p-4 sm:grid-cols-[120px_1fr_auto] sm:items-center">
                  <div className="relative aspect-[4/5] overflow-hidden bg-brand-charcoal">
                    <img src={section.desktop_media_url} alt={section.image_alt || section.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-charcoal/45">
                      {isKaosSectionType(section.section_type) ? sectionLabels[section.section_type] : section.section_type}
                    </p>
                    <h3 className="mt-2 truncate font-semibold">{section.name}</h3>
                    <p className="mt-1 truncate text-sm text-brand-charcoal/60">{section.title || "Tanpa caption"}</p>
                    <span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${cmsBadgeClass(section)}`}>
                      {cmsStatusLabel(section)}
                    </span>
                  </div>
                  <div className="flex gap-2 sm:flex-col">
                    <button type="button" onClick={() => edit(section)} className="rounded-full border border-brand-softGray px-4 py-2 text-xs font-semibold">
                      Edit
                    </button>
                    <button type="button" onClick={() => void toggleArchive(section)} className="rounded-full px-4 py-2 text-xs font-semibold text-red-700">
                      {section.status === "archived" ? "Pulihkan" : "Arsipkan"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-5 bg-brand-offWhite p-5 text-sm text-brand-charcoal/60">
              Belum ada editorial Kaos Polos. Tambahkan dua Featured, satu banner kiri, dan satu banner kanan.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-semibold [&_input]:min-h-11 [&_input]:rounded-lg [&_input]:border [&_input]:border-brand-softGray [&_input]:px-4 [&_input]:font-normal [&_select]:min-h-11 [&_select]:rounded-lg [&_select]:border [&_select]:border-brand-softGray [&_select]:bg-white [&_select]:px-4 [&_select]:font-normal [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-brand-softGray [&_textarea]:p-4 [&_textarea]:font-normal">
      {label}
      {children}
    </label>
  );
}
