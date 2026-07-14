import { CategoryCommerceCatalog } from "@/components/CategoryCommerceCatalog";
import { PageHero, PublicShell } from "@/components/PublicPage";
import { getPageHeroImage } from "@/lib/fallback-data";
import type { ProductTypeOption } from "@/lib/product-taxonomy";
import type { PageHeroContent, Product, PublicContent } from "@/lib/types";

type SortValue = "order" | "newest" | "best-selling" | "price-low" | "price-high";
type LabelValue = "all" | "new" | "promo" | "best";

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
  content,
  products,
  config,
  initialColor = "all",
  initialLabel = "all",
  initialSort = "order",
  initialProductType = "all"
}: {
  content: PublicContent;
  products: Product[];
  config: CategoryCommercePageConfig;
  initialColor?: string;
  initialLabel?: LabelValue;
  initialSort?: SortValue;
  initialProductType?: string;
}) {
  const pageHero = content.pageHeroes.find((hero) => hero.page_key === config.pageKey) as PageHeroContent | undefined;

  return (
    <PublicShell content={content}>
      <PageHero
        label={pageHero?.label}
        title={pageHero?.title}
        description={pageHero?.subtitle}
        imageUrl={getPageHeroImage(pageHero)}
        mobileImageUrl={pageHero?.mobile_image_url}
        objectPosition={pageHero?.object_position}
        mobileObjectPosition={pageHero?.mobile_object_position}
        objectFit={pageHero?.object_fit}
        imageZoom={pageHero?.focal_zoom}
        mobileImageZoom={pageHero?.mobile_focal_zoom}
        ctaText={pageHero?.primary_cta_label}
        ctaHref={pageHero?.primary_cta_url}
        secondaryCtaText={pageHero?.secondary_cta_label}
        secondaryCtaHref={pageHero?.secondary_cta_url}
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
        initialColor={initialColor}
        initialLabel={initialLabel}
        initialSort={initialSort}
        initialProductType={initialProductType}
      />
    </PublicShell>
  );
}
