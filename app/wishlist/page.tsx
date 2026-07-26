import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/PublicPage";

export const metadata: Metadata = {
  title: "Wishlist | DEBRODER",
  robots: { index: false, follow: false }
};

export default async function WishlistPage() {
  return (
    <PublicShell>
      <section className="bg-brand-offWhite py-20 sm:py-28">
        <div className="section-shell">
          <div className="mx-auto max-w-xl bg-white p-7 text-center sm:p-10">
            <p className="public-eyebrow">Wishlist</p>
            <h1 className="mt-3 text-3xl font-semibold sm:text-5xl">Belum ada produk tersimpan</h1>
            <p className="mt-5 text-sm leading-7 text-black/60">
              Penyimpanan wishlist belum diaktifkan. Tidak ada data produk atau akun yang dibuat dari halaman ini.
            </p>
            <Link href="/koleksi" className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-black px-6 text-sm font-semibold text-white">
              Lihat koleksi
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
