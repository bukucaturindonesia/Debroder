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
    <section data-reveal className="bg-brand-offWhite pb-12 pt-8 sm:pb-16 sm:pt-10">
      <div className="section-shell">
        <div className="max-w-2xl">
          <p className="text-xs font-medium tracking-[0.08em] text-brand-charcoal/55">Kategori Kaos Polos</p>
          <h2 className="landing-section-title mt-2">Pilih kaos sesuai kebutuhan</h2>
          <p className="premium-section-copy mt-3 text-sm leading-6">Pilih tipe kaos, bahan, warna, ukuran, dan kebutuhan produksi yang paling sesuai.</p>
        </div>
        <div className="mt-6"><ProductCatalog products={products} showCategoryFilter={false} initialColor={initialColor} initialLabel={initialLabel} initialSort={initialSort} initialProductType={initialProductType} productTypeOptions={kaosTypeOptions} typeFilterLabel="Semua tipe kaos" /></div>
      </div>
    </section>
  );
}
