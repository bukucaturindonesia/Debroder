"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { BrandIcon } from "@/components/BrandIcon";
import { CartNavButton } from "@/components/CartProvider";
import { Logo } from "@/components/Logo";
import { jacketTypeOptions, kaosTypeOptions } from "@/lib/product-taxonomy";
import type { PublicNavigationFacets } from "@/lib/public-navigation";

const HeaderSearchModal = dynamic(
  () => import("@/components/header/HeaderSearchModal").then((module) => module.HeaderSearchModal),
  { ssr: false }
);

const topbarItems = [
  { label: "Fresh Drop", href: "/fresh-drop" },
  { label: "Toko", href: "/store" },
  { label: "Cara Pemesanan", href: "/cara-order" },
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

const publicNavItems = [
  ...navItems.slice(0, -1),
  { label: "Custom", href: "/custom" },
  navItems[navItems.length - 1]
];

type MegaMenuLink = {
  label: string;
  href: string;
  highlight?: boolean;
};

type MegaMenuColumn = {
  title: string;
  links: readonly MegaMenuLink[];
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
    { visible: facets.collections.best, label: "Terlaris", href: "/koleksi?label=best" },
    { visible: facets.collections.popular, label: "Populer", href: "/koleksi?sort=best-selling" },
    { visible: facets.collections.promo, label: "Turun Harga", href: "/koleksi?label=promo" }
  ].filter((item) => item.visible).map(({ label, href }) => ({ label, href }));
  const availability = [
    { visible: facets.availability.readyStock, label: "Ready Stock", href: "/koleksi?status=ready-stock" },
    { visible: facets.availability.custom, label: "Custom", href: "/koleksi?status=custom" },
    { visible: facets.availability.hybrid, label: "Ready Stock + Custom", href: "/koleksi?status=hybrid" }
  ].filter((item) => item.visible).map(({ label, href }) => ({ label, href }));
  const columns: MegaMenuColumn[] = [
    {
      title: "Koleksi",
      links: [{ label: "Belanja Semua", href: "/koleksi", highlight: true }, ...curated]
    }
  ];

  if (facets.categories.length) {
    columns.push({ title: "Belanja Berdasarkan Produk", links: facets.categories });
  }
  if (facets.colors.length) {
    columns.push({
      title: "Belanja Berdasarkan Warna",
      links: facets.colors.map((color) => ({ label: color.label, href: `/koleksi?color=${color.value}` }))
    });
  }
  if (availability.length) {
    columns.push({ title: "Ketersediaan", links: availability });
  }

  return columns;
}

function buildCategoryMenu(
  label: "Kaos Polos" | "Jaket & Hoodie",
  route: "/kaos-polos" | "/jaket-hoodie",
  facets: PublicNavigationFacets
): MegaMenuColumn[] {
  const routeKey = route.slice(1) as "kaos-polos" | "jaket-hoodie";
  const typeOptions = routeKey === "kaos-polos" ? kaosTypeOptions : jacketTypeOptions;
  const columns: MegaMenuColumn[] = [
    {
      title: label,
      links: [
        { label: "Belanja Semua", href: route, highlight: true },
        { label: "Produk Baru", href: `${route}?label=new` },
        { label: "Terlaris", href: `${route}?label=best` },
        { label: "Promo", href: `${route}?label=promo` }
      ]
    },
    {
      title: routeKey === "kaos-polos" ? "Tipe Kaos" : "Tipe Jaket",
      links: typeOptions.map((item) => ({ label: item.label, href: `${route}?type=${item.value}` }))
    }
  ];

  if (facets.categoryColors[routeKey].length) {
    columns.push({
      title: "Belanja Berdasarkan Warna",
      links: facets.categoryColors[routeKey].map((color) => ({ label: color.label, href: `${route}?color=${color.value}` }))
    });
  }

  return columns;
}

function SearchIcon() {
  return <BrandIcon name="search" />;
}


function ChevronDownIcon() {
  return <BrandIcon name="chevronDown" className="h-3.5 w-3.5" />;
}

