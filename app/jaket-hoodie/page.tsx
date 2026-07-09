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
          { label: "Jaket & Hoodie" }
        ]}
      />
      <section data-reveal className="bg-brand-offWhite pb-12 pt-8 sm:pb-16 sm:pt-10">
        <div className="section-shell">
          <div className="max-w-2xl">
            <p className="text-xs font-medium tracking-[0.08em] text-brand-charcoal/55">Kategori Jaket & Hoodie</p>
            <h2 className="landing-section-title mt-2">Pilih jaket sesuai kebutuhan</h2>
            <p className="mt-3 text-sm leading-6 text-brand-charcoal/65">Pilih tipe jaket, bahan, warna, ukuran, dan kebutuhan produksi yang paling sesuai.</p>
          </div>
          <div className="mt-6">
            <ProductCatalog products={products} showCategoryFilter={false} initialColor={initialColor} initialLabel={initialLabel} initialSort={initialSort} initialProductType={initialProductType} productTypeOptions={jacketTypeOptions} typeFilterLabel="Semua tipe jaket" />
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
