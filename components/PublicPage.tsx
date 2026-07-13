import Link from "next/link";
import type { ReactNode } from "react";
import { PageMotion } from "@/components/PageMotion";
import { ProductCatalog } from "@/components/ProductCatalog";
import { ProductImageSwap } from "@/components/ProductImageSwap";
import { PublicFooter } from "@/components/PublicFooter";
import { ResponsivePicture } from "@/components/ResponsivePicture";
import { SafeImage } from "@/components/SafeImage";
import { SiteHeader } from "@/components/SiteHeader";
import {
  fallbackImages,
  getPageHeroImage,
  getStoreImage
} from "@/lib/fallback-data";
import { getProductCardImages } from "@/lib/product-gallery";
import type {
  PageHeroContent,
  Product,
  PublicContent,
  ServiceCategory,
  Store
} from "@/lib/types";
import { formatRupiah, whatsappLinkWithMessage } from "@/lib/url";

function PublicImage({
  src,
  alt,
  className,
  sizes = "(min-width: 1024px) 33vw, 100vw",
  priority = false,
  objectPosition = "center center",
  objectFit = "cover",
  fallbackSrc = fallbackImages.product,
  focalX,
  focalY,
  zoom
}: {
  src?: string;
  alt: string;
  className: string;
  sizes?: string;
  priority?: boolean;
  objectPosition?: string;
  objectFit?: "cover" | "contain";
  fallbackSrc?: string;
  focalX?: number | null;
  focalY?: number | null;
  zoom?: number | null;
}) {
  const imageSrc = src || fallbackImages.product;

  return (
    <SafeImage
      src={imageSrc}
      fallbackSrc={fallbackSrc}
      alt={alt}
      className={className}
      sizes={sizes}
      priority={priority}
      objectPosition={objectPosition}
      objectFit={objectFit}
      focalX={focalX}
      focalY={focalY}
      zoom={zoom}
    />
  );
}

function getProductDetail(product: Product) {
  return product.short_detail || product.description || product.deskripsi;
}

function getProductPrice(product: Product) {
  return formatRupiah(
    product.price ?? product.harga ?? product.base_price ?? product.price_label
  );
}

