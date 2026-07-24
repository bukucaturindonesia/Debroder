export const GLOBAL_SIZE_ADJUSTMENT_POLICY = {
  S: 0,
  M: 0,
  L: 0,
  XL: 0,
  "2XL": 10_000,
  "3XL": 20_000,
  "4XL": 30_000
} as const;

export type ManagedSizeKey = keyof typeof GLOBAL_SIZE_ADJUSTMENT_POLICY;

export type SizeMasterPreviewInput = {
  id: string;
  name: string;
  slug: string;
  sizeGroup: string;
};

export type SellableSizePreviewInput = {
  id: string;
  productId: string;
  productStatus: string;
  variantId: string;
  sizeId: string | null;
  sizeName: string;
  sku: string | null;
  currentAdjustment: number;
  explicitOverride?: {
    auditEventId: string;
    reason: string;
  } | null;
};

export const SIZE_ADJUSTMENT_PREVIEW_ISSUE_CODES = [
  "MISSING_SIZE_MASTER",
  "SIZE_ID_UNKNOWN",
  "SIZE_MASTER_ALIAS_CONFLICT",
  "SIZE_SNAPSHOT_CONFLICT",
  "DUPLICATE_NORMALIZED_SIZE_MASTER",
  "DUPLICATE_NORMALIZED_VARIANT_SIZE",
  "DUPLICATE_NORMALIZED_SKU",
  "INVALID_CURRENT_ADJUSTMENT",
  "UNMANAGED_SIZE_POLICY",
  "EXPLICIT_OVERRIDE_REVIEW"
] as const;

export type SizeAdjustmentPreviewIssueCode =
  (typeof SIZE_ADJUSTMENT_PREVIEW_ISSUE_CODES)[number];

export type SizeAdjustmentPreviewStatus =
  | "ALIGNED"
  | "PENDING_CHANGE"
  | "OVERRIDE_REVIEW"
  | "BLOCKED"
  | "OUT_OF_POLICY";

export type SizeAdjustmentPreviewRow = {
  variantSizeId: string;
  productId: string;
  productStatus: string;
  variantId: string;
  sizeId: string | null;
  sizeName: string;
  masterSizeName: string | null;
  normalizedSize: ManagedSizeKey | null;
  sku: string | null;
  beforeAdjustment: number;
  afterAdjustment: number | null;
  delta: number | null;
  status: SizeAdjustmentPreviewStatus;
  issueCodes: SizeAdjustmentPreviewIssueCode[];
  explicitOverride: {
    auditEventId: string;
    reason: string;
  } | null;
};

export type SizeAdjustmentPolicyPreview = {
  policy: typeof GLOBAL_SIZE_ADJUSTMENT_POLICY;
  rows: SizeAdjustmentPreviewRow[];
  summary: {
    totalSkuCount: number;
    alignedSkuCount: number;
    affectedSkuCount: number;
    pendingChangeCount: number;
    overrideReviewCount: number;
    blockedSkuCount: number;
    outOfPolicySkuCount: number;
    duplicateSkuCount: number;
  };
};

type IndexedSizeMaster = SizeMasterPreviewInput & {
  normalizedName: string;
  normalizedSlug: string;
  normalizedToken: string;
  managedSize: ManagedSizeKey | null;
  hasAliasConflict: boolean;
  hasDuplicateAlias: boolean;
};

export function normalizeManagedSize(value: string): ManagedSizeKey | null {
  switch (normalizeSizeToken(value)) {
    case "S":
      return "S";
    case "M":
      return "M";
    case "L":
      return "L";
    case "XL":
      return "XL";
    case "2XL":
    case "XXL":
      return "2XL";
    case "3XL":
    case "XXXL":
      return "3XL";
    case "4XL":
    case "XXXXL":
      return "4XL";
    default:
      return null;
  }
}

