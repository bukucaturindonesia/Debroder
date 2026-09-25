import type { Metadata } from "next";
import { BrochureShell } from "@/components/brochure/BrochureShell";
import { container, Eyebrow, PageIntro } from "@/components/brochure/BrochureContent";
import { brochureSite, brochureWhatsappUrl } from "@/src/config/site";

export const metadata: Metadata = {
  title: "Kontak — DEBRODER",
  description: "Hubungi DEBRODER untuk konsultasi bahan tekstil dan produksi apparel melalui WhatsApp atau email.",
  alternates: { canonical: "/kontak" }
};

export default function ContactPage() {
  return <BrochureShell><PageIntro eyebrow="Mari bicara" title="Mulai dari kebutuhan Anda." description="Ceritakan bahan atau produksi apparel yang Anda cari. Tim kami siap membantu memilih langkah berikutnya." /><section className="bg-white py-16 sm:py-20"><div className={`${container} grid gap-10 md:grid-cols-2 md:gap-20`}><div className="border-t border-[#cbc8be] pt-6"><Eyebrow>Percakapan cepat</Eyebrow><h2 className="mt-5 text-3xl font-medium tracking-[-0.05em]">WhatsApp</h2><p className="mt-4 max-w-sm text-sm leading-7 text-[#62635d]">Untuk menanyakan bahan, layanan, atau rencana produksi Anda.</p><a href={brochureWhatsappUrl()} target="_blank" rel="noopener noreferrer" className="mt-7 inline-block border-b border-[#20211f] pb-1 text-sm font-semibold">Konsultasi via WhatsApp ↗ <span className="sr-only">(buka di tab baru)</span></a></div><div className="border-t border-[#cbc8be] pt-6"><Eyebrow>Surat elektronik</Eyebrow><h2 className="mt-5 text-3xl font-medium tracking-[-0.05em]">Email</h2><p className="mt-4 max-w-sm text-sm leading-7 text-[#62635d]">Untuk kebutuhan kerja sama atau informasi yang lebih rinci.</p><a href={`mailto:${brochureSite.email}`} className="mt-7 inline-block border-b border-[#20211f] pb-1 text-sm font-semibold">{brochureSite.email} ↗</a></div></div></section></BrochureShell>;
}
