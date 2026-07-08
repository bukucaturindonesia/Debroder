import type { Metadata } from "next";
import { CartPageContent } from "@/components/CartProvider";
import { PublicShell } from "@/components/PublicPage";
import { getPublicContent } from "@/lib/public-data";

export const metadata: Metadata = {
  title: "Keranjang Belanja | DEBRODER",
  description: "Cek pesanan utama, layanan tambahan, estimasi normal, dan kirim pesanan DEBRODER ke WhatsApp.",
  alternates: { canonical: "/keranjang" }
};

export default async function KeranjangPage() {
  const content = await getPublicContent();
  return (
    <PublicShell content={content}>
      <main className="bg-brand-offWhite py-8 sm:py-12">
        <div className="section-shell">
          <div className="mb-6 bg-white p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-charcoal/45">Keranjang Belanja</p>
            <h1 className="mt-3 text-[32px] font-semibold leading-tight sm:text-[44px]">Cek pesanan sebelum WhatsApp</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-brand-charcoal/60 sm:text-base">
              Produk utama selalu tampil paling atas. Tambahkan layanan jika dibutuhkan, lalu dapatkan harga terbaik dari admin DEBRODER via WhatsApp.
            </p>
          </div>
          <CartPageContent />
        </div>
      </main>
    </PublicShell>
  );
}
