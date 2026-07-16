import { createHash } from "node:crypto";

export const PIM_BULK_EDIT_LIMITS = {
  productsPerBatch: 250,
  variantsPerBatch: 500,
  sellablesPerBatch: 1000,
  totalMutations: 1000,
  pageSize: 25,
  previewRows: 100,
  previewTokenTtlSeconds: 10 * 60,
  maxFixedValue: 2_147_483_647,
  maxPercent: 1000,
  maxExclusions: 1000
} as const;

export type PimBulkTargetType = "product" | "variant" | "sellable";
export type PimBulkSelectionMode = "explicit" | "all_matching";
export type PimBulkPriceMode = "SET" | "INCREASE_FIXED" | "DECREASE_FIXED" | "INCREASE_PERCENT" | "DECREASE_PERCENT";
export type PimBulkStockMode = "SET" | "INCREASE" | "DECREASE";

export type PimBulkFilters = {
  query: string;
  status: string;
  categoryId: string | null;
};

export type PimBulkSelection = {
  mode: PimBulkSelectionMode;
  targetType: PimBulkTargetType;
  ids: string[];
  filters: PimBulkFilters;
  excludedIds: string[];
};

export type PimBulkAction =
  | { type: "PRODUCT_SET_CATEGORY"; targetType: "product"; categoryId: string }
  | { type: "PRODUCT_SET_STATUS"; targetType: "product"; status: "draft" | "active" | "archived" }
  | { type: "PRODUCT_PRICE"; targetType: "product"; mode: PimBulkPriceMode; value: number }
  | { type: "VARIANT_SET_STATUS"; targetType: "variant"; status: "active" | "inactive" }
  | { type: "VARIANT_PRICE"; targetType: "variant"; mode: PimBulkPriceMode; value: number }
  | { type: "SELLABLE_STOCK"; targetType: "sellable"; mode: PimBulkStockMode; value: number };

export type PimBulkIssueCode =
  | "BATCH_LIMIT_EXCEEDED"
  | "NO_TARGET_SELECTED"
  | "TARGET_NOT_FOUND"
  | "TARGET_CHANGED"
  | "PREVIEW_EXPIRED"
  | "PREVIEW_HASH_MISMATCH"
  | "PERMISSION_DENIED_BULK_COMMIT"
  | "INVALID_ACTION"
  | "INVALID_TARGET_TYPE"
  | "INVALID_CATEGORY"
  | "CATEGORY_COMPATIBILITY_ERROR"
  | "INVALID_STATUS"
  | "PUBLISH_VALIDATION_FAILED"
  | "INVALID_PRICE"
  | "NEGATIVE_PRICE_RESULT"
  | "PRICE_ROUNDING_RULE_MISSING"
  | "INVALID_STOCK"
  | "NEGATIVE_STOCK_RESULT"
  | "INSUFFICIENT_STOCK_FOR_BULK_DECREASE"
  | "VARIANT_INACTIVE_CONFLICT"
  | "PRODUCT_STATE_CONFLICT"
  | "CONCURRENT_MODIFICATION"
  | "IDEMPOTENCY_CONFLICT"
  | "TRANSACTION_ROLLED_BACK"
  | "AUDIT_WRITE_FAILED";

export type PimBulkIssue = {
  targetId: string | null;
  code: PimBulkIssueCode;
  message: string;
  field: string;
  severity: "error" | "warning";
};

export type PimBulkTargetRow = {
  id: string;
  targetType: PimBulkTargetType;
  productId: string;
  label: string;
  secondary: string;
  status: string;
  categoryId: string | null;
  categoryName: string;
  categorySlug: string;
  productType: string;
  productStatus: string;
  basePrice: number | null;
  priceAdjustment: number | null;
  stockQuantity: number | null;
  sku: string;
  updatedAt: string | null;
};

