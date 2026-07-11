import type { Metadata } from "next";
import Link from "next/link";
import "@/app/globals.css";
import { getSiteUrl } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "DEBRODER",
    template: "%s | DEBRODER"
  },
  description: "DEBRODER product foundation, cart, and custom ordering system."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>
        <div className="site-shell">
          <header className="site-header">
            <div className="site-header-inner">
              <Link className="brand" href="/">
                DEBRODER
              </Link>
              <nav className="main-nav" aria-label="Navigasi utama">
                <Link href="/">Produk</Link>
                <Link href="/keranjang">Keranjang</Link>
                <Link href="/admin/pim-v2">PIM V2</Link>
                <Link href="/admin/quotations">Quotation</Link>
              </nav>
            </div>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
