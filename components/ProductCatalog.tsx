"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AddToCartButton } from "@/components/CartProvider";
import { ProductImageSwap } from "@/components/ProductImageSwap";
import { fallbackImages, getProductImage } from "@/lib/fallback-data";
import {
  catalogColumnsForWidth,
  initialCatalogBatch,
  nextCatalogBatch,
  uniqueCatalogProducts
} from "@/lib/product-catalog";
import { getProductCardImages } from "@/lib/product-gallery";
import { matchesProductType, type ProductTypeOption } from "@/lib/product-taxonomy";
import type { Product } from "@/lib/types";
import { formatRupiah } from "@/lib/url";

type SortValue = "order" | "newest" | "best-selling" | "price-low" | "price-high";
type ProductGroup = "all" | "jaket-hoodie" | "headwear";
type LabelValue = "all" | "new" | "promo" | "best";

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function priceOf(product: Product) {
  const value = product.price ?? product.harga ?? product.base_price;
  return typeof value === "number" ? value : Number(String(value || "").replace(/[^\d]/g, "")) || 0;
}

function productPrice(product: Product) {
  return formatRupiah(product.price ?? product.harga ?? product.base_price ?? product.price_label) || "Hubungi kami";
}

function hasPriceVariation(product: Product) {
  if (product.pricing_mode === "variant_based") return true;
  return (product.variants || []).some((variant) =>
    Number(variant.price_adjustment || 0) !== 0
    || (variant.sizes || []).some((size) => Number(size.price_adjustment || 0) !== 0)
  );
}

function catalogPrice(product: Product) {
  const price = productPrice(product);
  return hasPriceVariation(product) && price !== "Hubungi kami" ? `Mulai ${price}` : price;
}

function productDetail(product: Product, preferPublicDescription = false) {
  return product.short_detail || (preferPublicDescription ? product.public_description : "") || product.description || product.deskripsi || "";
}

function productChips(product: Product) {
  return [
    ...(product.color_tags || []),
    ...(product.size_tags || []),
    ...(product.material_tags || [])
  ].filter(Boolean).slice(0, 3);
}

function productColors(product: Product) {
  const variantColors = (product.variants || [])
    .map((variant) => variant.color_name || variant.variant_name)
    .filter(Boolean) as string[];
  return variantColors.length ? Array.from(new Set(variantColors)) : (product.color_tags || []);
}

function colorHex(value: string) {
  const key = normalizeFilterValue(value);
  const map: Record<string, string> = {
    hitam: "#111111",
    black: "#111111",
    putih: "#f7f7f7",
    white: "#f7f7f7",
    navy: "#1f2a44",
    biru: "#1d4ed8",
    blue: "#1d4ed8",
    merah: "#dc2626",
    red: "#dc2626",
    maroon: "#6f1d1b",
    kuning: "#f59e0b",
    yellow: "#f59e0b",
    mustard: "#d97706",
    abu: "#9ca3af",
    "abu-muda": "#d1d5db",
    "abu-tua": "#6b7280",
    gray: "#9ca3af",
    grey: "#9ca3af",
    cream: "#eadfca",
    beige: "#d6c4a5",
    hijau: "#166534",
    "hijau-forest": "#063d24",
    forest: "#063d24",
    "forest-green": "#063d24",
    army: "#4b5320",
    orange: "#f97316"
  };
  return map[key] || "#d1d5db";
}

function productMetaLine(product: Product, expanded = false) {
  if (!expanded) {
    const items = [
      productColors(product).length ? `${productColors(product).length} Warna` : "",
      product.size_tags?.[0] || "",
      product.material_tags?.[0] || ""
    ].filter(Boolean);
    return items.slice(0, 3).join(" · ");
  }

  const variantSizes = (product.variants || []).flatMap((variant) =>
    (variant.sizes || []).filter((size) => size.is_active !== false).map((size) => size.size_name)
  );
  const sizes = Array.from(new Set(variantSizes.length ? variantSizes : (product.size_tags || [])));
  const sizeRange = sizes.length > 1 ? `${sizes[0]}–${sizes[sizes.length - 1]}` : (sizes[0] || "");
  const items = [
    productColors(product).length ? `${productColors(product).length} Warna` : "",
    sizeRange,
    ...(product.material_tags || []).slice(0, 2)
  ].filter(Boolean);
  return items.slice(0, 4).join(" · ");
}

