import type { ProductVariantStatus } from "@/lib/product-manager";

export const SELLABLE_SKU_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

export type VariantMatrixColorOption = {
  key: string;
  variantId: string | null;
  colorMasterId: string | null;
  name: string;
  slug: string;
  hexCode: string;
  status: ProductVariantStatus;
  sortOrder: number;
};

export type VariantMatrixSizeOption = {
  id: string;
  name: string;
  slug: string;
  active?: boolean;
};

export type VariantMatrixExistingRow = {
  id: string;
  variantId: string;
  sizeId: string | null;
  sku: string;
  stockQuantity: number;
  priceAdjustment: number;
  status: ProductVariantStatus;
  sortOrder: number;
};

export type VariantMatrixRow = {
  key: string;
  id: string | null;
  variantId: string | null;
  colorMasterId: string | null;
  colorName: string;
  colorSlug: string;
  colorHex: string;
  colorStatus: ProductVariantStatus;
  sizeId: string;
  sizeName: string;
  sizeSlug: string;
  sku: string;
  stockQuantity: number;
  priceAdjustment: number;
  status: ProductVariantStatus;
  sortOrder: number;
  original: VariantMatrixRowSnapshot | null;
};

export type VariantMatrixRowSnapshot = Pick<
  VariantMatrixRow,
  "id" | "variantId" | "sizeId" | "sku" | "stockQuantity" | "priceAdjustment" | "status" | "sortOrder"
>;

export type VariantMatrixSaveRow = {
  id?: string | null;
  variantId?: string | null;
  colorMasterId?: string | null;
  sizeId: string;
  sku: string;
  stockQuantity: number;
  priceAdjustment: number;
  status: ProductVariantStatus;
  sortOrder: number;
};

export type VariantMatrixSaveInput = {
  productId: string;
  rows: VariantMatrixSaveRow[];
};

export type VariantMatrixIssue = {
  severity: "blocker" | "warning";
  key: string;
  message: string;
};

export type VariantMatrixSummary = {
  created: number;
  updated: number;
  unchanged: number;
  deactivated: number;
  conflicts: number;
  affected: number;
};