export function buildSizeAdjustmentPolicyPreview(input: {
  sizeMasters: readonly SizeMasterPreviewInput[];
  sellableSizes: readonly SellableSizePreviewInput[];
}): SizeAdjustmentPolicyPreview {
  const masters = indexSizeMasters(input.sizeMasters);
  const masterById = new Map(masters.map((master) => [master.id, master]));
  const variantSizeCounts = countKeys(
    input.sellableSizes.map((row) => {
      const master = row.sizeId ? masterById.get(row.sizeId) : null;
      return master ? `${row.variantId}:${master.normalizedToken}` : null;
    })
  );
  const skuCounts = countKeys(
    input.sellableSizes.map((row) => normalizeSku(row.sku))
  );

  const rows = input.sellableSizes
    .map((row) =>
      previewRow(row, masterById, variantSizeCounts, skuCounts)
    )
    .sort(comparePreviewRows);

  return {
    policy: GLOBAL_SIZE_ADJUSTMENT_POLICY,
    rows,
    summary: {
      totalSkuCount: rows.length,
      alignedSkuCount: countStatus(rows, "ALIGNED"),
      affectedSkuCount: rows.filter(
        (row) =>
          row.afterAdjustment !== null &&
          row.beforeAdjustment !== row.afterAdjustment
      ).length,
      pendingChangeCount: countStatus(rows, "PENDING_CHANGE"),
      overrideReviewCount: countStatus(rows, "OVERRIDE_REVIEW"),
      blockedSkuCount: countStatus(rows, "BLOCKED"),
      outOfPolicySkuCount: countStatus(rows, "OUT_OF_POLICY"),
      duplicateSkuCount: rows.filter((row) =>
        row.issueCodes.some((code) => code.startsWith("DUPLICATE_"))
      ).length
    }
  };
}

function indexSizeMasters(
  sizeMasters: readonly SizeMasterPreviewInput[]
): IndexedSizeMaster[] {
  const prepared = sizeMasters.map((master) => {
    const normalizedName = normalizeSizeToken(master.name);
    const normalizedSlug = normalizeSizeToken(master.slug);
    const managedName = normalizeManagedSize(master.name);
    const managedSlug = normalizeManagedSize(master.slug);
    const normalizedToken =
      managedName ?? managedSlug ?? normalizedName ?? normalizedSlug;

    return {
      ...master,
      normalizedName,
      normalizedSlug,
      normalizedToken,
      managedSize: managedName ?? managedSlug,
      hasAliasConflict:
        normalizedName.length > 0 &&
        normalizedSlug.length > 0 &&
        (managedName ?? normalizedName) !== (managedSlug ?? normalizedSlug)
    };
  });
  const aliasCounts = countKeys(
    prepared.map((master) =>
      master.normalizedToken
        ? `${normalizeSizeToken(master.sizeGroup)}:${master.normalizedToken}`
        : null
    )
  );

  return prepared.map((master) => ({
    ...master,
    hasDuplicateAlias:
      (aliasCounts.get(
        `${normalizeSizeToken(master.sizeGroup)}:${master.normalizedToken}`
      ) ?? 0) > 1
  }));
}

