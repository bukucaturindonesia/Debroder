export const PIM_AUDIT_EVENT_VERSION = 1 as const;
export const PIM_AUDIT_TIMEZONE = "Asia/Makassar" as const;

export const PIM_AUDIT_CATEGORIES = [
  "PRODUCT",
  "VARIANT",
  "PRODUCT_COLOR",
  "COLOR_MASTER",
  "SIZE_MASTER",
  "BULK_IMPORT",
  "BULK_EDIT",
  "EXPORT",
  "RECONCILIATION",
  "PUBLISHING",
  "PERMISSION",
  "SECURITY",
  "SYSTEM"
] as const;

export const PIM_AUDIT_STATUSES = [
  "STARTED",
  "COMPLETED",
  "FAILED",
  "PARTIAL",
  "ROLLED_BACK",
  "DENIED",
  "CANCELLED",
  "EXPIRED",
  "INCOMPLETE"
] as const;

export const PIM_AUDIT_VALUE_STATES = [
  "VALUE",
  "NULL",
  "EMPTY_STRING",
  "ZERO",
  "NOT_APPLICABLE",
  "REDACTED"
] as const;

export type PimAuditCategory = (typeof PIM_AUDIT_CATEGORIES)[number];
export type PimAuditStatus = (typeof PIM_AUDIT_STATUSES)[number];
export type PimAuditValueState = (typeof PIM_AUDIT_VALUE_STATES)[number];

export const PIM_AUDIT_SOURCE_MODULES = [
  "Product Manager",
  "Unified Product Workflow",
  "Variant Matrix",
  "Product Color",
  "Color Master",
  "Size Master",
  "Bulk Import",
  "Bulk Edit",
  "Product Export",
  "Reconciliation",
  "Permission",
  "Security",
  "System"
] as const;

export type PimAuditSourceModule = (typeof PIM_AUDIT_SOURCE_MODULES)[number];

export type PimAuditEventDefinition = {
  category: PimAuditCategory;
  sourceModule: PimAuditSourceModule;
  statuses: readonly PimAuditStatus[];
  label: string;
  retentionClass: "PIM_24_MONTHS" | "SECURITY_12_MONTHS" | "PIM_CHILD_12_MONTHS";
};

const lifecycle = ["STARTED", "COMPLETED", "FAILED", "PARTIAL", "ROLLED_BACK", "DENIED", "CANCELLED", "EXPIRED", "INCOMPLETE"] as const;
const completedFailed = ["COMPLETED", "FAILED", "DENIED"] as const;
const completedOnly = ["COMPLETED"] as const;