export function normalizeSkuSegment(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

export function normalizeSellableSku(value: string | null | undefined) {
  return normalizeSkuSegment(value);
}

export function isValidSkuCode(value: string | null | undefined) {
  const raw = String(value || "").trim();
  return Boolean(raw && SELLABLE_SKU_PATTERN.test(raw) && raw === raw.toUpperCase());
}

export function buildDeterministicSku(productCode: string, colorCode: string, sizeCode: string) {
  if (!isValidSkuCode(productCode)) return null;
  const color = normalizeSkuSegment(colorCode);
  const size = normalizeSkuSegment(sizeCode);
  if (!color || !size) return null;
  return `${productCode}-${color}-${size}`;
}

export function buildExistingMatrixRows(
  colors: VariantMatrixColorOption[],
  sizes: VariantMatrixSizeOption[],
  existingRows: VariantMatrixExistingRow[]
): VariantMatrixRow[] {
  const colorByVariant = new Map(colors.filter((color) => color.variantId).map((color) => [color.variantId as string, color]));
  const sizeById = new Map(sizes.map((size) => [size.id, size]));
  return existingRows.map((existing) => {
    const color = colorByVariant.get(existing.variantId);
    const size = existing.sizeId ? sizeById.get(existing.sizeId) : undefined;
    const row: VariantMatrixRow = {
      key: existing.id,
      id: existing.id,
      variantId: existing.variantId,
      colorMasterId: color?.colorMasterId || null,
      colorName: color?.name || "Warna tidak dikenal",
      colorSlug: color?.slug || "",
      colorHex: color?.hexCode || "#111111",
      colorStatus: color?.status || "inactive",
      sizeId: existing.sizeId || "",
      sizeName: size?.name || "Ukuran tidak dikenal",
      sizeSlug: size?.slug || "",
      sku: existing.sku,
      stockQuantity: existing.stockQuantity,
      priceAdjustment: existing.priceAdjustment,
      status: existing.status,
      sortOrder: existing.sortOrder,
      original: null
    };
    row.original = snapshotRow(row);
    return row;
  });
}

export function generateVariantMatrix(input: {
  productCode: string;
  colors: VariantMatrixColorOption[];
  sizes: VariantMatrixSizeOption[];
  existingRows: VariantMatrixRow[];
}) {
  const existingByCombination = new Map(
    input.existingRows
      .filter((row) => row.variantId && row.sizeId)
      .map((row) => [`${row.variantId}:${row.sizeId}`, row])
  );
  const next = [...input.existingRows];
  const keys = new Set(next.map((row) => row.key));

  for (const color of input.colors) {
    for (const size of input.sizes) {
      const combinationKey = color.variantId ? `${color.variantId}:${size.id}` : "";
      const existing = combinationKey ? existingByCombination.get(combinationKey) : undefined;
      if (existing) continue;

      const key = color.variantId
        ? `new:${color.variantId}:${size.id}`
        : `new-master:${color.colorMasterId || color.key}:${size.id}`;
      if (keys.has(key)) continue;
      const sku = buildDeterministicSku(input.productCode, color.slug, size.slug) || "";
      next.push({
        key,
        id: null,
        variantId: color.variantId,
        colorMasterId: color.colorMasterId,
        colorName: color.name,
        colorSlug: color.slug,
        colorHex: color.hexCode,
        colorStatus: color.status,
        sizeId: size.id,
        sizeName: size.name,
        sizeSlug: size.slug,
        sku,
        stockQuantity: 0,
        priceAdjustment: 0,
        status: "active",
        sortOrder: next.length,
        original: null
      });
      keys.add(key);
    }
  }
  return next;
}

export function validateVariantMatrix(input: {
  productCode: string;
  rows: VariantMatrixRow[];
  globalSkuOwners?: Map<string, string>;
  activeSizeIds?: Set<string>;
}) {
  const issues: VariantMatrixIssue[] = [];
  if (!isValidSkuCode(input.productCode)) {
    issues.push({ severity: "blocker", key: "product-code", message: "SKU induk produk wajib menjadi product code uppercase yang valid sebelum Generate." });
  }

  const localSku = new Map<string, string[]>();
  const combinations = new Map<string, string[]>();

  for (const row of input.rows) {
    const rowKey = row.key;
    if (!row.variantId && !row.colorMasterId) {
      issues.push({ severity: "blocker", key: rowKey, message: `${row.colorName}: product variant atau color master ID tidak tersedia.` });
    }
    if (row.colorStatus !== "active") {
      issues.push({ severity: "blocker", key: rowKey, message: `${row.colorName}: warna tidak aktif.` });
    }
    if (!row.sizeId || (input.activeSizeIds && !input.activeSizeIds.has(row.sizeId))) {
      issues.push({ severity: "blocker", key: rowKey, message: `${row.colorName} / ${row.sizeName}: size_id tidak valid atau tidak aktif.` });
    }
    const sku = normalizeSellableSku(row.sku);
    if (!sku || !SELLABLE_SKU_PATTERN.test(row.sku) || sku !== row.sku) {
      issues.push({ severity: "blocker", key: rowKey, message: `${row.colorName} / ${row.sizeName}: SKU wajib uppercase dan hanya memakai A–Z, 0–9, atau minus.` });
    } else {
      const owners = localSku.get(sku) || [];
      owners.push(rowKey);
      localSku.set(sku, owners);
      const globalOwner = input.globalSkuOwners?.get(sku);
      if (globalOwner && globalOwner !== row.id) {
        issues.push({ severity: "blocker", key: rowKey, message: `${sku}: SKU sudah digunakan secara global.` });
      }
    }
    if (!Number.isInteger(row.stockQuantity) || row.stockQuantity < 0) {
      issues.push({ severity: "blocker", key: rowKey, message: `${row.colorName} / ${row.sizeName}: stok wajib integer ≥ 0.` });
    }
    if (!Number.isInteger(row.priceAdjustment)) {
      issues.push({ severity: "blocker", key: rowKey, message: `${row.colorName} / ${row.sizeName}: price adjustment wajib integer.` });
    }
    const colorIdentity = row.variantId || `master:${row.colorMasterId || row.colorSlug}`;
    const combination = `${colorIdentity}:${row.sizeId}`;
    const owners = combinations.get(combination) || [];
    owners.push(rowKey);
    combinations.set(combination, owners);
  }

  for (const [sku, owners] of localSku) {
    if (owners.length > 1) {
      for (const key of owners) issues.push({ severity: "blocker", key, message: `${sku}: duplicate SKU di dalam matrix.` });
    }
  }
  for (const owners of combinations.values()) {
    if (owners.length > 1) {
      for (const key of owners) issues.push({ severity: "blocker", key, message: "Duplicate kombinasi warna × ukuran di dalam matrix." });
    }
  }
  return dedupeIssues(issues);
}

export function summarizeVariantMatrix(rows: VariantMatrixRow[], issues: VariantMatrixIssue[] = []): VariantMatrixSummary {
  let created = 0;
  let updated = 0;
  let unchanged = 0;
  let deactivated = 0;
  for (const row of rows) {
    if (!row.id) created += 1;
    else if (rowChanged(row)) updated += 1;
    else unchanged += 1;
    if (row.id && row.status === "inactive" && row.original?.status !== "inactive") deactivated += 1;
  }
  return {
    created,
    updated,
    unchanged,
    deactivated,
    conflicts: issues.filter((issue) => issue.severity === "blocker").length,
    affected: created + updated
  };
}

export function applyBulkMatrixValue(
  rows: VariantMatrixRow[],
  selectedKeys: Set<string>,
  patch: Partial<Pick<VariantMatrixRow, "stockQuantity" | "priceAdjustment" | "status">>
) {
  return rows.map((row) => selectedKeys.has(row.key) ? { ...row, ...patch } : row);
}

export function rowChanged(row: VariantMatrixRow) {
  if (!row.id || !row.original) return true;
  const original = row.original;
  return row.id !== original.id || row.variantId !== original.variantId || row.sizeId !== original.sizeId ||
    row.sku !== original.sku || row.stockQuantity !== original.stockQuantity ||
    row.priceAdjustment !== original.priceAdjustment || row.status !== original.status || row.sortOrder !== original.sortOrder;
}

export function changedMatrixRows(rows: VariantMatrixRow[]): VariantMatrixSaveRow[] {
  return rows.filter(rowChanged).map((row) => ({
    id: row.id,
    variantId: row.variantId,
    colorMasterId: row.colorMasterId,
    sizeId: row.sizeId,
    sku: row.sku,
    stockQuantity: row.stockQuantity,
    priceAdjustment: row.priceAdjustment,
    status: row.status,
    sortOrder: row.sortOrder
  }));
}

export function snapshotRow(row: VariantMatrixRow): VariantMatrixRowSnapshot {
  return {
    id: row.id,
    variantId: row.variantId,
    sizeId: row.sizeId,
    sku: row.sku,
    stockQuantity: row.stockQuantity,
    priceAdjustment: row.priceAdjustment,
    status: row.status,
    sortOrder: row.sortOrder
  };
}

function dedupeIssues(issues: VariantMatrixIssue[]) {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.severity}:${issue.key}:${issue.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
