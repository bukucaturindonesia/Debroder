"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { label: "Beranda", href: "/" },
  { label: "Produk", href: "/produk" },
  { label: "Layanan", href: "/layanan" },
  { label: "Tentang", href: "/tentang" },
  { label: "Kontak", href: "/kontak" }
] as const;

export function BrochureNav() {
  const pathname = usePathname();

  return (
    <>
      <nav aria-label="Navigasi utama" className="brochure-desktop-nav">
        {navigation.map((item) => (
          <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined} className="brochure-nav-link">
            {item.label}
          </Link>
        ))}
      </nav>
      <details key={pathname} className="brochure-mobile-menu">
        <summary aria-label="Buka menu navigasi" className="brochure-menu-trigger">
          <span aria-hidden="true" className="brochure-menu-icon"><span /><span /><span /></span>
        </summary>
        <nav aria-label="Navigasi mobile" className="brochure-mobile-panel">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined} className="brochure-mobile-link">
              {item.label}
            </Link>
          ))}
        </nav>
      </details>
    </>
  );
}
