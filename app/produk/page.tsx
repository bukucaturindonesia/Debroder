import type { Metadata } from "next";
import { BrochureShell } from "@/components/brochure/BrochureShell";
import { PageIntro, ProductSection } from "@/components/brochure/BrochureContent";

export const metadata: Metadata = {
  title: "Produk — DEBRODER",
  description: "Koleksi produk DEBRODER sedang disiapkan. Kenali layanan kami atau hubungi tim untuk mendiskusikan kebutuhan Anda.",
  alternates: { canonical: "/produk" }
};

export default function ProductsPage() {
  return (
    <BrochureShell>
      <PageIntro eyebrow="Katalog DEBRODER" title="Produk." description="Kami sedang menyiapkan koleksi yang akan ditampilkan di sini." />
      <ProductSection fullPage />
    </BrochureShell>
  );
}
