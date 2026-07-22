import type {
  ProductLifecycle,
  ProductManagerCapabilities,
  ProductVariantStatus
} from "@/lib/product-manager";
import type { ProductColorSwatchValue } from "@/lib/product-variants";

export const PRODUCT_INVENTORY_MODES = ["stock", "price", "status"] as const;
export type ProductInventoryMode = (typeof PRODUCT_INVENTORY_MODES)[number];

export const PRODUCT_INVENTORY_SAVE_STATES = [
  "clean",
  "dirty",
  "saving",
  "saved",
  "conflict",
  "error"
] as const;
export type ProductInventorySaveState =
  (typeof PRODUCT_INVENTORY_SAVE_STATES)[number];

export type ProductInventoryStatusFilter = "all" | ProductVariantStatus;
export type ProductInventoryPageSize = 25 | 50;

export type ProductInventoryQuery = {
  locationId: string;
  mode: ProductInventoryMode;
  q: string;
  colorId: string;
  sizeId: string;
  status: ProductInventoryStatusFilter;
  page: number;
  pageSize: ProductInventoryPageSize;
  copyFromVariantId: string;
};

export type ProductInventoryQuantitySummary = {
  onHand: number;
  reserved: number;
  available: number;
};

export type ProductInventoryLocation = {
  id: string;
  code: string;
  name: string;
  locationType: string;
  active: boolean;
  editable: boolean;
  legacy: boolean;
  summary: ProductInventoryQuantitySummary;
};

export type ProductInventoryFilterOption = {
  id: string;
  name: string;
};

export type ProductInventorySelectionRow = {
  sellableId: string;
  variantId: string;
  sizeId: string;
  sku: string;
  stockQuantity: number;
  reservedQuantity: number;
  priceAdjustment: number;
  status: ProductVariantStatus;
  expectedSkuUpdatedAt: string;
  expectedBalanceUpdatedAt: string | null;
};

export type ProductInventoryCopyRow = {
  sizeId: string;
  stockQuantity: number;
  priceAdjustment: number;
  status: ProductVariantStatus;
};

export type ProductInventoryRow = ProductColorSwatchValue & {
  sellableId: string;
  variantId: string;
  colorName: string;
  colorSlug: string;
  sizeId: string;
  sizeName: string;
  sizeSlug: string;
  sku: string;
  status: ProductVariantStatus;
  priceAdjustment: number;
  variantPriceAdjustment: number;
  basePrice: number;
  finalPrice: number;
  stockQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  expectedSkuUpdatedAt: string;
  expectedBalanceUpdatedAt: string | null;
};

export type ProductInventoryPayload = {
  role: string;
  capabilities: ProductManagerCapabilities;
  product: {
    id: string;
    name: string;
    sku: string | null;
    status: ProductLifecycle;
    basePrice: number;
  };
  query: ProductInventoryQuery;
  selectedLocation: {
    kind: "all" | "location";
    id: string | null;
    name: string;
    code: string;
    locationType: string;
    editable: boolean;
    legacy: boolean;
  };
  locations: ProductInventoryLocation[];
  rows: ProductInventoryRow[];
  selectionRows: ProductInventorySelectionRow[];
  matchingRowIds: string[];
  copySourceRows: ProductInventoryCopyRow[];
  filters: {
    colors: ProductInventoryFilterOption[];
    sizes: ProductInventoryFilterOption[];
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
  };
  summary: ProductInventoryQuantitySummary;
  legacyDriftCount: number;
};

export type ProductInventoryDraft = ProductInventorySelectionRow & {
  originalStockQuantity: number;
  originalPriceAdjustment: number;
  originalStatus: ProductVariantStatus;
};

export type ProductInventorySaveChange = {
  sellableId: string;
  stockQuantity?: number;
  priceAdjustment?: number;
  status?: ProductVariantStatus;
  expectedSkuUpdatedAt: string;
  expectedBalanceUpdatedAt: string | null;
};

export type ProductInventoryMutationSummary = {
  changedRows: number;
  stockRows: number;
  priceRows: number;
  statusRows: number;
  totalStockDelta: number;
  deactivatedRows: number;
  locationId: string;
  locationName: string;
};

export type ProductInventoryMutationResult = {
  ok: true;
  preview: boolean;
  message: string;
  summary: ProductInventoryMutationSummary;
};

