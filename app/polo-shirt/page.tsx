import type { Metadata } from "next";
import { PageHero, PublicShell } from "@/components/PublicPage";
import { ProductCatalog } from "@/components/ProductCatalog";
import { productsForCategoryRoute } from "@/lib/product-route-matching";
import { getPublicContent } from "@/lib/public-data";

export const metadata: Metadata = {
  title: "Polo Shirt | DE BRODER",
  description: "Polo shirt custom untuk kantor, komunitas, event, bordir logo, dan apparel custom.",
  alternates: { canonical: "/polo-shirt" }
};

export default async function PoloShirtPage() {
  const content = await getPublicContent();
  const pageHero = content.pageHeroes.find((hero) => hero.page_key === "polo-shirt");
  const products = productsForCategoryRoute(content.products, content.productCategories, "polo-shirt");

  return (
    <PublicShell content={content}>
      <PageHero
        label={pageHero?.label || "POLO SHIRT"}
        title={pageHero?.title || "Polo Shirt Custom"}
        description={pageHero?.subtitle || "Polo shirt untuk seragam kantor, komunitas, event, dan kebutuhan brand apparel."}
        imageUrl={pageHero?.image_url}
        mobileImageUrl={pageHero?.mobile_image_url}
        objectPosition={pageHero?.object_position}
        mobileObjectPosition={pageHero?.mobile_object_position}
        objectFit={pageHero?.object_fit}
        imageZoom={pageHero?.focal_zoom}
        mobileImageZoom={pageHero?.mobile_focal_zoom}
        breadcrumbs={[{ label: "Beranda", href: "/" }, { label: "Polo Shirt" }]}
      />
      <section className="bg-white py-12 sm:py-16">
        <div className="section-shell">
          <ProductCatalog products={products} title="Koleksi Polo Shirt" showHeading showCategoryFilter={false} />
        </div>
      </section>
    </PublicShell>
  );
}
