import type { Metadata } from "next";
import { BrochureShell } from "@/components/brochure/BrochureShell";
import { ConsultationSection, PageIntro, ServiceSection } from "@/components/brochure/BrochureContent";

export const metadata: Metadata = {
  title: "Layanan — DEBRODER",
  description: "Kenali layanan Cetak DTF, Produksi Jersey, dan Maklon Sublim dari DEBRODER.",
  alternates: { canonical: "/layanan" }
};

export default function ServicesPage() {
  return (
    <BrochureShell>
      <PageIntro eyebrow="Layanan produksi" title="Buat ide menjadi langkah nyata." description="Cetak dan produksi apparel untuk kebutuhan brand, komunitas, dan usaha. Pilih layanan yang ingin Anda diskusikan." />
      <ServiceSection fullPage />
      <ConsultationSection />
    </BrochureShell>
  );
}
