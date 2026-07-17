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
import type { CustomService, PimProduct } from "@/lib/types";

const CATEGORY_SELECT = `
  id,name,slug,short_description,image_url,image_alt,entry_type,target_route,
  supports_quick_custom,supports_full_custom,price_display_mode,
  minimum_order_display,lead_time_display,source_product_category_id,
  seo_title,seo_description,sort_order,updated_at
`;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const JERSEY_CONFIGURATOR_ROUTE = "/jersey/configurator";

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
    if (isMissingCustomSchema(error.code)) return listFallbackCustomCategories();
    throw new Error(`Failed to load custom categories: ${error.message}`);
  }

  const categories = asRecords(data).map(mapCategory).filter(isValidCategory);
  if (!categories.length) {
    return await customCategoryTableIsEmpty() ? listFallbackCustomCategories() : [];
  }

  const projectCategoryIds = categories
    .filter((category) => category.entryType === "project_builder")
    .map((category) => category.id);
  if (!projectCategoryIds.length) return categories;

  const { data: mappings, error: mappingError } = await client
    .from("custom_category_products")
    .select("custom_category_id,products!inner(id,status,status_aktif)")
    .in("custom_category_id", projectCategoryIds)
    .eq("is_active", true)
    .eq("products.status", "active")
    .eq("products.status_aktif", true);
  if (mappingError) {
    if (isMissingCustomSchema(mappingError.code)) return listFallbackCustomCategories();
    throw new Error(`Failed to validate custom categories: ${mappingError.message}`);
  }
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
    if (isMissingCustomSchema(categoryError.code)) return getFallbackCustomCategoryCatalog(safeSlug);
    throw new Error(`Failed to load custom category: ${categoryError.message}`);
  }
  if (!isRecord(categoryData)) {
    return await customCategoryTableIsEmpty() ? getFallbackCustomCategoryCatalog(safeSlug) : null;
  }
  const category = mapCategory(categoryData);
  if (!isValidCategory(category)) return null;
  if (category.entryType === "jersey_configurator") {
    return emptyCategoryCatalog(category);
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
    .filter(hasValidPimProduct);
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
  if (!client || !UUID.test(productId)) return null;
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
  if (!error && isRecord(data)) {
    const joined = firstRecord(data.custom_categories);
    if (!joined) return null;
    const entryType = string(joined.entry_type);
    if (entryType === "jersey_configurator") return JERSEY_CONFIGURATOR_ROUTE;
    const categorySlug = string(joined.slug);
    return categorySlug ? `/custom/${categorySlug}?product=${encodeURIComponent(productId)}` : null;
  }
  if (error && !isMissingCustomSchema(error.code)) return null;
  if (!error && !(await customCategoryTableIsEmpty())) return null;

  const fallback = await loadFallbackCustomContext();
  const product = fallback.products.find((candidate) => candidate.id === productId);
  const category = product?.category ? fallback.categories.find((candidate) => candidate.id === product.category?.id) : null;
  if (!product || !category) return null;
  return category.entryType === "jersey_configurator"
    ? category.targetRoute
    : `/custom/${category.slug}?product=${encodeURIComponent(productId)}`;
}

export async function getCustomDestinationForSourceCategory(productCategoryId: string | null | undefined): Promise<string | null> {
  const client = getPublicSupabaseClient();
  if (!client || !productCategoryId || !UUID.test(productCategoryId)) return null;
  const { data, error } = await client.from("custom_categories")
    .select("slug,entry_type,target_route")
    .eq("source_product_category_id", productCategoryId)
    .eq("status", "published")
    .eq("is_active", true)
    .order("sort_order")
    .limit(1)
    .maybeSingle();
  if (!error && isRecord(data)) {
    return data.entry_type === "jersey_configurator"
      ? JERSEY_CONFIGURATOR_ROUTE
      : string(data.slug) ? `/custom/${string(data.slug)}` : null;
  }
  if (error && !isMissingCustomSchema(error.code)) return null;
  if (!error && !(await customCategoryTableIsEmpty())) return null;

  const fallback = await loadFallbackCustomContext();
  const category = fallback.categories.find((candidate) => candidate.sourceProductCategoryId === productCategoryId);
  if (!category) return null;
  return category.entryType === "jersey_configurator" ? category.targetRoute : `/custom/${category.slug}`;
}

