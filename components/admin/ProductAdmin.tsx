/* eslint-disable @next/next/no-img-element */
"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FocalPointEditor } from "@/components/admin/FocalPointEditor";
import { ProductImageSwap } from "@/components/ProductImageSwap";
import {
  categoryPath,
  categoryPreset,
  isMainProductCategory,
  productCategoryPresets,
  subcategoryMatch
} from "@/lib/product-category-config";
import { createSupabaseClient, WEBSITE_IMAGES_BUCKET } from "@/lib/supabase";
import { pimServiceMethods } from "@/lib/pim-blueprint";
import {
  applyProductGalleryToProduct,
  isFourFiveRatio,
  mediaDimensionLabel,
  PRODUCT_GALLERY_LIMIT,
  PRODUCT_IMAGE_SLOTS,
  productGalleryFromForm
} from "@/lib/product-gallery";
import type { FocalPoint, Product, ProductCategory } from "@/lib/types";
import { formatRupiah } from "@/lib/url";

type MediaChoice = { id: string; name: string; public_url: string; alt_text?: string; folder?: string; width?: number | null; height?: number | null };
type SortKey = "urutan" | "nama" | "price" | "newest";

const emptyProduct: Product = {
  nama: "",
  kategori: "",
  subcategory: "",
  deskripsi: "",
  short_detail: "",
  description: "",
  badge: "",
  gambar_url: "",
  image_url: "",
  image_alt: "",
  gallery_urls: [],
  specifications: [],
  collection_tags: [],
  intent_tags: [],
  color_tags: [],
  size_tags: [],
  material_tags: [],
  brand: "",
  object_fit: "cover",
  object_position: "center center",
  whatsapp_link: "https://wa.me/6285355333364",
  price: null,
  compare_price: null,
  slug: "",
  label_new: false,
  label_promo: false,
  label_best_seller: false,
  featured: false,
  trending: false,
  fresh_drop: false,
  stock: 0,
  product_category_id: null,
  seo_title: "",
  seo_description: "",
  og_image_url: "",
  canonical_url: "",
  focal_x: 50,
  focal_y: 50,
  focal_zoom: 1,
  target_ratio: "4:5",
  focal_points: {},
  sales_count: 0,
  urutan: 0,
  status_aktif: true
};

const focalContexts = [
  { key: "catalog", label: "Catalog 4:5", ratio: "4:5" },
  { key: "thumbnail", label: "Thumbnail", ratio: "1:1" },
  { key: "detail", label: "Product detail", ratio: "4:5" }
];

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function listValue(value?: string[]) {
  return (value || []).join("\n");
}

function parseList(value: string) {
  return value.split("\n").map((item) => item.trim()).filter(Boolean);
}

function numberOrNull(value: string | number | null | undefined) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const placeholderProductImage = "/brand/debroder/logo-primary-black.png";
const coreCategorySlugs = new Set(productCategoryPresets.map((preset) => preset.slug));

function isCoreCategory(category: ProductCategory) {
  return coreCategorySlugs.has(category.slug);
}

function categoryChoices(categories: ProductCategory[]): ProductCategory[] {
  const bySlug = new Map(categories.map((category) => [category.slug, category]));
  return productCategoryPresets.map((preset, index) => bySlug.get(preset.slug) || ({
    id: undefined,
    name: preset.name,
    slug: preset.slug,
    description: "",
    is_active: true,
    sort_order: (index + 1) * 10,
    show_in_collection: true,
    collection_limit: 8,
    collection_sort: "sort_order" as const,
    collection_section_order: (index + 1) * 10
  }));
}

function focalFor(product: Product, context: string): FocalPoint {
  return product.focal_points?.[context] || {
    focal_x: Number(product.focal_x ?? 50),
    focal_y: Number(product.focal_y ?? 50),
    zoom: Number(product.focal_zoom ?? 1),
    target_ratio: focalContexts.find((item) => item.key === context)?.ratio || "4:5"
  };
}

async function imageDimensions(file: File) {
  try {
    const bitmap = await createImageBitmap(file);
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dimensions;
  } catch {
    return { width: null, height: null };
  }
}

