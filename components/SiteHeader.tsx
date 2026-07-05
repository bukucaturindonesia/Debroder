"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { Logo } from "@/components/Logo";
import { contactLinks } from "@/lib/contact";
import { jacketTypeOptions, kaosTypeOptions } from "@/lib/product-taxonomy";
import { whatsappLinkWithMessage } from "@/lib/url";

const topbarItems = [
  { label: "Store", href: "/store" },
  { label: "Cara Order", href: "/cara-order" }
];

const navItems = [
  { label: "Koleksi", href: "/koleksi" },
  { label: "Kaos Polos", href: "/kaos-polos" },
  { label: "Jaket & Hoodie", href: "/jaket-hoodie" },
  { label: "Headwear", href: "/headwear" },
  { label: "Sablon DTF", href: "/sablon-dtf" },
  { label: "Jersey", href: "/jersey" }
];

const mobileNavItems = [...navItems, ...topbarItems];

type MegaMenuLink = {
  label: string;
  href: string;
  highlight?: boolean;
};

type MegaMenuColumn = {
  title: string;
  links: MegaMenuLink[];
};

const collectionMenu: MegaMenuColumn[] = [
  {
    title: "Koleksi",
    links: [
      { label: "Belanja Semua", href: "/koleksi", highlight: true },
      { label: "Best Seller", href: "/koleksi?label=best" },
      { label: "New", href: "/koleksi?label=new" },
      { label: "Popular", href: "/koleksi?sort=best-selling" },
      { label: "Turun Harga", href: "/koleksi?label=promo" }
    ]
  },
  {
    title: "Belanja Berdasarkan Produk",
    links: [
      { label: "Kaos Polos", href: "/kaos-polos" },
      { label: "Jaket & Hoodie", href: "/jaket-hoodie" },
      { label: "Headwear", href: "/headwear" },
      { label: "Sablon DTF", href: "/sablon-dtf" },
      { label: "Jersey Custom", href: "/jersey" },
      { label: "Maklon DTF", href: "/maklon-dtf" }
    ]
  },
  {
    title: "Belanja Berdasarkan Warna",
    links: [
      { label: "White", href: "/koleksi?color=white" },
      { label: "Black", href: "/koleksi?color=black" },
      { label: "Navy", href: "/koleksi?color=navy" },
      { label: "Forest Green", href: "/koleksi?color=forest-green" },
      { label: "Gold", href: "/koleksi?color=gold" }
    ]
  }
];

const colorLinks = [
  { label: "White", value: "white" },
  { label: "Black", value: "black" },
  { label: "Navy", value: "navy" },
  { label: "Forest Green", value: "forest-green" },
  { label: "Gold", value: "gold" }
];

const navMegaMenus: Record<string, MegaMenuColumn[]> = {
  Koleksi: collectionMenu,
  "Kaos Polos": [
    {
      title: "Kaos Polos",
      links: [
        { label: "Belanja Semua", href: "/kaos-polos", highlight: true },
        { label: "New", href: "/kaos-polos?label=new" },
        { label: "Best Seller", href: "/kaos-polos?label=best" },
        { label: "Promo", href: "/kaos-polos?label=promo" }
      ]
    },
    {
      title: "Tipe Kaos",
      links: kaosTypeOptions.map((item) => ({ label: item.label, href: `/kaos-polos?type=${item.value}` }))
    },
    {
      title: "Belanja Berdasarkan Warna",
      links: colorLinks.map((item) => ({ label: item.label, href: `/kaos-polos?color=${item.value}` }))
    }
  ],
  "Jaket & Hoodie": [
    {
      title: "Jaket & Hoodie",
      links: [
        { label: "Belanja Semua", href: "/jaket-hoodie", highlight: true },
        { label: "New", href: "/jaket-hoodie?label=new" },
        { label: "Best Seller", href: "/jaket-hoodie?label=best" },
        { label: "Promo", href: "/jaket-hoodie?label=promo" }
      ]
    },
    {
      title: "Tipe Jaket",
      links: jacketTypeOptions.map((item) => ({ label: item.label, href: `/jaket-hoodie?type=${item.value}` }))
    },
    {
      title: "Belanja Berdasarkan Warna",
      links: colorLinks.map((item) => ({ label: item.label, href: `/jaket-hoodie?color=${item.value}` }))
    }
  ]
};