function PublicNavIndicator({
  label,
  active,
  open = false,
  showChevron = false
}: {
  label: string;
  active: boolean;
  open?: boolean;
  showChevron?: boolean;
}) {
  const selected = active || open;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 transition duration-200 group-hover/navitem:bg-black group-hover/navitem:text-white group-focus-visible/navitem:bg-black group-focus-visible/navitem:text-white ${selected ? "bg-black text-white" : ""}`}>
      <span className="relative">
        {label}
        <span className={`absolute inset-x-0 -bottom-2 h-0.5 origin-center bg-current transition-transform duration-200 group-hover/navitem:scale-x-100 group-focus-visible/navitem:scale-x-100 ${selected ? "scale-x-100" : "scale-x-0"}`} />
      </span>
      {showChevron ? (
        <span className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          <ChevronDownIcon />
        </span>
      ) : null}
    </span>
  );
}

function MegaDropdown({
  columns,
  id,
  open,
  onNavigate
}: {
  columns: MegaMenuColumn[];
  id?: string;
  open?: boolean;
  onNavigate?: () => void;
}) {
  const controlledClass = open
    ? "visible translate-y-0 opacity-100"
    : "invisible pointer-events-none translate-y-2 opacity-0";
  const legacyClass = "invisible translate-y-2 opacity-0 group-hover/nav:visible group-hover/nav:translate-y-0 group-hover/nav:opacity-100 group-focus-within/nav:visible group-focus-within/nav:translate-y-0 group-focus-within/nav:opacity-100";
  return (
    <div id={id} className={`fixed left-1/2 top-[72px] z-[120] w-[min(1180px,calc(100vw-32px))] -translate-x-1/2 pt-3 transition duration-200 ${open === undefined ? legacyClass : controlledClass}`}>
      <div className={`grid gap-8 bg-white p-8 text-left shadow-[0_16px_40px_rgba(0,0,0,0.08)] ${columns.length >= 4 ? "grid-cols-4" : columns.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
        {columns.map((column) => (
          <div key={column.title}>
            <p className="text-[15px] font-semibold text-[#111]">{column.title}</p>
            <div className="mt-5 grid gap-4">
              {column.links.map((link) => (
                <Link key={`${column.title}-${link.label}`} href={link.href} onClick={onNavigate} className={`text-[15px] leading-5 underline-offset-4 transition ${link.highlight ? "font-semibold text-black" : "font-medium text-black/60"} hover:text-black hover:underline focus-visible:text-black focus-visible:underline`}>
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

export function SiteHeaderClient({
  navigationFacets = emptyNavigationFacets
}: {
  navigationFacets?: PublicNavigationFacets;
}) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [desktopCollectionOpen, setDesktopCollectionOpen] = useState(false);
  const [mobileCollectionOpen, setMobileCollectionOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const collectionTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const searchTriggerRef = useRef<HTMLButtonElement | null>(null);
  const collectionMenu = useMemo(() => buildCollectionMenu(navigationFacets), [navigationFacets]);
  const currentMegaMenus = useMemo<Record<string, MegaMenuColumn[]>>(() => ({
    "Kaos Polos": buildCategoryMenu("Kaos Polos", "/kaos-polos", navigationFacets),
    "Jaket & Hoodie": buildCategoryMenu("Jaket & Hoodie", "/jaket-hoodie", navigationFacets)
  }), [navigationFacets]);
  const currentNavItems = publicNavItems;

  function openSearch(trigger: HTMLButtonElement) {
    searchTriggerRef.current = trigger;
    setIsSearchOpen(true);
  }

  function closeSearch() {
    setIsSearchOpen(false);
    window.requestAnimationFrame(() => searchTriggerRef.current?.focus());
  }

  useEffect(() => {
    setIsOpen(false);
    setDesktopCollectionOpen(false);
    setMobileCollectionOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!desktopCollectionOpen) return;
    const closeOnOutsideInteraction = (event: MouseEvent | TouchEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setDesktopCollectionOpen(false);
    };
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
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
  }, [desktopCollectionOpen]);

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
  }, [isOpen]);

  return (
    <header ref={headerRef} data-public-header className="sticky top-0 z-[100] h-[60px] border-b border-black/10 bg-white text-[#111] lg:h-[72px]">
      <nav className="section-shell flex h-[60px] items-center justify-between gap-4 bg-white lg:h-[72px]" aria-label="Navigasi utama">
        <Link href="/" className="shrink-0" aria-label="DEBRODER beranda">
          <Logo variant="primary-dark" size="sm" className="transition duration-200 hover:opacity-70" />
        </Link>

        <div className="hidden h-full items-center justify-center gap-3 lg:flex xl:gap-5">
          {currentNavItems.map((item) => {
            const active = pathname === item.href || (item.href === "/custom" && pathname.startsWith("/custom/"));
            const megaMenu = currentMegaMenus[item.label as keyof typeof currentMegaMenus];
            if (item.label === "Koleksi") {
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
                    className={`nav-link group/navitem relative flex h-full items-center whitespace-nowrap text-[15px] font-medium text-[#111] ${active ? "font-semibold" : ""}`}
                  >
                    <PublicNavIndicator label={item.label} active={active} open={desktopCollectionOpen} showChevron />
                  </button>
                  <MegaDropdown id="global-collection-menu" columns={collectionMenu} open={desktopCollectionOpen} onNavigate={() => setDesktopCollectionOpen(false)} />
                </div>
              );
            }
            if (megaMenu) {
              return (
                <div key={item.href} className="group/nav relative flex h-full items-center">
                  <Link href={item.href} aria-current={active ? "page" : undefined} className={`nav-link group/navitem relative flex h-full items-center whitespace-nowrap text-sm font-medium text-[#111] xl:text-[15px] ${active ? "font-semibold" : ""}`}>
                    <PublicNavIndicator label={item.label} active={active} />
                  </Link>
                  <MegaDropdown columns={megaMenu} />
                </div>
              );
            }
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`nav-link group/navitem relative flex h-full items-center whitespace-nowrap text-sm font-medium text-[#111] xl:text-[15px] ${active ? "font-semibold" : ""}`}>
                <PublicNavIndicator label={item.label} active={active} />
              </Link>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <button type="button" className="hidden h-12 w-32 items-center gap-3 rounded-full bg-[#f5f5f5] px-4 text-left text-sm font-medium text-black/55 transition hover:text-black 2xl:flex" aria-label="Cari produk" onClick={(event) => openSearch(event.currentTarget)}>
            <SearchIcon />
            <span>Cari</span>
          </button>
          <button type="button" className="grid h-12 w-12 place-items-center rounded-full transition hover:bg-[#f5f5f5] 2xl:hidden" aria-label="Cari" onClick={(event) => openSearch(event.currentTarget)}>
            <SearchIcon />
          </button>

          <Link href="/wishlist" className="hidden h-12 w-12 place-items-center rounded-full transition hover:bg-[#f5f5f5] sm:grid" aria-label="Wishlist">
            <BrandIcon name="wishlist" />
          </Link>
          <Link href="/account" className="hidden h-12 w-12 place-items-center rounded-full transition hover:bg-[#f5f5f5] sm:grid" aria-label="Akun pelanggan">
            <BrandIcon name="user" />
          </Link>
          <CartNavButton />
          <button ref={mobileMenuTriggerRef} type="button" className="relative grid h-12 w-12 place-items-center rounded-full transition hover:bg-[#f5f5f5] lg:hidden" aria-label={isOpen ? "Tutup menu" : "Buka menu"} aria-expanded={isOpen} aria-controls="global-mobile-navigation" onClick={() => setIsOpen((current) => !current)}>
            <BrandIcon name={isOpen ? "close" : "menu"} />
          </button>
        </div>
      </nav>

      <div id="global-mobile-navigation" aria-hidden={!isOpen} inert={!isOpen} className={`absolute inset-x-0 top-full h-[calc(100dvh-60px)] bg-white transition-transform duration-300 ease-out lg:hidden ${isOpen ? "visible translate-x-0" : "invisible pointer-events-none translate-x-full"}`}>
        <div className="section-shell flex h-full flex-col overflow-y-auto py-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-black/45">Belanja</p>
          {currentNavItems.map((item) => {
            const active = pathname === item.href || (item.href === "/custom" && pathname.startsWith("/custom/"));
            if (item.label === "Koleksi") {
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
            return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`flex min-h-14 items-center justify-between text-2xl font-semibold leading-tight text-[#111] transition active:bg-black active:text-white focus-visible:bg-black focus-visible:text-white ${active ? "underline underline-offset-8" : ""}`}>
              <span>{item.label}</span><span className="text-2xl font-normal" aria-hidden="true">›</span>
            </Link>;
          })}
          <div className="mt-5 border-t border-black/10 pt-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-black/45">Bantuan</p>
            {topbarItems.map((item) => (
              <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined} className={`flex min-h-12 items-center justify-between text-base font-medium text-[#111] transition active:bg-black active:text-white focus-visible:bg-black focus-visible:text-white ${pathname === item.href ? "underline underline-offset-8" : ""}`}>
                <span>{item.label}</span><span aria-hidden="true">›</span>
              </Link>
            ))}
            <Link href="/account" className="flex min-h-12 items-center justify-between text-base font-medium text-[#111] transition active:bg-black active:text-white focus-visible:bg-black focus-visible:text-white">
              <span>Akun</span><span aria-hidden="true">›</span>
            </Link>
            <Link href="/wishlist" className="flex min-h-12 items-center justify-between text-base font-medium text-[#111] transition active:bg-black active:text-white focus-visible:bg-black focus-visible:text-white">
              <span>Wishlist</span><span aria-hidden="true">›</span>
            </Link>
            <Link href="/help" className="flex min-h-12 items-center justify-between text-base font-medium text-[#111] transition active:bg-black active:text-white focus-visible:bg-black focus-visible:text-white">
              <span>Pusat Bantuan</span><span aria-hidden="true">›</span>
            </Link>
            <Link href="/tentang" className="flex min-h-12 items-center justify-between text-base font-medium text-[#111] transition active:bg-black active:text-white focus-visible:bg-black focus-visible:text-white">
              <span>Tentang DEBRODER</span><span aria-hidden="true">›</span>
            </Link>
          </div>

        </div>
      </div>

      {isSearchOpen ? (
        <HeaderSearchModal onClose={closeSearch} />
      ) : null}
    </header>
  );
}
