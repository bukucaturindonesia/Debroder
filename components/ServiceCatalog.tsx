import Link from "next/link";
import { SafeImage } from "@/components/SafeImage";
import { fallbackImages } from "@/lib/fallback-data";
import type { Service } from "@/lib/types";
import { formatRupiah, whatsappLinkWithMessage } from "@/lib/url";

export function ServiceCatalog({ services, whatsapp }: { services: Service[]; whatsapp: string }) {
  return (
    <section data-reveal className="bg-brand-offWhite py-12 sm:py-16">
      <div className="section-shell">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-charcoal/55">Pilihan Layanan</p>
          <h2 className="mt-3 text-3xl font-bold leading-[1.05] tracking-[-0.02em] sm:text-4xl">Katalog Sablon DTF</h2>
          <p className="mt-3 text-sm leading-6 text-brand-charcoal/65">Pilih ukuran atau jenis layanan, lalu buka detail untuk melihat informasi produksi.</p>
        </div>
        {services.length ? <div className="mt-6 grid grid-cols-1 gap-x-2 gap-y-6 md:grid-cols-2 lg:grid-cols-4">
          {services.map((service) => (
            <article key={service.id || service.slug} className="flex flex-col bg-white">
              <SafeImage
                src={service.image_url}
                fallbackSrc={fallbackImages.product}
                alt={service.image_alt || service.nama}
                className="aspect-[4/5] w-full"
                objectFit={service.object_fit || "cover"}
                objectPosition={service.object_position || "center center"}
                focalX={service.focal_x}
                focalY={service.focal_y}
                zoom={service.focal_zoom}
                sizes="(min-width: 1536px) 20vw, (min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
              />
              <div className="flex flex-1 flex-col p-4">
                <h3 className="line-clamp-2 text-sm font-semibold sm:text-base">{service.nama}</h3>
                {service.harga_mulai ? <p className="mt-1 text-sm font-semibold">Mulai {formatRupiah(service.harga_mulai)}</p> : null}
                <p className="mt-2 line-clamp-2 flex-1 text-xs leading-5 text-brand-charcoal/60 sm:text-sm">{service.deskripsi}</p>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <Link href={`/sablon-dtf/${service.slug}`} className="inline-flex min-h-10 items-center justify-center rounded-full border border-brand-charcoal px-3 text-sm font-semibold transition hover:bg-brand-charcoal hover:text-white">Detail</Link>
                  <a href={whatsappLinkWithMessage(whatsapp, `Halo DE BRODER, saya ingin bertanya tentang ${service.nama}.`)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center justify-center rounded-full bg-brand-charcoal px-3 text-sm font-semibold text-white transition hover:bg-black/80">Pesan</a>
                </div>
              </div>
            </article>
          ))}
        </div> : <div className="mt-8 bg-white p-8 text-center text-sm font-medium text-brand-charcoal/60">Belum ada layanan Sablon DTF.</div>}
      </div>
    </section>
  );
}
