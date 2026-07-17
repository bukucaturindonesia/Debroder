import ExcelJS from "exceljs";
import {
  PIM_PHASE6_CURRENCY,
  PIM_PHASE6_EXPORT_SCHEMA_VERSION,
  PIM_PHASE6_REPORT_SCHEMA_VERSION,
  PIM_PHASE6_TIMEZONE,
  phase6FileTimestamp,
  protectSpreadsheetText,
  toCsvUtf8,
  type PimPhase6Format,
  type PimPhase6Snapshot
} from "@/lib/pim-phase6";
import { reconciliationRuleRegistry, type PimReconciliationFinding, type PimReconciliationStatus } from "@/lib/pim-reconciliation";

export type PimExportMetadata = {
  exportId: string;
  generatedAt: string;
  generatedBy: string;
  generatedByRole: string;
  sourceEnvironment: string;
  scopeLabel: string;
  filterSummary: string;
  filterHash: string;
};

export type PimReconciliationReportInput = {
  runId: string;
  generatedAt: string;
  generatedBy: string;
  generatedByRole: string;
  scopeLabel: string;
  scopeHash: string;
  snapshotAt: string;
  ruleSetVersion: string;
  overallStatus: PimReconciliationStatus;
  completeness: "COMPLETE" | "INCOMPLETE";
  productCount: number;
  variantCount: number;
  findings: PimReconciliationFinding[];
};

export type GeneratedPimFile = {
  bytes: Uint8Array;
  mimeType: string;
  fileName: string;
};

const PRODUCT_HEADERS = [
  "product_id_read_only", "product_name", "slug", "category_id_read_only", "category_code", "category_name",
  "status", "active", "product_type", "pricing_mode", "base_price", "created_at", "updated_at",
  "variant_count", "active_variant_count", "active_sellable_count", "publish_readiness_summary"
];

const VARIANT_HEADERS = [
  "variant_id_read_only", "variant_size_id_read_only", "product_id_read_only", "product_name", "product_slug",
  "color_master_id_read_only", "color_code", "color_name", "color_display_order", "size_master_id_read_only",
  "size_code", "size_name", "size_display_order", "sku_text", "base_price", "variant_price_adjustment",
  "size_price_adjustment", "effective_price_read_only", "stock", "variant_status", "sellable_status", "active",
  "created_at", "updated_at"
];

const CSV_HEADERS = [
  "export_id", "export_schema_version", "generated_at", "snapshot_at", "currency", "timezone", "scope_hash",
  ...VARIANT_HEADERS
];

export async function generatePimProductExport(format: PimPhase6Format, snapshot: PimPhase6Snapshot, metadata: PimExportMetadata): Promise<GeneratedPimFile> {
  const timestamp = phase6FileTimestamp(new Date(metadata.generatedAt));
  if (format === "csv") {
    const rows = snapshot.variants.map((row) => [
      metadata.exportId, PIM_PHASE6_EXPORT_SCHEMA_VERSION, metadata.generatedAt, snapshot.snapshotAt, PIM_PHASE6_CURRENCY,
      PIM_PHASE6_TIMEZONE, snapshot.scopeHash, ...variantValues(row)
    ]);
    return {
      bytes: new TextEncoder().encode(toCsvUtf8(CSV_HEADERS, rows)),
      mimeType: "text/csv; charset=utf-8",
      fileName: `DEBRODER_PIM_PRODUCT_EXPORT_${timestamp}.csv`
    };
  }

  const workbook = baseWorkbook(metadata.generatedAt);
  addInformationSheet(workbook, metadata, snapshot);
  addDataDictionarySheet(workbook);
  addProductSheet(workbook, snapshot);
  addVariantSheet(workbook, snapshot);
  addMasterSheet(workbook, "CATEGORY_REFERENCE", snapshot.categories.map((row) => [row.id, row.code, row.name, row.displayOrder, row.active]), ["master_id_read_only", "canonical_code", "display_name", "display_order", "active"]);
  addMasterSheet(workbook, "COLOR_MASTER_REFERENCE", snapshot.colors.map((row) => [row.id, row.code, row.name, row.displayOrder, row.active, row.group || "", row.hex || ""]), ["master_id_read_only", "canonical_code", "display_name", "display_order", "active", "group", "hex"]);
  addMasterSheet(workbook, "SIZE_MASTER_REFERENCE", snapshot.sizes.map((row) => [row.id, row.code, row.name, row.displayOrder, row.active, row.group || ""]), ["master_id_read_only", "canonical_code", "display_name", "display_order", "active", "group"]);
  const bytes = new Uint8Array(await workbook.xlsx.writeBuffer());
  return {
    bytes,
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    fileName: `DEBRODER_PIM_PRODUCT_EXPORT_${timestamp}.xlsx`
  };
}

