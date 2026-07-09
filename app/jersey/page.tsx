import type { Metadata } from "next";
import { JerseyCatalog } from "@/components/JerseyCatalog";
import { PageHero, PublicShell } from "@/components/PublicPage";
import { ProductCatalog } from "@/components/ProductCatalog";
import { fallbackCategories, getPageHeroImage } from "@/lib/fallback-data";
import { productsForCategoryRoute } from "@/lib/product-route-matching";
import { getPublicContent } from "@/lib/public-data";
import { whatsappHref } from "@/lib/url";

export const metadata: Metadata = {
  title: "Custom Jersey | DE BRODER",
  description: "Pembuatan jersey custom untuk tim olahraga, sekolah, kantor, komunitas, instansi, dan event.",
  alternates: { canonical: "/jersey" }
};

export default async function JerseyPage() {
  const content = await getPublicContent();
  const pageHero = content.pageHeroes.find((hero) => hero.page_key === "jersey");
  const specificCategories = content.categories.filter((category) => category.category_key === "jersey");
  const categories = specificCategories.length
    ? specificCategories
    : fallbackCategories.filter((category) => category.category_key === "jersey");
  const products = productsForCategoryRoute(content.products, content.productCategories, "jersey");

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
        imageZoom={pageHero?.focal_zoom}
        mobileImageZoom={pageHero?.mobile_focal_zoom}
        ctaText={undefined}
        ctaHref={undefined}
        secondaryCtaText={undefined}
        secondaryCtaHref={undefined}
        breadcrumbs={[{ label: "Beranda", href: "/" }, { label: "Jersey" }]}
      />
      <JerseyCatalog categories={categories} />
      {products.length ? (
        <section className="bg-brand-offWhite py-10 sm:py-12">
          <div className="section-shell">
            <ProductCatalog products={products} title="Produk Jersey" showHeading showCategoryFilter={false} />
          </div>
        </section>
      ) : null}
    </PublicShell>
  );
}
