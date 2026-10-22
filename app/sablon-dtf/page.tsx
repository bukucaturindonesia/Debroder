import type { Metadata } from "next";
import Link from "next/link";
import { ResponsivePicture } from "@/components/ResponsivePicture";
import { CategoryHero } from "@/components/public/CategoryHero";
import { PublicShell } from "@/components/PublicPage";
import { ProductCatalog } from "@/components/ProductCatalog";
import { ServiceCatalog } from "@/components/ServiceCatalog";
import { fallbackServices } from "@/lib/fallback-data";
import { productsForCategoryRoute } from "@/lib/product-route-matching";
import { getPublicContent } from "@/lib/public-data";

export const metadata: Metadata = {
  title: "Sablon DTF | DE BRODER",
  description: "Layanan sablon DTF untuk kaos custom, brand clothing, event, komunitas, dan kebutuhan produksi.",
  alternates: { canonical: "/sablon-dtf" }
};

type SablonDtfPageProps = {
  searchParams?: Promise<{ q?: string | string[] }>;
};

export default async function SablonDtfPage({ searchParams }: SablonDtfPageProps) {
  const params = searchParams ? await searchParams : {};
  const queryParam = Array.isArray(params.q) ? params.q[0] : params.q;
  const content = await getPublicContent();
  const pageHero = content.pageHeroes.find((hero) => hero.page_key === "sablon-dtf");
  const databaseServices = content.services.filter((service) => {
    const value = `${service.category_key || ""} ${service.slug} ${service.nama}`.toLowerCase();
    return (service.category_key === "sablon-dtf" || value.includes("sablon-dtf") || value.includes("sablon dtf")) && !value.includes("maklon");
  });
  const services = databaseServices.length > 1
    ? databaseServices
    : fallbackServices.filter((service) => service.category_key === "sablon-dtf");
  const products = productsForCategoryRoute(content.products, content.productCategories, "sablon-dtf");
  const portfolio = content.campaignBanners.filter((banner) => banner.is_active !== false && banner.media_type === "image" && (banner.section_group === "sablon-dtf" || banner.cta_url?.startsWith("/sablon-dtf"))).slice(0, 6);

  return (
    <PublicShell footerTone="light">
      <div className="dtf-experience public-category-experience">
      <CategoryHero seoTitle={"Sablon DTF"} alt={"Sablon DTF"} desktopImage={pageHero?.image_url} mobileImage={pageHero?.mobile_image_url} objectPosition={pageHero?.object_position} mobileObjectPosition={pageHero?.mobile_object_position} objectFit={pageHero?.object_fit} imageZoom={pageHero?.focal_zoom} mobileImageZoom={pageHero?.mobile_focal_zoom} />
      <section className="section-shell public-category-intro">
        <nav className="public-breadcrumbs" aria-label="Breadcrumb"><Link href="/">Beranda</Link><span aria-hidden="true">/</span><span aria-current="page">Sablon DTF</span></nav>
        <p className="public-eyebrow">Apparel & Cetak</p><h2 className="public-section-title">Sablon DTF</h2>
        <p className="public-secondary-copy mt-3 max-w-2xl">Pilih layanan cetak, siapkan desain, dan tentukan kebutuhan pengerjaan Anda.</p>
        <div className="public-category-actions"><Link href="#dtf-services" className="public-button public-button--primary">Pilihan Layanan</Link><Link href="#custom-dtf" className="public-secondary-action border">Custom DTF</Link></div>
      </section>
      <div id="dtf-services" className="scroll-mt-24"><ServiceCatalog services={services} whatsapp={content.contact.whatsapp_link || content.contact.whatsapp_apparel} /></div>
      <section id="custom-dtf" className="section-shell public-category-section scroll-mt-24" aria-labelledby="dtf-custom-title">
        <div className="public-category-panel">
          <div><p className="public-eyebrow">Custom Design</p><h2 id="dtf-custom-title" className="public-section-title">Siapkan kebutuhan cetak Anda.</h2><p className="public-secondary-copy mt-3">Catat jumlah produk, posisi cetak, ukuran desain, sisi pengerjaan, dan catatan khusus sebelum membuka layanan custom.</p><Link href="/custom" className="public-button public-button--primary mt-5">Buka Pilihan Custom</Link></div>
          <div className="public-upload-unavailable"><label htmlFor="dtf-artwork" className="block font-semibold">Artwork / desain cetak</label><input id="dtf-artwork" type="file" disabled aria-describedby="dtf-upload-note" className="mt-4 block max-w-full text-sm disabled:opacity-50" /><p id="dtf-upload-note" className="public-secondary-copy mt-4 text-sm">Upload belum tersedia pada halaman ini. Gunakan builder pada layanan custom yang aktif untuk mengunggah desain; tidak ada file yang dikirim dari panel ini.</p><Link href="/help" className="mt-4 inline-flex min-h-11 items-center text-sm underline underline-offset-4">Panduan dan bantuan</Link></div>
        </div>
      </section>
      <section className="section-shell public-category-section" aria-labelledby="dtf-showcase-title"><h2 id="dtf-showcase-title" className="public-section-title">Showcase Sablon DTF</h2>{portfolio.length ? <div className="public-portfolio-grid mt-6">{portfolio.map((item) => <figure key={item.id} className="min-w-0"><div className="aspect-[4/5] overflow-hidden"><ResponsivePicture desktopSrc={item.desktop_media_url} mobileSrc={item.mobile_media_url || item.desktop_media_url} alt={item.image_alt || item.title || item.name} className="h-full w-full object-cover" /></div><figcaption className="mt-3 text-sm">{item.title || item.name}</figcaption></figure>)}</div> : <p className="public-category-empty mt-5">Dokumentasi produksi belum tersedia untuk ditampilkan.</p>}</section>
      {products.length ? (
        <section className="bg-brand-offWhite py-12 md:py-16 lg:py-20">
          <div className="section-shell">
            <div className="max-w-2xl">
              <p className="text-xs font-medium tracking-[0.08em] text-brand-charcoal/55">Produk Pendukung</p>
              <h2 className="landing-section-title mt-2">Produk untuk Sablon DTF</h2>
              <p className="mt-4 text-sm leading-6 text-brand-charcoal/65">Pilih produk yang cocok untuk custom DTF dan kebutuhan produksi apparel.</p>
            </div>
            <div className="mt-4 md:mt-6">
              <ProductCatalog products={products} initialQuery={(queryParam || "").trim().slice(0, 120)} showCategoryFilter={false} catalogStyle="category" syncUrlState />
            </div>
          </div>
        </section>
      ) : null}
      </div>
    </PublicShell>
  );
}
