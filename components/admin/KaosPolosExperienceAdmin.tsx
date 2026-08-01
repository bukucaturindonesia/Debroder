/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import {
  FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";
import {
  archiveCmsContent,
  cmsBadgeClass,
  cmsStatusLabel,
  loadLatestCmsRevisions,
  mergeCmsRevision,
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

type SlotKey =
  | "featured-01"
  | "featured-02"
  | "banner-left"
  | "banner-right";

type SlotDefinition = {
  key: SlotKey;
  label: string;
  sectionType: KaosSectionType;
  sortOrder: number;
  description: string;
  recommendedDesktopSize: string;
  desktopAspectClass: string;
  allowsCopy: boolean;
};

const SLOT_DEFINITIONS: readonly SlotDefinition[] = [
  {
    key: "featured-01",
    label: "Featured 01",
    sectionType: "featured_editorial",
    sortOrder: 10,
    description: "Cerita editorial utama pertama. Gunakan foto kampanye rasio 4:5.",
    recommendedDesktopSize: "2000x2500",
    desktopAspectClass: "aspect-[4/5]",
    allowsCopy: true
  },
  {
    key: "featured-02",
    label: "Featured 02",
    sectionType: "featured_editorial",
    sortOrder: 20,
    description: "Cerita editorial utama kedua. Tampil berdampingan tanpa jarak.",
    recommendedDesktopSize: "2000x2500",
    desktopAspectClass: "aspect-[4/5]",
    allowsCopy: true
  },
  {
    key: "banner-left",
    label: "Banner kiri",
    sectionType: "banner_editorial_left",
    sortOrder: 30,
    description: "Area visual 25% pada desktop dan 32% pada mobile. Link Custom diatur otomatis.",
    recommendedDesktopSize: "400x500",
    desktopAspectClass: "aspect-[4/5]",
    allowsCopy: false
  },
  {
    key: "banner-right",
    label: "Banner kanan",
    sectionType: "banner_editorial_right",
    sortOrder: 40,
    description: "Area visual utama 75% pada desktop dan 68% pada mobile, dengan caption di bawah.",
    recommendedDesktopSize: "1200x500",
    desktopAspectClass: "aspect-[12/5]",
    allowsCopy: true
  }
] as const;

const POSITION_OPTIONS = [
  { value: "left top", label: "Kiri atas", glyph: "↖" },
  { value: "center top", label: "Tengah atas", glyph: "↑" },
  { value: "right top", label: "Kanan atas", glyph: "↗" },
  { value: "left center", label: "Kiri tengah", glyph: "←" },
  { value: "center center", label: "Tengah", glyph: "●" },
  { value: "right center", label: "Kanan tengah", glyph: "→" },
  { value: "left bottom", label: "Kiri bawah", glyph: "↙" },
  { value: "center bottom", label: "Tengah bawah", glyph: "↓" },
  { value: "right bottom", label: "Kanan bawah", glyph: "↘" }
] as const;

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

function sectionGroup(type: KaosSectionType) {
  return type === "featured_editorial" ? "featured" : "editorial-banner";
}

function sortSections(a: CmsBanner, b: CmsBanner) {
  return Number(a.sort_order) - Number(b.sort_order)
    || String(a.created_at || "").localeCompare(String(b.created_at || ""));
}

function createSlotForm(slot: SlotDefinition): CmsBanner {
  return {
    ...emptySection,
    name: slot.label,
    section_type: slot.sectionType,
    section_key: slot.key,
    section_group: sectionGroup(slot.sectionType),
    sort_order: slot.sortOrder,
    cta_label: slot.key === "banner-right" ? "Mulai Custom" : "",
    cta_url: slot.key === "banner-right" ? "/custom" : "",
    metadata: {
      slot_key: slot.key,
      recommended_desktop_size: slot.recommendedDesktopSize
    }
  };
}

function slotAssignments(sections: CmsBanner[]) {
  const featured = sections
    .filter((section) => section.status !== "archived" && section.section_type === "featured_editorial")
    .sort(sortSections);
  const left = sections
    .filter((section) => section.status !== "archived" && section.section_type === "banner_editorial_left")
    .sort(sortSections);
  const right = sections
    .filter((section) => section.status !== "archived" && section.section_type === "banner_editorial_right")
    .sort(sortSections);

  return new Map<SlotKey, CmsBanner | undefined>([
    ["featured-01", featured[0]],
    ["featured-02", featured[1]],
    ["banner-left", left[0]],
    ["banner-right", right[0]]
  ]);
}

export function KaosPolosExperienceAdmin() {
  const [sections, setSections] = useState<CmsBanner[]>([]);
  const [media, setMedia] = useState<MediaChoice[]>([]);
  const [activeSlotKey, setActiveSlotKey] = useState<SlotKey | null>(null);
  const [form, setForm] = useState<CmsBanner>({ ...emptySection });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    const supabase = createSupabaseClient();
    if (!supabase) {
      setLoading(false);
      setMessage("Layanan data belum tersedia. Periksa konfigurasi Supabase.");
      return;
    }

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
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("media_assets")
        .select("id,name,public_url,media_type")
        .eq("status_aktif", true)
        .order("created_at", { ascending: false })
    ]);
    setLoading(false);

    if (sectionResult.error) {
      setMessage(`Konten Kaos Polos belum dapat dimuat: ${sectionResult.error.message}`);
      return;
    }

    const rows = (sectionResult.data || []) as CmsBanner[];
    const revisions = await loadLatestCmsRevisions(
      supabase,
      "cms_banners",
      ["draft", "scheduled"]
    );
    setSections(
      rows.map((section) =>
        section.id ? mergeCmsRevision(section, revisions.get(section.id)) : section
      )
    );
    setMedia((mediaResult.data || []) as MediaChoice[]);
    if (mediaResult.error) {
      setMessage(`Konten dimuat, tetapi Galeri Media belum tersedia: ${mediaResult.error.message}`);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const imageMedia = useMemo(
    () => media.filter((asset) => asset.media_type === "image"),
    [media]
  );
  const assignments = useMemo(() => slotAssignments(sections), [sections]);
  const assignedIds = useMemo(
    () => new Set(
      Array.from(assignments.values())
        .map((section) => section?.id)
        .filter((id): id is string => Boolean(id))
    ),
    [assignments]
  );
  const extraSections = useMemo(
    () => sections.filter((section) => section.id && !assignedIds.has(section.id)),
    [assignedIds, sections]
  );
  const activeSlot = SLOT_DEFINITIONS.find((slot) => slot.key === activeSlotKey) || null;

  function update<K extends keyof CmsBanner>(key: K, value: CmsBanner[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function openSlot(slot: SlotDefinition) {
    const section = assignments.get(slot.key);
    setActiveSlotKey(slot.key);
    setEditingId(section?.id || null);
    setForm(section
      ? {
          ...createSlotForm(slot),
          ...section,
          name: slot.label,
          section_type: slot.sectionType,
          section_key: slot.key,
          section_group: sectionGroup(slot.sectionType),
          sort_order: slot.sortOrder
        }
      : createSlotForm(slot));
    setMessage("");
    window.requestAnimationFrame(() => {
      document.getElementById("kaos-slot-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function closeEditor() {
    setActiveSlotKey(null);
    setEditingId(null);
    setForm({ ...emptySection });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeSlot) {
      setMessage("Pilih slot yang ingin dikelola terlebih dahulu.");
      return;
    }

    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const mode = submitter?.value === "published" ? "published" : "draft";
    const sectionType = activeSlot.sectionType;

    if (!form.desktop_media_url.trim()) {
      setMessage("Pilih gambar desktop terlebih dahulu.");
      return;
    }
    if (mode === "published" && !form.image_alt?.trim()) {
      setMessage("Alt text wajib diisi sebelum dipublikasikan.");
      return;
    }
    if (
      mode === "published"
      && sectionType === "banner_editorial_right"
      && !form.title.trim()
    ) {
      setMessage("Judul banner kanan wajib diisi sebelum dipublikasikan.");
      return;
    }
    if (
      mode === "published"
      && form.cta_label.trim()
      && !form.cta_url.trim()
    ) {
      setMessage("URL CTA wajib diisi ketika tombol CTA digunakan.");
      return;
    }

    const payload = {
      name: activeSlot.label,
      media_type: "image" as const,
      desktop_media_url: form.desktop_media_url.trim(),
      mobile_media_url: form.mobile_media_url?.trim() || null,
      poster_url: null,
      eyebrow: activeSlot.allowsCopy ? form.eyebrow.trim() : "",
      title: activeSlot.allowsCopy ? form.title.trim() : "",
      subtitle: activeSlot.allowsCopy ? form.subtitle.trim() : "",
      cta_label: activeSlot.allowsCopy ? form.cta_label.trim() : "",
      cta_url: activeSlot.allowsCopy ? form.cta_url.trim() : "",
      text_position: "left" as const,
      experience_key: "kaos-polos",
      section_type: sectionType,
      section_key: activeSlot.key,
      section_group: sectionGroup(sectionType),
      section_heading: "",
      section_description: "",
      anchor_id: "",
      overlay_strength: 0,
      theme_variant: "light",
      image_alt: form.image_alt?.trim() || form.title.trim() || activeSlot.label,
      object_position: form.object_position?.trim() || "center center",
      mobile_object_position:
        form.mobile_object_position?.trim()
        || form.object_position?.trim()
        || "center center",
      metadata: {
        ...(form.metadata || {}),
        slot_key: activeSlot.key,
        recommended_desktop_size: activeSlot.recommendedDesktopSize
      },
      is_active: true,
      sort_order: activeSlot.sortOrder
    };

    const supabase = createSupabaseClient();
    if (!supabase) {
      setMessage("Layanan data belum tersedia. Periksa konfigurasi Supabase.");
      return;
    }

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
      setMessage(`Konten belum dapat disimpan: ${result.error.message}`);
      return;
    }

    setMessage(
      mode === "published"
        ? `${activeSlot.label} berhasil dipublikasikan.`
        : `${activeSlot.label} berhasil disimpan sebagai draft.`
    );
    closeEditor();
    await loadData();
  }

  async function toggleArchive(section: CmsBanner) {
    if (!section.id) return;
    const supabase = createSupabaseClient();
    if (!supabase) {
      setMessage("Layanan data belum tersedia. Periksa konfigurasi Supabase.");
      return;
    }

    const archived = section.status === "archived";
    const result = archived
      ? await restoreCmsDraft(supabase, "cms_banners", section.id)
      : await archiveCmsContent(supabase, "cms_banners", section.id);
    setMessage(
      result.success
        ? archived
          ? "Konten dipulihkan sebagai draft."
          : "Konten diarsipkan."
        : `Status konten belum dapat diubah: ${result.error.message}`
    );
    if (result.success) {
      closeEditor();
      await loadData();
    }
  }

  const previewRecord = (slotKey: SlotKey) =>
    activeSlotKey === slotKey ? form : assignments.get(slotKey);
  const bannerLeft = previewRecord("banner-left");
  const bannerRight = previewRecord("banner-right");

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      <section className="bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-charcoal/45">
              CMS / Kaos Polos
            </p>
            <h1 className="mt-2 text-2xl font-semibold">Editorial Kaos Polos</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-brand-charcoal/60">
              Pilih slot, atur gambar dan teks, lihat pratinjau, lalu simpan sebagai draft atau publikasikan.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/kaos-polos"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-brand-charcoal px-5 text-sm font-semibold"
            >
              Lihat Halaman
            </Link>
            <Link
              href="/admin/page-hero"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand-charcoal px-5 text-sm font-semibold text-white"
            >
              Kelola Hero
            </Link>
          </div>
        </div>
      </section>

      {message ? (
        <p role="status" className="bg-white p-4 text-sm font-semibold">
          {message}
        </p>
      ) : null}

      <section className="bg-white p-5 sm:p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Slot konten</h2>
            <p className="mt-2 text-sm text-brand-charcoal/55">
              Empat slot ini mengikuti urutan halaman publik. Field teknis diatur otomatis oleh sistem.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {SLOT_DEFINITIONS.map((slot) => (
              <div key={slot.key} className="h-64 animate-pulse bg-brand-offWhite" />
            ))}
          </div>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {SLOT_DEFINITIONS.map((slot) => {
              const section = assignments.get(slot.key);
              const archived = section?.status === "archived";
              return (
                <article
                  key={slot.key}
                  className={`overflow-hidden border bg-white ${
                    activeSlotKey === slot.key ? "border-brand-green ring-2 ring-brand-green/15" : "border-brand-softGray"
                  }`}
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-brand-offWhite">
                    {section?.desktop_media_url ? (
                      <img
                        src={section.desktop_media_url}
                        alt={section.image_alt || slot.label}
                        className="h-full w-full object-cover"
                        style={{ objectPosition: section.object_position || "center center" }}
                      />
                    ) : (
                      <div className="grid h-full place-items-center px-5 text-center text-sm font-semibold text-brand-charcoal/40">
                        Slot belum diisi
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">{slot.label}</h3>
                        <p className="mt-1 text-xs leading-5 text-brand-charcoal/55">{slot.description}</p>
                      </div>
                      {section ? (
                        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${cmsBadgeClass(section)}`}>
                          {cmsStatusLabel(section)}
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full border border-brand-softGray px-2.5 py-1 text-[10px] font-semibold text-brand-charcoal/45">
                          Kosong
                        </span>
                      )}
                    </div>
                    <div className="mt-4 flex gap-2">
                      {archived && section ? (
                        <button
                          type="button"
                          onClick={() => void toggleArchive(section)}
                          className="min-h-10 flex-1 rounded-full bg-brand-charcoal px-4 text-xs font-semibold text-white"
                        >
                          Pulihkan
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openSlot(slot)}
                          className="min-h-10 flex-1 rounded-full bg-brand-charcoal px-4 text-xs font-semibold text-white"
                        >
                          {section ? "Kelola" : "Isi Slot"}
                        </button>
                      )}
                      {section && !archived ? (
                        <button
                          type="button"
                          onClick={() => void toggleArchive(section)}
                          className="min-h-10 rounded-full px-3 text-xs font-semibold text-red-700"
                        >
                          Arsipkan
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="bg-white p-5 sm:p-6">
        <div>
          <h2 className="text-xl font-semibold">Pratinjau banner editorial</h2>
          <p className="mt-2 text-sm text-brand-charcoal/55">
            Desktop memakai komposisi 25% : 75%. Mobile tetap berdampingan dengan komposisi 32% : 68%.
          </p>
        </div>
        <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <BannerPairPreview left={bannerLeft} right={bannerRight} mode="desktop" />
          <BannerPairPreview left={bannerLeft} right={bannerRight} mode="mobile" />
        </div>
      </section>

      {activeSlot ? (
        <form id="kaos-slot-editor" onSubmit={save} className="scroll-mt-24 bg-white p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-charcoal/45">
                Editor slot
              </p>
              <h2 className="mt-2 text-xl font-semibold">{activeSlot.label}</h2>
              <p className="mt-2 text-sm leading-6 text-brand-charcoal/55">{activeSlot.description}</p>
            </div>
            <button type="button" onClick={closeEditor} className="self-start text-sm font-semibold underline underline-offset-4">
              Tutup Editor
            </button>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,.9fr)_minmax(360px,1.1fr)]">
            <div className="grid content-start gap-5">
              <MediaPicker
                label="Gambar desktop"
                value={form.desktop_media_url}
                media={imageMedia}
                onChange={(value) => update("desktop_media_url", value)}
                required
              />
              <MediaPicker
                label="Gambar mobile"
                value={form.mobile_media_url || ""}
                media={imageMedia}
                onChange={(value) => update("mobile_media_url", value)}
                helper="Kosongkan untuk memakai gambar desktop. Gambar mobile khusus memberi hasil crop yang lebih baik."
              />
              <Field label="Alt text">
                <input
                  value={form.image_alt || ""}
                  onChange={(event) => update("image_alt", event.target.value)}
                  placeholder="Contoh: Pria memakai kaos polos hitam dengan gaya kasual"
                />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <PositionPicker
                  label="Fokus desktop"
                  value={form.object_position || "center center"}
                  onChange={(value) => update("object_position", value)}
                />
                <PositionPicker
                  label="Fokus mobile"
                  value={form.mobile_object_position || "center center"}
                  onChange={(value) => update("mobile_object_position", value)}
                />
              </div>

              {activeSlot.allowsCopy ? (
                <>
                  <Field label="Eyebrow (opsional)">
                    <input value={form.eyebrow} onChange={(event) => update("eyebrow", event.target.value)} />
                  </Field>
                  <Field label="Judul (opsional untuk Featured)">
                    <input value={form.title} onChange={(event) => update("title", event.target.value)} />
                  </Field>
                  <Field label="Deskripsi (opsional)">
                    <textarea rows={3} value={form.subtitle} onChange={(event) => update("subtitle", event.target.value)} />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="CTA singkat (opsional)">
                      <input value={form.cta_label} onChange={(event) => update("cta_label", event.target.value)} />
                    </Field>
                    <Field label="URL CTA (opsional)">
                      <input value={form.cta_url} onChange={(event) => update("cta_url", event.target.value)} placeholder="/custom" />
                    </Field>
                  </div>
                </>
              ) : (
                <p className="bg-brand-offWhite p-4 text-sm leading-6 text-brand-charcoal/65">
                  Banner kiri otomatis mengarah ke halaman Custom Kaos Polos. Tidak ada teks atau URL yang perlu diisi.
                </p>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  name="save_mode"
                  value="draft"
                  disabled={saving}
                  className="min-h-11 rounded-full border border-brand-charcoal px-6 text-sm font-semibold disabled:opacity-50"
                >
                  {saving ? "Menyimpan..." : "Simpan Draft"}
                </button>
                <button
                  type="submit"
                  name="save_mode"
                  value="published"
                  disabled={saving}
                  className="min-h-11 rounded-full bg-brand-green px-6 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {saving ? "Menerbitkan..." : "Simpan & Publish"}
                </button>
              </div>
            </div>

            <SlotPreview slot={activeSlot} form={form} />
          </div>
        </form>
      ) : null}

      {extraSections.length ? (
        <section className="bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Konten tambahan yang tidak dipakai</h2>
          <p className="mt-2 text-sm text-brand-charcoal/55">
            Halaman publik hanya memakai dua Featured, satu banner kiri, dan satu banner kanan. Arsipkan duplikat agar pengelolaan tetap rapi.
          </p>
          <div className="mt-4 grid gap-3">
            {extraSections.map((section) => (
              <article key={section.id} className="flex flex-col gap-3 border border-brand-softGray p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">{section.name || section.section_type}</p>
                  <p className="mt-1 text-xs text-brand-charcoal/50">{cmsStatusLabel(section)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void toggleArchive(section)}
                  className="min-h-10 rounded-full px-4 text-xs font-semibold text-red-700"
                >
                  {section.status === "archived" ? "Pulihkan" : "Arsipkan"}
                </button>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function MediaPicker({
  label,
  value,
  media,
  onChange,
  helper,
  required = false
}: {
  label: string;
  value: string;
  media: MediaChoice[];
  onChange: (value: string) => void;
  helper?: string;
  required?: boolean;
}) {
  return (
    <div className="grid gap-2">
      <label className="grid gap-2 text-sm font-semibold">
        <span>{label}{required ? " *" : ""}</span>
        <select
          value={media.some((asset) => asset.public_url === value) ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-11 rounded-lg border border-brand-softGray bg-white px-4 text-sm font-normal"
        >
          <option value="">{required ? "Pilih dari Galeri Media..." : "Gunakan gambar desktop"}</option>
          {media.map((asset) => (
            <option key={asset.id} value={asset.public_url}>{asset.name}</option>
          ))}
        </select>
      </label>
      <details className="rounded-lg border border-brand-softGray p-3">
        <summary className="cursor-pointer text-xs font-semibold text-brand-charcoal/60">
          Gunakan URL gambar lain
        </summary>
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="https://... atau /brand/..."
          className="mt-3 min-h-11 w-full rounded-lg border border-brand-softGray px-4 text-sm"
        />
      </details>
      {helper ? <p className="text-xs leading-5 text-brand-charcoal/50">{helper}</p> : null}
    </div>
  );
}

function PositionPicker({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-semibold">{label}</legend>
      <div className="grid max-w-48 grid-cols-3 gap-1 rounded-lg border border-brand-softGray bg-brand-offWhite p-1">
        {POSITION_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-label={option.label}
            aria-pressed={value === option.value}
            title={option.label}
            onClick={() => onChange(option.value)}
            className={`grid h-11 place-items-center rounded-md text-sm transition ${
              value === option.value
                ? "bg-brand-charcoal text-white"
                : "bg-white text-brand-charcoal hover:bg-brand-softGray"
            }`}
          >
            {option.glyph}
          </button>
        ))}
      </div>
      <p className="text-xs text-brand-charcoal/45">{POSITION_OPTIONS.find((option) => option.value === value)?.label || value}</p>
    </fieldset>
  );
}

function BannerPairPreview({
  left,
  right,
  mode
}: {
  left?: CmsBanner;
  right?: CmsBanner;
  mode: "desktop" | "mobile";
}) {
  const mobile = mode === "mobile";
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-brand-charcoal/45">
        {mobile ? "Mobile" : "Desktop"}
      </p>
      <div
        className={`grid overflow-hidden border border-brand-softGray bg-brand-offWhite ${
          mobile
            ? "h-52 grid-cols-[32fr_68fr]"
            : "aspect-[16/5] grid-cols-[1fr_3fr]"
        }`}
        style={{ gap: "1px" }}
      >
        <PreviewMedia section={left} mobile={mobile} label="Banner kiri belum diisi" />
        <PreviewMedia section={right} mobile={mobile} label="Banner kanan belum diisi" />
      </div>
    </div>
  );
}

function PreviewMedia({
  section,
  mobile,
  label
}: {
  section?: CmsBanner;
  mobile: boolean;
  label: string;
}) {
  const src = mobile
    ? section?.mobile_media_url || section?.desktop_media_url
    : section?.desktop_media_url;
  const position = mobile
    ? section?.mobile_object_position || section?.object_position || "center center"
    : section?.object_position || "center center";

  return (
    <div className="relative min-w-0 overflow-hidden bg-brand-offWhite">
      {src ? (
        <img src={src} alt={section?.image_alt || label} className="h-full w-full object-cover" style={{ objectPosition: position }} />
      ) : (
        <div className="grid h-full place-items-center px-3 text-center text-xs font-semibold text-brand-charcoal/35">
          {label}
        </div>
      )}
    </div>
  );
}

function SlotPreview({ slot, form }: { slot: SlotDefinition; form: CmsBanner }) {
  const mobileSrc = form.mobile_media_url || form.desktop_media_url;
  return (
    <aside className="grid content-start gap-5 rounded-lg bg-brand-offWhite p-4 sm:p-5">
      <div>
        <h3 className="font-semibold">Pratinjau slot</h3>
        <p className="mt-1 text-xs leading-5 text-brand-charcoal/50">
          Pratinjau membantu mengecek crop. Hasil akhir mengikuti ukuran layar dan komposisi halaman publik.
        </p>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-brand-charcoal/45">Desktop</p>
        <div className={`relative w-full overflow-hidden bg-brand-charcoal ${slot.desktopAspectClass}`}>
          {form.desktop_media_url ? (
            <img
              src={form.desktop_media_url}
              alt={form.image_alt || `Pratinjau ${slot.label}`}
              className="h-full w-full object-cover"
              style={{ objectPosition: form.object_position || "center center" }}
            />
          ) : (
            <div className="grid h-full min-h-56 place-items-center text-sm font-semibold text-white/50">Pilih gambar desktop</div>
          )}
        </div>
      </div>

      <div className="mx-auto w-full max-w-[360px]">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-brand-charcoal/45">Mobile</p>
        <div className="relative aspect-[4/5] w-full overflow-hidden bg-brand-charcoal">
          {mobileSrc ? (
            <img
              src={mobileSrc}
              alt={form.image_alt || `Pratinjau mobile ${slot.label}`}
              className="h-full w-full object-cover"
              style={{ objectPosition: form.mobile_object_position || form.object_position || "center center" }}
            />
          ) : (
            <div className="grid h-full place-items-center text-sm font-semibold text-white/50">Pilih gambar</div>
          )}
        </div>
      </div>
    </aside>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-semibold [&_input]:min-h-11 [&_input]:rounded-lg [&_input]:border [&_input]:border-brand-softGray [&_input]:px-4 [&_input]:font-normal [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-brand-softGray [&_textarea]:p-4 [&_textarea]:font-normal">
      {label}
      {children}
    </label>
  );
}