export const PIM_AUDIT_EVENT_REGISTRY = {
  PRODUCT_CREATED: event("PRODUCT", "Product Manager", completedFailed, "Produk dibuat"),
  PRODUCT_UPDATED: event("PRODUCT", "Product Manager", completedFailed, "Produk diubah"),
  PRODUCT_DUPLICATED: event("PRODUCT", "Product Manager", completedFailed, "Produk diduplikasi"),
  PRODUCT_CATEGORY_CHANGED: event("PRODUCT", "Unified Product Workflow", completedFailed, "Kategori produk diubah"),
  PRODUCT_STATUS_CHANGED: event("PRODUCT", "Unified Product Workflow", completedFailed, "Status produk diubah"),
  PRODUCT_PUBLISHED: event("PUBLISHING", "Unified Product Workflow", completedFailed, "Produk dipublikasikan"),
  PRODUCT_PUBLISH_FAILED: event("PUBLISHING", "Unified Product Workflow", ["FAILED", "DENIED"], "Publikasi produk gagal"),
  PRODUCT_ARCHIVED: event("PRODUCT", "Unified Product Workflow", completedFailed, "Produk diarsipkan"),
  PRODUCT_RESTORED: event("PRODUCT", "Unified Product Workflow", completedFailed, "Produk dipulihkan"),
  VARIANT_CREATED: event("VARIANT", "Product Manager", completedFailed, "Varian dibuat"),
  VARIANT_UPDATED: event("VARIANT", "Product Manager", completedFailed, "Varian diubah"),
  VARIANT_SKU_CHANGED: event("VARIANT", "Product Manager", completedFailed, "SKU varian diubah"),
  VARIANT_PRICE_CHANGED: event("VARIANT", "Product Manager", completedFailed, "Harga varian diubah"),
  VARIANT_STOCK_CHANGED: event("VARIANT", "Product Manager", completedFailed, "Stok varian diubah"),
  VARIANT_COLOR_CHANGED: event("VARIANT", "Product Manager", completedFailed, "Warna varian diubah"),
  VARIANT_SIZE_CHANGED: event("VARIANT", "Product Manager", completedFailed, "Ukuran varian diubah"),
  VARIANT_STATUS_CHANGED: event("VARIANT", "Product Manager", completedFailed, "Status varian diubah"),
  VARIANT_MATRIX_UPDATED: event("VARIANT", "Variant Matrix", lifecycle, "Variant Matrix disimpan"),
  PRODUCT_COLOR_CREATED: event("PRODUCT_COLOR", "Product Color", completedFailed, "Warna produk ditambahkan"),
  PRODUCT_COLOR_UPDATED: event("PRODUCT_COLOR", "Product Color", completedFailed, "Warna produk diubah"),
  PRODUCT_COLOR_STATUS_CHANGED: event("PRODUCT_COLOR", "Product Color", completedFailed, "Status warna produk diubah"),
  COLOR_MASTER_CREATED: event("COLOR_MASTER", "Color Master", completedFailed, "Master warna dibuat"),
  COLOR_MASTER_UPDATED: event("COLOR_MASTER", "Color Master", completedFailed, "Master warna diubah"),
  COLOR_MASTER_STATUS_CHANGED: event("COLOR_MASTER", "Color Master", completedFailed, "Status master warna diubah"),
  COLOR_MASTER_ORDER_CHANGED: event("COLOR_MASTER", "Color Master", completedFailed, "Urutan master warna diubah"),
  SIZE_MASTER_CREATED: event("SIZE_MASTER", "Size Master", completedFailed, "Master ukuran dibuat"),
  SIZE_MASTER_UPDATED: event("SIZE_MASTER", "Size Master", completedFailed, "Master ukuran diubah"),
  SIZE_MASTER_STATUS_CHANGED: event("SIZE_MASTER", "Size Master", completedFailed, "Status master ukuran diubah"),
  SIZE_MASTER_ORDER_CHANGED: event("SIZE_MASTER", "Size Master", completedFailed, "Urutan master ukuran diubah"),
  BULK_IMPORT_PREVIEWED: event("BULK_IMPORT", "Bulk Import", ["COMPLETED", "FAILED", "DENIED"], "Dry run Bulk Import dijalankan"),
  BULK_IMPORT_STARTED: event("BULK_IMPORT", "Bulk Import", ["STARTED"], "Bulk Import dimulai"),
  BULK_IMPORT_COMPLETED: event("BULK_IMPORT", "Bulk Import", lifecycle, "Bulk Import selesai"),
  BULK_IMPORT_FAILED: event("BULK_IMPORT", "Bulk Import", ["FAILED", "INCOMPLETE"], "Bulk Import gagal"),
  BULK_IMPORT_ROLLED_BACK: event("BULK_IMPORT", "Bulk Import", ["ROLLED_BACK"], "Bulk Import di-rollback"),
  BULK_IMPORT_DENIED: event("PERMISSION", "Bulk Import", ["DENIED"], "Bulk Import ditolak", "SECURITY_12_MONTHS"),
  BULK_EDIT_PREVIEWED: event("BULK_EDIT", "Bulk Edit", ["COMPLETED", "FAILED", "DENIED"], "Preview Bulk Edit dijalankan"),
  BULK_EDIT_STARTED: event("BULK_EDIT", "Bulk Edit", ["STARTED"], "Bulk Edit dimulai"),
  BULK_EDIT_COMPLETED: event("BULK_EDIT", "Bulk Edit", lifecycle, "Bulk Edit selesai"),
  BULK_EDIT_FAILED: event("BULK_EDIT", "Bulk Edit", ["FAILED", "INCOMPLETE"], "Bulk Edit gagal"),
  BULK_EDIT_ROLLED_BACK: event("BULK_EDIT", "Bulk Edit", ["ROLLED_BACK"], "Bulk Edit di-rollback"),
  BULK_EDIT_DENIED: event("PERMISSION", "Bulk Edit", ["DENIED"], "Bulk Edit ditolak", "SECURITY_12_MONTHS"),
  EXPORT_REQUESTED: event("EXPORT", "Product Export", ["STARTED"], "Export diminta"),
  EXPORT_COMPLETED: event("EXPORT", "Product Export", ["COMPLETED"], "Export selesai"),
  EXPORT_FAILED: event("EXPORT", "Product Export", ["FAILED", "INCOMPLETE"], "Export gagal"),
  EXPORT_DOWNLOADED: event("EXPORT", "Product Export", ["COMPLETED", "DENIED", "EXPIRED"], "Export diunduh"),
  EXPORT_EXPIRED: event("EXPORT", "Product Export", ["EXPIRED"], "Export kedaluwarsa"),
  EXPORT_DENIED: event("PERMISSION", "Product Export", ["DENIED"], "Export ditolak", "SECURITY_12_MONTHS"),
  RECONCILIATION_STARTED: event("RECONCILIATION", "Reconciliation", ["STARTED"], "Reconciliation dimulai"),
  RECONCILIATION_COMPLETED: event("RECONCILIATION", "Reconciliation", ["COMPLETED", "PARTIAL", "INCOMPLETE"], "Reconciliation selesai"),
  RECONCILIATION_FAILED: event("RECONCILIATION", "Reconciliation", ["FAILED", "INCOMPLETE"], "Reconciliation gagal"),
  RECONCILIATION_REPORT_GENERATED: event("RECONCILIATION", "Reconciliation", completedFailed, "Laporan reconciliation dibuat"),
  RECONCILIATION_REPORT_DOWNLOADED: event("RECONCILIATION", "Reconciliation", completedFailed, "Laporan reconciliation diunduh"),
  RECONCILIATION_DENIED: event("PERMISSION", "Reconciliation", ["DENIED"], "Reconciliation ditolak", "SECURITY_12_MONTHS"),
  PIM_PERMISSION_DENIED: event("PERMISSION", "Permission", ["DENIED"], "Akses PIM ditolak", "SECURITY_12_MONTHS"),
  PIM_SECURITY_REJECTED: event("SECURITY", "Security", ["DENIED", "FAILED"], "Permintaan PIM ditolak oleh kontrol keamanan", "SECURITY_12_MONTHS"),
  PIM_AUDIT_CORRECTION: event("SYSTEM", "System", completedOnly, "Koreksi audit ditambahkan")
} as const satisfies Record<string, PimAuditEventDefinition>;

