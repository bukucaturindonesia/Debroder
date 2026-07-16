/* eslint-disable @next/next/no-img-element */
"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";
import { createSupabaseClient } from "@/lib/supabase";

type Status = { type: "success" | "error" | "info"; text: string };
type CategoryStatus = "draft" | "published" | "archived";
type EntryType = "project_builder" | "jersey_configurator";
type PriceMode = "final" | "estimated" | "quotation";

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  image_url: string | null;
  image_alt: string | null;
  entry_type: EntryType;
  target_route: string | null;
  supports_quick_custom: boolean;
  supports_full_custom: boolean;
  price_display_mode: PriceMode;
  minimum_order_display: string;
  lead_time_display: string;
  source_product_category_id: string | null;
  seo_title: string | null;
  seo_description: string | null;
  status: CategoryStatus;
  is_active: boolean;
  sort_order: number;
};

type ProductCategory = { id: string; name: string; slug: string; status: string; sort_order: number };
type ProductOption = { id: string; name: string; slug: string; product_category_id: string; status: string; status_aktif: boolean; urutan: number };
type ServiceOption = { id: string; name: string; slug: string; status: string; pricing_type: string; minimum_quantity: number; sort_order: number };
type MappingRow = { id: string; custom_category_id: string; product_id: string; is_default: boolean; is_active: boolean; sort_order: number };
type CompatibilityRow = { id: string; custom_category_id: string | null; product_id: string | null; service_id: string; placement_id: string | null; print_size_id: string | null; is_active: boolean };
type MediaOption = { id: string; name: string; public_url: string };

type PresetRow = {
  id: string;
  custom_category_id: string;
  name: string;
  slug: string;
  short_description: string | null;
  mockup_url: string | null;
  mockup_alt: string | null;
  default_product_id: string | null;
  configuration_defaults: Record<string, unknown>;
  price_display_mode: PriceMode | null;
  minimum_order_display: string | null;
  lead_time_display: string | null;
  status: CategoryStatus;
  is_active: boolean;
  sort_order: number;
};

type PlacementRow = { id: string; custom_category_id: string; name: string; slug: string; description: string | null; price_adjustment: number; is_active: boolean; sort_order: number };
type PrintSizeRow = { id: string; custom_category_id: string; name: string; slug: string; description: string | null; width_mm: number | null; height_mm: number | null; price_adjustment: number; is_active: boolean; sort_order: number };
type PersonalizationRow = { id: string; custom_category_id: string; name: string; slug: string; pricing_type: "fixed_per_item" | "fixed_per_order" | "estimated" | "manual_quote"; unit_price: number | null; flat_price: number | null; estimated_min_price: number | null; estimated_max_price: number | null; quote_required: boolean; is_active: boolean; sort_order: number };

type CategoryDraft = Omit<CategoryRow, "id"> & { id?: string };
type SimpleEditorKind = "placement" | "print-size" | "personalization";

const emptyCategory = (): CategoryDraft => ({
  name: "",
  slug: "",
  short_description: "",
  image_url: "",
  image_alt: "",
  entry_type: "project_builder",
  target_route: null,
  supports_quick_custom: false,
  supports_full_custom: true,
  price_display_mode: "estimated",
  minimum_order_display: "Minimum mengikuti produk",
  lead_time_display: "Estimasi setelah konfigurasi",
  source_product_category_id: null,
  seo_title: "",
  seo_description: "",
  status: "draft",
  is_active: true,
  sort_order: 0
});

