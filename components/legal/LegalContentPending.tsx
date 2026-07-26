import Link from "next/link";
import { PublicShell } from "@/components/PublicPage";

export function LegalContentPending({ title }: { title: string }) {
  return (
    <PublicShell>
      <section className="bg-brand-offWhite py-20 sm:py-28">
        <div className="section-shell">
          <article className="mx-auto max-w-3xl bg-white p-7 sm:p-10">
            <p className="public-eyebrow">Informasi legal</p>
            <h1 className="mt-3 text-3xl font-semibold sm:text-5xl">{title}</h1>
            <div className="mt-7 border-l-2 border-black pl-5 text-sm leading-7 text-black/65">
              <p>Konten legal resmi belum tersedia pada sumber konten publik DEBRODER.</p>
              <p className="mt-3">Halaman ini tidak membuat ketentuan baru. Hubungi DEBRODER untuk memperoleh informasi yang berlaku sebelum membuat keputusan transaksi.</p>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/help" className="inline-flex min-h-12 items-center justify-center rounded-full bg-black px-6 text-sm font-semibold text-white">
                Pusat bantuan
              </Link>
              <Link href="/cara-order" className="inline-flex min-h-12 items-center justify-center rounded-full border border-black/15 px-6 text-sm font-semibold">
                Cara pemesanan
              </Link>
            </div>
          </article>
        </div>
      </section>
    </PublicShell>
  );
}
