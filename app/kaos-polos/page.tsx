import type { Metadata } from "next";
import { CategoryCommercePage } from "@/components/CategoryCommercePage";
import { getCatalogPageModel } from "@/lib/catalog-page/runtime";
import { kaosTypeOptions } from "@/lib/product-taxonomy";

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

export default async function KaosPolosPage({ searchParams }: KaosPolosPageProps) {
  const model = await getCatalogPageModel({
    routeKey: "kaos-polos",
    productTypeOptions: kaosTypeOptions,
    searchParams: searchParams ? await searchParams : {}
  });

  return (
    <CategoryCommercePage
      model={model}
      config={{
        pageKey: "kaos-polos",
        pagePath: "/kaos-polos",
        breadcrumbLabel: "Kaos Polos",
        shortcutLabel: "Jelajahi Kaos Polos",
        typeDiscoveryTitle: "Pilih berdasarkan model",
        typeDiscoveryDescription: "Temukan potongan dan bahan yang paling sesuai untuk kebutuhan harian, brand, komunitas, atau produksi custom.",
        colorDiscoveryTitle: "Pilih berdasarkan warna",
        newArrivalsTitle: "Produk terbaru",
        catalogTitle: "Semua Kaos Polos",
        catalogDescription: "Cari berdasarkan tipe, bahan, warna, harga, dan status produk tanpa mengganggu fokus pada katalog.",
        closingHeadline: "Punya desain sendiri? Lanjutkan ke layanan custom DEBRODER.",
        closingCtaLabel: "Buat Pesanan Custom",
        closingCtaHref: model.data.customDestination || "/custom",
        productTypeOptions: kaosTypeOptions,
        typeFilterLabel: "Semua tipe kaos",
        seoLinks: [
          { label: "Kaos Cotton Combed", href: "/kaos-polos?type=cotton-combed#catalog" },
          { label: "Kaos Premium", href: "/kaos-polos?type=premium-cotton#catalog" },
          { label: "Kaos Heavy Weight", href: "/kaos-polos?type=heavyweight#catalog" },
          { label: "Kaos Polo", href: "/kaos-polos?type=polo#catalog" }
        ]
      }}
    />
  );
}
