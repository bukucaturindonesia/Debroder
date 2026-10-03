import type { Metadata } from "next";
import { BrochureShell } from "@/components/brochure/BrochureShell";
import { PageIntro, ProductSection } from "@/components/brochure/BrochureContent";

export const metadata: Metadata = {
  title: "Produk — DEBRODER",
  description: "Produk DEBRODER sedang disiapkan. Hubungi tim melalui email untuk informasi lebih lanjut.",
  alternates: { canonical: "/produk" }
};

export default function ProductsPage() {
  return (
    <BrochureShell>
      <PageIntro eyebrow="Katalog DEBRODER" title="Apparel untuk cerita Anda." description="Katalog publik sedang disiapkan. Informasi produk akan ditampilkan setelah siap dipublikasikan." />
      <ProductSection fullPage />
    </BrochureShell>
  );
}