export async function generatePimReconciliationReport(format: PimPhase6Format, input: PimReconciliationReportInput): Promise<GeneratedPimFile> {
  const timestamp = phase6FileTimestamp(new Date(input.generatedAt));
  const headers = [
    "run_id", "report_schema_version", "rule_set_version", "snapshot_at", "scope_hash", "overall_status",
    "fingerprint", "issue_code", "rule_version", "severity", "lifecycle_status", "product_id_read_only",
    "product_name", "category_id_read_only", "category_name", "product_status", "variant_id_read_only", "sku_text",
    "field", "current_value", "value_state", "message", "recommendation", "detected_at", "source_level",
    "editor_destination", "evaluation_status", "rule_applies_to"
  ];
  const rows = input.findings.map((finding) => [
    input.runId, PIM_PHASE6_REPORT_SCHEMA_VERSION, input.ruleSetVersion, input.snapshotAt, input.scopeHash, input.overallStatus,
    finding.fingerprint, finding.issueCode, finding.ruleVersion, finding.severity, finding.lifecycle, finding.productId,
    finding.productName, finding.categoryId || "", finding.categoryName, finding.productStatus, finding.variantId || "",
    finding.sku || "", finding.field, finding.currentValue ?? "", finding.valueState, finding.message,
    finding.recommendation, finding.detectedAt, finding.sourceLevel, finding.editorDestination,
    finding.evaluationStatus, finding.ruleAppliesTo
  ]);
  if (format === "csv") {
    return {
      bytes: new TextEncoder().encode(toCsvUtf8(headers, rows)),
      mimeType: "text/csv; charset=utf-8",
      fileName: `DEBRODER_PIM_RECONCILIATION_REPORT_${timestamp}.csv`
    };
  }

  const workbook = baseWorkbook(input.generatedAt);
  const info = workbook.addWorksheet("REPORT_INFORMATION");
  addKeyValueRows(info, [
    ["run_id", input.runId], ["report_schema_version", PIM_PHASE6_REPORT_SCHEMA_VERSION], ["generated_at", input.generatedAt],
    ["generated_by", input.generatedBy], ["generated_by_role", input.generatedByRole], ["scope", input.scopeLabel],
    ["scope_hash", input.scopeHash], ["snapshot_at", input.snapshotAt], ["rule_set_version", input.ruleSetVersion],
    ["overall_status", input.overallStatus], ["completeness", input.completeness], ["product_count", input.productCount],
    ["variant_count", input.variantCount], ["total_findings", input.findings.filter((item) => item.lifecycle !== "RESOLVED").length],
    ["new_findings", input.findings.filter((item) => item.lifecycle === "NEW").length],
    ["existing_findings", input.findings.filter((item) => item.lifecycle === "EXISTING").length],
    ["resolved_findings", input.findings.filter((item) => item.lifecycle === "RESOLVED").length],
    ["timezone", PIM_PHASE6_TIMEZONE]
  ]);
  const summary = workbook.addWorksheet("SUMMARY");
  addKeyValueRows(summary, [
    ["overall_status", input.overallStatus], ["completeness", input.completeness],
    ["errors", input.findings.filter((item) => item.lifecycle !== "RESOLVED" && item.severity === "ERROR").length],
    ["warnings", input.findings.filter((item) => item.lifecycle !== "RESOLVED" && item.severity === "WARNING").length],
    ["new", input.findings.filter((item) => item.lifecycle === "NEW").length],
    ["existing", input.findings.filter((item) => item.lifecycle === "EXISTING").length],
    ["resolved", input.findings.filter((item) => item.lifecycle === "RESOLVED").length]
  ]);
  addTableSheet(workbook, "FINDINGS", headers, rows);
  const registryHeaders = ["rule_code", "version", "severity", "description", "recommendation", "applies_to", "data_level", "enabled", "skip_reason"];
  const registryRows = reconciliationRuleRegistry().map((item) => [item.code, item.version, item.severity, item.description, item.recommendation, item.appliesTo, item.dataLevel, item.enabled, item.skipReason || ""]);
  addTableSheet(workbook, "RULE_REGISTRY", registryHeaders, registryRows);
  addTableSheet(workbook, "DATA_DICTIONARY", ["column_name", "description", "data_type", "source_level", "read_only", "null_representation"], reconciliationDictionary());
  return {
    bytes: new Uint8Array(await workbook.xlsx.writeBuffer()),
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    fileName: `DEBRODER_PIM_RECONCILIATION_REPORT_${timestamp}.xlsx`
  };
}

