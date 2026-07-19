import type { Metadata } from "next";
import { CategoryCommercePage } from "@/components/CategoryCommercePage";
import { productsForCategoryRoute } from "@/lib/product-route-matching";
import { jacketTypeOptions, productTypeValue } from "@/lib/product-taxonomy";
import { getPublicContent } from "@/lib/public-data";
import { getCustomDestinationForSourceCategory } from "@/lib/custom-commerce/data";

export const metadata: Metadata = {
  title: "Jaket & Hoodie | DE BRODER",
  description:
    "Koleksi jaket dan hoodie DE BRODER untuk brand, komunitas, merchandise, dan kebutuhan apparel custom.",
  alternates: { canonical: "/jaket-hoodie" },
  openGraph: {
    title: "Jaket & Hoodie | DE BRODER",
    description:
      "Jaket dan hoodie untuk brand, komunitas, merchandise, dan kebutuhan apparel custom."
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

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function productLabel(value?: string | string[]) {
  const label = firstParam(value);
  return label === "new" || label === "promo" || label === "best" ? label : "all";
}

function productSort(value?: string | string[]) {
  const sort = firstParam(value);
  return sort === "newest" || sort === "best-selling" || sort === "price-low" || sort === "price-high" ? sort : "order";
}

export default async function JaketHoodiePage({ searchParams }: JaketHoodiePageProps) {
  const content = await getPublicContent();
  const params = searchParams ? await searchParams : {};
  const products = productsForCategoryRoute(content.products, content.productCategories, "jaket-hoodie");
  const customDestination = await getCustomDestinationForSourceCategory(content.productCategories.find((category) => category.slug === "jaket-hoodie")?.id);
  const initialColor = firstParam(params.color) || "all";
  const initialLabel = productLabel(params.label);
  const initialSort = productSort(params.sort);
  const initialProductType = productTypeValue(firstParam(params.type), jacketTypeOptions);

  return <CategoryCommercePage
    content={content}
    products={products}
    config={{
      pageKey: "jaket-hoodie",
      breadcrumbLabel: "Jaket & Hoodie",
      eyebrow: "Kategori Jaket & Hoodie",
      catalogTitle: "Pilih jaket sesuai kebutuhan",
      catalogDescription: "Temukan tipe, bahan, warna, dan ukuran dari katalog produk DEBRODER.",
      closingHeadline: "Butuh jaket atau hoodie custom untuk tim dan brand Anda?",
      closingCtaLabel: "Buat Pesanan Custom",
      closingCtaHref: customDestination || "/custom",
      productTypeOptions: jacketTypeOptions,
      typeFilterLabel: "Semua tipe jaket"
    }}
    initialColor={initialColor}
    initialLabel={initialLabel}
    initialSort={initialSort}
    initialProductType={initialProductType}
  />;
}
