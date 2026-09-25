import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { BrochureNav } from "@/components/brochure/BrochureNav";
import { brochureSite } from "@/src/config/site";
import { brochureServices } from "@/src/data/services";

const footerNavigation = [
  { label: "Produk", href: "/produk" },
  { label: "Layanan", href: "/layanan" },
  { label: "Tentang", href: "/tentang" },
  { label: "Kontak", href: "/kontak" }
] as const;

export function BrochureShell({ children }: { children: ReactNode }) {
  return (
    <div className="brochure-shell">
      <a href="#main-content" className="brochure-skip-link">Lewati ke konten</a>
      <header className="brochure-header">
        <div className="brochure-container brochure-header-inner">
          <Link href="/" aria-label="DEBRODER — Beranda" className="brochure-brand">
            <Image src="/debroder/logo-wordmark-black.svg" alt="" width={154} height={30} priority />
          </Link>
          <BrochureNav />
        </div>
      </header>
      <main id="main-content">{children}</main>
      <footer className="brochure-footer">
        <div className="brochure-container brochure-footer-grid">
          <div className="brochure-footer-brand">
            <p>DEBRODER</p>
            <span>Bahan dan produksi apparel untuk kebutuhan brand, komunitas, dan usaha.</span>
          </div>
          <nav aria-label="Navigasi footer" className="brochure-footer-group">
            <h2>Jelajahi</h2>
            {footerNavigation.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
          </nav>
          <nav aria-label="Layanan footer" className="brochure-footer-group">
            <h2>Layanan</h2>
            {brochureServices.map((service) => <Link key={service.name} href="/layanan">{service.name}</Link>)}
          </nav>
          <div className="brochure-footer-group">
            <h2>Kontak</h2>
            <a href={`mailto:${brochureSite.email}`}>{brochureSite.email}</a>
          </div>
        </div>
        <div className="brochure-container brochure-footer-bottom">
          <span>© {new Date().getFullYear()} DEBRODER</span>
          <span>Bahan. Produksi. Apparel.</span>
        </div>
      </footer>
    </div>
  );
}
