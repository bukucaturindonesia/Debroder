import Link from "next/link";
import type { ReactNode } from "react";
import { CampaignBanners } from "@/components/CampaignBanners";
import { HeroSlider } from "@/components/HeroSlider";
import { ProductImageSwap } from "@/components/ProductImageSwap";
import { PublicFooter } from "@/components/PublicFooter";
import { ResponsivePicture } from "@/components/ResponsivePicture";
import { ScrollButtons } from "@/components/ScrollButtons";
import { SiteHeader } from "@/components/SiteHeader";
import { fallbackImages, getProductImage, getStoreImage } from "@/lib/fallback-data";
import { getProductCardImages } from "@/lib/product-gallery";
import { getPublicContent } from "@/lib/public-data";
import { absoluteUrl, siteConfig } from "@/lib/site";
import type { HomepageSection, HomepageSectionItem, LandingSection, Product, Service, Store } from "@/lib/types";
import { formatRupiah, whatsappLinkWithMessage } from "@/lib/url";

const benefits = [
  { icon: "clock", title: "Produksi Cepat", detail: "Alur kerja terukur" },
  { icon: "spark", title: "Kualitas Premium", detail: "Material terbaik" },
  { icon: "one", title: "Tanpa Minimum", detail: "Mulai dari satu pcs" },
  { icon: "truck", title: "Kirim ke Seluruh Indonesia", detail: "Aman ke seluruh kota" }
];

function LandingSectionSlot({ setting, children }: { setting?: LandingSection; children: ReactNode }) {
  if (setting?.is_visible === false) return null;
  return <div>{children}</div>;
}

type Visual = {
  image: string;
  mobileImage?: string | null;
  imageAlt: string;
  fallbackImage: string;
  objectFit?: "cover" | "contain";
  objectPosition?: string;
};
type EditorialItem = Visual & {
  label: string;
  title: string;
  button: string;
  href: string;
};
type ProductItem = Visual & {
  id?: string;
  hoverImage?: string | null;
  name: string;
  category: string;
  price: string;
  href: string;
  fit: string;
};

const horizontalCarouselClass = "native-carousel no-scrollbar mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto sm:gap-4";
const horizontalCarouselItemClass = "min-w-[76vw] shrink-0 snap-start sm:min-w-[44vw] lg:min-w-[31.5%]";
const horizontalEditorialItemClass = "min-w-[76vw] shrink-0 snap-start sm:min-w-[44vw] lg:min-w-[calc((100%_-_32px)_/_3)]";

function isCustomHomepageItem(item: HomepageSectionItem) {
  return Boolean(item.custom_title && item.custom_image_url && item.custom_link_url);
}

function preferredHomepageItems(section: HomepageSection) {
  if (!["featured", "trending", "services-products"].includes(section.slug)) return section.items;
  const customItems = section.items.filter(isCustomHomepageItem);
  return customItems.length ? customItems : section.items;
}

function cleanCmsText(value?: string | null) {
  const text = value?.trim();
  if (!text || text === "." || text === "-" || text === "—") return "";
  return text;
}

function hasEditorialText(...values: Array<string | null | undefined>) {
  return values.some((value) => Boolean(cleanCmsText(value)));
}

