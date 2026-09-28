import type { Metadata } from "next";
import Link from "next/link";
import { BrochureShell } from "@/components/brochure/BrochureShell";
import { container, Eyebrow, PageIntro } from "@/components/brochure/BrochureContent";
import { brochureSite } from "@/src/config/site";

export const metadata: Metadata = {
  title: "Kontak — DEBRODER",
  description: "Hubungi DEBRODER melalui hello@debroder.id untuk mendiskusikan bahan dan produksi apparel.",
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
            <h2 className="brochure-display brochure-section-title">Tulis kepada kami.</h2>
            <p className="brochure-lead">Sampaikan kebutuhan dan pertanyaan Anda melalui email. Tidak perlu formulir yang panjang untuk memulai.</p>
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
