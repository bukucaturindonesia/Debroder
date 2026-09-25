import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { brochureSite, brochureWhatsappUrl } from "@/src/config/site";

const navigation = [
  { label: "Beranda", href: "/" },
  { label: "Produk", href: "/produk" },
  { label: "Layanan", href: "/layanan" },
  { label: "Tentang", href: "/tentang" },
  { label: "Kontak", href: "/kontak" }
] as const;

export function BrochureShell({ children }: { children: ReactNode }) {
  const whatsapp = brochureWhatsappUrl();
  return (
    <div className="min-h-screen bg-[#f9f8f5] text-[#20211f] selection:bg-[#ded3bd]">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:bg-white focus:px-4 focus:py-3">Lewati ke konten</a>
      <header className="sticky top-0 z-50 border-b border-[#dfddd6] bg-[#f9f8f5]/95 backdrop-blur-sm">
        <div className="mx-auto flex h-[70px] max-w-[1440px] items-center justify-between gap-8 px-5 sm:px-8 lg:px-14">
          <Link href="/" aria-label="DEBRODER — Beranda" className="shrink-0 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#806b48]">
            <Image src="/debroder/logo-wordmark-black.svg" alt="DEBRODER" width={154} height={30} priority className="h-auto w-[138px] sm:w-[154px]" />
          </Link>
          <nav aria-label="Navigasi utama" className="hidden items-center gap-8 lg:flex">
            {navigation.map((item) => <Link key={item.href} href={item.href} className="text-[13px] font-medium tracking-[0.01em] text-[#454640] transition hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#806b48]">{item.label}</Link>)}
          </nav>
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="hidden min-h-10 items-center justify-center border border-[#262720] px-5 text-xs font-semibold uppercase tracking-[0.12em] transition hover:bg-[#20211f] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#806b48] sm:inline-flex">Konsultasi <span className="sr-only">(buka WhatsApp di tab baru)</span></a>
          <details className="group relative lg:hidden">
            <summary className="flex h-11 w-11 cursor-pointer list-none items-center justify-center border border-[#d6d4cd] text-[#20211f] [&::-webkit-details-marker]:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#806b48]" aria-label="Buka menu navigasi">
              <span className="flex w-5 flex-col gap-[5px]" aria-hidden="true"><span className="h-px w-full bg-current" /><span className="h-px w-full bg-current" /><span className="h-px w-full bg-current" /></span>
            </summary>
            <nav aria-label="Navigasi mobile" className="absolute right-0 top-[52px] w-[min(85vw,300px)] border border-[#dfddd6] bg-[#f9f8f5] p-5 shadow-[0_20px_40px_rgba(20,20,15,0.1)]">
              {navigation.map((item) => <Link key={item.href} href={item.href} className="block border-b border-[#e5e2da] py-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#806b48]">{item.label}</Link>)}
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="mt-5 flex min-h-11 items-center justify-center bg-[#20211f] px-4 text-xs font-semibold uppercase tracking-widest text-white">Konsultasi <span className="sr-only">(buka WhatsApp di tab baru)</span></a>
            </nav>
          </details>
        </div>
      </header>
      <main id="main-content">{children}</main>
      <footer className="border-t border-[#dfddd6] bg-[#f2f0eb]">
        <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-12 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr] lg:px-14 lg:py-14">
          <div><p className="text-xl font-semibold tracking-[-0.04em]">DEBRODER</p><p className="mt-3 max-w-xs text-sm leading-6 text-[#65655f]">Bahan dan produksi apparel untuk kebutuhan brand Anda.</p></div>
          <nav aria-label="Navigasi footer" className="grid grid-cols-2 gap-x-5 gap-y-2 text-sm md:grid-cols-1">
            {navigation.slice(1).map((item) => <Link key={item.href} href={item.href} className="w-fit underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#806b48]">{item.label}</Link>)}
          </nav>
          <div className="flex flex-col items-start gap-2 text-sm"><a href={`mailto:${brochureSite.email}`} className="underline-offset-4 hover:underline">{brochureSite.email}</a><a href={whatsapp} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">WhatsApp <span className="sr-only">(buka di tab baru)</span></a></div>
        </div>
        <div className="mx-auto max-w-[1440px] border-t border-[#dfddd6] px-5 py-5 text-xs text-[#77776f] sm:px-8 lg:px-14">© {new Date().getFullYear()} DEBRODER. All rights reserved.</div>
      </footer>
    </div>
  );
}
