"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ProductCatalog } from "@/components/ProductCatalog";
import { ProductImageSwap } from "@/components/ProductImageSwap";
import { PublicProductCard } from "@/components/PublicProductCard";
import { fallbackImages } from "@/lib/fallback-data";
import { getProductCardImages } from "@/lib/product-gallery";
import type { Product } from "@/lib/types";

const categoryDefinitions = [
  { label: "Kaos Polos", href: "/kaos-polos", pattern: /kaos|shirt|cotton|combed/i },
  { label: "Jaket & Hoodie", href: "/jaket-hoodie", pattern: /jaket|jacket|hoodie|crewneck|bomber|windbreaker/i },
  { label: "Headwear", href: "/headwear", pattern: /headwear|topi|cap|hat/i },
  { label: "Jersey", href: "/jersey", pattern: /jersey/i },
  { label: "Sablon DTF", href: "/sablon-dtf", pattern: /sablon|dtf/i }
] as const;

function productSearchText(product: Product) {
  return [
    product.nama,
    product.kategori,
    product.subcategory,
    product.product_type,
    ...(product.collection_tags || []),
    ...(product.intent_tags || [])
  ].filter(Boolean).join(" ");
}

function CollectionCategoryCard({
  label,
  href,
  product
}: {
  label: string;
  href: string;
  product: Product;
}) {
  const images = getProductCardImages(product);
  const focal = product.focal_points?.catalog;
  return (
    <Link href={href} className="category-type-card group block shrink-0 snap-start">
      <div className="category-type-media relative bg-[#efefef]">
        <ProductImageSwap
          primarySrc={images.primary}
          hoverSrc={images.hover}
          fallbackSrc={fallbackImages.product}
          alt={product.image_alt || `${label} DEBRODER`}
          imageClassName={(product.object_fit || "cover") === "contain" ? "object-contain p-3" : "object-cover"}
          objectFit={product.object_fit || "cover"}
          objectPosition={product.object_position || "center center"}
          focalX={focal?.focal_x ?? product.focal_x}
          focalY={focal?.focal_y ?? product.focal_y}
          zoom={focal?.zoom ?? product.focal_zoom}
          sizes="(min-width: 1200px) 25vw, (min-width: 768px) 38vw, 78vw"
        />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-[#111] sm:text-xl">{label}</h3>
      <span className="mt-2 inline-flex text-sm font-medium underline underline-offset-4">Jelajahi kategori</span>
    </Link>
  );
}

export function CollectionCommerceExperience({
  products,
  initialQuery,
  initialColor,
  initialLabel,
  initialSort,
  initialStatus
}: {
  products: Product[];
  initialQuery: string;
  initialColor: string;
  initialLabel: "all" | "new" | "promo" | "best";
  initialSort: "order" | "newest" | "best-selling";
  initialStatus: string;
}) {
  const categoryCards = useMemo(
    () => categoryDefinitions
      .map((definition) => ({
        ...definition,
        product: products.find((product) => definition.pattern.test(productSearchText(product)))
      }))
      .filter((item): item is typeof categoryDefinitions[number] & { product: Product } => Boolean(item.product)),
    [products]
  );

  const curated = useMemo(() => {
    const ranked = [...products].sort((left, right) =>
      Number(Boolean(right.label_best_seller)) - Number(Boolean(left.label_best_seller))
      || Number(Boolean(right.label_promo)) - Number(Boolean(left.label_promo))
      || Number(right.sales_count || 0) - Number(left.sales_count || 0)
      || left.urutan - right.urutan
    ).slice(0, 8);
    return ranked.length >= 4 ? ranked : [];
  }, [products]);

  const newest = useMemo(() => {
    const ranked = [...products].sort((left, right) =>
      new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime()
      || right.urutan - left.urutan
    ).slice(0, 4);
    return ranked.length >= 3 ? ranked : [];
  }, [products]);

  return (
    <div className="category-commerce-v1 collection-commerce-v2">
      {categoryCards.length ? (
        <section className="category-discovery-section bg-white py-10 sm:py-12 lg:py-20" aria-labelledby="collection-category-heading">
          <div className="section-shell">
            <h2 id="collection-category-heading" className="public-section-title">Belanja berdasarkan kategori</h2>
            <p className="public-secondary-copy mt-3 max-w-2xl text-base leading-7">
              Masuk langsung ke kategori resmi DEBRODER tanpa membuat taxonomy baru.
            </p>
            <div className="category-type-rail no-scrollbar mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 sm:gap-4 lg:mt-8">
              {categoryCards.map((item) => (
                <CollectionCategoryCard key={item.href} label={item.label} href={item.href} product={item.product} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {curated.length ? (
        <section className="bg-[#f5f5f5] py-10 sm:py-12 lg:py-20" aria-labelledby="collection-curated-heading">
          <div className="section-shell">
            <div className="flex items-end justify-between gap-5">
              <div>
                <p className="public-eyebrow">Pilihan DEBRODER</p>
                <h2 id="collection-curated-heading" className="public-section-title mt-3">Koleksi pilihan</h2>
              </div>
              <Link href="#all-products" className="hidden text-sm font-semibold underline underline-offset-4 sm:inline-flex">Lihat semua produk</Link>
            </div>
            <div data-ui-grid="product-rail" className="category-product-rail no-scrollbar mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 sm:gap-4 lg:mt-8">
              {curated.map((product) => (
                <PublicProductCard
                  key={product.id || product.slug || product.nama}
                  product={product}
                  variant="rail"
                  className="category-product-rail-card shrink-0 snap-start"
                  imageSizes="(min-width: 1200px) 25vw, (min-width: 768px) 38vw, 78vw"
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {newest.length ? (
        <section className="bg-white py-10 sm:py-12 lg:py-20" aria-labelledby="collection-new-heading">
          <div className="section-shell">
            <div className="flex items-end justify-between gap-5">
              <h2 id="collection-new-heading" className="public-section-title">Produk terbaru</h2>
              <Link href="/koleksi?sort=newest#all-products" className="hidden text-sm font-semibold underline underline-offset-4 sm:inline-flex">Lihat semua</Link>
            </div>
            <div data-ui-grid="product-rail" className="category-product-rail no-scrollbar mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 sm:gap-4 lg:mt-8">
              {newest.map((product) => (
                <PublicProductCard
                  key={product.id || product.slug || product.nama}
                  product={product}
                  variant="rail"
                  className="category-product-rail-card shrink-0 snap-start"
                  imageSizes="(min-width: 1200px) 25vw, (min-width: 768px) 38vw, 78vw"
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section id="all-products" className="scroll-mt-24 bg-white py-10 sm:py-12 lg:py-20">
        <div className="section-shell">
          <h2 className="public-section-title">Semua produk</h2>
          <p className="public-secondary-copy mt-3 max-w-2xl text-base leading-7">
            Jelajahi produk aktif dari PIM DEBRODER. Harga, ketersediaan, dan tujuan pembelian tetap mengikuti kontrak produk canonical.
          </p>
          <div className="mt-6 lg:mt-8">
            <ProductCatalog
              products={products}
              showCategoryFilter
              initialQuery={initialQuery}
              initialColor={initialColor}
              initialLabel={initialLabel}
              initialSort={initialSort}
              initialStatus={initialStatus}
              showStatusFilter
              catalogStyle="category"
              syncUrlState
            />
          </div>
        </div>
      </section>
    </div>
  );
}
