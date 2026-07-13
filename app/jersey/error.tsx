"use client";

import Link from "next/link";

export default function JerseyError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-[70vh] place-items-center bg-[#050505] px-4 py-20 text-center text-white">
      <div className="max-w-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#39FF88]">DEBRODER JERSEY</p>
        <h1 className="mt-4 font-heading text-[clamp(2.5rem,7vw,5rem)] font-extrabold uppercase leading-[.92]">Halaman belum dapat dimuat</h1>
        <p className="mt-5 text-base leading-7 text-white/70">Coba muat kembali halaman atau lanjutkan ke katalog Jersey.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" onClick={reset} className="min-h-12 rounded-full bg-[#39FF88] px-6 text-sm font-semibold text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#39FF88]">Coba Lagi</button>
          <Link href="/jersey/shop" className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">Belanja Jersey</Link>
        </div>
      </div>
    </main>
  );
}