function productAvailability(product: Product) {
  const variantStock = (product.variants || []).reduce((total, variant) =>
    total + (variant.sizes || []).filter((size) => size.is_active !== false).reduce((sum, size) => sum + Number(size.stock || 0), 0), 0
  );
  const hasReadyStock = Number(product.stock || 0) > 0 || variantStock > 0;
  const hasCustom = Boolean(
    product.uses_configurator
    || product.product_type === "configurable_product"
    || product.product_type === "production_service"
    || product.pricing_mode === "configurator_based"
    || product.pricing_mode === "custom_quote"
  );

  if (hasReadyStock && hasCustom) return "Ready Stock + Custom";
  if (hasReadyStock) return "Ready Stock";
  if (hasCustom) return "Custom Available";
  return "";
}

function productModel(product: Product) {
  return [product.kategori, product.subcategory].filter(Boolean).join(" · ");
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
  ].filter(Boolean).join(" ").toLowerCase();
}

function normalizeFilterValue(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
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
  return productColors(product).some((item) => accepted.includes(normalizeFilterValue(item)));
}

function labelValue(value: string): LabelValue {
  return value === "new" || value === "promo" || value === "best" ? value : "all";
}

function groupText(product: Product) {
  return [
    product.nama,
    product.kategori,
    product.subcategory,
    product.brand,
    ...(product.collection_tags || []),
    ...(product.intent_tags || [])
  ].filter(Boolean).join(" ").toLowerCase();
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
  productTypeOptions = [],
  typeFilterLabel = "Semua tipe",
  showCategoryFilter = true,
  showGroupFilter = false,
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
  productTypeOptions?: ProductTypeOption[];
  typeFilterLabel?: string;
  showCategoryFilter?: boolean;
  showGroupFilter?: boolean;
  catalogStyle?: "default" | "category";
}) {
  const [query, setQuery] = useState("");
  const [color, setColor] = useState(initialColor);
  const [group, setGroup] = useState<ProductGroup>(initialGroup);
  const [category, setCategory] = useState("all");
  const [productType, setProductType] = useState(initialProductType);
  const [price, setPrice] = useState("all");
  const [label, setLabel] = useState<LabelValue>(initialLabel);
  const [sort, setSort] = useState<SortValue>(initialSort);
  const [columns, setColumns] = useState(2);
  const [visibleCount, setVisibleCount] = useState(4);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreTimer = useRef<number | null>(null);
  const isCategoryCatalog = catalogStyle === "category";

  const categories = useMemo(() => Array.from(new Set(products.map((product) => product.kategori).filter(Boolean))).sort(), [products]);
  const colors = useMemo(() => Array.from(new Map(products.flatMap((product) => productColors(product)).filter(Boolean).map((item) => [normalizeFilterValue(item), item])).entries()).sort((a, b) => a[1].localeCompare(b[1], "id")), [products]);
  const availableProductTypeOptions = useMemo(
    () => productTypeOptions.filter((option) => products.some((product) => matchesProductType(product, option.value, productTypeOptions))),
    [productTypeOptions, products]
  );
  const hasTypeFilter = availableProductTypeOptions.length > 0;
  const activeProductType = productType === "all" || availableProductTypeOptions.some((option) => option.value === productType) ? productType : "all";
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const sourceProducts = isCategoryCatalog ? uniqueCatalogProducts(products) : products;
    return sourceProducts
      .filter((product) => !needle || searchText(product).includes(needle))
      .filter((product) => matchesGroup(product, group))
      .filter((product) => category === "all" || product.kategori === category)
      .filter((product) => matchesProductType(product, activeProductType, availableProductTypeOptions))
      .filter((product) => matchesColor(product, color))
      .filter((product) => {
        const amount = priceOf(product);
        if (price === "under-50") return amount < 50000;
        if (price === "50-100") return amount >= 50000 && amount <= 100000;
        if (price === "over-100") return amount > 100000;
        return true;
      })
      .filter((product) => label === "all"
        || (label === "new" && product.label_new)
        || (label === "promo" && product.label_promo)
        || (label === "best" && product.label_best_seller))
      .sort((a, b) => {
        if (sort === "newest") return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        if (sort === "best-selling") return Number(b.sales_count || 0) - Number(a.sales_count || 0);
        if (sort === "price-low") return priceOf(a) - priceOf(b);
        if (sort === "price-high") return priceOf(b) - priceOf(a);
        return a.urutan - b.urutan;
      });
  }, [activeProductType, availableProductTypeOptions, category, color, group, isCategoryCatalog, label, price, products, query, sort]);

  useEffect(() => {
    if (!isCategoryCatalog) return;
    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    const updateColumns = () => setColumns(catalogColumnsForWidth(desktopQuery.matches ? 1024 : 0));
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
  }, [category, color, columns, group, isCategoryCatalog, label, price, productType, query, sort]);

  useEffect(() => () => {
    if (loadMoreTimer.current !== null) window.clearTimeout(loadMoreTimer.current);
  }, []);

  const displayedProducts = isCategoryCatalog ? visible.slice(0, visibleCount) : visible;

  function resetFilters() {
    setQuery("");
    setColor("all");
    setGroup("all");
    setCategory("all");
    setProductType("all");
    setPrice("all");
    setLabel("all");
    setSort("order");
  }

  function loadMore() {
    if (!isCategoryCatalog || isLoadingMore || visibleCount >= visible.length) return;
    setIsLoadingMore(true);
    loadMoreTimer.current = window.setTimeout(() => {
      setVisibleCount((current) => nextCatalogBatch(current, columns, visible.length));
      setIsLoadingMore(false);
      loadMoreTimer.current = null;
    }, 180);
  }

  const filterGridClass = showGroupFilter
    ? "lg:grid-cols-3 xl:grid-cols-7"
    : hasTypeFilter
      ? "lg:grid-cols-6"
      : showCategoryFilter
        ? "lg:grid-cols-5"
        : "lg:grid-cols-4";

  const filterLayoutClass = isCategoryCatalog
    ? `grid-cols-2 gap-2 py-3 ${hasTypeFilter ? "lg:grid-cols-[minmax(220px,2fr)_repeat(4,minmax(132px,1fr))]" : "lg:grid-cols-[minmax(220px,2fr)_repeat(3,minmax(132px,1fr))]"}`
    : `gap-3 py-4 sm:grid-cols-2 ${filterGridClass}`;
  const controlClass = isCategoryCatalog
    ? "premium-input min-h-10 min-w-0 rounded-lg border px-2.5 text-xs font-medium outline-none sm:px-3 sm:text-sm"
    : "premium-input min-h-11 rounded-full border px-4 text-sm font-semibold";

  return (
    <div>
      {showHeading ? <h2 className="section-title">{title}</h2> : null}
      <div className={`${showHeading ? "mt-5" : ""} grid ${filterLayoutClass}`}>
        <input aria-label="Cari produk" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari produk, bahan, warna..." className={`${controlClass} ${isCategoryCatalog ? "col-span-2 lg:col-span-1" : "outline-none lg:col-span-2"}`} />
        {showGroupFilter ? <select aria-label="Filter produk" value={group} onChange={(event) => setGroup(event.target.value as ProductGroup)} className={controlClass}><option value="all">Semua produk</option><option value="jaket-hoodie">Jaket & Hoodie</option><option value="headwear">Headwear</option></select> : null}
        {showCategoryFilter ? <select aria-label="Filter kategori" value={category} onChange={(event) => setCategory(event.target.value)} className={controlClass}><option value="all">Semua kategori</option>{categories.map((item) => <option key={item}>{item}</option>)}</select> : null}
        {hasTypeFilter ? <select aria-label="Filter tipe produk" value={activeProductType} onChange={(event) => setProductType(event.target.value)} className={controlClass}><option value="all">{typeFilterLabel}</option>{availableProductTypeOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select> : null}
        <select aria-label="Filter warna" value={color} onChange={(event) => setColor(event.target.value)} className={controlClass}><option value="all">Semua warna</option>{colors.map(([slug, name]) => <option key={slug} value={slug}>{name}</option>)}</select>
        <select aria-label="Filter harga dan status" value={`${price}|${label}`} onChange={(event) => { const [nextPrice, nextLabel] = event.target.value.split("|"); setPrice(nextPrice); setLabel(labelValue(nextLabel)); }} className={controlClass}><option value="all|all">Semua harga/status</option><option value="under-50|all">Di bawah Rp50 ribu</option><option value="50-100|all">Rp50–100 ribu</option><option value="over-100|all">Di atas Rp100 ribu</option><option value="all|new">New</option><option value="all|promo">Promo</option><option value="all|best">Best Seller</option></select>
        <select aria-label="Urutkan produk" value={sort} onChange={(event) => setSort(event.target.value as SortValue)} className={controlClass}><option value="order">Urutan pilihan</option><option value="newest">Terbaru</option><option value="best-selling">Best selling</option><option value="price-low">Harga terendah</option><option value="price-high">Harga tertinggi</option></select>
      </div>

      <div className={`${isCategoryCatalog ? "mt-1" : "mt-3"} flex items-center justify-between gap-4`}><p className={`${isCategoryCatalog ? "text-xs" : "text-sm"} font-medium text-brand-charcoal/60`}>{isCategoryCatalog && visible.length ? `${displayedProducts.length} dari ` : ""}{visible.length} produk ditemukan</p><button type="button" onClick={resetFilters} className={`${isCategoryCatalog ? "text-xs text-brand-charcoal/60" : "text-sm"} font-semibold underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-green`}>Reset filter</button></div>

      {visible.length ? <div className={`${isCategoryCatalog ? "mt-4 gap-x-3 gap-y-8 sm:gap-x-5 lg:gap-x-6 lg:gap-y-10" : "mt-6 gap-x-2 gap-y-7"} grid grid-cols-2 lg:grid-cols-4`}>
        {displayedProducts.map((product) => {
          const focal = product.focal_points?.catalog;
          const labels = Array.from(new Set([isCategoryCatalog && product.badge, product.label_new && "New", product.label_promo && "Promo", product.label_best_seller && "Best Seller"].filter(Boolean))) as string[];
          const detailHref = `/produk/${product.slug || slugify(product.nama)}`;
          const chips = productChips(product);
          const stockText = typeof product.stock === "number" ? (product.stock > 0 ? `Stok ${product.stock}` : "Pre-order") : "";
          const cardImages = getProductCardImages(product);
          const meta = productMetaLine(product, isCategoryCatalog);
          const detail = productDetail(product, isCategoryCatalog);
          const availability = productAvailability(product);
          if (isCategoryCatalog) {
            return <article key={product.id || product.slug || product.nama} className="min-w-0">
              <Link href={detailHref} aria-label={`Buka detail ${product.nama}`} className="group block min-w-0 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-green">
                <div className="relative">
                  <ProductImageSwap
                    primarySrc={cardImages.primary}
                    hoverSrc={cardImages.hover}
                    fallbackSrc={fallbackImages.product}
                    alt={product.image_alt || product.nama}
                    imageClassName={(product.object_fit || "cover") === "contain" ? "object-contain p-3" : "object-cover"}
                    objectFit={product.object_fit || "cover"}
                    objectPosition={product.object_position || "center center"}
                    focalX={focal?.focal_x ?? product.focal_x}
                    focalY={focal?.focal_y ?? product.focal_y}
                    zoom={focal?.zoom ?? product.focal_zoom}
                    sizes="(min-width: 1024px) 25vw, 50vw"
                  />
                  {labels.length ? <div className="pointer-events-none absolute left-2 top-2 flex max-w-[calc(100%-1rem)] flex-wrap gap-1">{labels.map((item) => <span key={item} className="bg-white/95 px-2 py-1 text-[11px] font-semibold uppercase text-brand-charcoal shadow-sm">{item}</span>)}</div> : null}
                </div>
                <div className="mt-3 flex min-w-0 flex-col">
                  <p className="line-clamp-2 min-h-8 text-xs font-medium leading-4 text-brand-charcoal/60 sm:min-h-5">{[meta, availability].filter(Boolean).join(" · ") || "\u00a0"}</p>
                  <h3 className="mt-1.5 line-clamp-3 min-h-[3.65rem] text-[15px] font-semibold leading-[1.3] tracking-[-0.01em] text-brand-charcoal/90 sm:line-clamp-2 sm:min-h-[2.75rem] sm:text-[17px]">{product.nama}</h3>
                  <p className="mt-1.5 line-clamp-3 min-h-[3.75rem] text-xs font-normal leading-5 text-brand-charcoal/60 sm:line-clamp-2 sm:min-h-12 sm:text-sm sm:leading-6">{detail || "\u00a0"}</p>
                  <div className="mt-2 min-h-10">
                    <p className="text-base font-bold leading-6 text-brand-charcoal sm:text-[18px]">{catalogPrice(product)}</p>
                    {product.compare_price ? <p className="mt-0.5 text-xs text-brand-charcoal/45 line-through">{formatRupiah(product.compare_price)}</p> : null}
                  </div>
                </div>
              </Link>
            </article>;
          }
          return <article key={product.id || product.slug || product.nama} className="group min-w-0">
              <Link href={detailHref} className="relative block">
              <ProductImageSwap
                primarySrc={cardImages.primary}
                hoverSrc={cardImages.hover}
                fallbackSrc={fallbackImages.product}
                alt={product.image_alt || product.nama}
                imageClassName={(product.object_fit || "cover") === "contain" ? "object-contain p-3" : "object-cover"}
                objectFit={product.object_fit || "cover"}
                objectPosition={product.object_position || "center center"}
                focalX={focal?.focal_x ?? product.focal_x}
                focalY={focal?.focal_y ?? product.focal_y}
                zoom={focal?.zoom ?? product.focal_zoom}
                sizes="(min-width: 1536px) 20vw, (min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
              />
              {labels.length ? <div className="pointer-events-none absolute left-2 top-2 flex flex-wrap gap-1">{labels.map((item) => <span key={String(item)} className="rounded-full bg-white/95 px-2 py-1 text-[10px] font-semibold shadow-sm">{item}</span>)}</div> : null}
              </Link>
              <div className="mt-3 space-y-2">
                {productColors(product).length ? <div className="flex items-center gap-1.5">
                  {productColors(product).slice(0, 8).map((color) => <span key={color} title={color} className="h-3.5 w-3.5 rounded-full border border-black/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.45)]" style={{ backgroundColor: colorHex(color) }} />)}
                </div> : null}
                {productMetaLine(product) ? <p className="text-xs font-medium text-brand-charcoal/60">{productMetaLine(product)}</p> : null}
                <Link href={detailHref} className="block"><h3 className="product-title line-clamp-2 text-[15px] leading-[1.22] tracking-[-0.01em] text-brand-charcoal sm:text-[17px]">{product.nama}</h3></Link>
                {productModel(product) ? <p className="text-xs leading-5 text-brand-charcoal/50 sm:text-[13px]">{productModel(product)}</p> : null}
                {productDetail(product) ? <p className="line-clamp-2 min-h-[2.5rem] text-xs leading-5 text-brand-charcoal/60 sm:text-sm sm:leading-6">{productDetail(product)}</p> : null}
                <div className="space-y-0.5">
                  <p className="product-price text-[15px] text-brand-charcoal sm:text-[17px]">{productPrice(product)}</p>
                  {product.compare_price ? <p className="text-xs text-brand-charcoal/40 line-through">{formatRupiah(product.compare_price)}</p> : null}
                </div>
                {stockText || product.brand || chips.length ? <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-medium text-brand-charcoal/55">
                  {product.brand ? <span>{product.brand}</span> : null}
                  {chips.filter((chip) => !productColors(product).includes(chip)).map((chip) => <span key={chip}>{chip}</span>)}
                  {stockText ? <span>{stockText}</span> : null}
                </div> : null}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2"><Link href={detailHref} className="premium-ghost-button cta inline-flex min-h-10 items-center justify-center border px-3 text-xs transition">Detail</Link><AddToCartButton product={{ id: product.id || product.slug || product.nama, name: product.nama, category: product.kategori, priceLabel: productPrice(product), priceValue: priceOf(product), href: detailHref, imageUrl: getProductImage(product), imageAlt: product.image_alt || product.nama }} className="cta inline-flex min-h-10 items-center justify-center rounded-full bg-brand-green px-3 text-xs text-white transition hover:bg-brand-charcoal">Tambah</AddToCartButton></div>
            </article>;
        })}
      </div> : <div className={`${isCategoryCatalog ? "px-4 py-10" : "p-8"} mt-6 text-center`}><p className="font-semibold">Produk tidak ditemukan</p><p className="mt-2 text-sm text-brand-charcoal/60">Coba kata kunci atau kombinasi filter lain.</p>{isCategoryCatalog ? <button type="button" onClick={resetFilters} className="mt-5 inline-flex min-h-10 items-center justify-center rounded-full border border-brand-charcoal/20 px-5 text-sm font-semibold hover:border-brand-green hover:text-brand-green">Reset Filter</button> : null}</div>}

      {isCategoryCatalog && isLoadingMore ? <div aria-label="Memuat produk tambahan" aria-live="polite" className="mt-8 grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6">
        {Array.from({ length: columns }, (_, index) => <div key={index} className="animate-pulse"><div className="aspect-[4/5] w-full bg-brand-charcoal/5" /><div className="mt-3 h-3 w-2/3 bg-brand-charcoal/5" /><div className="mt-3 h-5 w-full bg-brand-charcoal/5" /><div className="mt-2 h-10 w-full bg-brand-charcoal/5" /><div className="mt-2 h-5 w-1/2 bg-brand-charcoal/5" /></div>)}
      </div> : null}

      {isCategoryCatalog && !isLoadingMore && visibleCount < visible.length ? <div className="mt-10 flex justify-center"><button type="button" onClick={loadMore} className="inline-flex min-h-11 items-center justify-center rounded-full border border-brand-charcoal/20 px-6 text-sm font-semibold text-brand-charcoal transition hover:border-brand-green hover:text-brand-green focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-green">Lihat Lebih Banyak</button></div> : null}
    </div>
  );
}
