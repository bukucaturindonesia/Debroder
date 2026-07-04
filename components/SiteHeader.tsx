"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { Logo } from "@/components/Logo";
import { contactLinks } from "@/lib/contact";
import { whatsappLinkWithMessage } from "@/lib/url";

const navItems = [
  { label: "Koleksi", href: "/koleksi" },
  { label: "Kaos Polos", href: "/kaos-polos" },
  { label: "Sablon DTF", href: "/sablon-dtf" },
  { label: "Jersey", href: "/jersey" },
  { label: "Store", href: "/store" },
  { label: "Cara Order", href: "/cara-order" }
];

const searchItems = [
  { title: "Kaos Polos", href: "/kaos-polos", description: "Kaos polos dan cotton combed premium.", keywords: ["kaos", "baju", "cotton combed"] },
  { title: "Sablon DTF", href: "/sablon-dtf", description: "Sablon custom untuk brand, event, dan komunitas.", keywords: ["sablon", "dtf", "custom"] },
  { title: "Jersey", href: "/jersey", description: "Custom jersey untuk tim, komunitas, dan instansi.", keywords: ["jersey", "tim", "olahraga"] },
  { title: "Maklon DTF", href: "/maklon-dtf", description: "Partner produksi DTF untuk brand apparel.", keywords: ["maklon", "dtf", "produksi"] },
  { title: "Cetak Sublim", href: "/cetak-sublim", description: "Cetak sublim untuk jersey dan apparel custom.", keywords: ["sublim", "cetak"] },
  { title: "Store DEBRODER", href: "/store", description: "Pettarani, Tello, Landak, dan Parepare.", keywords: ["lokasi", "alamat", "store"] },
  { title: "Cara Order", href: "/cara-order", description: "Panduan pemesanan DEBRODER.", keywords: ["cara", "order", "pesan"] }
];

const whatsappUrl = whatsappLinkWithMessage(
  contactLinks.whatsapp,
  "Halo DEBRODER, saya ingin bertanya tentang layanan DEBRODER."
);

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" strokeLinecap="round" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M5.5 18.5 6.8 15A7.5 7.5 0 1 1 9 17.2l-3.5 1.3Z" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
    </svg>
  );
}

function SearchModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return searchItems.slice(0, 6);
    return searchItems.filter((item) =>
      [item.title, item.description, ...item.keywords].join(" ").toLowerCase().includes(normalized)
    );
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => inputRef.current?.focus(), 40);
    const handleKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) setQuery("");
  }, [isOpen]);

  if (!isOpen) return null;

  function openResult(href: string) {
    onClose();
    router.push(href);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && results[0]) {
      event.preventDefault();
      openResult(results[0].href);
    }
  }

  return (
    <div className="fixed inset-0 z-[110] bg-[#050706]/55 px-4 py-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Pencarian DEBRODER" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="mx-auto mt-14 max-w-2xl overflow-hidden rounded-lg bg-white">
        <div className="flex items-center gap-3 border-b border-black/10 p-4">
          <SearchIcon />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleInputKeyDown}
            aria-label="Cari layanan, produk, atau store"
            placeholder="Cari produk atau layanan"
            className="min-h-11 flex-1 bg-transparent text-base outline-none placeholder:text-black/40"
          />
          <button type="button" className="grid h-10 w-10 place-items-center rounded-full transition hover:bg-[#f3f3ef]" aria-label="Tutup pencarian" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        <div className="max-h-[55vh] overflow-y-auto p-3">
          {results.length ? (
            <div className="grid gap-1">
              {results.map((item) => (
                <button key={`${item.title}-${item.href}`} type="button" className="rounded-md p-4 text-left transition hover:bg-[#f5f5ef]" onClick={() => openResult(item.href)}>
                  <span className="text-base font-semibold">{item.title}</span>
                  <span className="mt-1 block text-sm leading-6 text-black/55">{item.description}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-md bg-[#f5f5ef] p-4 text-sm text-black/65">Tidak ada hasil. Coba kata kunci lain.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  return (
    <header className={`sticky top-0 z-[100] border-b bg-white/95 text-[#111] backdrop-blur-md transition duration-200 ${scrolled ? "border-black/10" : "border-black/[0.06]"}`}>
      <nav className="section-shell flex h-16 items-center justify-between gap-4 md:h-[78px]" aria-label="Navigasi utama">
        <Link href="/" className="shrink-0" aria-label="DEBRODER beranda">
          <Logo variant="primary-dark" size="sm" className="transition duration-200 hover:opacity-70" />
        </Link>

        <div className="hidden h-full items-center justify-center gap-6 lg:flex xl:gap-8">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className={`nav-link relative flex h-full items-center whitespace-nowrap text-[15px] font-medium transition duration-200 hover:text-[#0f5a36] ${active ? "text-[#0f5a36]" : "text-[#111]"}`}>
                {item.label}
                <span className={`absolute inset-x-0 bottom-0 h-0.5 origin-center bg-[#0f5a36] transition-transform duration-200 ${active ? "scale-x-100" : "scale-x-0"}`} />
              </Link>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <button type="button" className="hidden h-10 w-[150px] items-center gap-3 rounded-full bg-[#f5f5ef] px-4 text-left text-sm text-black/55 transition hover:text-black xl:flex" aria-label="Cari produk" onClick={() => setIsSearchOpen(true)}>
            <SearchIcon />
            <span>Cari</span>
          </button>
          <button type="button" className="grid h-10 w-10 place-items-center rounded-full transition hover:bg-[#f5f5ef] xl:hidden" aria-label="Cari" onClick={() => setIsSearchOpen(true)}>
            <SearchIcon />
          </button>
          <a href={whatsappUrl} className="grid h-10 w-10 place-items-center rounded-full transition hover:bg-[#f5f5ef]" aria-label="Hubungi WhatsApp DEBRODER" target="_blank" rel="noopener noreferrer">
            <ChatIcon />
          </a>
          <button type="button" className="relative grid h-10 w-10 place-items-center rounded-full transition hover:bg-[#f5f5ef] lg:hidden" aria-label={isOpen ? "Tutup menu" : "Buka menu"} aria-expanded={isOpen} onClick={() => setIsOpen((current) => !current)}>
            <span className="relative h-4 w-5" aria-hidden="true">
              <span className={`absolute left-0 h-px w-5 bg-current transition ${isOpen ? "top-2 rotate-45" : "top-0.5"}`} />
              <span className={`absolute left-0 top-2 h-px w-5 bg-current transition ${isOpen ? "opacity-0" : "opacity-100"}`} />
              <span className={`absolute left-0 h-px w-5 bg-current transition ${isOpen ? "top-2 -rotate-45" : "top-[15px]"}`} />
            </span>
          </button>
        </div>
      </nav>

      <div className={`absolute inset-x-0 top-full h-[calc(100dvh-4rem)] border-t border-black/10 bg-white transition-transform duration-500 ease-in-out md:h-[calc(100dvh-78px)] lg:hidden ${isOpen ? "visible translate-x-0" : "invisible translate-x-full"}`}>
        <div className="section-shell flex h-full flex-col overflow-y-auto py-6">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={`flex min-h-16 items-center justify-between border-b border-black/[0.08] text-[28px] font-semibold leading-tight transition hover:pl-1 ${pathname === item.href ? "text-[#0f5a36]" : "text-[#111]"}`}>
              <span>{item.label}</span><span className="text-2xl font-normal" aria-hidden="true">›</span>
            </Link>
          ))}
          <a href={whatsappUrl} className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-[#063d24] px-5 text-base font-semibold text-white" target="_blank" rel="noopener noreferrer">
            Konsultasi via WhatsApp
          </a>
        </div>
      </div>

      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </header>
  );
}
