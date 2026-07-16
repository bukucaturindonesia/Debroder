import "server-only";

import type {
  CustomCategory,
  CustomCategoryCatalog,
  CustomPersonalizationRule,
  CustomPlacement,
  CustomPreset,
  CustomPrintSize,
  CustomServiceCompatibility
} from "@/lib/custom-commerce/types";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import { listCustomServices } from "@/lib/supabase/custom-services";
import { listProducts } from "@/lib/supabase/products";
import type { PimProduct } from "@/lib/types";

const CATEGORY_SELECT = `
  id,name,slug,short_description,image_url,image_alt,entry_type,target_route,
  supports_quick_custom,supports_full_custom,price_display_mode,
  minimum_order_display,lead_time_display,source_product_category_id,
  seo_title,seo_description,sort_order,updated_at
`;

export async function listCustomCategories(): Promise<CustomCategory[]> {
  const client = getPublicSupabaseClient();
  if (!client) return [];

  const { data, error } = await client
    .from("custom_categories")
    .select(CATEGORY_SELECT)
    .eq("is_active", true)
    .eq("status", "published")
    .order("sort_order")
    .order("name");
  if (error) {
    if (isMissingCustomSchema(error.code)) return [];
    throw new Error(`Failed to load custom categories: ${error.message}`);
  }

  const categories = asRecords(data).map(mapCategory).filter(isValidCategory);
  const projectCategoryIds = categories.filter((category) => category.entryType === "project_builder").map((category) => category.id);
  if (!projectCategoryIds.length) return categories;

  const { data: mappings, error: mappingError } = await client
    .from("custom_category_products")
    .select("custom_category_id,products!inner(id,status,status_aktif)")
    .in("custom_category_id", projectCategoryIds)
    .eq("is_active", true)
    .eq("products.status", "active")
    .eq("products.status_aktif", true);
  if (mappingError) throw new Error(`Failed to validate custom categories: ${mappingError.message}`);
  const available = new Set(asRecords(mappings).map((row) => string(row.custom_category_id)));
  return categories.filter((category) => category.entryType === "jersey_configurator" || available.has(category.id));
}

export async function getCustomCategoryCatalog(slug: string): Promise<CustomCategoryCatalog | null> {
  const client = getPublicSupabaseClient();
  if (!client) return null;
  const safeSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : "";
  if (!safeSlug) return null;

  const { data: categoryData, error: categoryError } = await client
    .from("custom_categories")
    .select(CATEGORY_SELECT)
    .eq("slug", safeSlug)
    .eq("is_active", true)
    .eq("status", "published")
    .maybeSingle();
  if (categoryError) {
    if (isMissingCustomSchema(categoryError.code)) return null;
    throw new Error(`Failed to load custom category: ${categoryError.message}`);
  }
  if (!isRecord(categoryData)) return null;
  const category = mapCategory(categoryData);
  if (!isValidCategory(category)) return null;
  if (category.entryType === "jersey_configurator") {
    return { category, products: [], presets: [], services: [], placements: [], printSizes: [], compatibility: [], personalizationRules: [] };
  }

  const [mappingResult, presetResult, placementResult, printSizeResult, compatibilityResult, personalizationResult, allProducts, allServices] = await Promise.all([
    client.from("custom_category_products").select("product_id,sort_order").eq("custom_category_id", category.id).eq("is_active", true).order("sort_order"),
    client.from("custom_presets").select("id,custom_category_id,name,slug,short_description,mockup_url,mockup_alt,default_product_id,configuration_defaults,price_display_mode,minimum_order_display,lead_time_display,sort_order").eq("custom_category_id", category.id).eq("is_active", true).eq("status", "published").order("sort_order"),
    client.from("custom_placements").select("id,custom_category_id,name,slug,description,price_adjustment,sort_order").eq("custom_category_id", category.id).eq("is_active", true).order("sort_order"),
    client.from("custom_print_sizes").select("id,custom_category_id,name,slug,description,width_mm,height_mm,price_adjustment,sort_order").eq("custom_category_id", category.id).eq("is_active", true).order("sort_order"),
    client.from("custom_service_compatibilities").select("id,service_id,custom_category_id,product_id,placement_id,print_size_id").or(`custom_category_id.eq.${category.id},custom_category_id.is.null`).eq("is_active", true),
    client.from("custom_personalization_rules").select("id,custom_category_id,name,slug,pricing_type,unit_price,flat_price,estimated_min_price,estimated_max_price,quote_required,sort_order").eq("custom_category_id", category.id).eq("is_active", true).order("sort_order"),
    listProducts({ allowFallback: false }),
    listCustomServices({ allowFallback: false })
  ]);

  const queryErrors = [mappingResult, presetResult, placementResult, printSizeResult, compatibilityResult, personalizationResult]
    .map((result) => result.error)
    .filter(Boolean);
  if (queryErrors.length) throw new Error(`Failed to load custom catalog: ${queryErrors[0]?.message}`);

  const orderedProductIds = asRecords(mappingResult.data).map((row) => string(row.product_id));
  const productsById = new Map(allProducts.map((product) => [product.id, product]));
  const products = orderedProductIds
    .map((id) => productsById.get(id))
    .filter((product): product is PimProduct => Boolean(product))
    .filter((product) => product.variants.some((variant) => variant.status === "active" && variant.sizes.some((size) => size.status === "active" && size.size.status === "active")));
  const compatibility = asRecords(compatibilityResult.data).map(mapCompatibility);
  const compatibleServiceIds = new Set(compatibility.map((rule) => rule.serviceId));
  const validProductIds = new Set(products.map((product) => product.id));

  return {
    category,
    products,
    presets: asRecords(presetResult.data).map(mapPreset).filter((preset) => !preset.defaultProductId || validProductIds.has(preset.defaultProductId)),
    services: allServices.filter((service) => compatibleServiceIds.has(service.id)),
    placements: asRecords(placementResult.data).map(mapPlacement),
    printSizes: asRecords(printSizeResult.data).map(mapPrintSize),
    compatibility,
    personalizationRules: asRecords(personalizationResult.data).map(mapPersonalizationRule)
  };
}

