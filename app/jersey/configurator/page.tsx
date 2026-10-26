import type { Metadata } from "next";
import Link from "next/link";
import { JerseyConfigurator } from "@/components/JerseyConfigurator";
import { PublicShell } from "@/components/PublicPage";
import { readJerseyConfiguredProduct } from "@/lib/jersey-configured-product/data-access";

export const metadata: Metadata = {
  title: "Jersey Custom | DEBRODER",
  description: "Lengkapi model, bahan, kerah, ukuran, jumlah, desain, dan data pemain untuk Jersey Custom DEBRODER.",
  alternates: { canonical: "/jersey/configurator" }
};

export default async function JerseyConfiguratorPage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const params = await searchParams;
  const configuredProduct = await readJerseyConfiguredProduct({
    ...(params.product ? { productSlug: params.product } : {})
  });

  return (
    <PublicShell>
      <section aria-labelledby="jersey-configurator-title" className="keep-section-bg bg-[#111] py-12 text-white sm:py-16">
        <div className="section-shell max-w-5xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Jersey Custom</p>
          <h1 id="jersey-configurator-title" className="mt-3 max-w-4xl font-heading text-4xl font-extrabold uppercase leading-[1.05] tracking-[-0.035em] sm:text-6xl lg:text-7xl">Buat Jersey untuk Tim Anda</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/70">Pilih model, bahan, kerah, dan ukuran. Lengkapi desain serta data pemain, lalu tinjau ringkasan kebutuhan tim Anda.</p>
        </div>
      </section>
      {configuredProduct.status === "ready" ? (
        <JerseyConfigurator consumer={configuredProduct.consumer} />
      ) : (
        <section className="bg-brand-offWhite py-14">
          <div className="section-shell max-w-3xl">
            <div className="rounded-functional border border-black/10 bg-white p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/42">Belum tersedia</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">Jersey Custom belum dapat digunakan</h2>
              <p className="mt-3 text-sm leading-7 text-black/58">
                Produk Jersey Custom yang memenuhi syarat publik belum tersedia. Pilih produk lain atau coba kembali setelah data produk dilengkapi.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link href="/jersey/shop" className="public-button public-button--primary text-center">Lihat Jersey Ready Stock</Link>
                <Link href="/jersey" className="public-secondary-action border border-black/20 text-center">Kembali ke Jersey</Link>
              </div>
            </div>
          </div>
        </section>
      )}
    </PublicShell>
  );
}
