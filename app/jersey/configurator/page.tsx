import type { Metadata } from "next";
import { JerseyConfigurator } from "@/components/JerseyConfigurator";
import { JerseyChrome } from "@/components/jersey/JerseyChrome";
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
      <JerseyChrome />
      <header className="bg-[#111] py-12 text-white sm:py-16">
        <div className="section-shell max-w-5xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Jersey Custom</p>
          <h1 className="mt-3 font-heading text-5xl font-extrabold uppercase leading-[0.92] tracking-[-0.035em] sm:text-7xl">Buat Jersey untuk Tim Anda</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/70">Atur model, bahan, kerah, ukuran, jumlah, logo, sponsor, nama, nomor, dan kebutuhan pemain tanpa berpindah ke form custom generik.</p>
        </div>
      </header>
      {configuredProduct.status === "ready" ? (
        <JerseyConfigurator consumer={configuredProduct.consumer} />
      ) : (
        <section className="bg-brand-offWhite py-14">
          <div className="section-shell max-w-3xl">
            <div className="rounded-[28px] bg-white/70 p-6 ring-1 ring-black/6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/42">Belum tersedia</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">Jersey Custom belum dapat digunakan</h2>
              <p className="mt-3 text-sm leading-7 text-black/58">
                {configuredProduct.message}
              </p>
            </div>
          </div>
        </section>
      )}
    </PublicShell>
  );
}
