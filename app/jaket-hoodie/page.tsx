import type { Metadata } from "next";
import { CategoryCommercePage } from "@/components/CategoryCommercePage";
import { getCatalogPageModel } from "@/lib/catalog-page/runtime";
import { jacketTypeOptions } from "@/lib/product-taxonomy";

export const metadata: Metadata = {
  title: "Jaket & Hoodie | DE BRODER",
  description: "Koleksi jaket dan hoodie DE BRODER untuk brand, komunitas, merchandise, dan kebutuhan apparel custom.",
  alternates: { canonical: "/jaket-hoodie" },
  openGraph: {
    title: "Jaket & Hoodie | DE BRODER",
    description: "Jaket dan hoodie untuk brand, komunitas, merchandise, dan kebutuhan apparel custom."
  }
};

type JaketHoodiePageProps = {
  searchParams?: Promise<{
    color?: string | string[];
    label?: string | string[];
    sort?: string | string[];
    type?: string | string[];
  }>;
};

export default async function JaketHoodiePage({ searchParams }: JaketHoodiePageProps) {
  const model = await getCatalogPageModel({
    routeKey: "jaket-hoodie",
    productTypeOptions: jacketTypeOptions,
    searchParams: searchParams ? await searchParams : {}
  });

  return <CategoryCommercePage
    model={model}
    config={{
      pageKey: "jaket-hoodie",
      breadcrumbLabel: "Jaket & Hoodie",
      eyebrow: "Kategori Jaket & Hoodie",
      catalogTitle: "Pilih jaket sesuai kebutuhan",
      catalogDescription: "Temukan tipe, bahan, warna, dan ukuran dari katalog produk DEBRODER.",
      closingHeadline: "Butuh jaket atau hoodie custom untuk tim dan brand Anda?",
      closingCtaLabel: "Buat Pesanan Custom",
      closingCtaHref: model.data.customDestination || "/custom",
      productTypeOptions: jacketTypeOptions,
      typeFilterLabel: "Semua tipe jaket"
    }}
  />;
}