export function CustomCommerceAdmin() {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [mappings, setMappings] = useState<MappingRow[]>([]);
  const [compatibility, setCompatibility] = useState<CompatibilityRow[]>([]);
  const [presets, setPresets] = useState<PresetRow[]>([]);
  const [placements, setPlacements] = useState<PlacementRow[]>([]);
  const [printSizes, setPrintSizes] = useState<PrintSizeRow[]>([]);
  const [personalizationRules, setPersonalizationRules] = useState<PersonalizationRow[]>([]);
  const [media, setMedia] = useState<MediaOption[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [categoryForm, setCategoryForm] = useState<CategoryDraft>(emptyCategory());
  const [presetForm, setPresetForm] = useState<Partial<PresetRow>>({});
  const [simpleKind, setSimpleKind] = useState<SimpleEditorKind>("placement");
  const [simpleName, setSimpleName] = useState("");
  const [simpleSlug, setSimpleSlug] = useState("");
  const [simplePrice, setSimplePrice] = useState(0);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);

  const selected = categories.find((category) => category.id === selectedId) ?? null;
  const categoryMappings = useMemo(() => mappings.filter((mapping) => mapping.custom_category_id === selectedId && mapping.is_active), [mappings, selectedId]);
  const categoryProductIds = useMemo(() => new Set(categoryMappings.map((mapping) => mapping.product_id)), [categoryMappings]);
  const sourceProducts = useMemo(() => products.filter((product) => !selected?.source_product_category_id || product.product_category_id === selected.source_product_category_id), [products, selected]);
  const categoryCompatibility = useMemo(() => compatibility.filter((rule) => rule.custom_category_id === selectedId && !rule.product_id && !rule.placement_id && !rule.print_size_id && rule.is_active), [compatibility, selectedId]);
  const categoryServiceIds = useMemo(() => new Set(categoryCompatibility.map((rule) => rule.service_id)), [categoryCompatibility]);

  async function load(preferredId?: string) {
    const supabase = createSupabaseClient();
    if (!supabase) {
      setLoading(false);
      setStatus({ type: "error", text: "Supabase belum dikonfigurasi." });
      return;
    }

    setLoading(true);
    const results = await Promise.all([
      supabase.from("custom_categories").select("*").order("sort_order").order("name"),
      supabase.from("product_categories").select("id,name,slug,status,sort_order").eq("status", "active").order("sort_order"),
      supabase.from("products").select("id,name,slug,product_category_id,status,status_aktif,urutan").eq("status", "active").eq("status_aktif", true).order("urutan"),
      supabase.from("custom_services").select("id,name,slug,status,pricing_type,minimum_quantity,sort_order").eq("status", "active").order("sort_order"),
      supabase.from("custom_category_products").select("*").order("sort_order"),
      supabase.from("custom_service_compatibilities").select("*").eq("is_active", true),
      supabase.from("custom_presets").select("*").order("sort_order"),
      supabase.from("custom_placements").select("*").order("sort_order"),
      supabase.from("custom_print_sizes").select("*").order("sort_order"),
      supabase.from("custom_personalization_rules").select("*").order("sort_order"),
      supabase.from("media_assets").select("id,name,public_url").eq("status_aktif", true).eq("media_type", "image").order("created_at", { ascending: false })
    ]);

    setLoading(false);
    const firstError = results.find((result) => result.error)?.error;
    if (firstError) {
      setStatus({
        type: "error",
        text: firstError.code === "42P01" || firstError.code === "PGRST205"
          ? "Schema Custom belum tersedia. Terapkan migration Custom Commerce terlebih dahulu."
          : `CMS Custom gagal dimuat: ${firstError.message}`
      });
      return;
    }

    const nextCategories = (results[0].data || []) as CategoryRow[];
    setCategories(nextCategories);
    setProductCategories((results[1].data || []) as ProductCategory[]);
    setProducts((results[2].data || []) as ProductOption[]);
    setServices((results[3].data || []) as ServiceOption[]);
    setMappings((results[4].data || []) as MappingRow[]);
    setCompatibility((results[5].data || []) as CompatibilityRow[]);
    setPresets((results[6].data || []) as PresetRow[]);
    setPlacements((results[7].data || []) as PlacementRow[]);
    setPrintSizes((results[8].data || []) as PrintSizeRow[]);
    setPersonalizationRules((results[9].data || []) as PersonalizationRow[]);
    setMedia((results[10].data || []) as MediaOption[]);

    const nextId = preferredId || selectedId || nextCategories[0]?.id || "";
    const nextSelected = nextCategories.find((category) => category.id === nextId) ?? nextCategories[0] ?? null;
    setSelectedId(nextSelected?.id || "");
    setCategoryForm(nextSelected ? { ...nextSelected } : emptyCategory());
    setPresetForm({});
  }

  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function selectCategory(category: CategoryRow) {
    setSelectedId(category.id);
    setCategoryForm({ ...category });
    setPresetForm({});
    setStatus(null);
  }

  function startNewCategory() {
    setSelectedId("");
    setCategoryForm(emptyCategory());
    setPresetForm({});
    setStatus({ type: "info", text: "Draft kategori baru siap diisi." });
  }

  async function syncFromPim() {
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setWorking(true);
    const { data, error } = await supabase.rpc("sync_custom_catalog_drafts_from_pim");
    setWorking(false);
    if (error) {
      setStatus({ type: "error", text: error.code === "PGRST202" ? "RPC sinkronisasi belum tersedia. Terapkan migration alignment Custom." : `Sinkronisasi gagal: ${error.message}` });
      return;
    }
    const result = isRecord(data) ? data : {};
    setStatus({ type: "success", text: `Draft PIM tersinkron. Kategori baru: ${numberValue(result.categories_created)}, mapping produk: ${numberValue(result.product_mappings_synced)}.` });
    await load();
  }

  async function saveCategory(event: FormEvent) {
    event.preventDefault();
    const supabase = createSupabaseClient();
    if (!supabase) return;

    const payload = normalizeCategoryPayload(categoryForm);
    const validationError = validateCategory(payload, categoryProductIds.size, categoryServiceIds.size);
    if (validationError) {
      setStatus({ type: "error", text: validationError });
      return;
    }

    setWorking(true);
    const request = categoryForm.id
      ? supabase.from("custom_categories").update(payload).eq("id", categoryForm.id).select("id").single()
      : supabase.from("custom_categories").insert(payload).select("id").single();
    const { data, error } = await request;
    setWorking(false);
    if (error) {
      setStatus({ type: "error", text: `Kategori gagal disimpan: ${error.message}` });
      return;
    }
    const savedId = String(data.id);
    setStatus({ type: "success", text: payload.status === "published" ? "Kategori Custom dipublikasikan." : "Draft kategori Custom disimpan." });
    await load(savedId);
  }

  async function toggleProduct(product: ProductOption, enabled: boolean) {
    const supabase = createSupabaseClient();
    if (!supabase || !selected) return;
    setWorking(true);
    if (enabled) {
      const { error } = await supabase.from("custom_category_products").upsert({
        custom_category_id: selected.id,
        product_id: product.id,
        is_default: categoryMappings.length === 0,
        is_active: true,
        sort_order: product.urutan || 0,
        compatibility_metadata: {}
      }, { onConflict: "custom_category_id,product_id" });
      if (error) setStatus({ type: "error", text: `Produk gagal dihubungkan: ${error.message}` });
      else setStatus({ type: "success", text: `${product.name} terhubung ke kategori Custom.` });
    } else {
      const { error } = await supabase.from("custom_category_products").delete().eq("custom_category_id", selected.id).eq("product_id", product.id);
      if (error) setStatus({ type: "error", text: `Mapping produk gagal dihapus: ${error.message}` });
      else setStatus({ type: "success", text: `${product.name} dilepas dari kategori Custom.` });
    }
    setWorking(false);
    await load(selected.id);
  }

  async function makeDefaultProduct(productId: string) {
    const supabase = createSupabaseClient();
    if (!supabase || !selected) return;
    setWorking(true);
    const clearResult = await supabase.from("custom_category_products").update({ is_default: false }).eq("custom_category_id", selected.id);
    const setResult = clearResult.error ? clearResult : await supabase.from("custom_category_products").update({ is_default: true }).eq("custom_category_id", selected.id).eq("product_id", productId);
    setWorking(false);
    setStatus(setResult.error ? { type: "error", text: `Produk default gagal diubah: ${setResult.error.message}` } : { type: "success", text: "Produk default diperbarui." });
    await load(selected.id);
  }

  async function toggleService(service: ServiceOption, enabled: boolean) {
    const supabase = createSupabaseClient();
    if (!supabase || !selected) return;
    setWorking(true);
    if (enabled) {
      const { error } = await supabase.from("custom_service_compatibilities").insert({ service_id: service.id, custom_category_id: selected.id, product_id: null, placement_id: null, print_size_id: null, is_active: true });
      setStatus(error ? { type: "error", text: `Layanan gagal dihubungkan: ${error.message}` } : { type: "success", text: `${service.name} tersedia untuk kategori ini.` });
    } else {
      const { error } = await supabase.from("custom_service_compatibilities").delete().eq("custom_category_id", selected.id).eq("service_id", service.id).is("product_id", null).is("placement_id", null).is("print_size_id", null);
      setStatus(error ? { type: "error", text: `Layanan gagal dilepas: ${error.message}` } : { type: "success", text: `${service.name} dilepas dari kategori ini.` });
    }
    setWorking(false);
    await load(selected.id);
  }

  async function savePreset(event: FormEvent) {
    event.preventDefault();
    const supabase = createSupabaseClient();
    if (!supabase || !selected) return;
    const name = text(presetForm.name);
    const slug = slugify(text(presetForm.slug) || name);
    if (!name || !slug) {
      setStatus({ type: "error", text: "Nama dan slug Paket Instan wajib diisi." });
      return;
    }
    const rawDefaults = isRecord(presetForm.configuration_defaults) ? presetForm.configuration_defaults : {};
    const serviceIds = stringArray(rawDefaults.service_ids).filter((serviceId) => categoryServiceIds.has(serviceId));
    const defaultQuantity = Math.max(1, Math.trunc(numberValue(rawDefaults.quantity) || 1));
    const personalizationRuleId = typeof rawDefaults.personalization_rule_id === "string"
      && personalizationRules.some((rule) => rule.id === rawDefaults.personalization_rule_id && rule.custom_category_id === selected.id && rule.is_active)
      ? rawDefaults.personalization_rule_id
      : null;
    const statusValue = presetForm.status || "draft";
    const defaultProductId = nullableText(presetForm.default_product_id);
    if (statusValue === "published" && !selected.supports_quick_custom) {
      setStatus({ type: "error", text: "Aktifkan mode Paket Instan pada kategori sebelum preset dipublikasikan." });
      return;
    }
    if (statusValue === "published" && (!defaultProductId || !categoryProductIds.has(defaultProductId))) {
      setStatus({ type: "error", text: "Pilih produk PIM default yang sudah terhubung sebelum Paket Instan dipublikasikan." });
      return;
    }
    if (statusValue === "published" && serviceIds.length < 1) {
      setStatus({ type: "error", text: "Pilih minimal satu layanan default sebelum Paket Instan dipublikasikan." });
      return;
    }
    const payload = {
      custom_category_id: selected.id,
      name,
      slug,
      short_description: nullableText(presetForm.short_description),
      mockup_url: nullableText(presetForm.mockup_url),
      mockup_alt: nullableText(presetForm.mockup_alt) || name,
      default_product_id: defaultProductId,
      configuration_defaults: {
        ...rawDefaults,
        quantity: defaultQuantity,
        service_ids: serviceIds,
        personalization_rule_id: personalizationRuleId
      },
      price_display_mode: presetForm.price_display_mode || null,
      minimum_order_display: nullableText(presetForm.minimum_order_display),
      lead_time_display: nullableText(presetForm.lead_time_display),
      status: statusValue,
      is_active: presetForm.is_active !== false,
      sort_order: numberValue(presetForm.sort_order)
    };
    setWorking(true);
    const request = presetForm.id
      ? supabase.from("custom_presets").update(payload).eq("id", presetForm.id)
      : supabase.from("custom_presets").insert(payload);
    const { error } = await request;
    setWorking(false);
    if (error) setStatus({ type: "error", text: `Paket Instan gagal disimpan: ${error.message}` });
    else {
      setPresetForm({});
      setStatus({ type: "success", text: "Paket Instan berhasil disimpan." });
      await load(selected.id);
    }
  }

  async function archivePreset(id: string) {
    const supabase = createSupabaseClient();
    if (!supabase || !selected) return;
    setWorking(true);
    const { error } = await supabase.from("custom_presets").update({ status: "archived", is_active: false }).eq("id", id);
    setWorking(false);
    setStatus(error ? { type: "error", text: `Preset gagal diarsipkan: ${error.message}` } : { type: "success", text: "Paket Instan diarsipkan." });
    await load(selected.id);
  }

  async function saveSimpleConfiguration(event: FormEvent) {
    event.preventDefault();
    const supabase = createSupabaseClient();
    if (!supabase || !selected) return;
    const name = simpleName.trim();
    const slug = slugify(simpleSlug || name);
    if (!name || !slug) {
      setStatus({ type: "error", text: "Nama dan slug konfigurasi wajib diisi." });
      return;
    }

    const base = { custom_category_id: selected.id, name, slug, is_active: true, sort_order: 0 };
    const request = simpleKind === "placement"
      ? supabase.from("custom_placements").insert({ ...base, description: null, price_adjustment: Math.max(0, simplePrice) })
      : simpleKind === "print-size"
        ? supabase.from("custom_print_sizes").insert({ ...base, description: null, width_mm: null, height_mm: null, price_adjustment: Math.max(0, simplePrice) })
        : supabase.from("custom_personalization_rules").insert({ ...base, pricing_type: "fixed_per_item", unit_price: Math.max(0, simplePrice), flat_price: null, estimated_min_price: null, estimated_max_price: null, quote_required: false });

    setWorking(true);
    const { error } = await request;
    setWorking(false);
    if (error) setStatus({ type: "error", text: `Konfigurasi gagal disimpan: ${error.message}` });
    else {
      setSimpleName("");
      setSimpleSlug("");
      setSimplePrice(0);
      setStatus({ type: "success", text: "Konfigurasi Custom ditambahkan." });
      await load(selected.id);
    }
  }

  async function deactivateSimple(table: string, id: string) {
    const supabase = createSupabaseClient();
    if (!supabase || !selected) return;
    setWorking(true);
    const { error } = await supabase.from(table).update({ is_active: false }).eq("id", id);
    setWorking(false);
    setStatus(error ? { type: "error", text: `Konfigurasi gagal dinonaktifkan: ${error.message}` } : { type: "success", text: "Konfigurasi dinonaktifkan." });
    await load(selected.id);
  }

  if (loading) return <div className="grid gap-5"><div className="h-40 animate-pulse bg-white" /><div className="h-96 animate-pulse bg-white" /></div>;

  const selectedPresets = presets.filter((preset) => preset.custom_category_id === selectedId);
  const selectedPlacements = placements.filter((item) => item.custom_category_id === selectedId && item.is_active);
  const selectedPrintSizes = printSizes.filter((item) => item.custom_category_id === selectedId && item.is_active);
  const selectedPersonalization = personalizationRules.filter((item) => item.custom_category_id === selectedId && item.is_active);
  const presetDefaults = isRecord(presetForm.configuration_defaults) ? presetForm.configuration_defaults : {};
  const presetServiceIds = new Set(stringArray(presetDefaults.service_ids));
  const presetQuantity = Math.max(1, Math.trunc(numberValue(presetDefaults.quantity) || 1));
  const presetPersonalizationRuleId = typeof presetDefaults.personalization_rule_id === "string" ? presetDefaults.personalization_rule_id : "";

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        eyebrow="WEBSITE / CUSTOM"
        title="CMS Custom Commerce"
        description="Kelola kategori Custom, mapping produk PIM, Paket Instan, layanan kompatibel, posisi, ukuran cetak, dan personalisasi. Produk, varian, SKU, stok, serta harga dasar tetap berasal dari PIM."
        actions={(
          <>
            <button data-admin-mutation="true" type="button" onClick={startNewCategory} className="min-h-11 rounded-full border border-brand-softGray px-5 text-sm font-semibold">Kategori Baru</button>
            <button data-admin-mutation="true" type="button" onClick={() => void syncFromPim()} disabled={working} className="min-h-11 rounded-full bg-brand-charcoal px-5 text-sm font-semibold text-white disabled:opacity-45">{working ? "Memproses..." : "Sinkronkan Draft dari PIM"}</button>
          </>
        )}
      />

      {status ? <div role={status.type === "error" ? "alert" : "status"} className={`border p-4 text-sm font-semibold ${status.type === "error" ? "border-red-200 bg-red-50 text-red-800" : status.type === "success" ? "border-green-200 bg-green-50 text-green-800" : "border-brand-softGray bg-white"}`}>{status.text}</div> : null}

      <section className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="border border-brand-softGray bg-white p-4">
          <div className="flex items-center justify-between gap-3"><h2 className="font-semibold">Kategori Custom</h2><span className="rounded-full bg-brand-offWhite px-3 py-1 text-xs font-semibold">{categories.length}</span></div>
          <div className="mt-4 grid gap-2">
            {categories.length ? categories.map((category) => (
              <button key={category.id} type="button" onClick={() => selectCategory(category)} className={`w-full border p-3 text-left ${selectedId === category.id ? "border-brand-charcoal bg-brand-charcoal text-white" : "border-brand-softGray hover:bg-brand-offWhite"}`}>
                <div className="flex items-start justify-between gap-2"><span className="font-semibold">{category.name}</span><span className="text-[10px] font-semibold uppercase">{category.status}</span></div>
                <p className="mt-1 truncate text-xs opacity-65">/{category.slug}</p>
              </button>
            )) : <p className="bg-brand-offWhite p-4 text-sm text-brand-charcoal/60">Belum ada kategori khusus. Sinkronkan draft dari PIM atau buat kategori baru.</p>}
          </div>
        </aside>

        <div className="grid gap-5">
          <form onSubmit={saveCategory} className="border border-brand-softGray bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-green">Kategori & publikasi</p><h2 className="mt-2 text-2xl font-semibold">{categoryForm.id ? "Edit kategori" : "Kategori baru"}</h2></div>{categoryForm.status ? <span className="rounded-full bg-brand-offWhite px-3 py-2 text-xs font-semibold uppercase">{categoryForm.status}</span> : null}</div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Nama"><input value={categoryForm.name} onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value, slug: current.slug || slugify(event.target.value) }))} required className={inputClass} /></Field>
              <Field label="Slug"><input value={categoryForm.slug} onChange={(event) => setCategoryForm((current) => ({ ...current, slug: slugify(event.target.value) }))} required className={inputClass} /></Field>
              <Field label="Sumber kategori PIM"><select value={categoryForm.source_product_category_id || ""} onChange={(event) => setCategoryForm((current) => ({ ...current, source_product_category_id: event.target.value || null }))} className={inputClass}><option value="">Tanpa relasi otomatis</option>{productCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field>
              <Field label="Jenis alur"><select value={categoryForm.entry_type} onChange={(event) => setCategoryForm((current) => ({ ...current, entry_type: event.target.value as EntryType, target_route: event.target.value === "jersey_configurator" ? current.target_route || "/jersey/configurator" : null, supports_full_custom: event.target.value !== "jersey_configurator" }))} className={inputClass}><option value="project_builder">Project Builder non-Jersey</option><option value="jersey_configurator">Jersey Configurator existing</option></select></Field>
              {categoryForm.entry_type === "jersey_configurator" ? <Field label="Target route"><input value={categoryForm.target_route || ""} onChange={(event) => setCategoryForm((current) => ({ ...current, target_route: event.target.value }))} placeholder="/jersey/configurator" required className={inputClass} /></Field> : <>
                <Field label="Mode pemesanan"><div className="flex min-h-11 flex-wrap items-center gap-5 border border-brand-softGray px-3"><Check label="Paket Instan" checked={categoryForm.supports_quick_custom} onChange={(checked) => setCategoryForm((current) => ({ ...current, supports_quick_custom: checked }))} /><Check label="Custom Bebas" checked={categoryForm.supports_full_custom} onChange={(checked) => setCategoryForm((current) => ({ ...current, supports_full_custom: checked }))} /></div></Field>
              </>}
              <Field label="Status harga"><select value={categoryForm.price_display_mode} onChange={(event) => setCategoryForm((current) => ({ ...current, price_display_mode: event.target.value as PriceMode }))} className={inputClass}><option value="final">Final</option><option value="estimated">Estimasi</option><option value="quotation">Perlu quotation</option></select></Field>
              <Field label="Status CMS"><select value={categoryForm.status} onChange={(event) => setCategoryForm((current) => ({ ...current, status: event.target.value as CategoryStatus }))} className={inputClass}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></Field>
              <Field label="Minimum order (teks)"><input value={categoryForm.minimum_order_display} onChange={(event) => setCategoryForm((current) => ({ ...current, minimum_order_display: event.target.value }))} required className={inputClass} /></Field>
              <Field label="Lead time (teks)"><input value={categoryForm.lead_time_display} onChange={(event) => setCategoryForm((current) => ({ ...current, lead_time_display: event.target.value }))} required className={inputClass} /></Field>
              <Field label="Urutan"><input type="number" value={categoryForm.sort_order} onChange={(event) => setCategoryForm((current) => ({ ...current, sort_order: numberValue(event.target.value) }))} className={inputClass} /></Field>
              <Field label="Gambar dari Media Library"><select value={media.some((asset) => asset.public_url === categoryForm.image_url) ? categoryForm.image_url || "" : ""} onChange={(event) => { const asset = media.find((item) => item.public_url === event.target.value); setCategoryForm((current) => ({ ...current, image_url: asset?.public_url || current.image_url, image_alt: current.image_alt || asset?.name || current.name })); }} className={inputClass}><option value="">Pilih gambar</option>{media.map((asset) => <option key={asset.id} value={asset.public_url}>{asset.name}</option>)}</select></Field>
              <Field label="URL gambar"><input value={categoryForm.image_url || ""} onChange={(event) => setCategoryForm((current) => ({ ...current, image_url: event.target.value }))} className={inputClass} /></Field>
              <Field label="Alt text"><input value={categoryForm.image_alt || ""} onChange={(event) => setCategoryForm((current) => ({ ...current, image_alt: event.target.value }))} className={inputClass} /></Field>
              <Field label="Deskripsi" wide><textarea value={categoryForm.short_description || ""} onChange={(event) => setCategoryForm((current) => ({ ...current, short_description: event.target.value }))} rows={3} className={inputClass} /></Field>
              <Field label="SEO title"><input value={categoryForm.seo_title || ""} onChange={(event) => setCategoryForm((current) => ({ ...current, seo_title: event.target.value }))} className={inputClass} /></Field>
              <Field label="SEO description"><input value={categoryForm.seo_description || ""} onChange={(event) => setCategoryForm((current) => ({ ...current, seo_description: event.target.value }))} className={inputClass} /></Field>
            </div>
            <button data-admin-mutation="true" disabled={working} className="mt-6 min-h-11 rounded-full bg-brand-green px-6 text-sm font-semibold text-white disabled:opacity-45">{working ? "Menyimpan..." : categoryForm.status === "published" ? "Simpan & Publish" : "Simpan Draft"}</button>
          </form>

          {selected ? <>
            <section className="grid gap-5 lg:grid-cols-2">
              <DataLinkPanel title="Produk PIM" description="Centang produk yang boleh dikustom. Produk default dipilih saat pembeli masuk dari kategori ini.">
                <div className="grid max-h-96 gap-2 overflow-y-auto pr-1">{sourceProducts.map((product) => { const mapping = categoryMappings.find((item) => item.product_id === product.id); return <div key={product.id} className="flex items-center justify-between gap-3 border border-brand-softGray p-3"><Check label={product.name} checked={categoryProductIds.has(product.id)} disabled={working} onChange={(checked) => void toggleProduct(product, checked)} />{mapping ? <button data-admin-mutation="true" type="button" disabled={working || mapping.is_default} onClick={() => void makeDefaultProduct(product.id)} className="text-xs font-semibold text-brand-green disabled:text-brand-charcoal/40">{mapping.is_default ? "DEFAULT" : "Jadikan default"}</button> : null}</div>; })}{!sourceProducts.length ? <p className="bg-brand-offWhite p-4 text-sm text-brand-charcoal/60">Tidak ada produk PIM aktif pada sumber kategori ini.</p> : null}</div>
              </DataLinkPanel>
              <DataLinkPanel title="Layanan kompatibel" description="Hanya layanan aktif dan memiliki pricing rule yang akan dihitung oleh server.">
                <div className="grid max-h-96 gap-2 overflow-y-auto pr-1">{services.map((service) => <div key={service.id} className="border border-brand-softGray p-3"><Check label={service.name} checked={categoryServiceIds.has(service.id)} disabled={working} onChange={(checked) => void toggleService(service, checked)} /><p className="mt-1 pl-6 text-xs text-brand-charcoal/55">{service.pricing_type} · minimum {service.minimum_quantity} pcs</p></div>)}{!services.length ? <p className="bg-brand-offWhite p-4 text-sm text-brand-charcoal/60">Belum ada layanan Custom aktif. Kelola melalui menu Layanan/Bulk & Custom.</p> : null}</div>
              </DataLinkPanel>
            </section>

            <section className="border border-brand-softGray bg-white p-5 sm:p-6">
              <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-green">Shortcut pembeli</p><h2 className="mt-2 text-2xl font-semibold">Paket Instan</h2><p className="mt-2 text-sm text-brand-charcoal/60">Preset tidak membuat harga baru. Produk dan layanan tetap dihitung ulang oleh pricing server.</p></div>
              <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <form onSubmit={savePreset} className="grid gap-3 border border-brand-softGray p-4">
                  <Field label="Nama paket"><input value={text(presetForm.name)} onChange={(event) => setPresetForm((current) => ({ ...current, name: event.target.value, slug: text(current.slug) || slugify(event.target.value) }))} className={inputClass} /></Field>
                  <Field label="Slug"><input value={text(presetForm.slug)} onChange={(event) => setPresetForm((current) => ({ ...current, slug: slugify(event.target.value) }))} className={inputClass} /></Field>
                  <Field label="Produk default"><select value={text(presetForm.default_product_id)} onChange={(event) => setPresetForm((current) => ({ ...current, default_product_id: event.target.value || null }))} className={inputClass}><option value="">Pilih saat konfigurasi</option>{sourceProducts.filter((product) => categoryProductIds.has(product.id)).map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></Field>
                  <Field label="Jumlah awal"><input type="number" min={1} step={1} value={presetQuantity} onChange={(event) => setPresetForm((current) => ({ ...current, configuration_defaults: { ...(isRecord(current.configuration_defaults) ? current.configuration_defaults : {}), quantity: Math.max(1, Math.trunc(numberValue(event.target.value) || 1)) } }))} className={inputClass} /></Field>
                  <Field label="Layanan default">
                    <div className="grid max-h-44 gap-2 overflow-y-auto border border-brand-softGray p-3">
                      {services.filter((service) => categoryServiceIds.has(service.id)).map((service) => <Check key={service.id} label={service.name} checked={presetServiceIds.has(service.id)} onChange={(checked) => setPresetForm((current) => { const defaults = isRecord(current.configuration_defaults) ? current.configuration_defaults : {}; const ids = new Set(stringArray(defaults.service_ids)); if (checked) ids.add(service.id); else ids.delete(service.id); return { ...current, configuration_defaults: { ...defaults, service_ids: Array.from(ids) } }; })} />)}
                      {!categoryServiceIds.size ? <p className="text-xs text-brand-charcoal/55">Hubungkan layanan pada kategori terlebih dahulu.</p> : null}
                    </div>
                  </Field>
                  <Field label="Personalisasi default"><select value={presetPersonalizationRuleId} onChange={(event) => setPresetForm((current) => ({ ...current, configuration_defaults: { ...(isRecord(current.configuration_defaults) ? current.configuration_defaults : {}), personalization_rule_id: event.target.value || null } }))} className={inputClass}><option value="">Tanpa personalisasi default</option>{selectedPersonalization.map((rule) => <option key={rule.id} value={rule.id}>{rule.name}</option>)}</select></Field>
                  <Field label="Status harga"><select value={(presetForm.price_display_mode as PriceMode | null) || ""} onChange={(event) => setPresetForm((current) => ({ ...current, price_display_mode: (event.target.value || null) as PriceMode | null }))} className={inputClass}><option value="">Ikuti kategori</option><option value="final">Final</option><option value="estimated">Estimasi</option><option value="quotation">Perlu quotation</option></select></Field>
                  <Field label="Status"><select value={(presetForm.status as CategoryStatus) || "draft"} onChange={(event) => setPresetForm((current) => ({ ...current, status: event.target.value as CategoryStatus }))} className={inputClass}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></Field>
                  <Field label="Mockup"><select value={media.some((asset) => asset.public_url === presetForm.mockup_url) ? text(presetForm.mockup_url) : ""} onChange={(event) => setPresetForm((current) => ({ ...current, mockup_url: event.target.value || null }))} className={inputClass}><option value="">Pilih dari Media Library</option>{media.map((asset) => <option key={asset.id} value={asset.public_url}>{asset.name}</option>)}</select></Field>
                  <Field label="Alt mockup"><input value={text(presetForm.mockup_alt)} onChange={(event) => setPresetForm((current) => ({ ...current, mockup_alt: event.target.value }))} className={inputClass} /></Field>
                  <Field label="Minimum order (teks)"><input value={text(presetForm.minimum_order_display)} onChange={(event) => setPresetForm((current) => ({ ...current, minimum_order_display: event.target.value }))} placeholder="Ikuti produk jika kosong" className={inputClass} /></Field>
                  <Field label="Lead time (teks)"><input value={text(presetForm.lead_time_display)} onChange={(event) => setPresetForm((current) => ({ ...current, lead_time_display: event.target.value }))} placeholder="Ikuti kategori jika kosong" className={inputClass} /></Field>
                  <Field label="Urutan"><input type="number" value={numberValue(presetForm.sort_order)} onChange={(event) => setPresetForm((current) => ({ ...current, sort_order: numberValue(event.target.value) }))} className={inputClass} /></Field>
                  <Field label="Deskripsi"><textarea value={text(presetForm.short_description)} onChange={(event) => setPresetForm((current) => ({ ...current, short_description: event.target.value }))} rows={3} className={inputClass} /></Field>
                  <button data-admin-mutation="true" disabled={working} className="min-h-11 rounded-full bg-brand-charcoal px-5 text-sm font-semibold text-white disabled:opacity-45">{presetForm.id ? "Perbarui Paket" : "Tambah Paket"}</button>
                </form>
                <div className="grid content-start gap-3">{selectedPresets.map((preset) => <article key={preset.id} className="flex gap-3 border border-brand-softGray p-3">{preset.mockup_url ? <img src={preset.mockup_url} alt={preset.mockup_alt || preset.name} className="h-20 w-20 object-cover" /> : <div className="grid h-20 w-20 place-items-center bg-brand-offWhite text-[10px] font-semibold text-brand-charcoal/40">MOCKUP</div>}<div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><h3 className="font-semibold">{preset.name}</h3><span className="text-[10px] font-semibold uppercase">{preset.status}</span></div><p className="mt-1 text-xs text-brand-charcoal/55">/{preset.slug}</p><div className="mt-3 flex gap-3"><button type="button" onClick={() => setPresetForm({ ...preset })} className="text-xs font-semibold underline">Edit</button><button data-admin-mutation="true" type="button" onClick={() => void archivePreset(preset.id)} className="text-xs font-semibold text-red-700 underline">Arsipkan</button></div></div></article>)}{!selectedPresets.length ? <p className="bg-brand-offWhite p-4 text-sm text-brand-charcoal/60">Belum ada Paket Instan. Custom Bebas tetap dapat digunakan jika diaktifkan.</p> : null}</div>
              </div>
            </section>

            <section className="border border-brand-softGray bg-white p-5 sm:p-6">
              <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-green">Konfigurasi tambahan</p><h2 className="mt-2 text-2xl font-semibold">Posisi, ukuran cetak, dan personalisasi</h2></div>
              <form onSubmit={saveSimpleConfiguration} className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[180px_1fr_1fr_160px_auto]">
                <select value={simpleKind} onChange={(event) => setSimpleKind(event.target.value as SimpleEditorKind)} className={inputClass}><option value="placement">Posisi desain</option><option value="print-size">Ukuran cetak</option><option value="personalization">Personalisasi</option></select>
                <input value={simpleName} onChange={(event) => { setSimpleName(event.target.value); if (!simpleSlug) setSimpleSlug(slugify(event.target.value)); }} placeholder="Nama" className={inputClass} />
                <input value={simpleSlug} onChange={(event) => setSimpleSlug(slugify(event.target.value))} placeholder="slug" className={inputClass} />
                <input type="number" min={0} value={simplePrice} onChange={(event) => setSimplePrice(numberValue(event.target.value))} placeholder="Tambahan harga" className={inputClass} />
                <button data-admin-mutation="true" disabled={working} className="min-h-11 rounded-full bg-brand-charcoal px-5 text-sm font-semibold text-white disabled:opacity-45">Tambah</button>
              </form>
              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                <SimpleList title="Posisi" rows={selectedPlacements.map((row) => ({ id: row.id, name: row.name, detail: money(row.price_adjustment) }))} onDeactivate={(id) => void deactivateSimple("custom_placements", id)} />
                <SimpleList title="Ukuran cetak" rows={selectedPrintSizes.map((row) => ({ id: row.id, name: row.name, detail: money(row.price_adjustment) }))} onDeactivate={(id) => void deactivateSimple("custom_print_sizes", id)} />
                <SimpleList title="Personalisasi" rows={selectedPersonalization.map((row) => ({ id: row.id, name: row.name, detail: row.pricing_type }))} onDeactivate={(id) => void deactivateSimple("custom_personalization_rules", id)} />
              </div>
            </section>
          </> : <section className="border border-brand-softGray bg-white p-8 text-center"><h2 className="text-xl font-semibold">Simpan kategori terlebih dahulu</h2><p className="mt-2 text-sm text-brand-charcoal/60">Setelah kategori tersimpan, hubungkan produk, layanan, Paket Instan, dan konfigurasi tambahan.</p></section>}
        </div>
      </section>
    </div>
  );
}

const inputClass = "min-h-11 w-full border border-brand-softGray bg-white px-3 text-sm font-normal text-brand-charcoal outline-none focus:border-brand-charcoal";

function Field({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
  return <label className={`grid gap-2 text-xs font-semibold ${wide ? "sm:col-span-2" : ""}`}>{label}{children}</label>;
}

function Check({ label, checked, onChange, disabled = false }: { label: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) {
  return <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4" />{label}</label>;
}

function DataLinkPanel({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <section className="border border-brand-softGray bg-white p-5"><h2 className="text-xl font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-brand-charcoal/60">{description}</p><div className="mt-4">{children}</div></section>;
}

function SimpleList({ title, rows, onDeactivate }: { title: string; rows: { id: string; name: string; detail: string }[]; onDeactivate: (id: string) => void }) {
  return <div className="border border-brand-softGray p-4"><h3 className="font-semibold">{title}</h3><div className="mt-3 grid gap-2">{rows.map((row) => <div key={row.id} className="flex items-center justify-between gap-3 bg-brand-offWhite p-3"><div><p className="text-sm font-semibold">{row.name}</p><p className="mt-1 text-xs text-brand-charcoal/55">{row.detail}</p></div><button data-admin-mutation="true" type="button" onClick={() => onDeactivate(row.id)} className="text-xs font-semibold text-red-700 underline">Nonaktifkan</button></div>)}{!rows.length ? <p className="text-sm text-brand-charcoal/55">Belum ada data.</p> : null}</div></div>;
}

function normalizeCategoryPayload(form: CategoryDraft) {
  const entryType = form.entry_type;
  return {
    name: form.name.trim(),
    slug: slugify(form.slug || form.name),
    short_description: nullableText(form.short_description),
    image_url: nullableText(form.image_url),
    image_alt: nullableText(form.image_alt) || form.name.trim(),
    entry_type: entryType,
    target_route: entryType === "jersey_configurator" ? nullableText(form.target_route) : null,
    supports_quick_custom: entryType === "project_builder" && form.supports_quick_custom,
    supports_full_custom: entryType === "project_builder" && form.supports_full_custom,
    price_display_mode: form.price_display_mode,
    minimum_order_display: form.minimum_order_display.trim(),
    lead_time_display: form.lead_time_display.trim(),
    source_product_category_id: nullableText(form.source_product_category_id),
    seo_title: nullableText(form.seo_title),
    seo_description: nullableText(form.seo_description),
    status: form.status,
    is_active: form.status !== "archived" && form.is_active,
    sort_order: numberValue(form.sort_order)
  };
}

function validateCategory(payload: ReturnType<typeof normalizeCategoryPayload>, mappedProducts: number, compatibleServices: number) {
  if (!payload.name || !payload.slug) return "Nama dan slug kategori wajib diisi.";
  if (!payload.minimum_order_display || !payload.lead_time_display) return "Minimum order dan lead time wajib diisi.";
  if (payload.entry_type === "jersey_configurator" && (!payload.target_route || !payload.target_route.startsWith("/") || payload.target_route.startsWith("//"))) return "Target Jersey harus berupa route lokal yang valid.";
  if (payload.entry_type === "project_builder" && !payload.supports_quick_custom && !payload.supports_full_custom) return "Aktifkan Paket Instan atau Custom Bebas.";
  if (payload.status === "published" && payload.entry_type === "project_builder" && mappedProducts < 1) return "Hubungkan minimal satu produk PIM sebelum kategori dipublikasikan.";
  if (payload.status === "published" && payload.entry_type === "project_builder" && compatibleServices < 1) return "Hubungkan minimal satu layanan Custom sebelum kategori dipublikasikan.";
  return "";
}

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function nullableText(value: unknown) { const candidate = text(value); return candidate || null; }
function text(value: unknown) { return typeof value === "string" ? value : ""; }
function stringArray(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.length > 0) : []; }
function numberValue(value: unknown) { const parsed = typeof value === "number" ? value : Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function money(value: number) { return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value); }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
