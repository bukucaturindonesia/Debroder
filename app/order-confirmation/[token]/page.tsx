import type { Metadata } from "next";
import { OrderConfirmationClient } from "@/components/checkout/OrderConfirmationClient";
import { PublicShell } from "@/components/PublicPage";

export const metadata: Metadata = {
  title: "Konfirmasi Pesanan | DEBRODER",
  robots: { index: false, follow: false },
  referrer: "no-referrer"
};

export default async function OrderConfirmationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <PublicShell theme="jersey-commerce">
      <section data-ui-transaction="confirmation" className="min-h-[60vh] bg-[var(--color-canvas)] py-8 text-[#111] sm:py-12">
        <div className="section-shell">
        <OrderConfirmationClient token={token} />
        </div>
      </section>
    </PublicShell>
  );
}
