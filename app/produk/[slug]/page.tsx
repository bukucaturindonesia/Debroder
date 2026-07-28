import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { JerseyCommerceNav } from "@/components/jersey/JerseyCommerceNav";
import { ProductGallery } from "@/components/ProductGallery";
import { PublicProductCard } from "@/components/PublicProductCard";
import { TieredProductPurchasePanel } from "@/components/TieredProductPurchasePanel";
import { ProductVariantGalleryProvider } from "@/components/ProductVariantGalleryContext";
import { ProductDetailDisclosure } from "@/components/product/ProductDetailDisclosure";
import { PublicShell } from "@/components/PublicPage";
import { getProductImage } from "@/lib/fallback-data";
import { getProductDetailPageModel } from "@/lib/product-detail-page/runtime";
import { listInstantServicesForProduct } from "@/lib/instant-custom-data";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ mode?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const model = await getProductDetailPageModel(slug);
  const metadata = model.metadata;

  return {
    title: metadata.title,
    description: metadata.description,
    alternates: metadata.canonicalPath ? { canonical: metadata.canonicalPath } : undefined,
    robots: metadata.robots === "noindex_follow"
      ? { index: false, follow: true }
      : metadata.robots === "noindex_nofollow"
        ? { index: false, follow: false }
        : undefined,
    openGraph: metadata.socialImage
      ? {
          title: metadata.title,
          description: metadata.description,
          images: [{ url: metadata.socialImage.src, alt: metadata.socialImage.alt }]
        }
      : undefined
  };
}

export default async function ProductDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const model = await getProductDetailPageModel(slug);
  if (model.data.state === "not_found") notFound();

  const {
    product,
    relatedProducts,
    images,
    focal,
    whatsappUrl,
    detailHref,
    isJersey,
    purchaseCapabilities,
    customDestination,
    colors,
    sizes,
    sizeGuide
  } = model.data;

  if (!product) {
    return (
      <PublicShell>
        <section className="bg-white py-16">
          <div className="section-shell">
            <h1 className="text-2xl font-semibold">Produk belum dapat dimuat</h1>
            <p className="mt-3 text-sm text-black/60">Silakan muat ulang halaman atau coba kembali beberapa saat lagi.</p>
          </div>
        </section>
      </PublicShell>
    );
  }
  const instantServices = product.id && product.product_category_id
    ? await listInstantServicesForProduct(product.id, product.product_category_id)
    : [];
  const requestedMode = (await searchParams)?.mode;
  const productDescription = (product.description || product.deskripsi || "").trim();
  const productSpecifications = product.specifications || [];

  return (
    <PublicShell
      theme={isJersey ? "jersey-commerce" : "default"}
    >
      {isJersey ? (
        <Suspense fallback={<div className="h-14 border-b border-black/10 bg-white" />}>
          <JerseyCommerceNav />
        </Suspense>
      ) : null}
      <section
        data-pdp-primary
        className={isJersey ? "bg-white py-8 sm:py-12" : "bg-white py-8 sm:py-12 lg:py-16"}
      >
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
            <div className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,1.18fr)_minmax(360px,0.72fr)] lg:gap-10 xl:gap-14">
              <div
                data-pdp-sticky-media
                className="min-w-0 lg:sticky lg:top-24 lg:self-start"
              >
                <ProductGallery
                  images={images}
                  alt={product.image_alt || product.nama}
                  focal={focal}
                />
              </div>

              <div
                data-pdp-product-details
                className={isJersey ? "min-w-0 self-start border-t border-black/10 bg-white p-5 sm:p-7" : "min-w-0 self-start"}
              >
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

                <p className={isJersey ? "mt-5 text-sm leading-6 text-brand-charcoal/55" : "public-muted-copy mt-5 text-sm leading-6"}>
                  Harga pasti tampil setelah varian, ukuran, jumlah, dan layanan tervalidasi oleh server.
                </p>

                {purchaseCapabilities.showPurchasePanel ? (
                  <TieredProductPurchasePanel
                    product={{
                      id: product.id,
                      name: product.nama,
                      category: product.kategori,
                      href: detailHref,
                      imageUrl: getProductImage(product),
                      imageAlt: product.image_alt || product.nama,
                      sku: product.sku || undefined
                    }}
                    colors={colors}
                    sizes={sizes}
                    sizeGuide={sizeGuide}
                    bulkOrderNote={product.bulk_order_note}
                    whatsappUrl={whatsappUrl}
                    variants={product.variants}
                    showAddToCart={purchaseCapabilities.showAddToCart}
                    showBuyNow={purchaseCapabilities.showBuyNow}
                    monochrome={isJersey}
                    instantServices={instantServices}
                    initialInstantMode={requestedMode === "instant"}
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

                {isJersey && purchaseCapabilities.showBuyNow && purchaseCapabilities.showCustomAction ? (
                  <Link
                    href="/jersey/configurator"
                    className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-black underline decoration-1 underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                  >
                    Full Custom Jersey melalui Configurator
                  </Link>
                ) : null}

                {purchaseCapabilities.showCustomAction && customDestination ? (
                  <Link href={customDestination} className="mt-4 inline-flex min-h-11 items-center rounded-full border border-black px-5 text-sm font-semibold transition hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
                    Custom produk ini
                  </Link>
                ) : null}

                {productDescription || productSpecifications.length ? (
                  <div className="mt-8 border-b border-[#e5e5e5]">
                    <p className="mb-2 text-sm font-semibold text-[#111111]">
                      Lihat Detail Produk
                    </p>
                    {productDescription ? (
                      <ProductDetailDisclosure
                        id="product-description"
                        title="Deskripsi Produk"
                      >
                        <p className="whitespace-pre-line">{productDescription}</p>
                      </ProductDetailDisclosure>
                    ) : null}
                    {productSpecifications.length ? (
                      <ProductDetailDisclosure
                        id="product-specifications"
                        title="Material & Detail"
                      >
                        <dl className="divide-y divide-[#e5e5e5]">
                          {productSpecifications.map((item) => {
                            const [key, ...rest] = item.split(":");
                            return (
                              <div
                                key={item}
                                className="grid gap-1 py-3 text-sm sm:grid-cols-[120px_1fr] sm:gap-3"
                              >
                                <dt className="font-semibold text-[#111111]">
                                  {rest.length ? key : "Detail"}
                                </dt>
                                <dd>
                                  {rest.length
                                    ? rest.join(":").trim()
                                    : item}
                                </dd>
                              </div>
                            );
                          })}
                        </dl>
                      </ProductDetailDisclosure>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </ProductVariantGalleryProvider>
        </div>
      </section>
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
