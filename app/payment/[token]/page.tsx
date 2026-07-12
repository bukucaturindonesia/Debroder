import { PublicPaymentForm } from "@/components/payments/PublicPaymentForm";

export const metadata = { title: "Kirim Pembayaran | DEBRODER", robots: { index: false, follow: false } };

export default async function PaymentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <main className="min-h-screen bg-brand-offWhite px-4 py-10 text-brand-charcoal"><div className="mx-auto max-w-5xl"><p className="mb-5 text-sm font-semibold">DEBRODER · Pembayaran Aman</p><PublicPaymentForm token={token} /></div></main>;
}