async function listFallbackCustomCategories() {
  const fallback = await loadFallbackCustomContext();
  return fallback.categories;
}

async function getFallbackCustomCategoryCatalog(slug: string): Promise<CustomCategoryCatalog | null> {
  const fallback = await loadFallbackCustomContext();
  const category = fallback.categories.find((candidate) => candidate.slug === slug);
  if (!category) return null;
  if (category.entryType === "jersey_configurator") return emptyCategoryCatalog(category);

  const products = fallback.products.filter((product) => product.category?.id === category.sourceProductCategoryId && hasValidPimProduct(product));
  const categoryServiceSlugs = fallback.legacyServices
    .filter((service) => serviceMatchesCategory(service, category.slug))
    .map((service) => string(service.slug))
    .filter(Boolean);
  const allowedSlugs = new Set(categoryServiceSlugs);
  const services = allowedSlugs.size
    ? fallback.services.filter((service) => allowedSlugs.has(service.slug))
    : fallback.services;
  const compatibility = services.map((service) => ({
    id: `${category.id}:${service.id}`,
    serviceId: service.id,
    categoryId: category.id,
    productId: null,
    placementId: null,
    printSizeId: null
  }));

  return {
    category,
    products,
    presets: [],
    services,
    placements: [],
    printSizes: [],
    compatibility,
    personalizationRules: []
  };
}

async function loadFallbackCustomContext(): Promise<{
  categories: CustomCategory[];
  products: PimProduct[];
  services: CustomService[];
  legacyServices: Record<string, unknown>[];
}> {
  const client = getPublicSupabaseClient();
  if (!client) return { categories: [], products: [], services: [], legacyServices: [] };

  const [products, services, modelsResult, legacyServicesResult] = await Promise.all([
    listProducts({ allowFallback: false }).catch(() => []),
    listCustomServices({ allowFallback: false }).catch(() => []),
    client.from("service_categories")
      .select("id,nama_kategori,deskripsi,gambar_url,image_alt,category_key,slug,link_slug,urutan,status_aktif")
      .eq("status_aktif", true)
      .order("urutan"),
    client.from("services")
      .select("slug,category_key,production_estimate,status_aktif")
      .eq("status_aktif", true)
      .order("urutan")
  ]);

  const models = modelsResult.error ? [] : asRecords(modelsResult.data);
  const legacyServices = legacyServicesResult.error ? [] : asRecords(legacyServicesResult.data);
  const activeProducts = products.filter((product) => product.status === "active" && product.category?.status !== "inactive");
  const categoryRows = new Map<string, { category: NonNullable<PimProduct["category"]>; products: PimProduct[] }>();

  for (const product of activeProducts) {
    const category = product.category;
    if (!category || !UUID.test(category.id) || !category.slug) continue;
    const current = categoryRows.get(category.id) ?? { category, products: [] };
    current.products.push(product);
    categoryRows.set(category.id, current);
  }

  const categories = Array.from(categoryRows.values())
    .map(({ category, products: categoryProducts }): CustomCategory | null => {
      const exactModel = models.find((model) => normalizeToken(model.slug) === category.slug)
        ?? models.find((model) => normalizeToken(model.category_key) === category.slug || normalizeToken(model.link_slug) === category.slug)
        ?? null;
      const isJersey = isJerseyCategory(category.name, category.slug, categoryProducts);
      if (!isJersey && !categoryProducts.some(hasActiveVariantSize)) return null;
      const minimums = categoryProducts
        .map((product) => product.minimumRule?.status === "active" ? product.minimumRule.minimumQuantity : null)
        .filter((value): value is number => typeof value === "number" && value > 0);
      const minimum = minimums.length ? Math.min(...minimums) : null;
      const leadTime = legacyServices.find((service) => serviceMatchesCategory(service, category.slug));
      return {
        id: category.id,
        name: nullableString(exactModel?.nama_kategori) || category.name,
        slug: category.slug,
        shortDescription: nullableString(exactModel?.deskripsi) || category.description,
        imageUrl: nullableString(exactModel?.gambar_url) || productImage(categoryProducts[0]),
        imageAlt: nullableString(exactModel?.image_alt) || category.name,
        entryType: isJersey ? "jersey_configurator" as const : "project_builder" as const,
        targetRoute: isJersey ? JERSEY_CONFIGURATOR_ROUTE : null,
        supportsQuickCustom: false,
        supportsFullCustom: !isJersey,
        priceDisplayMode: "estimated" as const,
        minimumOrderDisplay: minimum ? `Minimum ${minimum} pcs` : "Minimum mengikuti produk",
        leadTimeDisplay: nullableString(leadTime?.production_estimate) || "Estimasi setelah konfigurasi",
        sourceProductCategoryId: category.id,
        seoTitle: null,
        seoDescription: null,
        sortOrder: category.sortOrder,
        updatedAt: null
      } satisfies CustomCategory;
    })
    .filter((category): category is CustomCategory => category !== null && isValidCategory(category))
    .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, "id"));

  return { categories, products: activeProducts, services, legacyServices };
}

