import Image from "next/image";
import Link from "next/link";
import { brochureWhatsappUrl } from "@/src/config/site";
import { brochureProducts } from "@/src/data/products";
import { brochureServices } from "@/src/data/services";

export const container = "mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-14";

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8e7754]">{children}</p>;
}

export function PageIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className={`${container} pb-10 pt-16 sm:pb-14 sm:pt-24 lg:pt-28`}><Eyebrow>{eyebrow}</Eyebrow><h1 className="mt-5 max-w-[950px] text-[clamp(3rem,7vw,6.5rem)] font-medium leading-[0.96] tracking-[-0.065em]">{title}</h1><p className="mt-7 max-w-[610px] text-base leading-8 text-[#62635d] sm:text-lg">{description}</p></div>;
}

export function ProductSection({ fullPage = false }: { fullPage?: boolean }) {
  return <section aria-labelledby="brochure-products-title" className="border-t border-[#e4e1d9] bg-[#f9f8f5] py-20 sm:py-24 lg:py-28"><div className={container}>
    <div className="mb-9 flex flex-col justify-between gap-5 sm:mb-12 md:flex-row md:items-end"><div><Eyebrow>Material pilihan</Eyebrow><h2 id="brochure-products-title" className="mt-4 text-[clamp(2.5rem,5vw,4.5rem)] font-medium leading-none tracking-[-0.055em]">Produk</h2><p className="mt-5 text-base text-[#62635d]">Pilihan bahan untuk kebutuhan produksi Anda.</p></div>{!fullPage && <Link href="/produk" className="w-fit border-b border-[#20211f] pb-1 text-sm font-semibold">Semua produk ↗</Link>}</div>
    <div className="grid gap-6 md:grid-cols-2 lg:gap-8">{brochureProducts.map((product, index) => <article key={product.slug} className="group"><Link href={`/produk/${product.slug}`} className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#806b48]"><div className={`relative aspect-[5/4] overflow-hidden ${index === 0 ? "bg-[#e8e7e2]" : "bg-[#ebe9e3]"}`}><Image src={product.image} alt={product.imageAlt} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-contain p-7 transition duration-500 group-hover:scale-[1.025] sm:p-10" /></div><span className="mt-3 block text-[10px] uppercase tracking-[0.14em] text-[#85847d]">Visual referensi · foto produk menyusul</span><div className="mt-5 flex items-start justify-between gap-5"><div><h3 className="text-2xl font-medium tracking-[-0.04em] sm:text-[28px]">{product.name}</h3><p className="mt-3 max-w-md text-sm leading-7 text-[#666761]">{product.description}</p></div><span aria-hidden="true" className="text-xl">↗</span></div><span className="mt-5 inline-block border-b border-[#20211f] pb-1 text-sm font-semibold">Lihat Detail</span></Link></article>)}</div>
  </div></section>;
}

export function ServiceSection({ fullPage = false }: { fullPage?: boolean }) {
  return <section aria-labelledby="brochure-services-title" className="bg-[#f2f0eb] py-20 sm:py-24 lg:py-28"><div className={container}><div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24"><div><Eyebrow>Dari ide ke hasil</Eyebrow><h2 id="brochure-services-title" className="mt-4 text-[clamp(2.5rem,5vw,4.5rem)] font-medium leading-none tracking-[-0.055em]">Layanan</h2><p className="mt-6 max-w-sm text-base leading-8 text-[#62635d]">Produksi yang fleksibel untuk kebutuhan brand Anda.</p>{!fullPage && <Link href="/layanan" className="mt-8 inline-block border-b border-[#20211f] pb-1 text-sm font-semibold">Jelajahi layanan ↗</Link>}</div><div className="border-t border-[#cbc8be]">{brochureServices.map((service) => <div key={service.name} className="grid gap-3 border-b border-[#cbc8be] py-7 sm:grid-cols-[50px_1fr] sm:gap-5 sm:py-8"><span className="text-xs font-medium text-[#9a845f]">{service.index}</span><div><h3 className="text-[26px] font-medium tracking-[-0.045em] sm:text-3xl">{service.name}</h3><p className="mt-3 max-w-lg text-sm leading-7 text-[#62635d]">{service.description}</p></div></div>)}</div></div></div></section>;
}

export function ConsultationSection() {
  return <section className="bg-[#dbd3c4] py-20 sm:py-24"><div className={`${container} flex flex-col items-start justify-between gap-9 lg:flex-row lg:items-end`}><div><Eyebrow>Mulai percakapan</Eyebrow><h2 className="mt-4 max-w-2xl text-[clamp(2.6rem,5.4vw,5.2rem)] font-medium leading-[0.99] tracking-[-0.06em]">Punya kebutuhan produksi?</h2><p className="mt-6 max-w-lg text-base leading-8 text-[#4c4c46]">Ceritakan kebutuhan Anda. Kami bantu memilih bahan dan proses produksi yang sesuai.</p></div><a href={brochureWhatsappUrl()} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 shrink-0 items-center justify-center bg-[#20211f] px-7 text-sm font-semibold text-white transition hover:bg-[#42433d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#20211f]">Konsultasi via WhatsApp <span className="sr-only">(buka di tab baru)</span><span aria-hidden="true" className="ml-6">↗</span></a></div></section>;
}
