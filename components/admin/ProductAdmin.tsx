"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";
import {
  loadProductManager,
  runProductManagerAction,
  type ProductManagerItem,
  type ProductManagerPayload
} from "@/lib/admin-product-api";
import {
  lifecycleLabel,
  type ProductLifecycle,
  type ProductRootInput
} from "@/lib/product-manager";
import { formatRupiah } from "@/lib/url";

const emptyForm: ProductRootInput = {
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
  minimumOrderQty: 1
};

export function ProductAdminPanel() {
  const [payload, setPayload] = useState<ProductManagerPayload | null>(null);
  const [form, setForm] = useState<ProductRootInput>({ ...emptyForm });
  const [selected, setSelected] = useState<ProductManagerItem | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ProductLifecycle>("all");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState("");

  async function refresh(preferredId?: string) {
    setLoading(true);
    try {
      const next = await loadProductManager();
      setPayload(next);
      const nextSelected = preferredId
        ? next.products.find((product) => product.id === preferredId) || null
        : selected
          ? next.products.find((product) => product.id === selected.id) || null
          : null;
      setSelected(nextSelected);
      if (nextSelected) applyProduct(nextSelected);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Product Manager gagal dimuat.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  const visibleProducts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (payload?.products || []).filter((product) => {
      const matchesText = !needle || `${product.name} ${product.slug} ${product.categoryName} ${product.sku || ""}`.toLowerCase().includes(needle);
      const matchesStatus = statusFilter === "all" || product.status === statusFilter;
      return matchesText && matchesStatus;
    });
  }, [payload, query, statusFilter]);

  function applyProduct(product: ProductManagerItem) {
    setSelected(product);
    setForm({
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
      minimumOrderQty: product.minimumOrderQty
    });
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function newDraft() {
    setSelected(null);
    setForm({ ...emptyForm });
    setNotice("Produk baru akan disimpan sebagai Draft.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function update<K extends keyof ProductRootInput>(key: K, value: ProductRootInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    await runAction("save_draft", { product: form });
  }

  async function runAction(
    action: "save_draft" | "duplicate" | "validate_publish" | "publish" | "archive",
    extras: { product?: ProductRootInput; productId?: string } = {}
  ) {
    if (working) return;
    setWorking(true);
    setNotice("");
    try {
      const result = await runProductManagerAction({ action, ...extras });
      if (result.issues?.length) {
        setNotice(result.issues.map((issue) => issue.message).join(" • "));
      } else {
        setNotice(result.message || "Operasi Product Manager berhasil.");
      }
      await refresh(result.productId || extras.productId);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Operasi Product Manager gagal.");
      await refresh(extras.productId);
    } finally {
      setWorking(false);
    }
  }

  const currentStatus = selected?.status || "draft";
  const canEditCurrent = Boolean(payload?.capabilities.canEditDraft) && (!selected || currentStatus === "draft" || Boolean(payload?.capabilities.canEditPublished));
  const readOnly = payload?.role === "admin_guest";

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        eyebrow="PIM PHASE 1"
        title="Product Manager"
        description="Satu jalur canonical untuk product root, Draft, Publish, dan Archive. Warna, sellable SKU, stok, dan gambar tetap dikelola sebagai dependency terpisah."
        actions={
          <div className="flex flex-wrap gap-2">
            {payload?.capabilities.canCreateDraft ? (
              <button data-admin-mutation="true" type="button" onClick={newDraft} className="rounded-full bg-brand-charcoal px-5 py-3 text-sm font-semibold text-white">
                Produk Draft Baru
              </button>
            ) : null}
            {payload?.capabilities.canManageDependencies ? (
              <Link href="/admin/pim-v2" className="rounded-full border border-brand-softGray bg-white px-5 py-3 text-sm font-semibold">
                Kelola Varian & SKU
              </Link>
            ) : null}
          </div>
        }
      />

      {readOnly ? (
        <div role="status" className="border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-900">
          MODE LIHAT SAJA — data product root, variant, SKU, stok, dan status hanya dapat dibaca.
        </div>
      ) : null}
      {notice ? <div role="status" className="border border-brand-softGray bg-white px-5 py-4 text-sm font-medium">{notice}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[0.86fr_1.14fr]">
        <form onSubmit={save} className="self-start bg-white p-5 sm:p-7 xl:sticky xl:top-24">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-green">Product Root / Family</p>
              <h2 className="mt-2 text-2xl font-semibold">{selected ? "Edit produk" : "Buat Draft produk"}</h2>
            </div>
            <StatusBadge status={currentStatus} />
          </div>

          <div className="mt-6 grid gap-4">
            <Field label="Nama produk" required><input value={form.name} onChange={(event) => update("name", event.target.value)} disabled={!canEditCurrent || working} /></Field>
            <Field label="Slug" required><input value={form.slug} onChange={(event) => update("slug", slugify(event.target.value))} disabled={!canEditCurrent || working} placeholder="kaos-cotton-combed-24s" /></Field>
            <Field label="Kategori" required>
              <select value={form.productCategoryId} onChange={(event) => update("productCategoryId", event.target.value)} disabled={!canEditCurrent || working}>
                <option value="">Pilih kategori</option>
                {(payload?.categories || []).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Harga dasar" required><input type="number" min={0} step={1} value={form.basePrice} onChange={(event) => update("basePrice", Number(event.target.value))} disabled={!canEditCurrent || working} /></Field>
              <Field label="SKU induk"><input value={form.sku || ""} onChange={(event) => update("sku", event.target.value || null)} disabled={!canEditCurrent || working} placeholder="Opsional" /></Field>
              <Field label="Product type">
                <select value={form.productType || "standard_product"} onChange={(event) => update("productType", event.target.value)} disabled={!canEditCurrent || working}>
                  <option value="standard_product">Standard product</option>
                  <option value="configurable_product">Configurable product</option>
                  <option value="production_service">Production service</option>
                </select>
              </Field>
              <Field label="Pricing mode">
                <select value={form.pricingMode || "fixed_price"} onChange={(event) => update("pricingMode", event.target.value)} disabled={!canEditCurrent || working}>
                  <option value="fixed_price">Fixed price</option>
                  <option value="variant_based">Variant based</option>
                  <option value="configurator_based">Configurator based</option>
                  <option value="custom_quote">Custom quote</option>
                </select>
              </Field>
              <Field label="Minimum order"><input type="number" min={1} step={1} value={form.minimumOrderQty || 1} onChange={(event) => update("minimumOrderQty", Number(event.target.value))} disabled={!canEditCurrent || working} /></Field>
            </div>
            <Field label="Deskripsi"><textarea rows={5} value={form.description || ""} onChange={(event) => update("description", event.target.value)} disabled={!canEditCurrent || working} /></Field>

            {selected?.imageUrl ? (
              <div className="rounded-xl bg-brand-offWhite p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-charcoal/45">Galeri root legacy — read-only compatibility</p>
                <div className="mt-3 flex items-center gap-3"><img src={selected.imageUrl} alt={selected.name} className="aspect-[4/5] w-20 object-cover" /><p className="text-xs leading-5 text-brand-charcoal/60">Gambar canonical baru wajib melekat pada color variant melalui front, back, detail, dan lifestyle.</p></div>
              </div>
            ) : null}

            {canEditCurrent ? (
              <button data-admin-mutation="true" disabled={working} className="min-h-12 rounded-full bg-brand-green px-6 text-sm font-semibold text-white disabled:opacity-45">
                {working ? "Memproses..." : selected ? "Simpan perubahan" : "Simpan sebagai Draft"}
              </button>
            ) : null}
          </div>
        </form>

        <section className="bg-white p-5 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-green">Product Truth</p><h2 className="mt-2 text-2xl font-semibold">Daftar produk</h2></div>
            <button type="button" onClick={() => void refresh()} disabled={loading || working} className="rounded-full border border-brand-softGray px-4 py-2 text-xs font-semibold disabled:opacity-50">Refresh</button>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_180px]">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari produk, slug, kategori, atau SKU..." className="min-h-11 rounded-lg border border-brand-softGray px-4 text-sm" />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="min-h-11 rounded-lg border border-brand-softGray bg-white px-4 text-sm"><option value="all">Semua status</option><option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option></select>
          </div>

          <div className="mt-5 grid gap-4">
            {loading ? [1, 2, 3].map((item) => <div key={item} className="h-36 animate-pulse bg-brand-offWhite" />) : visibleProducts.length ? visibleProducts.map((product) => (
              <article key={product.id} className="border border-brand-softGray p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><StatusBadge status={product.status} />{product.validationIssues.length ? <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">{product.validationIssues.length} blocker Publish</span> : <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-800">Publish validation PASS</span>}</div>
                    <h3 className="mt-3 text-lg font-semibold">{product.name}</h3>
                    <p className="mt-1 text-xs text-brand-charcoal/45">/{product.slug}</p>
                    <p className="mt-3 text-sm text-brand-charcoal/65">{product.categoryName || "Kategori belum dipilih"} · {formatRupiah(product.basePrice) || "Rp0"}</p>
                    <p className="mt-2 text-xs text-brand-charcoal/50">{product.variantCount} warna · {product.sellableCount} sellable SKU · {product.imageCount} gambar variant</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button type="button" onClick={() => applyProduct(product)} className="rounded-full bg-brand-charcoal px-4 py-2 text-xs font-semibold text-white">{readOnly ? "Lihat" : "Edit"}</button>
                    {payload?.capabilities.canCreateDraft ? <button data-admin-mutation="true" type="button" onClick={() => void runAction("duplicate", { productId: product.id })} disabled={working} className="rounded-full border border-brand-softGray px-4 py-2 text-xs font-semibold disabled:opacity-45">Duplikat Draft</button> : null}
                    {payload?.capabilities.canPublish && product.status === "draft" ? <button data-admin-mutation="true" type="button" onClick={() => void runAction("publish", { productId: product.id })} disabled={working || product.validationIssues.length > 0} className="rounded-full bg-brand-green px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">Publish</button> : null}
                    {payload?.capabilities.canArchive && product.status === "active" ? <button data-admin-mutation="true" type="button" onClick={() => void runAction("archive", { productId: product.id })} disabled={working} className="rounded-full border border-amber-300 px-4 py-2 text-xs font-semibold text-amber-800 disabled:opacity-45">Archive</button> : null}
                  </div>
                </div>
                {product.validationIssues.length ? <div className="mt-4 rounded-xl bg-amber-50 p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-900">Validation summary</p><ul className="mt-2 space-y-1 text-xs leading-5 text-amber-900/80">{product.validationIssues.map((issue) => <li key={`${issue.field}-${issue.message}`}>• {issue.message}</li>)}</ul></div> : null}
              </article>
            )) : <div className="bg-brand-offWhite p-8 text-center"><p className="font-semibold">Tidak ada produk</p><p className="mt-2 text-sm text-brand-charcoal/55">Ubah filter atau buat Draft produk baru.</p></div>}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ProductLifecycle }) {
  const className = status === "active" ? "bg-green-50 text-green-800" : status === "archived" ? "bg-gray-200 text-gray-700" : "bg-blue-50 text-blue-800";
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}>{lifecycleLabel(status)}</span>;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="block text-sm font-semibold">{label}{required ? " *" : ""}<span className="mt-2 block [&>input]:min-h-11 [&>input]:w-full [&>input]:rounded-lg [&>input]:border [&>input]:border-brand-softGray [&>input]:px-4 [&>input]:font-normal [&>select]:min-h-11 [&>select]:w-full [&>select]:rounded-lg [&>select]:border [&>select]:border-brand-softGray [&>select]:bg-white [&>select]:px-4 [&>select]:font-normal [&>textarea]:w-full [&>textarea]:rounded-lg [&>textarea]:border [&>textarea]:border-brand-softGray [&>textarea]:px-4 [&>textarea]:py-3 [&>textarea]:font-normal">{children}</span></label>;
}

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
