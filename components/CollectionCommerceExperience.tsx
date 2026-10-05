"use client";

import Link from "next/link";
import { ProductCatalog } from "@/components/ProductCatalog";
import { SafeImage } from "@/components/SafeImage";
import type { CatalogPageCampaignViewModel } from "@/lib/catalog-page/model";
import type { Product } from "@/lib/types";

const collectionRoutes = [
  { label: "Kaos Polos", href: "/kaos-polos" },
  { label: "Jaket & Hoodie", href: "/jaket-hoodie" },
  { label: "Headwear", href: "/headwear" },
  { label: "Jersey", href: "/jersey" }
] as const;

export function CollectionCommerceExperience({
  products,
  campaigns = [],
  initialQuery,
  initialColor,
  initialLabel,
  initialSort,
  initialStatus
}: {
  products: Product[];
  campaigns?: CatalogPageCampaignViewModel[];
  initialQuery: string;
  initialColor: string;
  initialLabel: "all" | "new" | "promo" | "best";
  initialSort: "order" | "newest" | "best-selling" | "price-low" | "price-high";
  initialStatus: string;
}) {
  return (
    <div className="bg-white text-[#111]">
      <nav aria-label="Kategori koleksi" className="category-hero-following border-b border-black/10">
        <div className="section-shell no-scrollbar flex min-h-12 items-center gap-6 overflow-x-auto pb-2">
          {collectionRoutes.map((route) => (
            <Link key={route.href} href={route.href} className="shrink-0 text-sm font-medium text-black/70 underline-offset-4 hover:text-black hover:underline">{route.label}</Link>
          ))}
        </div>
      </nav>
      <section id="catalog" className="scroll-mt-24 py-7 sm:py-9 lg:py-12">
        <div className="section-shell">
          <div className="mb-5">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Semua produk</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-black/60">Temukan pilihan apparel sesuai kebutuhan Anda.</p>
          </div>
          <ProductCatalog
            products={products}
            showCategoryFilter
            initialQuery={initialQuery}
            initialColor={initialColor}
            initialLabel={initialLabel}
            initialSort={initialSort}
            initialStatus={initialStatus}
            showStatusFilter
            catalogStyle="category"
            syncUrlState
          />
        </div>
      </section>
      {campaigns.length ? <section aria-label="Campaign koleksi" className="border-t border-black/10 bg-[#f7f7f5] py-7 sm:py-9"><div className="section-shell grid gap-3 md:grid-cols-2">{campaigns.slice(0, 2).map((campaign) => <Link key={campaign.id} href={campaign.ctaHref || "/koleksi"} className="group relative aspect-[4/5] overflow-hidden bg-[#e9e9e6] sm:aspect-[16/8]"><picture>{campaign.mobileImageUrl ? <source media="(max-width:767px)" srcSet={campaign.mobileImageUrl} /> : null}<SafeImage src={campaign.imageUrl} alt={campaign.imageAlt || campaign.title || campaign.name} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]" sizes="(min-width:768px) 50vw, 100vw" objectPosition={campaign.objectPosition} /></picture><span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" /><span className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-6"><span className="block text-xs font-semibold uppercase tracking-[0.12em] text-white/75">{campaign.eyebrow}</span><span className="mt-1 block text-xl font-semibold sm:text-2xl">{campaign.title || campaign.name}</span>{campaign.description ? <span className="mt-1 block max-w-xl text-sm text-white/80">{campaign.description}</span> : null}</span></Link>)}</div></section> : null}
    </div>
  );
}
