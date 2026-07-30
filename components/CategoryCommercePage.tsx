import { CategoryCommerceCatalog } from "@/components/CategoryCommerceCatalog";
import { PageHero, PublicShell } from "@/components/PublicPage";
import type { CatalogPageModel } from "@/lib/catalog-page/model";
import type { ProductTypeOption } from "@/lib/product-taxonomy";

export type CategoryCommercePageConfig = {
  pageKey: string;
  pagePath?: string;
  breadcrumbLabel: string;
  eyebrow?: string;
  shortcutLabel?: string;
  typeDiscoveryTitle?: string;
  typeDiscoveryDescription?: string;
  colorDiscoveryTitle?: string;
  newArrivalsTitle?: string;
  catalogTitle: string;
  catalogDescription: string;
  closingHeadline: string;
  closingCtaLabel: string;
  closingCtaHref: string;
  productTypeOptions?: ProductTypeOption[];
  typeFilterLabel?: string;
  seoLinks?: Array<{ label: string; href: string }>;
};

export function CategoryCommercePage({
  model,
  config
}: {
  model: CatalogPageModel;
  config: CategoryCommercePageConfig;
}) {
  const { hero, products, filters } = model.data;
  const pagePath = config.pagePath || `/${config.pageKey}`;
  const shortcutLabel = config.shortcutLabel || `Navigasi ${config.breadcrumbLabel}`;
  const typeDiscoveryTitle =
    config.typeDiscoveryTitle || `Pilih ${config.breadcrumbLabel.toLowerCase()} berdasarkan model`;
  const typeDiscoveryDescription =
    config.typeDiscoveryDescription || config.catalogDescription;
  const colorDiscoveryTitle =
    config.colorDiscoveryTitle || "Pilih berdasarkan warna";
  const newArrivalsTitle =
    config.newArrivalsTitle || "Produk terbaru";

  return (
    <PublicShell>
      <div className={`category-commerce-v1 category-commerce-${config.pageKey}`}>
        <PageHero
          label={hero.label}
          title={hero.title}
          description={hero.description}
          imageUrl={hero.imageUrl}
          mobileImageUrl={hero.mobileImageUrl}
          objectPosition={hero.objectPosition}
          mobileObjectPosition={hero.mobileObjectPosition}
          objectFit={hero.objectFit}
          imageZoom={hero.imageZoom}
          mobileImageZoom={hero.mobileImageZoom}
          ctaText={hero.ctaText}
          ctaHref={hero.ctaHref}
          secondaryCtaText={hero.secondaryCtaText}
          secondaryCtaHref={hero.secondaryCtaHref}
          contentPosition="lower"
          variant="category"
          breadcrumbs={[{ label: "Beranda", href: "/" }, { label: config.breadcrumbLabel }]}
        />
        <CategoryCommerceCatalog
          products={products}
          pagePath={pagePath}
          shortcutLabel={shortcutLabel}
          typeDiscoveryTitle={typeDiscoveryTitle}
          typeDiscoveryDescription={typeDiscoveryDescription}
          colorDiscoveryTitle={colorDiscoveryTitle}
          newArrivalsTitle={newArrivalsTitle}
          title={config.catalogTitle}
          description={config.catalogDescription}
          closingHeadline={config.closingHeadline}
          closingCtaLabel={config.closingCtaLabel}
          closingCtaHref={config.closingCtaHref}
          productTypeOptions={config.productTypeOptions}
          typeFilterLabel={config.typeFilterLabel}
          seoLinks={config.seoLinks}
          initialColor={filters.color}
          initialLabel={filters.label}
          initialSort={filters.sort}
          initialProductType={filters.productType}
        />
      </div>
    </PublicShell>
  );
}
