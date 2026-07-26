import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/PublicPage";
import { ResponsivePicture } from "@/components/ResponsivePicture";
import { getPublicContent } from "@/lib/public-data";

export const metadata: Metadata = {
  title: "Tentang DEBRODER",
  description: "Informasi DEBRODER yang dipublikasikan melalui sumber konten resmi.",
  alternates: { canonical: "/tentang" }
};

export default async function TentangPage() {
  const content = await getPublicContent();
  const about = content.trustAbout;
  const paragraphs = about.about_body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const stores = content.stores.filter((store) => store.status_aktif !== false);
  const testimonials = content.testimonials
    .filter((item) => item.status_aktif !== false)
    .sort((left, right) => Number(left.urutan || 0) - Number(right.urutan || 0));

  return (
    <PublicShell>
      <section className="bg-white py-12 sm:py-16 lg:py-20">
        <div className="section-shell grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.85fr)] lg:items-start">
          <div>
            <p className="public-eyebrow">Tentang Kami</p>
            <h1 className="home-page-title mt-3">Tentang DEBRODER</h1>
            <div className="mt-6 max-w-3xl space-y-4 text-base leading-8 text-black/65">
              {paragraphs.length
                ? paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)
                : <p>Konten Tentang DEBRODER belum dipublikasikan.</p>}
            </div>

            {about.trust_items.length ? (
              <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                {about.trust_items.map((item) => (
                  <li key={item} className="border border-black/10 bg-brand-offWhite p-4 text-sm font-medium leading-6">
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}

            {about.cta_label && about.cta_url ? (
              <Link href={about.cta_url} className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-black px-6 text-sm font-semibold text-white transition hover:bg-black/75">
                {about.cta_label}
              </Link>
            ) : null}
          </div>

          {about.image_url ? (
            <ResponsivePicture
              desktopSrc={about.image_url}
              mobileSrc={about.mobile_image_url || about.image_url}
              alt="Tentang DEBRODER"
              className="aspect-[4/5] h-full w-full object-cover"
            />
          ) : (
            <aside className="bg-brand-offWhite p-6 sm:p-8">
              <h2 className="text-xl font-semibold">Lokasi DEBRODER</h2>
              {stores.length ? (
                <div className="mt-5 grid gap-5">
                  {stores.map((store) => (
                    <div key={store.id || store.nama_store} className="border-t border-black/10 pt-4 first:border-t-0 first:pt-0">
                      <h3 className="font-semibold">{store.nama_store}</h3>
                      {store.alamat ? <p className="mt-1 text-sm leading-6 text-black/60">{store.alamat}</p> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-black/60">Informasi lokasi belum tersedia.</p>
              )}
              <Link href="/store" className="mt-6 inline-flex text-sm font-semibold underline underline-offset-4">
                Lihat halaman toko
              </Link>
            </aside>
          )}
        </div>
      </section>
      {testimonials.length ? (
        <section className="bg-brand-offWhite py-12 sm:py-16">
          <div className="section-shell">
            <p className="public-eyebrow">Bukti yang dipublikasikan</p>
            <h2 className="section-title mt-3">Cerita pelanggan</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((item) => (
                <figure key={item.id || `${item.nama}-${item.sumber}`} className="border border-black/10 bg-white p-6">
                  <blockquote className="text-base leading-7 text-black/70">“{item.isi_testimoni}”</blockquote>
                  <figcaption className="mt-5 text-sm">
                    <span className="font-semibold">{item.nama}</span>
                    {item.sumber ? <span className="mt-1 block text-black/50">{item.sumber}</span> : null}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </PublicShell>
  );
}
