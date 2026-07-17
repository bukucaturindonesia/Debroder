/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";
import { VariantMatrixEditor } from "@/components/admin/VariantMatrixEditor";
import {
  loadProductManager,
  runProductManagerAction,
  type ProductManagerAction,
  type ProductManagerItem,
  type ProductManagerMediaAsset,
  type ProductManagerPayload,
  type ProductManagerSellable,
  type ProductManagerVariant,
  type ProductManagerVariantImage
} from "@/lib/admin-product-api";
import {
  lifecycleLabel,
  PRODUCT_IMAGE_ROLES,
  workflowStatusLabel,
  type ProductImageRole,
  type ProductLifecycle,
  type ProductRootInput,
  type ProductVariantInput,
  type SellableSkuInput,
  type VariantImageInput
} from "@/lib/product-manager";
import type { VariantMatrixSaveInput } from "@/lib/variant-matrix";
import { PRODUCT_IMAGE_SLOTS } from "@/lib/product-gallery";
import { formatRupiah } from "@/lib/url";

const emptyRoot: ProductRootInput = {
  id: null,
  name: "",
  slug: "",
  productCategoryId: "",
  productSubcategoryId: null,
  basePrice: 0,
  description: "",
  sku: null,
  productType: "standard_product",
  pricingMode: "fixed_price",
  minimumOrderQty: 1,
  seoTitle: null,
  seoDescription: null
};

function emptyVariant(productId = ""): ProductVariantInput {
  return {
    id: null,
    productId,
    colorMasterId: null,
    name: "",
    slug: "",
    hexCode: "#111111",
    sku: null,
    priceAdjustment: 0,
    status: "active",
    sortOrder: 0
  };
}

function emptySellable(variantId = ""): SellableSkuInput {
  return {
    id: null,
    variantId,
    sizeId: "",
    sku: "",
    stockQuantity: 0,
    priceAdjustment: 0,
    status: "active",
    sortOrder: 0
  };
}

