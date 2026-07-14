import type { Metadata } from "next";
import { OrderConfirmationClient } from "@/components/checkout/OrderConfirmationClient";

export const metadata: Metadata = {
  title: "Konfirmasi Order | DEBRODER",
  robots: { index: false, follow: false },
  referrer: "no-referrer"
};

export default async function OrderConfirmationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <main className="min-h-screen bg-[#f6f5f0] px-4 py-10 text-[#111]"><OrderConfirmationClient token={token} /></main>;
}
