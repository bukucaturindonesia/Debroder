import Link from "next/link";
import type { ReactNode } from "react";
import { CampaignBanners } from "@/components/CampaignBanners";
import { HeroSlider } from "@/components/HeroSlider";
import { PageMotion } from "@/components/PageMotion";
import { PublicFooter } from "@/components/PublicFooter";
import { ResponsivePicture } from "@/components/ResponsivePicture";
import { SafeImage } from "@/components/SafeImage";
import { ScrollButtons } from "@/components/ScrollButtons";
import { SiteHeader } from "@/components/SiteHeader";
import { WhatsAppFloat } from "@/components/WhatsAppFloat";
import { fallbackImages, getProductImage, getStoreImage } from "@/lib/fallback-data";
import { getPublicContent } from "@/lib/public-data";
import { productOrderHref } from "@/lib/order";
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
  return <div style={{ order: setting?.sort_order ?? 0 }}>{children}</div>;
}

function managedSectionKey(slug: string) {
  if (slug === "featured") return "featured-products";
  if (slug === "fresh-drops") return "fresh-drop";
  return slug;
}

type Visual = {
  image: string;
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
  orderHref?: string;
};
type ProductItem = Visual & {
  name: string;
  category: string;
  price: string;
  href: string;
  fit: string;
  orderHref?: string;
};

const mobileCarouselClass = "no-scrollbar mt-6 flex snap-x snap-mandatory gap-2 overflow-x-auto md:grid md:overflow-visible";
const mobileCarouselItemClass = "min-w-[76vw] shrink-0 snap-start md:min-w-0 md:shrink";

