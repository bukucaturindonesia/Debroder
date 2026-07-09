"use client";

export default function ProductError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-[60vh] place-items-center bg-brand-offWhite px-5 text-center">
      <div className="max-w-md bg-white p-8">
        <h1 className="text-2xl font-semibold">Detail produk belum dapat dimuat</h1>
        <p className="mt-3 text-sm leading-6 text-brand-charcoal/60">Periksa koneksi lalu coba lagi. Data produk tetap aman.</p>
        <button type="button" onClick={reset} className="mt-5 min-h-11 rounded-full bg-brand-charcoal px-6 text-sm font-semibold text-white">Coba lagi</button>
      </div>
    </main>
  );
}
