"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ProductImageSwap } from "@/components/ProductImageSwap";
import { fallbackImages } from "@/lib/fallback-data";
import {
  EMPTY_JERSEY_FILTERS,
  filterJerseyProducts,
  jerseyFilterOptions,
  jerseyProductStatus,
  type FilterOption,
  type JerseyProductFilters,
  type JerseySort
} from "@/lib/jersey-commerce";
import { getProductCardImages } from "@/lib/product-gallery";
import { productCardMetadata, productCardPrice } from "@/lib/product-card";
import type { Product } from "@/lib/types";

const filterKeys = [
  "q",
  "category",
  "color",
  "size",
  "availability",
  "price",
  "sort"
] as const;

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function isSort(value: string | null): value is JerseySort {
  return [
    "featured",
    "newest",
    "best-selling",
    "price-low",
    "price-high"
  ].includes(value || "");
}

function filterState(searchParams: ReturnType<typeof useSearchParams>) {
  const sort = searchParams.get("sort");
  return {
    query: searchParams.get("q") || "",
    category: searchParams.get("category") || "all",
    color: searchParams.get("color") || "all",
    size: searchParams.get("size") || "all",
    availability: searchParams.get("availability") || "all",
    price: searchParams.get("price") || "all",
    sort: isSort(sort) ? sort : "featured"
  } satisfies JerseyProductFilters;
}

