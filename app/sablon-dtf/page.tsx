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
    <PublicShell content={content}>
      <PageHero
        label={pageHero?.label || "SABLON DTF"}
        title={pageHero?.title || "Sablon DTF untuk Apparel Custom"}
        description={pageHero?.subtitle || "Hasil sablon rapi untuk logo, desain brand, komunitas, dan produksi apparel."}
        imageUrl={getPageHeroImage(pageHero)}
        mobileImageUrl={pageHero?.mobile_image_url}
        objectPosition={pageHero?.object_position}
        mobileObjectPosition={pageHero?.mobile_object_position}
        objectFit={pageHero?.object_fit}
        imageZoom={pageHero?.focal_zoom}
        mobileImageZoom={pageHero?.mobile_focal_zoom}
        ctaText="Konsultasi Sablon DTF"
        ctaHref={whatsappHref(content.contact.whatsapp_apparel)}
        secondaryCtaText="Cara Order"
        secondaryCtaHref="/cara-order"
        breadcrumbs={[{ label: "Beranda", href: "/" }, { label: "Sablon DTF" }]}
      />
      <ServiceCatalog services={services} whatsapp={content.contact.whatsapp_link || content.contact.whatsapp_apparel} />
      {products.length ? (
        <section className="bg-white py-12 sm:py-16">
          <div className="section-shell">
            <ProductCatalog products={products} title="Produk Sablon DTF" showHeading showCategoryFilter={false} />
          </div>
        </section>
      ) : null}
    </PublicShell>
  );
}
