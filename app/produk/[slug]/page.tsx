import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { JerseyCommerceNav } from "@/components/jersey/JerseyCommerceNav";
import { ProductGallery } from "@/components/ProductGallery";
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
      <main className={`${isJersey ? "bg-white" : "bg-brand-offWhite"} py-8 sm:py-12`}>
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

              <div className={`self-start p-5 sm:p-7 lg:sticky lg:top-24 ${isJersey ? "border-t border-black/10 bg-white" : "rounded-[32px] bg-white/40"}`}>
                <p className="text-xs font-semibold uppercase tracking-[.16em] text-brand-charcoal/50">
                  {product.kategori}
                  {product.subcategory
                    ? ` · ${product.subcategory}`
                    : ""}
                </p>

                <h1 className="mt-3 max-w-xl text-[30px] font-semibold leading-[1.12] tracking-[-0.015em] sm:text-[40px]">
                  {product.nama}
                </h1>

                {product.short_detail ? (
                  <p className="mt-4 max-w-xl text-base leading-7 text-brand-charcoal/60 sm:text-lg">
                    {product.short_detail}
                  </p>
                ) : null}

                <div className="mt-5 flex flex-wrap items-baseline gap-3">
                  <p className="text-xl font-semibold sm:text-2xl">
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

                <p className="mt-2 text-sm leading-6 text-brand-charcoal/55">
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

                <div className={`mt-8 p-4 ${isJersey ? "border-t border-black/10 bg-white" : "rounded-[24px] bg-white/50"}`}>
                  <h2 className="text-base font-semibold">Deskripsi</h2>
                  <p className="mt-3 whitespace-pre-line text-sm leading-7 text-brand-charcoal/60">
                    {product.description ||
                      product.deskripsi ||
                      "Informasi lengkap produk dapat dikonsultasikan melalui WhatsApp."}
                  </p>
                </div>

                {product.specifications?.length ? (
                  <div className={`mt-4 p-4 ${isJersey ? "border-t border-black/10 bg-white" : "rounded-[24px] bg-white/50"}`}>
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
    </PublicShell>
  );
}
