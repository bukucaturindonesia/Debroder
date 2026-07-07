import type { Metadata } from "next";
import { KaosCatalog } from "@/components/KaosCatalog";
import { PageHero, PublicShell } from "@/components/PublicPage";
import { getPageHeroImage } from "@/lib/fallback-data";
import { productsForCategoryRoute } from "@/lib/product-route-matching";
import { kaosTypeOptions, productTypeValue } from "@/lib/product-taxonomy";
import { getPublicContent } from "@/lib/public-data";
import { whatsappHref } from "@/lib/url";

export const metadata: Metadata = {
  title: "Kaos Polos New State Apparel & Cotton Combed | DE BRODER",
  description: "DE BRODER menyediakan kaos polos, kaos NSA, dan cotton combed untuk sablon, brand clothing, komunitas, event, dan pembelian partai.",
  alternates: { canonical: "/kaos-polos" }
};

type KaosPolosPageProps = {
  searchParams?: Promise<{
    color?: string | string[];
    label?: string | string[];
    sort?: string | string[];
    type?: string | string[];
  }>;
};

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function productLabel(value?: string | string[]) {
  const label = firstParam(value);
  return label === "new" || label === "promo" || label === "best" ? label : "all";
}

function productSort(value?: string | string[]) {
  const sort = firstParam(value);
  return sort === "newest" || sort === "best-selling" || sort === "price-low" || sort === "price-high" ? sort : "order";
}

export default async function KaosPolosPage({ searchParams }: KaosPolosPageProps) {
  const content = await getPublicContent();
  const params = searchParams ? await searchParams : {};
  const pageHero = content.pageHeroes.find((hero) => hero.page_key === "kaos-polos");
  const products = productsForCategoryRoute(content.products, content.productCategories, "kaos-polos");
  const initialColor = firstParam(params.color) || "all";
  const initialLabel = productLabel(params.label);
  const initialSort = productSort(params.sort);
  const initialProductType = productTypeValue(firstParam(params.type), kaosTypeOptions);

  return (
    <PublicShell content={content}>
      <PageHero
        label={pageHero?.label || "KAOS POLOS"}
        title={pageHero?.title || "Kaos Polos New State Apparel & Cotton Combed"}
        description={pageHero?.subtitle || "Pilihan kaos polos untuk brand, komunitas, event, dan kebutuhan harian."}
        imageUrl={getPageHeroImage(pageHero)}
        mobileImageUrl={pageHero?.mobile_image_url}
        objectPosition={pageHero?.object_position}
        mobileObjectPosition={pageHero?.mobile_object_position}
        objectFit={pageHero?.object_fit}
        imageZoom={pageHero?.focal_zoom}
        mobileImageZoom={pageHero?.mobile_focal_zoom}
        ctaText="Konsultasi Kaos Polos"
        ctaHref={whatsappHref(content.contact.whatsapp_apparel)}
        secondaryCtaText="Temukan Store"
        secondaryCtaHref="/store"
        breadcrumbs={[{ label: "Beranda", href: "/" }, { label: "Kaos Polos" }]}
      />
      <KaosCatalog products={products} filters={content.productFilters} initialColor={initialColor} initialLabel={initialLabel} initialSort={initialSort} initialProductType={initialProductType} />
    </PublicShell>
  );
}
