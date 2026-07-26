"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PublicProductCard } from "@/components/PublicProductCard";
import {
  catalogColumnsForWidth,
  initialCatalogBatch,
  nextCatalogBatch,
  uniqueCatalogProducts
} from "@/lib/product-catalog";
import { productCardColors } from "@/lib/product-card";
import { productMatchesNavigationStatus } from "@/lib/public-navigation";
import { matchesProductType, type ProductTypeOption } from "@/lib/product-taxonomy";
import type { Product } from "@/lib/types";

type SortValue = "order" | "newest" | "best-selling" | "price-low" | "price-high";
type ProductGroup = "all" | "jaket-hoodie" | "headwear";
type LabelValue = "all" | "new" | "promo" | "best";

function priceOf(product: Product) {
  const value = product.price ?? product.harga ?? product.base_price;
  return typeof value === "number"
    ? value
    : Number(String(value || "").replace(/[^\d]/g, "")) || 0;
}

function searchText(product: Product) {
  return [
    product.nama,
    product.kategori,
    product.subcategory,
    product.brand,
    ...(product.material_tags || []),
    ...(product.color_tags || []),
    ...(product.size_tags || []),
    ...(product.collection_tags || []),
    ...(product.intent_tags || [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function normalizeFilterValue(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function matchesColor(product: Product, selectedColor: string) {
  if (selectedColor === "all") return true;
  const aliases: Record<string, string[]> = {
    black: ["black", "hitam"],
    "forest-green": ["forest-green", "green-forest", "hijau-forest", "forest", "hijau"],
    gold: ["gold", "emas"],
    navy: ["navy"],
    white: ["white", "putih"]
  };
  const accepted = aliases[selectedColor] || [selectedColor];
  return productCardColors(product).some((item) =>
    accepted.includes(normalizeFilterValue(item))
  );
}

function labelValue(value: string): LabelValue {
  return value === "new" || value === "promo" || value === "best"
    ? value
    : "all";
}

function groupText(product: Product) {
  return [
    product.nama,
    product.kategori,
    product.subcategory,
    product.brand,
    ...(product.collection_tags || []),
    ...(product.intent_tags || [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function matchesGroup(product: Product, group: ProductGroup) {
  if (group === "all") return true;
  const value = groupText(product);
  if (group === "jaket-hoodie") return /jaket|jacket|hoodie|hoodies/.test(value);
  if (group === "headwear") return /headwear|topi|cap|hat/.test(value);
  return true;
}

export function ProductCatalog({
  products,
  title = "Katalog produk",
  showHeading = false,
  initialColor = "all",
  initialGroup = "all",
  initialLabel = "all",
  initialSort = "order",
  initialProductType = "all",
  initialStatus = "all",
  productTypeOptions = [],
  typeFilterLabel = "Semua tipe",
  showCategoryFilter = true,
  showGroupFilter = false,
  showStatusFilter = false,
  syncUrlState = false,
  showCardActions,
  catalogStyle = "default"
}: {
  products: Product[];
  title?: string;
  showHeading?: boolean;
  initialColor?: string;
  initialGroup?: ProductGroup;
  initialLabel?: LabelValue;
  initialSort?: SortValue;
  initialProductType?: string;
  initialStatus?: string;
  productTypeOptions?: ProductTypeOption[];
  typeFilterLabel?: string;
  showCategoryFilter?: boolean;
  showGroupFilter?: boolean;
  showStatusFilter?: boolean;
  syncUrlState?: boolean;
  showCardActions?: boolean;
  catalogStyle?: "default" | "category";
}) {
  const [query, setQuery] = useState("");
  const [color, setColor] = useState(initialColor);
  const [group, setGroup] = useState<ProductGroup>(initialGroup);
  const [category, setCategory] = useState("all");
  const [productType, setProductType] = useState(initialProductType);
  const [price, setPrice] = useState("all");
  const [status, setStatus] = useState(initialStatus);
  const [label, setLabel] = useState<LabelValue>(initialLabel);
  const [sort, setSort] = useState<SortValue>(initialSort);
  const [columns, setColumns] = useState(2);
  const [visibleCount, setVisibleCount] = useState(4);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const loadMoreTimer = useRef<number | null>(null);
  const filterTriggerRef = useRef<HTMLButtonElement>(null);
  const filterPanelRef = useRef<HTMLDivElement>(null);
  const filterCloseRef = useRef<HTMLButtonElement>(null);
  const isCategoryCatalog = catalogStyle === "category";
  const shouldShowCardActions = showCardActions ?? !isCategoryCatalog;

  const categories = useMemo(
    () => Array.from(new Set(products.map((product) => product.kategori).filter(Boolean))).sort(),
    [products]
  );
  const colors = useMemo(
    () =>
      Array.from(
        new Map(
          products
            .flatMap((product) => productCardColors(product))
            .filter(Boolean)
            .map((item) => [normalizeFilterValue(item), item])
        ).entries()
      ).sort((a, b) => a[1].localeCompare(b[1], "id")),
    [products]
  );
  const availableProductTypeOptions = useMemo(
    () =>
      productTypeOptions.filter((option) =>
        products.some((product) =>
          matchesProductType(product, option.value, productTypeOptions)
        )
      ),
    [productTypeOptions, products]
  );
  const hasTypeFilter = availableProductTypeOptions.length > 0;
  const activeProductType =
    productType === "all" ||
    availableProductTypeOptions.some((option) => option.value === productType)
      ? productType
      : "all";
  const activeStatus = ["all", "ready-stock", "custom", "hybrid"].includes(status)
    ? status
    : "all";

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const sourceProducts = isCategoryCatalog
      ? uniqueCatalogProducts(products)
      : products;

    return sourceProducts
      .filter((product) => !needle || searchText(product).includes(needle))
      .filter((product) => matchesGroup(product, group))
      .filter((product) => category === "all" || product.kategori === category)
      .filter((product) =>
        matchesProductType(product, activeProductType, availableProductTypeOptions)
      )
      .filter((product) => matchesColor(product, color))
      .filter((product) => productMatchesNavigationStatus(product, activeStatus))
      .filter((product) => {
        const amount = priceOf(product);
        if (price === "under-50") return amount < 50000;
        if (price === "50-100") return amount >= 50000 && amount <= 100000;
        if (price === "over-100") return amount > 100000;
        return true;
      })
      .filter(
        (product) =>
          label === "all" ||
          (label === "new" && product.label_new) ||
          (label === "promo" && product.label_promo) ||
          (label === "best" && product.label_best_seller)
      )
      .sort((a, b) => {
        if (sort === "newest") {
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        }
        if (sort === "best-selling") {
          return Number(b.sales_count || 0) - Number(a.sales_count || 0);
        }
        if (sort === "price-low") return priceOf(a) - priceOf(b);
        if (sort === "price-high") return priceOf(b) - priceOf(a);
        return a.urutan - b.urutan;
      });
  }, [activeProductType, activeStatus, availableProductTypeOptions, category, color, group, isCategoryCatalog, label, price, products, query, sort]);

  useEffect(() => {
    if (!isCategoryCatalog) return;
    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    const updateColumns = () =>
      setColumns(catalogColumnsForWidth(desktopQuery.matches ? 1024 : 0));
    updateColumns();
    desktopQuery.addEventListener("change", updateColumns);
    return () => desktopQuery.removeEventListener("change", updateColumns);
  }, [isCategoryCatalog]);

  useEffect(() => {
    if (!isCategoryCatalog) return;
    if (loadMoreTimer.current !== null) window.clearTimeout(loadMoreTimer.current);
    loadMoreTimer.current = null;
    setIsLoadingMore(false);
    setVisibleCount(initialCatalogBatch(columns));
  }, [activeStatus, category, color, columns, group, isCategoryCatalog, label, price, productType, query, sort]);

  useEffect(() => {
    if (!syncUrlState) return;
    const url = new URL(window.location.href);
    const values: Record<string, string> = {
      type: activeProductType,
      color,
      status: activeStatus,
      label,
      sort
    };

    Object.entries(values).forEach(([key, value]) => {
      const defaultValue = key === "sort" ? "order" : "all";
      if (!value || value === defaultValue) url.searchParams.delete(key);
      else url.searchParams.set(key, value);
    });

    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`
    );
  }, [activeProductType, activeStatus, color, label, sort, syncUrlState]);

  useEffect(
    () => () => {
      if (loadMoreTimer.current !== null) window.clearTimeout(loadMoreTimer.current);
    },
    []
  );

  useEffect(() => {
    if (!filtersOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => filterCloseRef.current?.focus(), 20);

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setFiltersOpen(false);
        filterTriggerRef.current?.focus();
        return;
      }
      if (event.key !== "Tab" || !filterPanelRef.current) return;
      const focusable = Array.from(
        filterPanelRef.current.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled])"
        )
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [filtersOpen]);

  const displayedProducts = isCategoryCatalog
    ? visible.slice(0, visibleCount)
    : visible;
  const activeFilterCount = [
    query.trim(),
    group !== "all" ? group : "",
    category !== "all" ? category : "",
    activeProductType !== "all" ? activeProductType : "",
    color !== "all" ? color : "",
    price !== "all" ? price : "",
    activeStatus !== "all" ? activeStatus : "",
    label !== "all" ? label : ""
  ].filter(Boolean).length;

  function resetFilters() {
    setQuery("");
    setColor("all");
    setGroup("all");
    setCategory("all");
    setProductType("all");
    setPrice("all");
    setStatus("all");
    setLabel("all");
    setSort("order");
  }

  function closeFilters() {
    setFiltersOpen(false);
    window.requestAnimationFrame(() => filterTriggerRef.current?.focus());
  }

  function openFilters(trigger: HTMLButtonElement) {
    filterTriggerRef.current = trigger;
    setFiltersOpen(true);
  }

  function loadMore() {
    if (!isCategoryCatalog || isLoadingMore || visibleCount >= visible.length) return;
    setIsLoadingMore(true);
    loadMoreTimer.current = window.setTimeout(() => {
      setVisibleCount((current) =>
        nextCatalogBatch(current, columns, visible.length)
      );
      setIsLoadingMore(false);
      loadMoreTimer.current = null;
    }, 180);
  }

  const controlClass =
    "public-control min-h-11 min-w-0 rounded-lg border px-3 text-sm font-medium outline-none";
  const filterControls = () => (
    <>
      {showGroupFilter ? (
        <select
          aria-label="Filter produk"
          value={group}
          onChange={(event) => setGroup(event.target.value as ProductGroup)}
          className={`${controlClass} w-full`}
        >
          <option value="all">Semua produk</option>
          <option value="jaket-hoodie">Jaket & Hoodie</option>
          <option value="headwear">Headwear</option>
        </select>
      ) : null}
      {showCategoryFilter ? (
        <select
          aria-label="Filter kategori"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className={`${controlClass} w-full`}
        >
          <option value="all">Semua kategori</option>
          {categories.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      ) : null}
      {hasTypeFilter ? (
        <select
          aria-label="Filter tipe produk"
          value={activeProductType}
          onChange={(event) => setProductType(event.target.value)}
          className={`${controlClass} w-full`}
        >
          <option value="all">{typeFilterLabel}</option>
          {availableProductTypeOptions.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      ) : null}
      <select
        aria-label="Filter warna"
        value={color}
        onChange={(event) => setColor(event.target.value)}
        className={`${controlClass} w-full`}
      >
        <option value="all">Semua warna</option>
        {colors.map(([slug, name]) => (
          <option key={slug} value={slug}>
            {name}
          </option>
        ))}
      </select>
      <select
        aria-label="Filter harga dan status"
        value={`${price}|${label}`}
        onChange={(event) => {
          const [nextPrice, nextLabel] = event.target.value.split("|");
          setPrice(nextPrice);
          setLabel(labelValue(nextLabel));
        }}
        className={`${controlClass} w-full`}
      >
        <option value="all|all">Semua harga/status</option>
        <option value="under-50|all">Di bawah Rp50 ribu</option>
        <option value="50-100|all">Rp50–100 ribu</option>
        <option value="over-100|all">Di atas Rp100 ribu</option>
        <option value="all|new">New</option>
        <option value="all|promo">Promo</option>
        <option value="all|best">Best Seller</option>
      </select>
      {showStatusFilter ? (
        <select
          aria-label="Filter ketersediaan"
          value={activeStatus}
          onChange={(event) => setStatus(event.target.value)}
          className={`${controlClass} w-full`}
        >
          <option value="all">Semua ketersediaan</option>
          <option value="ready-stock">Ready Stock</option>
          <option value="custom">Pesanan Custom</option>
          <option value="hybrid">Ready Stock & Custom</option>
        </select>
      ) : null}
    </>
  );

  return (
    <div>
      {showHeading ? <h2 className="public-section-title">{title}</h2> : null}

      <div className={`${showHeading ? "mt-6 " : ""}public-divider border-y bg-white py-4`}>
        <div className="hidden items-center justify-between gap-8 lg:flex">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <input
              aria-label="Cari produk"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari produk, bahan, warna..."
              className={`${controlClass} w-[min(24rem,34vw)]`}
            />
            <button
              type="button"
              aria-expanded={filtersOpen}
              aria-controls="public-catalog-filters"
              onClick={(event) => openFilters(event.currentTarget)}
              className="public-secondary-action inline-flex min-h-11 items-center justify-center rounded-lg border px-4 text-sm font-semibold"
            >
              Filter{activeFilterCount ? ` (${activeFilterCount})` : ""}
            </button>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <p className="public-muted-copy whitespace-nowrap text-sm" aria-live="polite">
              {isCategoryCatalog && visible.length ? `${displayedProducts.length} dari ` : ""}
              {visible.length} produk
            </p>
            <label>
              <span className="sr-only">Urutkan produk</span>
              <select
                aria-label="Urutkan produk"
                value={sort}
                onChange={(event) => setSort(event.target.value as SortValue)}
                className={`${controlClass} min-w-44`}
              >
                <option value="order">Urutan pilihan</option>
                <option value="newest">Terbaru</option>
                <option value="best-selling">Best selling</option>
                <option value="price-low">Harga terendah</option>
                <option value="price-high">Harga tertinggi</option>
              </select>
            </label>
          </div>
        </div>

        <div className="lg:hidden">
          <input
            aria-label="Cari produk"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari produk, bahan, warna..."
            className={`${controlClass} w-full`}
          />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              aria-expanded={filtersOpen}
              aria-controls="public-catalog-filters"
              onClick={(event) => openFilters(event.currentTarget)}
              className="public-secondary-action inline-flex min-h-11 items-center justify-center rounded-lg border px-4 text-sm font-semibold"
            >
              Filter{activeFilterCount ? ` (${activeFilterCount})` : ""}
            </button>
            <label className="relative">
              <span className="sr-only">Urutkan produk</span>
              <select
                aria-label="Urutkan produk"
                value={sort}
                onChange={(event) => setSort(event.target.value as SortValue)}
                className={`${controlClass} h-full w-full`}
              >
                <option value="order">Urutkan</option>
                <option value="newest">Terbaru</option>
                <option value="best-selling">Best selling</option>
                <option value="price-low">Harga terendah</option>
                <option value="price-high">Harga tertinggi</option>
              </select>
            </label>
          </div>
          <div className="mt-2 flex items-center justify-between gap-4">
            <p className="public-muted-copy text-sm" aria-live="polite">
              {isCategoryCatalog && visible.length ? `${displayedProducts.length} dari ` : ""}
              {visible.length} produk
            </p>
            {activeFilterCount ? (
              <button
                type="button"
                onClick={resetFilters}
                className="text-sm font-semibold underline underline-offset-4"
              >
                Reset
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {visible.length ? (
        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-10">
          {displayedProducts.map((product) => (
            <PublicProductCard
              key={product.id || product.slug || product.nama}
              product={product}
              showActions={shouldShowCardActions}
              imageSizes="(min-width: 1024px) 25vw, 50vw"
            />
          ))}
        </div>
      ) : (
        <div className="mt-6 px-4 py-10 text-center">
          <p className="font-semibold">Produk tidak ditemukan</p>
          <p className="public-secondary-copy mt-2 text-sm">
            Coba kata kunci atau kombinasi filter lain.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="public-secondary-action mt-6 inline-flex min-h-10 items-center justify-center border px-5 text-sm font-semibold"
          >
            Reset Filter
          </button>
        </div>
      )}

      {isCategoryCatalog && isLoadingMore ? (
        <div
          aria-label="Memuat produk tambahan"
          aria-live="polite"
          className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4 lg:gap-x-6"
        >
          {Array.from({ length: columns }, (_, index) => (
            <div key={index} className="animate-pulse">
              <div className="aspect-[4/5] w-full bg-black/5" />
              <div className="mt-4 h-3 w-2/3 bg-black/5" />
              <div className="mt-2 h-5 w-full bg-black/5" />
              <div className="mt-2 h-5 w-1/2 bg-black/5" />
            </div>
          ))}
        </div>
      ) : null}

      {isCategoryCatalog && !isLoadingMore && visibleCount < visible.length ? (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            className="public-secondary-action inline-flex min-h-11 items-center justify-center border px-6 text-sm font-semibold transition"
          >
            Lihat Lebih Banyak
          </button>
        </div>
      ) : null}

      {filtersOpen ? (
        <>
          <button
            type="button"
            aria-label="Tutup filter"
            onClick={closeFilters}
            className="fixed inset-0 z-[160] bg-black/48"
          />
          <div
            ref={filterPanelRef}
            id="public-catalog-filters"
            role="dialog"
            aria-modal="true"
            aria-labelledby="public-catalog-filter-title"
            className="fixed inset-x-0 bottom-0 z-[170] flex max-h-[88dvh] flex-col bg-white lg:inset-y-0 lg:left-auto lg:max-h-none lg:w-[420px]"
          >
            <div className="public-divider flex items-center justify-between border-b px-4 py-4">
              <div>
                <h2 id="public-catalog-filter-title" className="text-base font-semibold">
                  Filter
                </h2>
                <p className="public-muted-copy mt-1 text-sm">
                  {activeFilterCount} filter aktif
                </p>
              </div>
              <button
                ref={filterCloseRef}
                type="button"
                onClick={closeFilters}
                aria-label="Tutup filter"
                className="grid h-11 w-11 place-items-center text-2xl"
              >
                ×
              </button>
            </div>
            <div className="grid flex-1 content-start gap-4 overflow-y-auto px-4 py-6">
              {filterControls()}
            </div>
            <div className="public-divider grid grid-cols-2 gap-2 border-t bg-white p-4">
              <button
                type="button"
                onClick={resetFilters}
                className="public-secondary-action inline-flex min-h-11 items-center justify-center border px-4 text-sm font-semibold"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={closeFilters}
                className="inline-flex min-h-11 items-center justify-center bg-black px-4 text-sm font-semibold text-white"
              >
                Terapkan ({visible.length})
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
