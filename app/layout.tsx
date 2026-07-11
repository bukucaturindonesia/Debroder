import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Barlow_Condensed, Inter } from "next/font/google";
import { CartProvider } from "@/components/CartProvider";
import { siteConfig } from "@/lib/site";
import "./globals.css";

const fontHeading = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  variable: "--font-heading",
  display: "swap"
});

const fontBody = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-body",
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.siteUrl),
  title: siteConfig.defaultMetaTitle,
  manifest: "/manifest.webmanifest",
  alternates: {
    canonical: "/"
  },
  description: siteConfig.defaultMetaDescription,
  keywords: [
    "DE BRODER",
    "De Broder",
    "kaos polos",
    "sablon DTF",
    "sablon kaos",
    "custom jersey",
    "maklon DTF",
    "cetak sublim",
    "kaos NSA",
    "cotton combed",
    "Makassar",
    "Parepare",
    "apparel",
    "jersey"
  ],
  openGraph: {
    title: siteConfig.defaultMetaTitle,
    description: siteConfig.defaultMetaDescription,
    siteName: "DE BRODER",
    images: [
      {
        url: "/brand/debroder/open-graph-logo.png",
        width: 1200,
        height: 630,
        alt: "Logo DE BRODER"
      }
    ],
    locale: "id_ID",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.defaultMetaTitle,
    description: siteConfig.defaultMetaDescription,
    images: ["/brand/debroder/open-graph-logo.png"]
  },
  icons: {
    icon: [
      { url: "/brand/debroder/favicon.ico" },
      {
        url: "/brand/debroder/favicon.png",
        sizes: "512x512",
        type: "image/png"
      },
      {
        url: "/brand/debroder/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png"
      },
      {
        url: "/brand/debroder/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png"
      },
      {
        url: "/brand/debroder/favicon-48x48.png",
        sizes: "48x48",
        type: "image/png"
      }
    ],
    apple: [
      {
        url: "/brand/debroder/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png"
      }
    ]
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${fontHeading.variable} ${fontBody.variable}`}>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
