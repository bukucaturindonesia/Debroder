import type { Metadata } from "next";
import { Suspense } from "react";
import { JerseyCommerceNav } from "@/components/jersey/JerseyCommerceNav";
import { JerseyShopCatalog } from "@/components/jersey/JerseyShopCatalog";
import { PublicShell } from "@/components/PublicPage";
import { productsForCategoryRoute } from "@/lib/product-route-matching";
import { getPublicContent } from "@/lib/public-data";

export const metadata: Metadata = {
  title: "Belanja Jersey | DEBRODER",
  description: "Jelajahi katalog Jersey DEBRODER. Setiap produk membuka halaman detail resmi untuk memilih varian, ukuran, stok, dan pembelian.",
  alternates: { canonical: "/jersey/shop" }
};

export default async function JerseyShopPage() {
  const content = await getPublicContent();
  const products = productsForCategoryRoute(content.products, content.productCategories, "jersey");

  return (
    <PublicShell theme="jersey-commerce" showHeader={false}>
      <Suspense fallback={<ShopShellSkeleton />}>
        <JerseyCommerceNav />
        <JerseyShopCatalog products={products} />
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
