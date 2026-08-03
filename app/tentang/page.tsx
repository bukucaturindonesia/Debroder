import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/PublicPage";
import { ResponsivePicture } from "@/components/ResponsivePicture";
import { getPublicContent } from "@/lib/public-data";
import { fallbackImages } from "@/lib/fallback-data";

export const metadata: Metadata = {
  title: "Tentang DEBRODER",
  description: "Informasi DEBRODER yang dipublikasikan melalui sumber konten resmi.",
  alternates: { canonical: "/tentang" }
};

export default async function TentangPage() {
  const content = await getPublicContent();
  const about = content.trustAbout;
  const aboutPageImage = about.about_page_image_url;
  const aboutPageMobileImage = about.about_page_mobile_image_url;
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
      <section className="border-b border-black/10 bg-white py-12 sm:py-16 lg:py-24">
        <div className={`section-shell grid gap-10 ${aboutPageImage ? "lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.85fr)] lg:items-center" : ""}`}>
          <div>
            <p className="public-eyebrow">Profil perusahaan</p>
            <h1 className="home-page-title mt-3">Tentang DEBRODER</h1>
            <div className="mt-6 max-w-3xl space-y-4 text-base leading-8 text-black/65">
              {paragraphs.length
                ? paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)
                : <p>Konten Tentang DEBRODER belum dipublikasikan.</p>}
            </div>

            {about.cta_label && about.cta_url ? (
              <Link href={about.cta_url} className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-black px-6 text-sm font-semibold text-white transition hover:bg-black/75">
                {about.cta_label}
              </Link>
            ) : null}
          </div>

          {aboutPageImage ? (
            <ResponsivePicture
              desktopSrc={aboutPageImage}
              mobileSrc={aboutPageMobileImage}
              fallbackSrc={fallbackImages.aboutPortrait}
              alt="Tentang DEBRODER"
              className="aspect-[4/5] h-full w-full object-cover"
              desktopObjectPosition={about.about_page_object_position || undefined}
              mobileObjectPosition={about.about_page_mobile_object_position || about.about_page_object_position || undefined}
              desktopZoom={about.about_page_focal_zoom}
              mobileZoom={about.about_page_mobile_focal_zoom || about.about_page_focal_zoom}
            />
          ) : null}
        </div>
      </section>
      {about.trust_items.length ? (
        <section className="bg-black py-12 text-white sm:py-16 lg:py-20" aria-labelledby="about-principles-heading">
          <div className="section-shell">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">Yang dipublikasikan DEBRODER</p>
            <h2 id="about-principles-heading" className="section-title mt-3 text-white">Prinsip dan kekuatan layanan</h2>
            <ul className="mt-8 grid gap-px bg-white/15 sm:grid-cols-2 lg:grid-cols-3">
              {about.trust_items.map((item) => (
                <li key={item} className="bg-black p-6 text-sm font-medium leading-7 text-white/75 sm:p-8">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
      <section className="bg-brand-offWhite py-12 sm:py-16 lg:py-20" aria-labelledby="about-stores-heading">
        <div className="section-shell">
          <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="public-eyebrow">Lokasi</p>
              <h2 id="about-stores-heading" className="section-title mt-3">Temui DEBRODER</h2>
            </div>
            <Link href="/store" className="inline-flex min-h-11 items-center rounded-full border border-black/20 px-5 text-sm font-semibold">
              Lihat halaman toko
            </Link>
          </div>
          {stores.length ? (
            <div className="mt-8 grid gap-px bg-black/10 md:grid-cols-2">
              {stores.map((store) => (
                <article key={store.id || store.nama_store} className="bg-white p-6 sm:p-8">
                  <h3 className="text-xl font-semibold">{store.nama_store}</h3>
                  {store.alamat ? <p className="mt-3 text-sm leading-7 text-black/60">{store.alamat}</p> : null}
                  {store.layanan_utama ? <p className="mt-4 text-xs font-semibold uppercase tracking-[0.1em] text-black/45">{store.layanan_utama}</p> : null}
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-8 border border-black/10 bg-white p-6 text-sm text-black/60">Informasi lokasi belum tersedia pada sumber publik.</p>
          )}
        </div>
      </section>
      {testimonials.length ? (
        <section className="bg-white py-12 sm:py-16 lg:py-20">
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
      <section className="border-t border-black/10 bg-white py-14 text-center sm:py-20">
        <div className="section-shell">
          <h2 className="mx-auto max-w-4xl text-[clamp(2.5rem,5vw,5rem)] font-semibold leading-[0.96] tracking-[-0.04em]">
            Temukan produk atau mulai kebutuhan custom bersama DEBRODER.
          </h2>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/koleksi" className="inline-flex min-h-12 items-center justify-center rounded-full bg-black px-6 text-sm font-semibold text-white">Lihat koleksi</Link>
            <Link href="/custom" className="inline-flex min-h-12 items-center justify-center rounded-full border border-black/20 px-6 text-sm font-semibold">Mulai custom</Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
