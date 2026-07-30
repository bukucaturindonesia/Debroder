import Link from "next/link";
import { ProductCatalog } from "@/components/ProductCatalog";
import { PublicProductCard, productDetailHref } from "@/components/PublicProductCard";
import { SafeImage } from "@/components/SafeImage";
import type {
  CatalogPageCampaignViewModel,
  CatalogPageModel
} from "@/lib/catalog-page/model";
import {
  canonicalProductEditorialImage,
  kaosColorDiscovery,
  kaosEditorialProducts,
  kaosFeaturedProducts,
  kaosNeedDiscovery
} from "@/lib/kaos-polos-editorial";
import { matchesProductType } from "@/lib/product-taxonomy";

const PAGE_PATH = "/kaos-polos";

function campaignOfType(
  campaigns: CatalogPageCampaignViewModel[],
  ...types: string[]
) {
  return campaigns.find((campaign) => types.includes(campaign.sectionType));
}

function EditorialCampaign({
  campaign,
  className = ""
}: {
  campaign: CatalogPageCampaignViewModel;
  className?: string;
}) {
  const href = campaign.ctaHref || `${PAGE_PATH}#catalog`;

  return (
    <Link
      href={href}
      className={`kaos-editorial-campaign group relative block overflow-hidden bg-[#ecece8] ${className}`.trim()}
    >
      <picture>
        {campaign.mobileImageUrl ? (
          <source media="(max-width: 767px)" srcSet={campaign.mobileImageUrl} />
        ) : null}
        <SafeImage
          src={campaign.imageUrl}
          alt={campaign.imageAlt || campaign.title || campaign.name}
          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
          sizes="100vw"
          objectPosition={campaign.objectPosition}
        />
      </picture>
      <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
      <span className="absolute inset-x-0 bottom-0 z-10 block p-5 text-white sm:p-7">
        {campaign.eyebrow ? (
          <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-white/75">
            {campaign.eyebrow}
          </span>
        ) : null}
        {campaign.title ? (
          <span className="mt-2 block max-w-2xl text-2xl font-semibold leading-tight sm:text-4xl">
            {campaign.title}
          </span>
        ) : null}
        {campaign.description ? (
          <span className="mt-2 block max-w-xl text-sm leading-6 text-white/80">
            {campaign.description}
          </span>
        ) : null}
        <span className="kaos-editorial-media-cta mt-4 inline-flex min-h-9 items-center bg-white px-4 text-xs font-semibold text-black">
          {campaign.ctaLabel || "Jelajahi"}
        </span>
      </span>
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
  const spotlight = editorialProducts.slice(0, 6);
  const needDiscovery = kaosNeedDiscovery(products, productTypeOptions);
  const colorDiscovery = kaosColorDiscovery(products);
  const availableTypes = productTypeOptions.filter((option) =>
    editorialProducts.some((product) =>
      matchesProductType(product, option.value, productTypeOptions)
    )
  );
  const splitCampaign = campaignOfType(
    campaigns,
    "split_campaign",
    "catalog_campaign"
  );
  const wideCampaign = campaignOfType(campaigns, "wide_campaign");
  const editorialRail = campaigns.filter((campaign) =>
    ["poster_carousel", "closing_campaign"].includes(campaign.sectionType)
  );
  const productEditorial = editorialProducts.find((product) =>
    Boolean(canonicalProductEditorialImage(product))
  );
  const catalogCampaign = splitCampaign || (
    productEditorial
      ? {
          id: `product-${productEditorial.id || productEditorial.slug || productEditorial.nama}`,
          name: productEditorial.nama,
          imageUrl: canonicalProductEditorialImage(productEditorial),
          mobileImageUrl: null,
          eyebrow: "Pilihan Kaos Polos",
          title: productEditorial.nama,
          description: productEditorial.short_detail || productEditorial.public_description || "",
          ctaLabel: "Lihat Produk",
          ctaHref: productDetailHref(productEditorial),
          sectionType: "pim_product_editorial",
          sectionGroup: "catalog",
          imageAlt: productEditorial.image_alt || productEditorial.nama,
          objectPosition: productEditorial.object_position || "center center",
          mobileObjectPosition: productEditorial.object_position || "center center",
          sortOrder: productEditorial.urutan
        }
      : null
  );
  const customHref = customDestination || "/custom";

  return (
    <div className="kaos-editorial-page bg-white text-[#111]">
      <nav
        aria-label="Navigasi Kaos Polos"
        className="kaos-editorial-shortcuts border-b border-black/10 bg-white"
      >
        <div className="section-shell no-scrollbar flex min-h-14 items-center gap-6 overflow-x-auto py-2">
          <Link href={`${PAGE_PATH}#catalog`} className="shrink-0 text-sm font-semibold">
            Semua Kaos
          </Link>
          {availableTypes.map((option) => (
            <Link
              key={option.value}
              href={`${PAGE_PATH}?type=${encodeURIComponent(option.value)}#catalog`}
              className="shrink-0 text-sm text-black/65 transition hover:text-black focus-visible:text-black"
            >
              {option.label}
            </Link>
          ))}
        </div>
      </nav>

      <section className="kaos-editorial-hero relative overflow-hidden bg-[#e7e7e2]">
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
        <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-black/68 via-black/26 to-transparent" />
        <div className="section-shell relative z-10 flex min-h-[72svh] items-end py-10 text-white sm:min-h-[680px] sm:py-14 lg:min-h-[min(760px,82vh)]">
          <div className="max-w-4xl">
            <nav aria-label="Breadcrumb" className="mb-5 flex gap-2 text-xs text-white/70">
              <Link href="/" className="hover:text-white">Beranda</Link>
              <span aria-hidden="true">/</span>
              <span>Kaos Polos</span>
            </nav>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/75">
              {hero.label || "Everyday essentials"}
            </p>
            <h1 className="mt-3 text-[clamp(3rem,9vw,7.5rem)] font-semibold leading-[0.88] tracking-[-0.055em]">
              Kaos Polos
            </h1>
            {hero.title && hero.title.toLowerCase() !== "kaos polos" ? (
              <p className="mt-5 max-w-3xl text-[clamp(1.35rem,3vw,2.5rem)] font-medium leading-tight">
                {hero.title}
              </p>
            ) : null}
            {hero.description ? (
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/80 sm:text-lg">
                {hero.description}
              </p>
            ) : null}
            <Link
              href={hero.ctaHref || `${PAGE_PATH}#catalog`}
              className="mt-7 inline-flex min-h-11 items-center bg-white px-5 text-sm font-semibold text-black transition hover:bg-white/85"
            >
              {hero.ctaText || "Belanja Kaos Polos"}
            </Link>
          </div>
        </div>
      </section>

      {featured.length ? (
        <section className="kaos-editorial-section" aria-labelledby="kaos-featured-heading">
          <div className="section-shell">
            <div className="kaos-editorial-heading-row">
              <div>
                <p className="kaos-editorial-eyebrow">Featured</p>
                <h2 id="kaos-featured-heading" className="kaos-editorial-title">
                  Pilihan untuk setiap hari
                </h2>
              </div>
              <Link href={`${PAGE_PATH}#catalog`} className="kaos-editorial-text-link">
                Lihat semua
              </Link>
            </div>
            <div className="mt-7 grid gap-3 sm:grid-cols-2 sm:gap-4">
              {featured.map(({ product, imageUrl, imageAlt }) => (
                <Link
                  key={product.id || product.slug || product.nama}
                  href={productDetailHref(product)}
                  className="kaos-editorial-feature group relative aspect-[4/5] overflow-hidden bg-[#ecece8] sm:aspect-[5/6]"
                >
                  <SafeImage
                    src={imageUrl}
                    alt={imageAlt}
                    className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                    sizes="(min-width: 640px) 50vw, 100vw"
                    objectFit={product.object_fit}
                    objectPosition={product.object_position}
                  />
                  <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
                  <span className="absolute inset-x-0 bottom-0 z-10 block p-5 text-white sm:p-7">
                    <span className="block text-2xl font-semibold">{product.nama}</span>
                    <span className="kaos-editorial-media-cta mt-4 inline-flex min-h-9 items-center bg-white px-4 text-xs font-semibold text-black">
                      Lihat Produk
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {spotlight.length ? (
        <section className="kaos-editorial-section border-t border-black/10" aria-labelledby="kaos-spotlight-heading">
          <div className="section-shell">
            <div className="kaos-editorial-heading-row">
              <div>
                <p className="kaos-editorial-eyebrow">Product spotlight</p>
                <h2 id="kaos-spotlight-heading" className="kaos-editorial-title">
                  Temukan kaos yang pas
                </h2>
              </div>
            </div>
            <div className="mt-7 grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-4 md:grid-cols-3 lg:grid-cols-6">
              {spotlight.map((product) => (
                <PublicProductCard
                  key={product.id || product.slug || product.nama}
                  product={product}
                  imageSizes="(min-width: 1024px) 17vw, (min-width: 768px) 33vw, 50vw"
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {wideCampaign ? (
        <section className="kaos-editorial-wide-section">
          <div className="section-shell">
            <EditorialCampaign campaign={wideCampaign} className="aspect-[4/5] sm:aspect-[16/7]" />
          </div>
        </section>
      ) : null}

      <section className="kaos-editorial-copy-section border-y border-black/10 bg-[#f5f5f2]">
        <div className="section-shell py-14 text-center sm:py-20">
          <p className="kaos-editorial-eyebrow">Buat sesuai identitasmu</p>
          <h2 className="mx-auto mt-3 max-w-4xl text-[clamp(2rem,5vw,4.5rem)] font-semibold leading-[0.98] tracking-[-0.045em]">
            Kaos polos adalah awal. Jadikan milikmu.
          </h2>
          <Link href={customHref} className="mt-7 inline-flex min-h-11 items-center bg-black px-5 text-sm font-semibold text-white">
            Mulai Pesanan Custom
          </Link>
        </div>
      </section>

      {needDiscovery.length ? (
        <section className="kaos-editorial-section" aria-labelledby="kaos-need-heading">
          <div className="section-shell">
            <p className="kaos-editorial-eyebrow">Shop by need</p>
            <h2 id="kaos-need-heading" className="kaos-editorial-title">
              Pilih berdasarkan kebutuhan
            </h2>
            <div className="mt-7 grid gap-3 sm:grid-cols-3 sm:gap-4">
              {needDiscovery.map(({ imageUrl, option, product }) => (
                <Link
                  key={option.value}
                  href={`${PAGE_PATH}?type=${encodeURIComponent(option.value)}#catalog`}
                  className="group"
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-[#ecece8]">
                    <SafeImage
                      src={imageUrl}
                      alt={`${option.label} — ${product.nama}`}
                      className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                      sizes="(min-width: 640px) 33vw, 100vw"
                      objectFit={product.object_fit}
                      objectPosition={product.object_position}
                    />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{option.label}</h3>
                  <span className="mt-2 inline-flex text-sm underline underline-offset-4">Jelajahi</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {colorDiscovery.length ? (
        <section className="kaos-editorial-section border-y border-black/10 bg-[#f5f5f2]" aria-labelledby="kaos-color-heading">
          <div className="section-shell">
            <p className="kaos-editorial-eyebrow">Shop by color</p>
            <h2 id="kaos-color-heading" className="kaos-editorial-title">
              Warna yang tersedia
            </h2>
            <div className="no-scrollbar mt-7 flex snap-x gap-3 overflow-x-auto pb-2 sm:gap-4">
              {colorDiscovery.map((item) => (
                <Link
                  key={item.slug}
                  href={`${PAGE_PATH}?color=${encodeURIComponent(item.slug)}#catalog`}
                  className="group w-[42vw] min-w-[9rem] max-w-[13rem] shrink-0 snap-start"
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-white">
                    <SafeImage
                      src={item.imageUrl}
                      alt={item.imageAlt}
                      className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                      sizes="208px"
                    />
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    {item.hex ? (
                      <span
                        aria-hidden="true"
                        className="h-3.5 w-3.5 rounded-full border border-black/15"
                        style={{ backgroundColor: item.hex }}
                      />
                    ) : null}
                    <span className="text-sm font-semibold">{item.name}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section id="catalog" className="kaos-editorial-section scroll-mt-24" aria-labelledby="kaos-catalog-heading">
        <div className="section-shell">
          <div className="max-w-3xl">
            <p className="kaos-editorial-eyebrow">Katalog</p>
            <h2 id="kaos-catalog-heading" className="kaos-editorial-title">
              Semua Kaos Polos
            </h2>
          </div>
          <div className="mt-7">
            <ProductCatalog
              key={`${filters.productType}|${filters.color}|${filters.size}|${filters.price}|${filters.status}|${filters.label}|${filters.sort}`}
              products={products}
              title="Semua Kaos Polos"
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
              editorialCampaign={catalogCampaign}
              syncUrlState
            />
          </div>
        </div>
      </section>

      <nav aria-label="Direktori kategori terkait" className="border-y border-black/10 bg-[#f5f5f2]">
        <div className="section-shell py-10 sm:py-12">
          <h2 className="text-xl font-semibold">Jelajahi lebih lanjut</h2>
          <div className="mt-5 flex flex-wrap gap-x-7 gap-y-4 text-sm">
            <Link href="/koleksi" className="underline underline-offset-4">Semua Koleksi</Link>
            <Link href="/custom" className="underline underline-offset-4">Custom Apparel</Link>
            <Link href="/sablon-dtf" className="underline underline-offset-4">Sablon DTF</Link>
            <Link href="/cetak-sublim" className="underline underline-offset-4">Cetak Sublim</Link>
          </div>
        </div>
      </nav>

      {editorialRail.length ? (
        <section className="kaos-editorial-section" aria-labelledby="kaos-editorial-rail-heading">
          <div className="section-shell">
            <h2 id="kaos-editorial-rail-heading" className="kaos-editorial-title">
              Cerita pilihan
            </h2>
            <div className="no-scrollbar mt-7 flex snap-x gap-4 overflow-x-auto pb-2">
              {editorialRail.map((campaign) => (
                <EditorialCampaign
                  key={campaign.id}
                  campaign={campaign}
                  className="aspect-[4/5] w-[82vw] max-w-[32rem] shrink-0 snap-start"
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