function normalizeFilterValue(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
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

function productColors(product: Product) {
  const variantColors = (product.variants || [])
    .map((variant) => variant.color_name || variant.variant_name)
    .filter(Boolean) as string[];
  return variantColors.length ? Array.from(new Set(variantColors)) : (product.color_tags || []);
}

function productMetaLine(product: Product) {
  const colors = productColors(product);
  const items = [
    colors.length ? `${colors.length} Warna` : "",
    product.size_tags?.[0] || "",
    product.material_tags?.[0] || ""
  ].filter(Boolean);
  return items.slice(0, 3).join(" · ");
}

function productModel(product: Product) {
  return [product.kategori, product.subcategory].filter(Boolean).join(" · ");
}

function findPageHero(
  pageHeroes: PageHeroContent[] | undefined,
  pageKey?: string
) {
  if (!pageKey) return null;
  return pageHeroes?.find((hero) => hero.page_key === pageKey) || null;
}


function cleanDisplayText(value?: string | null) {
  const text = (value || "").trim();
  if (!text || text === "." || text === "-" || text === "—") return "";
  return text;
}

function actionHref(href?: string, message?: string) {
  if (!href) return undefined;
  if (href.includes("wa.me") || href.includes("whatsapp")) {
    return whatsappLinkWithMessage(
      href,
      message || "Halo DE BRODER, saya ingin bertanya tentang layanan DE BRODER."
    );
  }
  return href;
}

export function PageHero({
  label,
  title,
  description,
  imageUrl,
  mobileImageUrl,
  objectPosition,
  mobileObjectPosition,
  objectFit = "cover",
  imageZoom,
  mobileImageZoom,
  ctaText,
  ctaHref,
  secondaryCtaText,
  secondaryCtaHref,
  breadcrumbs
}: {
  label?: string | null;
  title?: string | null;
  description?: string | null;
  imageUrl?: string;
  mobileImageUrl?: string;
  objectPosition?: string;
  mobileObjectPosition?: string;
  objectFit?: "cover" | "contain";
  imageZoom?: number | null;
  mobileImageZoom?: number | null;
  ctaText?: string;
  ctaHref?: string;
  secondaryCtaText?: string;
  secondaryCtaHref?: string;
  breadcrumbs?: { label: string; href?: string }[];
}) {
  const cleanLabel = cleanDisplayText(label);
  const cleanTitle = cleanDisplayText(title);
  const cleanDescription = cleanDisplayText(description);
  const cleanCtaText = cleanDisplayText(ctaText);
  const cleanSecondaryCtaText = cleanDisplayText(secondaryCtaText);
  const primaryHref = cleanCtaText ? actionHref(ctaHref) : undefined;
  const hasCopy = Boolean(cleanLabel || cleanTitle || cleanDescription || primaryHref || (cleanSecondaryCtaText && secondaryCtaHref));
  const desktopImage = imageUrl || fallbackImages.pageHero;
  const mobileImage = mobileImageUrl || desktopImage;

  return (
    <section data-reveal className="bg-brand-offWhite">
      <div className="relative w-full overflow-hidden bg-brand-offWhite sm:aspect-[16/5] sm:min-h-[260px] lg:aspect-[16/4.5]">
        <div className="relative aspect-[4/5] w-full sm:absolute sm:inset-0 sm:aspect-auto">
          <ResponsivePicture
            desktopSrc={desktopImage}
            mobileSrc={mobileImage}
            alt={cleanTitle || cleanLabel || "Hero DEBRODER"}
            className="h-full w-full object-cover"
            priority
            desktopObjectPosition={objectPosition}
            mobileObjectPosition={mobileObjectPosition || objectPosition}
            fallbackSrc={fallbackImages.pageHero}
            objectFit={objectFit}
            desktopZoom={imageZoom}
            mobileZoom={mobileImageZoom}
          />
          {hasCopy ? <div className="absolute inset-x-0 bottom-0 hidden h-[52%] bg-gradient-to-t from-black/48 via-black/14 to-transparent sm:block" /> : null}
        </div>
        {hasCopy ? <div className="hero-content relative mx-auto px-4 py-6 text-center text-brand-charcoal sm:absolute sm:bottom-8 sm:left-1/2 sm:right-auto sm:w-full sm:max-w-[1120px] sm:-translate-x-1/2 sm:p-0 sm:text-white lg:bottom-10">
          {breadcrumbs?.length ? (
            <nav
              aria-label="Breadcrumb"
              className="mb-3 flex flex-wrap justify-center gap-2 text-xs font-medium text-brand-charcoal/50 sm:text-white/70"
            >
              {breadcrumbs.map((item, index) => (
                <span key={`${item.label}-${index}`} className="flex gap-2">
                  {item.href ? (
                    <Link href={item.href} className="hover:text-brand-charcoal sm:hover:text-white">
                      {item.label}
                    </Link>
                  ) : (
                    <span>{item.label}</span>
                  )}
                  {index < breadcrumbs.length - 1 ? <span>/</span> : null}
                </span>
              ))}
            </nav>
          ) : null}
          {cleanLabel ? (
            <p className="mx-auto w-fit bg-brand-charcoal px-3 py-1 text-center text-[15px] font-medium uppercase leading-5 text-white sm:bg-white sm:text-brand-charcoal">
              {cleanLabel}
            </p>
          ) : null}
          {cleanTitle ? (
            <h1 className="hero-title mx-auto mt-2 max-w-[min(92vw,1080px)] text-center text-[clamp(42px,12vw,52px)] sm:text-[64px] lg:text-[clamp(64px,5.5vw,88px)]">
              {cleanTitle}
            </h1>
          ) : null}
          {cleanDescription ? (
            <p className="hero-subtitle mt-3 max-w-[680px] text-center text-[17px] leading-[1.45] text-brand-charcoal/70 sm:text-xl sm:text-white/85">
              {cleanDescription}
            </p>
          ) : null}
          {primaryHref ? (
            <div className="hero-actions mt-5 flex flex-col justify-center gap-3 sm:flex-row">
              <a
                href={primaryHref}
                className="cta inline-flex min-h-11 items-center justify-center rounded-full bg-brand-charcoal px-6 py-3 text-sm text-white transition hover:bg-black/80 sm:bg-white sm:text-brand-charcoal sm:hover:bg-brand-offWhite"
                target={primaryHref.startsWith("http") ? "_blank" : undefined}
                rel={
                  primaryHref.startsWith("http")
                    ? "noopener noreferrer"
                    : undefined
                }
              >
                {cleanCtaText}
              </a>
              {cleanSecondaryCtaText && secondaryCtaHref ? (
                <Link
                  href={secondaryCtaHref}
                  className="cta inline-flex min-h-11 items-center justify-center rounded-full border border-brand-softGray px-6 py-3 text-sm text-brand-charcoal transition hover:border-brand-charcoal sm:border-white/40 sm:text-white sm:hover:bg-white sm:hover:text-brand-charcoal"
                >
                  {cleanSecondaryCtaText}
                </Link>
              ) : null}
            </div>
          ) : null}
        </div> : null}
      </div>
    </section>
  );
}

export function ServiceCard({ service }: { service: ServiceCategory }) {
  const href = `/${service.link_slug.replace(/^\/+/, "") || "koleksi"}`;

  return (
    <Link href={href} className="group block">
      <article className="bg-transparent">
        <PublicImage
          src={service.gambar_url}
          alt={service.image_alt || service.nama_kategori}
          className="aspect-[4/5] w-full object-cover"
          objectPosition={service.object_position}
          objectFit={service.object_fit}
          focalX={service.focal_x}
          focalY={service.focal_y}
          zoom={service.focal_zoom}
        />
        <h2 className="mt-4 text-xl font-semibold text-brand-charcoal">
          {service.nama_kategori}
        </h2>
        <p className="mt-2 text-sm leading-6 text-brand-charcoal/60">
          {service.deskripsi}
        </p>
        <span className="mt-4 inline-flex text-sm font-semibold text-brand-charcoal underline-offset-4 group-hover:underline">
          Lihat Detail
        </span>
      </article>
    </Link>
  );
}

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-2 gap-y-6 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => {
        const price = getProductPrice(product);
        const cardImages = getProductCardImages(product);
        const whatsappHref = whatsappLinkWithMessage(
          product.whatsapp_link || "",
          `Halo DE BRODER, saya ingin bertanya tentang ${product.nama}.`
        );

        return (
          <article key={product.nama} className="bg-transparent">
            <div className="group">
              <ProductImageSwap
                primarySrc={cardImages.primary}
                hoverSrc={cardImages.hover}
                fallbackSrc={fallbackImages.product}
                alt={product.image_alt || product.nama}
                imageClassName={(product.object_fit || "cover") === "contain" ? "object-contain p-3" : "object-cover"}
                objectPosition={product.object_position || "center center"}
                objectFit={product.object_fit || "cover"}
                focalX={product.focal_points?.catalog?.focal_x ?? product.focal_x}
                focalY={product.focal_points?.catalog?.focal_y ?? product.focal_y}
                zoom={product.focal_points?.catalog?.zoom ?? product.focal_zoom}
                sizes="(min-width: 1024px) 25vw, 50vw"
              />
            </div>
            <div className="mt-3 space-y-2">
              {productColors(product).length ? (
                <div className="flex items-center gap-1.5">
                  {productColors(product).slice(0, 8).map((color) => (
                    <span
                      key={color}
                      title={color}
                      className="h-3.5 w-3.5 rounded-full border border-black/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.45)]"
                      style={{ backgroundColor: colorHex(color) }}
                    />
                  ))}
                </div>
              ) : null}
              {productMetaLine(product) ? (
                <p className="text-[11px] font-medium tracking-[0.01em] text-brand-charcoal/55 sm:text-xs">{productMetaLine(product)}</p>
              ) : null}
              <h2 className="line-clamp-2 text-[15px] font-semibold leading-[1.22] tracking-[-0.01em] text-brand-charcoal sm:text-[17px]">
                {product.nama}
              </h2>
              {productModel(product) ? (
                <p className="text-xs leading-5 text-brand-charcoal/50 sm:text-[13px]">{productModel(product)}</p>
              ) : null}
              {getProductDetail(product) ? (
                <p className="line-clamp-2 min-h-[2.5rem] text-xs leading-5 text-brand-charcoal/60 sm:text-sm sm:leading-6">
                  {getProductDetail(product)}
                </p>
              ) : null}
              {price ? (
                <p className="product-price text-[15px] text-brand-charcoal sm:text-[17px]">
                  {price}
                </p>
              ) : null}
            </div>
            <a
              href={whatsappHref}
              className="mt-4 inline-flex min-h-10 w-full items-center justify-center bg-brand-green px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-charcoal sm:px-5 sm:text-sm"
              target="_blank"
              rel="noopener noreferrer"
            >
              Pesan Sekarang
            </a>
          </article>
        );
      })}
    </div>
  );
}

