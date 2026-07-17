import { createHash } from "node:crypto";

export const PIM_PHASE6_EXPORT_SCHEMA_VERSION = "DEBRODER_PIM_EXPORT_V1";
export const PIM_PHASE6_REPORT_SCHEMA_VERSION = "DEBRODER_PIM_RECONCILIATION_REPORT_V1";
export const PIM_PHASE6_RULE_SET_VERSION = "DEBRODER_PIM_RECONCILIATION_V1";
export const PIM_PHASE6_CURRENCY = "IDR";
export const PIM_PHASE6_TIMEZONE = "Asia/Makassar";
export const PIM_PHASE6_STORAGE_BUCKET = "pim-phase6-files";

export const PIM_PHASE6_LIMITS = {
  directProducts: 250,
  directVariants: 5_000,
  maximumFileBytes: 25 * 1024 * 1024,
  pageSize: 25,
  findingPageSize: 50,
  maxExplicitIds: 250,
  maxExclusions: 1_000,
  retentionHours: 7 * 24,
  cleanupBatchSize: 50,
  signedUrlSeconds: 5 * 60
} as const;

export type PimPhase6Format = "xlsx" | "csv";
export type PimPhase6ScopeKind =
  | "selected"
  | "current_page"
  | "all_matching"
  | "category"
  | "status"
  | "updated_range"
  | "full";

export type PimPhase6Filters = {
  query: string;
  status: "all" | "draft" | "active" | "archived";
  categoryId: string | null;
  updatedFrom: string | null;
  updatedTo: string | null;
};

export type PimPhase6Scope = {
  kind: PimPhase6ScopeKind;
  ids: string[];
  excludedIds: string[];
  filters: PimPhase6Filters;
};

export type PimPhase6ProductRow = {
  productId: string;
  productName: string;
  slug: string;
  categoryId: string | null;
  categoryCode: string;
  categoryName: string;
  categoryActive: boolean;
  status: string;
  active: boolean;
  productType: string;
  pricingMode: string;
  basePrice: number | null;
  createdAt: string | null;
  updatedAt: string | null;
  variantCount: number;
  activeVariantCount: number;
  activeSellableCount: number;
  frontImageCount: number;
  duplicateSlugCount: number;
};

