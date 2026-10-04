"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { label: "Produk", href: "/produk" },
  { label: "Layanan", href: "/layanan" },
  { label: "Custom", href: "/custom" },
  { label: "Kontak", href: "/kontak" }
] as const;

function externalHref(href: string) {
  return href.startsWith("https://wa.me/");
}

export function BrochureNav() {
  const pathname = usePathname();

  return (
    <>
      <nav aria-label="Navigasi utama" className="brochure-desktop-nav">
        {navigation.map((item) => externalHref(item.href) ? (
          <a key={item.label} href={item.href} className="brochure-nav-link">{item.label}</a>
        ) : (
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
          {navigation.map((item) => externalHref(item.href) ? (
            <a key={item.label} href={item.href} className="brochure-mobile-link" onClick={(event) => event.currentTarget.closest("details")?.removeAttribute("open")}>{item.label}</a>
          ) : (
            <Link key={item.href} href={item.href} onClick={(event) => event.currentTarget.closest("details")?.removeAttribute("open")} aria-current={pathname === item.href ? "page" : undefined} className="brochure-mobile-link">
              {item.label}
            </Link>
          ))}
        </nav>
      </details>
    </>
  );
}
