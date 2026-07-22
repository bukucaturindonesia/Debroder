"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import {
  loadProductWorkspace,
  ProductWorkspaceRequestError
} from "@/lib/admin-product-workspace-api";
import {
  isValidProductWorkspaceId,
  PRODUCT_WORKSPACE_MODULES,
  productWorkspaceModuleFromPath,
  productWorkspacePath,
  type ProductWorkspacePayload,
  type ProductWorkspaceProduct
} from "@/lib/product-workspace";
import { lifecycleLabel } from "@/lib/product-manager";
import { formatRupiah } from "@/lib/url";

type ProductWorkspaceContextValue = ProductWorkspacePayload & {
  reloadWorkspace: () => void;
  updateWorkspaceProduct: (product: ProductWorkspaceProduct) => void;
};

const ProductWorkspaceContext = createContext<ProductWorkspaceContextValue | null>(null);

export function useProductWorkspace() {
  const value = useContext(ProductWorkspaceContext);
  if (!value) throw new Error("ProductWorkspaceShell belum siap.");
  return value;
}

export function ProductWorkspaceShell({
  productId,
  children
}: {
  productId: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const activeModule = useMemo(
    () => productWorkspaceModuleFromPath(pathname),
    [pathname]
  );
  const [payload, setPayload] = useState<ProductWorkspacePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ProductWorkspaceRequestError | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reloadWorkspace = useCallback(
    () => setReloadToken((value) => value + 1),
    []
  );
  const updateWorkspaceProduct = useCallback(
    (product: ProductWorkspaceProduct) => {
      setPayload((current) => current ? { ...current, product } : current);
    },
    []
  );

  useEffect(() => {
    if (!isValidProductWorkspaceId(productId)) {
      setPayload(null);
      setError(new ProductWorkspaceRequestError(400, "ID produk tidak valid."));
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void loadProductWorkspace(productId, controller.signal)
      .then(setPayload)
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setPayload(null);
        setError(
          reason instanceof ProductWorkspaceRequestError
            ? reason
            : new ProductWorkspaceRequestError(500, "Product Workspace belum dapat dimuat.")
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [productId, reloadToken]);

  const contextValue = useMemo<ProductWorkspaceContextValue | null>(
    () => payload
      ? { ...payload, reloadWorkspace, updateWorkspaceProduct }
      : null,
    [payload, reloadWorkspace, updateWorkspaceProduct]
  );

  if (loading) return <ProductWorkspaceLoading />;
  if (error || !payload || !contextValue) {
    return <ProductWorkspaceFailure error={error} onRetry={reloadWorkspace} />;
  }

  const product = payload.product;
  const readOnly = payload.role === "admin_guest";

  return (
    <ProductWorkspaceContext.Provider value={contextValue}>
      <div className="grid gap-6">
        <section className="border border-brand-softGray bg-white p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/admin/products"
              className="inline-flex min-h-10 items-center rounded-full border border-brand-softGray px-4 text-xs font-semibold"
            >
              Kembali ke Product Library
            </Link>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/admin/products/legacy?productId=${encodeURIComponent(product.id)}`}
                className="inline-flex min-h-10 items-center rounded-full border border-brand-softGray px-4 text-xs font-semibold"
              >
                {readOnly ? "Lihat Editor Lama" : "Editor Lama"}
              </Link>
              <Link
                href={`/admin/products/audit-history?productId=${encodeURIComponent(product.id)}`}
                className="inline-flex min-h-10 items-center rounded-full border border-brand-softGray px-4 text-xs font-semibold"
              >
                Riwayat
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={product.status} />
                {readOnly ? (
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">
                    MODE LIHAT SAJA
                  </span>
                ) : null}
              </div>
              <h1 className="mt-3 break-words text-3xl font-semibold sm:text-4xl">
                {product.name || "Produk tanpa nama"}
              </h1>
              <p className="mt-2 break-all text-sm text-brand-charcoal/55">/{product.slug || "-"}</p>
            </div>
            <dl className="grid min-w-0 gap-3 text-sm sm:grid-cols-3 lg:max-w-xl">
              <Summary label="Kategori" value={product.categoryName || "Tanpa kategori"} />
              <Summary label="SKU induk" value={product.sku || "Belum ada"} />
              <Summary label="Harga dasar" value={formatRupiah(product.basePrice)} />
            </dl>
          </div>
        </section>

        <nav
          aria-label="Navigasi Product Workspace"
          className="overflow-x-auto border border-brand-softGray bg-white p-2"
        >
          <div className="flex min-w-max gap-2">
            {PRODUCT_WORKSPACE_MODULES.map((workspaceModule) => {
              const active = workspaceModule.key === activeModule;
              return (
                <Link
                  key={workspaceModule.key}
                  href={productWorkspacePath(product.id, workspaceModule.key)}
                  aria-current={active ? "page" : undefined}
                  className={active
                    ? "inline-flex min-h-11 items-center rounded-full bg-brand-charcoal px-5 text-sm font-semibold text-white"
                    : "inline-flex min-h-11 items-center rounded-full px-5 text-sm font-semibold text-brand-charcoal hover:bg-brand-offWhite"}
                >
                  {workspaceModule.label}
                </Link>
              );
            })}
          </div>
        </nav>

        {children}
      </div>
    </ProductWorkspaceContext.Provider>
  );
}

function ProductWorkspaceLoading() {
  return (
    <div className="grid gap-6" aria-busy="true" aria-label="Memuat Product Workspace">
      <div className="h-56 animate-pulse border border-brand-softGray bg-white" />
      <div className="h-16 animate-pulse border border-brand-softGray bg-white" />
      <div className="h-72 animate-pulse border border-brand-softGray bg-white" />
    </div>
  );
}

function ProductWorkspaceFailure({
  error,
  onRetry
}: {
  error: ProductWorkspaceRequestError | null;
  onRetry: () => void;
}) {
  const notFound = error?.status === 404;
  const invalid = error?.status === 400;
  return (
    <section role="alert" className="border border-red-200 bg-red-50 p-6 text-red-950 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em]">PRODUCT WORKSPACE</p>
      <h1 className="mt-2 text-2xl font-semibold">
        {notFound ? "Produk tidak ditemukan" : invalid ? "ID produk tidak valid" : "Workspace belum dapat dimuat"}
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6">{error?.message || "Terjadi kesalahan saat memuat produk."}</p>
      <div className="mt-5 flex flex-wrap gap-3">
        {!notFound && !invalid ? (
          <button
            type="button"
            onClick={onRetry}
            className="min-h-10 rounded-full bg-brand-charcoal px-5 text-sm font-semibold text-white"
          >
            Coba lagi
          </button>
        ) : null}
        <Link
          href="/admin/products"
          className="inline-flex min-h-10 items-center rounded-full border border-red-200 bg-white px-5 text-sm font-semibold"
        >
          Kembali ke Product Library
        </Link>
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: "draft" | "active" | "archived" }) {
  const className = status === "active"
    ? "bg-green-50 text-green-800"
    : status === "archived"
      ? "bg-gray-200 text-gray-700"
      : "bg-blue-50 text-blue-800";
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${className}`}>
      {lifecycleLabel(status)}
    </span>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 bg-brand-offWhite p-4">
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-charcoal/45">{label}</dt>
      <dd className="mt-2 break-words font-semibold">{value}</dd>
    </div>
  );
}
