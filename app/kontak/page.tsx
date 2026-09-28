import type { Metadata } from "next";
import Link from "next/link";
import { BrochureShell } from "@/components/brochure/BrochureShell";
import { container, Eyebrow, PageIntro } from "@/components/brochure/BrochureContent";
import { brochureSite, brochureWhatsappHref } from "@/src/config/site";

export const metadata: Metadata = {
  title: "Kontak — DEBRODER",
  description: "Pesan apparel atau diskusikan produksi custom melalui WhatsApp DEBRODER. Email alternatif: hello@debroder.id.",
  alternates: { canonical: "/kontak" }
};

export default function ContactPage() {
  return (
    <BrochureShell>
      <PageIntro eyebrow="Kontak" title="Mari mulai percakapan." description="Ceritakan bahan, jenis apparel, atau layanan produksi yang Anda butuhkan. Kami mulai dari sana." />
      <section className="brochure-contact-page-section">
        <div className={`${container} brochure-contact-page-grid`}>
          <div>
            <Eyebrow>Hubungi DEBRODER</Eyebrow>
            <h2 className="brochure-display brochure-section-title">Mulai lewat WhatsApp.</h2>
            <p className="brochure-lead">Sampaikan produk atau layanan, ukuran, warna, dan jumlah yang Anda butuhkan. Tim akan membantu membahas detail pemesanan.</p>
            <div className="brochure-actions"><a href={brochureWhatsappHref()} className="brochure-button brochure-button-primary">Pesan via WhatsApp <span aria-hidden="true">↗</span></a></div>
            <p className="brochure-lead">Atau hubungi kami melalui email:</p>
            <a href={`mailto:${brochureSite.email}`} className="brochure-contact-email">{brochureSite.email} <span aria-hidden="true">↗</span></a>
          </div>
          <aside className="brochure-contact-aside">
            <Eyebrow>Belum yakin harus mulai dari mana?</Eyebrow>
            <p>Kenali layanan yang tersedia, lalu ceritakan kebutuhan Anda kepada tim.</p>
            <Link href="/layanan" className="brochure-text-link">Jelajahi Layanan <span aria-hidden="true">↗</span></Link>
          </aside>
        </div>
      </section>
    </BrochureShell>
  );
}
