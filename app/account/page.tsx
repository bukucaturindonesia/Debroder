import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/PublicPage";

export const metadata: Metadata = {
  title: "Akun Pelanggan | DEBRODER",
  description: "Akses aman ke perjalanan pesanan DEBRODER.",
  robots: { index: false, follow: false }
};

export default async function AccountPage() {
  return (
    <PublicShell>
      <section className="bg-brand-offWhite py-20 sm:py-28">
        <div className="section-shell">
          <div className="mx-auto max-w-2xl bg-white p-7 text-center sm:p-10">
            <p className="public-eyebrow">Akun pelanggan</p>
            <h1 className="mt-3 text-3xl font-semibold sm:text-5xl">Akses pesanan tanpa login</h1>
            <p className="mt-5 text-sm leading-7 text-black/60">
              Portal akun pelanggan belum diaktifkan. Gunakan nomor pesanan dan nomor WhatsApp checkout untuk melihat status melalui jalur guest tracking yang tersedia.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/track-order" className="inline-flex min-h-12 items-center justify-center rounded-full bg-black px-6 text-sm font-semibold text-white">
                Lacak pesanan
              </Link>
              <Link href="/help" className="inline-flex min-h-12 items-center justify-center rounded-full border border-black/15 px-6 text-sm font-semibold">
                Pusat bantuan
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
