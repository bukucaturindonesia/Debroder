import type { Metadata } from "next";
import { PublicShell } from "@/components/PublicPage";
import { GuestOrderTracking } from "@/components/tracking/GuestOrderTracking";
import { getPublicContent } from "@/lib/public-data";

export const metadata: Metadata = {
  title: "Lacak Pesanan | DEBRODER",
  description: "Lacak status pesanan DEBRODER tanpa login menggunakan nomor pesanan dan nomor WhatsApp checkout.",
  robots: { index: false, follow: false },
  referrer: "no-referrer"
};

export default async function TrackOrderPage() {
  const content = await getPublicContent();
  return <PublicShell content={content} theme="jersey-commerce"><GuestOrderTracking /></PublicShell>;
}
