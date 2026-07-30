import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import { termsSections } from "@/lib/legal-content";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan | DEBRODER",
  description: "Draft operasional Syarat & Ketentuan DEBRODER yang masih menunggu verifikasi owner dan tinjauan penasihat hukum.",
  alternates: { canonical: "/legal/terms" },
  robots: { index: false, follow: false }
};

export default function TermsPage() {
  return (
    <LegalDocumentPage
      title="Syarat & Ketentuan"
      description="Draft yang mengatur penggunaan website, Ready Stock, Custom Order, pembayaran, produksi, pengiriman, pengambilan, dan layanan setelah penjualan."
      sections={termsSections}
    />
  );
}
