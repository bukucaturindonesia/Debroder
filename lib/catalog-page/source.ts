import type { ProductReadSource } from "@/lib/product-read/source";

export type CatalogPageHeroRow = {
  page_key: string;
  label: string | null;
  title: string | null;
  subtitle: string | null;
  image_url: string | null;
  mobile_image_url: string | null;
  object_position: string | null;
  mobile_object_position: string | null;
  object_fit: "cover" | "contain" | null;
  focal_zoom: number | null;
  mobile_focal_zoom: number | null;
  primary_cta_label: string | null;
  primary_cta_url: string | null;
  secondary_cta_label: string | null;
  secondary_cta_url: string | null;
};

export type CatalogCategoryRow = {
  id: string | null;
  name: string;
  slug: string;
  is_active: boolean;
  sort_order: number;
};

export type CatalogPageSource = {
  routeKey: string;
  status: "ready" | "empty" | "unavailable";
  hero: CatalogPageHeroRow | null;
  category: CatalogCategoryRow | null;
  productSource: ProductReadSource;
  customDestination: string | null;
};
