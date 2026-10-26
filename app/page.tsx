import Link from "next/link";
import type { ReactNode } from "react";
import { AccessibleAutoplayVideo } from "@/components/AccessibleAutoplayVideo";
import { BrandIcon } from "@/components/BrandIcon";
import { CampaignBanners } from "@/components/CampaignBanners";
import { HeroSlider } from "@/components/HeroSlider";
import { PublicShellFrame } from "@/components/PublicPage";
import { PublicProductCard } from "@/components/PublicProductCard";
import { PublicSectionFrame } from "@/components/PublicSectionFrame";
import { PublicStoreLocator } from "@/components/PublicStoreLocator";
import { ResponsivePicture } from "@/components/ResponsivePicture";
import { ScrollButtons } from "@/components/ScrollButtons";
import { fallbackImages, getProductImage, getStoreImage } from "@/lib/fallback-data";
import { brandIcons } from "@/lib/icons";
import { getPublicShellPageModel } from "@/lib/public-shell/runtime";
import { getActivePublicTheme } from "@/lib/public-theme/runtime";
import { getPublicContent } from "@/lib/public-data";
import { absoluteUrl, siteConfig } from "@/lib/site";
import type { HomepageSection, HomepageSectionItem, LandingSection, Product, Service } from "@/lib/types";
import { whatsappLinkWithMessage } from "@/lib/url";

const benefits = [
  { icon: "one", title: "Pilihan Apparel", detail: "Kaos, jaket & headwear" },
  { icon: "spark", title: "Custom Jersey", detail: "Konfigurasi kebutuhan tim" },
  { icon: "clock", title: "Layanan Cetak DTF", detail: "DTF dan sublimasi" },
  { icon: "truck", title: "Toko Debroder", detail: "Lihat lokasi dan kontak" }
];

// Owner-requested homepage destinations; product details remain owned by PIM.
const homeCategoryRoutes = [
  { title: "Kaos Polos", href: "/kaos-polos" },
  { title: "Jaket & Hoodie", href: "/jaket-hoodie" },
  { title: "Jersey", href: "/jersey" },
  { title: "Headwear", href: "/headwear" },
  { title: "Sablon DTF", href: "/sablon-dtf" }
];

const featuredEditorialFallback: EditorialItem[] = [
  { label: "Kaos Polos / NSA", title: "NSA Premium", mark: "NSA", button: "Jelajahi NSA", href: "/kaos-polos?q=NSA%20Premium", image: "", imageAlt: "NSA Premium", fallbackImage: fallbackImages.product },
  { label: "Kaos Polos / Cotton", title: "Cotton Combed 24s", mark: "24s", button: "Jelajahi Cotton", href: "/kaos-polos?q=Cotton%20Combed%2024s", image: "", imageAlt: "Cotton Combed 24s", fallbackImage: fallbackImages.product }
];

const serviceEditorialFallback: EditorialItem[] = [
  { label: "01 / Layanan Cetak", title: "Sablon DTF", button: "Lihat DTF", href: "/sablon-dtf", image: "", imageAlt: "Sablon DTF", fallbackImage: fallbackImages.product },
  { label: "02 / Apparel Custom", title: "Jersey", button: "Jelajahi Jersey", href: "/jersey", image: "", imageAlt: "Jersey", fallbackImage: fallbackImages.product },
  { label: "03 / Layanan Cetak", title: "Maklon Sublim", button: "Lihat Sublim", href: "/cetak-sublim", image: "", imageAlt: "Maklon Sublim", fallbackImage: fallbackImages.product }
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
  mark?: string;
  label: string;
  title: string;
  button: string;
  href: string;
};
type ProductItem = { product: Product };


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

function normalizeAboutParagraphs(value?: string | null) {
  const blocks = (value || "")
    .split(/\n\s*\n/)
    .map((block) => block.split(/\n+/).map((line) => line.trim()).filter(Boolean).join(", "))
    .filter(Boolean);

  if (blocks.length >= 3) {
    return [`${blocks[0]} ${blocks.slice(1, -1).join(", ")}`, blocks[blocks.length - 1]];
  }

  if (blocks.length === 1) {
    const sentences = blocks[0].match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((sentence) => sentence.trim()).filter(Boolean) || [];
    if (sentences.length > 1) {
      return [sentences.slice(0, -1).join(" "), sentences[sentences.length - 1]];
    }
  }

  return blocks;
}

