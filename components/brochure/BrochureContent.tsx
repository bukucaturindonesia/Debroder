import Link from "next/link";
import type { ReactNode } from "react";
import { brochureSite } from "@/src/config/site";
import { brochureServices } from "@/src/data/services";

export const container = "brochure-container";

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="brochure-eyebrow">{children}</p>;
}

export function PageIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <section className="brochure-page-intro">
      <div className={container}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="brochure-display brochure-page-title">{title}</h1>
        <p className="brochure-lead brochure-page-description">{description}</p>
      </div>
    </section>
  );
}

export function ProductSection({ fullPage = false }: { fullPage?: boolean }) {
  if (fullPage) {
    return (
      <section aria-labelledby="brochure-products-title" className="brochure-empty-section">
        <div className={container}>
          <div className="brochure-empty-panel">
            <div className="brochure-empty-index" aria-hidden="true">DEBRODER / KATALOG</div>
            <div>
              <Eyebrow>Koleksi mendatang</Eyebrow>
              <h2 id="brochure-products-title" className="brochure-display brochure-empty-title">Produk segera hadir.</h2>
              <p className="brochure-lead brochure-empty-copy">Koleksi DEBRODER sedang kami siapkan. Sementara itu, kenali layanan kami atau ceritakan kebutuhan Anda langsung kepada tim.</p>
              <div className="brochure-actions">
                <Link href="/layanan" className="brochure-button brochure-button-primary">Lihat Layanan <span aria-hidden="true">↗</span></Link>
                <Link href="/kontak" className="brochure-button brochure-button-secondary">Hubungi Kami</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="brochure-products-title" className="brochure-product-teaser">
      <div className={`${container} brochure-product-teaser-inner`}>
        <div>
          <Eyebrow>Katalog DEBRODER</Eyebrow>
          <h2 id="brochure-products-title" className="brochure-display brochure-section-title">Produk segera hadir.</h2>
        </div>
        <div className="brochure-teaser-aside">
          <p>Koleksi DEBRODER sedang kami siapkan. Kebutuhan bahan dan produksi Anda tetap bisa didiskusikan sekarang.</p>
          <Link href="/produk" className="brochure-text-link">Lihat halaman produk <span aria-hidden="true">↗</span></Link>
        </div>
      </div>
    </section>
  );
}

export function ServiceSection({ fullPage = false }: { fullPage?: boolean }) {
  return (
    <section aria-labelledby="brochure-services-title" className={`brochure-services-section${fullPage ? " brochure-services-full" : ""}`}>
      <div className={`${container} brochure-services-layout`}>
        <div className="brochure-services-intro">
          <Eyebrow>Dari kebutuhan ke proses</Eyebrow>
          <h2 id="brochure-services-title" className="brochure-display brochure-section-title">{fullPage ? "Dari cetak hingga produksi." : "Layanan yang relevan."}</h2>
          <p className="brochure-lead">Kenali pilihan layanan DEBRODER, lalu diskusikan pendekatan yang sesuai dengan kebutuhan Anda.</p>
          {!fullPage && <Link href="/layanan" className="brochure-text-link">Jelajahi semua layanan <span aria-hidden="true">↗</span></Link>}
        </div>
        <div className="brochure-service-list">
          {brochureServices.map((service) => (
            <article key={service.name} className="brochure-service-row">
              <span className="brochure-service-number" aria-hidden="true">{service.index}</span>
              <div>
                <h3>{service.name}</h3>
                <p>{service.description}</p>
                {fullPage && <Link href="/kontak" className="brochure-text-link">Diskusikan layanan <span aria-hidden="true">↗</span></Link>}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ConsultationSection() {
  return (
    <section aria-labelledby="brochure-contact-title" className="brochure-contact-band">
      <div className={`${container} brochure-contact-band-inner`}>
        <div>
          <Eyebrow>Mulai percakapan</Eyebrow>
          <h2 id="brochure-contact-title" className="brochure-display brochure-section-title">Ceritakan kebutuhan Anda.</h2>
          <p className="brochure-lead">Untuk bahan, cetak, atau produksi apparel, mulailah dengan pesan singkat kepada tim DEBRODER.</p>
        </div>
        <a href={`mailto:${brochureSite.email}`} className="brochure-button brochure-button-primary">Tulis ke DEBRODER <span aria-hidden="true">↗</span></a>
      </div>
    </section>
  );
}
