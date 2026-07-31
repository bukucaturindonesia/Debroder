import Link from "next/link";
import { ProductCatalog } from "@/components/ProductCatalog";
import { productDetailHref } from "@/components/PublicProductCard";
import { SafeImage } from "@/components/SafeImage";
import type {
  CatalogPageCampaignViewModel,
  CatalogPageModel
} from "@/lib/catalog-page/model";
import {
  canonicalProductEditorialImage,
  kaosEditorialProducts,
  kaosFeaturedProducts,
  kaosNeedDiscovery
} from "@/lib/kaos-polos-editorial";

const PAGE_PATH = "/kaos-polos";

function campaignOfType(
  campaigns: CatalogPageCampaignViewModel[],
  ...types: string[]
) {
  return campaigns.find((campaign) => types.includes(campaign.sectionType));
}

function BlueprintBanner({
  campaign
}: {
  campaign: CatalogPageCampaignViewModel;
}) {
  return (
    <Link
      href={campaign.ctaHref || `${PAGE_PATH}#catalog`}
      aria-label={campaign.ctaLabel || campaign.title || campaign.name}
      className="kaos-blueprint-banner group relative block overflow-hidden bg-[#ecece8]"
    >
      <picture>
        {campaign.mobileImageUrl ? (
          <source media="(max-width: 767px)" srcSet={campaign.mobileImageUrl} />
        ) : null}
        <SafeImage
          src={campaign.imageUrl}
          alt={campaign.imageAlt || campaign.title || campaign.name}
          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.015]"
          sizes="100vw"
          objectPosition={campaign.objectPosition}
        />
      </picture>
    </Link>
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

  const editorialProducts = kaosEditorialProducts(products);
  const featured = kaosFeaturedProducts(products);
  const categoryCards = kaosNeedDiscovery(products, productTypeOptions, 8);
  const splitCampaign = campaignOfType(
    campaigns,
    "split_campaign",
    "catalog_campaign"
  );
  const wideCampaign = campaignOfType(campaigns, "wide_campaign");
  const productEditorial = editorialProducts.find((product) =>
    Boolean(canonicalProductEditorialImage(product))
  );
  const productCampaign: CatalogPageCampaignViewModel | null = productEditorial
    ? {
        id: `product-${productEditorial.id || productEditorial.slug || productEditorial.nama}`,
        name: productEditorial.nama,
        imageUrl: canonicalProductEditorialImage(productEditorial),
        mobileImageUrl: null,
        eyebrow: "Buat sesuai identitasmu",
        title: "Kaos polos adalah awal. Jadikan milikmu.",
        description:
          productEditorial.short_detail ||
          productEditorial.public_description ||
          "Pilih kaos polos yang tepat untuk dipakai langsung atau dikembangkan menjadi identitas brand, komunitas, dan timmu.",
        ctaLabel: "Mulai Pesanan Custom",
        ctaHref: customDestination || "/custom",
        sectionType: "pim_product_editorial",
        sectionGroup: "kaos-polos",
        imageAlt: productEditorial.image_alt || productEditorial.nama,
        objectPosition: productEditorial.object_position || "center center",
        mobileObjectPosition: productEditorial.object_position || "center center",
        sortOrder: productEditorial.urutan
      }
    : null;
  const bannerCampaign = wideCampaign || splitCampaign || productCampaign;
  const campaignHref = bannerCampaign?.ctaHref || customDestination || "/custom";
  const heroHasImage = Boolean(hero.imageUrl);

  return (
    <div className="kaos-editorial-page bg-white text-[#111]">
      <section
        data-kaos-blueprint-section="hero"
        className="kaos-blueprint-hero relative overflow-hidden bg-[#deded9]"
      >
        {hero.imageUrl ? (
          <picture>
            {hero.mobileImageUrl ? (
              <source media="(max-width: 767px)" srcSet={hero.mobileImageUrl} />
            ) : null}
            <SafeImage
              src={hero.imageUrl}
              alt={hero.title || "Kaos Polos DEBRODER"}
              className="absolute inset-0 h-full w-full object-cover"
              sizes="100vw"
              priority
              objectFit={hero.objectFit}
              objectPosition={hero.objectPosition}
              zoom={hero.imageZoom}
            />
          </picture>
        ) : null}
        {heroHasImage ? (
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent"
          />
        ) : null}

        <div
          className={`section-shell relative z-10 flex h-full items-end justify-center pb-12 text-center sm:pb-16 lg:pb-20 ${
            heroHasImage ? "text-white" : "text-black"
          }`}
        >
          <div className="max-w-5xl">
            <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${heroHasImage ? "text-white/75" : "text-black/55"}`}>
              {hero.label || "Everyday essentials"}
            </p>
            <h1 className="mt-3 text-[clamp(3.25rem,8.5vw,8.75rem)] font-semibold leading-[0.86] tracking-[-0.06em]">
              Kaos Polos
            </h1>
            {hero.title && hero.title.toLowerCase() !== "kaos polos" ? (
              <p className="mx-auto mt-5 max-w-4xl text-[clamp(1.5rem,3.2vw,3rem)] font-semibold leading-[1.02] tracking-[-0.035em]">
                {hero.title}
              </p>
            ) : null}
            {hero.description ? (
              <p className={`mx-auto mt-4 max-w-2xl text-sm leading-6 sm:text-base sm:leading-7 ${heroHasImage ? "text-white/80" : "text-black/65"}`}>
                {hero.description}
              </p>
            ) : null}
            <Link
              href={hero.ctaHref || `${PAGE_PATH}#catalog`}
              className={`mt-6 inline-flex min-h-11 items-center justify-center px-5 text-sm font-semibold transition ${
                heroHasImage
                  ? "bg-white text-black hover:bg-white/85"
                  : "bg-black text-white hover:bg-black/80"
              }`}
            >
              {hero.ctaText || "Jelajahi"}
            </Link>
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
            <h2 id="kaos-featured-heading" className="kaos-blueprint-section-label">
              Featured
            </h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:mt-8">
              {featured.map(({ product, imageUrl, imageAlt }) => (
                <Link
                  key={product.id || product.slug || product.nama}
                  href={productDetailHref(product)}
                  className="kaos-blueprint-feature group relative overflow-hidden bg-[#ecece8]"
                >
                  <SafeImage
                    src={imageUrl}
                    alt={imageAlt}
                    className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.015]"
                    sizes="(min-width: 640px) 50vw, 100vw"
                    objectFit={product.object_fit}
                    objectPosition={product.object_position}
                  />
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"
                  />
                  <span className="absolute inset-x-0 bottom-0 z-10 block p-5 text-white sm:p-7 lg:p-8">
                    <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-white/75">
                      {product.subcategory || product.kategori || "Kaos Polos"}
                    </span>
                    <span className="mt-2 block text-2xl font-semibold leading-tight sm:text-3xl">
                      {product.nama}
                    </span>
                    <span className="mt-4 inline-flex min-h-10 items-center bg-black px-4 text-xs font-semibold text-white">
                      Pesan Sekarang
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {bannerCampaign ? (
        <section
          data-kaos-blueprint-section="campaign"
          className="kaos-blueprint-campaign-section"
        >
          <div className="section-shell">
            <BlueprintBanner campaign={bannerCampaign} />
            <div className="kaos-blueprint-campaign-copy mx-auto max-w-5xl text-center">
              {bannerCampaign.eyebrow ? (
                <p className="kaos-blueprint-eyebrow">{bannerCampaign.eyebrow}</p>
              ) : null}
              <h2 className="mt-3 text-[clamp(2.25rem,5vw,5rem)] font-semibold leading-[0.94] tracking-[-0.05em]">
                {bannerCampaign.title || "Kaos polos adalah awal. Jadikan milikmu."}
              </h2>
              {bannerCampaign.description ? (
                <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-black/60 sm:text-base sm:leading-7">
                  {bannerCampaign.description}
                </p>
              ) : null}
              <Link
                href={campaignHref}
                className="mt-6 inline-flex min-h-11 items-center justify-center bg-black px-5 text-sm font-semibold text-white transition hover:bg-black/80"
              >
                {bannerCampaign.ctaLabel || "Shop"}
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {categoryCards.length ? (
        <section
          data-kaos-blueprint-section="categories"
          className="kaos-blueprint-section"
          aria-labelledby="kaos-category-heading"
        >
          <div className="section-shell">
            <h2 id="kaos-category-heading" className="kaos-blueprint-section-label">
              Berdasarkan Kategori
            </h2>
            <div className="kaos-blueprint-category-rail no-scrollbar mt-6">
              {categoryCards.map(({ imageUrl, option, product }) => (
                <Link
                  key={option.value}
                  href={`${PAGE_PATH}?type=${encodeURIComponent(option.value)}#catalog`}
                  className="kaos-blueprint-category-card group relative snap-start overflow-hidden bg-[#ecece8]"
                >
                  <SafeImage
                    src={imageUrl}
                    alt={`${option.label} — ${product.nama}`}
                    className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.015]"
                    sizes="(min-width: 1024px) 31vw, (min-width: 640px) 44vw, 78vw"
                    objectFit={product.object_fit}
                    objectPosition={product.object_position}
                  />
                  <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                  <span className="absolute inset-x-0 bottom-0 z-10 block p-4 text-white sm:p-5">
                    <span className="block text-xl font-semibold leading-tight">{option.label}</span>
                    <span className="mt-3 inline-flex min-h-9 items-center bg-white px-4 text-xs font-semibold text-black">
                      Jelajahi
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section
        id="catalog"
        data-kaos-blueprint-section="catalog"
        className="kaos-blueprint-catalog-section scroll-mt-24"
        aria-labelledby="kaos-catalog-heading"
      >
        <div className="section-shell">
          <h2 id="kaos-catalog-heading" className="kaos-blueprint-section-label">
            Kaos Polos
          </h2>
          <div className="mt-5 lg:mt-7">
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
    </div>
  );
}