function productItem(product: Product): ProductItem {
  const href = `/produk/${product.slug || product.nama.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
  const price = formatRupiah(product.price ?? product.harga ?? product.base_price) || "Hubungi kami";
  const cardImages = getProductCardImages(product);
  return {
    id: product.id || product.slug || product.nama,
    name: product.nama,
    category: product.kategori,
    price,
    href,
    image: cardImages.primary,
    hoverImage: cardImages.hover,
    imageAlt: product.image_alt || product.nama,
    fallbackImage: fallbackImages.product,
    objectFit: product.object_fit,
    objectPosition: product.object_position,
    fit: product.object_fit || "cover"
  };
}

function serviceHref(service: Service) {
  if (service.category_key === "sablon-dtf" || service.slug.startsWith("sablon-dtf-")) {
    return `/sablon-dtf/${service.slug}`;
  }
  return `/${service.slug.replace(/^\/+/, "")}`;
}

function editorialPlacement(item: HomepageSectionItem): EditorialItem | null {
  if (isCustomHomepageItem(item)) {
    return {
      label: cleanCmsText(item.custom_label),
      title: cleanCmsText(item.custom_title),
      button: cleanCmsText(item.custom_button_label),
      href: item.custom_link_url || "#",
      image: item.custom_image_url || fallbackImages.product,
      mobileImage: item.custom_mobile_image_url,
      imageAlt: item.custom_image_alt || item.custom_title || "DEBRODER",
      fallbackImage: fallbackImages.product,
      objectFit: item.custom_object_fit || "cover",
      objectPosition: item.custom_object_position || "center center"
    };
  }
  if (item.product) {
    const href = `/produk/${item.product.slug || item.product.nama.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
    return {
      label: cleanCmsText(item.product.kategori),
      title: cleanCmsText(item.product.nama),
      button: "Lihat",
      href,
      image: getProductImage(item.product),
      imageAlt: item.product.image_alt || item.product.nama,
      fallbackImage: fallbackImages.product,
      objectFit: item.product.object_fit,
      objectPosition: item.product.object_position
    };
  }
  if (item.service) {
    return {
      label: "Layanan",
      title: cleanCmsText(item.service.nama),
      button: "Lihat",
      href: serviceHref(item.service),
      image: item.service.image_url,
      imageAlt: item.service.image_alt || item.service.nama,
      fallbackImage: fallbackImages.product,
      objectFit: item.service.object_fit,
      objectPosition: item.service.object_position
    };
  }
  return null;
}

function cardPlacement(item: HomepageSectionItem): ProductItem | null {
  if (item.product) return productItem(item.product);
  return null;
}

function SectionHeading({ title, action, description, textPosition = "left" }: { title: string; action?: ReactNode; description?: string; textPosition?: "left" | "center" | "right" }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className={textPosition === "center" ? "flex-1 text-center" : textPosition === "right" ? "ml-auto text-right" : ""}>
        <h2 className="landing-section-title text-[#111]">{title}</h2>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-black/55 sm:text-base">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function BenefitIcon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    clock: <><circle cx="12" cy="12" r="8" /><path d="M12 7v5l3 2" /></>,
    spark: <><path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z" /><path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" /></>,
    one: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M10 9h2v6M10 15h5" /></>,
    truck: <><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z" /><circle cx="7" cy="18" r="1.5" /><circle cx="18" cy="18" r="1.5" /></>
  };

  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center text-[#0f5a36]">
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {paths[name]}
      </svg>
    </span>
  );
}

