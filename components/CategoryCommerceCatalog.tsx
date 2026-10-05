"use client";

import Link from "next/link";
import { ProductCatalog } from "@/components/ProductCatalog";
import { SafeImage } from "@/components/SafeImage";
import type { CatalogPageCampaignViewModel } from "@/lib/catalog-page/model";
import { matchesProductType, type ProductTypeOption } from "@/lib/product-taxonomy";
import type { Product } from "@/lib/types";

type SortValue = "order" | "newest" | "best-selling" | "price-low" | "price-high";
type LabelValue = "all" | "new" | "promo" | "best";

export function CategoryCommerceCatalog({
  products,
  campaigns = [],
  pagePath,
  shortcutLabel,
  title,
  description,
  closingHeadline,
  closingCtaLabel,
  closingCtaHref,
  productTypeOptions = [],
  typeFilterLabel = "Semua tipe",
  seoLinks = [],
  initialQuery = "",
  initialColor = "all",
  initialLabel = "all",
  initialSort = "order",
  initialProductType = "all"
}: {
  products: Product[];
  campaigns?: CatalogPageCampaignViewModel[];
  pagePath: string;
  shortcutLabel: string;
  title: string;
  description: string;
  closingHeadline: string;
  closingCtaLabel: string;
  closingCtaHref: string;
  productTypeOptions?: ProductTypeOption[];
  typeFilterLabel?: string;
  seoLinks?: Array<{ label: string; href: string }>;
  initialQuery?: string;
  initialColor?: string;
  initialLabel?: LabelValue;
  initialSort?: SortValue;
  initialProductType?: string;
}) {
  const activeType = initialProductType !== "all" ? initialProductType : "";
  const backedProductTypeOptions = productTypeOptions.filter((option) =>
    products.some((product) => matchesProductType(product, option.value, productTypeOptions))
  );

  return (
    <>
      <nav aria-label={shortcutLabel} className="border-b border-black/10 bg-white">
        <div className="section-shell no-scrollbar flex min-h-12 items-center gap-6 overflow-x-auto py-2">
          <Link href={`${pagePath}#catalog`} className="shrink-0 text-sm font-semibold underline underline-offset-4">Semua produk</Link>
          {backedProductTypeOptions.map((option) => (
            <Link
              key={option.value}
              href={`${pagePath}?type=${encodeURIComponent(option.value)}#catalog`}
              aria-current={activeType === option.value ? "page" : undefined}
              className="shrink-0 text-sm text-black/70 underline-offset-4 hover:text-black hover:underline"
            >
              {option.label}
            </Link>
          ))}
        </div>
      </nav>

      <section id="catalog" className="scroll-mt-24 bg-white py-7 sm:py-9 lg:py-12">
        <div className="section-shell">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-black/60">{description}</p>
            </div>
          </div>
          <ProductCatalog
            products={products}
            showCategoryFilter={false}
            initialQuery={initialQuery}
            initialColor={initialColor}
            initialLabel={initialLabel}
            initialSort={initialSort}
            initialProductType={initialProductType}
            productTypeOptions={productTypeOptions}
            typeFilterLabel={typeFilterLabel}
            catalogStyle="category"
            syncUrlState
          />
        </div>
      </section>

      {campaigns.length ? (
        <section aria-label="Cerita dan campaign" className="border-t border-black/10 bg-[#f7f7f5] py-7 sm:py-9">
          <div className="section-shell grid gap-3 md:grid-cols-2">
            {campaigns.slice(0, 2).map((campaign) => <Link key={campaign.id} href={campaign.ctaHref || pagePath} className="group relative aspect-[4/5] overflow-hidden bg-[#e9e9e6] sm:aspect-[16/8]">
              <picture>
                {campaign.mobileImageUrl ? <source media="(max-width: 767px)" srcSet={campaign.mobileImageUrl} /> : null}
                <SafeImage src={campaign.imageUrl} alt={campaign.imageAlt || campaign.title || campaign.name} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]" sizes="(min-width:768px) 50vw, 100vw" objectPosition={campaign.objectPosition} />
              </picture>
              <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
              <span className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-6"><span className="block text-xs font-semibold uppercase tracking-[0.12em] text-white/75">{campaign.eyebrow}</span><span className="mt-1 block text-xl font-semibold sm:text-2xl">{campaign.title || campaign.name}</span>{campaign.description ? <span className="mt-1 block max-w-xl text-sm text-white/80">{campaign.description}</span> : null}</span>
            </Link>)}
          </div>
        </section>
      ) : null}

      {seoLinks.length ? (
        <nav aria-label="Kategori populer" className="border-t border-black/10 bg-white py-7">
          <div className="section-shell flex flex-wrap items-center gap-x-6 gap-y-3">
            <span className="text-sm font-semibold">Kategori populer</span>
            {seoLinks.map((item) => <Link key={item.href} href={item.href} className="text-sm text-black/65 underline underline-offset-4 hover:text-black">{item.label}</Link>)}
          </div>
        </nav>
      ) : null}

      <section className="border-t border-black/10 bg-[#f7f7f5] py-8 sm:py-10">
        <div className="section-shell flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <h2 className="max-w-3xl text-xl font-medium tracking-tight sm:text-2xl">{closingHeadline}</h2>
          <Link href={closingCtaHref} className="inline-flex min-h-11 shrink-0 items-center justify-center border border-black px-5 text-sm font-semibold transition hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">{closingCtaLabel}</Link>
        </div>
      </section>
    </>
  );
}
