import Link from "next/link";
import { ProductCatalog } from "@/components/ProductCatalog";
import { ResponsivePicture } from "@/components/ResponsivePicture";
import type {
  CatalogPageCampaignViewModel,
  CatalogPageModel
} from "@/lib/catalog-page/model";
import {
  availableKaosTypeOptions,
  kaosTypeFilterHref
} from "@/lib/kaos-polos-editorial";

function campaignOfType(
  campaigns: CatalogPageCampaignViewModel[],
  ...types: string[]
) {
  return campaigns.find((campaign) => types.includes(campaign.sectionType));
}

function campaignsOfType(
  campaigns: CatalogPageCampaignViewModel[],
  ...types: string[]
) {
  return campaigns.filter((campaign) => types.includes(campaign.sectionType));
}

function CampaignPicture({
  campaign,
  className = ""
}: {
  campaign: CatalogPageCampaignViewModel;
  className?: string;
}) {
  return (
    <ResponsivePicture
      desktopSrc={campaign.imageUrl}
      mobileSrc={campaign.mobileImageUrl || campaign.imageUrl}
      alt={campaign.imageAlt || campaign.title || campaign.name}
      className={`absolute inset-0 h-full w-full object-cover ${className}`.trim()}
      desktopObjectPosition={campaign.objectPosition}
      mobileObjectPosition={campaign.mobileObjectPosition}
      objectFit="cover"
    />
  );
}

function FeaturedEditorialCard({
  campaign
}: {
  campaign: CatalogPageCampaignViewModel;
}) {
  const content = (
    <>
      <CampaignPicture
        campaign={campaign}
        className="transition duration-500 group-hover:scale-[1.015]"
      />
      {campaign.eyebrow || campaign.title || campaign.description || campaign.ctaLabel ? (
        <>
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent"
          />
          <span className="absolute inset-x-0 bottom-0 z-10 block p-5 text-white sm:p-7 lg:p-8">
            {campaign.eyebrow ? (
              <span className="block text-xs font-normal uppercase tracking-[0.14em] text-white/75">
                {campaign.eyebrow}
              </span>
            ) : null}
            {campaign.title ? (
              <span className="mt-2 block text-2xl font-normal leading-tight sm:text-3xl">
                {campaign.title}
              </span>
            ) : null}
            {campaign.description ? (
              <span className="mt-2 block max-w-xl text-sm leading-6 text-white/80">
                {campaign.description}
              </span>
            ) : null}
            {campaign.ctaLabel ? (
              <span className="mt-4 inline-flex min-h-10 items-center bg-black px-4 text-xs font-semibold text-white">
                {campaign.ctaLabel}
              </span>
            ) : null}
          </span>
        </>
      ) : null}
    </>
  );

  if (!campaign.ctaHref) {
    return (
      <article className="kaos-blueprint-feature group relative overflow-hidden bg-[#ecece8]">
        {content}
      </article>
    );
  }

  return (
    <Link
      href={campaign.ctaHref}
      aria-label={campaign.ctaLabel || campaign.title || campaign.name}
      className="kaos-blueprint-feature group relative block overflow-hidden bg-[#ecece8]"
    >
      {content}
    </Link>
  );
}

function EditorialBanner({
  left,
  right,
  customHref
}: {
  left: CatalogPageCampaignViewModel;
  right: CatalogPageCampaignViewModel;
  customHref: string;
}) {
  return (
    <>
      <div className="kaos-blueprint-editorial-banner" aria-label="Banner editorial Kaos Polos">
        <Link
          href={customHref}
          aria-label={left.ctaLabel || left.title || "Mulai custom kaos polos"}
          className="kaos-blueprint-editorial-left group relative block overflow-hidden bg-[#ecece8]"
        >
          <CampaignPicture
            campaign={left}
            className="transition duration-500 group-hover:scale-[1.015]"
          />
        </Link>
        <div className="kaos-blueprint-editorial-right relative overflow-hidden bg-[#ecece8]">
          <CampaignPicture campaign={right} />
        </div>
      </div>

      <div className="kaos-blueprint-campaign-copy mx-auto max-w-5xl text-center">
        {right.eyebrow ? (
          <p className="kaos-blueprint-eyebrow">{right.eyebrow}</p>
        ) : null}
        <h2 className="mt-3 text-[clamp(2.25rem,5vw,5rem)] font-semibold leading-[0.94] tracking-[-0.05em]">
          {right.title || "Kaos polos adalah awal. Jadikan milikmu."}
        </h2>
        {right.description ? (
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-black/60 sm:text-base sm:leading-7">
            {right.description}
          </p>
        ) : null}
        {right.ctaLabel && right.ctaHref ? (
          <Link
            href={right.ctaHref}
            className="mt-6 inline-flex min-h-11 items-center justify-center bg-black px-5 text-sm font-semibold text-white transition hover:bg-black/80"
          >
            {right.ctaLabel}
          </Link>
        ) : null}
      </div>
    </>
  );
}