export type PimAuditEventCode = keyof typeof PIM_AUDIT_EVENT_REGISTRY;

export type PimAuditChange = {
  field: string;
  beforeValue: unknown;
  afterValue: unknown;
  beforeState: PimAuditValueState;
  afterState: PimAuditValueState;
};

export type PimAuditEntity = {
  entityType: string;
  entityId: string | null;
  entityLabel?: string | null;
  productId?: string | null;
  variantId?: string | null;
  sku?: string | null;
  resultStatus?: PimAuditStatus | null;
  failureCode?: string | null;
};

export type PimAuditRecordInput = {
  eventCode: PimAuditEventCode;
  status: PimAuditStatus;
  actorId: string;
  actorRole: string;
  actorLabel?: string | null;
  requestId: string;
  operationId: string;
  idempotencyKey: string;
  entityType: string;
  entityId?: string | null;
  entityLabel?: string | null;
  productId?: string | null;
  productColorId?: string | null;
  variantId?: string | null;
  sku?: string | null;
  batchId?: string | null;
  parentAuditId?: string | null;
  durationMs?: number | null;
  summary: string;
  failureCode?: string | null;
  metadata?: Record<string, unknown>;
  changes?: PimAuditChange[];
  entities?: PimAuditEntity[];
};

const SENSITIVE_KEY = /(?:password|passphrase|secret|token|cookie|authorization|service[_-]?role|api[_-]?key|signed[_-]?url|raw[_-]?(?:file|spreadsheet|export)|customer|order|payment)/i;
const SIGNED_URL_VALUE = /(?:x-amz-signature|x-amz-credential|signature=|token=|service_role)/i;
const SAFE_METADATA_KEYS = new Set([
  "actionType", "selectionMode", "targetType", "targetCount", "successCount", "failureCount",
  "partialCount", "skippedCount", "productCount", "variantCount", "rowCount", "format", "schemaVersion",
  "ruleSetVersion", "scopeHash", "scopeKind", "fileChecksum", "payloadHash", "fileSize", "fileSha256",
  "findingCount", "warningCount", "errorCount", "passCount", "completeness", "replayed", "importMode",
  "changedFields", "environment", "timezone", "reasonCode", "httpStatus", "jobKind", "runId"
]);

