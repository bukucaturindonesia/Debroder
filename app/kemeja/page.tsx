import type { Metadata } from "next";
import { PageHero, PublicShell } from "@/components/PublicPage";
import { ProductCatalog } from "@/components/ProductCatalog";
import { getCatalogPageModel } from "@/lib/catalog-page/runtime";

export const metadata: Metadata = {
  title: "Kemeja Custom | DE BRODER",
  description: "Kemeja custom untuk kantor, komunitas, organisasi, instansi, dan seragam kerja.",
  alternates: { canonical: "/kemeja" }
};

export default async function KemejaPage() {
  const model = await getCatalogPageModel({ routeKey: "kemeja" });
  const { hero, products } = model.data;

  return (
    <PublicShell>
      <PageHero
        label={hero.label}
        title={hero.title}
        description={hero.description}
        imageUrl={hero.imageUrl}
        mobileImageUrl={hero.mobileImageUrl}
        objectPosition={hero.objectPosition}
        mobileObjectPosition={hero.mobileObjectPosition}
        objectFit={hero.objectFit}
        imageZoom={hero.imageZoom}
        mobileImageZoom={hero.mobileImageZoom}
        breadcrumbs={[{ label: "Beranda", href: "/" }, { label: "Kemeja" }]}
      />
      <section className="bg-brand-offWhite py-10 sm:py-12">
        <div className="section-shell">
          <ProductCatalog products={products} title="Koleksi Kemeja" showHeading showCategoryFilter={false} />
        </div>
      </section>
    </PublicShell>
  );
}