export async function listCustomCategoryCatalogsByIds(categoryIds: string[]): Promise<CustomCategoryCatalog[]> {
  const categories = await listCustomCategories();
  const requested = categories.filter((category) => categoryIds.includes(category.id) && category.entryType === "project_builder");
  const catalogs = await Promise.all(requested.map((category) => getCustomCategoryCatalog(category.slug)));
  return catalogs.filter((catalog): catalog is CustomCategoryCatalog => Boolean(catalog));
}

export async function getCustomDestinationForProduct(productId: string): Promise<string | null> {
  const client = getPublicSupabaseClient();
  if (!client || !/^[0-9a-f-]{36}$/i.test(productId)) return null;
  const { data, error } = await client
    .from("custom_category_products")
    .select("sort_order,custom_categories!inner(slug,entry_type,target_route,status,is_active)")
    .eq("product_id", productId)
    .eq("is_active", true)
    .eq("custom_categories.status", "published")
    .eq("custom_categories.is_active", true)
    .order("sort_order")
    .limit(1)
    .maybeSingle();
  if (error || !isRecord(data)) return null;
  const joined = firstRecord(data.custom_categories);
  if (!joined) return null;
  const entryType = string(joined.entry_type);
  const targetRoute = safeLocalRoute(joined.target_route);
  if (entryType === "jersey_configurator") return targetRoute;
  const categorySlug = string(joined.slug);
  return categorySlug ? `/custom/${categorySlug}?product=${encodeURIComponent(productId)}` : null;
}

export async function getCustomDestinationForSourceCategory(productCategoryId: string | null | undefined): Promise<string | null> {
  const client = getPublicSupabaseClient();
  if (!client || !productCategoryId || !/^[0-9a-f-]{36}$/i.test(productCategoryId)) return null;
  const { data, error } = await client.from("custom_categories")
    .select("slug,entry_type,target_route")
    .eq("source_product_category_id", productCategoryId)
    .eq("status", "published")
    .eq("is_active", true)
    .order("sort_order")
    .limit(1)
    .maybeSingle();
  if (error || !isRecord(data)) return null;
  return data.entry_type === "jersey_configurator" ? safeLocalRoute(data.target_route) : string(data.slug) ? `/custom/${string(data.slug)}` : null;
}

function mapCategory(row: Record<string, unknown>): CustomCategory {
  return {
    id: string(row.id), name: string(row.name), slug: string(row.slug),
    shortDescription: nullableString(row.short_description), imageUrl: nullableString(row.image_url), imageAlt: nullableString(row.image_alt),
    entryType: row.entry_type === "jersey_configurator" ? "jersey_configurator" : "project_builder",
    targetRoute: safeLocalRoute(row.target_route), supportsQuickCustom: boolean(row.supports_quick_custom), supportsFullCustom: boolean(row.supports_full_custom),
    priceDisplayMode: priceMode(row.price_display_mode), minimumOrderDisplay: string(row.minimum_order_display), leadTimeDisplay: string(row.lead_time_display),
    sourceProductCategoryId: nullableString(row.source_product_category_id), seoTitle: nullableString(row.seo_title), seoDescription: nullableString(row.seo_description),
    sortOrder: number(row.sort_order), updatedAt: nullableString(row.updated_at)
  };
}

