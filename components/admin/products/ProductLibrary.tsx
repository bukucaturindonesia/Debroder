/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";
import { loadProductLibrary } from "@/lib/admin-product-library-api";
import {
  parseProductLibraryQuery,
  type ProductLibraryPayload,
  type ProductLibraryQuery,
  type ProductLibrarySort,
  type ProductLibraryStatus
} from "@/lib/product-library";
import { lifecycleLabel } from "@/lib/product-manager";
import { productWorkspacePath } from "@/lib/product-workspace";
import { formatRupiah } from "@/lib/url";

export function ProductLibrary() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const serializedSearchParams = searchParams.toString();
  const query = useMemo(
    () => parseProductLibraryQuery(new URLSearchParams(serializedSearchParams)),
    [serializedSearchParams]
  );
  const [searchText, setSearchText] = useState(query.q);
  const [payload, setPayload] = useState<ProductLibraryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const updateQuery = useCallback((next: Partial<ProductLibraryQuery>) => {
    const merged = { ...query, ...next };
    const params = new URLSearchParams();
    if (merged.q) params.set("q", merged.q);
    if (merged.status !== "all") params.set("status", merged.status);
    if (merged.categoryId) params.set("categoryId", merged.categoryId);
    if (merged.sort !== "updated_desc") params.set("sort", merged.sort);
    if (merged.page > 1) params.set("page", String(merged.page));
    if (merged.pageSize !== 24) params.set("pageSize", String(merged.pageSize));
    const serialized = params.toString();
    router.replace(serialized ? `${pathname}?${serialized}` : pathname, { scroll: false });
  }, [pathname, query, router]);

  useEffect(() => setSearchText(query.q), [query.q]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void loadProductLibrary(query, controller.signal)
      .then(setPayload)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "Product Library belum dapat dimuat.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [query]);

  useEffect(() => {
    if (searchText === query.q) return;
    const timer = window.setTimeout(() => {
      updateQuery({ q: searchText, page: 1 });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchText, query.q, updateQuery]);

  const readOnly = payload?.role === "admin_guest";
  const canCreateDraft = Boolean(payload?.capabilities.canCreateDraft);
  const items = payload?.items || [];
  const pagination = payload?.pagination;

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        eyebrow="KATALOG PRODUK"
        title="Product Library"
        description="Cari, filter, urutkan, dan buka produk tanpa memuat seluruh varian, SKU, stok, gambar, dan media katalog sekaligus."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/products/audit-history" className={secondaryAction}>Riwayat Aktivitas</Link>
            <Link href="/admin/products/export-reconciliation" className={secondaryAction}>Ekspor &amp; Pemeriksaan Data</Link>
            <Link href="/admin/products/bulk-edit" className={secondaryAction}>Edit Massal</Link>
            <Link href="/admin/products/bulk-import" className={secondaryAction}>Impor Produk Massal</Link>
            {canCreateDraft ? (
              <Link href="/admin/products/legacy?new=1#informasi-produk" className={primaryAction}>
                Produk Draft Baru
              </Link>
            ) : null}
          </div>
        }
      />

      {readOnly ? (
        <div role="status" className="border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-900">
          MODE LIHAT SAJA — Product Library dapat dibuka, tetapi perubahan produk tetap dinonaktifkan.
        </div>
      ) : null}

      <section className="border border-brand-softGray bg-white p-5 sm:p-7">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px_220px_190px]">
          <label className="text-sm font-semibold">
            Cari produk
            <input
              value={searchText}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setSearchText(event.target.value)}
              placeholder="Nama, slug, atau SKU induk"
              className={controlClass}
            />
          </label>
          <label className="text-sm font-semibold">
            Status
            <select
              value={query.status}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => updateQuery({ status: event.target.value as ProductLibraryStatus, page: 1 })}
              className={controlClass}
            >
              <option value="all">Semua status</option>
              <option value="draft">Draft</option>
              <option value="active">Aktif</option>
              <option value="archived">Diarsipkan</option>
            </select>
          </label>
          <label className="text-sm font-semibold">
            Kategori
            <select
              value={query.categoryId}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => updateQuery({ categoryId: event.target.value, page: 1 })}
              className={controlClass}
            >
              <option value="">Semua kategori</option>
              {(payload?.categories || []).map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold">
            Urutkan
            <select
              value={query.sort}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => updateQuery({ sort: event.target.value as ProductLibrarySort, page: 1 })}
              className={controlClass}
            >
              <option value="updated_desc">Terakhir diperbarui</option>
              <option value="updated_asc">Paling lama diperbarui</option>
              <option value="name_asc">Nama A–Z</option>
              <option value="name_desc">Nama Z–A</option>
              <option value="price_asc">Harga terendah</option>
              <option value="price_desc">Harga tertinggi</option>
            </select>
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-brand-softGray pt-5 text-sm">
          <p className="font-semibold">
            {loading ? "Memuat produk…" : `${pagination?.total || 0} produk ditemukan`}
          </p>
          <button
            type="button"
            onClick={() => updateQuery({ q: "", status: "all", categoryId: "", sort: "updated_desc", page: 1 })}
            className="rounded-full border border-brand-softGray px-4 py-2 text-xs font-semibold"
          >
            Reset filter
          </button>
        </div>
      </section>

      {error ? (
        <section role="alert" className="border border-red-200 bg-red-50 p-6 text-sm text-red-900">
          <p className="font-semibold">Product Library belum dapat dimuat.</p>
          <p className="mt-2">{error}</p>
        </section>
      ) : null}

      <section className="border border-brand-softGray bg-white p-5 sm:p-7">
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="h-48 animate-pulse bg-brand-offWhite" />)}
          </div>
        ) : items.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((product) => (
              <article key={product.id} className="border border-brand-softGray p-4">
                <div className="flex gap-4">
                  <div className="aspect-[4/5] w-24 shrink-0 overflow-hidden bg-brand-offWhite">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full place-items-center p-3 text-center text-xs font-semibold text-brand-charcoal/35">
                        Belum ada gambar
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <StatusBadge status={product.status} />
                    <h2 className="mt-3 truncate text-lg font-semibold">{product.name}</h2>
                    <p className="mt-1 truncate text-xs text-brand-charcoal/45">/{product.slug}</p>
                    <p className="mt-3 text-sm font-semibold">{formatRupiah(product.basePrice)}</p>
                    <p className="mt-1 text-xs text-brand-charcoal/55">{product.categoryName || "Tanpa kategori"}</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 bg-brand-offWhite p-3 text-center text-xs">
                  <Summary label="Warna" value={product.variantCount} />
                  <Summary label="SKU" value={product.sellableCount} />
                  <Summary label="Gambar" value={product.imageCount} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={productWorkspacePath(product.id)}
                    className={primaryAction}
                  >
                    {readOnly ? "Lihat Workspace" : "Buka Workspace"}
                  </Link>
                  <Link
                    href={`/admin/products/legacy?productId=${encodeURIComponent(product.id)}`}
                    className={secondaryAction}
                  >
                    {readOnly ? "Lihat Editor Lama" : "Editor Lama"}
                  </Link>
                  <Link
                    href={`/admin/products/audit-history?productId=${encodeURIComponent(product.id)}`}
                    className={secondaryAction}
                  >
                    Riwayat
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="bg-brand-offWhite p-10 text-center">
            <p className="font-semibold">Tidak ada produk yang cocok</p>
            <p className="mt-2 text-sm text-brand-charcoal/55">Ubah pencarian atau filter untuk melihat produk lain.</p>
          </div>
        )}
      </section>

      {pagination && pagination.totalPages > 1 ? (
        <nav aria-label="Pagination Product Library" className="flex flex-wrap items-center justify-between gap-3 border border-brand-softGray bg-white p-5">
          <button
            type="button"
            disabled={pagination.page <= 1}
            onClick={() => updateQuery({ page: pagination.page - 1 })}
            className={pageButton}
          >
            Sebelumnya
          </button>
          <p className="text-sm font-semibold">Halaman {pagination.page} dari {pagination.totalPages}</p>
          <button
            type="button"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => updateQuery({ page: pagination.page + 1 })}
            className={pageButton}
          >
            Berikutnya
          </button>
        </nav>
      ) : null}
    </div>
  );
}

function StatusBadge({ status }: { status: "draft" | "active" | "archived" }) {
  const className = status === "active"
    ? "bg-green-50 text-green-800"
    : status === "archived"
      ? "bg-gray-200 text-gray-700"
      : "bg-blue-50 text-blue-800";
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${className}`}>{lifecycleLabel(status)}</span>;
}

function Summary({ label, value }: { label: string; value: number }) {
  return <div><p className="font-semibold">{value}</p><p className="mt-1 text-brand-charcoal/50">{label}</p></div>;
}

const controlClass = "mt-2 min-h-11 w-full rounded-lg border border-brand-softGray bg-white px-4 font-normal";
const primaryAction = "inline-flex min-h-10 items-center justify-center rounded-full bg-brand-charcoal px-4 text-xs font-semibold text-white";
const secondaryAction = "inline-flex min-h-10 items-center justify-center rounded-full border border-brand-softGray bg-white px-4 text-xs font-semibold text-brand-charcoal";
const pageButton = "min-h-10 rounded-full border border-brand-softGray px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40";
