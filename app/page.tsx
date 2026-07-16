import Link from "next/link";
import type { ReactNode } from "react";
import { CampaignBanners } from "@/components/CampaignBanners";
import { HeroSlider } from "@/components/HeroSlider";
import { PublicProductCard } from "@/components/PublicProductCard";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicInstagramBanner } from "@/components/PublicInstagramBanner";
import { PublicSectionFrame } from "@/components/PublicSectionFrame";
import { PublicStoreLocator } from "@/components/PublicStoreLocator";
import { ResponsivePicture } from "@/components/ResponsivePicture";
import { ScrollButtons } from "@/components/ScrollButtons";
import { SiteHeader } from "@/components/SiteHeader";
import { fallbackImages, getProductImage, getStoreImage } from "@/lib/fallback-data";
import { buildPublicNavigationFacets } from "@/lib/public-navigation";
import { getPublicContent } from "@/lib/public-data";
import { absoluteUrl, siteConfig } from "@/lib/site";
import type { HomepageSection, HomepageSectionItem, LandingSection, Product, Service } from "@/lib/types";
import { whatsappLinkWithMessage } from "@/lib/url";

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
    <div className="flex items-end justify-between gap-4">
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

function CategoryEditorialCard({ item }: { item: EditorialItem }) {
  const title = cleanCmsText(item.title) || item.imageAlt;

  return (
    <article className="category-rail-card min-w-0 shrink-0 snap-start">
      <Link href={item.href} className="group block" aria-label={`Lihat kategori ${title}`}>
        <div className="aspect-[4/5] overflow-hidden bg-[#f2f2f2]">
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
    ? <Link href={setting.cta_url} className="hidden text-sm font-semibold hover:underline sm:block">{setting.cta_label}</Link>
    : null;

  if (isEditorial) {
    const sectionItems = preferredHomepageItems(section);
    const items = sectionItems.map(editorialPlacement).filter((item): item is EditorialItem => Boolean(item));
    if (!items.length) return null;

    if (isFeatured) {
      return (
        <section id={section.slug} className="home-section home-featured section-space bg-white">
          <PublicSectionFrame variant="wide">
            <SectionHeading
              title={section.title}
              description={setting?.subtitle}
              textPosition={setting?.text_position}
              action={configuredCta}
            />
          </PublicSectionFrame>
          <div id={carouselId} className="featured-media-grid mt-4 grid grid-cols-1 gap-0 md:mt-6 lg:grid-cols-2">
            {items.slice(0, 2).map((item, index) => (
              <EditorialCard
                key={sectionItems[index]?.id || `${item.href}-${index}`}
                item={item}
                variant="featured"
              />
            ))}
          </div>
        </section>
      );
    }

    return (
      <section id={section.slug} className="home-section home-trending section-space bg-white">
        <PublicSectionFrame variant="near-wide" className="trending-shell">
          <SectionHeading
            title={section.title}
            description={setting?.subtitle}
            textPosition={setting?.text_position}
            action={configuredCta}
          />
          <div id={carouselId} className="trending-grid mt-4 md:mt-6">
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
  if (!items.length) return null;

  return (
    <section id={section.slug} className="home-section home-fresh-drop section-space bg-white">
      <PublicSectionFrame variant="near-wide">
        <SectionHeading
          title={section.title}
          description={setting?.subtitle}
          textPosition={setting?.text_position}
          action={
            <div className="flex items-center gap-4">
              {configuredCta || <Link href="/koleksi" className="hidden text-sm font-medium hover:underline sm:block">Lihat Semua Produk</Link>}
              <ScrollButtons containerId={carouselId} />
            </div>
          }
        />
        <div id={carouselId} className="home-bleed-rail public-frame-rail fresh-drop-rail no-scrollbar mt-4 flex snap-x snap-mandatory overflow-x-auto md:mt-6">
          {items.map((item, index) => (
            <ProductCard
              key={section.items[index]?.id || item.product.id || item.product.slug || `${item.product.nama}-${index}`}
              item={item}
              className="fresh-drop-card shrink-0 snap-start"
            />
          ))}
        </div>
      </PublicSectionFrame>
    </section>
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
  const aboutParagraphs = normalizeAboutParagraphs(content.trustAbout.about_body);
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": `${siteConfig.siteUrl}/#organization`, name: "DEBRODER", url: siteConfig.siteUrl, logo: absoluteUrl("/brand/debroder/logo-primary-black.png"), email: content.contact.email, sameAs: [content.contact.instagram, content.contact.facebook].filter(Boolean) },
      ...stores.map((store) => ({ "@type": "LocalBusiness", name: `DEBRODER ${store.nama_store}`, image: getStoreImage(store), address: store.alamat, telephone: store.whatsapp, url: absoluteUrl("/store") }))
    ]
  };

  return (
    <main className="public-site min-h-screen bg-white text-[#111]">
      <SiteHeader navigationFacets={buildPublicNavigationFacets(content.products, content.productCategories)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />

      <LandingSectionSlot setting={landingSection("hero")}>
        <HeroSlider heroes={content.heroes} />
      </LandingSectionSlot>

      <LandingSectionSlot setting={landingSection("benefits")}>
        <section aria-label="Keunggulan DEBRODER" className="trust-strip border-y border-black/10 bg-white">
          <div className="benefit-grid section-shell no-scrollbar flex snap-x snap-mandatory overflow-x-auto lg:grid lg:grid-cols-4 lg:overflow-visible">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="flex min-w-[72vw] snap-start items-center gap-3 border-r border-black/10 px-1 py-4 last:border-r-0 sm:min-w-[42vw] lg:min-w-0 lg:justify-center lg:px-3">
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
        <CampaignBanners
          banners={content.campaignBanners}
          fallbackDesktopSrc={landingSection("campaign-banners")?.desktop_image_url || content.heroes[0]?.image_url || content.hero.image_url || fallbackImages.banner}
          fallbackMobileSrc={landingSection("campaign-banners")?.mobile_image_url || content.heroes[0]?.mobile_image_url || content.hero.mobile_image_url || fallbackImages.bannerMobile}
        />
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
        <section id="shop-category" className="home-section home-categories section-space bg-white">
          <PublicSectionFrame variant="inset">
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
                  <ScrollButtons containerId="category-carousel" largeTargets />
                </div>
              }
            />
            <div id="category-carousel" tabIndex={0} aria-label="Daftar kategori DEBRODER" className="home-bleed-rail public-frame-rail category-carousel premium-scrollbar mt-4 flex snap-x snap-mandatory overflow-x-auto pb-6 md:mt-6">
              {shopCategoryItems.length ? shopCategoryItems.map((item) => (
                <CategoryEditorialCard key={`${item.href}-${item.title}`} item={item} />
              )) : homeCategories.length ? homeCategories.map((item) => (
                <CategoryEditorialCard
                  key={item.name}
                  item={{
                    ...item,
                    label: "",
                    title: item.name,
                    button: "",
                    href: item.href
                  }}
                />
              )) : <p className="px-5 py-8 text-sm text-black/55">Belum ada kategori.</p>}
            </div>
          </PublicSectionFrame>
        </section>
      </LandingSectionSlot>

      {content.instagramBanner?.id ? (
        <section id="instagram" className="home-section home-instagram section-space bg-white" aria-label="Instagram DEBRODER">
          <PublicSectionFrame variant="near-wide">
            <PublicInstagramBanner banner={content.instagramBanner} />
          </PublicSectionFrame>
        </section>
      ) : null}

      <LandingSectionSlot setting={landingSection("stores")}>
        <>
          <section id="store" className="home-section home-store section-space bg-white">
            <PublicSectionFrame variant="inset">
              <SectionHeading
                title={landingSection("stores")?.title || "Store DEBRODER"}
                description={landingSection("stores")?.subtitle || "Konsultasikan bahan, teknik cetak, dan estimasi produksi langsung bersama tim kami."}
                textPosition={landingSection("stores")?.text_position}
                action={<Link href={landingSection("stores")?.cta_url || "/store"} className="hidden text-sm font-semibold hover:underline sm:block">{landingSection("stores")?.cta_label || "Semua store"}</Link>}
              />
              <div className="mt-4 md:mt-6">
                <PublicStoreLocator stores={stores} />
              </div>
            </PublicSectionFrame>
          </section>

          <section className="home-section home-order section-space bg-white" aria-labelledby="cara-order-heading">
            <PublicSectionFrame variant="inset">
              <div className="public-divider flex flex-col gap-6 border-y py-6 sm:flex-row sm:items-center sm:justify-between md:py-8">
                <div>
                  <p className="text-sm font-medium text-black/55">Belum yakin harus mulai dari mana?</p>
                  <h3 id="cara-order-heading" className="mt-2 text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">Pesan apparel custom dengan alur yang jelas.</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href="/cara-order" className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#111] px-6 text-sm font-semibold text-white transition hover:bg-black/75">Cara Order</Link>
                  <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-full border border-black/20 px-6 text-sm font-semibold text-[#111] transition hover:border-black">Konsultasi WhatsApp</a>
                </div>
              </div>
            </PublicSectionFrame>
          </section>
        </>
      </LandingSectionSlot>

      <LandingSectionSlot setting={landingSection("about")}>
        <section id="tentang" className="home-section home-about section-space bg-white">
          <PublicSectionFrame variant="near-wide" className="grid gap-6 md:gap-8 lg:grid-cols-2 lg:items-center lg:gap-10">
            <div className={content.trustAbout.text_position === "center" ? "text-center" : content.trustAbout.text_position === "right" ? "text-right" : ""}>
              <p className="public-eyebrow">Tentang Kami</p>
              <h2 className="home-page-title mt-2 max-w-2xl">TENTANG DEBRODER</h2>
              <div className="mt-4 max-w-2xl space-y-4 text-base leading-8 text-black/62">
                {aboutParagraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
              {content.trustAbout.cta_label && content.trustAbout.cta_url ? <Link href={content.trustAbout.cta_url} className="mt-6 inline-flex min-h-11 items-center rounded-full bg-[#111] px-6 text-sm font-semibold text-white transition hover:bg-black/75">{content.trustAbout.cta_label}</Link> : null}
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
          </PublicSectionFrame>
        </section>
      </LandingSectionSlot>

      <PublicFooter content={content} variant="dark" />
    </main>
  );
}
