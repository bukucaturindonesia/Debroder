import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BrochureShell } from "@/components/brochure/BrochureShell";
import { ConsultationSection, Eyebrow, ProductSection, ServiceSection } from "@/components/brochure/BrochureContent";

export const metadata: Metadata = {
  title: "DEBRODER — Apparel & Custom Production",
  description: "Apparel, custom jersey, DTF dan sablon untuk brand, tim, dan komunitas. Temukan produk dan diskusikan kebutuhan Anda bersama DEBRODER.",
  alternates: { canonical: "/" }
};

export default function HomePage() {
  return (
    <BrochureShell>
      <section className="brochure-apparel-hero" aria-labelledby="brochure-hero-title">
        <div className="brochure-hero-content">
          <Eyebrow>Apparel / Custom / Production</Eyebrow>
          <h1 id="brochure-hero-title" className="brochure-display">Wear<br />your story.</h1>
          <p className="brochure-lead">Apparel, custom jersey, dan DTF / sablon untuk brand, tim, dan komunitas Anda.</p>
          <div className="brochure-actions">
            <Link href="/produk" className="brochure-button brochure-button-primary">Lihat Produk <span aria-hidden="true">↗</span></Link>
            <Link href="/kontak" className="brochure-button brochure-button-secondary">Hubungi DEBRODER</Link>
          </div>
        </div>
        <figure className="brochure-hero-visual">
          <Image src="/products/3600-soft-tee/primary.webp" alt="Referensi apparel: kaos hitam dengan potongan sederhana" fill priority sizes="(max-width: 767px) 100vw, 52vw" className="object-contain" />
          <figcaption>Visual referensi · foto DEBRODER menyusul</figcaption>
        </figure>
      </section>
      <ProductSection />
      <ServiceSection />
      <ConsultationSection />
    </BrochureShell>
  );
}
