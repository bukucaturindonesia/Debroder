import type { Metadata } from "next";
import { CustomHub } from "@/components/custom/CustomHub";
import { PublicShell } from "@/components/PublicPage";
import { getCatalogPageModel } from "@/lib/catalog-page/runtime";
import { listCustomCategories } from "@/lib/custom-commerce/data";
import type { PageHeroContent } from "@/lib/types";

export const metadata: Metadata = {
  title: "Pesanan Custom | DEBRODER",
  description: "Pilih kategori dan susun pesanan custom DEBRODER dari produk, varian, layanan, serta rincian harga yang tersedia.",
  alternates: { canonical: "/custom" }
};

export default async function CustomPage() {
  const [categories, catalog] = await Promise.all([
    listCustomCategories(),
    getCatalogPageModel({ routeKey: "custom", scope: "all", searchParams: {} })
  ]);
  const hero = catalog.data.hero;
  const pageHero: PageHeroContent = {
    page_key: "custom",
    label: hero.label || "",
    title: hero.title || "",
    subtitle: hero.description || "",
    image_url: hero.imageUrl || "",
    mobile_image_url: hero.mobileImageUrl,
    object_position: hero.objectPosition || "center center",
    mobile_object_position:
      hero.mobileObjectPosition || hero.objectPosition || "center center",
    object_fit: hero.objectFit,
    focal_zoom: hero.imageZoom,
    mobile_focal_zoom: hero.mobileImageZoom,
    primary_cta_label: hero.ctaText,
    primary_cta_url: hero.ctaHref,
    secondary_cta_label: hero.secondaryCtaText,
    secondary_cta_url: hero.secondaryCtaHref,
    status_aktif: true
  };

  return (
    <PublicShell>
      <CustomHub
        categories={categories}
        products={catalog.data.products}
        pageHero={pageHero}
      />
    </PublicShell>
  );
}
