import type { Metadata } from "next";
import Link from "next/link";
import { BrochureShell } from "@/components/brochure/BrochureShell";
import { container, Eyebrow, PageIntro } from "@/components/brochure/BrochureContent";
import { brochureSite } from "@/src/config/site";

export const metadata: Metadata = {
  title: "Kontak — DEBRODER",
  description: "Hubungi DEBRODER melalui hello@debroder.id untuk membahas kebutuhan apparel dan produksi.",
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
            <h2 className="brochure-display brochure-section-title">Mulai lewat email.</h2>
            <p className="brochure-lead">Sampaikan kebutuhan bahan, jenis apparel, layanan produksi, dan jumlah yang Anda perlukan. Tim akan membantu membahas detail berikutnya.</p>
            <div className="brochure-actions"><a href={`mailto:${brochureSite.email}`} className="brochure-button brochure-button-primary">Kirim Email <span aria-hidden="true">↗</span></a></div>
            <p className="brochure-lead">Email resmi DEBRODER:</p>
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
