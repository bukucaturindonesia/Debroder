import type { Metadata } from "next";
import { CategoryHero } from "@/components/public/CategoryHero";
import { getPublicCategoryHero } from "@/lib/public-category-hero";
import { CustomHub } from "@/components/custom/CustomHub";
import { PublicShell } from "@/components/PublicPage";
import { getCatalogPageModel } from "@/lib/catalog-page/runtime";
import { listCustomCategories } from "@/lib/custom-commerce/data";

export const metadata: Metadata = {
  title: "Pesanan Custom | DEBRODER",
  description: "Pilih kategori dan susun pesanan custom DEBRODER dari produk, varian, layanan, serta rincian harga yang tersedia.",
  alternates: { canonical: "/custom" }
};

export default async function CustomPage() {
  const [categories, catalog, hero] = await Promise.all([
    listCustomCategories(),
    getCatalogPageModel({ routeKey: "koleksi", scope: "all", searchParams: {} }),
    getPublicCategoryHero("custom")
  ]);
  return (
    <PublicShell>
      <CategoryHero
        desktopImage={hero?.image_url || undefined}
        mobileImage={hero?.mobile_image_url || undefined}
        alt="Custom DEBRODER"
        seoTitle="Pesanan Custom DEBRODER"
        objectPosition={hero?.object_position || undefined}
        mobileObjectPosition={hero?.mobile_object_position || undefined}
        objectFit={hero?.object_fit || undefined}
        imageZoom={hero?.focal_zoom}
        mobileImageZoom={hero?.mobile_focal_zoom}
      />
      <CustomHub categories={categories} products={catalog.data.products} />
    </PublicShell>
  );
}
