import { PublicPaymentForm } from "@/components/payments/PublicPaymentForm";
import { PublicShell } from "@/components/PublicPage";

export const metadata = { title: "Pembayaran Pesanan | DEBRODER", robots: { index: false, follow: false } };

export default async function PaymentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <PublicShell>
      <section className="min-h-screen bg-brand-offWhite px-4 py-10 text-brand-charcoal sm:py-14">
        <PublicPaymentForm token={token} />
      </section>
    </PublicShell>
  );
}
