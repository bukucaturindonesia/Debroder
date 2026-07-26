import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/PublicPage";

export const metadata: Metadata = {
  title: "Pusat Bantuan | DEBRODER",
  description: "Jalur bantuan untuk pemesanan, pelacakan, toko, dan kebutuhan custom DEBRODER.",
  alternates: { canonical: "/help" }
};

const helpPaths = [
  {
    title: "Cara Pemesanan",
    description: "Lihat alur pemesanan yang dipublikasikan DEBRODER.",
    href: "/cara-order"
  },
  {
    title: "Lacak Pesanan",
    description: "Periksa status order menggunakan data guest tracking.",
    href: "/track-order"
  },
  {
    title: "Lokasi Toko",
    description: "Lihat alamat, kontak, dan lokasi toko yang aktif.",
    href: "/store"
  },
  {
    title: "Pesanan Custom",
    description: "Mulai dari kategori dan builder custom yang tersedia.",
    href: "/custom"
  }
] as const;

export default async function HelpPage() {
  return (
    <PublicShell>
      <section className="bg-brand-offWhite py-12 sm:py-16 lg:py-20">
        <div className="section-shell">
          <p className="public-eyebrow">Bantuan</p>
          <h1 className="home-page-title mt-3">Apa yang ingin Anda lakukan?</h1>
          <p className="public-secondary-copy mt-4 max-w-2xl text-base leading-7">
            Pilih jalur resmi berikut agar informasi dan tindakan tetap terhubung ke sistem DEBRODER.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {helpPaths.map((item) => (
              <Link key={item.href} href={item.href} className="group border border-black/10 bg-white p-6 transition hover:border-black">
                <h2 className="text-xl font-semibold">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-black/60">{item.description}</p>
                <span className="mt-5 inline-flex text-sm font-semibold underline-offset-4 group-hover:underline">
                  Buka <span className="ml-2" aria-hidden="true">→</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
