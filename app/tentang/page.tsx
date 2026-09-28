import type { Metadata } from "next";
import Link from "next/link";
import { BrochureShell } from "@/components/brochure/BrochureShell";
import { ConsultationSection, container, Eyebrow, PageIntro } from "@/components/brochure/BrochureContent";

export const metadata: Metadata = {
  title: "Tentang DEBRODER — Bahan & Produksi Apparel",
  description: "Kenali DEBRODER dan pendekatan kami terhadap kebutuhan bahan serta produksi apparel.",
  alternates: { canonical: "/tentang" }
};

export default function AboutPage() {
  return (
    <BrochureShell>
      <PageIntro eyebrow="Tentang kami" title="DEBRODER, dari bahan hingga produksi." description="Kami membantu brand, komunitas, dan usaha menemukan pilihan bahan serta layanan produksi apparel yang sesuai kebutuhan." />
      <section aria-labelledby="brochure-about-title" className="brochure-about-section">
        <div className={`${container} brochure-company-grid`}>
          <Eyebrow>Pendekatan kami</Eyebrow>
          <div>
            <h2 id="brochure-about-title" className="brochure-display brochure-section-title">Percakapan yang jelas sebelum pekerjaan dimulai.</h2>
            <p className="brochure-lead">Kami mendengarkan kebutuhan Anda, membahas pilihan bahan dan layanan yang tersedia, lalu mengonfirmasi detail pekerjaan secara langsung. Dengan begitu, langkah berikutnya berangkat dari informasi yang tepat.</p>
            <div className="brochure-about-links">
              <Link href="/layanan" className="brochure-text-link">Lihat layanan <span aria-hidden="true">↗</span></Link>
              <Link href="/kontak" className="brochure-text-link">Hubungi tim <span aria-hidden="true">↗</span></Link>
            </div>
          </div>
        </div>
      </section>
      <ConsultationSection />
    </BrochureShell>
  );
}
