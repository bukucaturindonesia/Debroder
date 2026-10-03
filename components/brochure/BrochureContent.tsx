import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { brochureSite } from "@/src/config/site";
import { brochureProducts } from "@/src/data/products";
import { brochureServices } from "@/src/data/services";
import { formatRupiah } from "@/lib/url";

export const container = "brochure-container";

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="brochure-eyebrow">{children}</p>;
}

export function PageIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <section className="brochure-page-intro"><div className={container}>
    <Eyebrow>{eyebrow}</Eyebrow>
    <h1 className="brochure-display brochure-page-title">{title}</h1>
    <p className="brochure-lead brochure-page-description">{description}</p>
  </div></section>;
}

export function ProductSection({ fullPage = false }: { fullPage?: boolean }) {
  return (
    <section aria-labelledby="brochure-products-title" className="brochure-products-section">
      <div className={container}>
        <div className="brochure-section-heading">
          <div><Eyebrow>Pilihan apparel</Eyebrow><h2 id="brochure-products-title" className="brochure-display brochure-section-title">Mulai dari yang Anda pakai.</h2></div>
          {!fullPage && <Link href="/produk" className="brochure-text-link">Semua produk <span aria-hidden="true">↗</span></Link>}
        </div>
        {brochureProducts.length ? <div className="brochure-product-grid">
          {brochureProducts.map((product) => <article key={product.slug} className="brochure-product-card">
            <Link href={`/produk/${product.slug}`} aria-label={`Lihat ${product.name}`}>
              <div className="brochure-product-image"><Image src={product.image} alt={product.imageAlt} fill sizes="(max-width: 767px) 50vw, 45vw" className="object-contain" /></div>
              <p className="brochure-image-caption">{product.imageCaption}</p>
              <div className="brochure-product-title"><h3>{product.name}</h3><span aria-hidden="true">↗</span></div>
              {product.priceFrom !== undefined && product.priceFrom > 0 && <p>Mulai dari {formatRupiah(product.priceFrom)}</p>}
              <span className="brochure-product-detail-link">Lihat detail</span>
            </Link>
          </article>)}
        </div> : <div role="status" className="brochure-empty-panel">
          <span className="brochure-empty-index">KATALOG / 00</span>
          <div>
            <h3 className="brochure-display brochure-empty-title">Produk segera hadir</h3>
            <p className="brochure-lead brochure-empty-copy">Katalog publik sedang disiapkan. Hubungi tim DEBRODER melalui email untuk informasi lebih lanjut.</p>
            <Link href="/kontak" className="brochure-text-link">Hubungi tim <span aria-hidden="true">↗</span></Link>
          </div>
        </div>}
      </div>
    </section>
  );
}

export function ServiceSection({ fullPage = false }: { fullPage?: boolean }) {
  return (
    <section aria-labelledby="brochure-services-title" className={`brochure-services-section${fullPage ? " brochure-services-full" : ""}`}>
      <div className={`${container} brochure-services-layout`}>
        <div className="brochure-section-heading">
          <div><Eyebrow>Dibuat untuk Anda</Eyebrow><h2 id="brochure-services-title" className="brochure-display brochure-section-title">Ide Anda. Kami wujudkan.</h2></div>
          {!fullPage && <Link href="/layanan" className="brochure-text-link">Semua layanan <span aria-hidden="true">↗</span></Link>}
        </div>
        <div className="brochure-service-grid">
          {brochureServices.map((service) => <article id={service.id} key={service.id} className="brochure-service-card">
            <div className={`brochure-service-image${service.imagePosition === "top" ? " brochure-service-image-top" : ""}`}>
              <Image src={service.image} alt={service.imageAlt} fill sizes="(max-width: 767px) 100vw, 30vw" className={service.imagePosition === "top" ? "object-cover object-top" : "object-contain"} />
            </div>
            <p className="brochure-image-caption">Visual referensi layanan</p>
            <h3>{service.name}</h3><p>{service.description}</p>
            <Link href="/kontak" className="brochure-text-link">Diskusikan {service.name} <span aria-hidden="true">↗</span></Link>
          </article>)}
        </div>
      </div>
    </section>
  );
}

export function ConsultationSection() {
  return <section aria-labelledby="brochure-contact-title" className="brochure-contact-band">
    <div className={`${container} brochure-contact-band-inner`}>
      <div><Eyebrow>Mulai dari satu pesan</Eyebrow><h2 id="brochure-contact-title" className="brochure-display brochure-section-title">Punya ide untuk apparel Anda?</h2><p className="brochure-lead">Kirim kebutuhan Anda. Kita bahas bahan, desain, dan jumlahnya bersama.</p></div>
      <div className="brochure-contact-actions"><a href={`mailto:${brochureSite.email}`} className="brochure-button brochure-button-primary">Hubungi DEBRODER <span aria-hidden="true">↗</span></a><span className="brochure-email-alternative">{brochureSite.email}</span></div>
    </div>
  </section>;
}
