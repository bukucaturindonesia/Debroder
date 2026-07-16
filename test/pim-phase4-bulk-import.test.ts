import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import {
  PIM_BULK_IMPORT_HEADERS,
  PIM_BULK_IMPORT_LIMITS,
  buildPimBulkImportPlan,
  hashPimBulkImportPayload,
  normalizePimBulkImportRows,
  parsePimBulkImportFile,
  pimBulkImportErrorCsv,
  pimBulkImportTemplateCsv,
  pimBulkImportTemplateXlsx
} from "@/lib/pim-bulk-import";
import {
  createPimBulkPreviewToken,
  isPimBulkImportWriteRole,
  verifyPimBulkPreviewToken
} from "@/lib/pim-bulk-import-server";

const colorId = "11111111-1111-4111-8111-111111111111";
const sizeId = "22222222-2222-4222-8222-222222222222";
const categoryId = "33333333-3333-4333-8333-333333333333";
const validValues = ["TSHIRT-001", "Kaos Cotton", "kaos-cotton", categoryId, "kaos-polos", colorId, "black", sizeId, "m", "DBR-K24-BLK-M", "125000", "0", "12"];

describe("PIM Phase 4 official templates", () => {
  it("emits the canonical UTF-8 CSV header", () => {
    expect(pimBulkImportTemplateCsv()).toContain(PIM_BULK_IMPORT_HEADERS.join(","));
    expect(pimBulkImportTemplateCsv().startsWith("\uFEFF")).toBe(true);
  });

  it("builds XLSX with instructions, import, and live reference sheets", async () => {
    const bytes = await pimBulkImportTemplateXlsx({
      categories: [{ id: categoryId, code: "kaos-polos", name: "Kaos Polos", active: true }],
      colors: [{ id: colorId, code: "black", name: "Black", active: true }],
      sizes: [{ id: sizeId, code: "m", name: "M", active: true, group: "apparel" }]
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(["INSTRUCTIONS", "PRODUCT_IMPORT", "COLOR_MASTER", "SIZE_MASTER", "CATEGORY_REFERENCE"]);
    expect(workbook.getWorksheet("PRODUCT_IMPORT")?.getRow(1).values).toEqual([, ...PIM_BULK_IMPORT_HEADERS]);
    expect(workbook.getWorksheet("COLOR_MASTER")?.getCell("A2").value).toBe(colorId);
  });
});

describe("PIM Phase 4 CSV/XLSX parser", () => {
  it("parses valid CSV and XLSX into equivalent canonical rows", async () => {
    const csv = `${PIM_BULK_IMPORT_HEADERS.join(",")}\r\n${validValues.join(",")}\r\n`;
    const csvResult = await parsePimBulkImportFile({ fileName: "import.csv", mimeType: "text/csv", bytes: new TextEncoder().encode(csv) });
    const xlsxResult = await parsePimBulkImportFile({ fileName: "import.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", bytes: await workbookBytes([validValues]) });
    expect(csvResult.issues).toEqual([]);
    expect(xlsxResult.issues).toEqual([]);
    expect(csvResult.rows[0].values).toEqual(xlsxResult.rows[0].values);
  });

  it("rejects empty, invalid extension, and invalid MIME", async () => {
    const empty = await parsePimBulkImportFile({ fileName: "empty.csv", mimeType: "text/csv", bytes: new Uint8Array() });
    const extension = await parsePimBulkImportFile({ fileName: "import.xls", mimeType: "application/vnd.ms-excel", bytes: new Uint8Array([1]) });
    const mime = await parsePimBulkImportFile({ fileName: "import.csv", mimeType: "application/pdf", bytes: new Uint8Array([1]) });
    expect(empty.issues.some((issue) => issue.errorCode === "FILE_EMPTY")).toBe(true);
    expect(extension.issues.some((issue) => issue.errorCode === "INVALID_EXTENSION")).toBe(true);
    expect(mime.issues.some((issue) => issue.errorCode === "INVALID_MIME")).toBe(true);
  });

  it("rejects missing sheet, missing header, duplicate header, and formula cells", async () => {
    const missingSheet = new ExcelJS.Workbook();
    missingSheet.addWorksheet("WRONG").addRow(PIM_BULK_IMPORT_HEADERS);
    const missing = await parsePimBulkImportFile({ fileName: "import.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", bytes: Buffer.from(await missingSheet.xlsx.writeBuffer()) });
    const badHeader = await workbookBytes([validValues], [...PIM_BULK_IMPORT_HEADERS.slice(0, -1), "sku"]);
    const headers = await parsePimBulkImportFile({ fileName: "import.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", bytes: badHeader });
    const formulaBook = new ExcelJS.Workbook();
    const sheet = formulaBook.addWorksheet("PRODUCT_IMPORT");
    sheet.addRow(PIM_BULK_IMPORT_HEADERS);
    sheet.addRow(validValues);
    sheet.getCell("K2").value = { formula: "100000+25000", result: 125000 };
    const formula = await parsePimBulkImportFile({ fileName: "formula.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", bytes: Buffer.from(await formulaBook.xlsx.writeBuffer()) });
    expect(missing.issues.some((issue) => issue.errorCode === "SHEET_MISSING")).toBe(true);
    expect(headers.issues.some((issue) => issue.errorCode === "HEADER_MISSING" || issue.errorCode === "DUPLICATE_HEADER")).toBe(true);
    expect(formula.issues.some((issue) => issue.errorCode === "FORMULA_NOT_ALLOWED")).toBe(true);
  });

  it("enforces row limit without trusting excess rows", async () => {
    const lines = [PIM_BULK_IMPORT_HEADERS.join(",")];
    for (let index = 0; index <= PIM_BULK_IMPORT_LIMITS.maxRows; index += 1) lines.push([...validValues.slice(0, 9), `DBR-K24-BLK-${index}`, ...validValues.slice(10)].join(","));
    const result = await parsePimBulkImportFile({ fileName: "large.csv", mimeType: "text/csv", bytes: new TextEncoder().encode(lines.join("\n")) });
    expect(result.totalRows).toBe(PIM_BULK_IMPORT_LIMITS.maxRows + 1);
    expect(result.rows).toHaveLength(PIM_BULK_IMPORT_LIMITS.maxRows);
    expect(result.issues.some((issue) => issue.errorCode === "ROW_LIMIT_EXCEEDED")).toBe(true);
  });
});

describe("PIM Phase 4 normalization and grouping", () => {
  it("groups one root with multiple colors/sizes and keeps canonical values", async () => {
    const largeSizeId = "44444444-4444-4444-8444-444444444444";
    const second = [...validValues]; second[7] = largeSizeId; second[8] = "l"; second[9] = "DBR-K24-BLK-L";
    const parsed = await parsePimBulkImportFile({ fileName: "import.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", bytes: await workbookBytes([validValues, second]) });
    const normalized = normalizePimBulkImportRows(parsed.rows);
    expect(normalized.issues).toEqual([]);
    const resolved = normalized.rows.map((row) => ({ ...row, categoryId, categoryCode: "kaos-polos", categoryName: "Kaos Polos", colorMasterId: colorId, colorCode: "black", colorName: "Black", colorHex: "#111111", sizeMasterId: row.sizeCode === "m" ? sizeId : largeSizeId, sizeCode: row.sizeCode || "", sizeName: row.sizeCode?.toUpperCase() || "" }));
    const plan = buildPimBulkImportPlan(resolved);
    expect(plan).toHaveLength(1);
    expect(plan[0].colors[0].sizes).toHaveLength(2);
    expect(hashPimBulkImportPayload(plan)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("blocks inconsistent root, duplicate SKU, duplicate slug, duplicate color-size, negative price, decimal stock, and missing SKU", async () => {
    const conflict = [...validValues]; conflict[1] = "Nama Berbeda";
    const duplicateSku = [...validValues];
    const invalid = [...validValues]; invalid[0] = "TSHIRT-002"; invalid[9] = ""; invalid[10] = "-1"; invalid[12] = "1.5";
    const parsed = await parsePimBulkImportFile({ fileName: "import.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", bytes: await workbookBytes([validValues, conflict, duplicateSku, invalid]) });
    const result = normalizePimBulkImportRows(parsed.rows);
    const codes = new Set(result.issues.map((issue) => issue.errorCode));
    expect(codes).toContain("INCONSISTENT_PRODUCT_ROOT");
    expect(codes).toContain("DUPLICATE_SKU_IN_FILE");
    expect(codes).toContain("DUPLICATE_VARIANT_IN_FILE");
    expect(codes).toContain("REQUIRED_FIELD");
    expect(codes).toContain("INVALID_PRICE");
    expect(codes).toContain("INVALID_STOCK");
  });

  it("neutralizes spreadsheet formula injection in error CSV", () => {
    const csv = pimBulkImportErrorCsv([{ rowNumber: 2, productKey: "TSHIRT-001", field: "sku", value: "=CMD()", errorCode: "INVALID_SKU", message: "invalid", suggestedFix: "fix", severity: "error" }]);
    expect(csv).toContain("'=CMD()");
    expect(csv).not.toContain('\"=CMD()\"');
  });
});

describe("PIM Phase 4 permissions, preview authority, and atomicity contracts", () => {
  it("allows final import only to canonical dependency roles", () => {
    expect(isPimBulkImportWriteRole("owner")).toBe(true);
    expect(isPimBulkImportWriteRole("superadmin")).toBe(true);
    expect(isPimBulkImportWriteRole("super_admin")).toBe(true);
    expect(isPimBulkImportWriteRole("admin")).toBe(false);
    expect(isPimBulkImportWriteRole("admin_guest")).toBe(false);
  });

  it("binds preview token to actor and expiry", () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-secret";
    const token = createPimBulkPreviewToken({ actorId: colorId, fileChecksum: "a".repeat(64), payloadHash: "b".repeat(64), expiresAt: Math.floor(Date.now() / 1000) + 60 });
    expect(verifyPimBulkPreviewToken(token, colorId)).toEqual({ fileChecksum: "a".repeat(64), payloadHash: "b".repeat(64) });
    expect(() => verifyPimBulkPreviewToken(token, sizeId)).toThrow(/actor/i);
    const expired = createPimBulkPreviewToken({ actorId: colorId, fileChecksum: "a".repeat(64), payloadHash: "b".repeat(64), expiresAt: Math.floor(Date.now() / 1000) - 1 });
    expect(() => verifyPimBulkPreviewToken(expired, colorId)).toThrow(/kedaluwarsa/i);
  });

  it("keeps preview write-free and commit server-authoritative", () => {
    const route = source("app/api/admin/products/bulk-import/route.ts");
    const server = source("lib/pim-bulk-import-server.ts");
    expect(route).toContain('action === "preview"');
    expect(route).toContain('method: "GET"');
    expect(route).toContain("validatePimBulkImport");
    expect(route).toContain("commitPimBulkImport");
    expect(server).toContain("verifyPimBulkPreviewToken");
    expect(server).toContain("FILE_CHECKSUM_MISMATCH");
    expect(server).toContain("PAYLOAD_HASH_MISMATCH");
    expect(server).toContain('.rpc("pim_bulk_import_create_v1"');
  });

  it("implements service-role-only atomic RPC with idempotency and rollback semantics", () => {
    const migration = source("supabase/migrations/20260716143000_pim_phase_4_bulk_import_atomic.sql");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("idempotency_key text not null unique");
    expect(migration).toContain("security invoker");
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain("revoke all on function public.pim_bulk_import_create_v1");
    expect(migration).toContain("grant execute on function public.pim_bulk_import_create_v1");
    expect(migration).toContain("to service_role");
    expect(migration).toContain("'draft',false");
    expect(migration).toContain("stock_quantity,stock");
    expect(migration).not.toContain("stock_reservations");
    expect(migration).not.toContain("inventory_ledger");
    expect(migration).not.toContain("order_items");
  });

  it("does not modify frozen commerce, Jersey, or Public UI contracts", () => {
    const route = source("app/api/admin/products/bulk-import/route.ts");
    const ui = source("components/admin/BulkImportProductsAdmin.tsx");
    expect(route).not.toMatch(/checkout|reservation|payment|jersey/i);
    expect(ui).toContain("Create Only");
    expect(ui).toContain("PREVIEW ONLY");
    expect(ui).toContain("Draft");
  });
});

async function workbookBytes(rows: string[][], headers: readonly string[] = PIM_BULK_IMPORT_HEADERS) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("PRODUCT_IMPORT");
  sheet.addRow([...headers]);
  rows.forEach((row) => sheet.addRow(row));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}