export type PimPhase6VariantRow = {
  variantId: string;
  variantSizeId: string;
  productId: string;
  productName: string;
  productSlug: string;
  productStatus: string;
  productType: string;
  categoryId: string | null;
  categoryCode: string;
  categoryName: string;
  variantName: string;
  variantSlug: string;
  variantStatus: string;
  variantActive: boolean;
  variantSortOrder: number;
  colorMasterId: string | null;
  colorCode: string;
  colorName: string;
  colorDisplayOrder: number | null;
  colorMasterActive: boolean | null;
  colorMasterMatched: boolean;
  sizeMasterId: string | null;
  sizeCode: string;
  sizeName: string;
  sizeDisplayOrder: number | null;
  sizeMasterActive: boolean | null;
  sizeMasterMatched: boolean;
  sku: string;
  duplicateSkuCount: number;
  basePrice: number | null;
  variantPriceAdjustment: number | null;
  sizePriceAdjustment: number | null;
  effectivePrice: number | null;
  stock: number | null;
  sellableStatus: string;
  sellableActive: boolean;
  sellableSortOrder: number;
  hasFrontImage: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

export type PimPhase6VariantRootRow = {
  variantId: string;
  productId: string;
  variantName: string;
  variantSlug: string;
  variantStatus: string;
  variantActive: boolean;
  colorMasterId: string | null;
  colorCode: string;
  colorName: string;
  colorMasterActive: boolean | null;
  colorMasterMatched: boolean;
  hasFrontImage: boolean;
  sellableCount: number;
  activeSellableCount: number;
};

export type PimPhase6MasterRow = {
  id: string;
  code: string;
  name: string;
  displayOrder: number;
  active: boolean;
  group?: string;
  hex?: string;
};

export type PimPhase6Snapshot = {
  snapshotAt: string;
  scope: PimPhase6Scope;
  scopeHash: string;
  productCount: number;
  variantCount: number;
  productLimitExceeded: boolean;
  variantLimitExceeded: boolean;
  products: PimPhase6ProductRow[];
  variantRoots: PimPhase6VariantRootRow[];
  variants: PimPhase6VariantRow[];
  categories: PimPhase6MasterRow[];
  colors: PimPhase6MasterRow[];
  sizes: PimPhase6MasterRow[];
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SCOPE_KINDS: PimPhase6ScopeKind[] = ["selected", "current_page", "all_matching", "category", "status", "updated_range", "full"];
const STATUS_VALUES = ["all", "draft", "active", "archived"] as const;

export function normalizePimPhase6Scope(value: unknown): PimPhase6Scope | null {
  if (!isRecord(value) || !SCOPE_KINDS.includes(value.kind as PimPhase6ScopeKind)) return null;
  const kind = value.kind as PimPhase6ScopeKind;
  const sourceFilters = isRecord(value.filters) ? value.filters : {};
  const statusValue = text(sourceFilters.status);
  const filters: PimPhase6Filters = {
    query: text(sourceFilters.query).slice(0, 80),
    status: STATUS_VALUES.includes(statusValue as (typeof STATUS_VALUES)[number]) ? statusValue as PimPhase6Filters["status"] : "all",
    categoryId: UUID_PATTERN.test(text(sourceFilters.categoryId)) ? text(sourceFilters.categoryId) : null,
    updatedFrom: isoDate(sourceFilters.updatedFrom, false),
    updatedTo: isoDate(sourceFilters.updatedTo, true)
  };
  const ids = uuidArray(value.ids).slice(0, PIM_PHASE6_LIMITS.maxExplicitIds);
  const excludedIds = uuidArray(value.excludedIds).slice(0, PIM_PHASE6_LIMITS.maxExclusions);
  if ((kind === "selected" || kind === "current_page") && ids.length === 0) return null;
  if (kind === "category" && !filters.categoryId) return null;
  if (kind === "status" && filters.status === "all") return null;
  if (kind === "updated_range" && (!filters.updatedFrom || !filters.updatedTo || filters.updatedFrom > filters.updatedTo)) return null;
  if (kind === "full") return { kind, ids: [], excludedIds: [], filters: emptyFilters() };
  return { kind, ids, excludedIds, filters };
}

export function emptyPimPhase6Filters(): PimPhase6Filters {
  return emptyFilters();
}

export function hashPimPhase6Value(value: unknown) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

export function stablePimPhase6Json(value: unknown): string {
  return stableJson(value);
}

export function protectSpreadsheetText(value: unknown) {
  const source = String(value ?? "");
  return /^[=+\-@]/.test(source) ? `'${source}` : source;
}

export function csvPimPhase6Cell(value: unknown) {
  const textValue = typeof value === "string" ? protectSpreadsheetText(value) : String(value ?? "");
  return `"${textValue.replace(/"/g, '""')}"`;
}

export function toCsvUtf8(headers: string[], rows: unknown[][]) {
  return `\uFEFF${[headers, ...rows].map((row) => row.map(csvPimPhase6Cell).join(",")).join("\r\n")}\r\n`;
}

export function phase6FileTimestamp(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function phase6Expiry(date = new Date()) {
  return new Date(date.getTime() + PIM_PHASE6_LIMITS.retentionHours * 60 * 60 * 1000).toISOString();
}

export function safePhase6FileName(value: string) {
  return value.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 180);
}

export function mapPimPhase6Snapshot(value: unknown, scope: PimPhase6Scope, scopeHash: string): PimPhase6Snapshot {
  if (!isRecord(value)) throw new Error("PIM_PHASE6_SNAPSHOT_INVALID");
  return {
    snapshotAt: text(value.snapshot_at) || new Date().toISOString(),
    scope,
    scopeHash,
    productCount: nonNegativeInteger(value.product_count),
    variantCount: nonNegativeInteger(value.variant_count),
    productLimitExceeded: value.product_limit_exceeded === true,
    variantLimitExceeded: value.variant_limit_exceeded === true,
    products: records(value.products).map(mapProduct),
    variantRoots: records(value.variant_roots).map(mapVariantRoot),
    variants: records(value.variants).map(mapVariant),
    categories: records(value.categories).map(mapMaster),
    colors: records(value.colors).map(mapMaster),
    sizes: records(value.sizes).map(mapMaster)
  };
}

function mapVariantRoot(row: Record<string, unknown>): PimPhase6VariantRootRow {
  return {
    variantId: text(row.variant_id),
    productId: text(row.product_id),
    variantName: text(row.variant_name),
    variantSlug: text(row.variant_slug),
    variantStatus: text(row.variant_status),
    variantActive: row.variant_active === true,
    colorMasterId: nullableText(row.color_master_id),
    colorCode: text(row.color_code),
    colorName: text(row.color_name),
    colorMasterActive: nullableBoolean(row.color_master_active),
    colorMasterMatched: row.color_master_matched === true,
    hasFrontImage: row.has_front_image === true,
    sellableCount: nonNegativeInteger(row.sellable_count),
    activeSellableCount: nonNegativeInteger(row.active_sellable_count)
  };
}

function mapProduct(row: Record<string, unknown>): PimPhase6ProductRow {
  return {
    productId: text(row.product_id),
    productName: text(row.product_name),
    slug: text(row.slug),
    categoryId: nullableText(row.category_id),
    categoryCode: text(row.category_code),
    categoryName: text(row.category_name),
    categoryActive: row.category_active === true,
    status: text(row.status),
    active: row.active === true,
    productType: text(row.product_type),
    pricingMode: text(row.pricing_mode),
    basePrice: nullableNumber(row.base_price),
    createdAt: nullableText(row.created_at),
    updatedAt: nullableText(row.updated_at),
    variantCount: nonNegativeInteger(row.variant_count),
    activeVariantCount: nonNegativeInteger(row.active_variant_count),
    activeSellableCount: nonNegativeInteger(row.active_sellable_count),
    frontImageCount: nonNegativeInteger(row.front_image_count),
    duplicateSlugCount: nonNegativeInteger(row.duplicate_slug_count)
  };
}

function mapVariant(row: Record<string, unknown>): PimPhase6VariantRow {
  return {
    variantId: text(row.variant_id),
    variantSizeId: text(row.variant_size_id),
    productId: text(row.product_id),
    productName: text(row.product_name),
    productSlug: text(row.product_slug),
    productStatus: text(row.product_status),
    productType: text(row.product_type),
    categoryId: nullableText(row.category_id),
    categoryCode: text(row.category_code),
    categoryName: text(row.category_name),
    variantName: text(row.variant_name),
    variantSlug: text(row.variant_slug),
    variantStatus: text(row.variant_status),
    variantActive: row.variant_active === true,
    variantSortOrder: nonNegativeInteger(row.variant_sort_order),
    colorMasterId: nullableText(row.color_master_id),
    colorCode: text(row.color_code),
    colorName: text(row.color_name),
    colorDisplayOrder: nullableNumber(row.color_display_order),
    colorMasterActive: nullableBoolean(row.color_master_active),
    colorMasterMatched: row.color_master_matched === true,
    sizeMasterId: nullableText(row.size_master_id),
    sizeCode: text(row.size_code),
    sizeName: text(row.size_name),
    sizeDisplayOrder: nullableNumber(row.size_display_order),
    sizeMasterActive: nullableBoolean(row.size_master_active),
    sizeMasterMatched: row.size_master_matched === true,
    sku: String(row.sku ?? ""),
    duplicateSkuCount: nonNegativeInteger(row.duplicate_sku_count),
    basePrice: nullableNumber(row.base_price),
    variantPriceAdjustment: nullableNumber(row.variant_price_adjustment),
    sizePriceAdjustment: nullableNumber(row.size_price_adjustment),
    effectivePrice: nullableNumber(row.effective_price),
    stock: nullableNumber(row.stock),
    sellableStatus: text(row.sellable_status),
    sellableActive: row.sellable_active === true,
    sellableSortOrder: nonNegativeInteger(row.sellable_sort_order),
    hasFrontImage: row.has_front_image === true,
    createdAt: nullableText(row.created_at),
    updatedAt: nullableText(row.updated_at)
  };
}

function mapMaster(row: Record<string, unknown>): PimPhase6MasterRow {
  return {
    id: text(row.id),
    code: text(row.code),
    name: text(row.name),
    displayOrder: nonNegativeInteger(row.display_order),
    active: row.active === true,
    group: nullableText(row.group) || undefined,
    hex: nullableText(row.hex) || undefined
  };
}

function emptyFilters(): PimPhase6Filters {
  return { query: "", status: "all", categoryId: null, updatedFrom: null, updatedTo: null };
}

function isoDate(value: unknown, endOfDay: boolean) {
  const source = text(value);
  if (!source) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(source);
  if (!match) return null;
  const suffix = endOfDay ? "T23:59:59.999+08:00" : "T00:00:00.000+08:00";
  const date = new Date(`${source}${suffix}`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function uuidArray(value: unknown) {
  return [...new Set((Array.isArray(value) ? value : []).map(text).filter((item) => UUID_PATTERN.test(item)))];
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function nonNegativeInteger(value: unknown) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : 0;
}

function nullableBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function nullableText(value: unknown) {
  const valueText = text(value);
  return valueText || null;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : value === null || value === undefined ? "" : String(value).trim();
}

function records(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
