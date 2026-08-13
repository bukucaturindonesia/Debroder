"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ProductCatalog } from "@/components/ProductCatalog";
import { ProductImageSwap } from "@/components/ProductImageSwap";
import { PublicProductCard } from "@/components/PublicProductCard";
import { fallbackImages } from "@/lib/fallback-data";
import { productCardColors } from "@/lib/product-card";
import { getProductCardImages } from "@/lib/product-gallery";
import { matchesProductType, type ProductTypeOption } from "@/lib/product-taxonomy";
import type { Product } from "@/lib/types";

type SortValue = "order" | "newest" | "best-selling" | "price-low" | "price-high";
type LabelValue = "all" | "new" | "promo" | "best";

function normalizeFilterValue(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function colorHex(value: string) {
  const key = normalizeFilterValue(value);
  const map: Record<string, string> = {
    hitam: "#111111",
    black: "#111111",
    putih: "#f5f5f5",
    white: "#f5f5f5",
    navy: "#1f2a44",
    biru: "#1d4ed8",
    blue: "#1d4ed8",
    benhur: "#2155a3",
    merah: "#c81e1e",
    red: "#c81e1e",
    burgundy: "#6f1d2c",
    maroon: "#6f1d2c",
    mustard: "#c58b14",
    kuning: "#e5b817",
    yellow: "#e5b817",
    abu: "#9ca3af",
    grey: "#9ca3af",
    gray: "#9ca3af",
    "light-grey": "#d1d5db",
    cream: "#eadfca",
    beige: "#d6c4a5",
    brown: "#7c5135",
    coklat: "#7c5135",
    "coklat-kopi": "#5c3b2e",
    hijau: "#166534",
    "hijau-botol": "#0b4a35",
    "forest-green": "#0b4a35",
    "mineral-green": "#6f8175",
    "mineral-blue": "#718b9f",
    woodrose: "#a96f78",
    "autumn-orange": "#b65f2e"
  };
  return map[key] || "#d9d9d9";
}

function TypeDiscoveryCard({
  product,
  option,
  href
}: {
  product: Product;
  option: ProductTypeOption;
  href: string;
}) {
  const images = getProductCardImages(product);
  const focal = product.focal_points?.catalog;

  return (
    <Link href={href} className="category-type-card group block snap-start">
      <div className="category-type-media relative bg-[#f5f5f5]">
        <ProductImageSwap
          primarySrc={images.primary}
          hoverSrc={images.hover}
          fallbackSrc={fallbackImages.product}
          alt={product.image_alt || `${option.label} DEBRODER`}
          imageClassName={(product.object_fit || "cover") === "contain" ? "object-contain p-3" : "object-cover"}
          objectFit={product.object_fit || "cover"}
          objectPosition={product.object_position || "center center"}
          focalX={focal?.focal_x ?? product.focal_x}
          focalY={focal?.focal_y ?? product.focal_y}
          zoom={focal?.zoom ?? product.focal_zoom}
          sizes="(min-width: 1200px) 25vw, (min-width: 768px) 38vw, 78vw"
        />
      </div>
      <div className="pt-4">
        <h3 className="text-[18px] font-medium leading-6 text-[#111] sm:text-xl">{option.label}</h3>
        <span className="mt-2 inline-flex text-sm font-medium text-experience-ink underline decoration-1 underline-offset-4 group-hover:text-experience-secondary">
          Jelajahi
        </span>
      </div>
    </Link>
  );
}

export function CategoryCommerceCatalog({
  products,
  pagePath,
  shortcutLabel,
  typeDiscoveryTitle,
  typeDiscoveryDescription,
  colorDiscoveryTitle,
  newArrivalsTitle,
  title,
  description,
  closingHeadline,
  closingCtaLabel,
  closingCtaHref,
  productTypeOptions = [],
  typeFilterLabel = "Semua tipe",
  seoLinks = [],
  initialColor = "all",
  initialLabel = "all",
  initialSort = "order",
  initialProductType = "all"
}: {
  products: Product[];
  pagePath: string;
  shortcutLabel: string;
  typeDiscoveryTitle: string;
  typeDiscoveryDescription: string;
  colorDiscoveryTitle: string;
  newArrivalsTitle: string;
  title: string;
  description: string;
  closingHeadline: string;
  closingCtaLabel: string;
  closingCtaHref: string;
  productTypeOptions?: ProductTypeOption[];
  typeFilterLabel?: string;
  seoLinks?: Array<{ label: string; href: string }>;
  initialColor?: string;
  initialLabel?: LabelValue;
  initialSort?: SortValue;
  initialProductType?: string;
}) {
  const typeCards = useMemo(
    () =>
      productTypeOptions
        .map((option) => ({
          option,
          product: products.find((product) =>
            matchesProductType(product, option.value, productTypeOptions)
          )
        }))
        .filter((item): item is { option: ProductTypeOption; product: Product } => Boolean(item.product)),
    [productTypeOptions, products]
  );

  const colors = useMemo(
    () =>
      Array.from(
        new Map(
          products
            .flatMap((product) => productCardColors(product))
            .filter(Boolean)
            .map((name) => [normalizeFilterValue(name), name])
        ).entries()
      )
        .sort((a, b) => a[1].localeCompare(b[1], "id"))
        .slice(0, 7),
    [products]
  );

  const newestProducts = useMemo(() => {
    const candidates = [...products]
        .sort((a, b) =>
          Number(Boolean(b.label_new)) - Number(Boolean(a.label_new))
          || new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
          || a.urutan - b.urutan
        )
        .slice(0, 4);
    return candidates.length >= 3 ? candidates : [];
  }, [products]);

  const catalogKey = `${initialProductType}|${initialColor}|${initialLabel}|${initialSort}`;

  return (
    <>
      <nav aria-label={shortcutLabel} className="category-shortcut-nav border-b border-[#e5e5e5] bg-white">
        <div className="section-shell no-scrollbar flex min-h-16 items-center gap-7 overflow-x-auto py-2">
          <Link href={`${pagePath}#catalog`} className="shrink-0 text-[15px] font-medium text-[#111] underline-offset-4 hover:underline focus-visible:underline">
            Semua Produk
          </Link>
          {typeCards.map(({ option }) => (
            <Link
              key={option.value}
              href={`${pagePath}?type=${encodeURIComponent(option.value)}#catalog`}
              className="shrink-0 text-[15px] font-medium text-[#111] underline-offset-4 hover:underline focus-visible:underline"
            >
              {option.label}
            </Link>
          ))}
        </div>
      </nav>

      {typeCards.length ? (
        <section className="category-discovery-section bg-white py-10 sm:py-12 lg:py-20" aria-labelledby="category-type-heading">
          <div className="section-shell">
            <div className="max-w-3xl">
              <h2 id="category-type-heading" className="public-section-title">{typeDiscoveryTitle}</h2>
              <p className="public-secondary-copy mt-3 max-w-2xl text-base leading-7">{typeDiscoveryDescription}</p>
            </div>
            <div className="category-type-rail no-scrollbar mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 sm:gap-4 lg:mt-8">
              {typeCards.map(({ option, product }) => (
                <TypeDiscoveryCard
                  key={option.value}
                  option={option}
                  product={product}
                  href={`${pagePath}?type=${encodeURIComponent(option.value)}#catalog`}
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {colors.length ? (
        <section className="category-color-section border-y border-[#e5e5e5] bg-[#f5f5f5] py-10 sm:py-12 lg:py-16" aria-labelledby="category-color-heading">
          <div className="section-shell">
            <h2 id="category-color-heading" className="public-section-title">{colorDiscoveryTitle}</h2>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-5 sm:gap-x-7">
              {colors.map(([slug, name]) => (
                <Link
                  key={slug}
                  href={`${pagePath}?color=${encodeURIComponent(slug)}#catalog`}
                  className="category-color-link group flex min-h-12 items-center gap-3 rounded-full bg-white px-4 text-sm font-medium text-experience-ink outline-none transition hover:text-experience-secondary focus-visible:ring-2 focus-visible:ring-experience-focus focus-visible:ring-offset-2"
                >
                  <span
                    aria-hidden="true"
                    className="h-6 w-6 rounded-full border border-black/15"
                    style={{ backgroundColor: colorHex(name) }}
                  />
                  <span>{name}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {newestProducts.length ? (
        <section className="category-new-section bg-white py-10 sm:py-12 lg:py-20" aria-labelledby="category-new-heading">
          <div className="section-shell">
            <div className="flex items-end justify-between gap-6">
              <h2 id="category-new-heading" className="public-section-title">{newArrivalsTitle}</h2>
              <Link href={`${pagePath}?sort=newest#catalog`} className="hidden text-sm font-medium underline underline-offset-4 sm:inline-flex">
                Lihat Semua
              </Link>
            </div>
            <div data-ui-grid="product-rail" className="category-product-rail no-scrollbar mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 sm:gap-4 lg:mt-8">
              {newestProducts.map((product) => (
                <PublicProductCard
                  key={product.id || product.slug || product.nama}
                  product={product}
                  className="category-product-rail-card shrink-0 snap-start"
                  imageSizes="(min-width: 1200px) 25vw, (min-width: 768px) 38vw, 78vw"
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section id="catalog" className="category-catalog-section scroll-mt-24 bg-white py-10 sm:py-12 lg:py-20">
        <div className="section-shell">
          <div className="max-w-3xl">
            <h2 className="public-section-title">{title}</h2>
            <p className="public-secondary-copy mt-3 max-w-2xl text-base leading-7">{description}</p>
          </div>
          <div className="mt-6 lg:mt-8">
            <ProductCatalog
              key={catalogKey}
              products={products}
              showCategoryFilter={false}
              initialColor={initialColor}
              initialLabel={initialLabel}
              initialSort={initialSort}
              initialProductType={initialProductType}
              productTypeOptions={productTypeOptions}
              typeFilterLabel={typeFilterLabel}
              catalogStyle="category"
              syncUrlState
            />
          </div>
        </div>
      </section>

      {seoLinks.length ? (
        <nav aria-label="Kategori populer" className="category-seo-links border-t border-[#e5e5e5] bg-white py-10 sm:py-12">
          <div className="section-shell">
            <h2 className="text-lg font-medium text-[#111]">Kategori populer</h2>
            <div className="mt-5 flex flex-wrap gap-x-7 gap-y-4">
              {seoLinks.map((item) => (
                <Link key={item.href} href={item.href} className="text-base text-experience-ink underline decoration-1 underline-offset-4 hover:text-experience-secondary">
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>
      ) : null}

      <section className="category-closing-section border-y border-[#e5e5e5] bg-[#f5f5f5] py-10 sm:py-12 lg:py-16">
        <div className="section-shell flex flex-col items-start justify-between gap-7 sm:flex-row sm:items-center">
          <h2 className="public-editorial-title max-w-3xl">{closingHeadline}</h2>
          <Link href={closingCtaHref} className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-experience-ink px-7 text-[15px] font-medium text-white transition hover:bg-experience-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-experience-focus">
            {closingCtaLabel}
          </Link>
        </div>
      </section>
    </>
  );
}
