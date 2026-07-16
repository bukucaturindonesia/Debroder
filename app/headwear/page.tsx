import type { Metadata } from "next";
import { CategoryCommercePage } from "@/components/CategoryCommercePage";
import { productsForCategoryRoute } from "@/lib/product-route-matching";
import { headwearTypeOptions, productTypeValue } from "@/lib/product-taxonomy";
import { getPublicContent } from "@/lib/public-data";
import { getCustomDestinationForSourceCategory } from "@/lib/custom-commerce/data";

export const metadata: Metadata = {
  title: "Headwear | DE BRODER",
  description:
    "Koleksi headwear DE BRODER untuk topi, cap, merchandise, komunitas, dan brand apparel custom.",
  alternates: { canonical: "/headwear" },
  openGraph: {
    title: "Headwear | DE BRODER",
    description:
      "Headwear untuk topi, cap, merchandise, komunitas, dan brand apparel custom."
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

export default async function HeadwearPage({ searchParams }: HeadwearPageProps) {
  const content = await getPublicContent();
  const params = searchParams ? await searchParams : {};
  const products = productsForCategoryRoute(content.products, content.productCategories, "headwear");
  const customDestination = await getCustomDestinationForSourceCategory(content.productCategories.find((category) => category.slug === "headwear")?.id);
  const initialColor = firstParam(params.color) || "all";
  const initialLabel = productLabel(params.label);
  const initialSort = productSort(params.sort);
  const initialProductType = productTypeValue(firstParam(params.type), headwearTypeOptions);

  return <CategoryCommercePage
    content={content}
    products={products}
    config={{
      pageKey: "headwear",
      breadcrumbLabel: "Headwear",
      eyebrow: "Kategori Headwear",
      catalogTitle: "Pilih headwear sesuai kebutuhan",
      catalogDescription: "Temukan model, warna, ukuran, dan bahan dari katalog produk DEBRODER.",
      closingHeadline: "Butuh headwear custom untuk merchandise, komunitas, atau brand?",
      closingCtaLabel: "Custom Order",
      closingCtaHref: customDestination || "/custom",
      productTypeOptions: headwearTypeOptions,
      typeFilterLabel: "Semua model headwear"
    }}
    initialColor={initialColor}
    initialLabel={initialLabel}
    initialSort={initialSort}
    initialProductType={initialProductType}
  />;
}
