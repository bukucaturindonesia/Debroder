"use client";

export default function TrackOrderError({ reset }: { reset: () => void }) {
  return <main data-ui-system="canonical" className="debroder-storefront min-h-screen bg-brand-offWhite"><div data-ui-customer className="customer-area px-4 py-12"><div role="alert" className="customer-panel mx-auto max-w-xl border border-black/10 bg-white p-6 text-center sm:p-8"><h1 className="text-2xl font-semibold">Pelacakan belum dapat dibuka</h1><p className="mt-3 text-sm leading-6 text-black/60">Muat ulang halaman atau cari kembali menggunakan nomor pesanan Anda.</p><button type="button" onClick={reset} className="public-button public-button--primary mt-5">Coba Lagi</button></div></div></main>;
}