function productItem(product: Product): ProductItem {
  return { product };
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
    <div className="landing-section-heading flex items-end justify-between gap-4">
      <div className={`min-w-0 ${textPosition === "center" ? "flex-1 text-center" : textPosition === "right" ? "ml-auto text-right" : ""}`}>
        <h2 className="home-section-title">{title}</h2>
        {description ? <p className="public-secondary-copy mt-2 max-w-2xl text-base leading-6">{description}</p> : null}
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
    ? "aspect-[4/5] sm:aspect-[4/3] lg:aspect-[5/4]"
    : "aspect-[4/5]";

  return (
    <article className={`editorial-card landing-editorial-card group relative block overflow-hidden bg-[#0a1711] ${!item.image ? `home-type-card ${variant === "featured" ? "home-featured-type-card" : "home-service-type-card"}` : ""} ${mediaClass} ${className}`}>
      <Link href={item.href} aria-label={`Lihat ${title || item.imageAlt}`} className="block h-full w-full">
        {item.image ? <ResponsivePicture
          desktopSrc={item.image}
          mobileSrc={item.mobileImage || item.image}
          fallbackSrc={item.fallbackImage}
          alt={item.imageAlt}
          className="editorial-card-image h-full w-full object-cover transition-opacity"
          objectFit={item.objectFit || "cover"}
          desktopObjectPosition={item.objectPosition}
          mobileObjectPosition={item.objectPosition}
        /> : item.mark ? <span className="home-featured-wordmark" aria-hidden="true">{item.mark}</span> : null}
        {shouldShowCopy && item.image ? <span className="editorial-card-overlay pointer-events-none absolute inset-0" aria-hidden="true" /> : null}
        {shouldShowCopy ? (
          <span className="editorial-card-content pointer-events-none absolute z-20 block text-white">
            {label ? <span className="editorial-card-label block">{label}</span> : null}
            {title ? <span className="editorial-card-title block">{title}</span> : null}
            {button ? <span className="editorial-card-cta mt-4 inline-flex items-center rounded-full bg-white text-[#111]">{button}</span> : null}
          </span>
        ) : null}
      </Link>
    </article>
  );
}

function CategoryEditorialCard({ item, index }: { item: EditorialItem; index: number }) {
  const title = cleanCmsText(item.title) || item.imageAlt;
  const hasArtwork = item.image && ![fallbackImages.product, "/debroder/open-graph-logo.png"].includes(item.image);

  return (
    <article className="category-rail-card landing-category-card min-w-0 shrink-0 snap-start">
      <Link href={item.href} className="group block" aria-label={`Lihat kategori ${title}`}>
        <div className="category-media aspect-[4/5] overflow-hidden bg-[#f2f2f2]">
          {hasArtwork ? <ResponsivePicture
            desktopSrc={item.image}
            mobileSrc={item.mobileImage || item.image}
            fallbackSrc={item.fallbackImage}
            alt={item.imageAlt}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
            objectFit={item.objectFit || "cover"}
            desktopObjectPosition={item.objectPosition}
            mobileObjectPosition={item.objectPosition}
          /> : <span className="home-category-placeholder" aria-hidden="true"><span className="home-category-number">{String(index + 1).padStart(2, "0")}</span><span>DEBRODER / APPAREL</span></span>}
        </div>
        <h3 className="mt-4 text-base font-medium tracking-[-0.01em] text-[#111] sm:text-lg">{title}</h3>
      </Link>
    </article>
  );
}

function ProductCard({ item, className = "" }: { item: ProductItem; className?: string }) {
  return (
    <PublicProductCard
      product={item.product}
      className={className}
      imageSizes="(min-width: 1536px) 30vw, (min-width: 1024px) 31vw, (min-width: 640px) 44vw, 78vw"
    />
  );
}