function productItem(product: Product): ProductItem {
  return {
    name: product.nama,
    category: product.kategori,
    price: formatRupiah(product.price ?? product.harga ?? product.base_price) || "Hubungi kami",
    href: `/produk/${product.slug || product.nama.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
    orderHref: productOrderHref(product),
    image: getProductImage(product),
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
  if (item.product) {
    return {
      label: item.product.kategori,
      title: item.product.nama,
      button: "Lihat Produk",
      href: `/produk/${item.product.slug || item.product.nama.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
      orderHref: productOrderHref(item.product),
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
      title: item.service.nama,
      button: "Lihat Layanan",
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
  if (item.service) {
    return {
      name: item.service.nama,
      category: "Layanan",
      price: item.service.harga_mulai ? `Mulai ${formatRupiah(item.service.harga_mulai)}` : "Hubungi kami",
      href: serviceHref(item.service),
      image: item.service.image_url,
      imageAlt: item.service.image_alt || item.service.nama,
      fallbackImage: fallbackImages.product,
      objectFit: item.service.object_fit,
      objectPosition: item.service.object_position,
      fit: item.service.object_fit || "cover"
    };
  }
  return null;
}

function SectionHeading({ title, action, description, textPosition = "left" }: { title: string; action?: ReactNode; description?: string; textPosition?: "left" | "center" | "right" }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className={textPosition === "center" ? "flex-1 text-center" : textPosition === "right" ? "ml-auto text-right" : ""}>
        <h2 className="text-[1.75rem] font-bold leading-[1.05] tracking-[-0.02em] text-[#111] sm:text-[2rem]">{title}</h2>
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
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#eaf2ed] text-[#0f5a36]">
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {paths[name]}
      </svg>
    </span>
  );
}

function EditorialCard({ item, featuredCard = false, className = "" }: { item: EditorialItem; featuredCard?: boolean; className?: string }) {
  return (
    <article className={`group relative block overflow-hidden bg-[#0a1711] ${featuredCard ? "h-[440px] sm:h-[500px] lg:h-[560px]" : "h-[400px] sm:h-[440px]"} ${className}`}>
      <Link href={item.href} aria-label={`Lihat ${item.title}`} className="absolute inset-0 z-10" />
      <SafeImage src={item.image} fallbackSrc={item.fallbackImage} alt={item.imageAlt} fill sizes={featuredCard ? "(min-width: 1024px) 50vw, 86vw" : "(min-width: 1024px) 33vw, 82vw"} className="object-cover transition duration-700 group-hover:scale-[1.03]" objectFit={item.objectFit || "cover"} objectPosition={item.objectPosition} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/8 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-5 text-white sm:p-7">
        <p className="text-xs font-semibold text-white/72">{item.label}</p>
        <h3 className={`mt-2 max-w-md font-semibold leading-tight tracking-[-0.025em] ${featuredCard ? "text-2xl sm:text-[1.75rem]" : "text-xl sm:text-2xl"}`}>{item.title}</h3>
        <div className="pointer-events-auto relative z-30 mt-5 flex flex-wrap gap-2"><Link href={item.href} className="inline-flex min-h-10 items-center rounded-full bg-white px-4 text-sm font-semibold text-[#111] transition group-hover:bg-[#e9eee9]">{item.button}</Link>{item.orderHref ? <Link href={item.orderHref} className="inline-flex min-h-10 items-center rounded-full bg-[#0f5a36] px-4 text-sm font-semibold text-white">Pesan</Link> : null}</div>
      </div>
    </article>
  );
}

function ProductCard({ item, className = "" }: { item: ProductItem; className?: string }) {
  return (
    <article className={`group min-w-0 ${className}`}>
      <Link href={item.href} className="block">
      <div className="relative aspect-[4/5] overflow-hidden bg-[#f2f2ed]">
        <SafeImage src={item.image} fallbackSrc={item.fallbackImage} alt={item.imageAlt} fill sizes="(min-width: 1536px) 20vw, (min-width: 1024px) 25vw, 50vw" className={`${(item.objectFit || item.fit) === "contain" ? "object-contain p-3" : "object-cover"} transition duration-700 group-hover:scale-[1.03]`} objectFit={item.objectFit || (item.fit === "contain" ? "contain" : "cover")} objectPosition={item.objectPosition} />
      </div>
      </Link>
      <div className="pt-4">
        <Link href={item.href}><h3 className="line-clamp-2 text-sm font-semibold text-[#111] sm:text-base">{item.name}</h3></Link>
        <p className="mt-1 text-sm font-semibold text-[#111]">{item.price}</p>
        <p className="mt-1 text-xs text-black/50 sm:text-sm">{item.category}</p>
        {item.orderHref ? <Link href={item.orderHref} className="mt-3 inline-flex min-h-10 w-full items-center justify-center bg-[#0f5a36] px-4 text-xs font-semibold text-white">Pesan</Link> : null}
      </div>
    </article>
  );
}

function ManagedHomepageSection({ section, setting }: { section: HomepageSection; setting?: LandingSection }) {
  const carouselId = `${section.slug}-carousel`;
  const isFeatured = section.slug === "featured";
  const isEditorial = isFeatured || section.slug === "trending";
  const configuredCta = setting?.cta_label && setting.cta_url ? <Link href={setting.cta_url} className="hidden text-sm font-semibold hover:underline sm:block">{setting.cta_label}</Link> : null;

  if (isEditorial) {
    const items = section.items.map(editorialPlacement).filter((item): item is EditorialItem => Boolean(item));
    if (!items.length) return null;
    return (
      <section data-reveal id={section.slug} className={`snap-section section-space ${section.slug === "trending" ? "bg-[#f7f7f2]" : "bg-white"}`}>
        <div className="section-shell">
          <SectionHeading title={section.title} description={setting?.subtitle} textPosition={setting?.text_position} action={<div className="flex items-center gap-4">{configuredCta}{!isFeatured ? <ScrollButtons containerId={carouselId} /> : null}</div>} />
          <div id={carouselId} className={isFeatured ? "mt-6 grid grid-cols-1 gap-2 lg:grid-cols-2" : `${mobileCarouselClass} md:grid-cols-2 lg:grid-cols-3`}>
            {items.map((item, index) => <EditorialCard key={section.items[index]?.id || `${item.href}-${index}`} item={item} featuredCard={isFeatured} className={isFeatured ? "" : mobileCarouselItemClass} />)}
          </div>
        </div>
      </section>
    );
  }

  const items = section.items.map(cardPlacement).filter((item): item is ProductItem => Boolean(item));
  if (!items.length) return null;
  return (
    <section data-reveal id={section.slug} className="snap-section section-space bg-white">
      <div className="section-shell">
        <SectionHeading title={section.title} description={setting?.subtitle} textPosition={setting?.text_position} action={<div className="flex items-center gap-4">{configuredCta || <Link href="/koleksi" className="hidden text-sm font-semibold hover:underline sm:block">Shop</Link>}<ScrollButtons containerId={carouselId} /></div>} />
        <div id={carouselId} className={`${mobileCarouselClass} gap-y-6 md:grid-cols-2 lg:grid-cols-4`}>
          {items.map((item, index) => <ProductCard key={section.items[index]?.id || `${item.href}-${index}`} item={item} className={mobileCarouselItemClass} />)}
        </div>
      </div>
    </section>
  );
}

function StoreCard({ store, index }: { store: Store; index: number }) {
  const name = store.nama_store.replace(/^STORE\s+/i, "");
  const whatsappHref = whatsappLinkWithMessage(store.whatsapp_link || store.whatsapp, `Halo DEBRODER, saya ingin bertanya tentang Store ${name}.`);

  return (
    <article className="min-w-[82vw] shrink-0 snap-start border border-black/10 bg-white p-5 sm:min-w-[360px] lg:min-w-0 lg:p-6">
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0f5a36]">Store {String(index + 1).padStart(2, "0")}</span>
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#0f5a36]" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z" /><circle cx="12" cy="10" r="2" />
        </svg>
      </div>
      <h3 className="mt-8 text-2xl font-semibold tracking-[-0.03em] text-[#111]">{name}</h3>
      <p className="mt-3 min-h-[48px] text-sm leading-6 text-black/55">{store.alamat}</p>
      {store.jam_operasional ? <p className="mt-3 text-xs font-medium text-black/45">{store.jam_operasional}</p> : null}
      <div className="mt-6 grid grid-cols-2 gap-2">
        <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#063d24] px-3 text-sm font-semibold text-white transition hover:bg-[#0f5a36]">WhatsApp</a>
        <a href={store.maps_link} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-full border border-black/15 px-3 text-sm font-semibold text-[#111] transition hover:border-[#0f5a36] hover:text-[#0f5a36]">Lihat Lokasi</a>
      </div>
    </article>
  );
}

export default async function Home() {
  const content = await getPublicContent();
  const homeCategories = content.categories.slice(0, 5).map((category) => ({
    name: category.nama_kategori,
    href: `/${category.link_slug.replace(/^\/+/, "") || "koleksi"}`,
    image: category.gambar_url,
    imageAlt: category.image_alt || category.nama_kategori,
    fallbackImage: fallbackImages.product,
    objectFit: category.object_fit,
    objectPosition: category.object_position
  }));
  const apparelProducts = content.products.filter((product) => /kaos|apparel|cotton|hoodie|polo/i.test(`${product.nama} ${product.kategori}`));
  const homeCollection = (apparelProducts.length ? apparelProducts : content.products).slice(0, 5).map(productItem);
  const stores = content.stores.filter((item) => item.status_aktif !== false).sort((a, b) => a.urutan - b.urutan).slice(0, 4);
  const whatsappHref = whatsappLinkWithMessage(content.contact.whatsapp_link || content.contact.whatsapp_utama, "Halo DEBRODER, saya ingin konsultasi kebutuhan apparel.");
  const landingSectionMap = new Map(
    content.landingSections.map((section) => [section.section_key, section])
  );
  const landingSection = (sectionKey: string) => landingSectionMap.get(sectionKey);
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": "https://debroder.com/#organization", name: "DEBRODER", url: "https://debroder.com", logo: "https://debroder.com/brand/debroder/logo-primary-black.png", email: content.contact.email, sameAs: [content.contact.instagram, content.contact.facebook].filter(Boolean) },
      ...stores.map((store) => ({ "@type": "LocalBusiness", name: `DEBRODER ${store.nama_store}`, image: getStoreImage(store), address: store.alamat, telephone: store.whatsapp, url: "https://debroder.com/store" }))
    ]
  };

  return (
    <main className="public-site min-h-screen bg-white text-[#111]">
      <SiteHeader />
      <PageMotion />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />

      <div className="flex flex-col">
      <LandingSectionSlot setting={landingSection("hero")}>
        <HeroSlider heroes={content.heroes} />
      </LandingSectionSlot>

      <LandingSectionSlot setting={landingSection("benefits")}>
      <section data-reveal aria-label="Keunggulan DEBRODER" className="snap-section border-b border-black/[0.08] bg-white py-5 sm:py-6">
        <div className="section-shell grid grid-cols-2 gap-x-4 gap-y-5 lg:grid-cols-4 lg:gap-8">
          {benefits.map((benefit) => (
            <div key={benefit.title} className="flex items-center gap-3 lg:justify-center">
              <BenefitIcon name={benefit.icon} />
              <div>
                <h2 className="text-[13px] font-semibold leading-5 sm:text-sm">{benefit.title}</h2>
                <p className="mt-0.5 text-[11px] text-black/50 sm:text-xs">{benefit.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      </LandingSectionSlot>

      {content.homepageSections.map((section) => {
        const setting = landingSection(managedSectionKey(section.slug));
        const managedSection = setting?.title ? { ...section, title: setting.title } : section;
        return (
          <LandingSectionSlot key={section.id} setting={setting}>
            <ManagedHomepageSection section={managedSection} setting={setting} />
          </LandingSectionSlot>
        );
      })}

      <LandingSectionSlot setting={landingSection("campaign-banners")}>
        <CampaignBanners banners={content.campaignBanners} />
      </LandingSectionSlot>

      <LandingSectionSlot setting={landingSection("services-products")}>
      <section data-reveal id="shop-category" className="snap-section section-space bg-white pt-4 sm:pt-6">
        <div className="section-shell">
          <SectionHeading title={landingSection("services-products")?.title || "Shop by Category"} description={landingSection("services-products")?.subtitle} textPosition={landingSection("services-products")?.text_position} action={<div className="flex items-center gap-4">{landingSection("services-products")?.cta_label && landingSection("services-products")?.cta_url ? <Link href={landingSection("services-products")!.cta_url!} className="hidden text-sm font-semibold hover:underline sm:block">{landingSection("services-products")!.cta_label}</Link> : null}<ScrollButtons containerId="category-carousel" /></div>} />
          <div id="category-carousel" className={`${mobileCarouselClass} gap-y-6 md:grid-cols-2 lg:grid-cols-4`}>
            {homeCategories.length ? homeCategories.map((item) => (
              <Link key={item.name} href={item.href} className={`group relative aspect-[4/5] min-w-0 overflow-hidden bg-[#102219] ${mobileCarouselItemClass}`}>
                <SafeImage src={item.image} fallbackSrc={item.fallbackImage} alt={item.imageAlt} fill sizes="(min-width: 1536px) 20vw, (min-width: 1024px) 25vw, 50vw" className="object-cover transition duration-700 group-hover:scale-[1.03]" objectFit={item.objectFit || "cover"} objectPosition={item.objectPosition} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <h3 className="absolute bottom-4 left-4 line-clamp-2 text-base font-semibold text-white sm:bottom-6 sm:left-6 sm:text-xl">{item.name}</h3>
              </Link>
            )) : <p className="col-span-full bg-brand-offWhite p-8 text-center text-sm text-black/55">Belum ada kategori.</p>}
          </div>
        </div>
      </section>
      </LandingSectionSlot>

      <LandingSectionSlot setting={landingSection("plain-category")}>
      {content.landingSettings.showPlainCategorySection ? (
        <section data-reveal id="koleksi" className="snap-section section-space bg-[#f7f7f2]">
          <div className="section-shell">
            <SectionHeading title={landingSection("plain-category")?.title || "Pakaian Polos berdasarkan Kategori"} description={landingSection("plain-category")?.subtitle || "Pilih dasar apparel yang sesuai, lalu custom bersama tim DEBRODER."} textPosition={landingSection("plain-category")?.text_position} action={<ScrollButtons containerId="collection-carousel" />} />
            <div id="collection-carousel" className={`${mobileCarouselClass} gap-y-6 md:grid-cols-2 lg:grid-cols-4`}>
              {homeCollection.length ? homeCollection.map((item) => (
                <article key={item.name} className={`group min-w-0 ${mobileCarouselItemClass}`}>
                  <Link href={item.href} className="block">
                  <div className="relative aspect-[4/5] overflow-hidden bg-white">
                    <SafeImage src={item.image} fallbackSrc={item.fallbackImage} alt={item.imageAlt} fill sizes="(min-width: 1536px) 20vw, (min-width: 1024px) 25vw, 50vw" className={`${(item.objectFit || item.fit) === "contain" ? "object-contain p-4" : "object-cover"} transition duration-700 group-hover:scale-[1.03]`} objectFit={item.objectFit || (item.fit === "contain" ? "contain" : "cover")} objectPosition={item.objectPosition} />
                  </div>
                  </Link>
                  <Link href={item.href} className="mt-3 block"><h3 className="line-clamp-2 text-sm font-semibold sm:text-base">{item.name}</h3></Link>
                  <p className="mt-1 text-sm text-black/50">{item.price}</p>
                  {item.orderHref ? <Link href={item.orderHref} className="mt-3 inline-flex min-h-10 w-full items-center justify-center bg-[#0f5a36] px-4 text-xs font-semibold text-white">Pesan</Link> : null}
                </article>
              )) : <p className="col-span-full bg-white p-8 text-center text-sm text-black/55">Belum ada produk apparel.</p>}
            </div>
          </div>
        </section>
      ) : null}
      </LandingSectionSlot>

      <LandingSectionSlot setting={landingSection("instagram-banner")}>
      {content.instagramBanner?.status_aktif !== false ? (
        <section data-reveal id="instagram" className="snap-section bg-white py-4 sm:py-6">
          <div className="section-shell">
            <a
              href={content.instagramBanner?.link_url || content.contact.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative block aspect-[4/5] overflow-hidden bg-[#0a1711] sm:aspect-[16/6]"
            >
              {content.instagramBanner?.media_type === "video" && content.instagramBanner.video_url ? (
                <video autoPlay muted loop playsInline preload="metadata" poster={content.instagramBanner.image_url || fallbackImages.banner} className="h-full w-full object-cover">
                  {content.instagramBanner.mobile_video_url ? <source src={content.instagramBanner.mobile_video_url} media="(max-width: 767px)" /> : null}
                  <source src={content.instagramBanner.video_url} />
                </video>
              ) : (
                <ResponsivePicture
                  desktopSrc={content.instagramBanner?.image_url || fallbackImages.banner}
                  mobileSrc={content.instagramBanner?.mobile_image_url || content.instagramBanner?.image_url || fallbackImages.bannerMobile}
                  alt={content.instagramBanner?.image_alt || content.instagramBanner?.title || "Instagram DE BRODER"}
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.02]"
                  desktopObjectPosition={content.instagramBanner?.object_position}
                  mobileObjectPosition={content.instagramBanner?.mobile_object_position}
                  objectFit={content.instagramBanner?.object_fit || "cover"}
                  desktopZoom={content.instagramBanner?.focal_zoom}
                  mobileZoom={content.instagramBanner?.mobile_focal_zoom}
                  fallbackSrc={fallbackImages.banner}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/20 to-transparent" />
              <div className={`absolute inset-x-0 bottom-0 p-6 text-white sm:p-10 ${content.instagramBanner?.text_position === "center" ? "text-center" : content.instagramBanner?.text_position === "right" ? "text-right" : ""}`}>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">{content.instagramBanner?.eyebrow || "Instagram"}</p>
                <h2 className="mt-2 max-w-xl text-2xl font-semibold tracking-[-0.03em] sm:text-4xl">
                  {content.instagramBanner?.title || "Ikuti DE BRODER di Instagram"}
                </h2>
                {content.instagramBanner?.subtitle ? <p className="mt-3 text-sm text-white/75">{content.instagramBanner.subtitle}</p> : null}
                {content.instagramBanner?.cta_label ? <span className="mt-5 inline-flex min-h-10 items-center bg-white px-5 text-sm font-semibold text-black">{content.instagramBanner.cta_label}</span> : null}
              </div>
            </a>
          </div>
        </section>
      ) : null}
      </LandingSectionSlot>

      <LandingSectionSlot setting={landingSection("stores")}>
      <section data-reveal id="store" className="snap-section section-space bg-white">
        <div className="section-shell">
          <SectionHeading title={landingSection("stores")?.title || "Store DEBRODER"} description={landingSection("stores")?.subtitle || "Konsultasikan bahan, teknik cetak, dan estimasi produksi langsung bersama tim kami."} textPosition={landingSection("stores")?.text_position} action={<Link href={landingSection("stores")?.cta_url || "/store"} className="hidden text-sm font-semibold hover:underline sm:block">{landingSection("stores")?.cta_label || "Semua store"}</Link>} />
          <div className="no-scrollbar mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto lg:grid lg:grid-cols-4 lg:overflow-visible">
            {stores.map((store, index) => <StoreCard key={store.nama_store} store={store} index={index} />)}
          </div>
        </div>
      </section>
      </LandingSectionSlot>

      <LandingSectionSlot setting={landingSection("about")}>
      <section data-reveal id="tentang" className="snap-section section-space bg-[#f5f5ef]">
        <div className="section-shell grid gap-10 lg:grid-cols-[1.15fr_.85fr] lg:items-start lg:gap-20">
          <div className={content.trustAbout.text_position === "center" ? "text-center" : content.trustAbout.text_position === "right" ? "text-right" : ""}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0f5a36]">Tentang DEBRODER</p>
            <h2 className="mt-4 max-w-xl text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">Dibangun untuk ide yang ingin diwujudkan.</h2>
            <p className="mt-6 max-w-2xl whitespace-pre-line text-base leading-8 text-black/62">{content.trustAbout.about_body}</p>
            {content.trustAbout.cta_label && content.trustAbout.cta_url ? <Link href={content.trustAbout.cta_url} className="mt-6 inline-flex min-h-11 items-center bg-[#063d24] px-6 text-sm font-semibold text-white">{content.trustAbout.cta_label}</Link> : null}
          </div>
          {content.trustAbout.video_url ? (
            <video src={content.trustAbout.video_url} autoPlay muted loop playsInline className="aspect-[4/3] w-full object-cover" />
          ) : content.trustAbout.image_url ? (
            <ResponsivePicture desktopSrc={content.trustAbout.image_url} mobileSrc={content.trustAbout.mobile_image_url || content.trustAbout.image_url} alt="Tentang DEBRODER" className="aspect-[4/3] h-full w-full object-cover" />
          ) : <div className="grid grid-cols-2 border-l border-t border-black/10">
            {[["2016", "Berdiri"], ["4", "Store Aktif"], ["DTF", "& Apparel"], ["ID", "Kirim Indonesia"]].map(([value, label]) => (
              <div key={`${value}-${label}`} className="border-b border-r border-black/10 p-5 sm:p-7">
                <p className="text-2xl font-semibold tracking-[-0.03em] text-[#063d24] sm:text-3xl">{value}</p>
                <p className="mt-2 text-xs font-medium text-black/50 sm:text-sm">{label}</p>
              </div>
            ))}
          </div>}
        </div>
      </section>
      </LandingSectionSlot>
      </div>

      <PublicFooter content={content} />
      <WhatsAppFloat href={whatsappHref} />
    </main>
  );
}
