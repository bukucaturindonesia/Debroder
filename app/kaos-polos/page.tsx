import type { Metadata } from "next";
import { KaosCatalog } from "@/components/KaosCatalog";
import { PageHero, PublicShell } from "@/components/PublicPage";
import { getPageHeroImage } from "@/lib/fallback-data";
import { getPublicContent } from "@/lib/public-data";
import { whatsappHref } from "@/lib/url";

export const metadata: Metadata = {
  title: "Kaos Polos New State Apparel & Cotton Combed | DE BRODER",
  description: "DE BRODER menyediakan kaos polos, kaos NSA, dan cotton combed untuk sablon, brand clothing, komunitas, event, dan pembelian partai.",
  alternates: { canonical: "/kaos-polos" }
};

export default async function KaosPolosPage() {
  const content = await getPublicContent();
  const pageHero = content.pageHeroes.find((hero) => hero.page_key === "kaos-polos");
  const products = content.products.filter((product) => {
    const value = `${product.kategori} ${product.nama} ${product.subcategory || ""} ${product.link_url || ""}`.toLowerCase();
    return value.includes("kaos") && !/jaket|jacket|hoodie|headwear|topi|cap|hat/.test(value);
  });

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
      <KaosCatalog products={products} filters={content.productFilters} />
    </PublicShell>
  );
}
