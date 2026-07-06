import type { Metadata } from "next";
import { CategoryDetailPage } from "@/components/PublicPage";
import { productsForRoute } from "@/lib/product-route-matching";
import { getPublicContent } from "@/lib/public-data";
import { whatsappHref } from "@/lib/url";

export const metadata: Metadata = {
  title: "Maklon DTF | DE BRODER",
  description:
    "Layanan maklon DTF untuk kebutuhan produksi, reseller, brand apparel, dan pelaku usaha.",
  alternates: { canonical: "/maklon-dtf" },
  openGraph: {
    title: "Maklon DTF | DE BRODER",
    description:
      "Layanan maklon DTF untuk kebutuhan produksi, reseller, brand apparel, dan pelaku usaha yang ingin memproduksi desain secara praktis."
  }
};

export default async function MaklonDtfPage() {
  const content = await getPublicContent();
  const products = productsForRoute(content.products, "maklon-dtf");

  return (
    <CategoryDetailPage
      content={content}
      label="Maklon DTF"
      title="Maklon DTF"
      description="Layanan maklon DTF untuk kebutuhan produksi, reseller, brand apparel, dan pelaku usaha yang ingin memproduksi desain secara lebih praktis."
      details={[
        "Maklon DTF cocok untuk reseller, brand clothing, dan produksi partai.",
        "Membantu pelaku usaha memproduksi desain dengan alur yang lebih praktis.",
        "Kapasitas produksi dapat disesuaikan untuk kebutuhan rutin maupun pesanan partai."
      ]}
      visualLabel="Hasil Produksi Maklon DTF DE BRODER"
      ctaText="Konsultasi Maklon DTF"
      ctaHref={whatsappHref(content.contact.whatsapp_apparel)}
      currentSlug="maklon-dtf"
      products={products}
      productTitle="Produk Maklon DTF"
    />
  );
}
