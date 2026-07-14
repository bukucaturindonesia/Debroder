"use client";

import Link from "next/link";
import { ProductCatalog } from "@/components/ProductCatalog";
import { kaosTypeOptions } from "@/lib/product-taxonomy";
import type { Product, ProductFilter } from "@/lib/types";

type SortValue = "order" | "newest" | "best-selling" | "price-low" | "price-high";
type LabelValue = "all" | "new" | "promo" | "best";

export function KaosCatalog({
  products,
  filters: _filters,
  initialColor = "all",
  initialLabel = "all",
  initialSort = "order",
  initialProductType = "all"
}: {
  products: Product[];
  filters: ProductFilter[];
  initialColor?: string;
  initialLabel?: LabelValue;
  initialSort?: SortValue;
  initialProductType?: string;
}) {
  void _filters;
  return (
    <>
      <section data-reveal className="bg-brand-offWhite pb-12 pt-5 sm:pb-16 sm:pt-7">
        <div className="section-shell">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="text-[11px] font-medium tracking-[0.08em] text-brand-charcoal/55">Kategori Kaos Polos</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-brand-charcoal sm:text-3xl">Pilih kaos sesuai kebutuhan</h2>
            </div>
            <p className="hidden max-w-lg text-right text-sm leading-6 text-brand-charcoal/55 md:block">Temukan tipe, bahan, warna, dan ukuran dari katalog produk DEBRODER.</p>
          </div>
          <div className="mt-2"><ProductCatalog products={products} showCategoryFilter={false} initialColor={initialColor} initialLabel={initialLabel} initialSort={initialSort} initialProductType={initialProductType} productTypeOptions={kaosTypeOptions} typeFilterLabel="Semua tipe kaos" catalogStyle="kaos" /></div>
        </div>
      </section>
      <section className="border-y border-brand-charcoal/10 bg-brand-offWhite py-7 sm:py-9">
        <div className="section-shell flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
          <h2 className="max-w-3xl text-2xl font-semibold tracking-[-0.02em] text-brand-charcoal sm:text-3xl">Punya desain sendiri? Lanjutkan ke layanan custom DEBRODER.</h2>
          <Link href="/sablon-dtf" className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-brand-charcoal px-6 text-sm font-semibold text-white transition hover:bg-brand-green focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-green">Custom Order</Link>
        </div>
      </section>
    </>
  );
}