async function customCategoryTableIsEmpty() {
  const client = getPublicSupabaseClient();
  if (!client) return true;

  const configurationResult = await client.rpc("has_custom_catalog_configuration");
  if (!configurationResult.error && typeof configurationResult.data === "boolean") {
    return !configurationResult.data;
  }
  if (configurationResult.error && !isMissingCustomSchema(configurationResult.error.code) && configurationResult.error.code !== "PGRST202") {
    return false;
  }

  const { count, error } = await client.from("custom_categories").select("id", { count: "exact", head: true });
  if (error) return isMissingCustomSchema(error.code);
  return (count ?? 0) === 0;
}

function emptyCategoryCatalog(category: CustomCategory): CustomCategoryCatalog {
  return { category, products: [], presets: [], services: [], placements: [], printSizes: [], compatibility: [], personalizationRules: [] };
}

function hasActiveVariantSize(product: PimProduct) {
  return product.variants.some((variant) => variant.status === "active" && variant.sizes.some((size) => size.status === "active" && size.size.status === "active"));
}

function hasValidPimProduct(product: PimProduct) {
  return Number.isFinite(product.basePrice) && product.basePrice > 0 && hasActiveVariantSize(product);
}

function productImage(product: PimProduct | undefined) {
  if (!product) return null;
  const variant = product.variants.find((candidate) => candidate.isDefault) ?? product.variants[0];
  return variant?.images.find((image) => image.imageRole === "front")?.imageUrl ?? variant?.images[0]?.imageUrl ?? null;
}

function serviceMatchesCategory(service: Record<string, unknown>, categorySlug: string) {
  const keys = [service.category_key, service.slug].map(normalizeToken).filter(Boolean);
  return keys.includes(categorySlug) || keys.includes("all") || keys.includes("global");
}

function isJerseyCategory(name: string, slug: string, products: PimProduct[]) {
  if (normalizeToken(slug) === "jersey" || normalizeToken(name) === "jersey") return true;
  return products.length > 0 && products.every((product) => normalizeToken(`${product.name} ${product.slug}`).includes("jersey"));
}

function normalizeToken(value: unknown) {
  return string(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function mapCategory(row: Record<string, unknown>): CustomCategory {
  const entryType = row.entry_type === "jersey_configurator" ? "jersey_configurator" : "project_builder";
  return {
    id: string(row.id), name: string(row.name), slug: string(row.slug),
    shortDescription: nullableString(row.short_description), imageUrl: nullableString(row.image_url), imageAlt: nullableString(row.image_alt),
    entryType,
    targetRoute: entryType === "jersey_configurator" ? JERSEY_CONFIGURATOR_ROUTE : null, supportsQuickCustom: boolean(row.supports_quick_custom), supportsFullCustom: boolean(row.supports_full_custom),
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
  if (!UUID.test(category.id) || !category.name || !category.slug || !category.minimumOrderDisplay || !category.leadTimeDisplay) return false;
  if (category.entryType === "jersey_configurator") return Boolean(category.targetRoute);
  return category.supportsQuickCustom || category.supportsFullCustom;
}

function isMissingCustomSchema(code: string | undefined) { return code === "42P01" || code === "PGRST205"; }
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
