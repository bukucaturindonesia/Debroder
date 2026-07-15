"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { BrandIcon } from "@/components/BrandIcon";
import { CartNavButton } from "@/components/CartProvider";
import { Logo } from "@/components/Logo";
import { contactLinks } from "@/lib/contact";
import { jacketTypeOptions, kaosTypeOptions } from "@/lib/product-taxonomy";
import type { PublicNavigationFacets } from "@/lib/public-navigation";
import { whatsappLinkWithMessage } from "@/lib/url";

const topbarItems = [
  { label: "Store", href: "/store" },
  { label: "Cara Order", href: "/cara-order" },
  { label: "Lacak Pesanan", href: "/track-order" }
];

const navItems = [
  { label: "Koleksi", href: "/koleksi" },
  { label: "Kaos Polos", href: "/kaos-polos" },
  { label: "Jaket & Hoodie", href: "/jaket-hoodie" },
  { label: "Headwear", href: "/headwear" },
  { label: "Sablon DTF", href: "/sablon-dtf" },
  { label: "Jersey", href: "/jersey" }
];

type MegaMenuLink = {
  label: string;
  href: string;
  highlight?: boolean;
};

type MegaMenuColumn = {
  title: string;
  links: MegaMenuLink[];
};

const legacyCollectionMenu: MegaMenuColumn[] = [
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
      { label: "Jersey Custom", href: "/jersey" },
      { label: "Jaket & Hoodie", href: "/jaket-hoodie" },
      { label: "Kemeja", href: "/kemeja" },
      { label: "Headwear", href: "/headwear" },
      { label: "Sablon DTF", href: "/sablon-dtf" },
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

const legacyNavMegaMenus: Record<string, MegaMenuColumn[]> = {
  Koleksi: legacyCollectionMenu,
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

const emptyNavigationFacets: PublicNavigationFacets = {
  colors: [],
  categoryColors: { "kaos-polos": [], "jaket-hoodie": [] },
  categories: [],
  availability: { readyStock: false, custom: false, hybrid: false },
  collections: { new: false, best: false, popular: false, promo: false }
};

function buildCollectionMenu(facets: PublicNavigationFacets): MegaMenuColumn[] {
  const curated = [
    { visible: facets.collections.new, label: "Produk Baru", href: "/koleksi?label=new" },
    { visible: facets.collections.best, label: "Best Seller", href: "/koleksi?label=best" },
    { visible: facets.collections.popular, label: "Popular", href: "/koleksi?sort=best-selling" },
    { visible: facets.collections.promo, label: "Turun Harga", href: "/koleksi?label=promo" }
  ].filter((item) => item.visible).map(({ label, href }) => ({ label, href }));
  const availability = [
    { visible: facets.availability.readyStock, label: "Ready Stock", href: "/koleksi?status=ready-stock" },
    { visible: facets.availability.custom, label: "Custom", href: "/koleksi?status=custom" },
    { visible: facets.availability.hybrid, label: "Ready Stock + Custom", href: "/koleksi?status=hybrid" }
  ].filter((item) => item.visible).map(({ label, href }) => ({ label, href }));

  return [
    {
      title: "Koleksi",
      links: [{ label: "Belanja Semua", href: "/koleksi", highlight: true }, ...curated]
    },
    facets.categories.length ? { title: "Belanja Berdasarkan Produk", links: facets.categories } : null,
    facets.colors.length ? {
      title: "Belanja Berdasarkan Warna",
      links: facets.colors.map((color) => ({ label: color.label, href: `/koleksi?color=${color.value}` }))
    } : null,
    availability.length ? { title: "Ketersediaan", links: availability } : null
  ].filter((column): column is MegaMenuColumn => Boolean(column));
}

function buildCategoryMenu(
  label: "Kaos Polos" | "Jaket & Hoodie",
  route: "/kaos-polos" | "/jaket-hoodie",
  facets: PublicNavigationFacets
): MegaMenuColumn[] {
  const routeKey = route.slice(1) as "kaos-polos" | "jaket-hoodie";
  const typeOptions = routeKey === "kaos-polos" ? kaosTypeOptions : jacketTypeOptions;
  return [
    {
      title: label,
      links: [
        { label: "Belanja Semua", href: route, highlight: true },
        { label: "Produk Baru", href: `${route}?label=new` },
        { label: "Best Seller", href: `${route}?label=best` },
        { label: "Promo", href: `${route}?label=promo` }
      ]
    },
    {
      title: routeKey === "kaos-polos" ? "Tipe Kaos" : "Tipe Jaket",
      links: typeOptions.map((item) => ({ label: item.label, href: `${route}?type=${item.value}` }))
    },
    facets.categoryColors[routeKey].length ? {
      title: "Belanja Berdasarkan Warna",
      links: facets.categoryColors[routeKey].map((color) => ({ label: color.label, href: `${route}?color=${color.value}` }))
    } : null
  ].filter((column): column is MegaMenuColumn => Boolean(column));
}

const searchItems = [
  { title: "Kaos Polos", href: "/kaos-polos", description: "Kaos polos, cotton combed, kaos anak, lengan panjang, dan Polo Shirt NSA.", keywords: ["kaos", "baju", "cotton combed", "polo", "polo shirt nsa"] },
  { title: "Jersey", href: "/jersey", description: "Custom jersey untuk tim, komunitas, dan instansi.", keywords: ["jersey", "tim", "olahraga"] },
  { title: "Jaket & Hoodie", href: "/jaket-hoodie", description: "Jaket dan hoodie untuk merchandise, komunitas, dan brand.", keywords: ["jaket", "jacket", "hoodie"] },
  { title: "Kemeja", href: "/kemeja", description: "Kemeja custom untuk kantor, komunitas, dan seragam.", keywords: ["kemeja", "pdh", "pdl", "seragam"] },
  { title: "Headwear", href: "/headwear", description: "Topi dan headwear untuk kebutuhan apparel custom.", keywords: ["headwear", "topi", "cap", "hat"] },
  { title: "Sablon DTF", href: "/sablon-dtf", description: "Sablon custom untuk brand, event, dan komunitas.", keywords: ["sablon", "dtf", "custom"] },
  { title: "Maklon DTF", href: "/maklon-dtf", description: "Partner produksi DTF untuk brand apparel.", keywords: ["maklon", "dtf", "produksi"] },
  { title: "Cetak Sublim", href: "/cetak-sublim", description: "Cetak sublim untuk jersey dan apparel custom.", keywords: ["sublim", "cetak"] },
  { title: "Store DEBRODER", href: "/store", description: "Pettarani, Tello, Landak, dan Parepare.", keywords: ["lokasi", "alamat", "store"] },
  { title: "Cara Order", href: "/cara-order", description: "Panduan pemesanan DEBRODER.", keywords: ["cara", "order", "pesan"] },
  { title: "Lacak Pesanan", href: "/track-order", description: "Periksa status order tanpa perlu login.", keywords: ["lacak", "tracking", "status", "order", "pesanan"] },
  { title: "Keranjang Belanja", href: "/keranjang", description: "Cek pesanan utama, layanan tambahan, estimasi normal, dan kirim ke WhatsApp.", keywords: ["keranjang", "cart", "pesanan", "whatsapp"] }
];

const whatsappUrl = whatsappLinkWithMessage(
  contactLinks.whatsapp,
  "Halo DEBRODER, saya ingin bertanya tentang layanan DEBRODER."
);

function SearchIcon() {
  return <BrandIcon name="search" />;
}

function ChatIcon() {
  return <BrandIcon name="whatsapp" />;
}

function ChevronDownIcon() {
  return <BrandIcon name="chevronDown" className="h-3.5 w-3.5" />;
}

function CloseIcon() {
  return <BrandIcon name="close" />;
}

function MegaDropdown({
  columns,
  expanded,
  id,
  open,
  preserveJerseyOutput = false,
  onNavigate
}: {
  columns: MegaMenuColumn[];
  expanded: boolean;
  id?: string;
  open?: boolean;
  preserveJerseyOutput?: boolean;
  onNavigate?: () => void;
}) {
  const controlledClass = open
    ? "visible translate-y-0 opacity-100"
    : "invisible pointer-events-none translate-y-2 opacity-0";
  const legacyClass = "invisible translate-y-2 opacity-0 group-hover/nav:visible group-hover/nav:translate-y-0 group-hover/nav:opacity-100 group-focus-within/nav:visible group-focus-within/nav:translate-y-0 group-focus-within/nav:opacity-100";
  return (
    <div id={id} className={`fixed left-1/2 z-[120] -translate-x-1/2 pt-3 transition duration-200 ${preserveJerseyOutput ? "w-[min(980px,calc(100vw-32px))]" : "w-[min(1180px,calc(100vw-32px))]"} ${open === undefined ? legacyClass : controlledClass} ${expanded ? "top-[164px]" : "top-[78px]"}`}>
      <div className={preserveJerseyOutput
        ? "grid border border-black/10 bg-white text-left shadow-[0_18px_50px_rgba(0,0,0,0.12)] grid-cols-3 gap-10 p-9"
        : `grid gap-8 bg-white p-8 text-left shadow-[0_16px_40px_rgba(0,0,0,0.08)] ${columns.length >= 4 ? "grid-cols-4" : columns.length === 2 ? "grid-cols-2" : "grid-cols-3"}`
      }>
        {columns.map((column) => (
          <div key={column.title}>
            <p className="text-[15px] font-semibold text-[#111]">{column.title}</p>
            <div className="mt-5 grid gap-4">
              {column.links.map((link) => (
                <Link key={`${column.title}-${link.label}`} href={link.href} onClick={onNavigate} className={`text-[15px] leading-5 underline-offset-4 transition ${preserveJerseyOutput ? `hover:text-[#0f5a36] ${link.highlight ? "font-semibold text-[#0f5a36]" : "font-medium text-black/58"}` : `${link.highlight ? "font-semibold text-black" : "font-medium text-black/60"} hover:text-black hover:underline focus-visible:text-black focus-visible:underline`}`}>
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
                <button key={`${item.title}-${item.href}`} type="button" className="rounded-md p-4 text-left transition hover:bg-brand-offWhite" onClick={() => openResult(item.href)}>
                  <span className="text-base font-semibold">{item.title}</span>
                  <span className="mt-1 block text-sm leading-6 text-black/55">{item.description}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-md bg-brand-offWhite p-4 text-sm text-black/65">Tidak ada hasil. Coba kata kunci lain.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function SiteHeader({
  positionMode = "sticky",
  expandedAtTop = false,
  navigationFacets = emptyNavigationFacets,
  preserveJerseyOutput = false
}: {
  positionMode?: "sticky" | "natural";
  expandedAtTop?: boolean;
  navigationFacets?: PublicNavigationFacets;
  preserveJerseyOutput?: boolean;
}) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [desktopCollectionOpen, setDesktopCollectionOpen] = useState(false);
  const [mobileCollectionOpen, setMobileCollectionOpen] = useState(false);
  const [expanded, setExpanded] = useState(expandedAtTop);
  const hasLeftTopRef = useRef(false);
  const headerRef = useRef<HTMLElement>(null);
  const collectionTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const collectionMenu = useMemo(() => buildCollectionMenu(navigationFacets), [navigationFacets]);
  const currentMegaMenus = useMemo<Record<string, MegaMenuColumn[]>>(() => preserveJerseyOutput ? legacyNavMegaMenus : {
    "Kaos Polos": buildCategoryMenu("Kaos Polos", "/kaos-polos", navigationFacets),
    "Jaket & Hoodie": buildCategoryMenu("Jaket & Hoodie", "/jaket-hoodie", navigationFacets)
  }, [navigationFacets, preserveJerseyOutput]);

  useEffect(() => {
    if (positionMode === "natural" && expandedAtTop) return;
    let frame = 0;

    const handleScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;

        if (y > 24) {
          hasLeftTopRef.current = true;
          setExpanded(false);
          return;
        }

        if (y <= 1 && hasLeftTopRef.current) {
          setExpanded(true);
          return;
        }

        if (y > 1) setExpanded(false);
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [expandedAtTop, positionMode]);

  useEffect(() => {
    setIsOpen(false);
    setDesktopCollectionOpen(false);
    setMobileCollectionOpen(false);
    setExpanded(expandedAtTop);
    hasLeftTopRef.current = false;
  }, [expandedAtTop, pathname]);

  useEffect(() => {
    if (preserveJerseyOutput || !desktopCollectionOpen) return;
    const closeOnOutsideInteraction = (event: MouseEvent | TouchEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setDesktopCollectionOpen(false);
    };
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (preserveJerseyOutput) return;
      if (event.key !== "Escape") return;
      setDesktopCollectionOpen(false);
      collectionTriggerRef.current?.focus();
    };
    document.addEventListener("mousedown", closeOnOutsideInteraction);
    document.addEventListener("touchstart", closeOnOutsideInteraction, { passive: true });
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideInteraction);
      document.removeEventListener("touchstart", closeOnOutsideInteraction);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [desktopCollectionOpen, preserveJerseyOutput]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsOpen(false);
      mobileMenuTriggerRef.current?.focus();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, preserveJerseyOutput]);

  return (
    <header ref={headerRef} className={preserveJerseyOutput
      ? `${positionMode === "sticky" ? "sticky top-0" : "relative"} z-[100] border-b border-black/10 bg-white text-[#111]`
      : `${positionMode === "sticky" ? "sticky top-0" : "relative"} z-[100] bg-white text-[#111]`
    }>
      <div className={`hidden overflow-hidden bg-[#f5f5f5] transition-[max-height,opacity] duration-200 ease-out lg:block ${expanded ? "visible max-h-8 opacity-100" : "invisible max-h-0 opacity-0 pointer-events-none"}`} aria-hidden={!expanded}>
        <div className="section-shell flex h-8 items-center justify-between gap-4 text-[12px] font-medium text-black/65">
          <p className="truncate">DEBRODER Apparel & Printing</p>
          <div className="flex items-center gap-5">
            {topbarItems.map((item) => (
              <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined} className={`underline-offset-4 transition ${preserveJerseyOutput ? `hover:text-[#0f5a36] ${pathname === item.href ? "text-[#0f5a36]" : ""}` : `${pathname === item.href ? "font-semibold text-black underline" : ""} hover:text-black hover:underline focus-visible:text-black focus-visible:underline`}`}>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
      <nav className="section-shell flex h-16 items-center justify-between gap-4 bg-white md:h-[78px]" aria-label="Navigasi utama">
        <Link href="/" className="shrink-0" aria-label="DEBRODER beranda">
          <Logo variant="primary-dark" size="sm" className="transition duration-200 hover:opacity-70" />
        </Link>

        <div className="hidden h-full items-center justify-center gap-3 lg:flex xl:gap-5">
          {navItems.map((item) => {
            const active = pathname === item.href;
            const megaMenu = currentMegaMenus[item.label as keyof typeof currentMegaMenus];
            if (!preserveJerseyOutput && item.label === "Koleksi") {
              return (
                <div
                  key={item.href}
                  className="relative flex h-full items-center"
                  onMouseEnter={() => setDesktopCollectionOpen(true)}
                  onMouseLeave={() => setDesktopCollectionOpen(false)}
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDesktopCollectionOpen(false);
                  }}
                >
                  <button
                    ref={collectionTriggerRef}
                    type="button"
                    aria-expanded={desktopCollectionOpen}
                    aria-controls="global-collection-menu"
                    aria-current={active ? "page" : undefined}
                    onClick={() => setDesktopCollectionOpen((current) => !current)}
                    className={`nav-link relative flex h-full items-center gap-1.5 whitespace-nowrap text-[15px] font-medium text-[#111] transition duration-200 hover:bg-black hover:text-white focus-visible:bg-black focus-visible:text-white ${active ? "font-semibold" : ""}`}
                  >
                    {item.label}
                    <span className={`transition-transform duration-200 ${desktopCollectionOpen ? "rotate-180" : ""}`}><ChevronDownIcon /></span>
                    <span className={`absolute inset-x-0 bottom-0 h-0.5 origin-center bg-black transition-transform duration-200 ${active || desktopCollectionOpen ? "scale-x-100" : "scale-x-0"}`} />
                  </button>
                  <MegaDropdown id="global-collection-menu" columns={collectionMenu} expanded={expanded} open={desktopCollectionOpen} onNavigate={() => setDesktopCollectionOpen(false)} />
                </div>
              );
            }
            if (megaMenu) {
              return (
                <div key={item.href} className="group/nav relative flex h-full items-center">
                  <Link href={item.href} aria-current={active ? "page" : undefined} className={`nav-link relative flex h-full items-center whitespace-nowrap text-sm font-medium transition duration-200 xl:text-[15px] ${preserveJerseyOutput ? `gap-1.5 hover:text-[#0f5a36] ${active ? "text-[#0f5a36]" : "text-[#111]"}` : `text-[#111] hover:bg-black hover:text-white focus-visible:bg-black focus-visible:text-white ${active ? "font-semibold" : ""}`}`}>
                    {item.label}
                    {preserveJerseyOutput ? <ChevronDownIcon /> : null}
                    <span className={`absolute inset-x-0 bottom-0 h-0.5 origin-center transition-transform duration-200 ${preserveJerseyOutput ? "bg-[#0f5a36]" : "bg-black"} ${active ? "scale-x-100" : "scale-x-0"}`} />
                  </Link>
                  <MegaDropdown columns={megaMenu} expanded={expanded} preserveJerseyOutput={preserveJerseyOutput} />
                </div>
              );
            }
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`nav-link relative flex h-full items-center whitespace-nowrap text-sm font-medium transition duration-200 xl:text-[15px] ${preserveJerseyOutput ? `hover:text-[#0f5a36] ${active ? "text-[#0f5a36]" : "text-[#111]"}` : `text-[#111] hover:bg-black hover:text-white focus-visible:bg-black focus-visible:text-white ${active ? "font-semibold" : ""}`}`}>
                {item.label}
                <span className={`absolute inset-x-0 bottom-0 h-0.5 origin-center transition-transform duration-200 ${preserveJerseyOutput ? "bg-[#0f5a36]" : "bg-black"} ${active ? "scale-x-100" : "scale-x-0"}`} />
              </Link>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <button type="button" className="hidden h-10 w-32 items-center gap-3 rounded-full bg-[#f5f5f5] px-4 text-left text-sm font-medium text-black/55 transition hover:text-black xl:flex" aria-label="Cari produk" onClick={() => setIsSearchOpen(true)}>
            <SearchIcon />
            <span>Cari</span>
          </button>
          <button type="button" className="grid h-10 w-10 place-items-center rounded-full transition hover:bg-[#f5f5f5] xl:hidden" aria-label="Cari" onClick={() => setIsSearchOpen(true)}>
            <SearchIcon />
          </button>
          <a href={whatsappUrl} className="hidden h-10 w-10 place-items-center rounded-full transition hover:bg-[#f5f5f5] sm:grid" aria-label="Hubungi WhatsApp DEBRODER" target="_blank" rel="noopener noreferrer">
            <ChatIcon />
          </a>
          <CartNavButton />
          <button ref={mobileMenuTriggerRef} type="button" className="relative grid h-10 w-10 place-items-center rounded-full transition hover:bg-[#f5f5f5] lg:hidden" aria-label={isOpen ? "Tutup menu" : "Buka menu"} aria-expanded={isOpen} aria-controls="global-mobile-navigation" onClick={() => setIsOpen((current) => !current)}>
            <BrandIcon name={isOpen ? "close" : "menu"} />
          </button>
        </div>
      </nav>

      <div className={`hidden overflow-hidden bg-[#f5f5f5] text-center transition-[max-height,opacity] duration-200 ease-out lg:block ${expanded ? "visible max-h-[54px] opacity-100" : "invisible max-h-0 opacity-0 pointer-events-none"}`} aria-hidden={!expanded}>
        <div className="flex h-[54px] flex-col items-center justify-center leading-tight">
          <p className="text-[15px] font-medium">Konsultasi desain gratis untuk kebutuhan apparel custom</p>
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="mt-1 text-xs font-semibold underline underline-offset-2 hover:no-underline">Hubungi WhatsApp</a>
        </div>
      </div>

      <div id="global-mobile-navigation" aria-hidden={!isOpen} inert={!isOpen} className={`absolute inset-x-0 top-full h-[calc(100dvh-4rem)] bg-white transition-transform duration-300 ease-out md:h-[calc(100dvh-78px)] lg:hidden ${isOpen ? "visible translate-x-0" : "invisible pointer-events-none translate-x-full"}`}>
        <div className="section-shell flex h-full flex-col overflow-y-auto py-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-black/45">Belanja</p>
          {navItems.map((item) => {
            const active = pathname === item.href;
            if (!preserveJerseyOutput && item.label === "Koleksi") {
              return <div key={item.href} className="border-b border-black/10">
                <button
                  type="button"
                  aria-expanded={mobileCollectionOpen}
                  aria-controls="mobile-collection-menu"
                  onClick={() => setMobileCollectionOpen((current) => !current)}
                  className={`flex min-h-14 w-full items-center justify-between text-left text-2xl font-semibold leading-tight text-[#111] transition active:bg-black active:text-white ${active ? "underline underline-offset-8" : ""}`}
                >
                  <span>{item.label}</span>
                  <span className={`transition-transform duration-200 ${mobileCollectionOpen ? "rotate-180" : ""}`}><ChevronDownIcon /></span>
                </button>
                <div id="mobile-collection-menu" className={`${mobileCollectionOpen ? "grid" : "hidden"} gap-5 bg-[#f5f5f5] px-4 py-5`}>
                  {collectionMenu.map((column) => <div key={column.title}>
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-black/45">{column.title}</p>
                    <div className="mt-2 grid">
                      {column.links.map((link) => <Link key={`${column.title}-${link.label}`} href={link.href} onClick={() => setIsOpen(false)} className="flex min-h-11 items-center text-sm font-medium text-black underline-offset-4 active:bg-black active:text-white focus-visible:bg-black focus-visible:text-white">{link.label}</Link>)}
                    </div>
                  </div>)}
                </div>
              </div>;
            }
            return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`flex min-h-14 items-center justify-between text-2xl font-semibold leading-tight transition ${preserveJerseyOutput ? `hover:pl-1 ${active ? "text-[#0f5a36]" : "text-[#111]"}` : `text-[#111] active:bg-black active:text-white focus-visible:bg-black focus-visible:text-white ${active ? "underline underline-offset-8" : ""}`}`}>
              <span>{item.label}</span><span className="text-2xl font-normal" aria-hidden="true">›</span>
            </Link>;
          })}
          <div className="mt-5 border-t border-black/10 pt-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-black/45">Bantuan</p>
            {topbarItems.map((item) => (
              <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined} className={`flex min-h-12 items-center justify-between text-base font-medium transition ${preserveJerseyOutput ? `hover:text-[#0f5a36] ${pathname === item.href ? "text-[#0f5a36]" : "text-[#111]"}` : `text-[#111] active:bg-black active:text-white focus-visible:bg-black focus-visible:text-white ${pathname === item.href ? "underline underline-offset-8" : ""}`}`}>
                <span>{item.label}</span><span aria-hidden="true">›</span>
              </Link>
            ))}
          </div>
          <a href={whatsappUrl} className={`mt-6 inline-flex min-h-12 items-center justify-center rounded-full px-5 text-base font-semibold text-white ${preserveJerseyOutput ? "bg-[#063d24]" : "bg-black hover:bg-black/75"}`} target="_blank" rel="noopener noreferrer">
            Konsultasi via WhatsApp
          </a>
        </div>
      </div>

      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </header>
  );
}
