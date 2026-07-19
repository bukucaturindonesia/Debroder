import type { Metadata } from "next";
import { CategoryCommercePage } from "@/components/CategoryCommercePage";
import { productsForCategoryRoute } from "@/lib/product-route-matching";
import { kaosTypeOptions, productTypeValue } from "@/lib/product-taxonomy";
import { getPublicContent } from "@/lib/public-data";
import { getCustomDestinationForSourceCategory } from "@/lib/custom-commerce/data";

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

export default async function KaosPolosPage({ searchParams }: KaosPolosPageProps) {
  const content = await getPublicContent();
  const params = searchParams ? await searchParams : {};
  const products = productsForCategoryRoute(content.products, content.productCategories, "kaos-polos");
  const customDestination = await getCustomDestinationForSourceCategory(content.productCategories.find((category) => category.slug === "kaos-polos")?.id);
  const initialColor = firstParam(params.color) || "all";
  const initialLabel = productLabel(params.label);
  const initialSort = productSort(params.sort);
  const initialProductType = productTypeValue(firstParam(params.type), kaosTypeOptions);

  return <CategoryCommercePage
    content={content}
    products={products}
    config={{
      pageKey: "kaos-polos",
      breadcrumbLabel: "Kaos Polos",
      eyebrow: "Kategori Kaos Polos",
      catalogTitle: "Pilih kaos sesuai kebutuhan",
      catalogDescription: "Temukan tipe, bahan, warna, dan ukuran dari katalog produk DEBRODER.",
      closingHeadline: "Punya desain sendiri? Lanjutkan ke layanan custom DEBRODER.",
      closingCtaLabel: "Buat Pesanan Custom",
      closingCtaHref: customDestination || "/custom",
      productTypeOptions: kaosTypeOptions,
      typeFilterLabel: "Semua tipe kaos"
    }}
    initialColor={initialColor}
    initialLabel={initialLabel}
    initialSort={initialSort}
    initialProductType={initialProductType}
  />;
}
