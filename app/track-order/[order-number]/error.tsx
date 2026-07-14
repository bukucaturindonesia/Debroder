"use client";

export default function TrackOrderError({ reset }: { reset: () => void }) {
  return <main className="min-h-screen bg-[#f6f5f0] px-4 py-20"><div className="mx-auto max-w-xl rounded-[28px] bg-white p-8 text-center"><h1 className="text-2xl font-semibold">Tracking belum dapat dibuka</h1><p className="mt-3 text-sm text-black/60">Coba muat ulang atau gunakan pencarian tracking.</p><button onClick={reset} className="mt-5 rounded-full bg-[#063d24] px-6 py-3 font-semibold text-white">Coba Lagi</button></div></main>;
}
