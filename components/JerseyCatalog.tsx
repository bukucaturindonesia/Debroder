import Link from "next/link";
import { SafeImage } from "@/components/SafeImage";
import { fallbackImages } from "@/lib/fallback-data";
import type { ServiceCategory } from "@/lib/types";

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function JerseyCatalog({ categories }: { categories: ServiceCategory[] }) {
  return (
    <section data-reveal className="bg-brand-offWhite py-12 sm:py-16">
      <div className="section-shell">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-charcoal/55">Kategori Jersey</p>
          <h2 className="section-title mt-3">Pilih model jersey</h2>
          <p className="mt-3 text-sm leading-6 text-brand-charcoal/65">Setiap kategori, gambar, pilihan bahan, warna, kerah, dan lengan dapat dikelola dari admin.</p>
        </div>
        {categories.length ? <div className="mt-6 grid grid-cols-1 gap-x-2 gap-y-6 md:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => {
            const slug = category.slug || slugify(category.nama_kategori);
            return (
              <Link key={category.id || slug} href={`/jersey/${slug}`} className="group block min-w-0">
                <article>
                  <div className="overflow-hidden bg-white">
                    <SafeImage
                      src={category.gambar_url}
                      fallbackSrc={fallbackImages.product}
                      alt={category.image_alt || category.nama_kategori}
                      className="aspect-[4/5] w-full transition duration-700 group-hover:scale-[1.03]"
                      objectFit={category.object_fit || "cover"}
                      objectPosition={category.object_position || "center center"}
                      focalX={category.focal_x}
                      focalY={category.focal_y}
                      zoom={category.focal_zoom}
                      sizes="(min-width: 1536px) 20vw, (min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                    />
                  </div>
                  <h3 className="mt-3 line-clamp-2 text-sm font-semibold sm:text-base">{category.nama_kategori}</h3>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-brand-charcoal/60 sm:text-sm">{category.deskripsi}</p>
                  <span className="mt-4 inline-flex text-sm font-semibold underline-offset-4 group-hover:underline">Lihat Detail</span>
                </article>
              </Link>
            );
          })}
        </div> : <div className="mt-8 bg-white p-8 text-center text-sm font-medium text-brand-charcoal/60">Belum ada kategori jersey.</div>}
      </div>
    </section>
  );
}
