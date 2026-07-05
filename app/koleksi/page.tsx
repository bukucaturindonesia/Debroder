import type { Metadata } from "next";
import {
  PageHero,
  PublicShell,
  ServiceCard
} from "@/components/PublicPage";
import { ProductCatalog } from "@/components/ProductCatalog";
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
    group?: string | string[];
    label?: string | string[];
    sort?: string | string[];
  }>;
};

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function productGroup(value?: string | string[]) {
  const group = firstParam(value);
  return group === "jaket-hoodie" || group === "headwear" ? group : "all";
}

function productLabel(value?: string | string[]) {
  const label = firstParam(value);
  return label === "new" || label === "promo" || label === "best" ? label : "all";
}

function productSort(value?: string | string[]) {
  const sort = firstParam(value);
  return sort === "newest" || sort === "best-selling" || sort === "price-low" || sort === "price-high" ? sort : "order";
}

export default async function KoleksiPage({ searchParams }: KoleksiPageProps) {
  const content = await getPublicContent();
  const params = searchParams ? await searchParams : {};
  const pageHero = content.pageHeroes.find((hero) => hero.page_key === "koleksi");
  const categories = content.categories.filter(
    (category) => category.status_aktif !== false
  );
  const initialGroup = productGroup(params.group);
  const initialLabel = productLabel(params.label);
  const initialSort = productSort(params.sort);
  const initialColor = firstParam(params.color) || "all";

  return (
    <PublicShell content={content}>
      <PageHero
        label={pageHero?.label || "KOLEKSI"}
        title={pageHero?.title || "Layanan & Produk DE BRODER"}
        description={
          pageHero?.subtitle ||
          "Temukan kebutuhan apparel, sablon, jersey, dan layanan custom dalam satu tempat."
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
          { label: "Koleksi" }
        ]}
      />
      <section className="bg-brand-offWhite py-12 sm:py-16">
        <div className="section-shell grid grid-cols-1 gap-x-2 gap-y-6 md:grid-cols-2 lg:grid-cols-4">
          {categories.length ? categories.map((category) => (
            <ServiceCard key={category.nama_kategori} service={category} />
          )) : <p className="col-span-full bg-white p-8 text-center text-sm font-medium text-brand-charcoal/60">Belum ada kategori.</p>}
        </div>
      </section>
      <section className="bg-white py-12 sm:py-16">
        <div className="section-shell">
          <ProductCatalog products={content.products} title="Produk & Layanan Populer" showHeading initialColor={initialColor} initialGroup={initialGroup} initialLabel={initialLabel} initialSort={initialSort} showGroupFilter />
        </div>
      </section>
    </PublicShell>
  );
}
