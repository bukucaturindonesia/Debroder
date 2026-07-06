"use client";

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
    <section data-reveal className="bg-brand-offWhite py-12 sm:py-16">
      <div className="section-shell">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-charcoal/55">Katalog</p>
          <h2 className="mt-3 text-[28px] font-semibold leading-[1.15] tracking-normal sm:text-[36px]">Pilih kaos sesuai kebutuhan</h2>
          <p className="mt-3 text-sm leading-6 text-brand-charcoal/65">Cari berdasarkan nama, kategori, bahan, atau warna. Filter berjalan tanpa memuat ulang halaman.</p>
        </div>
        <div className="mt-6"><ProductCatalog products={products} showCategoryFilter={false} initialColor={initialColor} initialLabel={initialLabel} initialSort={initialSort} initialProductType={initialProductType} productTypeOptions={kaosTypeOptions} typeFilterLabel="Semua tipe kaos" /></div>
      </div>
    </section>
  );
}