function addInformationSheet(workbook: ExcelJS.Workbook, metadata: PimExportMetadata, snapshot: PimPhase6Snapshot) {
  const sheet = workbook.addWorksheet("EXPORT_INFORMATION");
  addKeyValueRows(sheet, [
    ["NOTICE", "THIS FILE IS A PRODUCT EXPORT — NOT A BULK IMPORT TEMPLATE"],
    ["IMPORT_INSTRUCTION", "Untuk import produk, gunakan template resmi Bulk Import Produk."],
    ["export_id", metadata.exportId], ["export_schema_version", PIM_PHASE6_EXPORT_SCHEMA_VERSION],
    ["generated_at", metadata.generatedAt], ["generated_by", metadata.generatedBy], ["generated_by_role", metadata.generatedByRole],
    ["source_environment", metadata.sourceEnvironment], ["scope", metadata.scopeLabel], ["filter_summary", metadata.filterSummary],
    ["filter_hash", metadata.filterHash], ["snapshot_at", snapshot.snapshotAt], ["product_count", snapshot.productCount],
    ["variant_count", snapshot.variantCount], ["currency", PIM_PHASE6_CURRENCY], ["timezone", PIM_PHASE6_TIMEZONE],
    ["deterministic_sort", "product_name, product_id, color_display_order, color_code, size_display_order, size_code, sku, variant_id"],
    ["file_integrity_status", "SHA-256 tersedia pada result/history metadata terpisah."],
    ["formula_injection_protection", "Text yang diawali = + - @ diprefix apostrophe hanya pada representasi export."]
  ]);
}

function addDataDictionarySheet(workbook: ExcelJS.Workbook) {
  addTableSheet(workbook, "DATA_DICTIONARY", ["column_name", "description", "data_type", "source_level", "required", "read_only", "null_representation", "example"], exportDictionary());
}

function addProductSheet(workbook: ExcelJS.Workbook, snapshot: PimPhase6Snapshot) {
  const rows = snapshot.products.map((row) => [
    row.productId, row.productName, row.slug, row.categoryId || "", row.categoryCode, row.categoryName, row.status,
    row.active, row.productType, row.pricingMode, row.basePrice ?? "", row.createdAt || "", row.updatedAt || "",
    row.variantCount, row.activeVariantCount, row.activeSellableCount,
    row.status === "active" && row.activeVariantCount > 0 && row.activeSellableCount > 0 && row.frontImageCount > 0 ? "READY" : "NEEDS_ATTENTION"
  ]);
  const sheet = addTableSheet(workbook, "PRODUCTS", PRODUCT_HEADERS, rows);
  for (const index of [1, 4]) sheet.getColumn(index).numFmt = "@";
}

function addVariantSheet(workbook: ExcelJS.Workbook, snapshot: PimPhase6Snapshot) {
  const rows = snapshot.variants.map(variantValues);
  const sheet = addTableSheet(workbook, "VARIANTS", VARIANT_HEADERS, rows);
  for (const index of [1, 2, 3, 6, 10, 14]) sheet.getColumn(index).numFmt = "@";
}

function variantValues(row: PimPhase6Snapshot["variants"][number]) {
  return [
    row.variantId, row.variantSizeId, row.productId, row.productName, row.productSlug, row.colorMasterId || "", row.colorCode,
    row.colorName, row.colorDisplayOrder ?? "", row.sizeMasterId || "", row.sizeCode, row.sizeName, row.sizeDisplayOrder ?? "",
    row.sku, row.basePrice ?? "", row.variantPriceAdjustment ?? "", row.sizePriceAdjustment ?? "", row.effectivePrice ?? "",
    row.stock ?? "", row.variantStatus, row.sellableStatus, row.variantActive && row.sellableActive, row.createdAt || "", row.updatedAt || ""
  ];
}

