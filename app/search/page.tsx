import type { Metadata } from "next";
import Link from "next/link";
import { PublicProductCard } from "@/components/PublicProductCard";
import { PublicShell } from "@/components/PublicPage";
import { getCatalogPageModel } from "@/lib/catalog-page/runtime";
import { getPublicContent } from "@/lib/public-data";
import { publicServiceHref } from "@/lib/public-routes";
import type { Product } from "@/lib/types";

export const metadata: Metadata = {
  title: "Pencarian | DEBRODER",
  description: "Cari produk pada katalog publik DEBRODER.",
  alternates: { canonical: "/search" }
};

type SearchPageProps = {
  searchParams?: Promise<{ q?: string | string[] }>;
};

function searchableText(product: Product) {
  return [
    product.nama,
    product.kategori,
    product.subcategory,
    product.short_detail,
    product.description,
    product.deskripsi,
    ...(product.color_tags || []),
    ...(product.intent_tags || []),
    ...(product.collection_tags || []),
    ...(product.material_tags || [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("id-ID");
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = searchParams ? await searchParams : {};
  const rawQuery = Array.isArray(params.q) ? params.q[0] : params.q;
  const query = (rawQuery || "").trim().slice(0, 80);
  const needle = query.toLocaleLowerCase("id-ID");
  const [model, content] = await Promise.all([
    getCatalogPageModel({
      routeKey: "koleksi",
      scope: "all"
    }),
    getPublicContent()
  ]);
  const results = needle
    ? model.data.products.filter((product) => searchableText(product).includes(needle))
    : [];
  const categoryResults = needle
    ? content.categories.filter((category) =>
        [category.nama_kategori, category.deskripsi]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("id-ID")
          .includes(needle)
      )
    : [];
  const serviceResults = needle
    ? content.services.filter((service) =>
        service.status_aktif
        && [
          service.nama,
          service.deskripsi,
          service.detail_body,
          service.category_key,
          ...(service.available_sizes || [])
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("id-ID")
          .includes(needle)
      )
    : [];
  const totalResults = results.length + categoryResults.length + serviceResults.length;

  return (
    <PublicShell>
      <section className="bg-brand-offWhite py-12 sm:py-16 lg:py-20">
        <div className="section-shell">
          <p className="public-eyebrow">Katalog publik</p>
          <h1 className="home-page-title mt-3">Cari produk</h1>
          <form action="/search" method="get" role="search" className="mt-7 flex max-w-3xl gap-2">
            <label className="sr-only" htmlFor="public-search-query">Kata kunci produk</label>
            <input
              id="public-search-query"
              name="q"
              defaultValue={query}
              maxLength={80}
              placeholder="Nama produk, kategori, warna, atau bahan"
              className="min-h-12 min-w-0 flex-1 rounded-full border border-black/15 bg-white px-5 text-base outline-none transition focus:border-black"
            />
            <button type="submit" className="min-h-12 rounded-full bg-black px-6 text-sm font-semibold text-white transition hover:bg-black/75">
              Cari
            </button>
          </form>

          {query ? (
            <>
              <p className="mt-8 text-sm text-black/60" aria-live="polite">
                {totalResults} hasil untuk “{query}”
              </p>
              {results.length ? (
                <section className="mt-6" aria-labelledby="product-search-results">
                  <h2 id="product-search-results" className="text-2xl font-semibold">Produk</h2>
                  <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-5">
                    {results.map((product) => (
                      <PublicProductCard
                        key={product.id || product.slug || product.nama}
                        product={product}
                        showActions
                      />
                    ))}
                  </div>
                </section>
              ) : null}
              {categoryResults.length ? (
                <section className="mt-10" aria-labelledby="category-search-results">
                  <h2 id="category-search-results" className="text-2xl font-semibold">Kategori</h2>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {categoryResults.map((category) => (
                      <Link
                        key={category.id || category.link_slug || category.nama_kategori}
                        href={`/${category.link_slug.replace(/^\/+/, "") || "koleksi"}`}
                        className="border border-black/10 bg-white p-5 transition hover:border-black"
                      >
                        <h3 className="font-semibold">{category.nama_kategori}</h3>
                        {category.deskripsi ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-black/60">{category.deskripsi}</p> : null}
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}
              {serviceResults.length ? (
                <section className="mt-10" aria-labelledby="service-search-results">
                  <h2 id="service-search-results" className="text-2xl font-semibold">Layanan</h2>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {serviceResults.map((service) => (
                      <Link
                        key={service.id || service.slug}
                        href={publicServiceHref(service.category_key, service.slug)}
                        className="border border-black/10 bg-white p-5 transition hover:border-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                      >
                        <h3 className="font-semibold">{service.nama}</h3>
                        {service.deskripsi ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-black/60">{service.deskripsi}</p> : null}
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}
              {!totalResults ? (
                <div className="mt-6 border border-black/10 bg-white p-6">
                  <p className="text-sm leading-6 text-black/60">Tidak ada produk yang cocok. Coba kata kunci lain atau buka seluruh koleksi.</p>
                  <Link href="/koleksi" className="mt-4 inline-flex text-sm font-semibold underline underline-offset-4">Lihat koleksi</Link>
                </div>
              ) : null}
            </>
          ) : (
            <nav aria-label="Jalur pencarian cepat" className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Semua Koleksi", "/koleksi"],
                ["Fresh Drop", "/fresh-drop"],
                ["Custom", "/custom"],
                ["Lacak Pesanan", "/track-order"]
              ].map(([label, href]) => (
                <Link key={href} href={href} className="flex min-h-14 items-center justify-between border border-black/10 bg-white px-5 text-sm font-semibold transition hover:border-black">
                  {label}<span aria-hidden="true">→</span>
                </Link>
              ))}
            </nav>
          )}
        </div>
      </section>
    </PublicShell>
  );
}