function event(
  category: PimAuditCategory,
  sourceModule: PimAuditSourceModule,
  statuses: readonly PimAuditStatus[],
  label: string,
  retentionClass: PimAuditEventDefinition["retentionClass"] = "PIM_24_MONTHS"
): PimAuditEventDefinition {
  return { category, sourceModule, statuses, label, retentionClass };
}

export function isPimAuditEventCode(value: unknown): value is PimAuditEventCode {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(PIM_AUDIT_EVENT_REGISTRY, value);
}

export function assertPimAuditEvent(eventCode: PimAuditEventCode, status: PimAuditStatus) {
  const definition = (PIM_AUDIT_EVENT_REGISTRY as Record<string, PimAuditEventDefinition>)[eventCode];
  if (!definition || !(definition.statuses as readonly PimAuditStatus[]).includes(status)) {
    throw new Error(`Invalid PIM audit event/status: ${eventCode}/${status}`);
  }
  return definition;
}

export function auditValueState(value: unknown): PimAuditValueState {
  if (value === null || value === undefined) return "NULL";
  if (value === "") return "EMPTY_STRING";
  if (value === 0) return "ZERO";
  return "VALUE";
}

export function diffPimAuditFields(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
  allowlist: readonly string[]
): PimAuditChange[] {
  const changes: PimAuditChange[] = [];
  for (const field of allowlist) {
    if (SENSITIVE_KEY.test(field)) continue;
    const beforeValue = before?.[field] ?? null;
    const afterValue = after?.[field] ?? null;
    if (stableValue(beforeValue) === stableValue(afterValue)) continue;
    changes.push({
      field,
      beforeValue: sanitizeAuditValue(beforeValue),
      afterValue: sanitizeAuditValue(afterValue),
      beforeState: auditValueState(beforeValue),
      afterState: auditValueState(afterValue)
    });
  }
  return changes;
}

export function sanitizePimAuditMetadata(value: Record<string, unknown> | undefined) {
  const output: Record<string, unknown> = {};
  for (const [key, candidate] of Object.entries(value || {})) {
    if (!SAFE_METADATA_KEYS.has(key) || SENSITIVE_KEY.test(key)) continue;
    output[key] = sanitizeAuditValue(candidate);
  }
  return output;
}

export function sanitizePimAuditEntity(value: PimAuditEntity): PimAuditEntity {
  return {
    entityType: safeText(value.entityType, 60),
    entityId: safeUuid(value.entityId),
    entityLabel: value.entityLabel ? safeText(value.entityLabel, 180) : null,
    productId: safeUuid(value.productId),
    variantId: safeUuid(value.variantId),
    sku: value.sku ? safeText(value.sku, 100) : null,
    resultStatus: value.resultStatus && PIM_AUDIT_STATUSES.includes(value.resultStatus) ? value.resultStatus : null,
    failureCode: value.failureCode ? safeFailureCode(value.failureCode) : null
  };
}

export function safeFailureCode(value: string | null | undefined) {
  if (!value) return null;
  const normalized = value.toUpperCase().replace(/[^A-Z0-9_]/g, "_").slice(0, 100);
  return normalized || "UNKNOWN_ERROR";
}

export function safeAuditSearch(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/[^\p{L}\p{N} ._\/-]/gu, "").slice(0, 80) : "";
}

export function safeUuid(value: unknown): string | null {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : null;
}

function sanitizeAuditValue(value: unknown): unknown {
  if (typeof value === "string") return SIGNED_URL_VALUE.test(value) ? "[REDACTED]" : value.slice(0, 500);
  if (typeof value === "number" || typeof value === "boolean" || value === null) return value;
  if (Array.isArray(value)) return value.slice(0, 100).map(sanitizeAuditValue);
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, candidate] of Object.entries(value as Record<string, unknown>)) {
      output[key] = SENSITIVE_KEY.test(key) ? "[REDACTED]" : sanitizeAuditValue(candidate);
    }
    return output;
  }
  return String(value ?? "").slice(0, 500);
}

function stableValue(value: unknown) {
  if (value === undefined) return "null";
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return JSON.stringify(Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))));
  }
  return JSON.stringify(value);
}

function safeText(value: string, limit: number) {
  return value.trim().replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, limit);
}
