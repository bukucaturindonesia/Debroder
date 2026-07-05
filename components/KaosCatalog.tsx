"use client";

import { ProductCatalog } from "@/components/ProductCatalog";
import type { Product, ProductFilter } from "@/lib/types";

export function KaosCatalog({ products, filters: _filters }: { products: Product[]; filters: ProductFilter[] }) {
  void _filters;
  return (
    <section data-reveal className="bg-brand-offWhite py-12 sm:py-16">
      <div className="section-shell">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-charcoal/55">Katalog</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Pilih kaos sesuai kebutuhan</h2>
          <p className="mt-3 text-sm leading-6 text-brand-charcoal/65">Cari berdasarkan nama, kategori, bahan, atau warna. Filter berjalan tanpa memuat ulang halaman.</p>
        </div>
        <div className="mt-6"><ProductCatalog products={products} showCategoryFilter={false} /></div>
      </div>
    </section>
  );
}
