import { PublicPaymentForm } from "@/components/payments/PublicPaymentForm";
import { PublicShell } from "@/components/PublicPage";

export const metadata = { title: "Pembayaran Pesanan | DEBRODER", robots: { index: false, follow: false } };

export default async function PaymentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <PublicShell>
      <section data-ui-transaction="payment" className="min-h-[60vh] bg-brand-offWhite py-8 text-brand-charcoal sm:py-12">
        <div className="section-shell">
        <PublicPaymentForm token={token} />
        </div>
      </section>
    </PublicShell>
  );
}
