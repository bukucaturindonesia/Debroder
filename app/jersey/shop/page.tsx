import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { JerseyChrome } from "@/components/jersey/JerseyChrome";
import { ProductCatalog } from "@/components/ProductCatalog";
import { PublicShell } from "@/components/PublicPage";
import { getCatalogPageModel } from "@/lib/catalog-page/runtime";

export const metadata: Metadata = {
  title: "Belanja Jersey | DEBRODER",
  description: "Jelajahi katalog Jersey DEBRODER. Setiap produk membuka halaman detail resmi untuk memilih varian, ukuran, stok, dan pembelian.",
  alternates: { canonical: "/jersey/shop" }
};

export default async function JerseyShopPage() {
  const model = await getCatalogPageModel({ routeKey: "jersey" });

  return (
    <PublicShell theme="jersey-commerce">
      <Suspense fallback={<ShopShellSkeleton />}>
        <JerseyChrome />
        <section className="bg-white py-7 sm:py-9">
          <div className="section-shell">
            <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/50">DEBRODER Jersey</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Belanja Jersey</h1></div>
              <Link href="/jersey/configurator" className="text-sm font-semibold underline underline-offset-4">Custom Jersey</Link>
            </header>
            <ProductCatalog products={model.data.products} title="Katalog Jersey" showCategoryFilter showStatusFilter showSizeFilter initialSort="featured" catalogStyle="category" catalogProfile="jersey" syncUrlState />
          </div>
        </section>
      </Suspense>
    </PublicShell>
  );
}

function ShopShellSkeleton() {
  return (
    <div className="min-h-screen bg-white text-black" aria-label="Memuat katalog Jersey">
      <div className="h-14 border-b border-black/10" />
      <div className="section-shell py-12">
        <div className="h-4 w-32 animate-pulse bg-black/10 motion-reduce:animate-none" />
        <div className="mt-4 h-14 w-3/4 max-w-xl animate-pulse bg-black/10 motion-reduce:animate-none" />
      </div>
      <div className="h-14 border-y border-black/10" />
      <div className="section-shell grid grid-cols-2 gap-4 py-8 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index}>
            <div className="aspect-[4/5] animate-pulse bg-black/[0.06] motion-reduce:animate-none" />
            <div className="mt-3 h-4 w-3/4 animate-pulse bg-black/10 motion-reduce:animate-none" />
          </div>
        ))}
      </div>
    </div>
  );
}
