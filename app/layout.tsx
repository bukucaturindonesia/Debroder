import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import { siteConfig } from "@/lib/site";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  fallback: ["Arial", "Helvetica"],
  variable: "--font-inter"
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
        url: "/debroder/open-graph-logo.png",
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
    images: ["/debroder/open-graph-logo.png"]
  },
  icons: {
    icon: [
      { url: "/debroder/favicon.ico" },
      {
        url: "/debroder/favicon.png",
        sizes: "512x512",
        type: "image/png"
      },
      {
        url: "/debroder/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png"
      },
      {
        url: "/debroder/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png"
      },
      {
        url: "/debroder/favicon-48x48.png",
        sizes: "48x48",
        type: "image/png"
      }
    ],
    apple: [
      {
        url: "/debroder/apple-touch-icon.png",
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
    <html lang="id" className={inter.variable}>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
