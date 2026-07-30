import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import { privacySections } from "@/lib/legal-content";

export const metadata: Metadata = {
  title: "Kebijakan Privasi | DEBRODER",
  description: "Draft operasional Kebijakan Privasi DEBRODER yang masih menunggu verifikasi owner dan tinjauan penasihat hukum.",
  alternates: { canonical: "/legal/privacy" },
  robots: { index: false, follow: false }
};

export default function PrivacyPage() {
  return (
    <LegalDocumentPage
      title="Kebijakan Privasi"
      description="Draft yang menjelaskan pengumpulan, penggunaan, penyimpanan, pembagian, perlindungan, dan penghapusan data pribadi dalam layanan DEBRODER."
      sections={privacySections}
    />
  );
}
