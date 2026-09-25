import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BrochureShell } from "@/components/brochure/BrochureShell";
import { ConsultationSection, container, Eyebrow, ProductSection, ServiceSection } from "@/components/brochure/BrochureContent";
import { brochureWhatsappUrl } from "@/src/config/site";

export const metadata: Metadata = {
  title: "DEBRODER — Bahan & Produksi Apparel",
  description: "DEBRODER menyediakan bahan tekstil dan layanan produksi apparel, DTF, jersey, dan maklon sublim.",
  alternates: { canonical: "/" }
};

const portfolio = [
  { label: "Kaos", image: "/products/3600-soft-tee/primary.webp", alt: "Visual referensi kaos polos hitam" },
  { label: "Apparel", image: "/products/windbreaker/primary.webp", alt: "Visual referensi jaket windbreaker" },
  { label: "Polo", image: "/products/8100-polo/primary.webp", alt: "Visual referensi kaos polo" },
  { label: "Bahan & warna", image: "/product-images-source/KAOS POLOS/87-Sand.webp", alt: "Visual referensi bahan dan warna kaos" }
] as const;

export default function HomePage() {
  return <BrochureShell>
    <section className={`${container} grid min-h-[min(780px,90vh)] items-center gap-12 pb-16 pt-10 sm:pb-20 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16 lg:py-20`}>
      <div className="max-w-[650px]"><Eyebrow>Material & produksi apparel</Eyebrow><h1 className="mt-6 text-[clamp(3.3rem,6.7vw,7rem)] font-medium leading-[0.95] tracking-[-0.07em]">Bahan & Produksi untuk Brand Anda.</h1><p className="mt-7 max-w-[540px] text-base leading-8 text-[#62635d] sm:text-lg">Bahan berkualitas dan layanan produksi apparel untuk brand, komunitas, usaha, dan kebutuhan custom.</p><div className="mt-9 flex flex-wrap gap-3"><a href={brochureWhatsappUrl()} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center bg-[#20211f] px-6 text-sm font-semibold text-white transition hover:bg-[#44453e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#806b48]">Konsultasi Sekarang <span className="sr-only">(buka WhatsApp di tab baru)</span><span aria-hidden="true" className="ml-5">↗</span></a><Link href="/produk" className="inline-flex min-h-12 items-center justify-center border border-[#20211f] px-6 text-sm font-semibold transition hover:bg-[#ebe7dc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#806b48]">Lihat Produk</Link></div></div>
      <figure className="relative"><div className="relative aspect-[4/5] overflow-hidden bg-[#e8e7e2] lg:aspect-[0.91]"><Image src="/products/3600-soft-tee/primary.webp" alt="Visual referensi kaos polos untuk kebutuhan apparel" fill priority sizes="(max-width: 1024px) 100vw, 46vw" className="object-contain p-6 sm:p-10" /></div><figcaption className="mt-3 text-right text-[10px] uppercase tracking-[0.14em] text-[#85847d]">Visual referensi · foto brand menyusul</figcaption></figure>
    </section>
    <ProductSection />
    <ServiceSection />
    <section aria-labelledby="values-heading" className="border-t border-[#e2ded5] bg-[#f9f8f5] py-20 sm:py-24"><div className={container}><Eyebrow>Cara kami bekerja</Eyebrow><h2 id="values-heading" className="mt-4 text-[clamp(2.5rem,5vw,4.5rem)] font-medium tracking-[-0.055em]">Sederhana, dari awal.</h2><div className="mt-12 grid border-t border-[#cbc8be] md:grid-cols-3">{[{ title: "Bahan Berkualitas", copy: "Pilihan material yang sesuai dengan kebutuhan apparel Anda." }, { title: "Produksi Profesional", copy: "Proses produksi untuk membantu mewujudkan kebutuhan brand." }, { title: "Konsultasi Mudah", copy: "Mulai dari percakapan untuk menentukan langkah yang tepat." }].map((item, index) => <div key={item.title} className="border-b border-[#cbc8be] py-7 md:border-r md:px-8 md:first:pl-0 md:last:border-r-0"><span className="text-xs text-[#9a845f]">0{index + 1}</span><h3 className="mt-5 text-xl font-medium tracking-[-0.035em]">{item.title}</h3><p className="mt-3 max-w-xs text-sm leading-7 text-[#62635d]">{item.copy}</p></div>)}</div></div></section>
    <section aria-labelledby="portfolio-heading" className="bg-white py-20 sm:py-24 lg:py-28"><div className={container}><Eyebrow>Galeri visual</Eyebrow><div className="mt-4 flex flex-col justify-between gap-5 md:flex-row md:items-end"><h2 id="portfolio-heading" className="text-[clamp(2.5rem,5vw,4.5rem)] font-medium leading-none tracking-[-0.055em]">Hasil Produksi</h2><p className="max-w-sm text-sm leading-6 text-[#666761]">Visual berikut sementara sebagai referensi kategori. Foto hasil produksi DEBRODER akan ditambahkan setelah tersedia.</p></div><div className="mt-10 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">{portfolio.map((item) => <figure key={item.label}><div className="relative aspect-[3/4] bg-[#efeee9]"><Image src={item.image} alt={item.alt} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 24vw" className="object-contain p-3 sm:p-5" /></div><figcaption className="mt-3 text-sm font-medium">{item.label} <span className="block text-[11px] font-normal text-[#85847d]">Visual referensi</span></figcaption></figure>)}</div></div></section>
    <ConsultationSection />
  </BrochureShell>;
}
