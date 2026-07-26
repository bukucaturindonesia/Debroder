import type { Metadata } from "next";
import { LegalContentPending } from "@/components/legal/LegalContentPending";

export const metadata: Metadata = {
  title: "Kebijakan Privasi | DEBRODER",
  robots: { index: false, follow: false }
};

export default function PrivacyPage() {
  return <LegalContentPending title="Kebijakan Privasi" />;
}