function previewRow(
  row: SellableSizePreviewInput,
  masterById: ReadonlyMap<string, IndexedSizeMaster>,
  variantSizeCounts: ReadonlyMap<string, number>,
  skuCounts: ReadonlyMap<string, number>
): SizeAdjustmentPreviewRow {
  const master = row.sizeId ? masterById.get(row.sizeId) ?? null : null;
  const managedSize = master?.managedSize ?? null;
  const afterAdjustment =
    managedSize === null ? null : GLOBAL_SIZE_ADJUSTMENT_POLICY[managedSize];
  const issueCodes: SizeAdjustmentPreviewIssueCode[] = [];

  if (row.sizeId === null) {
    issueCodes.push("MISSING_SIZE_MASTER");
  } else if (!master) {
    issueCodes.push("SIZE_ID_UNKNOWN");
  }

  if (master?.hasAliasConflict) {
    issueCodes.push("SIZE_MASTER_ALIAS_CONFLICT");
  }
  if (
    master &&
    normalizeSizeToken(row.sizeName) !== master.normalizedToken &&
    normalizeManagedSize(row.sizeName) !== master.managedSize
  ) {
    issueCodes.push("SIZE_SNAPSHOT_CONFLICT");
  }
  if (master?.hasDuplicateAlias) {
    issueCodes.push("DUPLICATE_NORMALIZED_SIZE_MASTER");
  }
  if (
    master &&
    (variantSizeCounts.get(`${row.variantId}:${master.normalizedToken}`) ?? 0) >
      1
  ) {
    issueCodes.push("DUPLICATE_NORMALIZED_VARIANT_SIZE");
  }

  const normalizedSku = normalizeSku(row.sku);
  if (normalizedSku && (skuCounts.get(normalizedSku) ?? 0) > 1) {
    issueCodes.push("DUPLICATE_NORMALIZED_SKU");
  }
  if (
    !Number.isSafeInteger(row.currentAdjustment) ||
    row.currentAdjustment < 0
  ) {
    issueCodes.push("INVALID_CURRENT_ADJUSTMENT");
  }
  if (master && managedSize === null) {
    issueCodes.push("UNMANAGED_SIZE_POLICY");
  }

  const explicitOverride = normalizeExplicitOverride(row.explicitOverride);
  const blockingIssue = issueCodes.some((code) =>
    [
      "MISSING_SIZE_MASTER",
      "SIZE_ID_UNKNOWN",
      "SIZE_MASTER_ALIAS_CONFLICT",
      "SIZE_SNAPSHOT_CONFLICT",
      "DUPLICATE_NORMALIZED_SIZE_MASTER",
      "DUPLICATE_NORMALIZED_VARIANT_SIZE",
      "DUPLICATE_NORMALIZED_SKU",
      "INVALID_CURRENT_ADJUSTMENT"
    ].includes(code)
  );

  let status: SizeAdjustmentPreviewStatus;
  if (blockingIssue) {
    status = "BLOCKED";
  } else if (afterAdjustment === null) {
    status = "OUT_OF_POLICY";
  } else if (row.currentAdjustment === afterAdjustment) {
    status = "ALIGNED";
  } else if (explicitOverride) {
    issueCodes.push("EXPLICIT_OVERRIDE_REVIEW");
    status = "OVERRIDE_REVIEW";
  } else {
    status = "PENDING_CHANGE";
  }

  return {
    variantSizeId: row.id,
    productId: row.productId,
    productStatus: row.productStatus,
    variantId: row.variantId,
    sizeId: row.sizeId,
    sizeName: row.sizeName,
    masterSizeName: master?.name ?? null,
    normalizedSize: managedSize,
    sku: row.sku,
    beforeAdjustment: row.currentAdjustment,
    afterAdjustment,
    delta:
      afterAdjustment === null
        ? null
        : afterAdjustment - row.currentAdjustment,
    status,
    issueCodes,
    explicitOverride
  };
}

function normalizeSizeToken(value: string): string {
  return value.trim().toUpperCase().replace(/[\s_-]+/g, "");
}

function normalizeSku(value: string | null): string | null {
  const normalized = value?.trim().toUpperCase() ?? "";
  return normalized || null;
}

function normalizeExplicitOverride(
  override: SellableSizePreviewInput["explicitOverride"]
): SizeAdjustmentPreviewRow["explicitOverride"] {
  if (!override) return null;
  const auditEventId = override.auditEventId.trim();
  const reason = override.reason.trim();
  return auditEventId && reason ? { auditEventId, reason } : null;
}

function countKeys(values: readonly (string | null)[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) {
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

function countStatus(
  rows: readonly SizeAdjustmentPreviewRow[],
  status: SizeAdjustmentPreviewStatus
) {
  return rows.filter((row) => row.status === status).length;
}

function comparePreviewRows(
  left: SizeAdjustmentPreviewRow,
  right: SizeAdjustmentPreviewRow
) {
  return (
    left.productId.localeCompare(right.productId, "en") ||
    left.variantId.localeCompare(right.variantId, "en") ||
    (left.normalizedSize ?? "").localeCompare(
      right.normalizedSize ?? "",
      "en"
    ) ||
    (left.sku ?? "").localeCompare(right.sku ?? "", "en") ||
    left.variantSizeId.localeCompare(right.variantSizeId, "en")
  );
}
