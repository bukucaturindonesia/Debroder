/* eslint-disable @next/next/no-img-element */
"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { PLAIN_CATEGORY_SECTION_SETTING } from "@/lib/homepage-settings";
import { createSupabaseClient } from "@/lib/supabase";
import type { HomepageSection, HomepageSectionItem, Product, Service } from "@/lib/types";

type EditableSection = HomepageSection & { items: EditableItem[] };
type EditableItem = HomepageSectionItem & { product?: Product | null; service?: Service | null };
type MediaChoice = { id: string; name: string; public_url: string; media_type: "image" | "video" };
type CustomDraft = {
  custom_label: string;
  custom_title: string;
  custom_subtitle: string;
  custom_button_label: string;
  custom_link_url: string;
  custom_image_url: string;
  custom_mobile_image_url: string;
  custom_image_alt: string;
  custom_object_fit: "cover" | "contain";
  custom_object_position: string;
};

const customCardSectionSlugs = new Set(["featured", "trending", "services-products"]);
const productOnlySectionSlugs = new Set(["fresh-drops", PLAIN_CATEGORY_SECTION_SETTING.slug]);
const objectPositionOptions = [
  "center center",
  "center top",
  "center bottom",
  "left center",
  "right center",
  "left top",
  "left bottom",
  "right top",
  "right bottom"
];
const emptyCustomDraft: CustomDraft = {
  custom_label: "",
  custom_title: "",
  custom_subtitle: "",
  custom_button_label: "Lihat",
  custom_link_url: "",
  custom_image_url: "",
  custom_mobile_image_url: "",
  custom_image_alt: "",
  custom_object_fit: "cover",
  custom_object_position: "center center"
};
const requiredHomepageSections: Record<string, { title: string; sort_order: number }> = {
  featured: { title: "Featured", sort_order: 10 },
  trending: { title: "Trending", sort_order: 20 },
  "fresh-drops": { title: "Fresh Drops", sort_order: 30 },
  [PLAIN_CATEGORY_SECTION_SETTING.slug]: { title: PLAIN_CATEGORY_SECTION_SETTING.title, sort_order: PLAIN_CATEGORY_SECTION_SETTING.sortOrder },
  "services-products": { title: "Shop by Category", sort_order: 60 }
};
const homepageSectionSelect = `
  *,
  items:homepage_section_items(
    *,
    product:products(*),
    service:services(*)
  )
`;

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function itemName(item: EditableItem) {
  return item.custom_title || item.product?.nama || item.service?.nama || "Item tidak tersedia";
}

function itemImage(item: EditableItem) {
  return item.custom_image_url || item.product?.image_url || item.product?.gambar_url || item.service?.image_url || "/images/debroder/fallback/fallback-product.jpg";
}

function isCustomSection(section: EditableSection) {
  return customCardSectionSlugs.has(section.slug);
}

function isProductOnlySection(section: EditableSection) {
  return productOnlySectionSlugs.has(section.slug);
}

function isCustomItem(item: EditableItem) {
  return Boolean(item.custom_title || item.custom_image_url || item.custom_link_url);
}

function normalizeSection(section: EditableSection) {
  return {
    ...section,
    items: ((section.items || []) as unknown as EditableItem[]).sort((a, b) => a.sort_order - b.sort_order)
  } as EditableSection;
}