export function KaosPolosEditorialExperience({
  model
}: {
  model: CatalogPageModel;
}) {
  const {
    campaigns,
    customDestination,
    filters,
    hero,
    productTypeOptions,
    products
  } = model.data;

  const featured = campaignsOfType(
    campaigns,
    "featured_editorial",
    "featured",
    "poster_carousel"
  ).slice(0, 2);
  const quickTypes = availableKaosTypeOptions(products, productTypeOptions);
  const bannerLeft = campaignOfType(
    campaigns,
    "banner_editorial_left",
    "split_campaign_left",
    "split_campaign"
  );
  const bannerRightCandidate = campaignOfType(
    campaigns,
    "banner_editorial_right",
    "split_campaign_right",
    "wide_campaign",
    "catalog_campaign"
  );
  const bannerRight = bannerRightCandidate?.id === bannerLeft?.id
    ? campaigns.find((campaign) =>
        campaign.id !== bannerLeft?.id
        && ["banner_editorial_right", "split_campaign_right", "wide_campaign", "catalog_campaign"].includes(campaign.sectionType)
      )
    : bannerRightCandidate;
  const customHref = customDestination || "/custom";

  return (
    <div className="kaos-editorial-page bg-white text-[#111]">
      {hero.imageUrl ? (
        <section
          data-kaos-blueprint-section="hero"
          aria-label="Hero Kaos Polos"
          className="kaos-blueprint-hero relative overflow-hidden bg-[#f0f0ed]"
        >
          <ResponsivePicture
            desktopSrc={hero.imageUrl}
            mobileSrc={hero.mobileImageUrl || hero.imageUrl}
            alt={hero.title || "Kaos Polos DEBRODER"}
            className="absolute inset-0 h-full w-full object-cover"
            priority
            objectFit={hero.objectFit || "cover"}
            desktopObjectPosition={hero.objectPosition}
            mobileObjectPosition={hero.mobileObjectPosition}
            desktopZoom={hero.imageZoom}
            mobileZoom={hero.mobileImageZoom}
          />
        </section>
      ) : null}

      <section
        data-kaos-blueprint-section="quick-category"
        className="kaos-blueprint-intro-section"
      >
        <div className="section-shell">
          <div className="kaos-category-intro-content">
            <div className="min-w-0">
              {hero.label ? <p className="kaos-blueprint-eyebrow">{hero.label}</p> : null}
              <h1 className="kaos-category-title">Kaos Polos</h1>
              {hero.description || (hero.title && hero.title.toLowerCase() !== "kaos polos") ? (
                <p className="kaos-category-subcopy">
                  {hero.description || hero.title}
                </p>
              ) : null}
            </div>
            {hero.ctaText && hero.ctaHref ? (
              <Link href={hero.ctaHref} className="kaos-category-cms-cta">
                {hero.ctaText}
              </Link>
            ) : null}
          </div>

          <nav className="kaos-category-type-nav" aria-label="Pilih tipe kaos">
            <Link
              href={kaosTypeFilterHref("all", filters)}
              aria-current={filters.productType === "all" ? "page" : undefined}
              className="kaos-category-type-link"
            >
              Semua
            </Link>
            {quickTypes.map((option) => (
              <Link
                key={option.value}
                href={kaosTypeFilterHref(option.value, filters)}
                aria-current={filters.productType === option.value ? "page" : undefined}
                className="kaos-category-type-link"
              >
                {option.label}
              </Link>
            ))}
          </nav>
        </div>
      </section>

      <section
        id="catalog"
        data-kaos-blueprint-section="catalog"
        className="kaos-blueprint-catalog-section scroll-mt-24"
        aria-labelledby="kaos-catalog-heading"
      >
        <div className="section-shell">
          <h2 id="kaos-catalog-heading" className="sr-only">
            Produk kaos polos
          </h2>
          <div>
            <ProductCatalog
              key={`${filters.productType}|${filters.color}|${filters.size}|${filters.price}|${filters.status}|${filters.label}|${filters.sort}`}
              products={products}
              title="Kaos Polos"
              showCategoryFilter={false}
              initialColor={filters.color}
              initialSize={filters.size}
              initialPrice={filters.price}
              initialLabel={filters.label}
              initialSort={filters.sort}
              initialProductType={filters.productType}
              initialStatus={filters.status}
              productTypeOptions={productTypeOptions}
              typeFilterLabel="Semua tipe kaos"
              showStatusFilter
              showSizeFilter
              catalogStyle="category"
              catalogLayout="kaos-editorial"
              syncUrlState
            />
          </div>
        </div>
      </section>

      {featured.length ? (
        <section
          data-kaos-blueprint-section="featured"
          className="kaos-blueprint-section"
          aria-labelledby="kaos-featured-heading"
        >
          <div className="section-shell">
            <h2
              id="kaos-featured-heading"
              className="kaos-blueprint-section-label kaos-blueprint-heading-normal"
            >
              Featured
            </h2>
            <div className="kaos-blueprint-feature-grid mt-6 grid sm:grid-cols-2 lg:mt-8">
              {featured.map((campaign) => (
                <FeaturedEditorialCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {bannerLeft && bannerRight ? (
        <section
          data-kaos-blueprint-section="campaign"
          className="kaos-blueprint-campaign-section"
        >
          <div className="section-shell">
            <EditorialBanner
              left={bannerLeft}
              right={bannerRight}
              customHref={customHref}
            />
          </div>
        </section>
      ) : null}

      <section
        data-kaos-blueprint-section="custom-cta"
        className="kaos-blueprint-custom-section"
        aria-labelledby="kaos-custom-heading"
      >
        <div className="section-shell kaos-custom-cta-content">
          <div>
            <h2 id="kaos-custom-heading">BUTUH KAOS CUSTOM?</h2>
            <p>Pilih bahan, cetak desain, dan produksi bersama DEBRODER.</p>
          </div>
          <Link href={customHref}>Mulai Custom</Link>
        </div>
      </section>
    </div>
  );
}