function mapPreset(row: Record<string, unknown>): CustomPreset {
  return {
    id: string(row.id), categoryId: string(row.custom_category_id), name: string(row.name), slug: string(row.slug), shortDescription: nullableString(row.short_description),
    mockupUrl: nullableString(row.mockup_url), mockupAlt: nullableString(row.mockup_alt), defaultProductId: nullableString(row.default_product_id),
    configurationDefaults: isRecord(row.configuration_defaults) ? row.configuration_defaults : {}, priceDisplayMode: nullablePriceMode(row.price_display_mode),
    minimumOrderDisplay: nullableString(row.minimum_order_display), leadTimeDisplay: nullableString(row.lead_time_display), sortOrder: number(row.sort_order)
  };
}

function mapPlacement(row: Record<string, unknown>): CustomPlacement {
  return { id: string(row.id), categoryId: string(row.custom_category_id), name: string(row.name), slug: string(row.slug), description: nullableString(row.description), priceAdjustment: number(row.price_adjustment), sortOrder: number(row.sort_order) };
}

function mapPrintSize(row: Record<string, unknown>): CustomPrintSize {
  return { id: string(row.id), categoryId: string(row.custom_category_id), name: string(row.name), slug: string(row.slug), description: nullableString(row.description), widthMm: nullableNumber(row.width_mm), heightMm: nullableNumber(row.height_mm), priceAdjustment: number(row.price_adjustment), sortOrder: number(row.sort_order) };
}

function mapCompatibility(row: Record<string, unknown>): CustomServiceCompatibility {
  return { id: string(row.id), serviceId: string(row.service_id), categoryId: nullableString(row.custom_category_id), productId: nullableString(row.product_id), placementId: nullableString(row.placement_id), printSizeId: nullableString(row.print_size_id) };
}

function mapPersonalizationRule(row: Record<string, unknown>): CustomPersonalizationRule {
  const pricingType = row.pricing_type === "fixed_per_order" || row.pricing_type === "estimated" || row.pricing_type === "manual_quote" ? row.pricing_type : "fixed_per_item";
  return { id: string(row.id), categoryId: string(row.custom_category_id), name: string(row.name), slug: string(row.slug), pricingType, unitPrice: nullableNumber(row.unit_price), flatPrice: nullableNumber(row.flat_price), estimatedMinPrice: nullableNumber(row.estimated_min_price), estimatedMaxPrice: nullableNumber(row.estimated_max_price), quoteRequired: boolean(row.quote_required), sortOrder: number(row.sort_order) };
}

function isValidCategory(category: CustomCategory) {
  if (!category.id || !category.name || !category.slug || !category.minimumOrderDisplay || !category.leadTimeDisplay) return false;
  if (category.entryType === "jersey_configurator") return Boolean(category.targetRoute);
  return category.supportsQuickCustom || category.supportsFullCustom;
}

function isMissingCustomSchema(code: string | undefined) { return code === "42P01" || code === "PGRST205"; }
function safeLocalRoute(value: unknown) { const candidate = string(value); return /^\/[a-z0-9/_?=&.-]*$/i.test(candidate) && !candidate.startsWith("//") ? candidate : null; }
function priceMode(value: unknown) { return value === "estimated" || value === "quotation" ? value : "final"; }
function nullablePriceMode(value: unknown) { return value === "final" || value === "estimated" || value === "quotation" ? value : null; }
function asRecords(value: unknown): Record<string, unknown>[] { return Array.isArray(value) ? value.filter(isRecord) : []; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function firstRecord(value: unknown) { return Array.isArray(value) ? (value.find(isRecord) ?? null) : isRecord(value) ? value : null; }
function string(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function nullableString(value: unknown) { const candidate = string(value); return candidate || null; }
function boolean(value: unknown) { return value === true; }
function number(value: unknown) { return typeof value === "number" && Number.isFinite(value) ? value : 0; }
function nullableNumber(value: unknown) { return typeof value === "number" && Number.isFinite(value) ? value : null; }