const searchItems = [
  { title: "Kaos Polos", href: "/kaos-polos", description: "Kaos polos dan cotton combed premium.", keywords: ["kaos", "baju", "cotton combed"] },
  { title: "Jaket & Hoodie", href: "/jaket-hoodie", description: "Jaket dan hoodie untuk merchandise, komunitas, dan brand.", keywords: ["jaket", "jacket", "hoodie"] },
  { title: "Headwear", href: "/headwear", description: "Topi dan headwear untuk kebutuhan apparel custom.", keywords: ["headwear", "topi", "cap", "hat"] },
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

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
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

function MegaDropdown({ columns, scrolled }: { columns: MegaMenuColumn[]; scrolled: boolean }) {
  return (
    <div className={`invisible fixed left-1/2 z-[120] w-[min(980px,calc(100vw-32px))] -translate-x-1/2 translate-y-3 pt-4 opacity-0 transition duration-200 group-hover/nav:visible group-hover/nav:translate-y-0 group-hover/nav:opacity-100 group-focus-within/nav:visible group-focus-within/nav:translate-y-0 group-focus-within/nav:opacity-100 ${scrolled ? "top-[78px]" : "top-[114px]"}`}>
      <div className="grid grid-cols-3 gap-10 rounded-[28px] border border-black/10 bg-white p-9 text-left shadow-[0_18px_50px_rgba(0,0,0,0.14)]">
        {columns.map((column) => (
          <div key={column.title}>
            <p className="text-[15px] font-semibold text-[#111]">{column.title}</p>
            <div className="mt-5 grid gap-4">
              {column.links.map((link) => (
                <Link key={`${column.title}-${link.label}`} href={link.href} className={`text-[15px] leading-5 transition hover:text-[#0f5a36] ${link.highlight ? "font-semibold text-[#0f5a36]" : "font-medium text-black/58"}`}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
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
      <div className={`hidden overflow-hidden border-b border-black/[0.06] bg-[#f5f5ef] transition-[max-height,opacity,border-color] duration-300 ease-out lg:block ${scrolled ? "invisible max-h-0 border-transparent opacity-0 pointer-events-none" : "visible max-h-9 opacity-100"}`} aria-hidden={scrolled}>
        <div className="section-shell flex h-9 items-center justify-between gap-4 text-xs font-semibold text-black/58">
          <p className="truncate">DEBRODER apparel, sablon, dan produksi custom.</p>
          <div className="flex items-center gap-5">
            {topbarItems.map((item) => (
              <Link key={item.href} href={item.href} className={`transition hover:text-[#0f5a36] ${pathname === item.href ? "text-[#0f5a36]" : ""}`}>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
      <nav className="section-shell flex h-16 items-center justify-between gap-4 md:h-[78px]" aria-label="Navigasi utama">
        <Link href="/" className="shrink-0" aria-label="DEBRODER beranda">
          <Logo variant="primary-dark" size="sm" className="transition duration-200 hover:opacity-70" />
        </Link>

        <div className="hidden h-full items-center justify-center gap-4 lg:flex xl:gap-6">
          {navItems.map((item) => {
            const active = pathname === item.href;
            const megaMenu = navMegaMenus[item.label as keyof typeof navMegaMenus];
            if (megaMenu) {
              return (
                <div key={item.href} className="group/nav relative flex h-full items-center">
                  <Link href={item.href} className={`nav-link relative flex h-full items-center gap-1.5 whitespace-nowrap text-[15px] font-medium transition duration-200 hover:text-[#0f5a36] ${active ? "text-[#0f5a36]" : "text-[#111]"}`}>
                    {item.label}
                    <ChevronDownIcon />
                    <span className={`absolute inset-x-0 bottom-0 h-0.5 origin-center bg-[#0f5a36] transition-transform duration-200 ${active ? "scale-x-100" : "scale-x-0"}`} />
                  </Link>
                  <MegaDropdown columns={megaMenu} scrolled={scrolled} />
                </div>
              );
            }
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
          {mobileNavItems.map((item) => (
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
