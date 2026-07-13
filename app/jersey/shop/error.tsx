"use client";

import { useEffect } from "react";

export default function JerseyShopError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Jersey shop failed to render", error);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center bg-white px-6 text-center text-black">
      <div className="max-w-lg">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-black/50">DEBRODER JERSEY</p>
        <h1 className="mt-3 text-3xl font-bold">Katalog belum dapat dimuat</h1>
        <p className="mt-3 text-sm leading-6 text-black/60">Coba muat ulang data katalog. Filter dan halaman tidak akan dialihkan ke jalur lain.</p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex min-h-11 items-center justify-center bg-black px-6 text-sm font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
        >
          Coba Lagi
        </button>
      </div>
    </main>
  );
}
