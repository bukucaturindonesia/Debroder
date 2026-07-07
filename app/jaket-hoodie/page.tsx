import type { Metadata } from "next";
import { PageHero, PublicShell } from "@/components/PublicPage";
import { ProductCatalog } from "@/components/ProductCatalog";
import { productsForCategoryRoute } from "@/lib/product-route-matching";
import { jacketTypeOptions, productTypeValue } from "@/lib/product-taxonomy";
import { getPublicContent } from "@/lib/public-data";

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

type JaketHoodiePageProps = {
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

export default async function JaketHoodiePage({ searchParams }: JaketHoodiePageProps) {
  const content = await getPublicContent();
  const params = searchParams ? await searchParams : {};
  const pageHero = content.pageHeroes.find((hero) => hero.page_key === "jaket-hoodie");
  const products = productsForCategoryRoute(content.products, content.productCategories, "jaket-hoodie");
  const initialColor = firstParam(params.color) || "all";
  const initialLabel = productLabel(params.label);
  const initialSort = productSort(params.sort);
  const initialProductType = productTypeValue(firstParam(params.type), jacketTypeOptions);

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
          <ProductCatalog products={products} title="Koleksi Jaket & Hoodie" showHeading showCategoryFilter={false} initialColor={initialColor} initialLabel={initialLabel} initialSort={initialSort} initialProductType={initialProductType} productTypeOptions={jacketTypeOptions} typeFilterLabel="Semua tipe jaket" />
        </div>
      </section>
    </PublicShell>
  );
}
