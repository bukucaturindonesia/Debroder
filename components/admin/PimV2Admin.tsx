"use client";

import { FormEvent, useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";
import { VariantGalleryManager } from "@/components/admin/VariantGalleryManager";
import {
  normalizePimSlug,
  pimV2PricingModes,
  pimV2ProductTypes
} from "@/lib/pim-v2";
import { formatRupiah } from "@/lib/url";
import type { PricingMode, ProductType } from "@/lib/types";

type ProductRow = {
  id?: string;
  nama: string;
  slug?: string;
  kategori?: string;
  subcategory?: string;
  product_category_id?: string | null;
  product_subcategory_id?: string | null;
  product_type?: ProductType;
  pricing_mode?: PricingMode;
  price?: number | string | null;
  sku?: string | null;
  has_variants?: boolean;
  uses_configurator?: boolean;
  minimum_order_qty?: number;
  required_services?: string[];
  size_guide_id?: string | null;
  status_aktif?: boolean;
  urutan?: number;
};

type CategoryRow = {
  id?: string;
  name: string;
  slug: string;
  category_kind?: string;
  description?: string;
  is_active?: boolean;
  sort_order?: number;
};

type SubcategoryRow = {
  id?: string;
  category_id: string;
  name: string;
  slug: string;
  description?: string;
  public_label?: string | null;
  is_active?: boolean;
  sort_order?: number;
};

type ColorRow = {
  id?: string;
  name: string;
  slug: string;
  color_hex: string;
  color_group?: string;
  is_active?: boolean;
  sort_order?: number;
};

type SizeRow = {
  id?: string;
  name: string;
  slug: string;
  size_group?: string;
  is_active?: boolean;
  sort_order?: number;
};

type ServiceRow = {
  id?: string;
  name: string;
  slug: string;
  description?: string;
  base_price?: number | string;
  pricing_mode?: string;
  unit_label?: string;
  is_required_default?: boolean;
  is_active?: boolean;
  sort_order?: number;
};

type VariantRow = {
  id?: string;
  product_id: string;
  variant_name?: string;
  color_name?: string;
  color_hex?: string;
  sku?: string | null;
  price_adjustment?: number | string;
  image_url?: string | null;
  images?: string[];
  object_fit?: "cover" | "contain";
  object_position?: string;
  is_active?: boolean;
  sort_order?: number;
};

type VariantSizeRow = {
  id?: string;
  variant_id: string;
  size_name: string;
  sku?: string | null;
  stock?: number;
  price_adjustment?: number | string;
  is_active?: boolean;
  sort_order?: number;
};

type VariantImageRow = {
  id?: string;
  variant_id: string;
  image_url: string;
  image_role?: "front" | "back" | "detail" | "lifestyle";
  alt_text?: string;
  object_fit?: "cover" | "contain";
  object_position?: string;
  is_cover?: boolean;
  sort_order: number;
};

type SizeGuideRow = {
  id?: string;
  product_id?: string | null;
  product_category_id?: string | null;
  product_subcategory_id?: string | null;
  title: string;
  description?: string;
  rows?: Array<Record<string, string | number>>;
  notes?: string[];
  is_active?: boolean;
  sort_order?: number;
};

type JerseyPackageRow = {
  id?: string;
  name: string;
  slug: string;
  base_price?: number | string;
  description?: string;
  is_active?: boolean;
  sort_order?: number;
};

type JerseyAdjustableRow = {
  id?: string;
  name: string;
  slug: string;
  price_adjustment?: number | string;
  description?: string;
  is_active?: boolean;
  sort_order?: number;
  group_id?: string | null;
  image_url?: string | null;
  icon_url?: string | null;
};

type CollarGroupRow = {
  id?: string;
  name: string;
  slug: string;
  is_active?: boolean;
  sort_order?: number;
};

type TabKey = "products" | "variants" | "masters" | "jersey" | "guides";

type StatusMessage = { type: "info" | "success" | "error"; text: string };

const defaultProductPatch = {
  product_type: "standard_product" as ProductType,
  pricing_mode: "fixed_price" as PricingMode,
  has_variants: false,
  uses_configurator: false,
  minimum_order_qty: 1,
  sku: ""
};

const emptySubcategory: SubcategoryRow = {
  category_id: "",
  name: "",
  slug: "",
  description: "",
  public_label: "",
  is_active: true,
  sort_order: 0
};

const emptyService: ServiceRow = {
  name: "",
  slug: "",
  description: "",
  base_price: 0,
  pricing_mode: "fixed_price",
  unit_label: "",
  is_required_default: false,
  is_active: true,
  sort_order: 0
};

const emptyColor: ColorRow = {
  name: "",
  slug: "",
  color_hex: "#111111",
  color_group: "basic",
  is_active: true,
  sort_order: 0
};

const emptySize: SizeRow = {
  name: "",
  slug: "",
  size_group: "apparel",
  is_active: true,
  sort_order: 0
};

const emptyVariant: VariantRow = {
  product_id: "",
  variant_name: "",
  color_name: "",
  color_hex: "#111111",
  sku: "",
  price_adjustment: 0,
  image_url: "",
  images: [],
  object_fit: "cover",
  object_position: "center center",
  is_active: true,
  sort_order: 0
};

const emptyVariantSize: VariantSizeRow = {
  variant_id: "",
  size_name: "S",
  sku: "",
  stock: 0,
  price_adjustment: 0,
  is_active: true,
  sort_order: 0
};


const emptySizeGuide: SizeGuideRow = {
  product_id: null,
  product_category_id: null,
  product_subcategory_id: null,
  title: "Panduan Ukuran",
  description: "",
  rows: [
    { size: "S", lebar: "48 cm", panjang: "68 cm" },
    { size: "M", lebar: "50 cm", panjang: "70 cm" },
    { size: "L", lebar: "52 cm", panjang: "72 cm" },
    { size: "XL", lebar: "54 cm", panjang: "74 cm" }
  ],
  notes: [],
  is_active: true,
  sort_order: 0
};

const emptyPackage: JerseyPackageRow = {
  name: "",
  slug: "",
  base_price: 0,
  description: "",
  is_active: true,
  sort_order: 0
};

const emptyAdjustable: JerseyAdjustableRow = {
  name: "",
  slug: "",
  price_adjustment: 0,
  description: "",
  is_active: true,
  sort_order: 0
};

const emptyCollarGroup: CollarGroupRow = {
  name: "",
  slug: "",
  is_active: true,
  sort_order: 0
};

function asNumber(value: string | number | null | undefined, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseJsonRows(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function listToTextarea(value?: string[]) {
  return (value || []).join("\n");
}

function textareaToList(value: string) {
  return value.split("\n").map((item) => item.trim()).filter(Boolean);
}

function StatusBox({ message }: { message: StatusMessage | null }) {
  if (!message) return null;
  const tone = message.type === "error"
    ? "border-red-200 bg-red-50 text-red-800"
    : message.type === "success"
      ? "border-green-200 bg-green-50 text-green-800"
      : "border-brand-softGray bg-white text-brand-charcoal";
  return <p role="status" className={`border p-4 text-sm font-semibold ${tone}`}>{message.text}</p>;
}

function SmallLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-charcoal/45">{children}</span>;
}

function Field({ label, children, helper }: { label: string; children: React.ReactNode; helper?: string }) {
  return (
    <label className="block text-sm font-semibold text-brand-charcoal">
      {label}
      <span className="mt-2 block [&>input]:min-h-11 [&>input]:w-full [&>input]:rounded-xl [&>input]:border [&>input]:border-brand-softGray [&>input]:bg-white [&>input]:px-4 [&>input]:font-normal [&>select]:min-h-11 [&>select]:w-full [&>select]:rounded-xl [&>select]:border [&>select]:border-brand-softGray [&>select]:bg-white [&>select]:px-4 [&>select]:font-normal [&>textarea]:w-full [&>textarea]:rounded-xl [&>textarea]:border [&>textarea]:border-brand-softGray [&>textarea]:bg-white [&>textarea]:px-4 [&>textarea]:py-3 [&>textarea]:font-normal">
        {children}
      </span>
      {helper ? <span className="mt-1 block text-xs font-medium text-brand-charcoal/50">{helper}</span> : null}
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex min-h-11 items-center gap-3 rounded-xl border border-brand-softGray bg-white px-4 text-sm font-semibold">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-brand-green" />
      {label}
    </label>
  );
}

function formatMoney(value?: number | string | null) {
  return formatRupiah(value) || "Rp 0";
}

export function PimV2Admin() {
  const [activeTab, setActiveTab] = useState<TabKey>("variants");
  const [status, setStatus] = useState<StatusMessage | null>({ type: "info", text: "Memuat data PIM V2..." });
  const [loading, setLoading] = useState(true);

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [subcategories, setSubcategories] = useState<SubcategoryRow[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [colors, setColors] = useState<ColorRow[]>([]);
  const [sizes, setSizes] = useState<SizeRow[]>([]);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [variantSizes, setVariantSizes] = useState<VariantSizeRow[]>([]);
  const [variantImages, setVariantImages] = useState<VariantImageRow[]>([]);
  const [sizeGuides, setSizeGuides] = useState<SizeGuideRow[]>([]);
  const [packages, setPackages] = useState<JerseyPackageRow[]>([]);
  const [materials, setMaterials] = useState<JerseyAdjustableRow[]>([]);
  const [collarGroups, setCollarGroups] = useState<CollarGroupRow[]>([]);
  const [collars, setCollars] = useState<JerseyAdjustableRow[]>([]);
  const [addons, setAddons] = useState<JerseyAdjustableRow[]>([]);

  const [productPatch, setProductPatch] = useState<ProductRow>({ nama: "", ...defaultProductPatch });
  const [selectedProductId, setSelectedProductId] = useState("");
  const [subcategoryForm, setSubcategoryForm] = useState<SubcategoryRow>({ ...emptySubcategory });
  const [serviceForm, setServiceForm] = useState<ServiceRow>({ ...emptyService });
  const [colorForm, setColorForm] = useState<ColorRow>({ ...emptyColor });
  const [sizeForm, setSizeForm] = useState<SizeRow>({ ...emptySize });
  const [variantForm, setVariantForm] = useState<VariantRow>({ ...emptyVariant });
  const [variantSizeForm, setVariantSizeForm] = useState<VariantSizeRow>({ ...emptyVariantSize });
  const [sizeGuideForm, setSizeGuideForm] = useState<SizeGuideRow>({ ...emptySizeGuide });
  const [rowsText, setRowsText] = useState(JSON.stringify(emptySizeGuide.rows, null, 2));
  const [notesText, setNotesText] = useState("");
  const [packageForm, setPackageForm] = useState<JerseyPackageRow>({ ...emptyPackage });
  const [materialForm, setMaterialForm] = useState<JerseyAdjustableRow>({ ...emptyAdjustable });
  const [collarGroupForm, setCollarGroupForm] = useState<CollarGroupRow>({ ...emptyCollarGroup });
  const [collarForm, setCollarForm] = useState<JerseyAdjustableRow>({ ...emptyAdjustable });
  const [addonForm, setAddonForm] = useState<JerseyAdjustableRow>({ ...emptyAdjustable });
  const [minimumOrder, setMinimumOrder] = useState("6");

  async function loadData() {
    const supabase = createSupabaseClient();
    if (!supabase) {
      setStatus({ type: "error", text: "Supabase belum dikonfigurasi. Cek NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY." });
      setLoading(false);
      return;
    }

    setLoading(true);
    const [
      productResult,
      categoryResult,
      subcategoryResult,
      serviceResult,
      colorResult,
      sizeResult,
      variantResult,
      variantSizeResult,
      variantImageResult,
      sizeGuideResult,
      packageResult,
      materialResult,
      collarGroupResult,
      collarResult,
      addonResult,
      settingResult
    ] = await Promise.all([
      supabase.from("products").select("*").order("urutan", { ascending: true }),
      supabase.from("product_categories").select("*").order("sort_order", { ascending: true }),
      supabase.from("product_subcategories").select("*").order("sort_order", { ascending: true }),
      supabase.from("production_services").select("*").order("sort_order", { ascending: true }),
      supabase.from("product_color_master").select("*").order("sort_order", { ascending: true }),
      supabase.from("product_size_master").select("*").order("sort_order", { ascending: true }),
      supabase.from("product_variants").select("*").order("sort_order", { ascending: true }),
      supabase.from("product_variant_sizes").select("*").order("sort_order", { ascending: true }),
      supabase.from("product_variant_images").select("*").order("sort_order", { ascending: true }),
      supabase.from("product_size_guides").select("*").order("sort_order", { ascending: true }),
      supabase.from("jersey_packages").select("*").order("sort_order", { ascending: true }),
      supabase.from("jersey_materials").select("*").order("sort_order", { ascending: true }),
      supabase.from("jersey_collar_groups").select("*").order("sort_order", { ascending: true }),
      supabase.from("jersey_collars").select("*").order("sort_order", { ascending: true }),
      supabase.from("jersey_addons").select("*").order("sort_order", { ascending: true }),
      supabase.from("jersey_settings").select("*").eq("setting_key", "minimum_order_qty").maybeSingle()
    ]);

    const errors = [subcategoryResult, serviceResult, colorResult, sizeResult, variantResult, variantSizeResult, variantImageResult, sizeGuideResult, packageResult, materialResult, collarGroupResult, collarResult, addonResult]
      .map((result) => result.error?.message)
      .filter(Boolean);

    if (errors.length) {
      setStatus({ type: "error", text: `PIM V2 belum siap. Jalankan SQL Stage 1 dulu. Detail: ${errors[0]}` });
      setLoading(false);
      return;
    }

    setProducts((productResult.data || []) as ProductRow[]);
    setCategories((categoryResult.data || []) as CategoryRow[]);
    setSubcategories((subcategoryResult.data || []) as SubcategoryRow[]);
    setServices((serviceResult.data || []) as ServiceRow[]);
    setColors((colorResult.data || []) as ColorRow[]);
    setSizes((sizeResult.data || []) as SizeRow[]);
    setVariants((variantResult.data || []) as VariantRow[]);
    setVariantSizes((variantSizeResult.data || []) as VariantSizeRow[]);
    setVariantImages((variantImageResult.data || []) as VariantImageRow[]);
    setSizeGuides((sizeGuideResult.data || []) as SizeGuideRow[]);
    setPackages((packageResult.data || []) as JerseyPackageRow[]);
    setMaterials((materialResult.data || []) as JerseyAdjustableRow[]);
    setCollarGroups((collarGroupResult.data || []) as CollarGroupRow[]);
    setCollars((collarResult.data || []) as JerseyAdjustableRow[]);
    setAddons((addonResult.data || []) as JerseyAdjustableRow[]);

    const settingValue = settingResult.data?.setting_value as { minimum_order_qty?: number } | null | undefined;
    setMinimumOrder(String(settingValue?.minimum_order_qty || 6));
    setStatus({ type: "success", text: "PIM V2 siap. Admin bisa mengelola master data, varian, size guide, dan fondasi jersey." });
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  const selectedProduct = products.find((product) => product.id === selectedProductId) || null;
  const selectedProductVariants = variants.filter((variant) => variant.product_id === selectedProductId);
  const activeCategories = categories.filter((category) => category.category_kind !== "service" && category.is_active !== false);
  const productSubcategories = subcategories.filter((item) => item.category_id === productPatch.product_category_id);

  function productName(id?: string | null) {
    return products.find((item) => item.id === id)?.nama || "—";
  }

  function categoryName(id?: string | null) {
    return categories.find((item) => item.id === id)?.name || "—";
  }

  function subcategoryName(id?: string | null) {
    return subcategories.find((item) => item.id === id)?.name || "—";
  }

  function applyProduct(product: ProductRow) {
    setProductPatch({
      ...product,
      product_type: product.product_type || "standard_product",
      pricing_mode: product.pricing_mode || "fixed_price",
      has_variants: Boolean(product.has_variants),
      uses_configurator: Boolean(product.uses_configurator),
      minimum_order_qty: product.minimum_order_qty || 1,
      sku: product.sku || ""
    });
  }

  async function saveProductPatch(event: FormEvent) {
    event.preventDefault();
    const supabase = createSupabaseClient();
    if (!supabase || !productPatch.id) return;

    const category = categories.find((item) => item.id === productPatch.product_category_id);
    const subcategory = subcategories.find((item) => item.id === productPatch.product_subcategory_id);
    const payload = {
      product_category_id: productPatch.product_category_id || null,
      product_subcategory_id: productPatch.product_subcategory_id || null,
      product_type: productPatch.product_type || "standard_product",
      pricing_mode: productPatch.pricing_mode || "fixed_price",
      has_variants: Boolean(productPatch.has_variants),
      uses_configurator: Boolean(productPatch.uses_configurator),
      minimum_order_qty: Math.max(1, asNumber(productPatch.minimum_order_qty, 1)),
      sku: productPatch.sku || null,
      kategori: category?.name || productPatch.kategori || "",
      subcategory: subcategory?.name || productPatch.subcategory || "",
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from("products").update(payload).eq("id", productPatch.id);
    if (error) setStatus({ type: "error", text: `Produk gagal disimpan: ${error.message}` });
    else {
      setStatus({ type: "success", text: "Pengaturan PIM V2 produk berhasil disimpan." });
      await loadData();
    }
  }

  async function saveSubcategory(event: FormEvent) {
    event.preventDefault();
    const supabase = createSupabaseClient();
    if (!supabase) return;
    const payload = {
      ...subcategoryForm,
      slug: subcategoryForm.slug || normalizePimSlug(subcategoryForm.name),
      description: subcategoryForm.description || "",
      public_label: subcategoryForm.public_label || null,
      sort_order: asNumber(subcategoryForm.sort_order),
      is_active: subcategoryForm.is_active !== false
    };
    const request = subcategoryForm.id
      ? supabase.from("product_subcategories").update(payload).eq("id", subcategoryForm.id)
      : supabase.from("product_subcategories").insert(payload);
    const { error } = await request;
    if (error) setStatus({ type: "error", text: `Subkategori gagal disimpan: ${error.message}` });
    else {
      setSubcategoryForm({ ...emptySubcategory });
      setStatus({ type: "success", text: "Subkategori PIM V2 berhasil disimpan." });
      await loadData();
    }
  }

  async function saveService(event: FormEvent) {
    event.preventDefault();
    const supabase = createSupabaseClient();
    if (!supabase) return;
    const payload = {
      ...serviceForm,
      slug: serviceForm.slug || normalizePimSlug(serviceForm.name),
      description: serviceForm.description || "",
      base_price: asNumber(serviceForm.base_price),
      unit_label: serviceForm.unit_label || "",
      is_required_default: Boolean(serviceForm.is_required_default),
      is_active: serviceForm.is_active !== false,
      sort_order: asNumber(serviceForm.sort_order)
    };
    const request = serviceForm.id
      ? supabase.from("production_services").update(payload).eq("id", serviceForm.id)
      : supabase.from("production_services").insert(payload);
    const { error } = await request;
    if (error) setStatus({ type: "error", text: `Layanan produksi gagal disimpan: ${error.message}` });
    else {
      setServiceForm({ ...emptyService });
      setStatus({ type: "success", text: "Layanan produksi berhasil disimpan." });
      await loadData();
    }
  }

  async function saveColor(event: FormEvent) {
    event.preventDefault();
    const supabase = createSupabaseClient();
    if (!supabase) return;
    const payload = {
      ...colorForm,
      slug: colorForm.slug || normalizePimSlug(colorForm.name),
      color_group: colorForm.color_group || "basic",
      is_active: colorForm.is_active !== false,
      sort_order: asNumber(colorForm.sort_order)
    };
    const request = colorForm.id
      ? supabase.from("product_color_master").update(payload).eq("id", colorForm.id)
      : supabase.from("product_color_master").insert(payload);
    const { error } = await request;
    if (error) setStatus({ type: "error", text: `Warna gagal disimpan: ${error.message}` });
    else {
      setColorForm({ ...emptyColor });
      setStatus({ type: "success", text: "Master warna berhasil disimpan." });
      await loadData();
    }
  }

  async function saveSize(event: FormEvent) {
    event.preventDefault();
    const supabase = createSupabaseClient();
    if (!supabase) return;
    const payload = {
      ...sizeForm,
      slug: sizeForm.slug || normalizePimSlug(sizeForm.name),
      size_group: sizeForm.size_group || "apparel",
      is_active: sizeForm.is_active !== false,
      sort_order: asNumber(sizeForm.sort_order)
    };
    const request = sizeForm.id
      ? supabase.from("product_size_master").update(payload).eq("id", sizeForm.id)
      : supabase.from("product_size_master").insert(payload);
    const { error } = await request;
    if (error) setStatus({ type: "error", text: `Ukuran gagal disimpan: ${error.message}` });
    else {
      setSizeForm({ ...emptySize });
      setStatus({ type: "success", text: "Master ukuran berhasil disimpan." });
      await loadData();
    }
  }

  async function saveVariant(event: FormEvent) {
    event.preventDefault();
    const supabase = createSupabaseClient();
    if (!supabase) return;
    const payload = {
      ...variantForm,
      product_id: variantForm.product_id || selectedProductId,
      variant_name: variantForm.variant_name || variantForm.color_name || "Varian",
      color_name: variantForm.color_name || "",
      color_hex: variantForm.color_hex || "#111111",
      sku: variantForm.sku || null,
      price_adjustment: asNumber(variantForm.price_adjustment),
      image_url: variantForm.image_url || null,
      images: variantForm.images || [],
      object_fit: variantForm.object_fit || "cover",
      object_position: variantForm.object_position || "center center",
      is_active: variantForm.is_active !== false,
      sort_order: asNumber(variantForm.sort_order)
    };
    if (!payload.product_id) {
      setStatus({ type: "error", text: "Pilih produk terlebih dahulu sebelum membuat varian." });
      return;
    }
    const request = variantForm.id
      ? supabase.from("product_variants").update(payload).eq("id", variantForm.id)
      : supabase.from("product_variants").insert(payload);
    const { error } = await request;
    if (error) setStatus({ type: "error", text: `Varian gagal disimpan: ${error.message}` });
    else {
      await supabase.from("products").update({ has_variants: true, pricing_mode: "variant_based", updated_at: new Date().toISOString() }).eq("id", payload.product_id);
      setVariantForm({ ...emptyVariant, product_id: selectedProductId });
      setStatus({ type: "success", text: "Varian produk berhasil disimpan." });
      await loadData();
    }
  }

  async function saveVariantSize(event: FormEvent) {
    event.preventDefault();
    const supabase = createSupabaseClient();
    if (!supabase) return;
    const payload = {
      ...variantSizeForm,
      stock: asNumber(variantSizeForm.stock),
      price_adjustment: asNumber(variantSizeForm.price_adjustment),
      sku: variantSizeForm.sku || null,
      is_active: variantSizeForm.is_active !== false,
      sort_order: asNumber(variantSizeForm.sort_order)
    };
    if (!payload.variant_id) {
      setStatus({ type: "error", text: "Pilih varian terlebih dahulu sebelum menambah ukuran." });
      return;
    }
    const request = variantSizeForm.id
      ? supabase.from("product_variant_sizes").update(payload).eq("id", variantSizeForm.id)
      : supabase.from("product_variant_sizes").insert(payload);
    const { error } = await request;
    if (error) setStatus({ type: "error", text: `Ukuran varian gagal disimpan: ${error.message}` });
    else {
      setVariantSizeForm({ ...emptyVariantSize, variant_id: payload.variant_id });
      setStatus({ type: "success", text: "Ukuran / stok varian berhasil disimpan." });
      await loadData();
    }
  }


  async function saveSizeGuide(event: FormEvent) {
    event.preventDefault();
    const supabase = createSupabaseClient();
    if (!supabase) return;
    const rows = parseJsonRows(rowsText);
    const payload = {
      ...sizeGuideForm,
      product_id: sizeGuideForm.product_id || null,
      product_category_id: sizeGuideForm.product_category_id || null,
      product_subcategory_id: sizeGuideForm.product_subcategory_id || null,
      rows,
      notes: textareaToList(notesText),
      description: sizeGuideForm.description || "",
      is_active: sizeGuideForm.is_active !== false,
      sort_order: asNumber(sizeGuideForm.sort_order)
    };
    const request = sizeGuideForm.id
      ? supabase.from("product_size_guides").update(payload).eq("id", sizeGuideForm.id)
      : supabase.from("product_size_guides").insert(payload);
    const { error, data } = await request.select("*").single();
    if (error) setStatus({ type: "error", text: `Panduan ukuran gagal disimpan: ${error.message}` });
    else {
      if (payload.product_id && data?.id) await supabase.from("products").update({ size_guide_id: data.id }).eq("id", payload.product_id);
      setSizeGuideForm({ ...emptySizeGuide });
      setRowsText(JSON.stringify(emptySizeGuide.rows, null, 2));
      setNotesText("");
      setStatus({ type: "success", text: "Panduan ukuran berhasil disimpan." });
      await loadData();
    }
  }

  async function saveJerseyPackage(event: FormEvent) {
    event.preventDefault();
    const supabase = createSupabaseClient();
    if (!supabase) return;
    const payload = {
      ...packageForm,
      slug: packageForm.slug || normalizePimSlug(packageForm.name),
      base_price: asNumber(packageForm.base_price),
      description: packageForm.description || "",
      is_active: packageForm.is_active !== false,
      sort_order: asNumber(packageForm.sort_order)
    };
    const request = packageForm.id ? supabase.from("jersey_packages").update(payload).eq("id", packageForm.id) : supabase.from("jersey_packages").insert(payload);
    const { error } = await request;
    if (error) setStatus({ type: "error", text: `Paket jersey gagal disimpan: ${error.message}` });
    else { setPackageForm({ ...emptyPackage }); setStatus({ type: "success", text: "Paket jersey berhasil disimpan." }); await loadData(); }
  }

  async function saveAdjustable(table: "jersey_materials" | "jersey_collars" | "jersey_addons", formValue: JerseyAdjustableRow, reset: () => void, label: string) {
    const supabase = createSupabaseClient();
    if (!supabase) return;
    const basePayload = {
      name: formValue.name,
      slug: formValue.slug || normalizePimSlug(formValue.name),
      price_adjustment: asNumber(formValue.price_adjustment),
      is_active: formValue.is_active !== false,
      sort_order: asNumber(formValue.sort_order)
    };

    if (table === "jersey_collars") {
      const payload = {
        ...basePayload,
        group_id: formValue.group_id ?? null,
        image_url: formValue.image_url ?? null,
        icon_url: formValue.icon_url ?? null
      };
      const request = formValue.id
        ? supabase.from("jersey_collars").update(payload).eq("id", formValue.id)
        : supabase.from("jersey_collars").insert(payload);
      const { error } = await request;
      if (error) setStatus({ type: "error", text: `${label} gagal disimpan: ${error.message}` });
      else { reset(); setStatus({ type: "success", text: `${label} berhasil disimpan.` }); await loadData(); }
      return;
    }

    const payload = {
      ...basePayload,
      description: formValue.description || ""
    };
    const request = table === "jersey_materials"
      ? formValue.id
        ? supabase.from("jersey_materials").update(payload).eq("id", formValue.id)
        : supabase.from("jersey_materials").insert(payload)
      : formValue.id
        ? supabase.from("jersey_addons").update(payload).eq("id", formValue.id)
        : supabase.from("jersey_addons").insert(payload);
    const { error } = await request;
    if (error) setStatus({ type: "error", text: `${label} gagal disimpan: ${error.message}` });
    else { reset(); setStatus({ type: "success", text: `${label} berhasil disimpan.` }); await loadData(); }
  }

  async function saveCollarGroup(event: FormEvent) {
    event.preventDefault();
    const supabase = createSupabaseClient();
    if (!supabase) return;
    const payload = {
      ...collarGroupForm,
      slug: collarGroupForm.slug || normalizePimSlug(collarGroupForm.name),
      is_active: collarGroupForm.is_active !== false,
      sort_order: asNumber(collarGroupForm.sort_order)
    };
    const request = collarGroupForm.id ? supabase.from("jersey_collar_groups").update(payload).eq("id", collarGroupForm.id) : supabase.from("jersey_collar_groups").insert(payload);
    const { error } = await request;
    if (error) setStatus({ type: "error", text: `Group kerah gagal disimpan: ${error.message}` });
    else { setCollarGroupForm({ ...emptyCollarGroup }); setStatus({ type: "success", text: "Group kerah berhasil disimpan." }); await loadData(); }
  }

  async function saveMinimumOrder(event: FormEvent) {
    event.preventDefault();
    const supabase = createSupabaseClient();
    if (!supabase) return;
    const payload = {
      setting_key: "minimum_order_qty",
      setting_value: { minimum_order_qty: Math.max(1, asNumber(minimumOrder, 6)) },
      description: "Minimum order default untuk Jersey Configurator"
    };
    const { error } = await supabase.from("jersey_settings").upsert(payload, { onConflict: "setting_key" });
    if (error) setStatus({ type: "error", text: `Minimum order gagal disimpan: ${error.message}` });
    else { setStatus({ type: "success", text: "Minimum order Jersey berhasil disimpan." }); await loadData(); }
  }

  const tabs: Array<{ key: TabKey; label: string; description: string }> = [
    { key: "variants", label: "Varian", description: "Kelola varian warna, ukuran, stok, SKU, dan gambar varian." },
    { key: "masters", label: "Master Data", description: "Kelola subkategori, warna, ukuran, dan layanan produksi." },
    { key: "jersey", label: "Jersey Master", description: "Kelola paket, bahan, kerah, addon, dan minimum order jersey." },
    { key: "guides", label: "Size Guide", description: "Kelola panduan ukuran per produk atau per kategori." }
  ];

  return (
    <div className="mt-6 grid gap-6">
      <StatusBox message={status} />

      <section className="bg-white p-5 sm:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <SmallLabel>PIM V2 ENTERPRISE</SmallLabel>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em]">Admin Master Data Produk</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-brand-charcoal/60">
              Dependency sementara untuk varian warna/ukuran, sellable SKU, stok, variant images, size guide, layanan produksi, dan master jersey. Product root serta lifecycle dikelola di Product Manager.
            </p>
          </div>
          <button type="button" onClick={loadData} className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand-charcoal px-5 text-sm font-semibold text-white">
            Refresh Data
          </button>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Produk", products.length],
            ["Subkategori", subcategories.length],
            ["Varian", variants.length],
            ["Warna", colors.length],
            ["Size Guide", sizeGuides.length]
          ].map(([label, value]) => <div key={String(label)} className="rounded-2xl bg-brand-offWhite p-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-charcoal/45">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>)}
        </div>
      </section>

      <nav className="flex gap-2 overflow-x-auto rounded-full bg-white p-2">
        {tabs.map((tab) => (
          <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${activeTab === tab.key ? "bg-brand-green text-white" : "text-brand-charcoal/65 hover:bg-brand-offWhite"}`}>{tab.label}</button>
        ))}
      </nav>

      {loading ? <div className="grid gap-3">{[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-white" />)}</div> : null}

      {!loading && activeTab === "products" ? (
        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <form onSubmit={saveProductPatch} className="bg-white p-5 sm:p-7">
            <SmallLabel>Produk V2</SmallLabel>
            <h3 className="mt-2 text-xl font-semibold">Atur produk ke arsitektur baru</h3>
            <p className="mt-2 text-sm leading-6 text-brand-charcoal/60">Pilih produk lama, lalu tentukan apakah produk standar, produk varian, atau configurator.</p>
            <div className="mt-5 grid gap-4">
              <Field label="Pilih produk"><select value={productPatch.id || ""} onChange={(event) => { const product = products.find((item) => item.id === event.target.value); if (product) applyProduct(product); }}><option value="">Pilih produk</option>{products.map((product) => <option key={product.id} value={product.id}>{product.nama}</option>)}</select></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Kategori utama"><select value={productPatch.product_category_id || ""} onChange={(event) => setProductPatch((current) => ({ ...current, product_category_id: event.target.value || null, product_subcategory_id: null }))}><option value="">Pilih kategori</option>{activeCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field>
                <Field label="Subkategori"><select value={productPatch.product_subcategory_id || ""} onChange={(event) => setProductPatch((current) => ({ ...current, product_subcategory_id: event.target.value || null }))}><option value="">Pilih subkategori</option>{productSubcategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
                <Field label="Product type"><select value={productPatch.product_type || "standard_product"} onChange={(event) => setProductPatch((current) => ({ ...current, product_type: event.target.value as ProductType }))}>{pimV2ProductTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
                <Field label="Pricing mode"><select value={productPatch.pricing_mode || "fixed_price"} onChange={(event) => setProductPatch((current) => ({ ...current, pricing_mode: event.target.value as PricingMode }))}>{pimV2PricingModes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
                <Field label="SKU utama"><input value={productPatch.sku || ""} onChange={(event) => setProductPatch((current) => ({ ...current, sku: event.target.value }))} placeholder="DBR-KAOS-001" /></Field>
                <Field label="Minimum order"><input type="number" min={1} value={productPatch.minimum_order_qty || 1} onChange={(event) => setProductPatch((current) => ({ ...current, minimum_order_qty: asNumber(event.target.value, 1) }))} /></Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Toggle label="Pakai varian warna/ukuran" checked={Boolean(productPatch.has_variants)} onChange={(value) => setProductPatch((current) => ({ ...current, has_variants: value, pricing_mode: value ? "variant_based" : current.pricing_mode }))} />
                <Toggle label="Pakai configurator" checked={Boolean(productPatch.uses_configurator)} onChange={(value) => setProductPatch((current) => ({ ...current, uses_configurator: value, product_type: value ? "configurable_product" : current.product_type, pricing_mode: value ? "configurator_based" : current.pricing_mode }))} />
              </div>
              <button disabled={!productPatch.id} className="min-h-12 rounded-full bg-brand-green px-6 text-sm font-semibold text-white disabled:opacity-50">Simpan pengaturan produk</button>
            </div>
          </form>

          <div className="bg-white p-5 sm:p-7">
            <SmallLabel>Daftar Produk</SmallLabel>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead><tr className="border-b border-brand-softGray text-xs uppercase tracking-[0.16em] text-brand-charcoal/45"><th className="p-3">Produk</th><th className="p-3">Kategori</th><th className="p-3">Type</th><th className="p-3">Mode Harga</th><th className="p-3">Aksi</th></tr></thead>
                <tbody>{products.map((product) => <tr key={product.id} className="border-b border-brand-softGray/70"><td className="p-3 font-semibold">{product.nama}<span className="block text-xs font-normal text-brand-charcoal/45">{product.sku || product.slug}</span></td><td className="p-3 text-brand-charcoal/65">{categoryName(product.product_category_id)}<span className="block text-xs text-brand-charcoal/45">{subcategoryName(product.product_subcategory_id) || product.subcategory}</span></td><td className="p-3">{product.product_type || "standard_product"}</td><td className="p-3">{product.pricing_mode || "fixed_price"}</td><td className="p-3"><button type="button" onClick={() => applyProduct(product)} className="rounded-full bg-brand-charcoal px-3 py-2 text-xs font-semibold text-white">Edit</button></td></tr>)}</tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      {!loading && activeTab === "variants" ? (
        <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="grid gap-6">
            <div className="bg-white p-5 sm:p-7">
              <SmallLabel>Varian Produk</SmallLabel>
              <h3 className="mt-2 text-xl font-semibold">Pilih produk</h3>
              <Field label="Produk"><select value={selectedProductId} onChange={(event) => { setSelectedProductId(event.target.value); setVariantForm((current) => ({ ...current, product_id: event.target.value })); }}><option value="">Pilih produk</option>{products.map((product) => <option key={product.id} value={product.id}>{product.nama}</option>)}</select></Field>
              {selectedProduct ? <p className="mt-3 rounded-2xl bg-brand-offWhite p-4 text-sm font-medium text-brand-charcoal/70">Produk aktif: <span className="font-semibold text-brand-charcoal">{selectedProduct.nama}</span></p> : null}
            </div>

            <form onSubmit={saveVariant} className="bg-white p-5 sm:p-7">
              <SmallLabel>Tambah / Edit Varian Warna</SmallLabel>
              <div className="mt-5 grid gap-4">
                <Field label="Warna dari master"><select value={variantForm.color_name || ""} onChange={(event) => { const color = colors.find((item) => item.name === event.target.value); setVariantForm((current) => ({ ...current, color_name: color?.name || event.target.value, color_hex: color?.color_hex || current.color_hex, variant_name: color?.name || event.target.value })); }}><option value="">Pilih warna</option>{colors.map((color) => <option key={color.id} value={color.name}>{color.name}</option>)}</select></Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Nama varian"><input value={variantForm.variant_name || ""} onChange={(event) => setVariantForm((current) => ({ ...current, variant_name: event.target.value }))} placeholder="Black" /></Field>
                  <Field label="HEX"><input value={variantForm.color_hex || "#111111"} onChange={(event) => setVariantForm((current) => ({ ...current, color_hex: event.target.value }))} /></Field>
                  <Field label="SKU varian"><input value={variantForm.sku || ""} onChange={(event) => setVariantForm((current) => ({ ...current, sku: event.target.value }))} /></Field>
                  <Field label="Penyesuaian harga"><input type="number" value={variantForm.price_adjustment || 0} onChange={(event) => setVariantForm((current) => ({ ...current, price_adjustment: asNumber(event.target.value) }))} /></Field>
                </div>
                <Field label="Gambar utama varian"><input value={variantForm.image_url || ""} onChange={(event) => setVariantForm((current) => ({ ...current, image_url: event.target.value }))} placeholder="https://..." /></Field>
                <Toggle label="Varian aktif" checked={variantForm.is_active !== false} onChange={(value) => setVariantForm((current) => ({ ...current, is_active: value }))} />
                <button disabled={!selectedProductId && !variantForm.product_id} className="min-h-12 rounded-full bg-brand-green px-6 text-sm font-semibold text-white disabled:opacity-50">Simpan varian</button>
              </div>
            </form>
          </div>

          <div className="grid gap-6">
            <form onSubmit={saveVariantSize} className="bg-white p-5 sm:p-7">
              <SmallLabel>Ukuran, Stok, SKU</SmallLabel>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="Varian"><select value={variantSizeForm.variant_id} onChange={(event) => setVariantSizeForm((current) => ({ ...current, variant_id: event.target.value }))}><option value="">Pilih varian</option>{selectedProductVariants.map((variant) => <option key={variant.id} value={variant.id}>{variant.variant_name || variant.color_name}</option>)}</select></Field>
                <Field label="Ukuran"><select value={variantSizeForm.size_name} onChange={(event) => setVariantSizeForm((current) => ({ ...current, size_name: event.target.value }))}>{sizes.map((size) => <option key={size.id} value={size.name}>{size.name}</option>)}</select></Field>
                <Field label="Stok"><input type="number" min={0} value={variantSizeForm.stock || 0} onChange={(event) => setVariantSizeForm((current) => ({ ...current, stock: asNumber(event.target.value) }))} /></Field>
                <Field label="SKU ukuran"><input value={variantSizeForm.sku || ""} onChange={(event) => setVariantSizeForm((current) => ({ ...current, sku: event.target.value }))} /></Field>
                <Field label="Penyesuaian harga size"><input type="number" value={variantSizeForm.price_adjustment || 0} onChange={(event) => setVariantSizeForm((current) => ({ ...current, price_adjustment: asNumber(event.target.value) }))} /></Field>
                <Field label="Urutan"><input type="number" value={variantSizeForm.sort_order || 0} onChange={(event) => setVariantSizeForm((current) => ({ ...current, sort_order: asNumber(event.target.value) }))} /></Field>
              </div>
              <button className="mt-5 min-h-11 rounded-full bg-brand-charcoal px-5 text-sm font-semibold text-white">Simpan ukuran / stok</button>
            </form>

            <VariantGalleryManager
              variants={selectedProductVariants}
              images={variantImages}
              onChanged={loadData}
              onStatus={setStatus}
            />

            <div className="bg-white p-5 sm:p-7">
              <SmallLabel>Daftar Varian</SmallLabel>
              <div className="mt-4 grid gap-3">
                {selectedProductVariants.length ? selectedProductVariants.map((variant) => {
                  const sizesForVariant = variantSizes.filter((item) => item.variant_id === variant.id);
                  const imagesForVariant = variantImages.filter((item) => item.variant_id === variant.id);
                  return <article key={variant.id} className="rounded-2xl bg-brand-offWhite p-4"><div className="flex items-start gap-3"><span className="mt-1 h-6 w-6 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: variant.color_hex || "#111111" }} /><div><p className="font-semibold">{variant.variant_name || variant.color_name}</p><p className="text-xs text-brand-charcoal/50">SKU {variant.sku || "—"} · {formatMoney(variant.price_adjustment)} adj.</p><p className="mt-2 text-xs text-brand-charcoal/60">{sizesForVariant.length} ukuran · {imagesForVariant.length} gambar</p></div><button type="button" onClick={() => setVariantForm({ ...emptyVariant, ...variant })} className="ml-auto rounded-full bg-white px-3 py-1 text-xs font-semibold">Edit</button></div></article>;
                }) : <p className="rounded-2xl bg-brand-offWhite p-5 text-sm font-medium text-brand-charcoal/55">Belum ada varian untuk produk ini.</p>}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {!loading && activeTab === "masters" ? (
        <section className="grid gap-6 xl:grid-cols-2">
          <form onSubmit={saveSubcategory} className="bg-white p-5 sm:p-7">
            <SmallLabel>Subkategori Produk</SmallLabel>
            <h3 className="mt-2 text-xl font-semibold">Main Category → Subcategory</h3>
            <div className="mt-5 grid gap-4">
              <Field label="Kategori utama"><select value={subcategoryForm.category_id} onChange={(event) => setSubcategoryForm((current) => ({ ...current, category_id: event.target.value }))}><option value="">Pilih kategori</option>{activeCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field>
              <div className="grid gap-4 sm:grid-cols-2"><Field label="Nama subkategori"><input value={subcategoryForm.name} onChange={(event) => setSubcategoryForm((current) => ({ ...current, name: event.target.value, slug: current.slug || normalizePimSlug(event.target.value) }))} /></Field><Field label="Slug"><input value={subcategoryForm.slug} onChange={(event) => setSubcategoryForm((current) => ({ ...current, slug: event.target.value }))} /></Field></div>
              <Field label="Deskripsi"><textarea rows={3} value={subcategoryForm.description || ""} onChange={(event) => setSubcategoryForm((current) => ({ ...current, description: event.target.value }))} /></Field>
              <button className="min-h-11 rounded-full bg-brand-green px-5 text-sm font-semibold text-white">Simpan subkategori</button>
            </div>
            <div className="mt-5 grid gap-2">{subcategories.map((item) => <button key={item.id} type="button" onClick={() => setSubcategoryForm(item)} className="rounded-xl bg-brand-offWhite p-3 text-left text-sm"><span className="font-semibold">{item.name}</span><span className="block text-xs text-brand-charcoal/50">{categoryName(item.category_id)} / {item.slug}</span></button>)}</div>
          </form>

          <form onSubmit={saveService} className="bg-white p-5 sm:p-7">
            <SmallLabel>Layanan Produksi</SmallLabel>
            <h3 className="mt-2 text-xl font-semibold">Pisahkan layanan dari kategori produk</h3>
            <div className="mt-5 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2"><Field label="Nama layanan"><input value={serviceForm.name} onChange={(event) => setServiceForm((current) => ({ ...current, name: event.target.value, slug: current.slug || normalizePimSlug(event.target.value) }))} /></Field><Field label="Slug"><input value={serviceForm.slug} onChange={(event) => setServiceForm((current) => ({ ...current, slug: event.target.value }))} /></Field></div>
              <Field label="Deskripsi"><textarea rows={3} value={serviceForm.description || ""} onChange={(event) => setServiceForm((current) => ({ ...current, description: event.target.value }))} /></Field>
              <div className="grid gap-4 sm:grid-cols-3"><Field label="Harga dasar"><input type="number" value={serviceForm.base_price || 0} onChange={(event) => setServiceForm((current) => ({ ...current, base_price: asNumber(event.target.value) }))} /></Field><Field label="Unit"><input value={serviceForm.unit_label || ""} onChange={(event) => setServiceForm((current) => ({ ...current, unit_label: event.target.value }))} placeholder="pcs / meter" /></Field><Field label="Urutan"><input type="number" value={serviceForm.sort_order || 0} onChange={(event) => setServiceForm((current) => ({ ...current, sort_order: asNumber(event.target.value) }))} /></Field></div>
              <Toggle label="Required default" checked={Boolean(serviceForm.is_required_default)} onChange={(value) => setServiceForm((current) => ({ ...current, is_required_default: value }))} />
              <button className="min-h-11 rounded-full bg-brand-green px-5 text-sm font-semibold text-white">Simpan layanan produksi</button>
            </div>
            <div className="mt-5 grid gap-2">{services.map((item) => <button key={item.id} type="button" onClick={() => setServiceForm(item)} className="rounded-xl bg-brand-offWhite p-3 text-left text-sm"><span className="font-semibold">{item.name}</span><span className="block text-xs text-brand-charcoal/50">{item.slug} · {formatMoney(item.base_price)}</span></button>)}</div>
          </form>

          <form onSubmit={saveColor} className="bg-white p-5 sm:p-7">
            <SmallLabel>Master Warna</SmallLabel>
            <div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Nama warna"><input value={colorForm.name} onChange={(event) => setColorForm((current) => ({ ...current, name: event.target.value, slug: current.slug || normalizePimSlug(event.target.value) }))} /></Field><Field label="HEX"><input value={colorForm.color_hex} onChange={(event) => setColorForm((current) => ({ ...current, color_hex: event.target.value }))} /></Field><Field label="Slug"><input value={colorForm.slug} onChange={(event) => setColorForm((current) => ({ ...current, slug: event.target.value }))} /></Field><Field label="Urutan"><input type="number" value={colorForm.sort_order || 0} onChange={(event) => setColorForm((current) => ({ ...current, sort_order: asNumber(event.target.value) }))} /></Field></div>
            <button className="mt-5 min-h-11 rounded-full bg-brand-charcoal px-5 text-sm font-semibold text-white">Simpan warna</button>
            <div className="mt-5 flex flex-wrap gap-2">{colors.map((color) => <button key={color.id} type="button" onClick={() => setColorForm(color)} className="rounded-full border border-brand-softGray bg-white px-3 py-2 text-xs font-semibold"><span className="mr-2 inline-block h-3 w-3 rounded-full align-middle" style={{ backgroundColor: color.color_hex }} />{color.name}</button>)}</div>
          </form>

          <form onSubmit={saveSize} className="bg-white p-5 sm:p-7">
            <SmallLabel>Master Ukuran</SmallLabel>
            <div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Nama ukuran"><input value={sizeForm.name} onChange={(event) => setSizeForm((current) => ({ ...current, name: event.target.value, slug: current.slug || normalizePimSlug(event.target.value) }))} /></Field><Field label="Group"><input value={sizeForm.size_group || "apparel"} onChange={(event) => setSizeForm((current) => ({ ...current, size_group: event.target.value }))} /></Field><Field label="Slug"><input value={sizeForm.slug} onChange={(event) => setSizeForm((current) => ({ ...current, slug: event.target.value }))} /></Field><Field label="Urutan"><input type="number" value={sizeForm.sort_order || 0} onChange={(event) => setSizeForm((current) => ({ ...current, sort_order: asNumber(event.target.value) }))} /></Field></div>
            <button className="mt-5 min-h-11 rounded-full bg-brand-charcoal px-5 text-sm font-semibold text-white">Simpan ukuran</button>
            <div className="mt-5 flex flex-wrap gap-2">{sizes.map((size) => <button key={size.id} type="button" onClick={() => setSizeForm(size)} className="rounded-full border border-brand-softGray bg-white px-3 py-2 text-xs font-semibold">{size.name}</button>)}</div>
          </form>
        </section>
      ) : null}

      {!loading && activeTab === "jersey" ? (
        <section className="grid gap-6 xl:grid-cols-2">
          <form onSubmit={saveMinimumOrder} className="bg-white p-5 sm:p-7 xl:col-span-2">
            <SmallLabel>Jersey Configurator</SmallLabel>
            <h3 className="mt-2 text-xl font-semibold">Minimum order jersey</h3>
            <div className="mt-5 max-w-md"><Field label="Minimum order default"><input type="number" min={1} value={minimumOrder} onChange={(event) => setMinimumOrder(event.target.value)} /></Field></div>
            <button className="mt-5 min-h-11 rounded-full bg-brand-green px-5 text-sm font-semibold text-white">Simpan minimum order</button>
          </form>

          <form onSubmit={saveJerseyPackage} className="bg-white p-5 sm:p-7"><SmallLabel>Paket Jersey</SmallLabel><div className="mt-5 grid gap-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Nama paket"><input value={packageForm.name} onChange={(event) => setPackageForm((current) => ({ ...current, name: event.target.value, slug: current.slug || normalizePimSlug(event.target.value) }))} /></Field><Field label="Harga dasar"><input type="number" value={packageForm.base_price || 0} onChange={(event) => setPackageForm((current) => ({ ...current, base_price: asNumber(event.target.value) }))} /></Field></div><Field label="Deskripsi"><textarea rows={2} value={packageForm.description || ""} onChange={(event) => setPackageForm((current) => ({ ...current, description: event.target.value }))} /></Field><button className="min-h-11 rounded-full bg-brand-charcoal px-5 text-sm font-semibold text-white">Simpan paket</button></div><MasterList items={packages} onEdit={setPackageForm} priceKey="base_price" /></form>

          <form onSubmit={(event) => { event.preventDefault(); saveAdjustable("jersey_materials", materialForm, () => setMaterialForm({ ...emptyAdjustable }), "Bahan jersey"); }} className="bg-white p-5 sm:p-7"><SmallLabel>Bahan Jersey</SmallLabel><AdjustableFields value={materialForm} onChange={setMaterialForm} /><MasterList items={materials} onEdit={setMaterialForm} priceKey="price_adjustment" /></form>

          <form onSubmit={saveCollarGroup} className="bg-white p-5 sm:p-7"><SmallLabel>Group Kerah</SmallLabel><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Nama group"><input value={collarGroupForm.name} onChange={(event) => setCollarGroupForm((current) => ({ ...current, name: event.target.value, slug: current.slug || normalizePimSlug(event.target.value) }))} /></Field><Field label="Slug"><input value={collarGroupForm.slug} onChange={(event) => setCollarGroupForm((current) => ({ ...current, slug: event.target.value }))} /></Field></div><button className="mt-5 min-h-11 rounded-full bg-brand-charcoal px-5 text-sm font-semibold text-white">Simpan group</button><div className="mt-5 grid gap-2">{collarGroups.map((group) => <button key={group.id} type="button" onClick={() => setCollarGroupForm(group)} className="rounded-xl bg-brand-offWhite p-3 text-left text-sm font-semibold">{group.name}</button>)}</div></form>

          <form onSubmit={(event) => { event.preventDefault(); saveAdjustable("jersey_collars", collarForm, () => setCollarForm({ ...emptyAdjustable }), "Kerah jersey"); }} className="bg-white p-5 sm:p-7"><SmallLabel>Kerah Jersey</SmallLabel><Field label="Group kerah"><select value={collarForm.group_id || ""} onChange={(event) => setCollarForm((current) => ({ ...current, group_id: event.target.value || null }))}><option value="">Tanpa group</option>{collarGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></Field><AdjustableFields value={collarForm} onChange={setCollarForm} /><MasterList items={collars} onEdit={setCollarForm} priceKey="price_adjustment" /></form>

          <form onSubmit={(event) => { event.preventDefault(); saveAdjustable("jersey_addons", addonForm, () => setAddonForm({ ...emptyAdjustable }), "Addon jersey"); }} className="bg-white p-5 sm:p-7"><SmallLabel>Addon Jersey</SmallLabel><AdjustableFields value={addonForm} onChange={setAddonForm} /><MasterList items={addons} onEdit={setAddonForm} priceKey="price_adjustment" /></form>
        </section>
      ) : null}

      {!loading && activeTab === "guides" ? (
        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <form onSubmit={saveSizeGuide} className="bg-white p-5 sm:p-7">
            <SmallLabel>Size Guide</SmallLabel>
            <h3 className="mt-2 text-xl font-semibold">Panduan ukuran per produk</h3>
            <div className="mt-5 grid gap-4">
              <Field label="Produk"><select value={sizeGuideForm.product_id || ""} onChange={(event) => setSizeGuideForm((current) => ({ ...current, product_id: event.target.value || null }))}><option value="">Opsional / pilih produk</option>{products.map((product) => <option key={product.id} value={product.id}>{product.nama}</option>)}</select></Field>
              <div className="grid gap-4 sm:grid-cols-2"><Field label="Judul"><input value={sizeGuideForm.title} onChange={(event) => setSizeGuideForm((current) => ({ ...current, title: event.target.value }))} /></Field><Field label="Urutan"><input type="number" value={sizeGuideForm.sort_order || 0} onChange={(event) => setSizeGuideForm((current) => ({ ...current, sort_order: asNumber(event.target.value) }))} /></Field></div>
              <Field label="Deskripsi"><textarea rows={3} value={sizeGuideForm.description || ""} onChange={(event) => setSizeGuideForm((current) => ({ ...current, description: event.target.value }))} /></Field>
              <Field label="Rows JSON" helper={`Gunakan format JSON array. Contoh: [{"size":"S","lebar":"48 cm","panjang":"68 cm"}]`}><textarea rows={8} value={rowsText} onChange={(event) => setRowsText(event.target.value)} /></Field>
              <Field label="Catatan"><textarea rows={4} value={notesText} onChange={(event) => setNotesText(event.target.value)} placeholder="Satu catatan per baris" /></Field>
              <button className="min-h-12 rounded-full bg-brand-green px-6 text-sm font-semibold text-white">Simpan panduan ukuran</button>
            </div>
          </form>
          <div className="bg-white p-5 sm:p-7">
            <SmallLabel>Daftar Size Guide</SmallLabel>
            <div className="mt-5 grid gap-3">{sizeGuides.length ? sizeGuides.map((guide) => <article key={guide.id} className="rounded-2xl bg-brand-offWhite p-4"><p className="font-semibold">{guide.title}</p><p className="text-xs text-brand-charcoal/50">Produk: {productName(guide.product_id)} · {guide.rows?.length || 0} baris</p><button type="button" onClick={() => { setSizeGuideForm(guide); setRowsText(JSON.stringify(guide.rows || [], null, 2)); setNotesText(listToTextarea(guide.notes)); }} className="mt-3 rounded-full bg-white px-3 py-2 text-xs font-semibold">Edit</button></article>) : <p className="rounded-2xl bg-brand-offWhite p-5 text-sm font-medium text-brand-charcoal/55">Belum ada panduan ukuran.</p>}</div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function AdjustableFields({ value, onChange }: { value: JerseyAdjustableRow; onChange: (value: JerseyAdjustableRow) => void }) {
  return (
    <div className="mt-5 grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama"><input value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value, slug: value.slug || normalizePimSlug(event.target.value) })} /></Field>
        <Field label="Penyesuaian harga"><input type="number" value={value.price_adjustment || 0} onChange={(event) => onChange({ ...value, price_adjustment: asNumber(event.target.value) })} /></Field>
        <Field label="Slug"><input value={value.slug} onChange={(event) => onChange({ ...value, slug: event.target.value })} /></Field>
        <Field label="Urutan"><input type="number" value={value.sort_order || 0} onChange={(event) => onChange({ ...value, sort_order: asNumber(event.target.value) })} /></Field>
      </div>
      <Field label="Deskripsi"><textarea rows={2} value={value.description || ""} onChange={(event) => onChange({ ...value, description: event.target.value })} /></Field>
      <button className="min-h-11 rounded-full bg-brand-charcoal px-5 text-sm font-semibold text-white">Simpan</button>
    </div>
  );
}

function MasterList<T extends { id?: string; name: string; slug: string; [key: string]: unknown }>({ items, onEdit, priceKey }: { items: T[]; onEdit: (value: T) => void; priceKey: string }) {
  return (
    <div className="mt-5 grid gap-2">
      {items.map((item) => (
        <button key={item.id || item.slug} type="button" onClick={() => onEdit(item)} className="rounded-xl bg-brand-offWhite p-3 text-left text-sm">
          <span className="font-semibold">{item.name}</span>
          <span className="block text-xs text-brand-charcoal/50">{item.slug} · {formatMoney(item[priceKey] as string | number | null)}</span>
        </button>
      ))}
    </div>
  );
}
