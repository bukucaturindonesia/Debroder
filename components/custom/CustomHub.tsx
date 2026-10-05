import Link from "next/link";
import { PublicProductCard } from "@/components/PublicProductCard";
import { SafeImage } from "@/components/SafeImage";
import type { CustomCategory } from "@/lib/custom-commerce/types";
import { fallbackImages } from "@/lib/fallback-data";
import type { Product } from "@/lib/types";

function categoryHref(category: CustomCategory) {
  return category.entryType === "jersey_configurator"
    ? category.targetRoute || "/jersey/configurator"
    : `/custom/${category.slug}`;
}

export function CustomHub({ categories, products }: { categories: CustomCategory[]; products: Product[] }) {
  const apparel = categories.find((category) => category.entryType !== "jersey_configurator");
  const jersey = categories.find((category) => category.entryType === "jersey_configurator");
  const baseProducts = products
    .filter((product) => product.sales_mode === "custom" || product.sales_mode === "both")
    .slice(0, 4);

  return (
    <div className="bg-white text-[#111]">
      <header className="border-b border-black/10 bg-[#f7f7f5] category-hero-following pb-7 sm:pb-9">
        <div className="section-shell">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/50">Custom DEBRODER</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Pilih jalur pesanan custom</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-black/65 sm:text-base">T-Shirt custom dan Jersey Custom menggunakan konfigurasi yang berbeda. Pilih jalur sesuai kebutuhan agar spesifikasi tercatat di alur yang tepat.</p>
        </div>
      </header>

      {categories.length ? (
        <section aria-label="Pilihan pesanan custom" className="section-shell py-7 sm:py-9">
          <div className="grid gap-4 md:grid-cols-2">
            {[
              apparel ? { category: apparel, label: "Custom T-Shirt", cta: "Lanjut ke kebutuhan T-Shirt" } : null,
              jersey ? { category: jersey, label: "Jersey Custom", cta: "Buka Jersey Configurator" } : null
            ].filter((item): item is { category: CustomCategory; label: string; cta: string } => Boolean(item)).map(({ category, label, cta }) => (
              <Link key={category.id || category.slug} href={categoryHref(category)} className="group grid grid-cols-[96px_minmax(0,1fr)] gap-4 border border-black/10 p-3 transition hover:border-black/35 sm:grid-cols-[136px_minmax(0,1fr)] sm:p-4">
                <div className="relative aspect-[4/5] overflow-hidden bg-[#f0f0ed]">
                  <SafeImage src={category.imageUrl} fallbackSrc={fallbackImages.product} alt={category.imageAlt || category.name} fill className="object-cover transition group-hover:scale-[1.02]" sizes="(min-width:768px) 136px, 96px" />
                </div>
                <div className="flex min-w-0 flex-col justify-center">
                  <p className="text-xs font-medium text-black/50">{label}</p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">{category.name}</h2>
                  {category.shortDescription ? <p className="mt-2 line-clamp-3 text-sm leading-6 text-black/60">{category.shortDescription}</p> : null}
                  <p className="mt-2 text-xs text-black/55">{category.minimumOrderDisplay} · {category.leadTimeDisplay}</p>
                  <span className="mt-4 inline-flex w-fit min-h-10 items-center border border-black px-3 text-xs font-semibold sm:text-sm">{cta}</span>
                </div>
              </Link>
            ))}
          </div>
          {!apparel && !jersey ? <p className="border border-black/10 p-6 text-sm text-black/60">Kategori custom belum tersedia. Silakan kembali setelah data kategori dipublikasikan.</p> : null}
        </section>
      ) : (
        <section className="section-shell py-8"><div className="border border-black/10 p-6"><h2 className="text-xl font-semibold">Kategori custom sedang diperbarui</h2><p className="mt-2 text-sm text-black/60">Kategori akan tampil otomatis setelah konten dipublikasikan dan terhubung dengan produk PIM aktif.</p><Link href="/koleksi" className="mt-4 inline-flex min-h-10 items-center border border-black px-4 text-sm font-semibold">Lihat koleksi</Link></div></section>
      )}

      {baseProducts.length ? (
        <section aria-labelledby="custom-products-heading" className="border-t border-black/10 py-7 sm:py-9">
          <div className="section-shell">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div><p className="text-xs font-semibold uppercase tracking-[0.1em] text-black/50">Custom T-Shirt</p><h2 id="custom-products-heading" className="mt-1 text-2xl font-semibold">Produk dasar yang tersedia</h2></div>
              {apparel ? <Link href={categoryHref(apparel)} className="text-sm font-semibold underline underline-offset-4">Lihat semua</Link> : null}
            </div>
            <div data-ui-grid="product" className="grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-3 lg:grid-cols-4">
              {baseProducts.map((product) => <PublicProductCard key={product.id || product.slug || product.nama} product={product} imageSizes="(min-width:1024px) 25vw, 50vw" />)}
            </div>
          </div>
        </section>
      ) : null}

      <section className="border-t border-black/10 bg-[#f7f7f5] py-7 sm:py-9">
        <div className="section-shell grid gap-6 md:grid-cols-[0.7fr_1.3fr]">
          <div><p className="text-xs font-semibold uppercase tracking-[0.1em] text-black/50">Alur order</p><h2 className="mt-1 text-2xl font-semibold">Spesifikasi sampai produksi</h2></div>
          <ol className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
            {["Pilih produk dasar, jumlah, ukuran, dan layanan.", "Tambahkan file desain serta catatan kebutuhan.", "Tinjau quotation dan proof sebelum menyetujui.", "Order dibuat sebelum pembayaran penuh atau DP."] .map((step, index) => <li key={step} className="flex gap-3 border-t border-black/15 pt-3"><span className="text-xs font-semibold text-black/45">0{index + 1}</span><span className="text-sm leading-6">{step}</span></li>)}
          </ol>
        </div>
      </section>
      <nav aria-label="Jelajahi layanan DEBRODER" className="section-shell flex flex-wrap gap-x-6 gap-y-3 py-6 text-sm">
        <Link href="/jersey/configurator" className="font-semibold underline underline-offset-4">Jersey Configurator</Link>
        <Link href="/sablon-dtf" className="text-black/65 underline underline-offset-4">Sablon DTF</Link>
        <Link href="/help" className="text-black/65 underline underline-offset-4">Pusat bantuan</Link>
      </nav>
    </div>
  );
}
