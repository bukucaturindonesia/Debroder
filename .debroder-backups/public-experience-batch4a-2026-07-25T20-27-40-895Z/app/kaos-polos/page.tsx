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

  return <CategoryCommercePage
    model={model}
    config={{
      pageKey: "kaos-polos",
      breadcrumbLabel: "Kaos Polos",
      eyebrow: "Kategori Kaos Polos",
      catalogTitle: "Pilih kaos sesuai kebutuhan",
      catalogDescription: "Temukan tipe, bahan, warna, dan ukuran dari katalog produk DEBRODER.",
      closingHeadline: "Punya desain sendiri? Lanjutkan ke layanan custom DEBRODER.",
      closingCtaLabel: "Buat Pesanan Custom",
      closingCtaHref: model.data.customDestination || "/custom",
      productTypeOptions: kaosTypeOptions,
      typeFilterLabel: "Semua tipe kaos"
    }}
  />;
}
