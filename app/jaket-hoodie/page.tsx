import type { Metadata } from "next";
import { PageHero, PublicShell } from "@/components/PublicPage";
import { ProductCatalog } from "@/components/ProductCatalog";
import { getPublicContent } from "@/lib/public-data";
import type { Product } from "@/lib/types";

export const metadata: Metadata = {
  title: "Jaket & Hoodie | DE BRODER",
  description:
    "Koleksi jaket dan hoodie DE BRODER untuk brand, komunitas, merchandise, dan kebutuhan apparel custom.",
  alternates: { canonical: "/jaket-hoodie" },
  openGraph: {
    title: "Jaket & Hoodie | DE BRODER",
    description:
      "Jaket dan hoodie untuk brand, komunitas, merchandise, dan kebutuhan apparel custom."
  }
};

function matchesJaketHoodie(product: Product) {
  const value = [
    product.nama,
    product.kategori,
    product.subcategory,
    product.brand,
    ...(product.collection_tags || [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return /jaket|jacket|hoodie|hoodies/.test(value);
}

export default async function JaketHoodiePage() {
  const content = await getPublicContent();
  const pageHero = content.pageHeroes.find((hero) => hero.page_key === "jaket-hoodie");
  const products = content.products.filter(matchesJaketHoodie);

  return (
    <PublicShell content={content}>
      <PageHero
        label={pageHero?.label || "JAKET & HOODIE"}
        title={pageHero?.title || "Jaket & Hoodie"}
        description={
          pageHero?.subtitle ||
          "Pilihan jaket dan hoodie untuk merchandise, komunitas, event, dan brand apparel."
        }
        imageUrl={pageHero?.image_url}
        mobileImageUrl={pageHero?.mobile_image_url}
        objectPosition={pageHero?.object_position}
        mobileObjectPosition={pageHero?.mobile_object_position}
        objectFit={pageHero?.object_fit}
        imageZoom={pageHero?.focal_zoom}
        mobileImageZoom={pageHero?.mobile_focal_zoom}
        breadcrumbs={[
          { label: "Beranda", href: "/" },
          { label: "Jaket & Hoodie" }
        ]}
      />
      <section className="bg-white py-12 sm:py-16">
        <div className="section-shell">
          <ProductCatalog products={products} title="Koleksi Jaket & Hoodie" showHeading showCategoryFilter={false} />
        </div>
      </section>
    </PublicShell>
  );
}