export type PimBulkPreviewRow = {
  id: string;
  label: string;
  secondary: string;
  currentValue: string | number;
  newValue: string | number;
  validationStatus: "valid" | "error" | "skipped";
  issues: PimBulkIssue[];
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TARGET_TYPES: PimBulkTargetType[] = ["product", "variant", "sellable"];
const PRICE_MODES: PimBulkPriceMode[] = ["SET", "INCREASE_FIXED", "DECREASE_FIXED", "INCREASE_PERCENT", "DECREASE_PERCENT"];
const STOCK_MODES: PimBulkStockMode[] = ["SET", "INCREASE", "DECREASE"];

export function normalizePimBulkFilters(value: unknown, targetType: PimBulkTargetType): PimBulkFilters {
  const record = isRecord(value) ? value : {};
  const query = text(record.query).slice(0, 80);
  const allowedStatuses = targetType === "product" ? ["all", "draft", "active", "archived"] : ["all", "active", "inactive"];
  const status = allowedStatuses.includes(text(record.status)) ? text(record.status) : "all";
  const categoryId = targetType === "product" && UUID_PATTERN.test(text(record.categoryId)) ? text(record.categoryId) : null;
  return { query, status, categoryId };
}

export function normalizePimBulkSelection(value: unknown): PimBulkSelection | null {
  if (!isRecord(value) || !TARGET_TYPES.includes(value.targetType as PimBulkTargetType)) return null;
  const targetType = value.targetType as PimBulkTargetType;
  const mode = value.mode === "all_matching" ? "all_matching" : value.mode === "explicit" ? "explicit" : null;
  if (!mode) return null;
  const ids = uuidArray(value.ids);
  const excludedIds = uuidArray(value.excludedIds).slice(0, PIM_BULK_EDIT_LIMITS.maxExclusions);
  if (mode === "explicit" && !ids.length) return null;
  return { mode, targetType, ids, filters: normalizePimBulkFilters(value.filters, targetType), excludedIds };
}

export function normalizePimBulkAction(value: unknown): PimBulkAction | null {
  if (!isRecord(value)) return null;
  const type = text(value.type);
  if (type === "PRODUCT_SET_CATEGORY" && UUID_PATTERN.test(text(value.categoryId))) {
    return { type, targetType: "product", categoryId: text(value.categoryId) };
  }
  if (type === "PRODUCT_SET_STATUS" && ["draft", "active", "archived"].includes(text(value.status))) {
    return { type, targetType: "product", status: text(value.status) as "draft" | "active" | "archived" };
  }
  if ((type === "PRODUCT_PRICE" || type === "VARIANT_PRICE") && PRICE_MODES.includes(value.mode as PimBulkPriceMode)) {
    const amount = strictInteger(value.value);
    if (amount === null || amount < 0) return null;
    return { type, targetType: type === "PRODUCT_PRICE" ? "product" : "variant", mode: value.mode as PimBulkPriceMode, value: amount } as PimBulkAction;
  }
  if (type === "VARIANT_SET_STATUS" && ["active", "inactive"].includes(text(value.status))) {
    return { type, targetType: "variant", status: text(value.status) as "active" | "inactive" };
  }
  if (type === "SELLABLE_STOCK" && STOCK_MODES.includes(value.mode as PimBulkStockMode)) {
    const amount = strictInteger(value.value);
    if (amount === null || amount < 0) return null;
    return { type, targetType: "sellable", mode: value.mode as PimBulkStockMode, value: amount };
  }
  return null;
}

export function calculatePimBulkPrice(current: number, mode: PimBulkPriceMode, value: number) {
  if (!Number.isSafeInteger(current) || current < 0 || !Number.isSafeInteger(value) || value < 0) {
    return { value: null, code: "INVALID_PRICE" as PimBulkIssueCode };
  }
  if (value > (mode.endsWith("PERCENT") ? PIM_BULK_EDIT_LIMITS.maxPercent : PIM_BULK_EDIT_LIMITS.maxFixedValue)) {
    return { value: null, code: "INVALID_PRICE" as PimBulkIssueCode };
  }
  const delta = mode.endsWith("PERCENT") ? current * value / 100 : value;
  if (!Number.isInteger(delta)) return { value: null, code: "PRICE_ROUNDING_RULE_MISSING" as PimBulkIssueCode };
  const next = mode === "SET" ? value : mode.startsWith("INCREASE") ? current + delta : current - delta;
  if (next < 0) return { value: null, code: "NEGATIVE_PRICE_RESULT" as PimBulkIssueCode };
  if (!Number.isSafeInteger(next) || next > PIM_BULK_EDIT_LIMITS.maxFixedValue) return { value: null, code: "INVALID_PRICE" as PimBulkIssueCode };
  return { value: next, code: null };
}

export function calculatePimBulkStock(current: number, mode: PimBulkStockMode, value: number) {
  if (!Number.isSafeInteger(current) || current < 0 || !Number.isSafeInteger(value) || value < 0 || value > PIM_BULK_EDIT_LIMITS.maxFixedValue) {
    return { value: null, code: "INVALID_STOCK" as PimBulkIssueCode };
  }
  const next = mode === "SET" ? value : mode === "INCREASE" ? current + value : current - value;
  if (next < 0) return { value: null, code: "INSUFFICIENT_STOCK_FOR_BULK_DECREASE" as PimBulkIssueCode };
  if (!Number.isSafeInteger(next) || next > PIM_BULK_EDIT_LIMITS.maxFixedValue) return { value: null, code: "INVALID_STOCK" as PimBulkIssueCode };
  return { value: next, code: null };
}

export function pimBulkTargetLimit(targetType: PimBulkTargetType) {
  if (targetType === "product") return PIM_BULK_EDIT_LIMITS.productsPerBatch;
  if (targetType === "variant") return PIM_BULK_EDIT_LIMITS.variantsPerBatch;
  return PIM_BULK_EDIT_LIMITS.sellablesPerBatch;
}

export function pimBulkActionLabel(action: PimBulkAction) {
  if (action.type === "PRODUCT_SET_CATEGORY") return "Ubah kategori produk";
  if (action.type === "PRODUCT_SET_STATUS") return `Ubah status menjadi ${action.status}`;
  if (action.type === "PRODUCT_PRICE") return "Ubah harga dasar produk";
  if (action.type === "VARIANT_SET_STATUS") return `Ubah variant menjadi ${action.status}`;
  if (action.type === "VARIANT_PRICE") return "Ubah penyesuaian harga variant";
  return "Ubah stok sellable SKU";
}

export function hashPimBulkValue(value: unknown) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

export function stablePimBulkJson(value: unknown): string {
  return stableJson(value);
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}

function uuidArray(value: unknown) {
  return [...new Set((Array.isArray(value) ? value : []).map(text).filter((item) => UUID_PATTERN.test(item)))];
}

function strictInteger(value: unknown) {
  if (typeof value === "number" && Number.isSafeInteger(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? parsed : null;
  }
  return null;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
