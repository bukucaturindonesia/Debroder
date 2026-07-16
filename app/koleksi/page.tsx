import type { Metadata } from "next";
import { ProductCatalog } from "@/components/ProductCatalog";
import { PageHero, PublicShell } from "@/components/PublicPage";
import { getPublicContent } from "@/lib/public-data";

export const metadata: Metadata = {
  title: "Koleksi & Layanan DE BRODER",
  description:
    "Temukan layanan apparel, percetakan, custom jersey, sablon DTF, kaos polos, maklon DTF, dan cetak sublim dari DE BRODER.",
  alternates: { canonical: "/koleksi" },
  openGraph: {
    title: "Koleksi & Layanan DE BRODER",
    description:
      "Layanan apparel, percetakan, custom jersey, sablon DTF, kaos polos, maklon DTF, dan cetak sublim dari DE BRODER."
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

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeFilterValue(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default async function KoleksiPage({ searchParams }: KoleksiPageProps) {
  const content = await getPublicContent();
  const params = searchParams ? await searchParams : {};
  const selectedColor = normalizeFilterValue(firstParam(params.color) || "all");
  const selectedStatus = normalizeFilterValue(firstParam(params.status) || "all");
  const selectedLabel = normalizeFilterValue(firstParam(params.label) || "all");
  const selectedSort = normalizeFilterValue(firstParam(params.sort) || "order");
  const products = content.products.filter((product) => product.status_aktif !== false);
  const pageHero = content.pageHeroes.find((hero) => hero.page_key === "koleksi");

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
        breadcrumbs={[{ label: "Beranda", href: "/" }, { label: "Koleksi" }]}
      />

      <section className="bg-brand-offWhite py-12 md:py-16 lg:py-20">
        <div className="section-shell">
          <ProductCatalog
            products={products}
            title="Hasil Koleksi"
            showHeading
            initialColor={selectedColor}
            initialLabel={selectedLabel === "best" || selectedLabel === "new" || selectedLabel === "promo" ? selectedLabel : "all"}
            initialSort={selectedSort === "newest" || selectedSort === "best-selling" ? selectedSort : "order"}
            initialStatus={selectedStatus}
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