function SelectFilter({
  id,
  label,
  value,
  options,
  onChange
}: {
  id: string;
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}) {
  if (!options.length) return null;
  return (
    <label className="grid gap-2 text-sm font-semibold text-black" htmlFor={id}>
      {label}
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full border border-black/20 bg-white px-3 text-sm font-medium text-black outline-none transition focus:border-black focus:ring-1 focus:ring-black"
      >
        <option value="all">Semua</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function FilterPanel({
  idPrefix,
  filters,
  options,
  updateFilter,
  resetFilters,
  onApply
}: {
  idPrefix: string;
  filters: JerseyProductFilters;
  options: ReturnType<typeof jerseyFilterOptions>;
  updateFilter: (key: keyof JerseyProductFilters, value: string) => void;
  resetFilters: () => void;
  onApply?: () => void;
}) {
  return (
    <div className="grid gap-6 text-black">
      <label className="grid gap-2 text-sm font-semibold" htmlFor={`${idPrefix}-search`}>
        Cari produk
        <input
          id={`${idPrefix}-search`}
          type="search"
          value={filters.query}
          onChange={(event) => updateFilter("query", event.target.value)}
          placeholder="Nama, SKU, warna..."
          className="min-h-11 w-full border border-black/20 bg-white px-3 text-sm font-medium outline-none transition placeholder:text-black/40 focus:border-black focus:ring-1 focus:ring-black"
        />
      </label>

      {options.categories.length ? (
        <fieldset>
          <legend className="text-sm font-semibold">Subkategori</legend>
          <div className="mt-2 grid border-t border-black/10">
            {[{ value: "all", label: "Semua" }, ...options.categories].map(
              (option) => {
                const active = filters.category === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => updateFilter("category", option.value)}
                    className={`flex min-h-10 items-center justify-between border-b border-black/10 text-left text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black ${
                      active ? "font-bold" : "font-medium text-black/65 hover:text-black"
                    }`}
                  >
                    {option.label}
                    {active ? <span aria-hidden="true">✓</span> : null}
                  </button>
                );
              }
            )}
          </div>
        </fieldset>
      ) : null}

      <SelectFilter
        id={`${idPrefix}-color`}
        label="Warna"
        value={filters.color}
        options={options.colors}
        onChange={(value) => updateFilter("color", value)}
      />
      <SelectFilter
        id={`${idPrefix}-size`}
        label="Ukuran"
        value={filters.size}
        options={options.sizes}
        onChange={(value) => updateFilter("size", value)}
      />
      <SelectFilter
        id={`${idPrefix}-availability`}
        label="Ketersediaan"
        value={filters.availability}
        options={options.availability}
        onChange={(value) => updateFilter("availability", value)}
      />
      <SelectFilter
        id={`${idPrefix}-price`}
        label="Harga"
        value={filters.price}
        options={options.price}
        onChange={(value) => updateFilter("price", value)}
      />

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
        {onApply ? (
          <button
            type="button"
            onClick={onApply}
            className="inline-flex min-h-11 items-center justify-center bg-black px-4 text-sm font-semibold text-white outline-none transition hover:bg-black/80 focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
          >
            Terapkan
          </button>
        ) : null}
        <button
          type="button"
          onClick={resetFilters}
          className="inline-flex min-h-11 items-center justify-center border border-black px-4 text-sm font-semibold text-black outline-none transition hover:bg-black hover:text-white focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
        >
          Reset Filters
        </button>
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const images = getProductCardImages(product);
  const focal = product.focal_points?.catalog;
  const href = `/produk/${product.slug || slugify(product.nama)}`;
  const metadata = productCardMetadata(product);
  const price = productCardPrice(product);
  const status = jerseyProductStatus(product);

  return (
    <article className="group min-w-0 text-black">
      <Link
        href={href}
        className="block outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-4"
      >
        <ProductImageSwap
          primarySrc={images.primary}
          hoverSrc={images.hover}
          fallbackSrc={fallbackImages.product}
          alt={product.image_alt || product.nama}
          imageClassName={
            (product.object_fit || "cover") === "contain"
              ? "object-contain p-3"
              : "object-cover"
          }
          objectFit={product.object_fit || "cover"}
          objectPosition={product.object_position || "center center"}
          focalX={focal?.focal_x ?? product.focal_x}
          focalY={focal?.focal_y ?? product.focal_y}
          zoom={focal?.zoom ?? product.focal_zoom}
          sizes="(min-width: 1280px) 31vw, (min-width: 1024px) 30vw, (min-width: 768px) 48vw, 50vw"
        />
      </Link>
      <div className="pt-3 sm:pt-4">
        {metadata ? <p className="text-[11px] font-medium leading-4 tracking-[0.01em] text-black/55 sm:text-xs">{metadata}</p> : null}
        <Link
          href={href}
          className={`${metadata ? "mt-1.5" : ""} block outline-none focus-visible:underline focus-visible:decoration-2 focus-visible:underline-offset-4`}
        >
          <h2 className="line-clamp-2 text-[clamp(0.95rem,1.25vw,1.08rem)] font-semibold leading-[1.3] tracking-[-0.01em]">
            {product.nama}
          </h2>
        </Link>
        {price ? <p className="mt-2 text-[clamp(0.9rem,1.05vw,1.05rem)] font-semibold leading-6">
          {price}
        </p> : null}
        {status || product.label_new ? <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-black/50 sm:text-xs">
          {status ? <span>{status}</span> : null}
          {product.label_new && status !== "New" ? <span>New</span> : null}
        </div> : null}
        <Link
          href={href}
          className="mt-3 inline-flex min-h-10 items-center border-b border-black text-xs font-bold uppercase tracking-[0.08em] outline-none transition-opacity hover:opacity-55 focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 sm:text-sm"
        >
          Lihat Produk
        </Link>
      </div>
    </article>
  );
}

export function JerseyShopCatalog({ products }: { products: Product[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const filters = filterState(searchParams);
  const options = useMemo(() => jerseyFilterOptions(products), [products]);
  const visible = useMemo(
    () => filterJerseyProducts(products, filters),
    [filters, products]
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pageState, setPageState] = useState({ key: "", count: 12 });
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  const filterKey = searchParams.toString();
  const visibleCount = pageState.key === filterKey ? pageState.count : 12;
  const shown = visible.slice(0, visibleCount);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => drawerRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  function replaceParams(next: URLSearchParams) {
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function updateFilter(key: keyof JerseyProductFilters, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    const paramKey = key === "query" ? "q" : key;
    const defaultValue = EMPTY_JERSEY_FILTERS[key];
    if (!value || value === defaultValue) params.delete(paramKey);
    else params.set(paramKey, value);
    replaceParams(params);
  }

  function resetFilters() {
    const params = new URLSearchParams(searchParams.toString());
    filterKeys.forEach((key) => params.delete(key));
    replaceParams(params);
  }

  function toggleFilters() {
    if (window.matchMedia("(min-width: 1024px)").matches) {
      setFiltersOpen((current) => !current);
      return;
    }
    setMobileOpen(true);
  }

  function closeMobileFilters() {
    setMobileOpen(false);
    window.requestAnimationFrame(() => filterButtonRef.current?.focus());
  }

  function handleDrawerKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeMobileFilters();
      return;
    }
    if (event.key !== "Tab" || !drawerRef.current) return;
    const focusable = Array.from(
      drawerRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      )
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <section className="bg-white pb-16 text-black sm:pb-20">
      <header className="section-shell py-10 sm:py-14">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-black/50">
          DEBRODER JERSEY
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-heading text-5xl font-extrabold uppercase leading-[0.92] tracking-[-0.03em] sm:text-7xl">
            Shop All Jersey
          </h1>
          <p aria-live="polite" className="pb-1 text-sm font-semibold text-black/60">
            {visible.length} dari {products.length} produk
          </p>
        </div>
      </header>

      <div className="sticky top-0 z-40 border-y border-black/10 bg-white/95 backdrop-blur-sm">
        <div className="section-shell flex min-h-14 items-center justify-between gap-4">
          <button
            ref={filterButtonRef}
            type="button"
            aria-expanded={filtersOpen || mobileOpen}
            aria-controls="jersey-filters"
            onClick={toggleFilters}
            className="inline-flex min-h-11 items-center text-sm font-bold text-black outline-none underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
          >
            <span className="hidden lg:inline">
              {filtersOpen ? "Hide Filters" : "Show Filters"}
            </span>
            <span className="lg:hidden">Show Filters</span>
          </button>
          <label className="flex min-h-11 items-center gap-2 text-sm font-bold" htmlFor="jersey-sort">
            <span className="whitespace-nowrap">Sort By</span>
            <select
              id="jersey-sort"
              value={filters.sort}
              onChange={(event) => updateFilter("sort", event.target.value)}
              className="min-h-10 max-w-[150px] border-0 bg-white pr-2 text-sm font-semibold text-black outline-none focus:ring-2 focus:ring-black sm:max-w-none"
            >
              <option value="featured">Pilihan</option>
              <option value="newest">Terbaru</option>
              <option value="best-selling">Best Selling</option>
              <option value="price-low">Harga Terendah</option>
              <option value="price-high">Harga Tertinggi</option>
            </select>
          </label>
        </div>
      </div>

      <div className="section-shell pt-8">
        <div
          className={`grid min-w-0 transition-[grid-template-columns,column-gap] duration-[220ms] motion-reduce:transition-none lg:grid-cols-[var(--filter-column)_minmax(0,1fr)] ${
            filtersOpen
              ? "gap-x-8 [--filter-column:240px]"
              : "gap-x-0 [--filter-column:0px]"
          }`}
        >
          <aside
            id="jersey-filters"
            aria-hidden={!filtersOpen}
            inert={!filtersOpen}
            className="hidden min-w-0 overflow-hidden lg:block"
          >
            <div
              className={`w-[240px] max-h-[calc(100vh-80px)] overflow-y-auto pr-3 transition-opacity duration-[180ms] motion-reduce:transition-none ${
                filtersOpen ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              <FilterPanel
                idPrefix="desktop"
                filters={filters}
                options={options}
                updateFilter={updateFilter}
                resetFilters={resetFilters}
              />
            </div>
          </aside>

          <div className="min-w-0">
            {shown.length ? (
              <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-x-6 lg:gap-y-14">
                {shown.map((product) => (
                  <ProductCard
                    key={product.id || product.slug || product.nama}
                    product={product}
                  />
                ))}
              </div>
            ) : (
              <div className="grid min-h-[360px] place-items-center border-y border-black/10 text-center">
                <div className="max-w-md px-6 py-16">
                  <h2 className="text-2xl font-bold">Produk tidak ditemukan</h2>
                  <p className="mt-3 text-sm leading-6 text-black/60">
                    Tidak ada produk Jersey yang cocok dengan filter saat ini.
                  </p>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="mt-6 inline-flex min-h-11 items-center justify-center bg-black px-5 text-sm font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
            )}

            {visible.length > shown.length ? (
              <div className="mt-14 flex justify-center">
                <button
                  type="button"
                  onClick={() =>
                    setPageState({ key: filterKey, count: visibleCount + 12 })
                  }
                  className="inline-flex min-h-12 items-center justify-center border border-black bg-white px-8 text-sm font-bold text-black outline-none transition hover:bg-black hover:text-white focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                >
                  Load More
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[120] lg:hidden" aria-hidden={false}>
          <button
            type="button"
            aria-label="Tutup filter"
            onClick={closeMobileFilters}
            className="absolute inset-0 bg-black/35"
          />
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Filter produk Jersey"
            tabIndex={-1}
            onKeyDown={handleDrawerKeyDown}
            className="absolute inset-y-0 left-0 w-[min(90vw,360px)] overflow-y-auto bg-white p-5 text-black outline-none"
          >
            <div className="mb-7 flex items-center justify-between border-b border-black/10 pb-4">
              <h2 className="text-lg font-bold">Filters</h2>
              <button
                type="button"
                onClick={closeMobileFilters}
                className="grid min-h-11 min-w-11 place-items-center text-2xl outline-none focus-visible:ring-2 focus-visible:ring-black"
                aria-label="Tutup filter"
              >
                ×
              </button>
            </div>
            <FilterPanel
              idPrefix="mobile"
              filters={filters}
              options={options}
              updateFilter={updateFilter}
              resetFilters={resetFilters}
              onApply={closeMobileFilters}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