function EditorialCard({
  item,
  className = "",
  variant = "trending"
}: {
  item: EditorialItem;
  className?: string;
  variant?: "featured" | "trending";
}) {
  const label = cleanCmsText(item.label);
  const title = cleanCmsText(item.title);
  const button = cleanCmsText(item.button);
  const shouldShowCopy = hasEditorialText(label, title, button);

  const mediaClass = variant === "featured"
    ? "aspect-[4/5] sm:aspect-[5/4] lg:aspect-auto lg:h-[clamp(520px,62vh,680px)]"
    : "aspect-[4/5]";

  return (
    <article className={`editorial-card group relative block overflow-hidden bg-[#0a1711] ${mediaClass} ${className}`}>
      <Link href={item.href} aria-label={`Lihat ${title || item.imageAlt}`} className="absolute inset-0 z-10" />
      <ResponsivePicture
        desktopSrc={item.image}
        mobileSrc={item.mobileImage || item.image}
        fallbackSrc={item.fallbackImage}
        alt={item.imageAlt}
        className="editorial-card-image h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
        objectFit={item.objectFit || "cover"}
        desktopObjectPosition={item.objectPosition}
        mobileObjectPosition={item.objectPosition}
      />
      {shouldShowCopy ? <div className="editorial-card-overlay pointer-events-none absolute inset-0 z-10" /> : null}
      {shouldShowCopy ? (
        <div className="editorial-card-content pointer-events-none absolute z-20 text-white">
          {label ? <p className="editorial-card-label">{label}</p> : null}
          {title ? <h3 className="editorial-card-title">{title}</h3> : null}
          {button ? (
            <div className="pointer-events-auto relative z-30 mt-3 sm:mt-4">
              <Link href={item.href} className="editorial-card-cta inline-flex items-center rounded-full bg-white text-[#111] transition hover:bg-[#e9eee9]">{button}</Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function CategoryCard({ item, title }: { item: Visual & { href: string; name?: string; title?: string }; title?: string }) {
  const cleanTitle = cleanCmsText(title || item.title || item.name);
  return (
    <Link href={item.href} aria-label={`Lihat ${cleanTitle || item.imageAlt}`} className={`group block ${horizontalCarouselItemClass}`}>
      <div className="relative aspect-[4/5] overflow-hidden bg-[#efefef]">
        <ResponsivePicture
          desktopSrc={item.image}
          mobileSrc={item.mobileImage || item.image}
          fallbackSrc={item.fallbackImage}
          alt={item.imageAlt}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
          objectFit={item.objectFit || "cover"}
          desktopObjectPosition={item.objectPosition}
          mobileObjectPosition={item.objectPosition}
        />
      </div>
      {cleanTitle ? <h3 className="pt-4 text-lg font-medium leading-tight text-[#111] sm:text-xl">{cleanTitle}</h3> : null}
    </Link>
  );
}

function ProductCard({ item, className = "" }: { item: ProductItem; className?: string }) {
  return (
    <article className={`group min-w-0 ${className}`}>
      <Link href={item.href} className="block">
      <ProductImageSwap
        primarySrc={item.image}
        hoverSrc={item.hoverImage}
        fallbackSrc={item.fallbackImage}
        alt={item.imageAlt}
        imageClassName={(item.objectFit || item.fit) === "contain" ? "object-contain p-3" : "object-cover"}
        objectFit={item.objectFit || (item.fit === "contain" ? "contain" : "cover")}
        objectPosition={item.objectPosition || "center center"}
        sizes="(min-width: 1536px) 20vw, (min-width: 1024px) 25vw, 50vw"
      />
      </Link>
      <div className="pt-3">
        <Link href={item.href}><h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-[#111] sm:text-base">{item.name}</h3></Link>
        <p className="mt-1 text-sm text-black/50 sm:text-[15px]">{item.category}</p>
        <p className="mt-2 text-[15px] font-semibold text-[#111] sm:text-base">{item.price}</p>
      </div>
    </article>
  );
}

function ManagedHomepageSection({ section, setting, fallbackProducts = [] }: { section: HomepageSection; setting?: LandingSection; fallbackProducts?: Product[] }) {
  const carouselId = `${section.slug}-carousel`;
  const isFeatured = section.slug === "featured";
  const isEditorial = isFeatured || section.slug === "trending";
  const configuredCta = setting?.cta_label && setting.cta_url ? <Link href={setting.cta_url} className="hidden text-sm font-semibold hover:underline sm:block">{setting.cta_label}</Link> : null;

  if (isEditorial) {
    const sectionItems = preferredHomepageItems(section);
    const items = sectionItems.map(editorialPlacement).filter((item): item is EditorialItem => Boolean(item));
    if (!items.length) return null;
    return (
      <section id={section.slug} className="section-space bg-white">
        <div className="section-shell">
          <SectionHeading
            title={section.title}
            description={setting?.subtitle}
            textPosition={setting?.text_position}
            action={
              <div className="flex items-center gap-4">
                {configuredCta}
                {!isFeatured ? <ScrollButtons containerId={carouselId} /> : null}
              </div>
            }
          />
          <div
            id={carouselId}
            className={
              isFeatured
                ? "mt-5 grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2"
                : horizontalCarouselClass
            }
          >
            {items.slice(0, isFeatured ? 2 : undefined).map((item, index) => (
              <EditorialCard
                key={sectionItems[index]?.id || `${item.href}-${index}`}
                item={item}
                variant={isFeatured ? "featured" : "trending"}
                className={isFeatured ? "" : horizontalEditorialItemClass}
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  const configuredItems = section.items.map(cardPlacement).filter((item): item is ProductItem => Boolean(item));
  const items = configuredItems.length ? configuredItems : fallbackProducts.map(productItem);
  if (!items.length) return null;
  return (
    <section id={section.slug} className="section-space bg-white">
      <div className="section-shell">
        <SectionHeading title={section.title} description={setting?.subtitle} textPosition={setting?.text_position} action={<div className="flex items-center gap-4">{configuredCta || <Link href="/koleksi" className="hidden text-sm font-semibold hover:underline sm:block">Shop</Link>}<ScrollButtons containerId={carouselId} /></div>} />
        <div id={carouselId} className={`${horizontalCarouselClass} gap-y-6`}>
          {items.map((item, index) => <ProductCard key={section.items[index]?.id || `${item.href}-${index}`} item={item} className={horizontalCarouselItemClass} />)}
        </div>
      </div>
    </section>
  );
}

function StoreCard({ store, index }: { store: Store; index: number }) {
  const name = store.nama_store.replace(/^STORE\s+/i, "");
  const whatsappHref = whatsappLinkWithMessage(store.whatsapp_link || store.whatsapp, `Halo DEBRODER, saya ingin bertanya tentang Store ${name}.`);

  return (
    <article className="min-w-[82vw] shrink-0 snap-start bg-transparent py-4 sm:min-w-[360px] lg:min-w-0">
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0f5a36]">Store {String(index + 1).padStart(2, "0")}</span>
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#0f5a36]" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z" /><circle cx="12" cy="10" r="2" />
        </svg>
      </div>
      <h3 className="mt-8 text-xl font-semibold tracking-normal text-[#111] sm:text-2xl">{name}</h3>
      <p className="mt-3 min-h-[48px] text-sm leading-6 text-black/55">{store.alamat}</p>
      {store.jam_operasional ? <p className="mt-3 text-xs font-medium text-black/45">{store.jam_operasional}</p> : null}
      <div className="mt-6 grid grid-cols-2 gap-2">
        <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#063d24] px-3 text-sm font-semibold text-white transition hover:bg-[#0f5a36]">WhatsApp</a>
        <a href={store.maps_link} target="_blank" rel="noopener noreferrer" className="premium-ghost-button inline-flex min-h-11 items-center justify-center rounded-full border px-3 text-sm font-semibold text-[#111] transition">Lihat Lokasi</a>
      </div>
    </article>
  );
}

export default async function Home() {
  const content = await getPublicContent();
  const homeCategories = content.categories.slice(0, 7).map((category) => ({
    name: category.nama_kategori,
    href: `/${category.link_slug.replace(/^\/+/, "") || "koleksi"}`,
    image: category.gambar_url,
    mobileImage: category.gambar_url,
    imageAlt: category.image_alt || category.nama_kategori,
    fallbackImage: fallbackImages.product,
    objectFit: category.object_fit,
    objectPosition: category.object_position
  }));
  const stores = content.stores.filter((item) => item.status_aktif !== false).sort((a, b) => a.urutan - b.urutan).slice(0, 4);
  const whatsappHref = whatsappLinkWithMessage(content.contact.whatsapp_link || content.contact.whatsapp_utama, "Halo DEBRODER, saya ingin konsultasi kebutuhan apparel.");
  const landingSectionMap = new Map(
    content.landingSections.map((section) => [section.section_key, section])
  );
  const landingSection = (sectionKey: string) => landingSectionMap.get(sectionKey);
  const featuredSection = content.homepageSections.find((section) => section.slug === "featured");
  const shopCategorySection = content.homepageSections.find((section) => section.slug === "services-products");
  const trendingSection = content.homepageSections.find((section) => section.slug === "trending");
  const freshDropSection = content.homepageSections.find((section) => section.slug === "fresh-drops");
  const shopCategoryItems = shopCategorySection
    ? preferredHomepageItems(shopCategorySection).map(editorialPlacement).filter((item): item is EditorialItem => Boolean(item))
    : [];
  const freshDropFallback = content.products
    .filter((product) => product.status_aktif !== false)
    .sort((a, b) => Number(Boolean(b.fresh_drop)) - Number(Boolean(a.fresh_drop)) || a.urutan - b.urutan)
    .slice(0, 8);
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": `${siteConfig.siteUrl}/#organization`, name: "DEBRODER", url: siteConfig.siteUrl, logo: absoluteUrl("/brand/debroder/logo-primary-black.png"), email: content.contact.email, sameAs: [content.contact.instagram, content.contact.facebook].filter(Boolean) },
      ...stores.map((store) => ({ "@type": "LocalBusiness", name: `DEBRODER ${store.nama_store}`, image: getStoreImage(store), address: store.alamat, telephone: store.whatsapp, url: absoluteUrl("/store") }))
    ]
  };

  return (
    <main className="public-site min-h-screen bg-white text-[#111]">
      <SiteHeader />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />

      <LandingSectionSlot setting={landingSection("hero")}>
        <HeroSlider heroes={content.heroes} />
      </LandingSectionSlot>

      <LandingSectionSlot setting={landingSection("benefits")}>
        <section aria-label="Keunggulan DEBRODER" className="trust-strip border-y border-black/10 bg-white">
          <div className="section-shell no-scrollbar flex snap-x snap-mandatory overflow-x-auto lg:grid lg:grid-cols-4 lg:overflow-visible">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="flex min-w-[72vw] snap-start items-center gap-3 border-r border-black/10 px-1 py-5 last:border-r-0 sm:min-w-[42vw] lg:min-w-0 lg:justify-center lg:px-5">
                <BenefitIcon name={benefit.icon} />
                <div>
                  <h2 className="text-sm font-semibold leading-5">{benefit.title}</h2>
                  <p className="mt-0.5 text-xs text-black/50">{benefit.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </LandingSectionSlot>

      {featuredSection ? (() => {
        const setting = landingSection("featured-products");
        const managedSection = setting?.title ? { ...featuredSection, title: setting.title } : featuredSection;
        return <LandingSectionSlot setting={setting}><ManagedHomepageSection section={managedSection} setting={setting} /></LandingSectionSlot>;
      })() : null}

      {trendingSection ? (() => {
        const setting = landingSection("trending");
        const managedSection = setting?.title ? { ...trendingSection, title: setting.title } : trendingSection;
        return <LandingSectionSlot setting={setting}><ManagedHomepageSection section={managedSection} setting={setting} /></LandingSectionSlot>;
      })() : null}

      <LandingSectionSlot setting={landingSection("campaign-banners")}>
        <CampaignBanners banners={content.campaignBanners} />
      </LandingSectionSlot>

      {freshDropSection ? (() => {
        const setting = landingSection("fresh-drop");
        const managedSection = setting?.title ? { ...freshDropSection, title: setting.title } : freshDropSection;
        return <LandingSectionSlot setting={setting}><ManagedHomepageSection section={managedSection} setting={setting} fallbackProducts={freshDropFallback} /></LandingSectionSlot>;
      })() : freshDropFallback.length ? (
        <LandingSectionSlot setting={landingSection("fresh-drop")}>
          <ManagedHomepageSection
            section={{ id: "fresh-drop-fallback", title: landingSection("fresh-drop")?.title || "Fresh Drop", slug: "fresh-drops", is_active: true, sort_order: 60, items: [] }}
            setting={landingSection("fresh-drop")}
            fallbackProducts={freshDropFallback}
          />
        </LandingSectionSlot>
      ) : null}

      <LandingSectionSlot setting={landingSection("services-products")}>
        <section id="shop-category" className="section-space bg-white">
          <div className="section-shell">
            <SectionHeading
              title={landingSection("services-products")?.title || "Shop by Category"}
              description={landingSection("services-products")?.subtitle}
              textPosition={landingSection("services-products")?.text_position}
              action={
                <div className="flex items-center gap-4">
                  {landingSection("services-products")?.cta_label && landingSection("services-products")?.cta_url ? (
                    <Link href={landingSection("services-products")!.cta_url!} className="hidden text-sm font-semibold hover:underline sm:block">
                      {landingSection("services-products")!.cta_label}
                    </Link>
                  ) : null}
                  <ScrollButtons containerId="category-carousel" />
                </div>
              }
            />
            <div id="category-carousel" className={`${horizontalCarouselClass} premium-scrollbar pb-4`}>
              {shopCategoryItems.length ? shopCategoryItems.map((item) => (
                <CategoryCard key={`${item.href}-${item.title}`} item={item} title={item.title} />
              )) : homeCategories.length ? homeCategories.map((item) => (
                <CategoryCard key={item.name} item={item} title={item.name} />
              )) : <p className="p-8 text-center text-sm text-black/55">Belum ada kategori.</p>}
            </div>
          </div>
        </section>
      </LandingSectionSlot>

      <LandingSectionSlot setting={landingSection("stores")}>
        <section id="store" className="section-space bg-white">
          <div className="section-shell">
            <SectionHeading
              title={landingSection("stores")?.title || "Store DEBRODER"}
              description={landingSection("stores")?.subtitle || "Konsultasikan bahan, teknik cetak, dan estimasi produksi langsung bersama tim kami."}
              textPosition={landingSection("stores")?.text_position}
              action={<Link href={landingSection("stores")?.cta_url || "/store"} className="hidden text-sm font-semibold hover:underline sm:block">{landingSection("stores")?.cta_label || "Semua store"}</Link>}
            />
            <div className="no-scrollbar mt-6 flex snap-x snap-mandatory gap-6 overflow-x-auto lg:grid lg:grid-cols-4 lg:overflow-visible">
              {stores.map((store, index) => <StoreCard key={store.nama_store} store={store} index={index} />)}
            </div>

            <div className="mt-12 flex flex-col gap-6 border-t border-black/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-black/55">Belum yakin harus mulai dari mana?</p>
                <h3 className="mt-1 text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">Pesan apparel custom dengan alur yang jelas.</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/cara-order" className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#111] px-6 text-sm font-semibold text-white transition hover:bg-black/75">Cara Order</Link>
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-full border border-black/20 px-6 text-sm font-semibold text-[#111] transition hover:border-black">Konsultasi WhatsApp</a>
              </div>
            </div>
          </div>
        </section>
      </LandingSectionSlot>

      <LandingSectionSlot setting={landingSection("about")}>
        <section id="tentang" className="section-space bg-white">
          <div className="section-shell grid gap-10 border-t border-black/10 pt-12 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:gap-20 lg:pt-16">
            <div className={content.trustAbout.text_position === "center" ? "text-center" : content.trustAbout.text_position === "right" ? "text-right" : ""}>
              <p className="text-sm font-medium text-black/55">Tentang DEBRODER</p>
              <h2 className="section-title mt-4 max-w-2xl">{landingSection("about")?.title || "Built to Create"}</h2>
              <p className="mt-6 max-w-2xl whitespace-pre-line text-base leading-8 text-black/62">{content.trustAbout.about_body}</p>
              {content.trustAbout.cta_label && content.trustAbout.cta_url ? <Link href={content.trustAbout.cta_url} className="mt-7 inline-flex min-h-11 items-center rounded-full bg-[#111] px-6 text-sm font-semibold text-white transition hover:bg-black/75">{content.trustAbout.cta_label}</Link> : null}
            </div>
            {content.trustAbout.video_url ? (
              <video src={content.trustAbout.video_url} autoPlay muted loop playsInline className="aspect-[4/3] w-full object-cover" />
            ) : content.trustAbout.image_url ? (
              <ResponsivePicture desktopSrc={content.trustAbout.image_url} mobileSrc={content.trustAbout.mobile_image_url || content.trustAbout.image_url} alt="Tentang DEBRODER" className="aspect-[4/3] h-full w-full object-cover" />
            ) : (
              <div className="grid grid-cols-2 border-l border-t border-black/10">
                {[["2016", "Berdiri"], ["4", "Store Aktif"], ["DTF", "& Apparel"], ["ID", "Kirim Indonesia"]].map(([value, label]) => (
                  <div key={`${value}-${label}`} className="border-b border-r border-black/10 p-6 sm:p-8">
                    <p className="text-3xl font-semibold tracking-[-0.03em] text-[#063d24]">{value}</p>
                    <p className="mt-2 text-sm text-black/50">{label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </LandingSectionSlot>

      <PublicFooter content={content} />
    </main>
  );
}
