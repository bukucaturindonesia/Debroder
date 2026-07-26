import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/PublicPage";

export const metadata: Metadata = {
  title: "Masuk | DEBRODER",
  robots: { index: false, follow: false }
};

export default async function LoginPage() {
  return (
    <PublicShell>
      <section className="bg-brand-offWhite py-20 sm:py-28">
        <div className="section-shell">
          <div className="mx-auto max-w-xl bg-white p-7 text-center sm:p-10">
            <p className="public-eyebrow">Masuk</p>
            <h1 className="mt-3 text-3xl font-semibold sm:text-5xl">Login pelanggan belum tersedia</h1>
            <p className="mt-5 text-sm leading-7 text-black/60">
              Checkout tetap dapat digunakan tanpa akun. Pesanan yang sudah dibuat dapat diakses melalui guest tracking.
            </p>
            <Link href="/track-order" className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-black px-6 text-sm font-semibold text-white">
              Lacak pesanan
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
