import type { Metadata } from "next";
import { CategoryCommercePage } from "@/components/CategoryCommercePage";
import { getCatalogPageModel } from "@/lib/catalog-page/runtime";
import { headwearTypeOptions } from "@/lib/product-taxonomy";

export const metadata: Metadata = {
  title: "Headwear | DE BRODER",
  description: "Koleksi headwear DE BRODER untuk topi, cap, merchandise, komunitas, dan brand apparel custom.",
  alternates: { canonical: "/headwear" },
  openGraph: {
    title: "Headwear | DE BRODER",
    description: "Headwear untuk topi, cap, merchandise, komunitas, dan brand apparel custom."
  }
};

type HeadwearPageProps = {
  searchParams?: Promise<{
    color?: string | string[];
    label?: string | string[];
    sort?: string | string[];
    type?: string | string[];
  }>;
};

export default async function HeadwearPage({ searchParams }: HeadwearPageProps) {
  const model = await getCatalogPageModel({
    routeKey: "headwear",
    productTypeOptions: headwearTypeOptions,
    searchParams: searchParams ? await searchParams : {}
  });

  return <CategoryCommercePage
    model={model}
    config={{
      pageKey: "headwear",
      breadcrumbLabel: "Headwear",
      eyebrow: "Kategori Headwear",
      catalogTitle: "Pilih headwear sesuai kebutuhan",
      catalogDescription: "Temukan model, warna, ukuran, dan bahan dari katalog produk DEBRODER.",
      closingHeadline: "Butuh headwear custom untuk merchandise, komunitas, atau brand?",
      closingCtaLabel: "Buat Pesanan Custom",
      closingCtaHref: model.data.customDestination || "/custom",
      productTypeOptions: headwearTypeOptions,
      typeFilterLabel: "Semua model headwear"
    }}
  />;
}
