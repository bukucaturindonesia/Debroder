"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useState,
  type FormEvent,
  type ReactNode
} from "react";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";
import { loadProductLibrary } from "@/lib/admin-product-library-api";
import { runProductManagerAction } from "@/lib/admin-product-api";
import type { ProductLibraryCategory } from "@/lib/product-library";
import type { ProductRootInput } from "@/lib/product-manager";
import { productWorkspacePath } from "@/lib/product-workspace";

const emptyDraft: ProductRootInput = {
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

export function ProductDraftCreatePanel() {
  const router = useRouter();
  const [form, setForm] = useState<ProductRootInput>({ ...emptyDraft });
  const [categories, setCategories] = useState<ProductLibraryCategory[]>([]);
  const [canCreateDraft, setCanCreateDraft] = useState(false);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setNotice("");
    void loadProductLibrary({
      q: "",
      status: "all",
      categoryId: "",
      sort: "updated_desc",
      page: 1,
      pageSize: 1
    }, controller.signal)
      .then((payload) => {
        setCategories(payload.categories);
        setCanCreateDraft(payload.capabilities.canCreateDraft);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setNotice(reason instanceof Error
            ? reason.message
            : "Data pembuatan Draft belum dapat dimuat.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (working || !canCreateDraft) return;
    setWorking(true);
    setNotice("");
    try {
      const result = await runProductManagerAction({
        action: "save_draft",
        expectedUpdatedAt: null,
        product: form
      });
      if (!result.productId) {
        throw new Error("ID Draft baru tidak tersedia.");
      }
      router.replace(productWorkspacePath(result.productId));
    } catch (reason) {
      setNotice(reason instanceof Error
        ? reason.message
        : "Draft produk belum berhasil dibuat.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        eyebrow="KATALOG PRODUK"
        title="Produk Draft Baru"
        description="Buat data dasar sebagai Draft. Setelah tersimpan, lanjutkan Informasi, Varian, Harga & Stok, Media, serta Review & Publish melalui Product Workspace."
        actions={
          <Link
            href="/admin/products"
            className="inline-flex min-h-11 items-center rounded-full border border-brand-softGray bg-white px-5 text-sm font-semibold"
          >
            Kembali ke Product Library
          </Link>
        }
      />

      {notice ? (
        <div role="status" className="border border-brand-softGray bg-white px-5 py-4 text-sm font-medium">
          {notice}
        </div>
      ) : null}

      {loading ? (
        <section aria-busy="true" className="h-80 animate-pulse border border-brand-softGray bg-white" />
      ) : !canCreateDraft ? (
        <section role="status" className="border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950">
          <p className="font-semibold">Mode lihat saja</p>
          <p className="mt-2 leading-6">Role ini tidak memiliki capability membuat Draft produk.</p>
        </section>
      ) : (
        <form onSubmit={submit} className="grid gap-5 border border-brand-softGray bg-white p-5 sm:p-7 lg:grid-cols-2">
          <Field label="Nama produk" required>
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({
                ...current,
                name: event.target.value,
                slug: current.slug || slugify(event.target.value)
              }))}
              disabled={working}
            />
          </Field>

          <Field label="Slug" required>
            <input
              value={form.slug}
              onChange={(event) => setForm((current) => ({
                ...current,
                slug: slugify(event.target.value)
              }))}
              disabled={working}
              placeholder="7200-premium"
            />
          </Field>

          <Field label="Kategori" required>
            <select
              value={form.productCategoryId}
              onChange={(event) => setForm((current) => ({
                ...current,
                productCategoryId: event.target.value,
                productSubcategoryId: null
              }))}
              disabled={working}
            >
              <option value="">Pilih kategori</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Harga dasar" required>
            <input
              type="number"
              min={0}
              step={1}
              value={form.basePrice}
              onChange={(event) => setForm((current) => ({
                ...current,
                basePrice: Number(event.target.value)
              }))}
              disabled={working}
            />
          </Field>

          <Field label="SKU induk">
            <input
              value={form.sku || ""}
              onChange={(event) => setForm((current) => ({
                ...current,
                sku: event.target.value || null
              }))}
              disabled={working}
              placeholder="Opsional"
            />
          </Field>

          <Field label="Jumlah minimum pesanan">
            <input
              type="number"
              min={1}
              step={1}
              value={form.minimumOrderQty || 1}
              onChange={(event) => setForm((current) => ({
                ...current,
                minimumOrderQty: Number(event.target.value)
              }))}
              disabled={working}
            />
          </Field>

          <Field label="Deskripsi">
            <textarea
              rows={5}
              value={form.description || ""}
              onChange={(event) => setForm((current) => ({
                ...current,
                description: event.target.value
              }))}
              disabled={working}
            />
          </Field>

          <div className="grid gap-5">
            <Field label="SEO title">
              <input
                value={form.seoTitle || ""}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  seoTitle: event.target.value || null
                }))}
                disabled={working}
              />
            </Field>
            <Field label="SEO description">
              <textarea
                rows={3}
                value={form.seoDescription || ""}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  seoDescription: event.target.value || null
                }))}
                disabled={working}
              />
            </Field>
          </div>

          <div className="lg:col-span-2">
            <button
              data-admin-mutation="true"
              disabled={working}
              className="min-h-12 rounded-full bg-brand-green px-6 text-sm font-semibold text-white disabled:opacity-45"
            >
              {working ? "Membuat Draft..." : "Simpan sebagai Draft"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function Field({
  label,
  required = false,
  children
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="text-sm font-semibold">
      {label}{required ? " *" : ""}
      <span className="mt-2 block [&_input]:min-h-11 [&_input]:w-full [&_input]:border [&_input]:border-brand-softGray [&_input]:px-4 [&_select]:min-h-11 [&_select]:w-full [&_select]:border [&_select]:border-brand-softGray [&_select]:bg-white [&_select]:px-4 [&_textarea]:w-full [&_textarea]:border [&_textarea]:border-brand-softGray [&_textarea]:px-4 [&_textarea]:py-3">
        {children}
      </span>
    </label>
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
