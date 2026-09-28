import type { Metadata } from "next";
import Link from "next/link";
import { BrochureShell } from "@/components/brochure/BrochureShell";
import { ConsultationSection, container, Eyebrow, ProductSection, ServiceSection } from "@/components/brochure/BrochureContent";

export const metadata: Metadata = {
  title: "DEBRODER — Bahan & Produksi Apparel",
  description: "DEBRODER menyediakan bahan dan layanan produksi apparel untuk brand, komunitas, dan usaha.",
  alternates: { canonical: "/" }
};

const approach = [
  { number: "01", title: "Kenali kebutuhan", copy: "Ceritakan bahan, jenis apparel, dan hasil yang ingin Anda capai." },
  { number: "02", title: "Tentukan layanan", copy: "Pilih jalur cetak atau produksi yang relevan untuk kebutuhan tersebut." },
  { number: "03", title: "Lanjutkan percakapan", copy: "Detail pekerjaan dan langkah berikutnya dibicarakan langsung dengan tim." }
] as const;

export default function HomePage() {
  return (
    <BrochureShell>
      <section className="brochure-hero">
        <div className={`${container} brochure-hero-grid`}>
          <div className="brochure-hero-copy">
            <Eyebrow>DEBRODER / Bahan & produksi apparel</Eyebrow>
            <h1 className="brochure-display brochure-hero-title">Bahan yang tepat.<br />Produksi yang terarah.</h1>
            <p className="brochure-lead">Untuk brand, komunitas, dan usaha yang membutuhkan bahan serta layanan produksi apparel dalam satu percakapan yang jelas.</p>
            <div className="brochure-actions">
              <Link href="/layanan" className="brochure-button brochure-button-primary">Jelajahi Layanan <span aria-hidden="true">↗</span></Link>
              <Link href="/kontak" className="brochure-button brochure-button-secondary">Hubungi Kami</Link>
            </div>
          </div>
          <div className="brochure-hero-composition" aria-hidden="true">
            <div className="brochure-composition-top"><span>DEBRODER</span><span>01 — 03</span></div>
            <div className="brochure-composition-main"><span>Bahan</span><span>Apparel</span><span>Produksi</span></div>
            <div className="brochure-composition-bottom"><span>Material & proses</span><span>Untuk ide berikutnya</span></div>
          </div>
        </div>
      </section>

      <ServiceSection />

      <section aria-labelledby="brochure-approach-title" className="brochure-approach-section">
        <div className={container}>
          <div className="brochure-section-heading">
            <div><Eyebrow>Cara kami bekerja</Eyebrow><h2 id="brochure-approach-title" className="brochure-display brochure-section-title">Mulai dari hal yang penting.</h2></div>
            <p>Setiap kebutuhan berbeda. Percakapan awal membantu menentukan bahan dan layanan yang relevan, tanpa membuat janji yang belum dikonfirmasi.</p>
          </div>
          <div className="brochure-approach-grid">
            {approach.map((item) => <div key={item.number} className="brochure-approach-item"><span>{item.number}</span><h3>{item.title}</h3><p>{item.copy}</p></div>)}
          </div>
        </div>
      </section>

      <ProductSection />

      <section aria-labelledby="brochure-company-title" className="brochure-company-section">
        <div className={`${container} brochure-company-grid`}>
          <Eyebrow>Tentang DEBRODER</Eyebrow>
          <div>
            <h2 id="brochure-company-title" className="brochure-display brochure-section-title">Ruang untuk ide yang ingin diwujudkan.</h2>
            <p className="brochure-lead">Kami menyediakan pilihan bahan dan layanan produksi apparel. Mulai dari kebutuhan yang Anda bawa, kami membantu mencari langkah yang sesuai.</p>
            <Link href="/tentang" className="brochure-text-link">Kenali DEBRODER <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
      </section>

      <ConsultationSection />
    </BrochureShell>
  );
}
