import { CategoryCommerceCatalog } from "@/components/CategoryCommerceCatalog";
import { PageHero, PublicShell } from "@/components/PublicPage";
import type { CatalogPageModel } from "@/lib/catalog-page/model";
import type { ProductTypeOption } from "@/lib/product-taxonomy";


export type CategoryCommercePageConfig = {
  pageKey: string;
  breadcrumbLabel: string;
  eyebrow: string;
  catalogTitle: string;
  catalogDescription: string;
  closingHeadline: string;
  closingCtaLabel: string;
  closingCtaHref: string;
  productTypeOptions?: ProductTypeOption[];
  typeFilterLabel?: string;
};

export function CategoryCommercePage({
  model,
  config
}: {
  model: CatalogPageModel;
  config: CategoryCommercePageConfig;
}) {
  const { hero, products, filters } = model.data;

  return (
    <PublicShell>
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
        breadcrumbs={[{ label: "Beranda", href: "/" }, { label: config.breadcrumbLabel }]}
      />
      <CategoryCommerceCatalog
        products={products}
        eyebrow={config.eyebrow}
        title={config.catalogTitle}
        description={config.catalogDescription}
        closingHeadline={config.closingHeadline}
        closingCtaLabel={config.closingCtaLabel}
        closingCtaHref={config.closingCtaHref}
        productTypeOptions={config.productTypeOptions}
        typeFilterLabel={config.typeFilterLabel}
        initialColor={filters.color}
        initialLabel={filters.label}
        initialSort={filters.sort}
        initialProductType={filters.productType}
      />
    </PublicShell>
  );
}
