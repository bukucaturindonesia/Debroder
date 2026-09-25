import type { Metadata } from "next";
import Link from "next/link";
import { BrochureShell } from "@/components/brochure/BrochureShell";
import { ConsultationSection, container, Eyebrow, PageIntro } from "@/components/brochure/BrochureContent";

export const metadata: Metadata = {
  title: "Tentang DEBRODER — Bahan & Produksi Apparel",
  description: "Kenali DEBRODER, partner bahan tekstil dan produksi apparel untuk brand, komunitas, dan usaha.",
  alternates: { canonical: "/tentang" }
};

export default function AboutPage() {
  return <BrochureShell><PageIntro eyebrow="Tentang kami" title="Dari bahan hingga produksi." description="DEBRODER hadir untuk membantu brand, komunitas, dan usaha menemukan bahan serta proses produksi apparel yang sesuai kebutuhan." /><section className="bg-white py-16 sm:py-20"><div className={`${container} grid gap-12 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20`}><Eyebrow>DEBRODER</Eyebrow><div><h2 className="max-w-2xl text-[clamp(2rem,4vw,3.5rem)] font-medium leading-[1.1] tracking-[-0.05em]">Satu percakapan yang tepat dapat menjadi awal produksi yang lebih baik.</h2><p className="mt-8 max-w-2xl text-base leading-8 text-[#62635d]">Kami menyediakan pilihan bahan dan layanan produksi apparel. Ceritakan kebutuhan Anda, lalu tim kami membantu mencari pilihan yang paling relevan. Informasi spesifikasi, ketersediaan, dan proses pesanan dikonfirmasi saat konsultasi.</p><Link href="/layanan" className="mt-8 inline-block border-b border-[#20211f] pb-1 text-sm font-semibold">Lihat layanan ↗</Link></div></div></section><ConsultationSection /></BrochureShell>;
}
