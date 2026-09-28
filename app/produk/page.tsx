import type { Metadata } from "next";
import { BrochureShell } from "@/components/brochure/BrochureShell";
import { PageIntro, ProductSection } from "@/components/brochure/BrochureContent";

export const metadata: Metadata = {
  title: "Produk — DEBRODER",
  description: "Kenali NSA Premium dan Cotton Combed 24s. Pilih kebutuhan apparel Anda dan diskusikan pemesanan melalui WhatsApp DEBRODER.",
  alternates: { canonical: "/produk" }
};

export default function ProductsPage() {
  return (
    <BrochureShell>
      <PageIntro eyebrow="Katalog DEBRODER" title="Apparel untuk cerita Anda." description="Pilih produk, ceritakan kebutuhan Anda, lalu diskusikan harga dan ketersediaannya bersama tim." />
      <ProductSection fullPage />
    </BrochureShell>
  );
}
