import Link from "next/link";
import type { ReactNode } from "react";
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
import type { HomepageSection, HomepageSectionItem, Product, Service, Store } from "@/lib/types";
import { formatRupiah, whatsappLinkWithMessage } from "@/lib/url";

const benefits = [
  { icon: "clock", title: "Produksi Cepat", detail: "Alur kerja terukur" },
  { icon: "spark", title: "Kualitas Premium", detail: "Material terbaik" },
  { icon: "one", title: "Tanpa Minimum", detail: "Mulai dari satu pcs" },
  { icon: "truck", title: "Kirim ke Seluruh Indonesia", detail: "Aman ke seluruh kota" }
];

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
};
type ProductItem = Visual & {
  name: string;
  category: string;
  price: string;
  href: string;
  fit: string;
};

function productItem(product: Product): ProductItem {
  return {
    name: product.nama,
    category: product.kategori,
    price: formatRupiah(product.price ?? product.harga ?? product.base_price) || "Hubungi kami",
    href: `/produk/${product.slug || product.nama.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
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

function SectionHeading({ title, action, description }: { title: string; action?: ReactNode; description?: string }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h2 className="text-[1.75rem] font-semibold leading-tight tracking-[-0.035em] text-[#111] sm:text-[2rem]">{title}</h2>
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

function EditorialCard({ item, featuredCard = false }: { item: EditorialItem; featuredCard?: boolean }) {
  return (
    <Link href={item.href} className={`group relative block shrink-0 snap-start overflow-hidden bg-[#0a1711] ${featuredCard ? "h-[470px] min-w-[86vw] sm:h-[520px] sm:min-w-[72vw] lg:h-[520px] lg:min-w-0" : "h-[390px] min-w-[82vw] sm:min-w-[52vw] lg:h-[420px] lg:min-w-0"}`}>
      <SafeImage src={item.image} fallbackSrc={item.fallbackImage} alt={item.imageAlt} fill sizes={featuredCard ? "(min-width: 1024px) 50vw, 86vw" : "(min-width: 1024px) 33vw, 82vw"} className="object-cover transition duration-700 group-hover:scale-[1.03]" objectFit={item.objectFit || "cover"} objectPosition={item.objectPosition} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/8 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-7">
        <p className="text-xs font-semibold text-white/72">{item.label}</p>
        <h3 className={`mt-2 max-w-md font-semibold leading-tight tracking-[-0.025em] ${featuredCard ? "text-2xl sm:text-[1.75rem]" : "text-xl sm:text-2xl"}`}>{item.title}</h3>
        <span className="mt-5 inline-flex min-h-10 items-center rounded-full bg-white px-4 text-sm font-semibold text-[#111] transition group-hover:bg-[#e9eee9]">{item.button}</span>
      </div>
    </Link>
  );
}

function ProductCard({ item }: { item: ProductItem }) {
  return (
    <Link href={item.href} className="group block min-w-0">
      <div className="relative aspect-[4/5] overflow-hidden bg-[#f2f2ed]">
        <SafeImage src={item.image} fallbackSrc={item.fallbackImage} alt={item.imageAlt} fill sizes="(min-width: 1536px) 20vw, (min-width: 1024px) 25vw, 50vw" className={`${(item.objectFit || item.fit) === "contain" ? "object-contain p-3" : "object-cover"} transition duration-700 group-hover:scale-[1.03]`} objectFit={item.objectFit || (item.fit === "contain" ? "contain" : "cover")} objectPosition={item.objectPosition} />
      </div>
      <div className="pt-4">
        <h3 className="line-clamp-2 text-sm font-semibold text-[#111] sm:text-base">{item.name}</h3>
        <p className="mt-1 text-sm font-semibold text-[#111]">{item.price}</p>
        <p className="mt-1 text-xs text-black/50 sm:text-sm">{item.category}</p>
      </div>
    </Link>
  );
}

function ManagedHomepageSection({ section }: { section: HomepageSection }) {
  const carouselId = `${section.slug}-carousel`;
  const isFeatured = section.slug === "featured";
  const isEditorial = isFeatured || section.slug === "trending";

  if (isEditorial) {
    const items = section.items.map(editorialPlacement).filter((item): item is EditorialItem => Boolean(item));
    if (!items.length) return null;
    return (
      <section data-reveal id={section.slug} className={`snap-section section-space ${section.slug === "trending" ? "bg-[#f7f7f2]" : "bg-white"}`}>
        <div className="section-shell">
          <SectionHeading title={section.title} action={isFeatured ? undefined : <ScrollButtons containerId={carouselId} />} />
          <div id={carouselId} className={`no-scrollbar mt-6 flex snap-x snap-mandatory overflow-x-auto lg:grid lg:overflow-visible ${isFeatured ? "gap-3 lg:grid-cols-2" : "gap-4 lg:grid-cols-3 lg:gap-5"}`}>
            {items.map((item, index) => <EditorialCard key={section.items[index]?.id || `${item.href}-${index}`} item={item} featuredCard={isFeatured} />)}
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
        <SectionHeading title={section.title} action={<div className="flex items-center gap-4"><Link href="/koleksi" className="hidden text-sm font-semibold hover:underline sm:block">Shop</Link><ScrollButtons containerId={carouselId} /></div>} />
        <div id={carouselId} className="mt-6 grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
          {items.map((item, index) => <ProductCard key={section.items[index]?.id || `${item.href}-${index}`} item={item} />)}
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
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": "https://debroder.com/#organization", name: "DEBRODER", url: "https://debroder.com", logo: "https://debroder.com/brand/debroder/logo-primary-black.png", email: content.contact.email, sameAs: [content.contact.instagram, content.contact.facebook].filter(Boolean) },
      ...stores.map((store) => ({ "@type": "LocalBusiness", name: `DEBRODER ${store.nama_store}`, image: getStoreImage(store), address: store.alamat, telephone: store.whatsapp, url: "https://debroder.com/store" }))
    ]
  };

  return (
    <main className="min-h-screen bg-white text-[#111]">
      <SiteHeader />
      <PageMotion />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />

      <HeroSlider heroes={content.heroes} />

      <section data-reveal aria-label="Keunggulan DEBRODER" className="snap-section border-b border-black/[0.08] bg-white py-5 sm:py-8">
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

      {content.homepageSections.map((section) => <ManagedHomepageSection key={section.id} section={section} />)}

      <section data-reveal id="shop-category" className="snap-section section-space bg-white pt-4 sm:pt-6">
        <div className="section-shell">
          <SectionHeading title="Shop by Category" action={<ScrollButtons containerId="category-carousel" />} />
          <div id="category-carousel" className="mt-6 grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
            {homeCategories.length ? homeCategories.map((item) => (
              <Link key={item.name} href={item.href} className="group relative aspect-[4/5] min-w-0 overflow-hidden bg-[#102219]">
                <SafeImage src={item.image} fallbackSrc={item.fallbackImage} alt={item.imageAlt} fill sizes="(min-width: 1536px) 20vw, (min-width: 1024px) 25vw, 50vw" className="object-cover transition duration-700 group-hover:scale-[1.03]" objectFit={item.objectFit || "cover"} objectPosition={item.objectPosition} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <h3 className="absolute bottom-4 left-4 line-clamp-2 text-base font-semibold text-white sm:bottom-6 sm:left-6 sm:text-xl">{item.name}</h3>
              </Link>
            )) : <p className="col-span-full bg-brand-offWhite p-8 text-center text-sm text-black/55">Belum ada kategori.</p>}
          </div>
        </div>
      </section>

      {content.landingSettings.showPlainCategorySection ? (
        <section data-reveal id="koleksi" className="snap-section section-space bg-[#f7f7f2]">
          <div className="section-shell">
            <SectionHeading title="Pakaian Polos berdasarkan Kategori" description="Pilih dasar apparel yang sesuai, lalu custom bersama tim DEBRODER." action={<ScrollButtons containerId="collection-carousel" />} />
            <div id="collection-carousel" className="mt-6 grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
              {homeCollection.length ? homeCollection.map((item) => (
                <Link key={item.name} href={item.href} className="group block min-w-0">
                  <div className="relative aspect-[4/5] overflow-hidden bg-white">
                    <SafeImage src={item.image} fallbackSrc={item.fallbackImage} alt={item.imageAlt} fill sizes="(min-width: 1536px) 20vw, (min-width: 1024px) 25vw, 50vw" className={`${(item.objectFit || item.fit) === "contain" ? "object-contain p-4" : "object-cover"} transition duration-700 group-hover:scale-[1.03]`} objectFit={item.objectFit || (item.fit === "contain" ? "contain" : "cover")} objectPosition={item.objectPosition} />
                  </div>
                  <h3 className="mt-3 line-clamp-2 text-sm font-semibold sm:text-base">{item.name}</h3>
                  <p className="mt-1 text-sm text-black/50">{item.price}</p>
                </Link>
              )) : <p className="col-span-full bg-white p-8 text-center text-sm text-black/55">Belum ada produk apparel.</p>}
            </div>
          </div>
        </section>
      ) : null}

      {content.instagramBanner?.status_aktif !== false ? (
        <section data-reveal id="instagram" className="snap-section bg-white py-4 sm:py-6">
          <div className="section-shell">
            <a
              href={content.instagramBanner?.link_url || content.contact.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative block aspect-[4/5] overflow-hidden bg-[#0a1711] sm:aspect-[16/6]"
            >
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
              <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-10">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Instagram</p>
                <h2 className="mt-2 max-w-xl text-2xl font-semibold tracking-[-0.03em] sm:text-4xl">
                  {content.instagramBanner?.title || "Ikuti DE BRODER di Instagram"}
                </h2>
              </div>
            </a>
          </div>
        </section>
      ) : null}

      <section data-reveal id="store" className="snap-section section-space bg-white">
        <div className="section-shell">
          <SectionHeading title="Store DEBRODER" description="Konsultasikan bahan, teknik cetak, dan estimasi produksi langsung bersama tim kami." action={<Link href="/store" className="hidden text-sm font-semibold hover:underline sm:block">Semua store</Link>} />
          <div className="no-scrollbar mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto lg:grid lg:grid-cols-4 lg:overflow-visible">
            {stores.map((store, index) => <StoreCard key={store.nama_store} store={store} index={index} />)}
          </div>
        </div>
      </section>

      <section data-reveal id="tentang" className="snap-section section-space bg-[#f5f5ef]">
        <div className="section-shell grid gap-10 lg:grid-cols-[1.15fr_.85fr] lg:items-start lg:gap-20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0f5a36]">Tentang DEBRODER</p>
            <h2 className="mt-4 max-w-xl text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">Dibangun untuk ide yang ingin diwujudkan.</h2>
            <p className="mt-6 max-w-2xl whitespace-pre-line text-base leading-8 text-black/62">{content.trustAbout.about_body}</p>
          </div>
          <div className="grid grid-cols-2 border-l border-t border-black/10">
            {[["2016", "Berdiri"], ["4", "Store Aktif"], ["DTF", "& Apparel"], ["ID", "Kirim Indonesia"]].map(([value, label]) => (
              <div key={`${value}-${label}`} className="border-b border-r border-black/10 p-5 sm:p-7">
                <p className="text-2xl font-semibold tracking-[-0.03em] text-[#063d24] sm:text-3xl">{value}</p>
                <p className="mt-2 text-xs font-medium text-black/50 sm:text-sm">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PublicFooter content={content} />
      <WhatsAppFloat href={whatsappHref} />
    </main>
  );
}
