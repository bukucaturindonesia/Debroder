import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { JerseyCommerceNav } from "@/components/jersey/JerseyCommerceNav";
import { ProductGallery } from "@/components/ProductGallery";
import { TieredProductPurchasePanel } from "@/components/TieredProductPurchasePanel";
import { ProductVariantGalleryProvider } from "@/components/ProductVariantGalleryContext";
import { ProductDetailDisclosure } from "@/components/product/ProductDetailDisclosure";
import { ProductRecommendationRail } from "@/components/product/ProductRecommendationRail";
import { ProductStickyPurchasePanel } from "@/components/product/ProductStickyPurchasePanel";
import { PublicShell } from "@/components/PublicPage";
import { getProductDetailPageModel } from "@/lib/product-detail-page/runtime";

type PageProps = {
  params: Promise<{ slug: string }>;
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

function SpecificationList({ specifications }: { specifications: string[] }) {
  return (
    <dl className="divide-y divide-[#e5e5e5]">
      {specifications.map((item) => {
        const [key, ...rest] = item.split(":");
        return (
          <div
            key={item}
            className="grid gap-1 py-3 text-sm sm:grid-cols-[140px_1fr] sm:gap-4"
          >
            <dt className="font-semibold text-[#111111]">
              {rest.length ? key : "Detail"}
            </dt>
            <dd>{rest.length ? rest.join(":").trim() : item}</dd>
          </div>
        );
      })}
    </dl>
  );
}

function SizeGuideList({ rows }: { rows: string[] }) {
  return (
    <div className="divide-y divide-[#e5e5e5]">
      {rows.map((row, index) => {
        const [label, ...rest] = row.split(":");
        return (
          <div
            key={`${row}-${index}`}
            className="grid gap-1 py-3 text-sm sm:grid-cols-[140px_1fr] sm:gap-4"
          >
            <p className="font-semibold text-[#111111]">
              {rest.length ? label.trim() : `Panduan ${index + 1}`}
            </p>
            <p>{rest.length ? rest.join(":").trim() : row.trim()}</p>
          </div>
        );
      })}
    </div>
  );
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const model = await getProductDetailPageModel(slug);
  if (model.data.state === "not_found") notFound();

  const {
    product,
    relatedProducts,
    images,
    focal,
    priceLabel,
    detailHref,
    isJersey,
    purchaseCapabilities,
    customDestination,
    sizeGuide
  } = model.data;

  if (!product) {
    return (
      <PublicShell>
        <section className="bg-white py-16">
          <div className="section-shell">
            <h1 className="text-2xl font-semibold">Produk belum dapat dimuat</h1>
            <p className="mt-3 text-sm text-black/60">
              Silakan muat ulang halaman atau coba kembali beberapa saat lagi.
            </p>
          </div>
        </section>
      </PublicShell>
    );
  }

  const productDescription = (product.description || product.deskripsi || "").trim();
  const purchaseDescription = (
    product.short_detail
    || product.public_description
    || ""
  ).trim();
  const productSpecifications = product.specifications || [];
  const jerseyConfiguratorHref = `/jersey/configurator?product=${encodeURIComponent(product.slug || slug)}`;
  const customActionHref = purchaseCapabilities.showCustomAction
    ? isJersey
      ? jerseyConfiguratorHref
      : customDestination
    : null;
  const hasProductInformation = Boolean(
    productDescription
    || productSpecifications.length
    || sizeGuide.length
  );

  return (
    <PublicShell theme={isJersey ? "jersey-commerce" : "default"}>
      {isJersey ? (
        <Suspense fallback={<div className="h-14 border-b border-black/10 bg-white" />}>
          <JerseyCommerceNav />
        </Suspense>
      ) : null}

      <section data-pdp-primary className="overflow-x-clip bg-white pb-12 pt-6 sm:pb-16 sm:pt-8 lg:pb-20 lg:pt-10">
        <div className="section-shell">
          <nav
            aria-label="Breadcrumb"
            className="mb-5 flex flex-wrap items-center gap-2 text-xs font-medium text-brand-charcoal/55"
          >
            <Link href="/">Beranda</Link>
            <span aria-hidden="true">/</span>
            <Link href={isJersey ? "/jersey/shop" : "/koleksi"}>
              {isJersey ? "Jersey" : "Koleksi"}
            </Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{product.nama}</span>
          </nav>

          <ProductVariantGalleryProvider
            baseImages={images}
            variants={product.variants || []}
          >
            <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.16fr)_minmax(360px,0.84fr)] lg:gap-12 xl:gap-16">
              <div data-pdp-media className="min-w-0 lg:self-stretch">
                <ProductStickyPurchasePanel>
                  <ProductGallery
                    images={images}
                    alt={product.image_alt || product.nama}
                    focal={focal}
                  />
                </ProductStickyPurchasePanel>
              </div>

              <div data-pdp-purchase-column className="min-w-0">
                {purchaseCapabilities.showPurchasePanel ? (
                  <TieredProductPurchasePanel
                    product={{
                      id: product.id,
                      name: product.nama,
                      category: product.kategori,
                      priceLabel,
                      href: detailHref,
                      imageUrl: images[0],
                      imageAlt: product.image_alt || product.nama,
                      sku: product.sku || undefined
                    }}
                    subcategory={product.subcategory}
                    description={purchaseDescription}
                    minimumQuantity={product.minimum_order_qty}
                    variants={product.variants}
                    showAddToCart={purchaseCapabilities.showAddToCart}
                    showBuyNow={purchaseCapabilities.showBuyNow}
                    customActionHref={customActionHref}
                    monochrome={isJersey}
                  />
                ) : (
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-charcoal/50">
                      {[product.kategori, product.subcategory].filter(Boolean).join(" · ")}
                    </p>
                    <h1 className="mt-3 max-w-xl text-[30px] font-semibold leading-[1.1] tracking-[-0.025em] sm:text-[40px]">
                      {product.nama}
                    </h1>
                    <p className="mt-4 text-2xl font-semibold">{priceLabel}</p>
                    {purchaseDescription ? (
                      <p className="mt-5 max-w-xl text-[15px] leading-6 text-brand-charcoal/65">
                        {purchaseDescription}
                      </p>
                    ) : null}

                    {isJersey ? (
                      <section className="mt-8 border-y border-black/10 py-6">
                        <h2 className="text-xl font-semibold">Jersey Custom</h2>
                        <p className="mt-2 text-sm leading-6 text-black/60">
                          Lengkapi model, bahan, desain, logo, nama, nomor, dan jumlah pemain melalui Jersey Configurator.
                        </p>
                        <Link
                          href={jerseyConfiguratorHref}
                          className="mt-5 inline-flex min-h-12 items-center justify-center rounded-full bg-black px-6 text-sm font-semibold text-white outline-none transition hover:bg-black/75 focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                        >
                          Mulai Desain Jersey
                        </Link>
                      </section>
                    ) : customDestination ? (
                      <section className="mt-8 border-y border-black/10 py-6">
                        <h2 className="text-xl font-semibold">Pesanan Custom</h2>
                        <p className="mt-2 text-sm leading-6 text-black/60">
                          Pilih kebutuhan Custom agar spesifikasi pesanan tercatat dengan jelas.
                        </p>
                        <Link
                          href={customDestination}
                          className="mt-5 inline-flex min-h-12 items-center justify-center rounded-full bg-black px-6 text-sm font-semibold text-white outline-none transition hover:bg-black/75 focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                        >
                          Mulai Custom
                        </Link>
                      </section>
                    ) : (
                      <p className="mt-8 border-y border-black/10 py-6 text-sm text-black/60">
                        Produk ini belum dapat dipesan. Pilih produk lain dari Koleksi.
                      </p>
                    )}
                  </div>
                )}

                {hasProductInformation ? (
                  <section
                    className="mt-10 border-b border-[#e5e5e5]"
                    aria-labelledby="product-information-title"
                  >
                    <h2 id="product-information-title" className="mb-3 text-xl font-semibold tracking-[-0.015em]">
                      Informasi Produk
                    </h2>
                    {productDescription ? (
                      <ProductDetailDisclosure id="product-description" title="Deskripsi Produk">
                        <p className="whitespace-pre-line">{productDescription}</p>
                      </ProductDetailDisclosure>
                    ) : null}
                    {productSpecifications.length ? (
                      <ProductDetailDisclosure id="product-specifications" title="Material & Detail">
                        <SpecificationList specifications={productSpecifications} />
                      </ProductDetailDisclosure>
                    ) : null}
                    {sizeGuide.length ? (
                      <ProductDetailDisclosure id="product-size-guide" title="Panduan Ukuran">
                        <SizeGuideList rows={sizeGuide} />
                      </ProductDetailDisclosure>
                    ) : null}
                  </section>
                ) : null}
              </div>
            </div>
          </ProductVariantGalleryProvider>
        </div>
      </section>

      {/*
        "Dipakai Pelanggan" and "Lengkapi Penampilan" intentionally remain
        hidden until verified, rights-cleared UGC or an approved canonical
        complementary-product relationship is present in the PDP model.
      */}
      {!isJersey && relatedProducts.length ? (
        <ProductRecommendationRail title="Produk Serupa" products={relatedProducts} />
      ) : null}
    </PublicShell>
  );
}