function ManagedHomepageSection({ section, setting, fallbackProducts = [] }: { section: HomepageSection; setting?: LandingSection; fallbackProducts?: Product[] }) {
  const carouselId = `${section.slug}-carousel`;
  const isFeatured = section.slug === "featured";
  const isTrending = section.slug === "trending";
  const isEditorial = isFeatured || isTrending;
  const configuredCta = setting?.cta_label && setting.cta_url
    ? <Link href={setting.cta_url} className="home-section-link">{setting.cta_label}</Link>
    : isFeatured ? <Link href="/kaos-polos" className="home-section-link">Lihat Kaos Polos <span aria-hidden="true">↗</span></Link> : null;

  if (isEditorial) {
    const sectionItems = preferredHomepageItems(section);
    const configuredEditorialItems = sectionItems.map(editorialPlacement).filter((item): item is EditorialItem => Boolean(item));
    const items = configuredEditorialItems.length ? configuredEditorialItems : isFeatured ? featuredEditorialFallback : serviceEditorialFallback;
    if (!items.length) return null;

    if (isFeatured) {
      return (
        <section id={section.slug} className="home-section home-featured section-space bg-white">
          <PublicSectionFrame variant="near-wide" className="featured-shell">
            <SectionHeading
              title="Produk Pilihan"
              description={setting?.subtitle}
              textPosition={setting?.text_position}
              action={configuredCta}
            />
            <div data-ui-grid="campaign" id={carouselId} className="featured-media-grid mt-4 grid grid-cols-1 gap-3 md:mt-6 lg:grid-cols-2 lg:gap-4">
              {items.slice(0, 2).map((item, index) => (
                <EditorialCard
                  key={sectionItems[index]?.id || `${item.href}-${index}`}
                  item={item}
                  variant="featured"
                />
              ))}
            </div>
          </PublicSectionFrame>
        </section>
      );
    }

    return (
      <section id={section.slug} className="home-section home-trending section-space bg-white">
        <PublicSectionFrame variant="near-wide" className="trending-shell">
          <SectionHeading
            title="Sedang Tren"
            description={setting?.subtitle}
            textPosition={setting?.text_position}
            action={configuredCta}
          />
          <div data-ui-grid="editorial" id={carouselId} className="trending-grid mt-4 md:mt-6">
            {items.slice(0, 3).map((item, index) => (
              <EditorialCard
                key={sectionItems[index]?.id || `${item.href}-${index}`}
                item={item}
                variant="trending"
                className="trending-static-card"
              />
            ))}
          </div>
        </PublicSectionFrame>
      </section>
    );
  }

  const configuredItems = section.items.map(cardPlacement).filter((item): item is ProductItem => Boolean(item));
  const items = configuredItems.length ? configuredItems : fallbackProducts.map(productItem);

  return (
    <section id={section.slug} className="home-section home-fresh-drop section-space bg-white">
      <PublicSectionFrame variant="near-wide" className="fresh-drop-shell">
        <SectionHeading
          title={section.title}
          description={setting?.subtitle}
          textPosition={setting?.text_position}
          action={
            <div className="flex items-center gap-4">
              {configuredCta || <Link href={section.slug === "fresh-drops" ? "/fresh-drop" : "/koleksi"} className="home-section-link">Lihat Semua Produk <span aria-hidden="true">↗</span></Link>}
              {items.length ? <ScrollButtons containerId={carouselId} /> : null}
            </div>
          }
        />
        {items.length ? <div data-ui-grid="product-rail" id={carouselId} className="home-bleed-rail public-frame-rail fresh-drop-rail landing-commerce-rail no-scrollbar mt-4 flex snap-x snap-mandatory overflow-x-auto md:mt-6">
          {items.map((item, index) => (
            <ProductCard
              key={section.items[index]?.id || item.product.id || item.product.slug || `${item.product.nama}-${index}`}
              item={item}
              className="fresh-drop-card shrink-0 snap-start"
            />
          ))}
        </div> : <div className="home-product-empty mt-6"><p>Produk belum tersedia untuk ditampilkan.</p><Link href="/koleksi" className="public-button public-button--primary">Jelajahi Koleksi <span aria-hidden="true">↗</span></Link></div>}
      </PublicSectionFrame>
    </section>
  );
}

