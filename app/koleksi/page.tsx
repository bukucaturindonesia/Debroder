import type { Metadata } from "next";
import { CategoryHero } from "@/components/public/CategoryHero";
import { CollectionCommerceExperience } from "@/components/CollectionCommerceExperience";
import { PublicShell } from "@/components/PublicPage";
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
    q?: string | string[];
    color?: string | string[];
    status?: string | string[];
    label?: string | string[];
    sort?: string | string[];
    price?: string | string[];
    size?: string | string[];
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
      <CategoryHero seoTitle={"Koleksi"} alt={"Koleksi"} desktopImage={hero.imageUrl} mobileImage={hero.mobileImageUrl} objectPosition={hero.objectPosition} mobileObjectPosition={hero.mobileObjectPosition} objectFit={hero.objectFit} imageZoom={hero.imageZoom} mobileImageZoom={hero.mobileImageZoom} />
      <CollectionCommerceExperience
        products={products}
        campaigns={model.data.campaigns}
        initialQuery={filters.query}
        initialColor={filters.color}
        initialLabel={filters.label}
        initialSort={filters.sort}
        initialStatus={filters.status}
      />
    </PublicShell>
  );
}
