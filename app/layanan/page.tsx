import type { Metadata } from "next";
import { BrochureShell } from "@/components/brochure/BrochureShell";
import { ConsultationSection, PageIntro, ServiceSection } from "@/components/brochure/BrochureContent";

export const metadata: Metadata = {
  title: "Layanan — DEBRODER",
  description: "Layanan cetak DTF, produksi jersey, dan maklon sublim untuk kebutuhan apparel dan brand Anda.",
  alternates: { canonical: "/layanan" }
};

export default function ServicesPage() {
  return <BrochureShell><PageIntro eyebrow="Layanan produksi" title="Produksi untuk kebutuhan Anda." description="Mulai dari kebutuhan desain hingga proses produksi, mari diskusikan pilihan layanan yang paling sesuai." /><ServiceSection fullPage /><ConsultationSection /></BrochureShell>;
}
