import type { Metadata } from "next";
import { PageHero, PublicShell } from "@/components/PublicPage";
import { PublicSectionFrame } from "@/components/PublicSectionFrame";
import { PublicStoreLocator } from "@/components/PublicStoreLocator";
import { getPublicContent } from "@/lib/public-data";

export const metadata: Metadata = {
  title: "Toko DEBRODER",
  description:
    "Temukan toko DEBRODER di Pettarani, Tello, Landak, dan Parepare.",
  alternates: { canonical: "/store" },
  openGraph: {
    title: "Toko DEBRODER",
    description:
      "Toko DEBRODER untuk sablon kaos, cetak DTF, jersey, dan kaos polos."
  }
};

export default async function StorePage() {
  const content = await getPublicContent();
  const pageHero = content.pageHeroes.find((hero) => hero.page_key === "store");

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
        breadcrumbs={[
          { label: "Beranda", href: "/" },
          { label: "Toko" }
        ]}
      />
      <section className="bg-brand-offWhite py-10 sm:py-12">
        <PublicSectionFrame variant="inset">
          <PublicStoreLocator stores={content.stores} />
        </PublicSectionFrame>
      </section>
    </PublicShell>
  );
}
