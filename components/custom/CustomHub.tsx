import Link from "next/link";
import { SafeImage } from "@/components/SafeImage";
import type { CustomCategory } from "@/lib/custom-commerce/types";
import { fallbackImages } from "@/lib/fallback-data";

export function CustomHub({ categories }: { categories: CustomCategory[] }) {
  if (!categories.length) {
    return (
      <section className="section-shell py-16 sm:py-24">
        <div className="mx-auto max-w-2xl rounded-[28px] bg-white p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">Custom DEBRODER</p>
          <h1 className="mt-3 text-3xl font-semibold">Katalog custom sedang diperbarui</h1>
          <p className="mt-3 text-sm leading-7 text-black/60">Kategori akan tampil otomatis setelah konten CMS dipublikasikan dan terhubung ke produk PIM aktif.</p>
          <Link href="/koleksi" className="mt-6 inline-flex min-h-12 items-center rounded-full bg-black px-6 text-sm font-semibold text-white">Lihat koleksi</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="section-shell py-12 sm:py-16 lg:py-20">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">Custom DEBRODER</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-6xl">Mulai dari kebutuhanmu.</h1>
        <p className="mt-4 text-base leading-8 text-black/60">Pilih kategori, gunakan Paket Instan, atau rakit proyek custom berisi beberapa produk. Harga akan diperiksa kembali sebelum pesanan dibuat.</p>
      </div>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => {
          const href = category.entryType === "jersey_configurator" ? category.targetRoute! : `/custom/${category.slug}`;
          return (
            <Link key={category.id} href={href} className="group overflow-hidden rounded-[28px] bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black">
              <div className="relative aspect-[4/5] overflow-hidden bg-[#e9e9e4]">
                <SafeImage src={category.imageUrl} fallbackSrc={fallbackImages.product} alt={category.imageAlt || category.name} fill className="object-cover transition duration-500 group-hover:scale-[1.025]" sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" />
              </div>
              <div className="p-5 sm:p-6">
                <h2 className="text-xl font-semibold">{category.name}</h2>
                {category.shortDescription ? <p className="mt-2 text-sm leading-6 text-black/60">{category.shortDescription}</p> : null}
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-black/55">
                  <span className="rounded-full bg-[#f5f5ef] px-3 py-1.5">{category.minimumOrderDisplay}</span>
                  <span className="rounded-full bg-[#f5f5ef] px-3 py-1.5">{category.leadTimeDisplay}</span>
                </div>
                <span className="mt-5 inline-flex min-h-11 items-center rounded-full bg-black px-5 text-sm font-semibold text-white transition group-hover:bg-black/75" aria-hidden="true">
                  Mulai Custom <span className="ml-2">↗</span>
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