export function ProductAdminPanel() {
  const [payload, setPayload] = useState<ProductManagerPayload | null>(null);
  const [rootForm, setRootForm] = useState<ProductRootInput>({ ...emptyRoot });
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [variantForm, setVariantForm] = useState<ProductVariantInput>(emptyVariant());
  const [sellableForm, setSellableForm] = useState<SellableSkuInput>(emptySellable());
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ProductLifecycle>("all");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState("");

  const selected = useMemo(
    () => payload?.products.find((product) => product.id === selectedProductId) || null,
    [payload, selectedProductId]
  );
  const selectedVariant = selected?.variants.find((variant) => variant.id === selectedVariantId) || null;

  async function refresh(preferredProductId?: string | null, preferredVariantId?: string | null) {
    setLoading(true);
    try {
      const next = await loadProductManager();
      setPayload(next);
      const productId = preferredProductId === undefined ? selectedProductId : preferredProductId;
      const nextSelected = productId ? next.products.find((product) => product.id === productId) || null : null;
      setSelectedProductId(nextSelected?.id || null);
      if (nextSelected) {
        setRootForm(rootFromProduct(nextSelected));
        const wantedVariant = preferredVariantId === undefined ? selectedVariantId : preferredVariantId || "";
        const nextVariant = nextSelected.variants.find((variant) => variant.id === wantedVariant) || nextSelected.variants[0] || null;
        setSelectedVariantId(nextVariant?.id || "");
        setVariantForm(nextVariant ? variantInput(nextVariant) : emptyVariant(nextSelected.id));
        setSellableForm(emptySellable(nextVariant?.id || ""));
      } else if (preferredProductId !== undefined) {
        setRootForm({ ...emptyRoot });
        setSelectedVariantId("");
        setVariantForm(emptyVariant());
        setSellableForm(emptySellable());
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unified Product Manager gagal dimuat.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  const visibleProducts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (payload?.products || []).filter((product) => {
      const matchesText = !needle || `${product.name} ${product.slug} ${product.categoryName} ${product.subcategoryName} ${product.sku || ""}`.toLowerCase().includes(needle);
      const matchesStatus = statusFilter === "all" || product.status === statusFilter;
      return matchesText && matchesStatus;
    });
  }, [payload, query, statusFilter]);

  const filteredSubcategories = useMemo(
    () => (payload?.subcategories || []).filter((item) => item.categoryId === rootForm.productCategoryId),
    [payload, rootForm.productCategoryId]
  );

  function selectProduct(product: ProductManagerItem) {
    setSelectedProductId(product.id);
    setRootForm(rootFromProduct(product));
    const firstVariant = product.variants[0] || null;
    setSelectedVariantId(firstVariant?.id || "");
    setVariantForm(firstVariant ? variantInput(firstVariant) : emptyVariant(product.id));
    setSellableForm(emptySellable(firstVariant?.id || ""));
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function newDraft() {
    setSelectedProductId(null);
    setRootForm({ ...emptyRoot });
    setSelectedVariantId("");
    setVariantForm(emptyVariant());
    setSellableForm(emptySellable());
    setNotice("Produk baru akan disimpan sebagai Draft. Setelah tersimpan, lanjutkan warna, SKU, stok, dan gambar pada halaman yang sama.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function selectVariant(variant: ProductManagerVariant) {
    setSelectedVariantId(variant.id);
    setVariantForm(variantInput(variant));
    setSellableForm(emptySellable(variant.id));
    document.getElementById("warna")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function newVariant() {
    if (!selected) return;
    setVariantForm(emptyVariant(selected.id));
    document.getElementById("warna")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function editSellable(item: ProductManagerSellable) {
    setSelectedVariantId(item.variantId);
    setSellableForm({
      id: item.id,
      variantId: item.variantId,
      sizeId: item.sizeId || "",
      sku: item.sku,
      stockQuantity: item.stockQuantity,
      priceAdjustment: item.priceAdjustment,
      status: item.status,
      sortOrder: item.sortOrder
    });
    document.getElementById("ukuran-sku")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function runAction(input: {
    action: ProductManagerAction;
    productId?: string;
    product?: ProductRootInput;
    variant?: ProductVariantInput;
    sellable?: SellableSkuInput;
    image?: VariantImageInput;
    imageId?: string;
    matrix?: VariantMatrixSaveInput;
  }) {
    if (working) return;
    setWorking(true);
    setNotice("");
    try {
      const result = await runProductManagerAction(input);
      const issues = result.issues || [];
      setNotice(issues.length ? issues.map((issue) => issue.message).join(" • ") : result.message || "Operasi Unified Product Manager berhasil.");
      await refresh(result.productId || input.productId || selectedProductId, result.variantId || input.variant?.id || input.sellable?.variantId || input.image?.variantId || selectedVariantId);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Operasi Unified Product Manager gagal.");
    } finally {
      setWorking(false);
    }
  }

  async function saveRoot(event: FormEvent) {
    event.preventDefault();
    await runAction({ action: "save_draft", product: rootForm });
  }

  async function saveVariant(event: FormEvent) {
    event.preventDefault();
    await runAction({ action: "save_variant", productId: selected?.id, variant: variantForm });
  }

  async function saveSellable(event: FormEvent) {
    event.preventDefault();
    await runAction({ action: "save_sellable", productId: selected?.id, sellable: sellableForm });
  }

  const currentStatus = selected?.status || "draft";
  const readOnly = payload?.role === "admin_guest";
  const canEditRoot = Boolean(payload?.capabilities.canEditDraft) && (!selected || currentStatus === "draft" || Boolean(payload?.capabilities.canEditPublished));
  const canManageDependencies = Boolean(payload?.capabilities.canManageDependencies) && !readOnly;
  const blockers = selected?.validationIssues.filter((issue) => issue.severity === "error") || [];

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        eyebrow="PIM PHASE 3"
        title="Unified Product Manager"
        description="Unified Product Manager dengan Variant Matrix untuk kombinasi warna × ukuran, SKU deterministik, bulk harga/stok, dry-run, dan save server-side."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/products/export-reconciliation" className="rounded-full border border-brand-softGray bg-white px-5 py-3 text-sm font-semibold text-brand-charcoal">
              Export &amp; Reconciliation
            </Link>
            <Link href="/admin/products/bulk-edit" className="rounded-full border border-brand-softGray bg-white px-5 py-3 text-sm font-semibold text-brand-charcoal">
              Bulk Edit & Actions
            </Link>
            <Link href="/admin/products/bulk-import" className="rounded-full border border-brand-softGray bg-white px-5 py-3 text-sm font-semibold text-brand-charcoal">
              Bulk Import Produk
            </Link>
            {payload?.capabilities.canCreateDraft ? (
              <button data-admin-mutation="true" type="button" onClick={newDraft} className="rounded-full bg-brand-charcoal px-5 py-3 text-sm font-semibold text-white">
                Produk Draft Baru
              </button>
            ) : null}
            {payload?.capabilities.canManageDependencies ? (
              <Link href="/admin/pim-v2" className="rounded-full border border-brand-softGray bg-white px-5 py-3 text-sm font-semibold text-brand-charcoal/70">
                Fallback PIM V2
              </Link>
            ) : null}
          </div>
        }
      />

      {readOnly ? (
        <div role="status" className="border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-900">
          MODE LIHAT SAJA — seluruh workflow produk dapat dilihat, tetapi semua perubahan dinonaktifkan.
        </div>
      ) : null}
      {notice ? <div role="status" className="border border-brand-softGray bg-white px-5 py-4 text-sm font-medium">{notice}</div> : null}

      <ProductChooser
        products={visibleProducts}
        selectedId={selectedProductId}
        query={query}
        statusFilter={statusFilter}
        loading={loading}
        readOnly={readOnly}
        canDuplicate={Boolean(payload?.capabilities.canCreateDraft)}
        working={working}
        onQuery={setQuery}
        onStatusFilter={setStatusFilter}
        onSelect={selectProduct}
        onRefresh={() => void refresh()}
        onDuplicate={(productId) => void runAction({ action: "duplicate", productId })}
      />

      {selected ? <WorkflowProgress product={selected} /> : null}

      <section id="informasi-produk" className="scroll-mt-24 bg-white p-5 sm:p-7">
        <SectionHeader index="01" title="Informasi Produk" description="Product root/family canonical pada tabel products. Produk baru dan duplikat selalu Draft." status={selected?.workflow.find((step) => step.key === "product")?.status} />
        <form onSubmit={saveRoot} className="mt-6 grid gap-5 lg:grid-cols-2">
          <Field label="Nama produk" required><input value={rootForm.name} onChange={(event) => setRootForm((current) => ({ ...current, name: event.target.value }))} disabled={!canEditRoot || working} /></Field>
          <Field label="Slug" required><input value={rootForm.slug} onChange={(event) => setRootForm((current) => ({ ...current, slug: slugify(event.target.value) }))} disabled={!canEditRoot || working} placeholder="kaos-cotton-combed-24s" /></Field>
          <Field label="Kategori" required>
            <select value={rootForm.productCategoryId} onChange={(event) => setRootForm((current) => ({ ...current, productCategoryId: event.target.value, productSubcategoryId: null }))} disabled={!canEditRoot || working}>
              <option value="">Pilih kategori</option>
              {(payload?.categories || []).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </Field>
          <Field label="Subkategori">
            <select value={rootForm.productSubcategoryId || ""} onChange={(event) => setRootForm((current) => ({ ...current, productSubcategoryId: event.target.value || null }))} disabled={!canEditRoot || working || !rootForm.productCategoryId}>
              <option value="">Tanpa subkategori</option>
              {filteredSubcategories.map((subcategory) => <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>)}
            </select>
          </Field>
          <Field label="Harga dasar" required><input type="number" min={0} step={1} value={rootForm.basePrice} onChange={(event) => setRootForm((current) => ({ ...current, basePrice: Number(event.target.value) }))} disabled={!canEditRoot || working} /></Field>
          <Field label="SKU induk"><input value={rootForm.sku || ""} onChange={(event) => setRootForm((current) => ({ ...current, sku: event.target.value || null }))} disabled={!canEditRoot || working} placeholder="Opsional" /></Field>
          <Field label="Product type">
            <select value={rootForm.productType || "standard_product"} onChange={(event) => setRootForm((current) => ({ ...current, productType: event.target.value }))} disabled={!canEditRoot || working}>
              <option value="standard_product">Standard product</option>
              <option value="configurable_product">Configurable product</option>
              <option value="production_service">Production service</option>
            </select>
          </Field>
          <Field label="Pricing mode">
            <select value={rootForm.pricingMode || "fixed_price"} onChange={(event) => setRootForm((current) => ({ ...current, pricingMode: event.target.value }))} disabled={!canEditRoot || working}>
              <option value="fixed_price">Fixed price</option>
              <option value="variant_based">Variant based</option>
              <option value="configurator_based">Configurator based</option>
              <option value="custom_quote">Custom quote</option>
            </select>
          </Field>
          <Field label="Minimum order"><input type="number" min={1} step={1} value={rootForm.minimumOrderQty || 1} onChange={(event) => setRootForm((current) => ({ ...current, minimumOrderQty: Number(event.target.value) }))} disabled={!canEditRoot || working} /></Field>
          <div className="hidden lg:block" />
          <Field label="Deskripsi"><textarea rows={5} value={rootForm.description || ""} onChange={(event) => setRootForm((current) => ({ ...current, description: event.target.value }))} disabled={!canEditRoot || working} /></Field>
          <div className="grid gap-5">
            <Field label="SEO title"><input value={rootForm.seoTitle || ""} onChange={(event) => setRootForm((current) => ({ ...current, seoTitle: event.target.value || null }))} disabled={!canEditRoot || working} /></Field>
            <Field label="SEO description"><textarea rows={3} value={rootForm.seoDescription || ""} onChange={(event) => setRootForm((current) => ({ ...current, seoDescription: event.target.value || null }))} disabled={!canEditRoot || working} /></Field>
          </div>
          {selected?.imageUrl ? (
            <div className="rounded-xl bg-brand-offWhite p-4 lg:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-charcoal/45">Galeri product-root legacy — read-only compatibility</p>
              <div className="mt-3 flex items-center gap-3"><img src={selected.imageUrl} alt={selected.name} className="aspect-[4/5] w-20 object-cover" /><p className="text-xs leading-5 text-brand-charcoal/60">Gambar canonical dikelola per color variant melalui front, back, detail, dan lifestyle.</p></div>
            </div>
          ) : null}
          {canEditRoot ? (
            <div className="lg:col-span-2"><button data-admin-mutation="true" disabled={working} className="min-h-12 rounded-full bg-brand-green px-6 text-sm font-semibold text-white disabled:opacity-45">{working ? "Memproses..." : selected ? "Simpan Draft / Perubahan" : "Simpan sebagai Draft"}</button></div>
          ) : null}
        </form>
      </section>

      {selected ? (
        <>
          <section id="warna" className="scroll-mt-24 bg-white p-5 sm:p-7">
            <SectionHeader index="02" title="Warna" description="Satu product root memiliki banyak color variant. Master warna existing dapat dipakai untuk menjaga nama, slug, dan HEX konsisten." status={selected.workflow.find((step) => step.key === "colors")?.status} />
            <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <form onSubmit={saveVariant} className="border border-brand-softGray p-5">
                <div className="flex items-center justify-between gap-3"><h3 className="font-semibold">{variantForm.id ? "Edit color variant" : "Tambah color variant"}</h3>{canManageDependencies ? <button type="button" onClick={newVariant} className="text-xs font-semibold text-brand-green">Form baru</button> : null}</div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field label="Master warna">
                    <select value={variantForm.colorMasterId || ""} onChange={(event) => {
                      const color = payload?.colorMaster.find((item) => item.id === event.target.value);
                      setVariantForm((current) => ({ ...current, colorMasterId: color?.id || null, name: color?.name || current.name, slug: color?.slug || current.slug, hexCode: color?.colorHex || current.hexCode }));
                    }} disabled={!canManageDependencies || working}>
                      <option value="">Input manual</option>
                      {(payload?.colorMaster || []).map((color) => <option key={color.id} value={color.id}>{color.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Status"><select value={variantForm.status} onChange={(event) => setVariantForm((current) => ({ ...current, status: event.target.value === "inactive" ? "inactive" : "active" }))} disabled={!canManageDependencies || working}><option value="active">Active</option><option value="inactive">Inactive</option></select></Field>
                  <Field label="Nama warna" required><input value={variantForm.name} onChange={(event) => setVariantForm((current) => ({ ...current, name: event.target.value, slug: current.id ? current.slug : slugify(event.target.value) }))} disabled={!canManageDependencies || working || Boolean(variantForm.colorMasterId)} /></Field>
                  <Field label="Slug warna" required><input value={variantForm.slug} onChange={(event) => setVariantForm((current) => ({ ...current, slug: slugify(event.target.value) }))} disabled={!canManageDependencies || working || Boolean(variantForm.colorMasterId)} /></Field>
                  <Field label="HEX" required><input value={variantForm.hexCode} onChange={(event) => setVariantForm((current) => ({ ...current, hexCode: event.target.value }))} disabled={!canManageDependencies || working || Boolean(variantForm.colorMasterId)} /></Field>
                  <Field label="SKU induk warna"><input value={variantForm.sku || ""} onChange={(event) => setVariantForm((current) => ({ ...current, sku: event.target.value || null }))} disabled={!canManageDependencies || working} placeholder="Opsional" /></Field>
                  <Field label="Penyesuaian harga"><input type="number" step={1} value={variantForm.priceAdjustment} onChange={(event) => setVariantForm((current) => ({ ...current, priceAdjustment: Number(event.target.value) }))} disabled={!canManageDependencies || working} /></Field>
                  <Field label="Urutan"><input type="number" min={0} step={1} value={variantForm.sortOrder} onChange={(event) => setVariantForm((current) => ({ ...current, sortOrder: Number(event.target.value) }))} disabled={!canManageDependencies || working} /></Field>
                </div>
                {canManageDependencies ? <button data-admin-mutation="true" disabled={working} className="mt-5 min-h-11 rounded-full bg-brand-charcoal px-5 text-sm font-semibold text-white disabled:opacity-45">Simpan color variant</button> : null}
              </form>

              <div className="grid gap-3">
                {selected.variants.length ? selected.variants.map((variant) => <VariantCard key={variant.id} variant={variant} selected={variant.id === selectedVariantId} readOnly={readOnly} onSelect={() => selectVariant(variant)} />) : <EmptyState title="Belum ada color variant" detail="Tambahkan warna pertama agar ukuran, SKU, stok, dan gambar dapat dikelola." />}
              </div>
            </div>
          </section>

          <form onSubmit={saveSellable} className="grid gap-6 xl:grid-cols-2">
            <section id="ukuran-sku" className="scroll-mt-24 bg-white p-5 sm:p-7">
              <SectionHeader index="03" title="Ukuran & SKU" description="Pilih ukuran menggunakan size_id dari product_size_master. SKU pada baris ini adalah sellable SKU canonical." status={selected.workflow.find((step) => step.key === "sizes")?.status} />
              <div className="mt-6 grid gap-4">
                <Field label="Color variant">
                  <select value={sellableForm.variantId || selectedVariantId} onChange={(event) => { setSelectedVariantId(event.target.value); setSellableForm(emptySellable(event.target.value)); }} disabled={!canManageDependencies || working}>
                    <option value="">Pilih color variant</option>
                    {selected.variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.name}</option>)}
                  </select>
                </Field>
                <Field label="Ukuran dari master" required>
                  <select value={sellableForm.sizeId} onChange={(event) => setSellableForm((current) => ({ ...current, sizeId: event.target.value }))} disabled={!canManageDependencies || working || !sellableForm.variantId}>
                    <option value="">Pilih ukuran</option>
                    {(payload?.sizeMaster || []).map((size) => <option key={size.id} value={size.id}>{size.name} · {size.sizeGroup}</option>)}
                  </select>
                </Field>
                <Field label="Sellable SKU" required><input value={sellableForm.sku} onChange={(event) => setSellableForm((current) => ({ ...current, sku: event.target.value.toUpperCase() }))} disabled={!canManageDependencies || working || !sellableForm.variantId} placeholder="DBR-K24-BLK-M" /></Field>
                <Field label="Status"><select value={sellableForm.status} onChange={(event) => setSellableForm((current) => ({ ...current, status: event.target.value === "inactive" ? "inactive" : "active" }))} disabled={!canManageDependencies || working || !sellableForm.variantId}><option value="active">Active</option><option value="inactive">Inactive</option></select></Field>
                <Field label="Urutan"><input type="number" min={0} step={1} value={sellableForm.sortOrder} onChange={(event) => setSellableForm((current) => ({ ...current, sortOrder: Number(event.target.value) }))} disabled={!canManageDependencies || working || !sellableForm.variantId} /></Field>
              </div>
            </section>

            <section id="harga-stok" className="scroll-mt-24 bg-white p-5 sm:p-7">
              <SectionHeader index="04" title="Harga & Stok" description="Harga akhir berasal dari base_price + penyesuaian warna + penyesuaian SKU. Inventory truth berada di stock_quantity." status={selected.workflow.find((step) => step.key === "pricing")?.status} />
              <div className="mt-6 grid gap-4">
                <div className="rounded-xl bg-brand-offWhite p-4 text-sm"><span className="text-brand-charcoal/55">Harga dasar produk</span><strong className="ml-2">{formatRupiah(selected.basePrice)}</strong>{selectedVariant ? <span className="mt-1 block text-xs text-brand-charcoal/55">Penyesuaian {selectedVariant.name}: {formatSignedRupiah(selectedVariant.priceAdjustment)}</span> : null}</div>
                <Field label="Stock quantity" required><input type="number" min={0} step={1} value={sellableForm.stockQuantity} onChange={(event) => setSellableForm((current) => ({ ...current, stockQuantity: Number(event.target.value) }))} disabled={!canManageDependencies || working || !sellableForm.variantId} /></Field>
                <Field label="Penyesuaian harga SKU"><input type="number" step={1} value={sellableForm.priceAdjustment} onChange={(event) => setSellableForm((current) => ({ ...current, priceAdjustment: Number(event.target.value) }))} disabled={!canManageDependencies || working || !sellableForm.variantId} /></Field>
                <div className="rounded-xl border border-brand-softGray p-4 text-sm"><span className="text-brand-charcoal/55">Preview harga SKU</span><strong className="ml-2">{formatRupiah(selected.basePrice + Number(selectedVariant?.priceAdjustment || 0) + Number(sellableForm.priceAdjustment || 0))}</strong></div>
                {canManageDependencies ? <div className="flex flex-wrap gap-2"><button data-admin-mutation="true" disabled={working || !sellableForm.variantId} className="min-h-11 rounded-full bg-brand-green px-5 text-sm font-semibold text-white disabled:opacity-45">Simpan ukuran / SKU / stok</button><button type="button" onClick={() => setSellableForm(emptySellable(selectedVariantId))} className="min-h-11 rounded-full border border-brand-softGray px-5 text-sm font-semibold">Form baru</button></div> : null}
              </div>
            </section>
          </form>

          <section className="bg-white p-5 sm:p-7">
            <h3 className="text-lg font-semibold">Daftar sellable SKU</h3>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[780px] text-left text-sm">
                <thead><tr className="border-b border-brand-softGray text-xs uppercase tracking-[0.12em] text-brand-charcoal/45"><th className="p-3">Warna</th><th className="p-3">Ukuran</th><th className="p-3">SKU</th><th className="p-3">Stok</th><th className="p-3">Penyesuaian</th><th className="p-3">Status</th><th className="p-3">Aksi</th></tr></thead>
                <tbody>{selected.variants.flatMap((variant) => variant.sellable.map((item) => <tr key={item.id} className="border-b border-brand-softGray/70"><td className="p-3 font-semibold">{variant.name}</td><td className="p-3">{item.sizeName || "—"}</td><td className="p-3 font-mono text-xs">{item.sku || "—"}</td><td className="p-3">{item.stockQuantity}</td><td className="p-3">{formatSignedRupiah(item.priceAdjustment)}</td><td className="p-3"><MiniStatus active={item.status === "active"} /></td><td className="p-3"><button type="button" onClick={() => editSellable(item)} className="rounded-full bg-brand-charcoal px-3 py-2 text-xs font-semibold text-white">{readOnly ? "Lihat" : "Edit"}</button></td></tr>))}</tbody>
              </table>
              {!selected.variants.some((variant) => variant.sellable.length) ? <EmptyState title="Belum ada sellable SKU" detail="Pilih color variant dan size master untuk membuat SKU pertama." /> : null}
            </div>
          </section>

          <VariantMatrixEditor
            product={selected}
            payload={payload}
            readOnly={readOnly}
            canManage={canManageDependencies}
            working={working}
            onSave={(matrix) => runAction({ action: "save_matrix", productId: selected.id, matrix })}
          />

          <section id="gambar" className="scroll-mt-24 bg-white p-5 sm:p-7">
            <SectionHeader index="05" title="Gambar" description="Kelola maksimal empat role per warna. Preview dikunci 4:5; front wajib sebelum Publish. File Media Library tidak dihapus ketika slot dikosongkan." status={selected.workflow.find((step) => step.key === "images")?.status} />
            <label className="mt-6 block max-w-md text-sm font-semibold">Color variant
              <select value={selectedVariantId} onChange={(event) => { const variant = selected.variants.find((item) => item.id === event.target.value); if (variant) selectVariant(variant); }} className="mt-2 min-h-11 w-full border border-brand-softGray bg-white px-4">
                <option value="">Pilih color variant</option>
                {selected.variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.name}</option>)}
              </select>
            </label>
            {selectedVariant ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {PRODUCT_IMAGE_ROLES.map((role) => <VariantImageSlot key={`${selectedVariant.id}-${role}`} role={role} variant={selectedVariant} image={selectedVariant.images.find((item) => item.imageRole === role) || null} mediaAssets={payload?.mediaAssets || []} readOnly={!canManageDependencies} working={working} onSave={(image) => runAction({ action: "save_image", productId: selected.id, image })} onRemove={(imageId) => runAction({ action: "remove_image", productId: selected.id, imageId })} />)}
              </div>
            ) : <EmptyState title="Pilih color variant" detail="Image role dikelola terpisah untuk setiap warna." />}
          </section>

          <section id="review-publish" className="scroll-mt-24 bg-white p-5 sm:p-7">
            <SectionHeader index="06" title="Review & Publish" description="Validation summary dijalankan dari snapshot canonical dan diulang kembali di server saat Publish." status={selected.workflow.find((step) => step.key === "review")?.status} />
            <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_auto]">
              <div className={blockers.length ? "rounded-xl bg-amber-50 p-5" : "rounded-xl bg-green-50 p-5"}>
                <p className="text-sm font-semibold">{blockers.length ? `${blockers.length} blocker Publish` : "Validation PASS — produk siap Publish"}</p>
                {selected.validationIssues.length ? <ul className="mt-3 space-y-2 text-sm leading-6">{selected.validationIssues.map((issue) => <li key={`${issue.field}-${issue.message}`}>• {issue.message}</li>)}</ul> : <p className="mt-2 text-sm text-green-900/70">Nama, slug, kategori, harga, warna, SKU, size master, stok, dan front image memenuhi requirement minimum.</p>}
              </div>
              <div className="flex flex-wrap content-start gap-2 lg:max-w-xs">
                {payload?.capabilities.canPublish && selected.status === "draft" ? <button data-admin-mutation="true" type="button" onClick={() => void runAction({ action: "publish", productId: selected.id })} disabled={working || blockers.length > 0} className="min-h-11 rounded-full bg-brand-green px-5 text-sm font-semibold text-white disabled:opacity-40">Publish</button> : null}
                {payload?.capabilities.canArchive && selected.status === "active" ? <button data-admin-mutation="true" type="button" onClick={() => void runAction({ action: "archive", productId: selected.id })} disabled={working} className="min-h-11 rounded-full border border-amber-300 px-5 text-sm font-semibold text-amber-800 disabled:opacity-45">Archive</button> : null}
                {payload?.capabilities.canCreateDraft ? <button data-admin-mutation="true" type="button" onClick={() => void runAction({ action: "duplicate", productId: selected.id })} disabled={working} className="min-h-11 rounded-full border border-brand-softGray px-5 text-sm font-semibold disabled:opacity-45">Duplikat sebagai Draft</button> : null}
                <button type="button" onClick={() => void refresh(selected.id, selectedVariantId)} disabled={working || loading} className="min-h-11 rounded-full border border-brand-softGray px-5 text-sm font-semibold disabled:opacity-45">Reload data</button>
              </div>
            </div>
          </section>
        </>
      ) : (
        <div className="bg-brand-offWhite p-8 text-center"><p className="font-semibold">Simpan product root terlebih dahulu</p><p className="mt-2 text-sm text-brand-charcoal/55">Setelah Draft tersimpan, color variant, ukuran, SKU, stok, gambar, dan Review akan tersedia pada halaman ini.</p></div>
      )}
    </div>
  );
}

function ProductChooser({ products, selectedId, query, statusFilter, loading, readOnly, canDuplicate, working, onQuery, onStatusFilter, onSelect, onRefresh, onDuplicate }: {
  products: ProductManagerItem[];
  selectedId: string | null;
  query: string;
  statusFilter: "all" | ProductLifecycle;
  loading: boolean;
  readOnly: boolean;
  canDuplicate: boolean;
  working: boolean;
  onQuery: (value: string) => void;
  onStatusFilter: (value: "all" | ProductLifecycle) => void;
  onSelect: (product: ProductManagerItem) => void;
  onRefresh: () => void;
  onDuplicate: (productId: string) => void;
}) {
  return <section className="bg-white p-5 sm:p-7">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-green">Product Truth</p><h2 className="mt-2 text-2xl font-semibold">Pilih produk</h2></div><button type="button" onClick={onRefresh} disabled={loading || working} className="rounded-full border border-brand-softGray px-4 py-2 text-xs font-semibold disabled:opacity-50">Refresh</button></div>
    <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_180px]"><input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Cari produk, slug, kategori, atau SKU..." className="min-h-11 rounded-lg border border-brand-softGray px-4 text-sm" /><select value={statusFilter} onChange={(event) => onStatusFilter(event.target.value as "all" | ProductLifecycle)} className="min-h-11 rounded-lg border border-brand-softGray bg-white px-4 text-sm"><option value="all">Semua status</option><option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option></select></div>
    <div className="mt-5 grid gap-3 lg:grid-cols-2">{loading ? [1, 2].map((item) => <div key={item} className="h-36 animate-pulse bg-brand-offWhite" />) : products.length ? products.map((product) => <article key={product.id} className={`border p-4 ${selectedId === product.id ? "border-brand-green ring-1 ring-brand-green" : "border-brand-softGray"}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap gap-2"><StatusBadge status={product.status} /><span className={product.validationIssues.some((issue) => issue.severity === "error") ? "rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800" : "rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-800"}>{product.validationIssues.filter((issue) => issue.severity === "error").length || "PASS"}</span></div><h3 className="mt-3 truncate text-lg font-semibold">{product.name}</h3><p className="mt-1 text-xs text-brand-charcoal/45">/{product.slug}</p><p className="mt-2 text-xs text-brand-charcoal/55">{product.variantCount} warna · {product.sellableCount} SKU · {product.imageCount} gambar</p></div><div className="flex shrink-0 flex-col gap-2"><button type="button" onClick={() => onSelect(product)} className="rounded-full bg-brand-charcoal px-4 py-2 text-xs font-semibold text-white">{readOnly ? "Lihat" : "Kelola"}</button>{canDuplicate ? <button data-admin-mutation="true" type="button" onClick={() => onDuplicate(product.id)} disabled={working} className="rounded-full border border-brand-softGray px-3 py-2 text-xs font-semibold disabled:opacity-45">Duplikat</button> : null}</div></div></article>) : <div className="bg-brand-offWhite p-8 text-center lg:col-span-2"><p className="font-semibold">Tidak ada produk</p><p className="mt-2 text-sm text-brand-charcoal/55">Ubah filter atau buat Draft produk baru.</p></div>}</div>
  </section>;
}

function WorkflowProgress({ product }: { product: ProductManagerItem }) {
  return <section className="bg-white p-5 sm:p-7"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-green">Progress produk</p><h2 className="mt-2 text-xl font-semibold">{product.name}</h2></div><StatusBadge status={product.status} /></div><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">{product.workflow.map((step, index) => <a key={step.key} href={`#${step.key === "product" ? "informasi-produk" : step.key === "colors" ? "warna" : step.key === "sizes" ? "ukuran-sku" : step.key === "pricing" ? "harga-stok" : step.key === "images" ? "gambar" : "review-publish"}`} className="border border-brand-softGray p-3 transition hover:border-brand-green"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-charcoal/40">{String(index + 1).padStart(2, "0")}</p><p className="mt-2 text-sm font-semibold">{step.label}</p><span className={`mt-2 inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${workflowClass(step.status)}`}>{workflowStatusLabel(step.status)}</span><p className="mt-2 text-[11px] leading-4 text-brand-charcoal/55">{step.detail}</p></a>)}</div></section>;
}

function VariantCard({ variant, selected, readOnly, onSelect }: { variant: ProductManagerVariant; selected: boolean; readOnly: boolean; onSelect: () => void }) {
  const roleCount = new Set(variant.images.map((image) => image.imageRole)).size;
  const front = variant.images.find((image) => image.imageRole === "front");
  const activeSellable = variant.sellable.filter((item) => item.status === "active");
  return <article className={`border p-4 ${selected ? "border-brand-green ring-1 ring-brand-green" : "border-brand-softGray"}`}><div className="flex gap-4"><div className="aspect-[4/5] w-20 shrink-0 overflow-hidden bg-brand-offWhite">{front?.imageUrl ? <img src={front.imageUrl} alt={front.altText || variant.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-xs font-semibold text-brand-charcoal/30">No front</div>}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: variant.hexCode }} /><h3 className="font-semibold">{variant.name}</h3><MiniStatus active={variant.status === "active"} /></div><p className="mt-1 text-xs text-brand-charcoal/45">/{variant.slug}</p><p className="mt-3 text-xs text-brand-charcoal/55">{activeSellable.length} SKU aktif · {roleCount}/4 image role · {formatSignedRupiah(variant.priceAdjustment)}</p><button type="button" onClick={onSelect} className="mt-3 rounded-full bg-brand-charcoal px-4 py-2 text-xs font-semibold text-white">{readOnly ? "Lihat detail" : "Edit & lanjutkan"}</button></div></div></article>;
}

function VariantImageSlot({ role, variant, image, mediaAssets, readOnly, working, onSave, onRemove }: {
  role: ProductImageRole;
  variant: ProductManagerVariant;
  image: ProductManagerVariantImage | null;
  mediaAssets: ProductManagerMediaAsset[];
  readOnly: boolean;
  working: boolean;
  onSave: (input: VariantImageInput) => Promise<void>;
  onRemove: (imageId: string) => Promise<void>;
}) {
  const slot = PRODUCT_IMAGE_SLOTS.find((item) => item.key === role)!;
  const [url, setUrl] = useState(image?.imageUrl || "");
  const [altText, setAltText] = useState(image?.altText || `${variant.name} ${slot.shortLabel}`);

  useEffect(() => {
    setUrl(image?.imageUrl || "");
    setAltText(image?.altText || `${variant.name} ${slot.shortLabel}`);
  }, [image?.id, image?.imageUrl, image?.altText, slot.shortLabel, variant.name]);

  return <article className="border border-brand-softGray bg-brand-offWhite p-3"><div className="flex items-start justify-between gap-2"><div><p className="text-sm font-semibold">{slot.label}</p><p className="mt-1 text-xs leading-4 text-brand-charcoal/50">{slot.description}</p></div>{role === "front" ? <span className="rounded-full bg-brand-green px-2 py-1 text-[10px] font-semibold text-white">WAJIB</span> : null}</div><div className="mt-3 aspect-[4/5] overflow-hidden bg-white">{url ? <img src={url} alt={altText || slot.label} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center p-4 text-center text-xs font-semibold text-brand-charcoal/35">Belum ada gambar</div>}</div><div className="mt-3 grid gap-2"><select value={mediaAssets.some((asset) => asset.publicUrl === url) ? url : ""} onChange={(event) => { const asset = mediaAssets.find((item) => item.publicUrl === event.target.value); setUrl(asset?.publicUrl || ""); setAltText(asset?.altText || `${variant.name} ${slot.shortLabel}`); }} disabled={readOnly || working} className="min-h-10 border border-brand-softGray bg-white px-3 text-xs"><option value="">Pilih dari Media Library</option>{mediaAssets.map((asset) => <option key={asset.id} value={asset.publicUrl}>{asset.name}</option>)}</select><input value={url} onChange={(event) => setUrl(event.target.value)} disabled={readOnly || working} placeholder="Atau tempel URL gambar publik" className="min-h-10 border border-brand-softGray bg-white px-3 text-xs" /><input value={altText} onChange={(event) => setAltText(event.target.value)} disabled={readOnly || working} placeholder="Alt text" className="min-h-10 border border-brand-softGray bg-white px-3 text-xs" />{!readOnly ? <div className="grid gap-2"><button data-admin-mutation="true" type="button" disabled={working || !url.trim()} onClick={() => void onSave({ id: image?.id || null, variantId: variant.id, imageRole: role, imageUrl: url, altText, objectFit: image?.objectFit || "cover", objectPosition: image?.objectPosition || "center center" })} className="min-h-10 bg-brand-charcoal px-3 text-xs font-semibold text-white disabled:opacity-45">Simpan slot</button>{image ? <button data-admin-mutation="true" type="button" disabled={working} onClick={() => void onRemove(image.id)} className="min-h-9 text-xs font-semibold text-red-700 disabled:opacity-45">Kosongkan slot</button> : null}</div> : null}</div></article>;
}

function SectionHeader({ index, title, description, status }: { index: string; title: string; description: string; status?: "incomplete" | "needs_attention" | "complete" | "ready" }) {
  return <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-green">{index}</p><h2 className="mt-2 text-2xl font-semibold">{title}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-brand-charcoal/60">{description}</p></div>{status ? <span className={`self-start rounded-full px-3 py-2 text-xs font-semibold ${workflowClass(status)}`}>{workflowStatusLabel(status)}</span> : null}</div>;
}

function StatusBadge({ status }: { status: ProductLifecycle }) {
  const className = status === "active" ? "bg-green-50 text-green-800" : status === "archived" ? "bg-gray-200 text-gray-700" : "bg-blue-50 text-blue-800";
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}>{lifecycleLabel(status)}</span>;
}

function MiniStatus({ active }: { active: boolean }) {
  return <span className={active ? "rounded-full bg-green-50 px-2 py-1 text-[10px] font-semibold text-green-800" : "rounded-full bg-gray-100 px-2 py-1 text-[10px] font-semibold text-gray-600"}>{active ? "Active" : "Inactive"}</span>;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="block text-sm font-semibold">{label}{required ? " *" : ""}<span className="mt-2 block [&>input]:min-h-11 [&>input]:w-full [&>input]:rounded-lg [&>input]:border [&>input]:border-brand-softGray [&>input]:px-4 [&>input]:font-normal [&>select]:min-h-11 [&>select]:w-full [&>select]:rounded-lg [&>select]:border [&>select]:border-brand-softGray [&>select]:bg-white [&>select]:px-4 [&>select]:font-normal [&>textarea]:w-full [&>textarea]:rounded-lg [&>textarea]:border [&>textarea]:border-brand-softGray [&>textarea]:px-4 [&>textarea]:py-3 [&>textarea]:font-normal">{children}</span></label>;
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="bg-brand-offWhite p-6 text-center"><p className="font-semibold">{title}</p><p className="mt-2 text-sm text-brand-charcoal/55">{detail}</p></div>;
}

function rootFromProduct(product: ProductManagerItem): ProductRootInput {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    productCategoryId: product.productCategoryId || "",
    productSubcategoryId: product.productSubcategoryId,
    basePrice: product.basePrice,
    description: product.description || "",
    sku: product.sku,
    productType: product.productType,
    pricingMode: product.pricingMode,
    minimumOrderQty: product.minimumOrderQty,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription
  };
}

function variantInput(variant: ProductManagerVariant): ProductVariantInput {
  return {
    id: variant.id,
    productId: variant.productId,
    colorMasterId: null,
    name: variant.name,
    slug: variant.slug,
    hexCode: variant.hexCode,
    sku: variant.sku,
    priceAdjustment: variant.priceAdjustment,
    status: variant.status,
    sortOrder: variant.sortOrder
  };
}

function workflowClass(status: "incomplete" | "needs_attention" | "complete" | "ready") {
  if (status === "ready") return "bg-brand-green text-white";
  if (status === "complete") return "bg-green-50 text-green-800";
  if (status === "needs_attention") return "bg-amber-50 text-amber-800";
  return "bg-gray-100 text-gray-600";
}

function formatSignedRupiah(value: number) {
  if (!value) return "Rp0";
  return `${value > 0 ? "+" : "−"}${formatRupiah(Math.abs(value))}`;
}

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
