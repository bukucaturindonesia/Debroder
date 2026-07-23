import type { Metadata } from "next";
import { JerseyConfigurator } from "@/components/JerseyConfigurator";
import { JerseyChrome } from "@/components/jersey/JerseyChrome";
import { PublicShell } from "@/components/PublicPage";
import { fallbackCategories, fallbackImages } from "@/lib/fallback-data";
import { productsForCategoryRoute } from "@/lib/product-route-matching";
import { getPublicContent } from "@/lib/public-data";

export const metadata: Metadata = {
  title: "Konfigurator Jersey | DEBRODER",
  description: "Atur paket, bahan, kerah, ukuran, jumlah, desain, dan data pemain Jersey DEBRODER dalam satu alur resmi.",
  alternates: { canonical: "/jersey/configurator" }
};

export default async function JerseyConfiguratorPage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const [content, params] = await Promise.all([getPublicContent(), searchParams]);
  const jerseyProducts = productsForCategoryRoute(content.products, content.productCategories, "jersey");
  const selectedProduct = jerseyProducts.find((product) => product.slug === params.product) || jerseyProducts[0];
  const jerseyCategory = content.categories.find((category) => category.category_key === "jersey")
    || fallbackCategories.find((category) => category.category_key === "jersey");
  const jerseyName = selectedProduct?.nama || jerseyCategory?.nama_kategori || "Jersey Custom DEBRODER";
  const jerseySlug = selectedProduct?.slug || jerseyCategory?.slug || "custom";
  const imageUrl = selectedProduct?.image_url || selectedProduct?.gambar_url || jerseyCategory?.gambar_url || fallbackImages.product;

  return (
    <PublicShell headerMode="natural">
      <JerseyChrome />
      <header className="bg-[#111] py-12 text-white sm:py-16">
        <div className="section-shell max-w-5xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Jersey Configurator Resmi</p>
          <h1 className="mt-3 font-heading text-5xl font-extrabold uppercase leading-[0.92] tracking-[-0.035em] sm:text-7xl">Buat Jersey untuk Tim Anda</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/70">Atur model, bahan, kerah, ukuran, jumlah, logo, sponsor, nama, nomor, dan kebutuhan pemain tanpa berpindah ke form custom generik.</p>
        </div>
      </header>
      <JerseyConfigurator
        config={content.jerseyConfigurator}
        jerseyName={jerseyName}
        jerseySlug={jerseySlug}
        imageUrl={imageUrl}
        imageAlt={selectedProduct?.image_alt || jerseyCategory?.image_alt || jerseyName}
      />
    </PublicShell>
  );
}
