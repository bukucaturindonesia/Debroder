import type { Metadata } from "next";
import Link from "next/link";
import { CategoryHero } from "@/components/public/CategoryHero";
import { PublicShell } from "@/components/PublicPage";
import { DtfGalleryPhoto } from "@/components/DtfGalleryPhoto";
import { SafeImage } from "@/components/SafeImage";
import { fallbackImages } from "@/lib/fallback-data";
import { getPublicContent } from "@/lib/public-data";
import { formatRupiah, whatsappLinkWithMessage } from "@/lib/url";

export const metadata: Metadata = {
  title: "Sablon DTF | DE BRODER",
  description: "Sablon DTF custom mulai dari 1 pcs, pilihan desain sendiri, dan konsultasi pemesanan melalui WhatsApp DE BRODER.",
  alternates: { canonical: "/sablon-dtf" }
};

const frequentlyAskedQuestions = [
  {
    question: "Apakah benar bisa pesan satu pcs saja?",
    answer: "Betul banget! Di Debroder kamu bebas berekspresi dan order sablon mulai dari satu pcs saja tanpa minimal order."
  },
  {
    question: "Kalau beli banyak, harganya bisa makin murah nggak?",
    answer: "Bisa banget! Kalau kamu order lebih dari 12 pcs, harganya bisa lebih murah. Cocok untuk gathering, komunitas, seragam, atau kebutuhan kelompok kecil hingga skala besar. Kamu juga bisa pakai desain sendiri."
  },
  {
    question: "Berapa lama waktu produksi?",
    answer: "Waktu produksi kami adalah satu hari. Pesanan bisa jadi dalam satu hari setelah pembayaran dikonfirmasi."
  },
  {
    question: "Format file desain apa saja yang diterima?",
    answer: "Kami menerima format PNG, JPG, atau PDF. Agar hasil cetakan maksimal, tajam, dan tidak pecah, pastikan kamu menggunakan file dengan resolusi tinggi, ya."
  },
  {
    question: "Bagaimana kalau tidak punya desain?",
    answer: "Tenang, jangan khawatir! Kami menyediakan banyak pilihan template dan desain siap pakai. Kamu juga bisa membawa contoh referensi gambar, dan Debroder siap membantu membuatkannya."
  },
  {
    question: "Bisa pick up di toko langsung?",
    answer: "Bisa banget! Kamu bisa mengambil pesananmu langsung di toko Debroder."
  }
] as const;

const benefits = [
  {
    title: "Semakin Banyak, Semakin Hemat",
    description: "Pesan lebih banyak untuk mendapatkan penawaran harga yang lebih hemat.",
    icon: "layers"
  },
  {
    title: "Bebas Pakai Desain Sendiri",
    description: "Gunakan gambarmu sendiri tanpa batasan jumlah warna.",
    icon: "artwork"
  },
  {
    title: "Kualitas Sablon Premium",
    description: "Warna tajam, hasil halus, dan tahan lama.",
    icon: "quality"
  }
] as const;

function BenefitIcon({ name }: { name: (typeof benefits)[number]["icon"] }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {name === "layers" ? (
        <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5" /><path d="m3 16 9 5 9-5" /></>
      ) : name === "artwork" ? (
        <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></>
      ) : (
        <><path d="m12 2 2.8 2.1 3.5-.2.9 3.4 2.8 2.1-1.1 3.3 1.1 3.3-2.8 2.1-.9 3.4-3.5-.2L12 23l-2.8-2.1-3.5.2-.9-3.4L2 15.6l1.1-3.3L2 9l2.8-2.1.9-3.4 3.5.2L12 2Z" /><path d="m8 12 2.5 2.5L16 9" /></>
      )}
    </svg>
  );
}

