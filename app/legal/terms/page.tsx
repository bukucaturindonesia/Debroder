import type { Metadata } from "next";
import { LegalContentPending } from "@/components/legal/LegalContentPending";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan | DEBRODER",
  robots: { index: false, follow: false }
};

export default function TermsPage() {
  return <LegalContentPending title="Syarat & Ketentuan" />;
}
