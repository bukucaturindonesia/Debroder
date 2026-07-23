import { CONTRACT_VERSIONS } from "@/lib/contracts/version";
import { fallbackContent } from "@/lib/fallback-data";
import { productTypeValue, type ProductTypeOption } from "@/lib/product-taxonomy";
import { productsForCategoryRoute } from "@/lib/product-route-matching";
import { projectProductSource } from "@/lib/product-read/domain";
import type { ProductCategory } from "@/lib/types";
import type {
  CatalogLabelValue,
  CatalogPageFiltersViewModel,
  CatalogPageModel,
  CatalogSortValue
} from "./model";
import type { CatalogPageSource } from "./source";

export type CatalogPageInput = {
  routeKey: string;
  productTypeOptions?: ProductTypeOption[];
  scope?: "route" | "all";
  searchParams?: {
    color?: string | string[];
    status?: string | string[];
    label?: string | string[];
    sort?: string | string[];
    type?: string | string[];
  };
};

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function normalized(value: string | undefined, fallback: string) {
  const result = (value || fallback)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return result || fallback;
}

function labelValue(value?: string | string[]): CatalogLabelValue {
  const label = normalized(firstParam(value), "all");
  return label === "new" || label === "promo" || label === "best" ? label : "all";
}

function sortValue(value?: string | string[]): CatalogSortValue {
  const sort = normalized(firstParam(value), "order");
  return sort === "newest" || sort === "best-selling" || sort === "price-low" || sort === "price-high"
    ? sort
    : "order";
}

function filters(input: CatalogPageInput): CatalogPageFiltersViewModel {
  const params = input.searchParams || {};
  return {
    color: normalized(firstParam(params.color), "all"),
    status: normalized(firstParam(params.status), "all"),
    label: labelValue(params.label),
    sort: sortValue(params.sort),
    productType: productTypeValue(firstParam(params.type), input.productTypeOptions || []) || "all"
  };
}

function journeyAvailability(products: ReturnType<typeof projectProductSource>) {
  const states = products.map((product) => {
    const variantStock = (product.variants || []).reduce(
      (total, variant) => total + (variant.sizes || []).reduce(
        (sum, size) => sum + Math.max(0, Number(size.stock_quantity ?? size.stock ?? 0)),
        0
      ),
      0
    );
    const readyStock = Math.max(0, Number(product.stock || 0)) > 0 || variantStock > 0;
    const custom = Boolean(
      product.uses_configurator
      || product.product_type === "configurable_product"
      || product.product_type === "production_service"
      || product.pricing_mode === "configurator_based"
      || product.pricing_mode === "custom_quote"
    );
    return { readyStock, custom };
  });
  return {
    readyStock: states.some((state) => state.readyStock),
    custom: states.some((state) => state.custom),
    hybrid: states.some((state) => state.readyStock && state.custom)
  };
}

export function buildCatalogPageModel(source: CatalogPageSource, input: CatalogPageInput): CatalogPageModel {
  const allProducts = projectProductSource(source.productSource);
  const categories: ProductCategory[] = source.category
    ? [{
        id: source.category.id || undefined,
        name: source.category.name,
        slug: source.category.slug,
        description: "",
        is_active: source.category.is_active,
        sort_order: source.category.sort_order
      }]
    : [];
  const products = input.scope === "all"
    ? allProducts.filter((product) => product.status_aktif !== false)
    : productsForCategoryRoute(allProducts, categories, input.routeKey);
  const fallbackHero = fallbackContent.pageHeroes.find((hero) => hero.page_key === input.routeKey);
  const hero = source.hero || fallbackHero || null;
  const state = source.status === "unavailable"
    ? "unavailable"
    : products.length
      ? "ready"
      : "empty";

  return {
    contractVersion: CONTRACT_VERSIONS.pageViewModel,
    pageKey: "public-catalog",
    locale: "id-ID",
    metadata: { title: hero?.title || "Katalog DEBRODER" },
    breadcrumbs: [],
    data: {
      state,
      routeKey: input.routeKey,
      hero: {
        label: hero?.label || undefined,
        title: hero?.title || undefined,
        description: hero?.subtitle || undefined,
        imageUrl: hero?.image_url || undefined,
        mobileImageUrl: hero?.mobile_image_url || undefined,
        objectPosition: hero?.object_position || undefined,
        mobileObjectPosition: hero?.mobile_object_position || undefined,
        objectFit: hero?.object_fit || undefined,
        imageZoom: hero?.focal_zoom,
        mobileImageZoom: hero?.mobile_focal_zoom,
        ctaText: hero?.primary_cta_label || undefined,
        ctaHref: hero?.primary_cta_url || undefined,
        secondaryCtaText: hero?.secondary_cta_label || undefined,
        secondaryCtaHref: hero?.secondary_cta_url || undefined
      },
      products,
      customDestination: source.customDestination,
      filters: filters(input),
      productTypeOptions: input.productTypeOptions || [],
      journeyAvailability: journeyAvailability(products),
      warningCode: source.status === "unavailable" ? "catalog.read_unavailable" : null
    }
  };
}

export function buildUnavailableCatalogPageModel(input: CatalogPageInput): CatalogPageModel {
  return buildCatalogPageModel({
    routeKey: input.routeKey,
    status: "unavailable",
    hero: null,
    category: null,
    productSource: {
      products: { status: "unavailable", data: [] },
      variants: { status: "unavailable", data: [] },
      variantSizes: { status: "unavailable", data: [] },
      variantImages: { status: "unavailable", data: [] },
      sizeGuides: { status: "unavailable", data: [] }
    },
    customDestination: null
  }, input);
}
