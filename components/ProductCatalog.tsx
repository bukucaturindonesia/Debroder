"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SafeImage } from "@/components/SafeImage";
import { fallbackImages, getProductImage } from "@/lib/fallback-data";
import { productOrderHref } from "@/lib/order";
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

function productDetail(product: Product) {
  return product.short_detail || product.description || product.deskripsi || "";
}

function productChips(product: Product) {
  return [
    ...(product.color_tags || []),
    ...(product.size_tags || []),
    ...(product.material_tags || [])
  ].filter(Boolean).slice(0, 3);
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
    ...(product.collection_tags || [])
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
  return (product.color_tags || []).some((item) => accepted.includes(normalizeFilterValue(item)));
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
    ...(product.collection_tags || [])
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
  showCategoryFilter = true,
  showGroupFilter = false
}: {
  products: Product[];
  title?: string;
  showHeading?: boolean;
  initialColor?: string;
  initialGroup?: ProductGroup;
  initialLabel?: LabelValue;
  initialSort?: SortValue;
  showCategoryFilter?: boolean;
  showGroupFilter?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [color, setColor] = useState(initialColor);
  const [group, setGroup] = useState<ProductGroup>(initialGroup);
  const [category, setCategory] = useState("all");
  const [price, setPrice] = useState("all");
  const [label, setLabel] = useState<LabelValue>(initialLabel);
  const [sort, setSort] = useState<SortValue>(initialSort);

  const categories = useMemo(() => Array.from(new Set(products.map((product) => product.kategori).filter(Boolean))).sort(), [products]);
  const colors = useMemo(() => Array.from(new Map(products.flatMap((product) => product.color_tags || []).filter(Boolean).map((item) => [normalizeFilterValue(item), item])).entries()).sort((a, b) => a[1].localeCompare(b[1], "id")), [products]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products
      .filter((product) => !needle || searchText(product).includes(needle))
      .filter((product) => matchesGroup(product, group))
      .filter((product) => category === "all" || product.kategori === category)
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
  }, [category, color, group, label, price, products, query, sort]);

  return (
    <div>
      {showHeading ? <h2 className="text-3xl font-bold leading-[1.05] tracking-[-0.02em] sm:text-4xl">{title}</h2> : null}
      <div className={`${showHeading ? "mt-6" : ""} grid gap-3 border-y border-brand-softGray py-5 sm:grid-cols-2 ${showGroupFilter ? "lg:grid-cols-3 xl:grid-cols-7" : showCategoryFilter ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
        <input aria-label="Cari produk" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari produk, bahan, warna..." className="min-h-11 rounded-full border border-brand-softGray bg-white px-4 text-sm outline-none focus:border-brand-charcoal lg:col-span-2" />
        {showGroupFilter ? <select aria-label="Filter produk" value={group} onChange={(event) => setGroup(event.target.value as ProductGroup)} className="min-h-11 rounded-full border border-brand-softGray bg-white px-4 text-sm font-semibold"><option value="all">Semua produk</option><option value="jaket-hoodie">Jaket & Hoodie</option><option value="headwear">Headwear</option></select> : null}
        {showCategoryFilter ? <select aria-label="Filter kategori" value={category} onChange={(event) => setCategory(event.target.value)} className="min-h-11 rounded-full border border-brand-softGray bg-white px-4 text-sm font-semibold"><option value="all">Semua kategori</option>{categories.map((item) => <option key={item}>{item}</option>)}</select> : null}
        <select aria-label="Filter warna" value={color} onChange={(event) => setColor(event.target.value)} className="min-h-11 rounded-full border border-brand-softGray bg-white px-4 text-sm font-semibold"><option value="all">Semua warna</option>{colors.map(([slug, name]) => <option key={slug} value={slug}>{name}</option>)}</select>
        <select aria-label="Filter harga dan status" value={`${price}|${label}`} onChange={(event) => { const [nextPrice, nextLabel] = event.target.value.split("|"); setPrice(nextPrice); setLabel(labelValue(nextLabel)); }} className="min-h-11 rounded-full border border-brand-softGray bg-white px-4 text-sm font-semibold"><option value="all|all">Semua harga/status</option><option value="under-50|all">Di bawah Rp50 ribu</option><option value="50-100|all">Rp50–100 ribu</option><option value="over-100|all">Di atas Rp100 ribu</option><option value="all|new">New</option><option value="all|promo">Promo</option><option value="all|best">Best Seller</option></select>
        <select aria-label="Urutkan produk" value={sort} onChange={(event) => setSort(event.target.value as SortValue)} className="min-h-11 rounded-full border border-brand-softGray bg-white px-4 text-sm font-semibold"><option value="order">Urutan pilihan</option><option value="newest">Terbaru</option><option value="best-selling">Best selling</option><option value="price-low">Harga terendah</option><option value="price-high">Harga tertinggi</option></select>
      </div>

      <div className="mt-5 flex items-center justify-between gap-4"><p className="text-sm font-medium text-brand-charcoal/60">{visible.length} produk ditemukan</p><button type="button" onClick={() => { setQuery(""); setColor("all"); setGroup("all"); setCategory("all"); setPrice("all"); setLabel("all"); setSort("order"); }} className="text-sm font-semibold underline-offset-4 hover:underline">Reset filter</button></div>

      {visible.length ? <div className="mt-6 grid grid-cols-2 gap-x-2 gap-y-7 lg:grid-cols-4">
        {visible.map((product) => {
          const focal = product.focal_points?.catalog;
          const labels = [product.label_new && "New", product.label_promo && "Promo", product.label_best_seller && "Best Seller"].filter(Boolean);
          const detailHref = `/produk/${product.slug || slugify(product.nama)}`;
          const chips = productChips(product);
          const stockText = typeof product.stock === "number" ? (product.stock > 0 ? `Stok ${product.stock}` : "Pre-order") : "";
          return <article key={product.id || product.slug || product.nama} className="group min-w-0">
              <Link href={detailHref} className="block">
              <div className="relative aspect-[4/5] w-full overflow-hidden bg-white">
                <SafeImage src={getProductImage(product)} fallbackSrc={fallbackImages.product} alt={product.image_alt || product.nama} fill className="object-cover transition duration-500 group-hover:scale-[1.02]" objectFit="cover" focalX={focal?.focal_x ?? product.focal_x} focalY={focal?.focal_y ?? product.focal_y} zoom={focal?.zoom ?? product.focal_zoom} sizes="(min-width: 1536px) 20vw, (min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw" />
                {labels.length ? <div className="absolute left-2 top-2 flex flex-wrap gap-1">{labels.map((item) => <span key={String(item)} className="rounded-full bg-white/95 px-2 py-1 text-[10px] font-semibold shadow-sm">{item}</span>)}</div> : null}
              </div>
              </Link>
              <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.12em] text-brand-charcoal/45">{product.kategori}</p>
              <Link href={detailHref} className="mt-1 block"><h3 className="line-clamp-2 text-sm font-semibold leading-snug sm:text-base">{product.nama}</h3></Link>
              {productDetail(product) ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-brand-charcoal/55 sm:text-sm">{productDetail(product)}</p> : null}
              <p className="mt-2 text-sm font-semibold">{productPrice(product)}</p>
              {product.compare_price ? <p className="mt-0.5 text-xs text-brand-charcoal/45 line-through">{formatRupiah(product.compare_price)}</p> : null}
              {chips.length || stockText || product.brand ? <div className="mt-2 flex flex-wrap gap-1.5">
                {product.brand ? <span className="bg-brand-offWhite px-2 py-1 text-[10px] font-semibold text-brand-charcoal/65">{product.brand}</span> : null}
                {chips.map((chip) => <span key={chip} className="bg-brand-offWhite px-2 py-1 text-[10px] font-semibold text-brand-charcoal/65">{chip}</span>)}
                {stockText ? <span className="bg-brand-offWhite px-2 py-1 text-[10px] font-semibold text-brand-charcoal/65">{stockText}</span> : null}
              </div> : null}
              <div className="mt-3 grid grid-cols-2 gap-2"><Link href={detailHref} className="inline-flex min-h-9 items-center justify-center border border-brand-softGray px-2 text-[11px] font-semibold sm:min-h-10 sm:text-xs">Detail</Link><Link href={productOrderHref(product)} className="inline-flex min-h-9 items-center justify-center bg-brand-green px-2 text-[11px] font-semibold text-white sm:min-h-10 sm:text-xs">Pesan</Link></div>
            </article>;
        })}
      </div> : <div className="mt-6 bg-white p-8 text-center"><p className="font-semibold">Produk tidak ditemukan</p><p className="mt-2 text-sm text-brand-charcoal/60">Coba kata kunci atau kombinasi filter lain.</p></div>}
    </div>
  );
}
