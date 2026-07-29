import Link from "next/link";
import { PublicShell } from "@/components/PublicPage";
import { legalRequiredData, type LegalSection } from "@/lib/legal-content";

export function LegalDocumentPage({
  title,
  description,
  sections
}: {
  title: string;
  description: string;
  sections: LegalSection[];
}) {
  return (
    <PublicShell>
      <article className="legal-document-v2 bg-white text-[#111]">
        <header className="border-b border-[#e5e5e5] bg-[#f5f5f5] py-12 sm:py-16 lg:py-24">
          <div className="section-shell">
            <p className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-amber-950">
              Draft operasional · belum disetujui secara hukum
            </p>
            <h1 className="mt-5 max-w-5xl text-[clamp(2.8rem,7vw,6.5rem)] font-semibold leading-[0.92] tracking-[-0.045em]">
              {title}
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-black/65 sm:text-lg">{description}</p>
            <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm">
              <div><dt className="font-semibold">Versi</dt><dd className="mt-1 text-black/55">Draft 2.0</dd></div>
              <div><dt className="font-semibold">Tanggal dokumen sumber</dt><dd className="mt-1 text-black/55">23 Juli 2026</dd></div>
              <div><dt className="font-semibold">Status publikasi</dt><dd className="mt-1 text-black/55">Belum siap dipublikasikan sebagai kebijakan final</dd></div>
            </dl>
          </div>
        </header>

        <section className="border-b border-amber-200 bg-amber-50 py-8" aria-labelledby="legal-readiness-heading">
          <div className="section-shell">
            <h2 id="legal-readiness-heading" className="text-xl font-semibold">Data yang masih wajib diverifikasi</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-amber-950/75">
              Nilai berikut sengaja tidak diisi. Halaman ini tidak boleh berstatus legally approved sampai owner dan penasihat hukum yang kompeten menyelesaikan peninjauan.
            </p>
            <ul className="mt-5 grid gap-x-8 gap-y-2 text-sm text-amber-950 md:grid-cols-2">
              {legalRequiredData.map((item) => <li key={item} className="flex gap-2"><span aria-hidden="true">—</span>{item}</li>)}
            </ul>
          </div>
        </section>

        <div className="section-shell grid gap-10 py-12 lg:grid-cols-[260px_minmax(0,760px)] lg:justify-between lg:py-20">
          <aside className="lg:sticky lg:top-[calc(var(--public-header-height)+24px)] lg:self-start">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-black/50">Daftar isi</h2>
            <nav aria-label={`Daftar isi ${title}`} className="mt-4 grid max-h-[calc(100svh-140px)] gap-2 overflow-y-auto pr-3 text-sm">
              {sections.map((section) => (
                <a key={section.id} href={`#${section.id}`} className="leading-6 text-black/60 underline-offset-4 hover:text-black hover:underline focus-visible:text-black focus-visible:underline">
                  {section.title}
                </a>
              ))}
            </nav>
          </aside>

          <div className="min-w-0">
            <div className="mb-10 border-l-2 border-black pl-5 text-sm leading-7 text-black/65">
              <p>
                Konten berikut adalah draft informasi, bukan pendapat hukum atau jaminan kepatuhan. Setiap klausul harus direkonsiliasi dengan proses operasional dan sistem produksi sebelum publikasi final.
              </p>
            </div>
            {sections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-28 border-t border-[#e5e5e5] py-8 first:border-t-0 first:pt-0">
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{section.title}</h2>
                {section.paragraphs?.map((paragraph) => (
                  <p key={paragraph} className="mt-4 text-[15px] leading-8 text-black/65">{paragraph}</p>
                ))}
                {section.bullets?.length ? (
                  <ul className="mt-4 grid gap-3 pl-5 text-[15px] leading-7 text-black/65">
                    {section.bullets.map((item) => <li key={item} className="list-disc pl-1">{item}</li>)}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>
        </div>

        <footer className="border-t border-[#e5e5e5] bg-[#f5f5f5] py-10 sm:py-14">
          <div className="section-shell flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-semibold">Butuh bantuan mengenai transaksi?</h2>
              <p className="mt-2 text-sm leading-6 text-black/60">Gunakan kanal bantuan untuk informasi operasional yang saat ini berlaku.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/help" className="inline-flex min-h-12 items-center justify-center rounded-full bg-black px-6 text-sm font-semibold text-white">Pusat bantuan</Link>
              <Link href="/cara-order" className="inline-flex min-h-12 items-center justify-center rounded-full border border-black/20 px-6 text-sm font-semibold">Cara pemesanan</Link>
            </div>
          </div>
        </footer>
      </article>
    </PublicShell>
  );
}
