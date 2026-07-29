import type { Metadata } from "next";
import { PublicProductCard } from "@/components/PublicProductCard";
import { PublicShell } from "@/components/PublicPage";
import { getCatalogPageModel } from "@/lib/catalog-page/runtime";

export const metadata: Metadata = {
  title: "Fresh Drop | DEBRODER",
  description: "Produk terbaru yang telah dipublikasikan DEBRODER.",
  alternates: { canonical: "/fresh-drop" }
};

export default async function FreshDropPage() {
  const model = await getCatalogPageModel({
    routeKey: "koleksi",
    scope: "all",
    searchParams: { sort: "newest" }
  });
  const products = model.data.products
    .filter((product) => product.fresh_drop || product.label_new)
    .sort(
      (left, right) =>
        Number(Boolean(right.fresh_drop)) - Number(Boolean(left.fresh_drop))
        || Number(left.urutan || 0) - Number(right.urutan || 0)
    );

  return (
    <PublicShell>
      <section className="bg-brand-offWhite py-12 sm:py-16 lg:py-20">
        <div className="section-shell">
          <p className="public-eyebrow">Pilihan terbaru</p>
          <h1 className="home-page-title mt-3">Fresh Drop</h1>
          <p className="public-secondary-copy mt-4 max-w-2xl text-base leading-7">
            Produk terbaru yang telah dipublikasikan melalui katalog DEBRODER.
          </p>

          {products.length ? (
            <div className="mt-10 grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-5">
              {products.map((product) => (
                <PublicProductCard
                  key={product.id || product.slug || product.nama}
                  product={product}
                />
              ))}
            </div>
          ) : (
            <div className="mt-10 border border-black/10 bg-white p-6 text-sm leading-6 text-black/60">
              Belum ada produk Fresh Drop yang dipublikasikan.
            </div>
          )}
        </div>
      </section>
    </PublicShell>
  );
}
