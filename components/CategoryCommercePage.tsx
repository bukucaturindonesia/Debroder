import { CategoryCommerceCatalog } from "@/components/CategoryCommerceCatalog";
import { CategoryHero } from "@/components/public/CategoryHero";
import { PublicShell } from "@/components/PublicPage";
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

  return (
    <PublicShell>
      <div className={`category-commerce-v1 category-commerce-${config.pageKey}`}>
        <CategoryHero seoTitle={config.breadcrumbLabel} alt={config.breadcrumbLabel} desktopImage={hero.imageUrl} mobileImage={hero.mobileImageUrl} objectPosition={hero.objectPosition} mobileObjectPosition={hero.mobileObjectPosition} objectFit={hero.objectFit} imageZoom={hero.imageZoom} mobileImageZoom={hero.mobileImageZoom} />
        <CategoryCommerceCatalog
          products={products}
          campaigns={model.data.campaigns}
          pagePath={pagePath}
          shortcutLabel={shortcutLabel}
          title={config.catalogTitle}
          description={config.catalogDescription}
          closingHeadline={config.closingHeadline}
          closingCtaLabel={config.closingCtaLabel}
          closingCtaHref={config.closingCtaHref}
          productTypeOptions={config.productTypeOptions}
          typeFilterLabel={config.typeFilterLabel}
          seoLinks={config.seoLinks}
          initialQuery={filters.query}
          initialColor={filters.color}
          initialLabel={filters.label}
          initialSort={filters.sort}
          initialProductType={filters.productType}
        />
      </div>
    </PublicShell>
  );
}
