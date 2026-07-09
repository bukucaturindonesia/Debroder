import type { Metadata } from "next";
import { PageHero, PublicShell } from "@/components/PublicPage";
import { ProductCatalog } from "@/components/ProductCatalog";
import { productsForCategoryRoute } from "@/lib/product-route-matching";
import { getPublicContent } from "@/lib/public-data";

export const metadata: Metadata = {
  title: "Headwear | DE BRODER",
  description:
    "Koleksi headwear DE BRODER untuk topi, cap, merchandise, komunitas, dan brand apparel custom.",
  alternates: { canonical: "/headwear" },
  openGraph: {
    title: "Headwear | DE BRODER",
    description:
      "Headwear untuk topi, cap, merchandise, komunitas, dan brand apparel custom."
  }
};

export default async function HeadwearPage() {
  const content = await getPublicContent();
  const pageHero = content.pageHeroes.find((hero) => hero.page_key === "headwear");
  const products = productsForCategoryRoute(content.products, content.productCategories, "headwear");

  return (
    <PublicShell content={content}>
      <PageHero
        label={pageHero?.label}
        title={pageHero?.title}
        description={pageHero?.subtitle}
        imageUrl={pageHero?.image_url}
        mobileImageUrl={pageHero?.mobile_image_url}
        objectPosition={pageHero?.object_position}
        mobileObjectPosition={pageHero?.mobile_object_position}
        objectFit={pageHero?.object_fit}
        imageZoom={pageHero?.focal_zoom}
        mobileImageZoom={pageHero?.mobile_focal_zoom}
        breadcrumbs={[
          { label: "Beranda", href: "/" },
          { label: "Headwear" }
        ]}
      />
      <section className="bg-brand-offWhite py-12 sm:py-16">
        <div className="section-shell">
          <ProductCatalog products={products} title="Koleksi Headwear" showHeading showCategoryFilter={false} />
        </div>
      </section>
    </PublicShell>
  );
}
