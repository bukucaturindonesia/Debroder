import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { JerseyCommerceNav } from "@/components/jersey/JerseyCommerceNav";
import { ProductGallery } from "@/components/ProductGallery";
import { PublicProductCard } from "@/components/PublicProductCard";
import { TieredProductPurchasePanel } from "@/components/TieredProductPurchasePanel";
import { ProductVariantGalleryProvider } from "@/components/ProductVariantGalleryContext";
import { PublicShell } from "@/components/PublicPage";
import { getProductImage } from "@/lib/fallback-data";
import { getProductGalleryImages } from "@/lib/product-gallery";
import {
  jerseyHasCustomAvailability,
  jerseyHasReadyStock
} from "@/lib/jersey-commerce";
import { productMatchesRoute } from "@/lib/product-route-matching";
import { getPublicContent } from "@/lib/public-data";
import { getCustomDestinationForProduct } from "@/lib/custom-commerce/data";
import type { Product, ProductSizeGuide } from "@/lib/types";
import { formatRupiah, whatsappLinkWithMessage } from "@/lib/url";

type PageProps = { params: Promise<{ slug: string }> };

function sizeGuideRowsFromAdmin(guide?: ProductSizeGuide | null) {
  if (!guide?.rows?.length) return [];

  return guide.rows.map((row) => {
    const entries = Object.entries(row).filter(
      ([, value]) =>
        value !== null &&
        value !== undefined &&
        String(value).trim() !== ""
    );
    const labelEntry =
      entries.find(([key]) => /ukuran|size|nama|label/i.test(key)) ||
      entries[0];
    const label = labelEntry ? String(labelEntry[1]) : "Ukuran";
    const value = entries
      .filter(([key]) => key !== labelEntry?.[0])
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");

    return value ? `${label}: ${value}` : label;
  });
}

function sizeGuideForProduct(product: Product) {
  const adminRows = sizeGuideRowsFromAdmin(product.size_guide);
  if (adminRows.length) return adminRows;
  if (product.size_chart?.length) return product.size_chart;

  const specRows = (product.specifications || []).filter((item) =>
    /ukuran|size|panjang|lebar|dada|lingkar/i.test(item)
  );
  if (specRows.length) return specRows;

  return (product.size_tags || []).map(
    (size) => `${size}: Sesuaikan dengan panduan ukuran produk ini.`
  );
}

function variantColors(product: Product) {
  const colors = (product.variants || [])
    .map((variant) => variant.color_name || variant.variant_name)
    .filter(Boolean) as string[];
  return colors.length ? colors : product.color_tags;
}

function variantSizes(product: Product) {
  const sizes = (product.variants || [])
    .flatMap((variant) =>
      (variant.sizes || []).map((size) => size.size_name)
    )
    .filter(Boolean);

  return sizes.length
    ? Array.from(new Set(sizes))
    : product.size_tags;
}