export function parseProductInventoryQuery(
  searchParams: URLSearchParams
): ProductInventoryQuery {
  return {
    locationId: locationToken(searchParams.get("locationId")),
    mode: inventoryMode(searchParams.get("mode")),
    q: safeInventorySearch(searchParams.get("q")),
    colorId: safeUuid(searchParams.get("colorId")),
    sizeId: safeUuid(searchParams.get("sizeId")),
    status: inventoryStatus(searchParams.get("status")),
    page: positiveInteger(searchParams.get("page"), 1),
    pageSize: inventoryPageSize(searchParams.get("pageSize")),
    copyFromVariantId: safeUuid(searchParams.get("copyFromVariantId"))
  };
}

export function productInventoryQueryString(query: ProductInventoryQuery) {
  const params = new URLSearchParams();
  params.set("locationId", query.locationId || "all");
  params.set("mode", query.mode);
  if (query.q) params.set("q", query.q);
  if (query.colorId) params.set("colorId", query.colorId);
  if (query.sizeId) params.set("sizeId", query.sizeId);
  if (query.status !== "all") params.set("status", query.status);
  params.set("page", String(query.page));
  params.set("pageSize", String(query.pageSize));
  if (query.copyFromVariantId) {
    params.set("copyFromVariantId", query.copyFromVariantId);
  }
  return params.toString();
}

export function safeInventorySearch(value: string | null | undefined) {
  return String(value || "")
    .replace(/[,().:%_*]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export function canManageProductInventory(
  capabilities: ProductManagerCapabilities,
  selectedLocation: ProductInventoryPayload["selectedLocation"]
) {
  return Boolean(
    capabilities.canManageDependencies &&
    selectedLocation.kind === "location" &&
    selectedLocation.editable &&
    !selectedLocation.legacy
  );
}

export function draftFromInventoryRow(
  row: ProductInventorySelectionRow
): ProductInventoryDraft {
  return {
    ...row,
    originalStockQuantity: row.stockQuantity,
    originalPriceAdjustment: row.priceAdjustment,
    originalStatus: row.status
  };
}

export function updateInventoryDraft(
  draft: ProductInventoryDraft,
  patch: Partial<Pick<
    ProductInventoryDraft,
    "stockQuantity" | "priceAdjustment" | "status"
  >>
): ProductInventoryDraft {
  return { ...draft, ...patch };
}

export function inventoryDraftChanged(draft: ProductInventoryDraft) {
  return draft.stockQuantity !== draft.originalStockQuantity ||
    draft.priceAdjustment !== draft.originalPriceAdjustment ||
    draft.status !== draft.originalStatus;
}

export function inventorySaveChanges(
  drafts: Iterable<ProductInventoryDraft>
): ProductInventorySaveChange[] {
  const changes: ProductInventorySaveChange[] = [];
  for (const draft of drafts) {
    if (!inventoryDraftChanged(draft)) continue;
    const change: ProductInventorySaveChange = {
      sellableId: draft.sellableId,
      expectedSkuUpdatedAt: draft.expectedSkuUpdatedAt,
      expectedBalanceUpdatedAt: draft.expectedBalanceUpdatedAt
    };
    if (draft.stockQuantity !== draft.originalStockQuantity) {
      change.stockQuantity = draft.stockQuantity;
    }
    if (draft.priceAdjustment !== draft.originalPriceAdjustment) {
      change.priceAdjustment = draft.priceAdjustment;
    }
    if (draft.status !== draft.originalStatus) {
      change.status = draft.status;
    }
    changes.push(change);
  }
  return changes;
}

export function inventoryModeLabel(mode: ProductInventoryMode) {
  if (mode === "price") return "Tambahan Harga";
  if (mode === "status") return "Status SKU";
  return "Stok";
}

function inventoryMode(value: string | null): ProductInventoryMode {
  return value === "price" || value === "status" ? value : "stock";
}

function inventoryStatus(value: string | null): ProductInventoryStatusFilter {
  return value === "active" || value === "inactive" ? value : "all";
}

function inventoryPageSize(value: string | null): ProductInventoryPageSize {
  return Number(value) === 25 ? 25 : 50;
}

function locationToken(value: string | null) {
  if (!value || value === "all") return "all";
  return safeUuid(value);
}

function safeUuid(value: string | null) {
  return value &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : "";
}

function positiveInteger(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
