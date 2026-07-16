"use client";

import Link from "next/link";
import { ProductCatalog } from "@/components/ProductCatalog";
import type { ProductTypeOption } from "@/lib/product-taxonomy";
import type { Product } from "@/lib/types";

type SortValue = "order" | "newest" | "best-selling" | "price-low" | "price-high";
type LabelValue = "all" | "new" | "promo" | "best";

export function CategoryCommerceCatalog({
  products,
  eyebrow,
  title,
  description,
  closingHeadline,
  closingCtaLabel,
  closingCtaHref,
  productTypeOptions = [],
  typeFilterLabel = "Semua tipe",
  initialColor = "all",
  initialLabel = "all",
  initialSort = "order",
  initialProductType = "all"
}: {
  products: Product[];
  eyebrow: string;
  title: string;
  description: string;
  closingHeadline: string;
  closingCtaLabel: string;
  closingCtaHref: string;
  productTypeOptions?: ProductTypeOption[];
  typeFilterLabel?: string;
  initialColor?: string;
  initialLabel?: LabelValue;
  initialSort?: SortValue;
  initialProductType?: string;
}) {
  return (
    <>
      <section data-reveal className="bg-brand-offWhite py-12 md:py-16 lg:py-20">
        <div className="section-shell">
          <div className="max-w-2xl">
            <p className="public-eyebrow">{eyebrow}</p>
            <h2 className="public-section-title mt-2">{title}</h2>
            <p className="public-secondary-copy mt-4 text-sm leading-6">{description}</p>
          </div>
          <div className="mt-4 md:mt-6">
            <ProductCatalog
              products={products}
              showCategoryFilter={false}
              initialColor={initialColor}
              initialLabel={initialLabel}
              initialSort={initialSort}
              initialProductType={initialProductType}
              productTypeOptions={productTypeOptions}
              typeFilterLabel={typeFilterLabel}
              catalogStyle="category"
              syncUrlState
            />
          </div>
        </div>
      </section>
      <section className="public-divider border-y bg-brand-offWhite py-12 md:py-16">
        <div className="section-shell flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <h2 className="public-editorial-title max-w-3xl">{closingHeadline}</h2>
          <Link href={closingCtaHref} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-black px-6 text-sm font-semibold text-white transition hover:bg-black/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black">{closingCtaLabel}</Link>
        </div>
      </section>
    </>
  );
}
