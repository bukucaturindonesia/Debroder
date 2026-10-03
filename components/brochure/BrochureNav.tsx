"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { label: "Produk", href: "/produk" },
  { label: "Custom Jersey", href: "/layanan#custom-jersey" },
  { label: "DTF / Sablon", href: "/layanan#dtf-sablon" },
  { label: "Layanan", href: "/layanan" },
  { label: "Tentang", href: "/tentang" }
] as const;

export function BrochureNav() {
  const pathname = usePathname();

  return (
    <>
      <nav aria-label="Navigasi utama" className="brochure-desktop-nav">
        {navigation.map((item) => (
          <Link key={item.href} href={item.href} aria-current={pathname === item.href || (item.href === "/produk" && pathname.startsWith("/produk/")) ? "page" : undefined} className="brochure-nav-link">
            {item.label}
          </Link>
        ))}
      </nav>
      <Link href="/kontak" className="brochure-button brochure-button-primary brochure-header-cta">Hubungi Kami</Link>
      <details key={pathname} className="brochure-mobile-menu">
        <summary aria-label="Buka menu navigasi" className="brochure-menu-trigger">
          <span aria-hidden="true" className="brochure-menu-icon"><span /><span /><span /></span>
        </summary>
        <nav aria-label="Navigasi mobile" className="brochure-mobile-panel">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href} onClick={(event) => event.currentTarget.closest("details")?.removeAttribute("open")} aria-current={pathname === item.href ? "page" : undefined} className="brochure-mobile-link">
              {item.label}
            </Link>
          ))}
        </nav>
      </details>
    </>
  );
}