export default async function Home() {
  const [content, shellModel, activeTheme] = await Promise.all([
    getPublicContent(),
    getPublicShellPageModel(),
    getActivePublicTheme()
  ]);
  const homeCategories = content.categories.map((category) => ({
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
  const whatsappHref = whatsappLinkWithMessage(
    content.contact.whatsapp_link || content.contact.whatsapp_utama,
    "Halo Debroder, saya ingin konsultasi kebutuhan kaos, sablon, atau jersey custom."
  );
  const landingSectionMap = new Map(
    content.landingSections.map((section) => [section.section_key, section])
  );
  const landingSection = (sectionKey: string) => landingSectionMap.get(sectionKey);
  const featuredSection = content.homepageSections.find((section) => section.slug === "featured");
  const shopCategorySection = content.homepageSections.find((section) => section.slug === "services-products");
  const trendingSection = content.homepageSections.find((section) => section.slug === "trending");
  const freshDropSection = content.homepageSections.find((section) => section.slug === "fresh-drops");
  const configuredCategoryItems = shopCategorySection
    ? preferredHomepageItems(shopCategorySection).map(editorialPlacement).filter((item): item is EditorialItem => Boolean(item))
    : [];
  const activeProducts = content.products.filter((product) => product.status_aktif !== false);
  const freshDropFallback = activeProducts
    .sort((a, b) => Number(Boolean(b.fresh_drop)) - Number(Boolean(a.fresh_drop)) || a.urutan - b.urutan)
    .slice(0, 8);
  const shopCategoryItems: EditorialItem[] = homeCategoryRoutes.map((route) => {
    const configured = configuredCategoryItems.find((item) => item.href.replace(/\/$/, "") === route.href);
    const category = homeCategories.find((item) => item.href === route.href);
    return configured || {
      ...category,
      ...route,
      label: "",
      button: "",
      image: category?.image || "",
      imageAlt: category?.imageAlt || route.title,
      fallbackImage: fallbackImages.product
    };
  });
  const brandHeroFallback = content.heroes.length > 0 && content.heroes.every((hero) =>
    hero.image_url === fallbackImages.hero && !cleanCmsText(hero.headline) && !cleanCmsText(hero.title)
  );
  const homepageHeroes = brandHeroFallback ? [{
    ...content.heroes[0],
    badge: "DEBRODER / APPAREL & PRINTING",
    headline: "Apparel untuk\nsetiap ide.",
    subheadline: "Temukan pilihan apparel dan layanan cetak untuk kebutuhanmu.",
    cta_text: "Jelajahi Koleksi",
    cta_link: "/koleksi",
    cta_secondary_text: "Pilihan Kategori",
    cta_secondary_link: "#shop-category"
  }] : content.heroes;
  const aboutParagraphs = normalizeAboutParagraphs(content.trustAbout.about_body);
  const brandCampaignFallback = !content.campaignBanners.some((banner) => banner.is_active !== false)
    && !landingSectionMap.get("campaign-banners")?.desktop_image_url && brandHeroFallback;
  const heroVisible = landingSection("hero")?.is_visible !== false;
  const heroHasHeading = heroVisible && homepageHeroes
    .filter((hero) => hero.status_aktif !== false)
    .some((hero, index) => index === 0 && Boolean(cleanCmsText(hero.headline) || cleanCmsText(hero.title)));
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": `${siteConfig.siteUrl}/#organization`, name: "DEBRODER", url: siteConfig.siteUrl, logo: absoluteUrl(brandIcons.logoWordmarkBlack), email: content.contact.email, sameAs: [content.contact.instagram, content.contact.facebook].filter(Boolean) },
      ...stores.map((store) => ({ "@type": "LocalBusiness", name: `DEBRODER ${store.nama_store}`, image: getStoreImage(store), address: store.alamat, telephone: store.whatsapp, url: absoluteUrl("/store") }))
    ]
  };

  return (
    <PublicShellFrame shellModel={shellModel} publicThemeId={activeTheme.id} footerTone="light" shellClassName="debroder-landing">
      <div data-ui-system="landing" className="min-h-screen bg-experience-canvas text-experience-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
      {!heroHasHeading ? <h1 className="sr-only">DEBRODER</h1> : null}

      <div className="mobile-home-search section-shell" role="search">
        <Link href="/search" className="mobile-home-search-link" aria-label="Cari produk, kategori, atau layanan">
          <BrandIcon name="search" className="h-5 w-5" />
          <span className="min-w-0 flex-1 truncate text-left">Cari produk, kategori, atau layanan</span>
          <span aria-hidden="true" className="text-lg text-black/40">→</span>
        </Link>
      </div>

      <LandingSectionSlot setting={landingSection("hero")}>
        <div className={brandHeroFallback ? "home-hero-brand-fallback" : undefined}>
          <HeroSlider heroes={homepageHeroes} />
        </div>
      </LandingSectionSlot>

      <LandingSectionSlot setting={landingSection("benefits")}>
        <section aria-label="Keunggulan DEBRODER" className="trust-strip border-y border-black/10 bg-white">
          <div aria-label="Geser untuk melihat keunggulan DEBRODER" tabIndex={0} className="benefit-grid section-shell no-scrollbar flex snap-x snap-mandatory overscroll-x-contain overflow-x-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] lg:grid lg:grid-cols-4 lg:overflow-visible">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="benefit-slide flex min-w-0 flex-[0_0_100%] snap-start items-center justify-center gap-3 border-r border-black/10 px-4 py-4 last:border-r-0 lg:min-w-0 lg:flex-initial lg:justify-center lg:px-3">
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

      {(() => {
        const setting = landingSection("featured-products");
        const section = featuredSection || { id: "featured-editorial", title: "Pilihan DEBRODER", slug: "featured", is_active: true, sort_order: 30, items: [] };
        const managedSection = setting?.title ? { ...section, title: setting.title } : section;
        return <LandingSectionSlot setting={setting}><ManagedHomepageSection section={managedSection} setting={setting} /></LandingSectionSlot>;
      })()}

      {(() => {
        const setting = landingSection("trending");
        const section = trendingSection || { id: "services-editorial", title: "Dari apparel hingga cetak.", slug: "trending", is_active: true, sort_order: 40, items: [] };
        const managedSection = setting?.title && trendingSection ? { ...section, title: setting.title } : section;
        return <LandingSectionSlot setting={setting}><ManagedHomepageSection section={managedSection} setting={setting} /></LandingSectionSlot>;
      })()}

      <LandingSectionSlot setting={landingSection("campaign-banners")}>
        <div className={brandCampaignFallback ? "home-brand-campaign" : undefined}>
        <CampaignBanners
          banners={content.campaignBanners}
          fallbackDesktopSrc={landingSection("campaign-banners")?.desktop_image_url || content.heroes[0]?.image_url || content.hero.image_url || fallbackImages.banner}
          fallbackMobileSrc={landingSection("campaign-banners")?.mobile_image_url || content.heroes[0]?.mobile_image_url || content.hero.mobile_image_url || fallbackImages.bannerMobile}
        />
        </div>
      </LandingSectionSlot>

      {freshDropSection ? (() => {
        const setting = landingSection("fresh-drop");
        const managedSection = setting?.title ? { ...freshDropSection, title: setting.title } : freshDropSection;
        return <LandingSectionSlot setting={setting}><ManagedHomepageSection section={managedSection} setting={setting} fallbackProducts={freshDropFallback} /></LandingSectionSlot>;
      })() : (
        <LandingSectionSlot setting={landingSection("fresh-drop")}>
          <ManagedHomepageSection
            section={{ id: "fresh-drop-fallback", title: landingSection("fresh-drop")?.title || "Produk Terbaru", slug: "fresh-drops", is_active: true, sort_order: 60, items: [] }}
            setting={landingSection("fresh-drop")}
            fallbackProducts={freshDropFallback}
          />
        </LandingSectionSlot>
      )}

      <LandingSectionSlot setting={landingSection("services-products")}>
        <section id="shop-category" className="home-section home-categories section-space bg-white">
          <PublicSectionFrame variant="near-wide" className="category-shell">
            <SectionHeading
              title={landingSection("services-products")?.title || "Belanja Berdasarkan Kategori"}
              description={landingSection("services-products")?.subtitle}
              textPosition={landingSection("services-products")?.text_position}
              action={
                <div className="flex items-center gap-4">
                  {landingSection("services-products")?.cta_label && landingSection("services-products")?.cta_url ? (
                    <Link href={landingSection("services-products")!.cta_url!} className="hidden text-sm font-semibold hover:underline sm:block">
                      {landingSection("services-products")!.cta_label}
                    </Link>
                  ) : null}
                  <ScrollButtons containerId="category-carousel" largeTargets />
                </div>
              }
            />
            <div id="category-carousel" tabIndex={0} aria-label="Daftar kategori DEBRODER" className="home-bleed-rail public-frame-rail category-carousel landing-category-rail premium-scrollbar mt-4 flex snap-x snap-mandatory overflow-x-auto pb-6 md:mt-6">
              {shopCategoryItems.map((item, index) => (
                <CategoryEditorialCard key={`${item.href}-${item.title}`} item={item} index={index} />
              ))}
            </div>
          </PublicSectionFrame>
        </section>
      </LandingSectionSlot>

      <LandingSectionSlot setting={landingSection("stores")}>
        <>
          <section id="store" className="home-section home-store landing-store section-space bg-white">
            <PublicSectionFrame variant="near-wide" className="landing-store-shell">
              <SectionHeading
                title="Kunjungi Toko Debroder"
                description={landingSection("stores")?.subtitle || "Konsultasikan bahan, teknik cetak, dan estimasi produksi langsung bersama tim kami."}
                textPosition={landingSection("stores")?.text_position}
                action={<Link href={landingSection("stores")?.cta_url || "/store"} className="hidden text-sm font-semibold hover:underline sm:block">{landingSection("stores")?.cta_label || "Lihat Semua Toko"}</Link>}
              />
              <div className="landing-store-content mt-5 md:mt-7">
                <PublicStoreLocator stores={stores} />
              </div>
            </PublicSectionFrame>
          </section>

          <section className="home-section home-consultation section-space bg-white" aria-labelledby="consultation-heading">
            <PublicSectionFrame variant="near-wide">
              <div className="landing-order-panel flex flex-col gap-7 bg-[#f5f5f5] px-5 py-8 sm:px-8 sm:py-10 lg:flex-row lg:items-end lg:justify-between lg:px-12 lg:py-12">
                <div className="max-w-3xl">
                  <h2 id="consultation-heading" className="landing-order-title text-3xl font-medium tracking-[-0.035em] sm:text-4xl">Bingung Mau Mulai dari Mana?</h2>
                  <p className="mt-3 text-sm leading-7 text-black/65 sm:text-base">Ceritakan kebutuhan kaos, sablon, atau jersey custom kamu. Tim Debroder siap membantu lewat WhatsApp.</p>
                </div>
                <div className="landing-order-actions flex flex-wrap gap-2">
                  <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#111] px-6 text-sm font-semibold text-white transition hover:bg-black/70">Konsultasi via WhatsApp</a>
                </div>
              </div>
            </PublicSectionFrame>
          </section>
        </>
      </LandingSectionSlot>

      <LandingSectionSlot setting={landingSection("about")}>
        <section id="tentang" className="home-section home-about section-space bg-white">
          <PublicSectionFrame variant="near-wide" className="about-shell grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-14">
            <div className={`about-copy ${content.trustAbout.text_position === "center" ? "text-center" : content.trustAbout.text_position === "right" ? "text-right" : ""}`}>
              <p className="public-eyebrow">Tentang Kami</p>
              <h2 className="home-page-title about-title mt-3 max-w-2xl">TENTANG DEBRODER</h2>
              <div className="about-body mt-5 max-w-2xl space-y-4 text-base leading-7 text-black/65">
                {aboutParagraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
              {content.trustAbout.cta_label && content.trustAbout.cta_url ? <Link href={content.trustAbout.cta_url} className="about-cta mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-[#111] px-6 text-[15px] font-semibold text-white transition hover:bg-black/70">{content.trustAbout.cta_label}</Link> : null}
            </div>
            {content.trustAbout.video_url ? (
              <div className="about-media aspect-[4/3] w-full overflow-hidden">
                <AccessibleAutoplayVideo
                  src={content.trustAbout.video_url}
                  poster={content.trustAbout.image_url}
                  label="Video tentang DEBRODER"
                />
              </div>
            ) : content.trustAbout.image_url ? (
              <ResponsivePicture desktopSrc={content.trustAbout.image_url} mobileSrc={content.trustAbout.mobile_image_url || content.trustAbout.image_url} alt="Tentang DEBRODER" className="about-media aspect-[4/3] h-full w-full object-cover" />
            ) : (
              <div className="about-proof-grid grid grid-cols-2 border-l border-t border-black/10">
                {[[String(stores.length), "Toko Aktif"], [String(activeProducts.length), "Produk Aktif"], ["DTF", "& Apparel"], ["ID", "Kirim Indonesia"]].map(([value, label]) => (
                  <div key={`${value}-${label}`} className="about-proof-item border-b border-r border-black/10 p-6 sm:p-8">
                    <p className="about-proof-value text-3xl font-semibold tracking-[-0.03em] text-[#111]">{value}</p>
                    <p className="about-proof-label mt-2 text-sm text-black/50">{label}</p>
                  </div>
                ))}
              </div>
            )}
          </PublicSectionFrame>
        </section>
      </LandingSectionSlot>

      {/* <SiteHeader /> and <PublicFooter model={shellModel.data.footer} tone="light" /> are mounted once by PublicShellFrame. */}
      {/* <StorefrontCartBoundary> remains owned by the shared frame to keep the root server component boundary intact. */}
      </div>
    </PublicShellFrame>
  );
}
