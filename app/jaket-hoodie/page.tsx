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
    q?: string | string[];
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

  return (
    <CategoryCommercePage
      model={model}
      config={{
        pageKey: "jaket-hoodie",
        pagePath: "/jaket-hoodie",
        breadcrumbLabel: "Jaket & Hoodie",
        shortcutLabel: "Jelajahi Jaket & Hoodie",
        typeDiscoveryTitle: "Pilih berdasarkan model",
        typeDiscoveryDescription: "Bandingkan hoodie, crewneck, bomber, dan windbreaker berdasarkan kebutuhan tim, brand, dan aktivitas.",
        colorDiscoveryTitle: "Pilih berdasarkan warna",
        newArrivalsTitle: "Produk terbaru",
        catalogTitle: "Semua Jaket & Hoodie",
        catalogDescription: "Temukan model, warna, ukuran, dan rentang harga yang tepat dalam katalog DEBRODER.",
        closingHeadline: "Butuh jaket atau hoodie custom untuk tim dan brand Anda?",
        closingCtaLabel: "Buat Pesanan Custom",
        closingCtaHref: model.data.customDestination || "/custom",
        productTypeOptions: jacketTypeOptions,
        typeFilterLabel: "Semua tipe jaket",
        seoLinks: [
          { label: "Hoodie Pullover", href: "/jaket-hoodie?type=pullover-hooded#catalog" },
          { label: "Zip Hoodie", href: "/jaket-hoodie?type=zip-hooded#catalog" },
          { label: "Crewneck", href: "/jaket-hoodie?type=crewneck#catalog" },
          { label: "Jaket Bomber", href: "/jaket-hoodie?type=bomber-jacket#catalog" },
          { label: "Windbreaker", href: "/jaket-hoodie?type=windbreaker#catalog" }
        ]
      }}
    />
  );
}