function addMasterSheet(workbook: ExcelJS.Workbook, name: string, rows: unknown[][], headers: string[]) {
  const sheet = addTableSheet(workbook, name, headers, rows);
  sheet.getColumn(1).numFmt = "@";
}

function addTableSheet(workbook: ExcelJS.Workbook, name: string, headers: string[], rows: unknown[][]) {
  const sheet = workbook.addWorksheet(name);
  sheet.addRow(headers);
  for (const row of rows) sheet.addRow(row.map((value) => typeof value === "string" ? protectSpreadsheetText(value) : value));
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF173F35" } };
  sheet.columns.forEach((column) => { column.width = 22; });
  return sheet;
}

function addKeyValueRows(sheet: ExcelJS.Worksheet, rows: Array<[string, unknown]>) {
  sheet.addRow(["field", "value"]);
  for (const [key, value] of rows) sheet.addRow([key, typeof value === "string" ? protectSpreadsheetText(value) : value]);
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF173F35" } };
  sheet.getColumn(1).width = 34;
  sheet.getColumn(2).width = 100;
  sheet.getColumn(2).numFmt = "@";
  sheet.views = [{ state: "frozen", ySplit: 1 }];
}

function baseWorkbook(generatedAt: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "DEBRODER PIM";
  workbook.company = "DEBRODER";
  workbook.created = new Date(generatedAt);
  workbook.modified = new Date(generatedAt);
  return workbook;
}

function exportDictionary(): unknown[][] {
  const rows: unknown[][] = [];
  for (const column of PRODUCT_HEADERS) rows.push([column, productDescription(column), inferType(column), "Product Root / Derived Read-Only Field", ["product_name", "slug", "status"].includes(column), true, "Database null = blank cell", column === "base_price" ? 50000 : ""]);
  for (const column of VARIANT_HEADERS) rows.push([column, variantDescription(column), inferType(column), "Product Color / Product Variant / Master / Derived Read-Only Field", ["sku_text", "stock"].includes(column), true, "Database null = blank cell; numeric 0 remains 0", column === "sku_text" ? "000123" : ""]);
  return rows;
}

function reconciliationDictionary(): unknown[][] {
  return [
    ["fingerprint", "Stable issue identity; excludes run and timestamp.", "text", "Derived Read-Only Field", true, "Never null"],
    ["issue_code", "Central reconciliation rule code.", "text", "Rule Registry", true, "Never null"],
    ["severity", "WARNING or ERROR.", "enum", "Rule Registry", true, "Never null"],
    ["lifecycle_status", "NEW, EXISTING, RESOLVED, or NOT_EVALUATED.", "enum", "Derived Read-Only Field", true, "Never null"],
    ["current_value", "Observed value; no silent normalization.", "mixed", "Canonical PIM", true, "Database null = blank cell"],
    ["editor_destination", "Safe navigation to canonical editor only.", "text", "Derived Read-Only Field", true, "Never null"]
  ];
}

function inferType(column: string) {
  if (column.includes("price") || column === "stock" || column.endsWith("count") || column.endsWith("order")) return "integer";
  if (column === "active") return "boolean";
  if (column.endsWith("_at")) return "ISO 8601 timestamp";
  return "text";
}

function productDescription(column: string) {
  if (column.includes("read_only")) return "Canonical database ID — READ ONLY, DO NOT EDIT.";
  if (column === "publish_readiness_summary") return "Read-only readiness summary; canonical validator remains authoritative.";
  return `Canonical Product Root field: ${column}.`;
}

function variantDescription(column: string) {
  if (column.includes("read_only")) return "Canonical or derived identifier — READ ONLY, DO NOT EDIT.";
  if (column === "effective_price_read_only") return "Derived canonical display price: base plus existing adjustments; source values are exported separately.";
  if (column === "sku_text") return "Sellable SKU stored as text so leading zero is preserved.";
  return `Canonical Product Variant field: ${column}.`;
}
