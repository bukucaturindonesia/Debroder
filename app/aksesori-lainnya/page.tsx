import type { Metadata } from "next";
import { PageHero, PublicShell } from "@/components/PublicPage";
import { ProductCatalog } from "@/components/ProductCatalog";
import { productsForCategoryRoute } from "@/lib/product-route-matching";
import { getPublicContent } from "@/lib/public-data";

export const metadata: Metadata = {
  title: "Aksesori Lainnya | DE BRODER",
  description: "Patch, emblem, lanyard, merchandise, goodie bag, dan aksesori custom untuk event dan brand.",
  alternates: { canonical: "/aksesori-lainnya" }
};

export default async function AksesoriLainnyaPage() {
  const content = await getPublicContent();
  const pageHero = content.pageHeroes.find((hero) => hero.page_key === "aksesori-lainnya");
  const products = productsForCategoryRoute(content.products, content.productCategories, "aksesori-lainnya");

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
        breadcrumbs={[{ label: "Beranda", href: "/" }, { label: "Aksesori Lainnya" }]}
      />
      <section className="bg-white py-12 sm:py-16">
        <div className="section-shell">
          <ProductCatalog products={products} title="Koleksi Aksesori Lainnya" showHeading showCategoryFilter={false} />
        </div>
      </section>
    </PublicShell>
  );
}