export function HomepageSectionsAdmin({ showPlainCategorySetting = true, onlySlug }: { showPlainCategorySetting?: boolean; onlySlug?: string }) {
  const [sections, setSections] = useState<EditableSection[]>([]);
  const [plainCategorySection, setPlainCategorySection] = useState<EditableSection | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [media, setMedia] = useState<MediaChoice[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newSortOrder, setNewSortOrder] = useState(0);
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [customDrafts, setCustomDrafts] = useState<Record<string, CustomDraft>>({});
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadData() {
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setLoading(true);
    const [sectionResult, productResult, serviceResult, mediaResult] = await Promise.all([
      supabase.from("homepage_sections").select(homepageSectionSelect).order("sort_order", { ascending: true }),
      supabase.from("products").select("*").order("urutan", { ascending: true }),
      supabase.from("services").select("*").order("urutan", { ascending: true }),
      supabase.from("media_assets").select("id,name,public_url,media_type").eq("status_aktif", true).eq("media_type", "image").order("created_at", { ascending: false })
    ]);

    if (sectionResult.error) {
      setLoading(false);
      setStatus(`Homepage Sections belum siap: ${sectionResult.error.message}`);
      return;
    }

    let normalized = ((sectionResult.data || []) as EditableSection[]).map(normalizeSection);
    let plainSetting = normalized.find((section) => section.slug === PLAIN_CATEGORY_SECTION_SETTING.slug) || null;
    let nextStatus = "";

    if (onlySlug && requiredHomepageSections[onlySlug] && !normalized.some((section) => section.slug === onlySlug)) {
      const required = requiredHomepageSections[onlySlug];
      const { data: insertedSection, error: insertError } = await supabase
        .from("homepage_sections")
        .upsert(
          { title: required.title, slug: onlySlug, sort_order: required.sort_order, is_active: true },
          { onConflict: "slug" }
        )
        .select(homepageSectionSelect)
        .maybeSingle();

      if (insertError) {
        nextStatus = `Section ${required.title} belum siap: ${insertError.message}`;
      } else if (insertedSection) {
        normalized = [...normalized, normalizeSection(insertedSection as EditableSection)].sort((a, b) => a.sort_order - b.sort_order);
      }
    }

    if (!plainSetting && showPlainCategorySetting) {
      const { data: insertedSetting, error: insertError } = await supabase
        .from("homepage_sections")
        .upsert(
          {
            title: PLAIN_CATEGORY_SECTION_SETTING.title,
            slug: PLAIN_CATEGORY_SECTION_SETTING.slug,
            sort_order: PLAIN_CATEGORY_SECTION_SETTING.sortOrder,
            is_active: true
          },
          { onConflict: "slug", ignoreDuplicates: true }
        )
        .select(homepageSectionSelect)
        .maybeSingle();

      if (insertError) {
        nextStatus = `Pengaturan section kategori belum siap: ${insertError.message}`;
      } else if (insertedSetting) {
        plainSetting = normalizeSection(insertedSetting as EditableSection);
        normalized = [...normalized, plainSetting].sort((a, b) => a.sort_order - b.sort_order);
      } else {
        const { data: existingSetting, error: existingError } = await supabase
          .from("homepage_sections")
          .select(homepageSectionSelect)
          .eq("slug", PLAIN_CATEGORY_SECTION_SETTING.slug)
          .maybeSingle();

        if (existingError) {
          nextStatus = `Pengaturan section kategori belum siap: ${existingError.message}`;
        } else if (existingSetting) {
          plainSetting = normalizeSection(existingSetting as EditableSection);
          normalized = [...normalized, plainSetting].sort((a, b) => a.sort_order - b.sort_order);
        }
      }
    }

    setLoading(false);
    setPlainCategorySection(plainSetting);
    setSections(normalized.filter((section) =>
      (!onlySlug && section.slug === PLAIN_CATEGORY_SECTION_SETTING.slug ? false : true)
      && (!onlySlug || section.slug === onlySlug)
    ));
    setProducts((productResult.data || []) as Product[]);
    setServices((serviceResult.data || []) as Service[]);
    setMedia((mediaResult.data || []) as MediaChoice[]);
    setStatus(nextStatus);
  }

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- initial admin bootstrap

  const sourceOptions = useMemo(() => [
    ...products.map((product) => ({ value: `product:${product.id}`, label: `Produk · ${product.nama}` })),
    ...services.map((service) => ({ value: `service:${service.id}`, label: `Layanan · ${service.nama}` }))
  ], [products, services]);
  const productOptions = useMemo(() => products.map((product) => ({ value: `product:${product.id}`, label: `Produk · ${product.nama}` })), [products]);

  function sourceOptionsForSection(section: EditableSection) {
    return isProductOnlySection(section) ? productOptions : sourceOptions;
  }

  function updateSection(id: string, patch: Partial<EditableSection>) {
    setSections((current) => current.map((section) => section.id === id ? { ...section, ...patch } : section));
  }

  function updateItem(sectionId: string, itemId: string, patch: Partial<EditableItem>) {
    setSections((current) => current.map((section) => section.id === sectionId
      ? { ...section, items: section.items.map((item) => item.id === itemId ? { ...item, ...patch } : item) }
      : section));
  }

  function updateCustomDraft(sectionId: string, patch: Partial<CustomDraft>) {
    setCustomDrafts((current) => ({
      ...current,
      [sectionId]: { ...emptyCustomDraft, ...(current[sectionId] || {}), ...patch }
    }));
  }

  async function updatePlainCategorySectionVisibility(isActive: boolean) {
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("homepage_sections")
      .upsert(
        {
          title: PLAIN_CATEGORY_SECTION_SETTING.title,
          slug: PLAIN_CATEGORY_SECTION_SETTING.slug,
          sort_order: plainCategorySection?.sort_order ?? PLAIN_CATEGORY_SECTION_SETTING.sortOrder,
          is_active: isActive
        },
        { onConflict: "slug" }
      )
      .select(homepageSectionSelect)
      .maybeSingle();
    setSaving(false);

    if (error || !data) {
      setStatus(`Pengaturan section kategori gagal disimpan: ${error?.message || "data tidak ditemukan"}`);
      return;
    }

    setPlainCategorySection(normalizeSection(data as EditableSection));
    setStatus(isActive ? "Section Pakaian Polos Berdasarkan Kategori aktif." : "Section Pakaian Polos Berdasarkan Kategori disembunyikan.");
  }

  async function createSection(event: FormEvent) {
    event.preventDefault();
    const title = newTitle.trim();
    const slug = newSlug.trim() || slugify(title);
    if (!title || !slug) {
      setStatus("Judul section wajib diisi.");
      return;
    }
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setSaving(true);
    const { error } = await supabase.from("homepage_sections").insert({ title, slug, is_active: true, sort_order: newSortOrder });
    setSaving(false);
    if (error) {
      setStatus(`Section gagal dibuat: ${error.message}`);
      return;
    }
    setNewTitle("");
    setNewSlug("");
    setNewSortOrder(0);
    setStatus("Section homepage dibuat.");
    await loadData();
  }

  async function saveSection(section: EditableSection) {
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setSaving(true);
    const { error } = await supabase.from("homepage_sections").update({
      title: section.title.trim(),
      slug: section.slug.trim() || slugify(section.title),
      is_active: section.is_active,
      sort_order: Number(section.sort_order)
    }).eq("id", section.id);
    setSaving(false);
    setStatus(error ? `Section gagal disimpan: ${error.message}` : "Section homepage disimpan.");
    if (!error) await loadData();
  }

  async function moveSection(sectionId: string, direction: -1 | 1) {
    const index = sections.findIndex((section) => section.id === sectionId);
    const swapIndex = index + direction;
    if (index < 0 || swapIndex < 0 || swapIndex >= sections.length) return;
    const current = sections[index];
    const swap = sections[swapIndex];
    const supabase = createSupabaseClient();
    if (!supabase) return;
    const [first, second] = await Promise.all([
      supabase.from("homepage_sections").update({ sort_order: swap.sort_order }).eq("id", current.id),
      supabase.from("homepage_sections").update({ sort_order: current.sort_order }).eq("id", swap.id)
    ]);
    if (first.error || second.error) {
      setStatus(`Urutan section gagal disimpan: ${first.error?.message || second.error?.message}`);
      return;
    }
    setStatus("Urutan section diperbarui.");
    await loadData();
  }

  async function deleteSection(section: EditableSection) {
    if (!window.confirm(`Hapus section “${section.title}” dan semua penempatannya? Produk/layanan asli tidak akan dihapus.`)) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from("homepage_sections").delete().eq("id", section.id);
    setStatus(error ? `Section gagal dihapus: ${error.message}` : "Section dan penempatannya dihapus. Produk/layanan asli tetap aman.");
    if (!error) await loadData();
  }

  async function addItem(section: EditableSection) {
    if (isCustomSection(section)) {
      setStatus("Section ini memakai custom card. Gunakan form Tambah custom card.");
      return;
    }
    const selected = selection[section.id];
    if (!selected) {
      setStatus(isProductOnlySection(section) ? "Pilih produk terlebih dahulu." : "Pilih produk atau layanan terlebih dahulu.");
      return;
    }
    const [type, id] = selected.split(":");
    if (isProductOnlySection(section) && type !== "product") {
      setStatus("Section ini hanya boleh memilih dari produk yang ada.");
      return;
    }
    const supabase = createSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from("homepage_section_items").insert({
      section_id: section.id,
      product_id: type === "product" ? id : null,
      service_id: type === "service" ? id : null,
      is_active: true,
      sort_order: section.items.length ? Math.max(...section.items.map((item) => item.sort_order)) + 10 : 10
    });
    if (error) {
      setStatus(error.code === "23505" ? "Item tersebut sudah ada di section ini." : `Item gagal ditambahkan: ${error.message}`);
      return;
    }
    setSelection((current) => ({ ...current, [section.id]: "" }));
    setStatus("Item ditambahkan ke homepage tanpa mengubah data aslinya.");
    await loadData();
  }

  async function addCustomItem(section: EditableSection) {
    const draft = { ...emptyCustomDraft, ...(customDrafts[section.id] || {}) };
    if (!draft.custom_title.trim() || !draft.custom_link_url.trim() || !draft.custom_image_url.trim()) {
      setStatus("Custom card wajib memiliki judul, link tujuan, dan gambar.");
      return;
    }
    const supabase = createSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from("homepage_section_items").insert({
      section_id: section.id,
      product_id: null,
      service_id: null,
      custom_label: draft.custom_label.trim(),
      custom_title: draft.custom_title.trim(),
      custom_subtitle: draft.custom_subtitle.trim(),
      custom_button_label: draft.custom_button_label.trim() || "Lihat",
      custom_link_url: draft.custom_link_url.trim(),
      custom_image_url: draft.custom_image_url.trim(),
      custom_mobile_image_url: draft.custom_mobile_image_url.trim() || null,
      custom_image_alt: draft.custom_image_alt.trim() || draft.custom_title.trim(),
      custom_object_fit: draft.custom_object_fit,
      custom_object_position: draft.custom_object_position,
      is_active: true,
      sort_order: section.items.length ? Math.max(...section.items.map((item) => item.sort_order)) + 10 : 10
    });
    if (error) {
      setStatus(`Custom card gagal ditambahkan: ${error.message}`);
      return;
    }
    setCustomDrafts((current) => ({ ...current, [section.id]: emptyCustomDraft }));
    setStatus("Custom card ditambahkan.");
    await loadData();
  }

  function moveItem(sectionId: string, itemId: string, direction: -1 | 1) {
    setSections((current) => current.map((section) => {
      if (section.id !== sectionId) return section;
      const items = [...section.items];
      const index = items.findIndex((item) => item.id === itemId);
      const swapIndex = index + direction;
      if (index < 0 || swapIndex < 0 || swapIndex >= items.length) return section;
      [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
      return { ...section, items: items.map((item, itemIndex) => ({ ...item, sort_order: (itemIndex + 1) * 10 })) };
    }));
  }

  async function saveItems(section: EditableSection) {
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setSaving(true);
    const results = await Promise.all(section.items.map((item) => supabase.from("homepage_section_items").update({
      is_active: item.is_active,
      sort_order: Number(item.sort_order),
      custom_label: item.custom_label || "",
      custom_title: item.custom_title || "",
      custom_subtitle: item.custom_subtitle || "",
      custom_button_label: item.custom_button_label || "",
      custom_link_url: item.custom_link_url || "",
      custom_image_url: item.custom_image_url || "",
      custom_mobile_image_url: item.custom_mobile_image_url || null,
      custom_image_alt: item.custom_image_alt || null,
      custom_object_fit: item.custom_object_fit || "cover",
      custom_object_position: item.custom_object_position || "center center"
    }).eq("id", item.id)));
    setSaving(false);
    const error = results.find((result) => result.error)?.error;
    setStatus(error ? `Item gagal disimpan: ${error.message}` : "Status dan urutan item disimpan.");
    if (!error) await loadData();
  }

  async function removeItem(item: EditableItem) {
    if (!window.confirm(`Hapus “${itemName(item)}” dari section ini? Data asli tetap aman.`)) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from("homepage_section_items").delete().eq("id", item.id);
    setStatus(error ? `Item gagal dihapus: ${error.message}` : "Item dilepas dari homepage. Data asli tidak dihapus.");
    if (!error) await loadData();
  }

  const plainCategorySectionEnabled = plainCategorySection?.is_active ?? true;

  return (
    <div className="mt-6 grid gap-6">
      {status ? <p role="status" className="border border-brand-softGray bg-white p-4 text-sm font-semibold">{status}</p> : null}

      {showPlainCategorySetting ? <section className="border border-brand-softGray bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-charcoal/50">Landing Page Settings</p>
            <h2 className="mt-2 text-xl font-semibold">Tampilkan Section Pakaian Polos Berdasarkan Kategori</h2>
            <p className="mt-2 text-sm leading-6 text-brand-charcoal/60">Saat OFF, section tidak dirender di landing page. Saat ON, section tampil seperti sebelumnya.</p>
          </div>
          <label className="inline-flex min-h-11 items-center gap-3 rounded-full border border-brand-softGray px-4 py-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={plainCategorySectionEnabled}
              disabled={loading || saving}
              onChange={(event) => updatePlainCategorySectionVisibility(event.target.checked)}
              className="sr-only"
            />
            <span className={`flex h-7 w-12 items-center rounded-full p-1 transition ${plainCategorySectionEnabled ? "justify-end bg-brand-green" : "justify-start bg-brand-charcoal/25"}`} aria-hidden="true">
              <span className="h-5 w-5 rounded-full bg-white shadow" />
            </span>
            <span>{plainCategorySectionEnabled ? "ON" : "OFF"}</span>
          </label>
        </div>
      </section> : null}

      {!onlySlug ? <form onSubmit={createSection} className="border border-brand-softGray bg-white p-5 sm:p-6">
        <h2 className="text-xl font-semibold">Tambah homepage section</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_140px_auto]">
          <input value={newTitle} onChange={(event) => { setNewTitle(event.target.value); if (!newSlug) setNewSlug(slugify(event.target.value)); }} placeholder="Judul section" className="min-h-11 rounded-lg border border-brand-softGray px-4 text-sm" />
          <input value={newSlug} onChange={(event) => setNewSlug(slugify(event.target.value))} placeholder="slug-section" className="min-h-11 rounded-lg border border-brand-softGray px-4 text-sm" />
          <input type="number" min="0" value={newSortOrder} onChange={(event) => setNewSortOrder(Number(event.target.value))} aria-label="Urutan section baru" className="min-h-11 rounded-lg border border-brand-softGray px-4 text-sm" />
          <button disabled={saving} className="min-h-11 rounded-full bg-brand-charcoal px-5 text-sm font-semibold text-white disabled:opacity-50">Tambah</button>
        </div>
      </form> : null}

      {loading ? <div className="grid gap-4">{[1, 2, 3].map((item) => <div key={item} className="h-44 animate-pulse bg-white" />)}</div> : sections.length ? sections.map((section, sectionIndex) => (
        <article key={section.id} className="border border-brand-softGray bg-white p-5 sm:p-6">
          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_120px_auto] lg:items-end">
            <label className="text-sm font-semibold">Judul<input value={section.title} onChange={(event) => updateSection(section.id, { title: event.target.value })} className="mt-2 min-h-11 w-full rounded-lg border border-brand-softGray px-4 font-normal" /></label>
            <label className="text-sm font-semibold">Slug<input value={section.slug} onChange={(event) => updateSection(section.id, { slug: slugify(event.target.value) })} className="mt-2 min-h-11 w-full rounded-lg border border-brand-softGray px-4 font-normal" /></label>
            <label className="text-sm font-semibold">Urutan<input type="number" min="0" value={section.sort_order} onChange={(event) => updateSection(section.id, { sort_order: Number(event.target.value) })} className="mt-2 min-h-11 w-full rounded-lg border border-brand-softGray px-4 font-normal" /></label>
            <label className="flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={section.is_active} onChange={(event) => updateSection(section.id, { is_active: event.target.checked })} className="h-4 w-4 accent-brand-green" />Section aktif</label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => moveSection(section.id, -1)} disabled={sectionIndex === 0} className="rounded-full border border-brand-softGray px-4 py-2 text-xs font-semibold disabled:opacity-40">Naik</button>
            <button type="button" onClick={() => moveSection(section.id, 1)} disabled={sectionIndex === sections.length - 1} className="rounded-full border border-brand-softGray px-4 py-2 text-xs font-semibold disabled:opacity-40">Turun</button>
            <button type="button" onClick={() => saveSection(section)} disabled={saving} className="rounded-full bg-brand-green px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">Simpan section</button>
            {!onlySlug ? <button type="button" onClick={() => deleteSection(section)} className="rounded-full px-4 py-2 text-xs font-semibold text-red-700">Hapus section</button> : null}
          </div>

          <div className="mt-6 border-t border-brand-softGray pt-5">
            <h3 className="font-semibold">Item di dalam section</h3>
            {isCustomSection(section) ? (
              <div className="mt-3 border border-brand-softGray bg-white p-4">
                <p className="text-sm font-semibold">Tambah custom card</p>
                <p className="mt-1 text-xs leading-5 text-brand-charcoal/55">Featured, Trending, dan Shop by Category memakai gambar upload, teks CMS, dan link tujuan custom.</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <input value={(customDrafts[section.id] || emptyCustomDraft).custom_label} onChange={(event) => updateCustomDraft(section.id, { custom_label: event.target.value })} placeholder="Label kecil, contoh: Koleksi" className="min-h-11 rounded-lg border border-brand-softGray px-4 text-sm" />
                  <input value={(customDrafts[section.id] || emptyCustomDraft).custom_title} onChange={(event) => updateCustomDraft(section.id, { custom_title: event.target.value })} placeholder="Judul card" className="min-h-11 rounded-lg border border-brand-softGray px-4 text-sm" />
                  <input value={(customDrafts[section.id] || emptyCustomDraft).custom_button_label} onChange={(event) => updateCustomDraft(section.id, { custom_button_label: event.target.value })} placeholder="Label tombol, contoh: Shop" className="min-h-11 rounded-lg border border-brand-softGray px-4 text-sm" />
                  <input value={(customDrafts[section.id] || emptyCustomDraft).custom_link_url} onChange={(event) => updateCustomDraft(section.id, { custom_link_url: event.target.value })} placeholder="/kaos-polos atau https://..." className="min-h-11 rounded-lg border border-brand-softGray px-4 text-sm" />
                  <select value={(customDrafts[section.id] || emptyCustomDraft).custom_image_url} onChange={(event) => updateCustomDraft(section.id, { custom_image_url: event.target.value })} className="min-h-11 rounded-lg border border-brand-softGray bg-white px-4 text-sm">
                    <option value="">Pilih gambar dari Media Library...</option>
                    {media.map((asset) => <option key={asset.id} value={asset.public_url}>{asset.name}</option>)}
                  </select>
                  <input value={(customDrafts[section.id] || emptyCustomDraft).custom_image_url} onChange={(event) => updateCustomDraft(section.id, { custom_image_url: event.target.value })} placeholder="Atau paste URL gambar" className="min-h-11 rounded-lg border border-brand-softGray px-4 text-sm" />
                  <input value={(customDrafts[section.id] || emptyCustomDraft).custom_image_alt} onChange={(event) => updateCustomDraft(section.id, { custom_image_alt: event.target.value })} placeholder="Alt text gambar" className="min-h-11 rounded-lg border border-brand-softGray px-4 text-sm" />
                  <select value={(customDrafts[section.id] || emptyCustomDraft).custom_object_fit} onChange={(event) => updateCustomDraft(section.id, { custom_object_fit: event.target.value as "cover" | "contain" })} className="min-h-11 rounded-lg border border-brand-softGray bg-white px-4 text-sm">
                    <option value="cover">cover</option>
                    <option value="contain">contain</option>
                  </select>
                  <select value={(customDrafts[section.id] || emptyCustomDraft).custom_object_position} onChange={(event) => updateCustomDraft(section.id, { custom_object_position: event.target.value })} className="min-h-11 rounded-lg border border-brand-softGray bg-white px-4 text-sm">
                    {objectPositionOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                  <textarea value={(customDrafts[section.id] || emptyCustomDraft).custom_subtitle} onChange={(event) => updateCustomDraft(section.id, { custom_subtitle: event.target.value })} placeholder="Subtitle opsional" className="min-h-24 rounded-lg border border-brand-softGray px-4 py-3 text-sm md:col-span-2" />
                </div>
                <button type="button" onClick={() => addCustomItem(section)} className="mt-4 min-h-11 rounded-full border border-brand-charcoal px-5 text-sm font-semibold">Tambahkan custom card</button>
              </div>
            ) : (
              <div className="mt-3">
                <p className="mb-2 text-xs leading-5 text-brand-charcoal/55">{isProductOnlySection(section) ? "Section ini hanya memilih dari produk yang sudah ada." : "Pilih item dari produk atau layanan."}</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <select value={selection[section.id] || ""} onChange={(event) => setSelection((current) => ({ ...current, [section.id]: event.target.value }))} className="min-h-11 flex-1 rounded-lg border border-brand-softGray bg-white px-4 text-sm"><option value="">{isProductOnlySection(section) ? "Pilih dari Produk..." : "Pilih dari Produk & Layanan..."}</option>{sourceOptionsForSection(section).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                  <button type="button" onClick={() => addItem(section)} className="min-h-11 rounded-full border border-brand-charcoal px-5 text-sm font-semibold">Tambahkan item</button>
                </div>
              </div>
            )}

            {section.items.length ? <div className="mt-4 grid gap-3">{section.items.map((item, itemIndex) => (
              <div key={item.id} className="grid gap-3 border border-brand-softGray bg-brand-offWhite p-3">
                <div className="grid gap-3 sm:grid-cols-[64px_1fr_110px_auto] sm:items-center">
                  <img src={itemImage(item)} alt={itemName(item)} className="aspect-[4/5] w-16 object-cover" />
                  <div><p className="font-semibold">{itemName(item)}</p><p className="mt-1 text-xs text-brand-charcoal/50">{isCustomItem(item) ? "Custom Card" : item.product ? "Produk" : "Layanan"}</p></div>
                  <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={item.is_active} onChange={(event) => updateItem(section.id, item.id, { is_active: event.target.checked })} className="h-4 w-4 accent-brand-green" />Aktif</label>
                  <div className="flex flex-wrap gap-1 sm:justify-end"><button type="button" onClick={() => moveItem(section.id, item.id, -1)} disabled={itemIndex === 0} className="rounded-full border border-brand-softGray bg-white px-3 py-2 text-xs font-semibold disabled:opacity-40">↑</button><button type="button" onClick={() => moveItem(section.id, item.id, 1)} disabled={itemIndex === section.items.length - 1} className="rounded-full border border-brand-softGray bg-white px-3 py-2 text-xs font-semibold disabled:opacity-40">↓</button><button type="button" onClick={() => removeItem(item)} className="rounded-full px-3 py-2 text-xs font-semibold text-red-700">Lepas</button></div>
                </div>
                {(isCustomSection(section) || isCustomItem(item)) ? (
                  <div className="grid gap-2 border-t border-brand-softGray pt-3 md:grid-cols-2">
                    <input value={item.custom_label || ""} onChange={(event) => updateItem(section.id, item.id, { custom_label: event.target.value })} placeholder="Label kecil" className="min-h-10 rounded-lg border border-brand-softGray bg-white px-3 text-sm" />
                    <input value={item.custom_title || ""} onChange={(event) => updateItem(section.id, item.id, { custom_title: event.target.value })} placeholder="Judul card" className="min-h-10 rounded-lg border border-brand-softGray bg-white px-3 text-sm" />
                    <input value={item.custom_button_label || ""} onChange={(event) => updateItem(section.id, item.id, { custom_button_label: event.target.value })} placeholder="Label tombol" className="min-h-10 rounded-lg border border-brand-softGray bg-white px-3 text-sm" />
                    <input value={item.custom_link_url || ""} onChange={(event) => updateItem(section.id, item.id, { custom_link_url: event.target.value })} placeholder="Link tujuan" className="min-h-10 rounded-lg border border-brand-softGray bg-white px-3 text-sm" />
                    <select value={item.custom_image_url || ""} onChange={(event) => updateItem(section.id, item.id, { custom_image_url: event.target.value })} className="min-h-10 rounded-lg border border-brand-softGray bg-white px-3 text-sm">
                      <option value={item.custom_image_url || ""}>{item.custom_image_url ? "Gambar saat ini" : "Pilih gambar..."}</option>
                      {media.map((asset) => <option key={asset.id} value={asset.public_url}>{asset.name}</option>)}
                    </select>
                    <input value={item.custom_image_url || ""} onChange={(event) => updateItem(section.id, item.id, { custom_image_url: event.target.value })} placeholder="URL gambar" className="min-h-10 rounded-lg border border-brand-softGray bg-white px-3 text-sm" />
                    <input value={item.custom_image_alt || ""} onChange={(event) => updateItem(section.id, item.id, { custom_image_alt: event.target.value })} placeholder="Alt text" className="min-h-10 rounded-lg border border-brand-softGray bg-white px-3 text-sm" />
                    <select value={item.custom_object_fit || "cover"} onChange={(event) => updateItem(section.id, item.id, { custom_object_fit: event.target.value as "cover" | "contain" })} className="min-h-10 rounded-lg border border-brand-softGray bg-white px-3 text-sm">
                      <option value="cover">cover</option>
                      <option value="contain">contain</option>
                    </select>
                    <select value={item.custom_object_position || "center center"} onChange={(event) => updateItem(section.id, item.id, { custom_object_position: event.target.value })} className="min-h-10 rounded-lg border border-brand-softGray bg-white px-3 text-sm">
                      {objectPositionOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                    <textarea value={item.custom_subtitle || ""} onChange={(event) => updateItem(section.id, item.id, { custom_subtitle: event.target.value })} placeholder="Subtitle opsional" className="min-h-20 rounded-lg border border-brand-softGray bg-white px-3 py-2 text-sm md:col-span-2" />
                  </div>
                ) : null}
              </div>
            ))}<button type="button" onClick={() => saveItems(section)} disabled={saving} className="justify-self-start rounded-full bg-brand-charcoal px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-50">Simpan item</button></div> : <p className="mt-4 bg-brand-offWhite p-4 text-sm text-brand-charcoal/60">Belum ada item. Section ini tidak akan tampil di homepage.</p>}
          </div>
        </article>
      )) : <div className="bg-white p-8 text-center"><p className="font-semibold">Belum ada homepage section</p><p className="mt-2 text-sm text-brand-charcoal/60">Buat section pertama, lalu pilih item dari Produk & Layanan.</p></div>}
    </div>
  );
}
