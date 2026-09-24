import type { Metadata } from "next";
import { BrochureShell } from "@/components/brochure/BrochureShell";
import { ConsultationSection, PageIntro, ProductSection } from "@/components/brochure/BrochureContent";

export const metadata: Metadata = {
  title: "Produk — DEBRODER",
  description: "Kenali pilihan bahan DEBRODER: NSA Premium dan Cotton Combed 24s. Konsultasikan kebutuhan apparel Anda.",
  alternates: { canonical: "/produk" }
};

export default function ProductsPage() {
  return <BrochureShell><PageIntro eyebrow="Katalog bahan" title="Bahan yang tepat untuk ide Anda." description="Jelajahi pilihan material awal kami. Detail warna, ketersediaan, dan kebutuhan produksi dikonfirmasi saat konsultasi." /><ProductSection fullPage /><ConsultationSection /></BrochureShell>;
}
