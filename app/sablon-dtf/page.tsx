import type { Metadata } from "next";
import { PageHero, PublicShell } from "@/components/PublicPage";
import { ProductCatalog } from "@/components/ProductCatalog";
import { ServiceCatalog } from "@/components/ServiceCatalog";
import { fallbackServices, getPageHeroImage } from "@/lib/fallback-data";
import { productsForCategoryRoute } from "@/lib/product-route-matching";
import { getPublicContent } from "@/lib/public-data";
import { whatsappHref } from "@/lib/url";

export const metadata: Metadata = {
  title: "Sablon DTF | DE BRODER",
  description: "Layanan sablon DTF untuk kaos custom, brand clothing, event, komunitas, dan kebutuhan produksi.",
  alternates: { canonical: "/sablon-dtf" }
};

export default async function SablonDtfPage() {
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

  return (
    <PublicShell>
      <PageHero
        label={pageHero?.label}
        title={pageHero?.title}
        description={pageHero?.subtitle}
        imageUrl={getPageHeroImage(pageHero)}
        mobileImageUrl={pageHero?.mobile_image_url}
        objectPosition={pageHero?.object_position}
        mobileObjectPosition={pageHero?.mobile_object_position}
        objectFit={pageHero?.object_fit}
        imageZoom={pageHero?.focal_zoom}
        mobileImageZoom={pageHero?.mobile_focal_zoom}
        ctaText={undefined}
        ctaHref={undefined}
        secondaryCtaText={undefined}
        secondaryCtaHref={undefined}
        breadcrumbs={[{ label: "Beranda", href: "/" }, { label: "Sablon DTF" }]}
      />
      <ServiceCatalog services={services} whatsapp={content.contact.whatsapp_link || content.contact.whatsapp_apparel} />
      {products.length ? (
        <section data-reveal className="bg-brand-offWhite py-12 md:py-16 lg:py-20">
          <div className="section-shell">
            <div className="max-w-2xl">
              <p className="text-xs font-medium tracking-[0.08em] text-brand-charcoal/55">Produk Pendukung</p>
              <h2 className="landing-section-title mt-2">Produk untuk Sablon DTF</h2>
              <p className="mt-4 text-sm leading-6 text-brand-charcoal/65">Pilih produk yang cocok untuk custom DTF dan kebutuhan produksi apparel.</p>
            </div>
            <div className="mt-4 md:mt-6">
              <ProductCatalog products={products} showCategoryFilter={false} catalogStyle="category" showCardActions syncUrlState />
            </div>
          </div>
        </section>
      ) : null}
    </PublicShell>
  );
}
