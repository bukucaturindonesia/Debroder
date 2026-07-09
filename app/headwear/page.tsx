import type { Metadata } from "next";
import { PageHero, PublicShell } from "@/components/PublicPage";
import { ProductCatalog } from "@/components/ProductCatalog";
import { productsForCategoryRoute } from "@/lib/product-route-matching";
import { getPublicContent } from "@/lib/public-data";

export const metadata: Metadata = {
  title: "Headwear | DE BRODER",
  description:
    "Koleksi headwear DE BRODER untuk topi, cap, merchandise, komunitas, dan brand apparel custom.",
  alternates: { canonical: "/headwear" },
  openGraph: {
    title: "Headwear | DE BRODER",
    description:
      "Headwear untuk topi, cap, merchandise, komunitas, dan brand apparel custom."
  }
};

export default async function HeadwearPage() {
  const content = await getPublicContent();
  const pageHero = content.pageHeroes.find((hero) => hero.page_key === "headwear");
  const products = productsForCategoryRoute(content.products, content.productCategories, "headwear");

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
          { label: "Headwear" }
        ]}
      />
      <section data-reveal className="bg-brand-offWhite pb-12 pt-8 sm:pb-16 sm:pt-10">
        <div className="section-shell">
          <div className="max-w-2xl">
            <p className="text-xs font-medium tracking-[0.08em] text-brand-charcoal/55">Kategori Headwear</p>
            <h2 className="landing-section-title mt-2">Pilih headwear sesuai kebutuhan</h2>
            <p className="mt-3 text-sm leading-6 text-brand-charcoal/65">Pilih tipe topi, warna, bahan, dan kebutuhan bordir atau custom produksi.</p>
          </div>
          <div className="mt-6">
            <ProductCatalog products={products} showCategoryFilter={false} />
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
