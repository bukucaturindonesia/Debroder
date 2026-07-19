import { PublicPaymentForm } from "@/components/payments/PublicPaymentForm";

export const metadata = { title: "Pembayaran Pesanan | DEBRODER", robots: { index: false, follow: false } };

export default async function PaymentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <main className="min-h-screen bg-brand-offWhite px-4 py-10 text-brand-charcoal sm:py-14">
      <PublicPaymentForm token={token} />
    </main>
  );
}
