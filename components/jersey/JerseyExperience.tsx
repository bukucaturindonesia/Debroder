import Link from "next/link";
import { CategoryHero } from "@/components/public/CategoryHero";
import { ProductCatalog } from "@/components/ProductCatalog";
import { productsForCategoryRoute } from "@/lib/product-route-matching";
import { ResponsivePicture } from "@/components/ResponsivePicture";
import { jerseyRowsByGroup, jerseySectionItems, resolvedJerseySections, validJerseyHref } from "@/lib/jersey-experience";
import type { CmsBanner, PageHeroContent, PublicContent, ServiceCategory } from "@/lib/types";

function CampaignCard({ item }: { item: CmsBanner }) {
  const href = validJerseyHref(item.cta_url);
  const media = item.media_type === "video" ? item.poster_url || item.desktop_media_url : item.desktop_media_url;
  const mobileMedia = item.media_type === "video" ? item.poster_url || media : item.mobile_media_url || media;
  const card = (
    <div className="group grid grid-cols-[100px_minmax(0,1fr)] gap-4 border border-black/10 p-3 sm:grid-cols-[160px_minmax(0,1fr)] sm:p-4">
      <div className="relative aspect-[4/5] overflow-hidden bg-[#f2f2ef]"><ResponsivePicture desktopSrc={media} mobileSrc={mobileMedia} alt={item.image_alt || item.title} className="h-full w-full object-cover transition group-hover:scale-[1.02]" desktopObjectPosition={item.object_position} mobileObjectPosition={item.mobile_object_position || item.object_position} desktopZoom={item.focal_zoom} mobileZoom={item.mobile_focal_zoom} /></div>
      <div className="flex flex-col justify-center"><p className="text-xs font-medium text-black/50">{item.eyebrow || "Jersey DEBRODER"}</p><h3 className="mt-1 text-lg font-semibold sm:text-xl">{item.title}</h3>{item.subtitle ? <p className="mt-2 line-clamp-3 text-sm leading-6 text-black/60">{item.subtitle}</p> : null}{href ? <span className="mt-3 text-sm font-semibold underline underline-offset-4">Jelajahi</span> : null}</div>
    </div>
  );
  return <article id={item.anchor_id || undefined}>{href ? <Link href={href} className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">{card}</Link> : card}</article>;
}

function OrderSteps({ item }: { item: CmsBanner }) {
  const steps = jerseySectionItems(item);
  if (!steps.length) return null;
  return <section className="border-t border-black/10 bg-[#f7f7f5] py-7 sm:py-9"><div className="section-shell"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-black/50">Cara order</p><h2 className="mt-1 text-2xl font-semibold">{item.title || "Proses pemesanan Jersey"}</h2><ol className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">{steps.slice(0, 4).map((step, index) => <li key={`${index}-${step}`} className="flex gap-3 border-t border-black/15 pt-3"><span className="text-xs font-semibold text-black/45">0{index + 1}</span><span className="text-sm leading-6">{step}</span></li>)}</ol></div></section>;
}

function firstByType(items: CmsBanner[], type: string) { return items.find((item) => item.section_type === type); }

export function JerseyExperience({ content, hero, categories }: { content: PublicContent; hero: PageHeroContent | undefined; categories: ServiceCategory[] }) {
  const sections = resolvedJerseySections(content.jerseySections, hero, categories);
  const featured = [...jerseyRowsByGroup(sections, "poster_carousel", "carousel-01"), ...jerseyRowsByGroup(sections, "split_campaign", "split-01")].slice(0, 3);
  const orderSteps = firstByType(sections, "order_steps");
  const cmsCategories = categories.filter((category) => category.category_key === "jersey").slice(0, 4);
  const products = productsForCategoryRoute(content.products, content.productCategories, "jersey");

  return (
    <div className="jersey-category-experience public-category-experience bg-white text-[#111]">
      <CategoryHero
        desktopImage={hero?.image_url}
        mobileImage={hero?.mobile_image_url}
        alt={hero?.image_alt || "Jersey DEBRODER"}
        seoTitle="Jersey DEBRODER"
        objectPosition={hero?.object_position}
        mobileObjectPosition={hero?.mobile_object_position}
        objectFit={hero?.object_fit}
        imageZoom={hero?.focal_zoom}
        mobileImageZoom={hero?.mobile_focal_zoom}
      />

      <section className="section-shell category-hero-following pb-7 sm:pb-9" aria-label="Jelajahi Jersey">
        <nav className="public-breadcrumbs" aria-label="Breadcrumb"><Link href="/">Beranda</Link><span aria-hidden="true">/</span><span aria-current="page">Jersey</span></nav>
        <h2 className="public-section-title mb-6">Play with Identity</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/jersey/shop" className="flex min-h-24 items-center justify-between gap-4 border border-black/15 px-5 py-4 transition hover:border-black"><span><span className="block text-xs text-black/50">Ready Stock</span><span className="mt-1 block text-lg font-semibold">Belanja Jersey</span></span><span aria-hidden="true" className="text-xl">→</span></Link>
          <Link href="/jersey/configurator" className="flex min-h-24 items-center justify-between gap-4 border border-black/15 px-5 py-4 transition hover:border-black"><span><span className="block text-xs text-black/50">Konfigurasi untuk tim</span><span className="mt-1 block text-lg font-semibold">Custom Jersey</span></span><span aria-hidden="true" className="text-xl">→</span></Link>
        </div>
      </section>

      <section id="catalog" className="section-shell public-category-section scroll-mt-24" aria-labelledby="jersey-catalog-title">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4"><h2 id="jersey-catalog-title" className="public-section-title">Katalog Jersey</h2><Link href="/jersey/shop" className="public-secondary-action border">Semua Jersey <span aria-hidden="true">↗</span></Link></div>
        <ProductCatalog products={products} title="Katalog Jersey" showCategoryFilter={false} showStatusFilter showSizeFilter catalogStyle="category" catalogProfile="jersey" initialSort="featured" />
      </section>

      <section className="section-shell public-category-section" aria-labelledby="jersey-custom-title"><div className="public-category-panel"><div><p className="public-eyebrow">Custom Jersey</p><h2 id="jersey-custom-title" className="public-section-title">Atur kebutuhan tim lewat configurator.</h2><p className="public-secondary-copy mt-3">Pilih model dan konfigurasi jersey melalui alur khusus yang tersedia.</p><Link href="/jersey/configurator" className="public-button public-button--primary mt-5">Mulai Custom Jersey</Link></div><div><p className="public-eyebrow">Layanan Sublimasi</p><h3 className="mt-2 text-2xl font-semibold">Maklon Sublim</h3><p className="public-secondary-copy mt-3">Jelajahi layanan cetak sublim untuk kebutuhan produksi Anda.</p><Link href="/cetak-sublim" className="public-secondary-action mt-5 border">Lihat Cetak Sublim</Link></div></div></section>

      {cmsCategories.length ? <section className="border-t border-black/10 py-7 sm:py-9"><div className="section-shell"><h2 className="text-2xl font-semibold">Kategori Jersey</h2><div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">{cmsCategories.map((category) => <Link key={category.id || category.slug || category.nama_kategori} href={`/jersey/shop?category=${encodeURIComponent(category.slug || category.nama_kategori.toLowerCase())}`} className="border border-black/10 p-3 text-sm font-medium hover:border-black">{category.nama_kategori}</Link>)}</div></div></section> : null}

      {featured.length ? <section className="border-t border-black/10 py-7 sm:py-9"><div className="section-shell"><div className="mb-4"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-black/50">Pilihan Jersey</p><h2 className="mt-1 text-2xl font-semibold">Pilihan untuk tim Anda</h2></div><div className="grid gap-3 md:grid-cols-2">{featured.map((item) => <CampaignCard key={item.id || item.section_key} item={item} />)}</div></div></section> : null}
      {orderSteps ? <OrderSteps item={orderSteps} /> : null}
      <nav aria-label="Tautan Jersey" className="section-shell flex flex-wrap gap-x-6 gap-y-3 py-6 text-sm"><Link href="/jersey/shop" className="font-semibold underline underline-offset-4">Semua produk Jersey</Link><Link href="/jersey/configurator" className="underline underline-offset-4">Jersey Configurator</Link><Link href="/help" className="text-black/65 underline underline-offset-4">Bantuan</Link></nav>
    </div>
  );
}