async function contentHash(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function ProductAdminPanel() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [media, setMedia] = useState<MediaChoice[]>([]);
  const [mediaPickerSlot, setMediaPickerSlot] = useState<number | null>(null);
  const [mediaSearch, setMediaSearch] = useState("");
  const [onlyFourFiveMedia, setOnlyFourFiveMedia] = useState(true);
  const [form, setForm] = useState<Product>({ ...emptyProduct });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [galleryFilter, setGalleryFilter] = useState<"all" | "complete" | "incomplete">("all");
  const [sort, setSort] = useState<SortKey>("urutan");
  const [focalContext, setFocalContext] = useState("catalog");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);

  async function loadData() {
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setLoading(true);
    const slowTimer = window.setTimeout(() => setStatus("Supabase sedang merespons. Data tetap dimuat..."), 900);
    const [productResult, categoryResult, mediaResult] = await Promise.all([
      supabase.from("products").select("*").order("urutan", { ascending: true }),
      supabase.from("product_categories").select("*").order("sort_order", { ascending: true }),
      supabase.from("media_assets").select("id,name,public_url,alt_text,folder,width,height").eq("status_aktif", true).eq("media_type", "image").order("created_at", { ascending: false })
    ]);
    window.clearTimeout(slowTimer);
    setLoading(false);
    if (productResult.error) {
      setStatus(`Produk belum dapat dimuat: ${productResult.error.message}`);
      return;
    }
    setProducts((productResult.data || []) as Product[]);
    setCategories((categoryResult.data || []) as ProductCategory[]);
    setMedia((mediaResult.data || []) as MediaChoice[]);
    setStatus("");
  }

  useEffect(() => { loadData(); }, []);

  const availableCategories = useMemo(() => categoryChoices(categories).filter((category) => category.is_active !== false), [categories]);
  const categoryNames = useMemo(() => availableCategories.map((category) => category.name).sort(), [availableCategories]);
  const filteredMedia = useMemo(() => {
    const needle = mediaSearch.trim().toLowerCase();
    return media.filter((item) => {
      const matchesSearch = !needle || `${item.name} ${item.folder || ""} ${item.alt_text || ""}`.toLowerCase().includes(needle);
      const ratio = isFourFiveRatio(item.width, item.height);
      const matchesRatio = !onlyFourFiveMedia || ratio === true;
      return matchesSearch && matchesRatio;
    });
  }, [media, mediaSearch, onlyFourFiveMedia]);
  const activePreset = categoryPreset(availableCategories.find((category) => category.id === form.product_category_id)?.slug || form.kategori || "");

  const visibleProducts = useMemo(() => {
    const search = query.trim().toLowerCase();
    return products
      .filter((product) => !search || `${product.nama} ${product.kategori} ${product.subcategory || ""} ${(product.intent_tags || []).join(" ")}`.toLowerCase().includes(search))
      .filter((product) => {
        if (categoryFilter === "all") return true;
        const category = availableCategories.find((item) => item.name === categoryFilter);
        return Boolean(
          (category?.id && product.product_category_id === category.id) ||
          product.kategori === categoryFilter
        );
      })
      .filter((product) => statusFilter === "all" || String(product.status_aktif) === statusFilter)
      .filter((product) => {
        if (galleryFilter === "all") return true;
        const complete = productGalleryFromForm(product).filter((url) => url !== placeholderProductImage).length === PRODUCT_GALLERY_LIMIT;
        return galleryFilter === "complete" ? complete : !complete;
      })
      .sort((a, b) => {
        if (sort === "nama") return a.nama.localeCompare(b.nama, "id");
        if (sort === "price") return Number(a.price || 0) - Number(b.price || 0);
        if (sort === "newest") return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        return a.urutan - b.urutan;
      });
  }, [availableCategories, categoryFilter, galleryFilter, products, query, sort, statusFilter]);

  function update<K extends keyof Product>(key: K, value: Product[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function startNewProduct(category: ProductCategory) {
    const preset = categoryPreset(category.slug || category.name);
    setEditingId(null);
    setForm({
      ...emptyProduct,
      product_category_id: category.id || null,
      kategori: category.name,
      subcategory: preset?.subcategories[0] || "",
      collection_tags: preset?.collectionTags || [],
      intent_tags: preset?.intentTags || [],
      color_tags: preset?.colorTags || [],
      size_tags: preset?.sizeTags || [],
      material_tags: preset?.materialTags || [],
      link_url: categoryPath(category.slug),
      image_url: "",
      gambar_url: "",
      object_fit: "cover",
      image_alt: category.name,
      focal_points: {}
    });
    setFocalContext("catalog");
  }

  function applyCategoryToForm(category: ProductCategory) {
    const preset = categoryPreset(category.slug || category.name);
    setForm((current) => {
      const hasCustomImage = Boolean(current.image_url && current.image_url !== placeholderProductImage);
      return {
        ...current,
        product_category_id: category.id || null,
        kategori: category.name,
        subcategory: preset?.subcategories[0] || current.subcategory || "",
        collection_tags: preset?.collectionTags || [],
        intent_tags: preset?.intentTags || [],
        color_tags: preset?.colorTags || [],
        size_tags: preset?.sizeTags || [],
        material_tags: preset?.materialTags || [],
        link_url: categoryPath(category.slug),
        image_url: current.image_url || "",
        gambar_url: current.gambar_url || current.image_url || "",
        object_fit: hasCustomImage ? current.object_fit : "cover",
        image_alt: current.image_alt || category.name
      };
    });
  }

  function startEdit(product: Product) {
    setEditingId(product.id || null);
    setForm({ ...emptyProduct, ...product, focal_points: product.focal_points || {} });
    setFocalContext("catalog");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() {
    setEditingId(null);
    setForm({ ...emptyProduct, focal_points: {} });
    setFocalContext("catalog");
  }

  function currentGalleryImages(product = form) {
    return productGalleryFromForm(product).filter((url) => url !== placeholderProductImage);
  }

  function setGallerySlot(index: number, url: string) {
    const currentImages = currentGalleryImages();
    const currentAtSlot = currentImages[index] || "";
    const cleanUrl = url.trim();

    if (cleanUrl && currentImages.some((item, itemIndex) => item === cleanUrl && itemIndex !== index)) {
      setStatus("Foto tersebut sudah digunakan pada slot lain. Pilih foto yang berbeda.");
      return;
    }

    const nextImages = [...currentImages];
    if (!cleanUrl) {
      if (index < nextImages.length) nextImages.splice(index, 1);
    } else if (index <= nextImages.length) {
      nextImages[index] = cleanUrl;
    } else {
      setStatus("Isi slot foto secara berurutan mulai dari Foto 1.");
      return;
    }

    setForm((current) => applyProductGalleryToProduct(current, nextImages));
    if (index === 0 && cleanUrl && currentAtSlot !== cleanUrl && !form.image_alt) {
      const selected = media.find((item) => item.public_url === cleanUrl);
      if (selected?.alt_text) update("image_alt", selected.alt_text);
    }
  }

  function moveGallerySlot(index: number, direction: -1 | 1) {
    const images = currentGalleryImages();
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= images.length) return;
    [images[index], images[nextIndex]] = [images[nextIndex], images[index]];
    setForm((current) => applyProductGalleryToProduct(current, images));
  }

  function makeGalleryPrimary(index: number) {
    const images = currentGalleryImages();
    if (index <= 0 || index >= images.length) return;
    const [selected] = images.splice(index, 1);
    images.unshift(selected);
    setForm((current) => applyProductGalleryToProduct(current, images));
    setStatus("Foto utama diperbarui. Periksa urutan peran foto sebelum menyimpan produk.");
  }

  async function uploadImage(event: ChangeEvent<HTMLInputElement>, slotIndex = 0) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setStatus("Gunakan JPG, PNG, atau WebP maksimal 10 MB.");
      return;
    }
    const dimensions = await imageDimensions(file);
    const ratioIsFourFive = isFourFiveRatio(dimensions.width, dimensions.height);
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setUploading(true);
    setStatus(`Mengupload ${PRODUCT_IMAGE_SLOTS[slotIndex]?.shortLabel || "gambar"}...`);
    const hash = await contentHash(file);
    const { data: duplicate } = await supabase.from("media_assets").select("public_url,name").eq("content_hash", hash).limit(1).maybeSingle();
    let publicUrl = duplicate?.public_url as string | undefined;
    if (!publicUrl) {
      const safeName = `${Date.now()}-${slugify(file.name.replace(/\.[^.]+$/, ""))}.${file.name.split(".").pop()?.toLowerCase() || "jpg"}`;
      const path = `product/${safeName}`;
      const { error: uploadError } = await supabase.storage.from(WEBSITE_IMAGES_BUCKET).upload(path, file, { cacheControl: "3600", contentType: file.type });
      if (uploadError) {
        setUploading(false);
        setStatus(`Upload gagal: ${uploadError.message}`);
        return;
      }
      publicUrl = supabase.storage.from(WEBSITE_IMAGES_BUCKET).getPublicUrl(path).data.publicUrl;
      const { data: session } = await supabase.auth.getSession();
      await supabase.from("media_assets").insert({
        name: file.name,
        storage_path: path,
        bucket_id: WEBSITE_IMAGES_BUCKET,
        public_url: publicUrl,
        media_type: "image",
        mime_type: file.type,
        size_bytes: file.size,
        width: dimensions.width,
        height: dimensions.height,
        alt_text: form.image_alt || form.nama || file.name.replace(/\.[^.]+$/, ""),
        tags: ["product", slugify(form.kategori || "uncategorized")],
        content_hash: hash,
        folder: form.kategori || "Product",
        uploaded_by: session.session?.user.id || null
      });
    }
    setGallerySlot(slotIndex, publicUrl || "");
    if (slotIndex === 0 && !form.image_alt) update("image_alt", file.name.replace(/\.[^.]+$/, ""));
    setUploading(false);
    const ratioNote = ratioIsFourFive === false ? " Foto bukan rasio 4:5 dan akan dicrop oleh tampilan." : "";
    const successMessage = `${duplicate ? "Media lama digunakan kembali" : "Gambar masuk ke Media Library"} dan dipasang ke slot ${slotIndex + 1}.${ratioNote}`;
    await loadData();
    setStatus(successMessage);
  }

  async function saveProduct(event: FormEvent) {
    event.preventDefault();
    if (!form.nama.trim() || !form.kategori.trim()) {
      setStatus("Nama dan kategori produk wajib diisi.");
      return;
    }
    if (!form.subcategory?.trim()) {
      setStatus("Model / subkategori wajib dipilih agar struktur PIM tidak ambigu.");
      return;
    }
    const supabase = createSupabaseClient();
    if (!supabase) return;
    const selectedCategory = categories.find((category) => category.id === form.product_category_id)
      || categories.find((category) => category.name === form.kategori)
      || availableCategories.find((category) => category.name === form.kategori);
    if (!selectedCategory?.id) {
      setStatus("Pilih kategori produk yang valid dari product_categories sebelum menyimpan.");
      return;
    }
    setSaving(true);
    const catalogFocal = focalFor(form, "catalog");
    const selectedPreset = selectedCategory ? categoryPreset(selectedCategory.slug || selectedCategory.name) : activePreset;
    const normalizedGallery = currentGalleryImages().slice(0, PRODUCT_GALLERY_LIMIT);
    const imageUrl = normalizedGallery[0] || "";
    if (!imageUrl) {
      setSaving(false);
      setStatus("Foto 1 · Tampak depan wajib dipilih sebelum produk disimpan.");
      return;
    }
    if (form.status_aktif && normalizedGallery.length < PRODUCT_GALLERY_LIMIT) {
      setSaving(false);
      setStatus("Produk aktif wajib memiliki 4 foto. Lengkapi semua slot atau nonaktifkan produk sementara sebagai draft kerja.");
      return;
    }
    const productSlug = form.slug?.trim() || slugify(form.nama);
    if (!productSlug) {
      setSaving(false);
      setStatus("Slug produk tidak boleh kosong. Isi nama produk atau slug yang valid.");
      return;
    }
    let slugQuery = supabase.from("products").select("id").eq("slug", productSlug).limit(1);
    if (editingId) slugQuery = slugQuery.neq("id", editingId);
    const { data: duplicateSlug, error: duplicateSlugError } = await slugQuery;
    if (duplicateSlugError) {
      setSaving(false);
      setStatus(`Validasi slug gagal: ${duplicateSlugError.message}`);
      return;
    }
    if (duplicateSlug?.length) {
      setSaving(false);
      setStatus(`Slug "${productSlug}" sudah dipakai produk lain. Gunakan slug yang berbeda.`);
      return;
    }
    const payload = {
      ...form,
      id: undefined,
      created_at: undefined,
      updated_at: new Date().toISOString(),
      slug: productSlug,
      kategori: selectedCategory.name,
      subcategory: form.subcategory || selectedPreset?.subcategories[0] || "",
      link_url: categoryPath(selectedCategory.slug),
      gambar_url: imageUrl,
      image_url: imageUrl,
      gallery_urls: normalizedGallery.slice(1),
      image_alt: form.image_alt?.trim() || form.nama,
      deskripsi: form.description?.trim() || form.deskripsi?.trim() || form.short_detail?.trim() || "",
      description: form.description?.trim() || form.deskripsi?.trim() || "",
      badge: form.label_promo ? "Promo" : form.label_new ? "New" : form.label_best_seller ? "Best Seller" : "",
      collection_tags: form.collection_tags?.length ? form.collection_tags : selectedPreset?.collectionTags || [],
      intent_tags: form.intent_tags?.length ? form.intent_tags : selectedPreset?.intentTags || [],
      color_tags: form.color_tags?.length ? form.color_tags : selectedPreset?.colorTags || [],
      size_tags: form.size_tags?.length ? form.size_tags : selectedPreset?.sizeTags || [],
      material_tags: form.material_tags?.length ? form.material_tags : selectedPreset?.materialTags || [],
      object_fit: form.object_fit || (imageUrl.includes("/brand/debroder/") ? "contain" : "cover"),
      price: numberOrNull(form.price),
      compare_price: numberOrNull(form.compare_price),
      stock: Math.max(0, Number(form.stock || 0)),
      product_category_id: selectedCategory.id,
      focal_x: catalogFocal.focal_x,
      focal_y: catalogFocal.focal_y,
      focal_zoom: catalogFocal.zoom,
      target_ratio: catalogFocal.target_ratio,
      canonical_url: form.canonical_url?.trim() || `/produk/${productSlug}`
    };
    const result = editingId
      ? await supabase.from("products").update(payload).eq("id", editingId).select("*").single()
      : await supabase.from("products").insert(payload).select("*").single();
    setSaving(false);
    if (result.error) {
      setStatus(`Produk gagal disimpan: ${result.error.message}`);
      return;
    }
    if (result.data.id) {
      await syncHomepageFlags(result.data.id, form);
    }
    setStatus("Produk tersimpan ke Supabase dan langsung tersedia untuk website publik.");
    reset();
    await loadData();
  }

  async function syncHomepageFlags(productId: string, product: Product) {
    const supabase = createSupabaseClient();
    if (!supabase) return;
    const desired = new Map([
      ["fresh-drops", Boolean(product.fresh_drop)]
    ]);
    const { data: sections } = await supabase.from("homepage_sections").select("id,slug").in("slug", Array.from(desired.keys()));
    if (!sections?.length) return;
    const sectionIds = sections.map((section) => section.id);
    const { data: placements } = await supabase.from("homepage_section_items").select("id,section_id").eq("product_id", productId).in("section_id", sectionIds);

    await Promise.all(sections.map((section) => {
      const existing = placements?.find((placement) => placement.section_id === section.id);
      if (desired.get(section.slug) && !existing) {
        return supabase.from("homepage_section_items").insert({ section_id: section.id, product_id: productId, service_id: null, is_active: true, sort_order: product.urutan });
      }
      if (!desired.get(section.slug) && existing) {
        return supabase.from("homepage_section_items").delete().eq("id", existing.id);
      }
      return Promise.resolve({ error: null });
    }));
  }

  async function duplicateProduct(product: Product) {
    const supabase = createSupabaseClient();
    if (!supabase) return;
    const { id: _id, created_at: _created, updated_at: _updated, ...copy } = product;
    void _id; void _created; void _updated;
    const { error } = await supabase.from("products").insert({
      ...copy,
      nama: `${product.nama} (Salinan)`,
      slug: `${product.slug || slugify(product.nama)}-salinan-${Date.now().toString().slice(-5)}`,
      status_aktif: false,
      urutan: product.urutan + 1
    });
    setStatus(error ? `Duplikasi gagal: ${error.message}` : "Produk diduplikasi sebagai nonaktif.");
    if (!error) await loadData();
  }

  async function deleteProduct(product: Product) {
    if (!product.id || !window.confirm(`Hapus produk “${product.nama}”?`)) return;
    const supabase = createSupabaseClient();
    const { error } = await supabase!.from("products").delete().eq("id", product.id);
    setStatus(error ? `Produk gagal dihapus: ${error.message}` : "Produk dihapus.");
    if (!error) await loadData();
  }

  async function createCategory(event: FormEvent) {
    event.preventDefault();
    const name = newCategory.trim();
    if (!name) return;
    const matchedSubcategory = subcategoryMatch(name);
    if (matchedSubcategory) {
      setStatus("Item ini adalah subkategori. Pilih kategori utama lalu isi Subkategori.");
      return;
    }
    const preset = productCategoryPresets.find((item) => item.slug === slugify(name) || item.name.toLowerCase() === name.toLowerCase());
    if (!preset || !isMainProductCategory(name)) {
      setStatus("product_categories hanya untuk kategori utama produk: Kaos Polos, Jersey, Jaket & Hoodie, Kemeja, atau Headwear. Polo Shirt NSA masuk sebagai model di Kaos Polos.");
      return;
    }
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setSavingCategory(true);
    const { error } = await supabase.from("product_categories").insert({
      name: preset.name,
      slug: preset.slug,
      description: "",
      is_active: true,
      sort_order: (productCategoryPresets.findIndex((item) => item.slug === preset.slug) + 1) * 10,
      show_in_collection: true,
      collection_limit: 8,
      collection_sort: "sort_order",
      collection_section_order: (productCategoryPresets.findIndex((item) => item.slug === preset.slug) + 1) * 10
    });
    setSavingCategory(false);
    setStatus(error ? `Kategori gagal dibuat: ${error.message}` : "Kategori produk dibuat.");
    if (!error) {
      setNewCategory("");
      await loadData();
    }
  }

  async function toggleCategory(category: ProductCategory) {
    if (!category.id) return;
    if (isCoreCategory(category) && category.is_active) {
      setStatus("Kategori utama tidak boleh dinonaktifkan agar route publik dan PIM tetap stabil.");
      return;
    }
    const supabase = createSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from("product_categories").update({ is_active: !category.is_active }).eq("id", category.id);
    setStatus(error ? `Kategori gagal diperbarui: ${error.message}` : "Status kategori diperbarui.");
    if (!error) await loadData();
  }

  async function updateCategorySettings(category: ProductCategory, patch: Partial<ProductCategory>) {
    if (!category.id) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from("product_categories").update(patch).eq("id", category.id);
    setStatus(error ? `Pengaturan kategori gagal disimpan: ${error.message}` : "Pengaturan kategori disimpan.");
    if (!error) await loadData();
  }

  async function deleteCategory(category: ProductCategory) {
    if (isCoreCategory(category)) {
      setStatus("Kategori utama tidak boleh dihapus agar route publik dan PIM tetap stabil.");
      return;
    }
    if (!category.id || !window.confirm(`Nonaktifkan kategori lama "${category.name}"? Produk tidak akan dihapus.`)) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from("product_categories").update({ is_active: false, show_in_collection: false }).eq("id", category.id);
    setStatus(error ? `Kategori gagal dinonaktifkan: ${error.message}` : "Kategori lama dinonaktifkan. Produk tetap aman.");
    if (!error) await loadData();
  }

  const focalValue = focalFor(form, focalContext);
  const galleryImages = currentGalleryImages();
  const galleryComplete = galleryImages.length === PRODUCT_GALLERY_LIMIT;
  const activeMediaPickerSlot = mediaPickerSlot ?? 0;
  const labels = [form.label_new && "New", form.label_promo && "Promo", form.label_best_seller && "Best Seller"].filter(Boolean);
  const formReady = Boolean(editingId || form.product_category_id || form.kategori);
  const selectedCategoryKey = form.product_category_id || availableCategories.find((category) => category.name === form.kategori)?.slug || "";

  return (
    <div className="mt-6 grid gap-6">
      {status ? <p role="status" className="border border-brand-softGray bg-white p-4 text-sm font-semibold">{status}</p> : null}

      <section className="bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-[.16em] text-brand-charcoal/45">PIM</p><h2 className="mt-2 text-xl font-semibold">Kategori utama produk</h2><p className="mt-1 text-sm text-brand-charcoal/55">Hanya kelompok besar produk. Model seperti Hoodie, Jersey Futsal, dan Topi Trucker jangan dibuat sebagai kategori utama.</p></div>
          <form onSubmit={createCategory} className="flex w-full gap-2 lg:max-w-md"><input value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="Kategori baru" className="min-h-11 min-w-0 flex-1 rounded-lg border border-brand-softGray px-4 text-sm" /><button disabled={savingCategory} className="rounded-full bg-brand-charcoal px-5 text-sm font-semibold text-white disabled:opacity-50">Tambah</button></form>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">{categories.map((category) => <div key={category.id || category.slug} className="inline-flex items-center rounded-full border border-brand-softGray bg-white"><button type="button" onClick={() => toggleCategory(category)} className={`px-4 py-2 text-xs font-semibold ${category.is_active ? "text-brand-green" : "text-brand-charcoal/45"}`}>{category.name}</button>{isCoreCategory(category) ? <span className="border-l border-brand-softGray px-3 py-2 text-xs font-semibold text-brand-charcoal/45">Utama</span> : <button type="button" aria-label={`Nonaktifkan kategori ${category.name}`} onClick={() => deleteCategory(category)} className="border-l border-brand-softGray px-3 py-2 text-xs font-semibold text-red-700">Nonaktifkan</button>}</div>)}</div>
        {categories.length ? (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-brand-softGray text-xs uppercase tracking-wide text-brand-charcoal/50">
                  <th className="p-3">Kategori</th>
                  <th className="p-3">Tampil di Koleksi</th>
                  <th className="p-3">Limit</th>
                  <th className="p-3">Sort</th>
                  <th className="p-3">Urutan Section</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={`settings-${category.id || category.slug}`} className="border-b border-brand-softGray/70">
                    <td className="p-3 font-semibold">{category.name}<span className="block text-xs font-normal text-brand-charcoal/45">/{category.slug}</span></td>
                    <td className="p-3"><input type="checkbox" checked={category.show_in_collection !== false} onChange={(event) => updateCategorySettings(category, { show_in_collection: event.target.checked })} className="h-4 w-4 accent-brand-green" /></td>
                    <td className="p-3"><input type="number" min="1" max="24" value={category.collection_limit || 8} onChange={(event) => updateCategorySettings(category, { collection_limit: Number(event.target.value) })} className="min-h-10 w-24 rounded-lg border border-brand-softGray px-3" /></td>
                    <td className="p-3"><select value={category.collection_sort || "sort_order"} onChange={(event) => updateCategorySettings(category, { collection_sort: event.target.value as ProductCategory["collection_sort"] })} className="min-h-10 rounded-lg border border-brand-softGray bg-white px-3"><option value="sort_order">Urutan</option><option value="newest">Terbaru</option><option value="best_seller">Best Seller</option><option value="promo">Promo</option></select></td>
                    <td className="p-3"><input type="number" min="0" value={category.collection_section_order ?? category.sort_order ?? 0} onChange={(event) => updateCategorySettings(category, { collection_section_order: Number(event.target.value) })} className="min-h-10 w-28 rounded-lg border border-brand-softGray px-3" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,.6fr)]">
        <form onSubmit={saveProduct} className="grid gap-5 bg-white p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-xl font-semibold">{editingId ? "Edit produk" : "Produk baru"}</h2><p className="mt-1 text-sm text-brand-charcoal/55">Semua data disimpan langsung ke Supabase.</p></div>
            {editingId ? <button type="button" onClick={reset} className="text-sm font-semibold underline">Batal edit</button> : null}
          </div>

          {!formReady ? (
            <div className="rounded-xl border border-brand-softGray bg-brand-offWhite p-5">
              <h3 className="text-lg font-semibold">Pilih kategori utama produk</h3>
              <p className="mt-2 text-sm leading-6 text-brand-charcoal/60">Produk = barang yang dijual. Kategori = kelompok besar. Setelah memilih kategori, isi model/subkategori di langkah berikutnya.</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {availableCategories.map((category) => (
                  <button
                    key={category.id || category.slug}
                    type="button"
                    onClick={() => startNewProduct(category)}
                    className="min-h-20 rounded-xl border border-brand-softGray bg-white px-4 py-3 text-left transition hover:border-brand-green"
                  >
                    <span className="block font-semibold">{category.name}</span>
                    <span className="mt-1 block text-xs text-brand-charcoal/50">/{category.slug}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {formReady ? <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama produk" required><input value={form.nama} onChange={(e) => update("nama", e.target.value)} /></Field>
            <Field label="Slug"><input value={form.slug || ""} onChange={(e) => update("slug", e.target.value)} placeholder="otomatis-dari-nama" /></Field>
            <Field label="Kategori" required><select value={selectedCategoryKey} onChange={(e) => { const category = availableCategories.find((item) => item.id === e.target.value || item.slug === e.target.value); if (category) applyCategoryToForm(category); }}><option value="">Pilih kategori</option>{availableCategories.map((category) => <option key={category.id || category.slug} value={category.id || category.slug}>{category.name}</option>)}</select></Field>
            <Field label="Model / Subkategori" required><select value={form.subcategory || ""} onChange={(e) => update("subcategory", e.target.value)}><option value="">Pilih model</option>{(activePreset?.subcategories || []).map((name) => <option key={name} value={name}>{name}</option>)}</select></Field>
            <Field label="Harga"><input type="number" min="0" value={form.price ?? ""} onChange={(e) => update("price", e.target.value)} /></Field>
            <Field label="Harga asli / pembanding"><input type="number" min="0" value={form.compare_price ?? ""} onChange={(e) => update("compare_price", e.target.value)} /></Field>
            <Field label="Stok"><input type="number" min="0" value={form.stock || 0} onChange={(e) => update("stock", Number(e.target.value))} /></Field>
            <Field label="Urutan tampil"><input type="number" min="0" value={form.urutan} onChange={(e) => update("urutan", Number(e.target.value))} /></Field>
            <Field label="Jumlah terjual"><input type="number" min="0" value={form.sales_count || 0} onChange={(e) => update("sales_count", Number(e.target.value))} /></Field>
          </div>

          <Field label="Deskripsi singkat"><textarea rows={2} value={form.short_detail || ""} onChange={(e) => update("short_detail", e.target.value)} /></Field>
          <Field label="Deskripsi lengkap"><textarea rows={5} value={form.description || form.deskripsi || ""} onChange={(e) => update("description", e.target.value)} /></Field>
          <Field label="Spesifikasi (satu per baris)"><textarea rows={4} value={listValue(form.specifications)} onChange={(e) => update("specifications", parseList(e.target.value))} placeholder="Bahan: Cotton Combed 24s\nUkuran: S–XXL" /></Field>

          <div className="grid gap-3 rounded-xl bg-brand-offWhite p-4 sm:grid-cols-4 lg:grid-cols-7">
            <Check label="Featured" checked={!!form.featured} onChange={(value) => update("featured", value)} />
            <Check label="Trending" checked={!!form.trending} onChange={(value) => update("trending", value)} />
            <Check label="Fresh Drop" checked={!!form.fresh_drop} onChange={(value) => update("fresh_drop", value)} />
            <Check label="New" checked={!!form.label_new} onChange={(value) => update("label_new", value)} />
            <Check label="Promo" checked={!!form.label_promo} onChange={(value) => update("label_promo", value)} />
            <Check label="Best Seller" checked={!!form.label_best_seller} onChange={(value) => update("label_best_seller", value)} />
            <Check label="Aktif" checked={form.status_aktif} onChange={(value) => update("status_aktif", value)} />
          </div>

          <div className="rounded-xl border border-brand-softGray bg-white p-4">
            <h3 className="font-semibold">Metode produksi tersedia</h3>
            <p className="mt-1 text-xs leading-5 text-brand-charcoal/55">Centang teknik pengerjaan yang bisa dipakai untuk produk ini. Data disimpan sebagai tag intent agar tidak perlu menambah kolom database baru.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {pimServiceMethods.map((service) => {
                const checked = (form.intent_tags || []).includes(service.slug);
                return (
                  <Check
                    key={service.slug}
                    label={service.name}
                    checked={checked}
                    onChange={(value) => {
                      const current = new Set(form.intent_tags || []);
                      if (value) current.add(service.slug);
                      else current.delete(service.slug);
                      update("intent_tags", Array.from(current));
                    }}
                  />
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Material (satu per baris)"><textarea rows={3} value={listValue(form.material_tags)} onChange={(e) => update("material_tags", parseList(e.target.value))} /></Field>
            <Field label="Warna (satu per baris)"><textarea rows={3} value={listValue(form.color_tags)} onChange={(e) => update("color_tags", parseList(e.target.value))} /></Field>
            <Field label="Ukuran (satu per baris)"><textarea rows={3} value={listValue(form.size_tags)} onChange={(e) => update("size_tags", parseList(e.target.value))} /></Field>
            <Field label="Tag koleksi (satu per baris)"><textarea rows={3} value={listValue(form.collection_tags)} onChange={(e) => update("collection_tags", parseList(e.target.value))} /></Field>
            <Field label="Layanan / Metode Produksi (satu per baris)"><textarea rows={3} value={listValue(form.intent_tags)} onChange={(e) => update("intent_tags", parseList(e.target.value))} placeholder="sablon-dtf&#10;bordir-komputer&#10;sublim-printing" /></Field>
          </div>

          <div className="rounded-xl border border-brand-softGray bg-white p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.16em] text-brand-green">Galeri produk standar</p>
                <h3 className="mt-1 text-lg font-semibold">4 foto konsisten untuk semua produk</h3>
                <p className="mt-2 max-w-2xl text-xs leading-5 text-brand-charcoal/55">Gunakan master 2000 × 2500 px dengan rasio 4:5. Urutan slot otomatis digunakan di seluruh website: depan, belakang, detail, lalu lifestyle/samping.</p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Link href="/admin/media" className="rounded-full border border-brand-softGray bg-white px-3 py-1.5 text-xs font-semibold text-brand-charcoal transition hover:border-brand-green">
                  Kelola Media Library
                </Link>
                <div className={`rounded-full px-3 py-1.5 text-xs font-semibold ${galleryComplete ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-800"}`}>
                  {galleryImages.length} / {PRODUCT_GALLERY_LIMIT} foto
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {PRODUCT_IMAGE_SLOTS.map((slot, index) => {
                const url = galleryImages[index] || "";
                const selectedMedia = media.find((item) => item.public_url === url);
                const ratioStatus = isFourFiveRatio(selectedMedia?.width, selectedMedia?.height);
                const slotEnabled = index <= galleryImages.length;
                return (
                  <div key={slot.key} className={`overflow-hidden border ${url ? "border-brand-softGray" : "border-dashed border-brand-charcoal/20"} bg-brand-offWhite`}>
                    <div className="relative aspect-[4/5] overflow-hidden bg-[#efefe9]">
                      {url ? <img src={url} alt={slot.label} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center p-5 text-center"><div><p className="text-3xl font-semibold text-brand-charcoal/20">0{index + 1}</p><p className="mt-2 text-xs font-semibold text-brand-charcoal/45">Belum ada foto</p></div></div>}
                      <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold text-brand-charcoal">{slot.shortLabel}</span>
                      {url ? <span className={`absolute bottom-2 right-2 rounded-full px-2.5 py-1 text-[10px] font-semibold ${ratioStatus === true ? "bg-green-50 text-green-800" : ratioStatus === false ? "bg-amber-50 text-amber-800" : "bg-white/95 text-brand-charcoal/60"}`}>{ratioStatus === true ? "Rasio 4:5" : ratioStatus === false ? "Akan dicrop" : "4:5 display"}</span> : null}
                    </div>
                    <div className="space-y-3 bg-white p-3">
                      <div>
                        <p className="text-xs font-semibold text-brand-charcoal">{slot.label}</p>
                        <p className="mt-1 min-h-10 text-[11px] leading-5 text-brand-charcoal/50">{slot.description}</p>
                        {url ? <p className="mt-1 truncate text-[10px] text-brand-charcoal/40">{mediaDimensionLabel(selectedMedia?.width, selectedMedia?.height)}</p> : null}
                      </div>
                      <button
                        type="button"
                        disabled={!slotEnabled || uploading}
                        onClick={() => { setMediaPickerSlot(index); setMediaSearch(""); }}
                        className="min-h-10 w-full rounded-full border border-brand-softGray bg-white px-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {slotEnabled ? url ? "Ganti dari Media Library" : "Pilih dari Media Library" : "Isi slot sebelumnya dahulu"}
                      </button>
                      <label className={`flex min-h-10 cursor-pointer items-center justify-center rounded-full px-3 text-xs font-semibold ${slotEnabled && !uploading ? "bg-brand-charcoal text-white" : "cursor-not-allowed bg-brand-softGray text-brand-charcoal/40"}`}>
                        {uploading ? "Mengupload..." : url ? "Ganti dengan upload" : "Upload ke slot ini"}
                        <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" disabled={!slotEnabled || uploading} onChange={(event) => uploadImage(event, index)} />
                      </label>
                      {url ? <div className="grid grid-cols-2 gap-2">
                        {index > 0 ? <button type="button" onClick={() => makeGalleryPrimary(index)} className="min-h-9 rounded-full border border-brand-softGray px-2 text-[10px] font-semibold">Jadikan utama</button> : <span className="grid min-h-9 place-items-center rounded-full bg-green-50 px-2 text-[10px] font-semibold text-green-800">Gambar utama</span>}
                        <button type="button" onClick={() => setGallerySlot(index, "")} className="min-h-9 rounded-full px-2 text-[10px] font-semibold text-red-700">Hapus</button>
                      </div> : null}
                      {url && index > 0 ? <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => moveGallerySlot(index, -1)} className="min-h-9 rounded-full border border-brand-softGray px-2 text-[10px] font-semibold">← Geser</button>
                        <button type="button" onClick={() => moveGallerySlot(index, 1)} disabled={index >= galleryImages.length - 1} className="min-h-9 rounded-full border border-brand-softGray px-2 text-[10px] font-semibold disabled:opacity-35">Geser →</button>
                      </div> : null}
                    </div>
                  </div>
                );
              })}
            </div>

            {!galleryComplete ? <p className="mt-4 border-l-2 border-amber-500 pl-3 text-xs leading-5 text-brand-charcoal/60">Produk nonaktif dapat disimpan sambil dilengkapi. Untuk mengaktifkan produk di website, keempat slot wajib terisi.</p> : <p className="mt-4 border-l-2 border-brand-green pl-3 text-xs font-semibold leading-5 text-brand-green">Galeri lengkap. Katalog memakai foto depan dan hover belakang; halaman detail memakai keempat foto.</p>}

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Field label="Alt text gambar utama"><input value={form.image_alt || ""} onChange={(e) => update("image_alt", e.target.value)} placeholder={form.nama ? `${form.nama} tampak depan` : "Deskripsi gambar untuk aksesibilitas"} /></Field>
              <div className="rounded-lg bg-brand-offWhite p-3 text-xs leading-5 text-brand-charcoal/55"><strong className="text-brand-charcoal">Aturan tampilan otomatis:</strong><br />Kartu desktop: depan → hover belakang.<br />Detail desktop: grid 2 kolom.<br />Detail mobile: swipe 1–4.</div>
            </div>
          </div>

          {form.image_url ? <div><div className="mb-3 flex flex-wrap gap-2">{focalContexts.map((context) => <button key={context.key} type="button" onClick={() => setFocalContext(context.key)} className={`rounded-full px-4 py-2 text-xs font-semibold ${focalContext === context.key ? "bg-brand-green text-white" : "border border-brand-softGray"}`}>{context.label}</button>)}</div><FocalPointEditor src={form.image_url} alt={form.image_alt || form.nama} value={focalValue} onChange={(value) => setForm((current) => ({ ...current, focal_points: { ...(current.focal_points || {}), [focalContext]: value }, ...(focalContext === "catalog" ? { focal_x: value.focal_x, focal_y: value.focal_y, focal_zoom: value.zoom, target_ratio: value.target_ratio } : {}) }))} onSave={() => setStatus("Fokus diperbarui di formulir. Simpan produk untuk menerbitkan perubahan.")} /></div> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="SEO title"><input value={form.seo_title || ""} onChange={(e) => update("seo_title", e.target.value)} maxLength={60} /></Field>
            <Field label="Canonical URL"><input value={form.canonical_url || ""} onChange={(e) => update("canonical_url", e.target.value)} placeholder="/produk/nama-produk" /></Field>
            <Field label="SEO description"><textarea rows={3} value={form.seo_description || ""} onChange={(e) => update("seo_description", e.target.value)} maxLength={160} /></Field>
            <Field label="Open Graph image"><select value={form.og_image_url || ""} onChange={(e) => update("og_image_url", e.target.value)}><option value="">Gunakan gambar utama</option>{media.map((item) => <option key={item.id} value={item.public_url}>{item.name}</option>)}</select></Field>
          </div>

          <button disabled={saving || uploading} className="min-h-12 rounded-full bg-brand-green px-6 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Menyimpan..." : editingId ? "Simpan perubahan" : "Buat produk"}</button>
          </> : null}
        </form>

        <aside className="self-start bg-white p-5 xl:sticky xl:top-24">
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-brand-charcoal/50">Preview kartu</p>
          <div className="mt-4 overflow-hidden bg-brand-offWhite">
            <div className="group relative">
              {galleryImages[0] ? <ProductImageSwap
                primarySrc={galleryImages[0]}
                hoverSrc={galleryImages[1]}
                fallbackSrc={placeholderProductImage}
                alt={form.image_alt || form.nama || "Preview produk"}
                imageClassName={(form.object_fit || "cover") === "contain" ? "object-contain p-3" : "object-cover"}
                objectFit={form.object_fit || "cover"}
                objectPosition={`${focalFor(form, "catalog").focal_x}% ${focalFor(form, "catalog").focal_y}%`}
                focalX={focalFor(form, "catalog").focal_x}
                focalY={focalFor(form, "catalog").focal_y}
                zoom={focalFor(form, "catalog").zoom}
                sizes="320px"
              /> : <div className="grid aspect-[4/5] place-items-center text-sm text-brand-charcoal/40">Pilih Foto 1</div>}
              {labels.length ? <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-1">{labels.map((label) => <span key={String(label)} className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold shadow">{label}</span>)}</div> : null}
            </div>
            <div className="p-4"><p className="mb-2 text-[10px] font-semibold uppercase tracking-[.12em] text-brand-charcoal/40">Arahkan cursor untuk foto belakang</p><h3 className="line-clamp-2 font-semibold">{form.nama || "Nama produk"}</h3><p className="mt-2 text-sm font-semibold">{formatRupiah(form.price) || "Harga belum diisi"}</p>{form.compare_price ? <p className="text-xs text-brand-charcoal/45 line-through">{formatRupiah(form.compare_price)}</p> : null}</div>
          </div>
        </aside>
      </div>

      <section className="bg-white p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-xl font-semibold">Daftar produk</h2><p className="mt-1 text-sm text-brand-charcoal/55">{visibleProducts.length} produk</p></div></div>
        <div className="mt-5 grid gap-3 md:grid-cols-5">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari nama atau kategori..." className="min-h-11 rounded-lg border border-brand-softGray px-4 text-sm" />
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}><option value="all">Semua kategori</option>{categoryNames.map((name) => <option key={name}>{name}</option>)}</select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="all">Semua status</option><option value="true">Aktif</option><option value="false">Nonaktif</option></select>
          <select value={galleryFilter} onChange={(e) => setGalleryFilter(e.target.value as "all" | "complete" | "incomplete")}><option value="all">Semua galeri</option><option value="complete">Galeri lengkap 4/4</option><option value="incomplete">Galeri belum lengkap</option></select>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}><option value="urutan">Urutan tampil</option><option value="nama">Nama A–Z</option><option value="price">Harga</option><option value="newest">Terbaru</option></select>
        </div>

        {loading ? <div className="mt-5 grid gap-3">{[1, 2, 3].map((item) => <div key={item} className="h-20 animate-pulse bg-brand-offWhite" />)}</div> : visibleProducts.length ? (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead>
                <tr className="border-b border-brand-softGray text-xs uppercase tracking-wide text-brand-charcoal/50">
                  <th className="p-3">Produk</th>
                  <th className="p-3">Kategori</th>
                  <th className="p-3">Harga</th>
                  <th className="p-3">Galeri</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Urutan</th>
                  <th className="p-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {visibleProducts.map((product) => {
                  const productGalleryCount = productGalleryFromForm(product).filter((url) => url !== placeholderProductImage).length;
                  const productGalleryComplete = productGalleryCount === PRODUCT_GALLERY_LIMIT;
                  return (
                    <tr key={product.id || product.slug} className="border-b border-brand-softGray/70">
                      <td className="p-3"><div className="flex items-center gap-3"><img src={product.image_url || product.gambar_url || placeholderProductImage} alt={product.image_alt || product.nama} className="aspect-[4/5] w-14 bg-brand-offWhite object-cover" /><div><p className="font-semibold">{product.nama}</p><p className="text-xs text-brand-charcoal/45">/{product.slug}</p></div></div></td>
                      <td className="p-3">{product.kategori}{product.subcategory ? <span className="block text-xs text-brand-charcoal/45">{product.subcategory}</span> : null}</td>
                      <td className="p-3 font-semibold">{formatRupiah(product.price) || "—"}</td>
                      <td className="p-3"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${productGalleryComplete ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-800"}`}>{productGalleryCount} / {PRODUCT_GALLERY_LIMIT}</span></td>
                      <td className="p-3"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${product.status_aktif ? "bg-green-50 text-green-800" : "bg-gray-100 text-gray-600"}`}>{product.status_aktif ? "Aktif" : "Nonaktif"}</span></td>
                      <td className="p-3">{product.urutan}</td>
                      <td className="p-3"><div className="flex flex-wrap gap-2"><button type="button" onClick={() => startEdit(product)} className="rounded-full bg-brand-charcoal px-3 py-2 text-xs font-semibold text-white">Edit</button><button type="button" onClick={() => duplicateProduct(product)} className="rounded-full border border-brand-softGray px-3 py-2 text-xs font-semibold">Duplikat</button><button type="button" onClick={() => deleteProduct(product)} className="rounded-full px-3 py-2 text-xs font-semibold text-red-700">Hapus</button></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <div className="mt-5 bg-brand-offWhite p-8 text-center"><p className="font-semibold">Tidak ada produk</p><p className="mt-2 text-sm text-brand-charcoal/55">Ubah filter atau buat produk pertama.</p></div>}
      </section>

      {mediaPickerSlot !== null ? (
        <div className="fixed inset-0 z-[120] bg-black/55 p-3 sm:p-6" onClick={() => setMediaPickerSlot(null)}>
          <div className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden bg-white" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Pilih foto dari Media Library">
            <div className="flex items-start justify-between gap-4 border-b border-brand-softGray p-4 sm:p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.16em] text-brand-green">Media Library</p>
                <h3 className="mt-1 text-xl font-semibold">Pilih {PRODUCT_IMAGE_SLOTS[activeMediaPickerSlot]?.label}</h3>
                <p className="mt-1 text-xs text-brand-charcoal/55">Klik satu foto untuk memasangnya. Foto yang sudah dipakai pada slot lain tidak dapat dipilih ulang.</p>
              </div>
              <button type="button" onClick={() => setMediaPickerSlot(null)} aria-label="Tutup Media Library" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-offWhite text-xl">×</button>
            </div>
            <div className="grid gap-3 border-b border-brand-softGray p-4 sm:grid-cols-[1fr_auto] sm:p-5">
              <input value={mediaSearch} onChange={(event) => setMediaSearch(event.target.value)} placeholder="Cari nama file, folder, atau alt text..." className="min-h-11 rounded-full border border-brand-softGray px-4 text-sm outline-none focus:border-brand-green" autoFocus />
              <label className="flex min-h-11 items-center gap-2 rounded-full bg-brand-offWhite px-4 text-xs font-semibold"><input type="checkbox" checked={onlyFourFiveMedia} onChange={(event) => setOnlyFourFiveMedia(event.target.checked)} className="h-4 w-4 accent-brand-green" />Hanya media 4:5</label>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-4"><p className="text-sm font-semibold">{filteredMedia.length} media ditemukan</p><p className="text-xs text-brand-charcoal/45">Rekomendasi: 2000 × 2500 px</p></div>
              {filteredMedia.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {filteredMedia.map((item) => {
                  const usedIndex = galleryImages.indexOf(item.public_url);
                  const usedElsewhere = usedIndex >= 0 && usedIndex !== activeMediaPickerSlot;
                  const ratio = isFourFiveRatio(item.width, item.height);
                  return (
                    <button
                      key={`picker-${item.id}`}
                      type="button"
                      disabled={usedElsewhere}
                      onClick={() => { setGallerySlot(activeMediaPickerSlot, item.public_url); setMediaPickerSlot(null); }}
                      className={`group overflow-hidden border text-left transition ${galleryImages[activeMediaPickerSlot] === item.public_url ? "border-brand-green ring-2 ring-brand-green/20" : "border-brand-softGray hover:border-brand-green"} disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                      <div className="relative aspect-[4/5] overflow-hidden bg-brand-offWhite"><img src={item.public_url} alt={item.alt_text || item.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" />{usedElsewhere ? <span className="absolute inset-x-2 bottom-2 bg-black/70 px-2 py-1 text-center text-[10px] font-semibold text-white">Dipakai di Foto {usedIndex + 1}</span> : null}</div>
                      <div className="p-2.5"><p className="truncate text-xs font-semibold">{item.name}</p><p className="mt-1 truncate text-[10px] text-brand-charcoal/45">{item.folder || "Tanpa folder"}</p><div className="mt-2 flex items-center justify-between gap-2 text-[10px]"><span className={ratio === true ? "font-semibold text-green-700" : ratio === false ? "font-semibold text-amber-700" : "text-brand-charcoal/45"}>{ratio === true ? "4:5" : ratio === false ? "Perlu crop" : "Rasio ?"}</span><span className="text-brand-charcoal/45">{item.width && item.height ? `${item.width}×${item.height}` : "—"}</span></div></div>
                    </button>
                  );
                })}
              </div> : <div className="grid min-h-64 place-items-center bg-brand-offWhite p-6 text-center"><div><p className="font-semibold">Media tidak ditemukan</p><p className="mt-2 text-sm text-brand-charcoal/55">Ubah pencarian atau matikan filter “Hanya media 4:5”.</p><button type="button" onClick={() => { setMediaSearch(""); setOnlyFourFiveMedia(false); }} className="mt-4 rounded-full bg-brand-charcoal px-5 py-2 text-xs font-semibold text-white">Tampilkan semua media</button></div></div>}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="block text-sm font-semibold">{label}{required ? " *" : ""}<span className="mt-2 block [&>input]:min-h-11 [&>input]:w-full [&>input]:rounded-lg [&>input]:border [&>input]:border-brand-softGray [&>input]:px-4 [&>input]:font-normal [&>select]:min-h-11 [&>select]:w-full [&>select]:rounded-lg [&>select]:border [&>select]:border-brand-softGray [&>select]:bg-white [&>select]:px-4 [&>select]:font-normal [&>textarea]:w-full [&>textarea]:rounded-lg [&>textarea]:border [&>textarea]:border-brand-softGray [&>textarea]:px-4 [&>textarea]:py-3 [&>textarea]:font-normal">{children}</span></label>;
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex min-h-10 items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-brand-green" />{label}</label>;
}