export async function generateMetadata({
  params
}: PageProps): Promise<Metadata> {
  const [{ slug }, content] = await Promise.all([
    params,
    getPublicContent()
  ]);
  const product = content.products.find((item) => item.slug === slug);

  if (!product) {
    return { title: "Produk tidak ditemukan | DE BRODER" };
  }

  const title = product.seo_title || `${product.nama} | DE BRODER`;
  const description =
    product.seo_description ||
    product.short_detail ||
    product.description ||
    product.deskripsi;
  const image = product.og_image_url || getProductImage(product);

  return {
    title,
    description,
    alternates: {
      canonical: product.canonical_url || `/produk/${slug}`
    },
    openGraph: {
      title,
      description,
      images: image
        ? [{ url: image, alt: product.image_alt || product.nama }]
        : []
    }
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const [{ slug }, content] = await Promise.all([
    params,
    getPublicContent()
  ]);
  const product = content.products.find((item) => item.slug === slug);

  if (!product) notFound();

  const images = getProductGalleryImages(product);
  const focal =
    product.focal_points?.detail ||
    product.focal_points?.catalog || {
      focal_x: Number(product.focal_x ?? 50),
      focal_y: Number(product.focal_y ?? 50),
      zoom: Number(product.focal_zoom ?? 1),
      target_ratio: "4:5"
    };

  const whatsappUrl = whatsappLinkWithMessage(
    product.whatsapp_link || content.contact.whatsapp_link || "",
    `Halo DE BRODER, saya ingin bertanya tentang ${product.nama}.`
  );

  const priceLabel =
    formatRupiah(product.price ?? product.harga ?? product.base_price) ||
    "Hubungi kami";
  const detailHref = `/produk/${product.slug || slug}`;
  const isJersey = productMatchesRoute(product, "jersey");
  const hasReadyStock = jerseyHasReadyStock(product);
  const hasCustomAvailability = jerseyHasCustomAvailability(product);
  const showPurchasePanel = !isJersey || hasReadyStock || !hasCustomAvailability;
  const relatedProducts = isJersey
    ? []
    : content.products
        .filter((item) => item.status_aktif !== false)
        .filter((item) => (item.id || item.slug || item.nama) !== (product.id || product.slug || product.nama))
        .filter((item) => !productMatchesRoute(item, "jersey"))
        .filter((item) => item.kategori === product.kategori)
        .slice(0, 4);
  const customDestination = !isJersey && product.id ? await getCustomDestinationForProduct(product.id) : null;

  return (
    <PublicShell
      content={content}
      theme={isJersey ? "jersey-commerce" : "default"}
      showHeader={!isJersey}
    >
      {isJersey ? (
        <Suspense fallback={<div className="h-14 border-b border-black/10 bg-white" />}>
          <JerseyCommerceNav />
        </Suspense>
      ) : null}
      <main className={isJersey ? "bg-white py-8 sm:py-12" : "bg-white py-8 sm:py-12 lg:py-16"}>
        <div className="section-shell">
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-2 text-xs font-medium text-brand-charcoal/55"
          >
            <Link href="/">Beranda</Link>
            <span>/</span>
            <Link href={isJersey ? "/jersey/shop" : "/koleksi"}>
              {isJersey ? "Jersey" : "Koleksi"}
            </Link>
            <span>/</span>
            <span aria-current="page">{product.nama}</span>
          </nav>

          <ProductVariantGalleryProvider
            baseImages={images}
            variants={product.variants || []}
          >
            <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.72fr)] lg:gap-14">
              <ProductGallery
                images={images}
                alt={product.image_alt || product.nama}
                focal={focal}
              />

              <div className={isJersey ? "self-start p-5 sm:p-7 lg:sticky lg:top-24 border-t border-black/10 bg-white" : "self-start lg:sticky lg:top-24"}>
                <p className={isJersey ? "text-xs font-semibold uppercase tracking-[.16em] text-brand-charcoal/50" : "public-muted-copy text-[13px] leading-[1.45]"}>
                  {product.kategori}
                  {product.subcategory
                    ? ` · ${product.subcategory}`
                    : ""}
                </p>

                <h1 className={isJersey ? "mt-3 max-w-xl text-[30px] font-semibold leading-[1.12] tracking-[-0.015em] sm:text-[40px]" : "mt-2 max-w-xl text-2xl font-semibold leading-[1.15] tracking-[-0.02em] lg:text-[28px]"}>
                  {product.nama}
                </h1>

                {product.short_detail ? (
                  <p className={isJersey ? "mt-4 max-w-xl text-base leading-7 text-brand-charcoal/60 sm:text-lg" : "public-secondary-copy mt-4 max-w-xl text-[15px] leading-6 md:text-base"}>
                    {product.short_detail}
                  </p>
                ) : null}

                <div className="mt-5 flex flex-wrap items-baseline gap-3">
                  <p className={isJersey ? "text-xl font-semibold sm:text-2xl" : "text-[17px] font-semibold leading-6 md:text-lg"}>
                    {priceLabel}
                  </p>
                  <span className="text-sm text-brand-charcoal/50">
                    / pcs harga awal
                  </span>
                  {product.compare_price ? (
                    <p className="text-base text-brand-charcoal/40 line-through">
                      {formatRupiah(product.compare_price)}
                    </p>
                  ) : null}
                </div>

                <p className={isJersey ? "mt-2 text-sm leading-6 text-brand-charcoal/55" : "public-muted-copy mt-2 text-sm leading-6"}>
                  Harga akhir berubah otomatis mengikuti jumlah pesanan.
                </p>

                {showPurchasePanel ? (
                  <TieredProductPurchasePanel
                    product={{
                      id: product.id || product.slug || product.nama,
                      name: product.nama,
                      category: product.kategori,
                      priceLabel,
                      priceValue:
                        Number(
                          product.price ??
                            product.harga ??
                            product.base_price ??
                            0
                        ) || undefined,
                      href: detailHref,
                      imageUrl: getProductImage(product),
                      imageAlt: product.image_alt || product.nama,
                      sku: product.sku || undefined
                    }}
                    colors={variantColors(product)}
                    sizes={variantSizes(product)}
                    sizeGuide={sizeGuideForProduct(product)}
                    bulkOrderNote={product.bulk_order_note}
                    whatsappUrl={whatsappUrl}
                    variants={product.variants}
                    showBuyNow={isJersey && hasReadyStock}
                    monochrome={isJersey}
                  />
                ) : (
                  <section className="mt-7 border-y border-black/10 py-6">
                    <h2 className="text-xl font-bold">Jersey Custom</h2>
                    <p className="mt-2 text-sm leading-6 text-black/60">
                      Produk ini disiapkan melalui Jersey Configurator agar model, bahan, warna, logo, nama, nomor, dan jumlah pemain tercatat dalam satu alur.
                    </p>
                    <Link
                      href="/jersey/configurator"
                      className="mt-5 inline-flex min-h-12 items-center justify-center rounded-full bg-black px-6 text-sm font-semibold text-white outline-none transition hover:bg-black/75 focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                    >
                      Mulai Konfigurasi Jersey
                    </Link>
                  </section>
                )}

                {isJersey && hasReadyStock && hasCustomAvailability ? (
                  <Link
                    href="/jersey/configurator"
                    className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-black underline decoration-1 underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                  >
                    Atau buat Jersey Custom
                  </Link>
                ) : null}

                {customDestination ? (
                  <Link href={customDestination} className="mt-4 inline-flex min-h-11 items-center rounded-full border border-black px-5 text-sm font-semibold transition hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
                    Custom produk ini
                  </Link>
                ) : null}

                <div className={isJersey ? "mt-8 p-4 border-t border-black/10 bg-white" : "public-divider mt-8 border-t py-6"}>
                  <h2 className="text-base font-semibold">Deskripsi</h2>
                  <p className={isJersey ? "mt-3 whitespace-pre-line text-sm leading-7 text-brand-charcoal/60" : "public-secondary-copy mt-3 whitespace-pre-line text-[15px] leading-6 md:text-base"}>
                    {product.description ||
                      product.deskripsi ||
                      "Informasi lengkap produk dapat dikonsultasikan melalui WhatsApp."}
                  </p>
                </div>

                {product.specifications?.length ? (
                  <div className={isJersey ? "mt-4 p-4 border-t border-black/10 bg-white" : "public-divider border-t py-6"}>
                    <h2 className="text-base font-semibold">
                      Spesifikasi
                    </h2>
                    <dl className="mt-3 divide-y divide-black/5">
                      {product.specifications.map((item) => {
                        const [key, ...rest] = item.split(":");
                        return (
                          <div
                            key={item}
                            className="grid gap-1 py-3 text-sm sm:grid-cols-[120px_1fr] sm:gap-3"
                          >
                            <dt className="font-semibold">
                              {rest.length ? key : "Detail"}
                            </dt>
                            <dd className="text-brand-charcoal/60">
                              {rest.length
                                ? rest.join(":").trim()
                                : item}
                            </dd>
                          </div>
                        );
                      })}
                    </dl>
                  </div>
                ) : null}
              </div>
            </div>
          </ProductVariantGalleryProvider>
        </div>
      </main>
      {!isJersey && relatedProducts.length ? (
        <section className="bg-white py-12 md:py-16 lg:py-20" aria-labelledby="related-products-title">
          <div className="section-shell">
            <h2 id="related-products-title" className="public-section-title">
              Rekomendasi
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-8 md:mt-6 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-10">
              {relatedProducts.map((item) => (
                <PublicProductCard
                  key={item.id || item.slug || item.nama}
                  product={item}
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </PublicShell>
  );
}
