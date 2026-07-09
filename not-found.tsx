import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-brand-offWhite px-4 py-10 text-brand-charcoal">
      <div className="mx-auto grid min-h-[calc(100vh-80px)] max-w-2xl place-items-center">
        <section className="w-full rounded-xl border border-brand-softGray bg-white p-8 text-center shadow-soft sm:p-12">
          <Logo variant="symbol-black" size="lg" className="justify-center" />
          <p className="mt-8 text-sm font-semibold uppercase tracking-[0.24em] text-brand-charcoal/50">
            DE BRODER
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">
            Halaman tidak ditemukan
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-brand-charcoal/70">
            Halaman yang Anda buka tidak tersedia atau sudah berpindah alamat.
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-brand-charcoal px-7 py-4 text-sm font-semibold text-white transition hover:bg-black/80"
          >
            Kembali ke Beranda
          </Link>
        </section>
      </div>
    </main>
  );
}
