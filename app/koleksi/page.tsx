import type { Metadata } from "next";
import { ProductCatalog } from "@/components/ProductCatalog";
import { PageHero, PublicShell } from "@/components/PublicPage";
import { getCatalogPageModel } from "@/lib/catalog-page/runtime";

export const metadata: Metadata = {
  title: "Koleksi & Layanan DE BRODER",
  description: "Temukan layanan apparel, percetakan, custom jersey, sablon DTF, kaos polos, maklon DTF, dan cetak sublim dari DE BRODER.",
  alternates: { canonical: "/koleksi" },
  openGraph: {
    title: "Koleksi & Layanan DE BRODER",
    description: "Layanan apparel, percetakan, custom jersey, sablon DTF, kaos polos, maklon DTF, dan cetak sublim dari DE BRODER."
  }
};

type KoleksiPageProps = {
  searchParams?: Promise<{
    color?: string | string[];
    status?: string | string[];
    label?: string | string[];
    sort?: string | string[];
  }>;
};

export default async function KoleksiPage({ searchParams }: KoleksiPageProps) {
  const model = await getCatalogPageModel({
    routeKey: "koleksi",
    scope: "all",
    searchParams: searchParams ? await searchParams : {}
  });
  const { hero, products, filters } = model.data;

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
        breadcrumbs={[{ label: "Beranda", href: "/" }, { label: "Koleksi" }]}
      />
      <section className="bg-brand-offWhite py-12 md:py-16 lg:py-20">
        <div className="section-shell">
          <ProductCatalog
            products={products}
            title="Hasil Koleksi"
            showHeading
            initialColor={filters.color}
            initialLabel={filters.label}
            initialSort={filters.sort === "price-low" || filters.sort === "price-high" ? "order" : filters.sort}
            initialStatus={filters.status}
            showStatusFilter
            catalogStyle="category"
            showCardActions
            syncUrlState
          />
        </div>
      </section>
    </PublicShell>
  );
}
