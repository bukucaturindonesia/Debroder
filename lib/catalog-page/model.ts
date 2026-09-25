import type { PageViewModel } from "@/lib/contracts/page-view-model";
import type { ProductTypeOption } from "@/lib/product-taxonomy";
import type { Product } from "@/lib/types";

export type CatalogPageState = "loading" | "ready" | "empty" | "unavailable";
export type CatalogSortValue = "order" | "newest" | "best-selling" | "price-low" | "price-high";
export type CatalogLabelValue = "all" | "new" | "promo" | "best";

export type CatalogPageHeroViewModel = {
  label?: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  mobileImageUrl?: string;
  objectPosition?: string;
  mobileObjectPosition?: string;
  objectFit?: "cover" | "contain";
  imageZoom?: number | null;
  mobileImageZoom?: number | null;
  ctaText?: string;
  ctaHref?: string;
  secondaryCtaText?: string;
  secondaryCtaHref?: string;
};

export type CatalogPageFiltersViewModel = {
  query: string;
  color: string;
  size: string;
  price: string;
  label: CatalogLabelValue;
  sort: CatalogSortValue;
  productType: string;
  status: string;
};

export type CatalogPageCampaignViewModel = {
  id: string;
  name: string;
  imageUrl: string;
  mobileImageUrl: string | null;
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  sectionType: string;
  sectionGroup: string;
  imageAlt: string;
  objectPosition: string;
  mobileObjectPosition: string;
  sortOrder: number;
};

export type CatalogPageData = {
  state: CatalogPageState;
  routeKey: string;
  hero: CatalogPageHeroViewModel;
  campaigns: CatalogPageCampaignViewModel[];
  products: Product[];
  customDestination: string | null;
  filters: CatalogPageFiltersViewModel;
  productTypeOptions: ProductTypeOption[];
  journeyAvailability: Readonly<{ readyStock: boolean; custom: boolean; hybrid: boolean }>;
  warningCode: string | null;
};

export type CatalogPageModel = PageViewModel<"public-catalog", CatalogPageData>;
