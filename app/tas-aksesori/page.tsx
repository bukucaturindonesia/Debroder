import type { Metadata } from "next";
import { PageHero, PublicShell } from "@/components/PublicPage";
import { ProductCatalog } from "@/components/ProductCatalog";
import { productsForCategoryRoute } from "@/lib/product-route-matching";
import { getPublicContent } from "@/lib/public-data";

export const metadata: Metadata = {
  title: "Tas & Aksesori | DE BRODER",
  description: "Tas, tote bag, goodie bag, patch, emblem, lanyard, dan aksesori custom untuk event dan brand.",
  alternates: { canonical: "/tas-aksesori" }
};

export default async function TasAksesoriPage() {
  const content = await getPublicContent();
  const pageHero = content.pageHeroes.find((hero) => hero.page_key === "tas-aksesori");
  const products = productsForCategoryRoute(content.products, content.productCategories, "tas-aksesori");

  return (
    <PublicShell content={content}>
      <PageHero
        label={pageHero?.label || "TAS & AKSESORI"}
        title={pageHero?.title || "Tas & Aksesori Custom"}
        description={pageHero?.subtitle || "Tote bag, goodie bag, patch, emblem, lanyard, dan aksesori promosi."}
        imageUrl={pageHero?.image_url}
        mobileImageUrl={pageHero?.mobile_image_url}
        objectPosition={pageHero?.object_position}
        mobileObjectPosition={pageHero?.mobile_object_position}
        objectFit={pageHero?.object_fit}
        imageZoom={pageHero?.focal_zoom}
        mobileImageZoom={pageHero?.mobile_focal_zoom}
        breadcrumbs={[{ label: "Beranda", href: "/" }, { label: "Tas & Aksesori" }]}
      />
      <section className="bg-white py-12 sm:py-16">
        <div className="section-shell">
          <ProductCatalog products={products} title="Koleksi Tas & Aksesori" showHeading showCategoryFilter={false} />
        </div>
      </section>
    </PublicShell>
  );
}
