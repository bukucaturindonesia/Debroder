"use client";

export function CategoryCommerceError({ reset }: { reset: () => void }) {
  return (
    <main className="flex min-h-[60vh] items-center justify-center bg-brand-offWhite px-5 py-16">
      <div className="max-w-lg text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-charcoal/50">Katalog Produk</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-brand-charcoal">Katalog belum dapat dimuat</h1>
        <p className="mt-3 text-sm leading-6 text-brand-charcoal/60">Silakan coba kembali. Pilihan produk dan filter Anda tidak dialihkan ke layanan lain.</p>
        <button type="button" onClick={reset} className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-brand-charcoal px-6 text-sm font-semibold text-white hover:bg-brand-green focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-green">Coba Lagi</button>
      </div>
    </main>
  );
}