export default async function SablonDtfPage() {
  const content = await getPublicContent();
  const pageHero = content.pageHeroes.find((hero) => hero.page_key === "sablon-dtf");
  const databaseServices = (content.dtfServices || []).filter((service) => {
    const value = [service.category_key, service.slug, service.nama].filter(Boolean).join(" ").toLowerCase();
    return (service.category_key === "sablon-dtf" || value.includes("sablon-dtf") || value.includes("sablon dtf")) && !value.includes("maklon") && service.status_aktif !== false;
  });
  // Services are the price-on-consultation offers managed in Admin > Services.
  const services = databaseServices;
  // Only owner-confirmed production photos can claim to be Debroder results.
  const portfolio = (content.dtfSections || []).filter(
    (banner) => banner.media_type === "image" && Boolean(banner.desktop_media_url) && banner.metadata?.debroder_original === true
  );
  const whatsapp = content.contact.whatsapp_link || content.contact.whatsapp_apparel || "";
  const generalWhatsapp = whatsappLinkWithMessage(whatsapp, "Halo Debroder, saya ingin order sablon DTF custom. Bisa bantu konsultasi desain, jumlah, dan harganya?");

  return (
    <PublicShell footerTone="light">
      <div className="dtf-experience public-category-experience">
        <CategoryHero
          seoTitle="Sablon DTF"
          alt="Sablon DTF Debroder"
          desktopImage={pageHero?.image_url}
          mobileImage={pageHero?.mobile_image_url}
          objectPosition={pageHero?.object_position}
          mobileObjectPosition={pageHero?.mobile_object_position}
          objectFit={pageHero?.object_fit}
          imageZoom={pageHero?.focal_zoom}
          mobileImageZoom={pageHero?.mobile_focal_zoom}
        />

        <section className="section-shell public-category-intro" aria-label="Pengantar layanan Sablon DTF">
          <nav className="public-breadcrumbs" aria-label="Breadcrumb">
            <Link href="/">Beranda</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Sablon DTF</span>
          </nav>
          <h2 className="public-section-title">Sablon DTF</h2>
          <p className="public-secondary-copy mt-3 max-w-2xl">Wujudkan desainmu di kaos favorit, dari satu pcs hingga kebutuhan komunitas dan acara.</p>
        </section>

        <section className="section-shell dtf-section" aria-labelledby="dtf-benefit-heading">
          <h2 id="dtf-benefit-heading" className="public-section-title">Kenapa Sablon DTF di Debroder?</h2>
          <div className="dtf-benefit-rail mt-6" role="region" aria-label="Tiga keunggulan sablon DTF, geser untuk melihat" tabIndex={0}>
            {benefits.map((benefit) => (
              <article key={benefit.title} className="dtf-benefit-card snap-start">
                <span className="dtf-benefit-icon"><BenefitIcon name={benefit.icon} /></span>
                <h3 className="mt-5 text-base font-semibold leading-snug md:text-lg">{benefit.title}</h3>
                <p className="mt-2 text-sm leading-6 text-brand-charcoal/70">{benefit.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="dtf-services" className="section-shell dtf-section scroll-mt-24" aria-labelledby="dtf-products-heading">
          <div className="max-w-2xl">
            <h2 id="dtf-products-heading" className="public-section-title">Pilihan Sablon DTF</h2>
            <p className="public-secondary-copy mt-3">Pilih kebutuhanmu, lalu konsultasikan desain dan jumlah pesanan untuk mendapatkan harga yang sesuai.</p>
          </div>
          {services.length ? (
            <div className="dtf-service-rail mt-6" role="region" aria-label="Pilihan sablon DTF, geser untuk melihat produk lainnya" tabIndex={0}>
              {services.map((service) => (
                <article key={service.id || service.slug} className="dtf-service-card snap-start">
                  <div className="relative aspect-[4/5] overflow-hidden bg-[#efefed]">
                    <SafeImage
                      src={service.image_url}
                      fallbackSrc={fallbackImages.product}
                      alt={service.image_alt || service.nama}
                      className="h-full w-full object-cover"
                      objectFit={service.object_fit || "cover"}
                      objectPosition={service.object_position || "center center"}
                      focalX={service.focal_x}
                      focalY={service.focal_y}
                      zoom={service.focal_zoom}
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                    />
                  </div>
                  <div className="flex flex-1 flex-col pt-4">
                    <h3 className="line-clamp-2 text-base font-semibold">{service.nama}</h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-brand-charcoal/65">{service.deskripsi}</p>
                    <p className="mt-3 text-sm font-medium">
                      {formatRupiah(service.harga_mulai) ? "Harga mulai dari " + formatRupiah(service.harga_mulai) : "Harga menyesuaikan desain dan jumlah"}
                    </p>
                    <a
                      href={whatsappLinkWithMessage(whatsapp, "Halo Debroder, saya ingin konsultasi sablon DTF " + service.nama + ". Mohon informasi desain, jumlah dan estimasi harganya.")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="public-button public-button--primary mt-5 w-full text-center"
                    >
                      Konsultasikan Desain Anda
                    </a>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="public-category-empty mt-6">Pilihan sablon DTF akan tampil setelah dipublikasikan oleh pengelola.</p>
          )}
        </section>

        <section className="dtf-section" aria-labelledby="dtf-gallery-heading">
          <div className="section-shell">
            <h2 id="dtf-gallery-heading" className="public-section-title">Hasil Sablon Debroder</h2>
          </div>
          {portfolio.length ? (
            <div className="dtf-gallery-grid" aria-label="Galeri foto hasil sablon Debroder">
              {portfolio.map((item) => (
                  <DtfGalleryPhoto
                    key={item.id || item.desktop_media_url}
                    src={item.desktop_media_url}
                    mobileSrc={item.mobile_media_url}
                    alt={item.image_alt || "Hasil sablon Debroder"}
                  />
              ))}
            </div>
          ) : (
            <p className="section-shell public-secondary-copy mt-5">Foto hasil sablon akan tampil setelah dokumentasi asli dipublikasikan oleh pengelola.</p>
          )}
        </section>

        <section className="section-shell dtf-section" aria-labelledby="dtf-faq-heading">
          <div className="mx-auto max-w-3xl">
            <h2 id="dtf-faq-heading" className="public-section-title">Pertanyaan yang Sering Ditanyakan</h2>
            <div className="mt-6 border-t border-black/15">
              {frequentlyAskedQuestions.map((item) => (
                <details key={item.question} className="dtf-faq-item group border-b border-black/15">
                  <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4 text-left text-sm font-semibold leading-6 marker:hidden sm:text-base [&::-webkit-details-marker]:hidden">
                    <span>{item.question}</span>
                    <span className="shrink-0 text-xl font-normal transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                  </summary>
                  <p className="max-w-2xl pb-5 pr-8 text-sm leading-7 text-brand-charcoal/75">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="section-shell dtf-section dtf-closing" aria-labelledby="dtf-cta-heading">
          <h2 id="dtf-cta-heading" className="text-xl font-semibold leading-snug tracking-tight sm:text-2xl">Siap Bikin Kaos Custom?</h2>
          <a href={generalWhatsapp} target="_blank" rel="noopener noreferrer" className="public-button public-button--primary mt-5 inline-flex min-h-12 items-center justify-center px-8 text-center">
            Order Sekarang
          </a>
        </section>
      </div>
    </PublicShell>
  );
}
