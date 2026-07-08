import type { Metadata } from "next";
import { CartPageContent } from "@/components/CartProvider";
import { PublicShell } from "@/components/PublicPage";
import { getPublicContent } from "@/lib/public-data";

export const metadata: Metadata = {
  title: "Keranjang Pesanan | DEBRODER",
  description: "Cek bag, summary, pilihan produksi, dan kirim pesanan DEBRODER ke WhatsApp.",
  alternates: { canonical: "/keranjang" }
};

export default async function KeranjangPage() {
  const content = await getPublicContent();
  return (
    <PublicShell content={content}>
      <main className="bg-[#f7f7f2] py-8 sm:py-12">
        <div className="section-shell">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-charcoal/45">Keranjang Pesanan</p>
            <h1 className="mt-3 text-[34px] font-semibold leading-tight sm:text-[48px]">Bag & Summary</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-brand-charcoal/60 sm:text-base">
              Produk utama tetap menjadi fokus. Atur jumlah, pilih produksi bila dibutuhkan, lalu kirim pesanan ke WhatsApp DEBRODER.
            </p>
          </div>
          <CartPageContent />
        </div>
      </main>
    </PublicShell>
  );
}
