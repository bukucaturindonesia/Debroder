"use client";

import Link from "next/link";

export default function AppError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-[70vh] place-items-center bg-[#f6f5f0] px-5 py-16 text-center">
      <section
        role="alert"
        className="w-full max-w-lg rounded-[28px] border border-black/10 bg-white p-7 sm:p-9"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/45">
          DEBRODER
        </p>
        <h1 className="mt-3 text-2xl font-semibold">
          Halaman belum dapat ditampilkan
        </h1>
        <p className="mt-3 text-sm leading-6 text-black/60">
          Data Anda tetap aman. Coba muat ulang halaman atau kembali ke beranda.
        </p>
        {error.digest ? (
          <p className="mt-3 break-all font-mono text-xs text-black/45">
            Referensi: {error.digest}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="min-h-11 rounded-full bg-black px-6 text-sm font-semibold text-white"
          >
            Coba Lagi
          </button>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-full border border-black/20 px-6 text-sm font-semibold"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </section>
    </main>
  );
}
