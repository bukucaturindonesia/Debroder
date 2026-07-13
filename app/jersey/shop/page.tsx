import type { Metadata } from "next";
import { JerseyChrome } from "@/components/jersey/JerseyChrome";
import { ProductCatalog } from "@/components/ProductCatalog";
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
    <PublicShell content={content} headerMode="natural">
      <JerseyChrome />
      <header className="bg-[#f4f3ef] py-12 sm:py-16">
        <div className="section-shell">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#063D24]">DEBRODER JERSEY</p>
          <h1 className="mt-3 font-heading text-5xl font-extrabold uppercase leading-[0.92] tracking-[-0.035em] sm:text-7xl">Shop All Jersey</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-black/60">Pilih jersey Ready Stock atau produk yang mendukung kebutuhan custom. Data produk, harga, varian, dan stok tetap berasal dari PIM.</p>
        </div>
      </header>
      <section className="bg-white py-10 sm:py-14 lg:py-16">
        <div className="section-shell">
          <ProductCatalog products={products} showCategoryFilter={false} />
        </div>
      </section>
    </PublicShell>
  );
}