export function StoreGrid({ stores }: { stores: Store[] }) {
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
      {stores.map((store) => {
        const whatsappHref = whatsappLinkWithMessage(
          store.whatsapp_link || store.whatsapp || "",
          `Halo DE BRODER, saya ingin bertanya tentang layanan di Store ${store.nama_store}.`
        );

        return (
          <article
            key={store.nama_store}
            className="flex flex-col bg-transparent py-4"
          >
            <PublicImage
              src={getStoreImage(store)}
              alt={store.image_alt || `Foto ${store.nama_store} DE BRODER`}
              className="product-image-frame aspect-[4/3] w-full object-cover"
              fallbackSrc={fallbackImages.store}
            />
            <p className="mt-4 text-sm font-medium text-brand-charcoal/70">
              {store.layanan_utama}
            </p>
            <h2 className="mt-2 text-xl font-semibold text-brand-charcoal">
              {store.nama_store}
            </h2>
            <p className="mt-2 text-sm leading-6 text-brand-charcoal/60">
              {store.alamat}
            </p>
            <div className="mt-5 grid gap-3">
              <a
                href={whatsappHref}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand-charcoal px-5 py-3 text-sm font-semibold text-white transition hover:bg-black/80"
                target="_blank"
                rel="noopener noreferrer"
              >
                Hubungi
              </a>
              <a
                href={store.maps_link}
                className="premium-ghost-button inline-flex min-h-11 items-center justify-center rounded-full border px-5 py-3 text-sm font-semibold text-brand-charcoal transition"
                target="_blank"
                rel="noopener noreferrer"
              >
                Lihat Lokasi
              </a>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function OrderTimeline({
  steps
}: {
  steps: Array<string | { title: string; description?: string }>;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-5">
      {steps.map((step, index) => {
        const title = typeof step === "string" ? step : step.title;
        const description = typeof step === "string" ? "" : step.description;

        return (
          <article key={title} className="p-5">
            <span className="text-sm font-semibold text-brand-charcoal/50">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h2 className="mt-5 text-lg font-semibold leading-6 text-brand-charcoal">
              {title}
            </h2>
            {description ? (
              <p className="mt-3 text-sm leading-6 text-brand-charcoal/60">
                {description}
              </p>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

export function RecommendationGrid({
  services,
  currentSlug
}: {
  services: ServiceCategory[];
  currentSlug?: string;
}) {
  return (
    <section data-reveal className="bg-brand-offWhite py-10 sm:py-12">
      <div className="section-shell">
        <div className="max-w-3xl">
          <p className="text-sm font-medium uppercase text-brand-charcoal/50">
            Rekomendasi
          </p>
          <h2 className="section-title mt-3">
            Layanan DE BRODER lainnya
          </h2>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-2 md:grid-cols-3">
          {services
            .filter((service) => service.link_slug !== currentSlug)
            .slice(0, 3)
            .map((service) => (
              <ServiceCard key={service.nama_kategori} service={service} />
            ))}
        </div>
      </div>
    </section>
  );
}

export function CategoryDetailPage({
  content,
  label,
  title,
  description,
  details,
  visualLabel,
  ctaText,
  ctaHref,
  currentSlug,
  products = [],
  productTitle
}: {
  content: PublicContent;
  label?: string | null;
  title?: string | null;
  description?: string | null;
  details: string[];
  visualLabel: string;
  ctaText: string;
  ctaHref: string;
  currentSlug: string;
  products?: Product[];
  productTitle?: string;
}) {
  const pageHero = findPageHero(content.pageHeroes, currentSlug);

  return (
    <PublicShell content={content}>
      <PageHero
        label={pageHero?.label}
        title={pageHero?.title}
        description={pageHero?.subtitle}
        imageUrl={getPageHeroImage(pageHero)}
        mobileImageUrl={pageHero?.mobile_image_url}
        objectPosition={pageHero?.object_position}
        mobileObjectPosition={pageHero?.mobile_object_position}
        objectFit={pageHero?.object_fit}
        ctaText={undefined}
        ctaHref={undefined}
        secondaryCtaText={undefined}
        secondaryCtaHref={undefined}
        breadcrumbs={[
          { label: "Beranda", href: "/" },
          { label: "Koleksi", href: "/koleksi" },
          { label: cleanDisplayText(title) || cleanDisplayText(pageHero?.title) || cleanDisplayText(label) || "Koleksi" }
        ]}
      />
      <section data-reveal className="bg-brand-offWhite py-10 sm:py-12">
        <div className="section-shell grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <h2 className="section-title">Detail layanan</h2>
            <div className="mt-6 grid gap-3">
              {details.map((detail) => (
                <p
                  key={detail}
                  className="py-3 text-sm font-medium leading-6 text-brand-charcoal/70"
                >
                  {detail}
                </p>
              ))}
            </div>
          </div>
          <PublicImage
            src={getPageHeroImage(pageHero)}
            alt={visualLabel}
            className="product-image-frame aspect-[4/3] w-full object-cover"
            sizes="(min-width: 1024px) 50vw, 100vw"
            objectPosition={pageHero?.object_position}
            fallbackSrc={fallbackImages.pageHero}
          />
        </div>
      </section>
      {products.length ? (
        <section className="bg-brand-offWhite py-10 sm:py-12">
          <div className="section-shell">
            <ProductCatalog
              products={products}
              title={productTitle || `Produk ${title}`}
              showHeading
              showCategoryFilter={false}
            />
          </div>
        </section>
      ) : null}
      <RecommendationGrid
        services={content.categories}
        currentSlug={currentSlug}
      />
    </PublicShell>
  );
}

export function PublicShell({
  content,
  children,
  headerMode = "sticky"
}: {
  content: PublicContent;
  children: ReactNode;
  headerMode?: "sticky" | "natural";
}) {
  return (
    <main className="public-site min-h-screen bg-brand-offWhite text-brand-charcoal">
      <SiteHeader positionMode={headerMode} />
      <PageMotion />
      {children}
      <PublicFooter content={content} />
    </main>
  );
}
