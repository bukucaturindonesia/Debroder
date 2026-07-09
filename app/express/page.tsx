import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Koleksi | DE BRODER",
  description:
    "Lihat layanan kaos polos New State Apparel, sablon DTF, custom jersey, maklon DTF, dan cetak sublim di DE BRODER.",
  alternates: { canonical: "/koleksi" },
  robots: {
    index: false,
    follow: true
  }
};

export default function LegacyServicePage() {
  redirect("/koleksi");
}
