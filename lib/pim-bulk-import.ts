import ExcelJS from "exceljs";
import { createHash } from "node:crypto";
import { isValidSkuCode } from "@/lib/variant-matrix";

export const PIM_BULK_IMPORT_LIMITS = {
  maxFileBytes: 5 * 1024 * 1024,
  maxRows: 2000,
  maxProducts: 250,
  previewRows: 100,
  previewTokenTtlSeconds: 15 * 60
} as const;

export const PIM_BULK_IMPORT_HEADERS = [
  "product_key",
  "product_name",
  "slug",
  "category_id",
  "category_code",
  "color_master_id",
  "color_code",
  "size_master_id",
  "size_code",
  "sku",
  "base_price",
  "price_adjustment",
  "stock"
] as const;

export type PimBulkImportHeader = (typeof PIM_BULK_IMPORT_HEADERS)[number];
export type PimBulkImportErrorCode =
  | "FILE_EMPTY"
  | "FILE_TOO_LARGE"
  | "ROW_LIMIT_EXCEEDED"
  | "PRODUCT_LIMIT_EXCEEDED"
  | "INVALID_EXTENSION"
  | "INVALID_MIME"
  | "UNSAFE_WORKBOOK"
  | "SHEET_MISSING"
  | "SHEET_EMPTY"
  | "HEADER_MISSING"
  | "UNKNOWN_HEADER"
  | "DUPLICATE_HEADER"
  | "REQUIRED_FIELD"
  | "INVALID_TYPE"
  | "INVALID_NUMBER"
  | "INVALID_PRICE"
  | "INVALID_STOCK"
  | "INVALID_SLUG"
  | "INVALID_SKU"
  | "INVALID_MASTER_ID"
  | "INVALID_MASTER_CODE"
  | "MASTER_ID_CODE_MISMATCH"
  | "INACTIVE_MASTER"
  | "DUPLICATE_SKU_IN_FILE"
  | "DUPLICATE_SLUG_IN_FILE"
  | "DUPLICATE_VARIANT_IN_FILE"
  | "DUPLICATE_SKU_DATABASE"
  | "DUPLICATE_SLUG_DATABASE"
  | "VARIANT_CONFLICT_DATABASE"
  | "INCONSISTENT_PRODUCT_ROOT"
  | "FORMULA_NOT_ALLOWED"
  | "MERGED_CELL_NOT_ALLOWED"
  | "PERMISSION_DENIED"
  | "PREVIEW_EXPIRED"
  | "FILE_CHECKSUM_MISMATCH"
  | "PAYLOAD_HASH_MISMATCH"
  | "TRANSACTION_ROLLED_BACK";

export type PimBulkImportIssue = {
  rowNumber: number | null;
  productKey: string;
  field: string;
  value: string;
  errorCode: PimBulkImportErrorCode;
  message: string;
  suggestedFix: string;
  severity: "error" | "warning";
};

export type PimBulkImportParsedRow = {
  rowNumber: number;
  values: Record<PimBulkImportHeader, string>;
};

export type PimBulkImportRow = {
  rowNumber: number;
  productKey: string;
  productName: string;
  slug: string;
  categoryId: string | null;
  categoryCode: string | null;
  colorMasterId: string | null;
  colorCode: string | null;
  sizeMasterId: string | null;
  sizeCode: string | null;
  sku: string;
  basePrice: number;
  priceAdjustment: number;
  stock: number;
};

export type PimBulkImportResolvedRow = PimBulkImportRow & {
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  colorMasterId: string;
  colorCode: string;
  colorName: string;
  colorHex: string;
  sizeMasterId: string;
  sizeCode: string;
  sizeName: string;
};

export type PimBulkImportProductPlan = {
  productKey: string;
  productName: string;
  slug: string;
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  basePrice: number;
  colors: Array<{
    colorMasterId: string;
    colorCode: string;
    colorName: string;
    colorHex: string;
    priceAdjustment: number;
    sizes: Array<{
      sizeMasterId: string;
      sizeCode: string;
      sizeName: string;
      sku: string;
      stock: number;
      priceAdjustment: number;
      rowNumber: number;
    }>;
  }>;
};

export type PimBulkImportParseResult = {
  rows: PimBulkImportParsedRow[];
  issues: PimBulkImportIssue[];
  totalRows: number;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PRODUCT_KEY_PATTERN = /^[A-Z0-9][A-Z0-9._-]{0,63}$/;
const DANGEROUS_WORKBOOK_PATHS = ["vbaproject.bin", "xl/externallinks/", "xl/embeddings/", "xl/activex/", "customui/"];

export async function parsePimBulkImportFile(input: {
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
}): Promise<PimBulkImportParseResult> {
  const issues = validateFileEnvelope(input);
  if (issues.length) return { rows: [], issues, totalRows: 0 };

  const extension = fileExtension(input.fileName);
  if (extension === "csv") return parseCsvImport(input.bytes);
  return parseXlsxImport(input.bytes);
}

export function normalizePimBulkImportRows(parsedRows: PimBulkImportParsedRow[]) {
  const rows: PimBulkImportRow[] = [];
  const issues: PimBulkImportIssue[] = [];

  for (const row of parsedRows) {
    const value = row.values;
    const required: PimBulkImportHeader[] = ["product_key", "product_name", "slug", "sku", "base_price", "stock"];
    for (const field of required) {
      if (!value[field]) issues.push(rowIssue(row, field, "REQUIRED_FIELD", `${field} wajib diisi.`, `Isi ${field} dengan nilai canonical.`));
    }
    if (!value.category_id && !value.category_code) {
      issues.push(rowIssue(row, "category_id", "REQUIRED_FIELD", "category_id atau category_code wajib diisi.", "Gunakan ID atau canonical code dari Category Reference."));
    }
    if (!value.color_master_id && !value.color_code) {
      issues.push(rowIssue(row, "color_master_id", "REQUIRED_FIELD", "color_master_id atau color_code wajib diisi.", "Gunakan ID atau canonical code dari Color Master."));
    }
    if (!value.size_master_id && !value.size_code) {
      issues.push(rowIssue(row, "size_master_id", "REQUIRED_FIELD", "size_master_id atau size_code wajib diisi.", "Gunakan ID atau canonical code dari Size Master."));
    }

    if (value.product_key && !PRODUCT_KEY_PATTERN.test(value.product_key)) {
      issues.push(rowIssue(row, "product_key", "INVALID_TYPE", "product_key wajib uppercase dan hanya memakai A–Z, 0–9, titik, underscore, atau minus.", "Contoh: TSHIRT-001."));
    }
    if (value.product_name && (value.product_name.length < 2 || value.product_name.length > 180)) {
      issues.push(rowIssue(row, "product_name", "INVALID_TYPE", "Nama produk harus 2–180 karakter.", "Periksa panjang nama produk."));
    }
    if (value.slug && !SLUG_PATTERN.test(value.slug)) {
      issues.push(rowIssue(row, "slug", "INVALID_SLUG", "Slug wajib lowercase kebab-case.", "Contoh: kaos-cotton-combed."));
    }
    if (value.sku && !isValidSkuCode(value.sku)) {
      issues.push(rowIssue(row, "sku", "INVALID_SKU", "SKU wajib uppercase dan hanya memakai A–Z, 0–9, atau minus.", "Contoh: DBR-K24-BLK-M."));
    }
    for (const [field, raw] of [["category_id", value.category_id], ["color_master_id", value.color_master_id], ["size_master_id", value.size_master_id]] as const) {
      if (raw && !UUID_PATTERN.test(raw)) issues.push(rowIssue(row, field, "INVALID_MASTER_ID", `${field} bukan UUID valid.`, "Salin ID dari reference template terbaru."));
    }
    for (const [field, raw] of [["category_code", value.category_code], ["color_code", value.color_code], ["size_code", value.size_code]] as const) {
      if (raw && !SLUG_PATTERN.test(raw)) issues.push(rowIssue(row, field, "INVALID_MASTER_CODE", `${field} wajib canonical kebab-case.`, "Salin canonical code dari reference template terbaru."));
    }

    const basePrice = parseInteger(value.base_price);
    const priceAdjustment = value.price_adjustment ? parseInteger(value.price_adjustment) : 0;
    const stock = parseInteger(value.stock);
    if (basePrice === null || basePrice < 0) issues.push(rowIssue(row, "base_price", "INVALID_PRICE", "base_price wajib integer non-negatif tanpa simbol mata uang.", "Gunakan angka bulat, contoh 125000."));
    if (priceAdjustment === null) issues.push(rowIssue(row, "price_adjustment", "INVALID_PRICE", "price_adjustment wajib integer.", "Gunakan angka bulat; isi 0 bila tidak ada penyesuaian."));
    if (stock === null || stock < 0) issues.push(rowIssue(row, "stock", "INVALID_STOCK", "stock wajib integer non-negatif.", "Gunakan angka bulat 0 atau lebih."));

    if (!issues.some((issue) => issue.rowNumber === row.rowNumber)) {
      rows.push({
        rowNumber: row.rowNumber,
        productKey: value.product_key,
        productName: value.product_name,
        slug: value.slug,
        categoryId: value.category_id || null,
        categoryCode: value.category_code || null,
        colorMasterId: value.color_master_id || null,
        colorCode: value.color_code || null,
        sizeMasterId: value.size_master_id || null,
        sizeCode: value.size_code || null,
        sku: value.sku,
        basePrice: basePrice as number,
        priceAdjustment: priceAdjustment as number,
        stock: stock as number
      });
    }
  }

  const productKeys = new Set(rows.map((row) => row.productKey));
  if (productKeys.size > PIM_BULK_IMPORT_LIMITS.maxProducts) {
    issues.push(fileIssue("PRODUCT_LIMIT_EXCEEDED", `Import maksimal ${PIM_BULK_IMPORT_LIMITS.maxProducts} product root.`, "Pisahkan file menjadi beberapa batch."));
  }
  issues.push(...validateWithinFileDuplicates(rows));
  return { rows, issues: dedupeIssues(issues) };
}

export function buildPimBulkImportPlan(rows: PimBulkImportResolvedRow[]): PimBulkImportProductPlan[] {
  const products = new Map<string, PimBulkImportProductPlan>();
  for (const row of rows) {
    let product = products.get(row.productKey);
    if (!product) {
      product = {
        productKey: row.productKey,
        productName: row.productName,
        slug: row.slug,
        categoryId: row.categoryId,
        categoryCode: row.categoryCode,
        categoryName: row.categoryName,
        basePrice: row.basePrice,
        colors: []
      };
      products.set(row.productKey, product);
    }
    let color = product.colors.find((item) => item.colorMasterId === row.colorMasterId);
    if (!color) {
      color = {
        colorMasterId: row.colorMasterId,
        colorCode: row.colorCode,
        colorName: row.colorName,
        colorHex: row.colorHex,
        priceAdjustment: 0,
        sizes: []
      };
      product.colors.push(color);
    }
    color.sizes.push({
      sizeMasterId: row.sizeMasterId,
      sizeCode: row.sizeCode,
      sizeName: row.sizeName,
      sku: row.sku,
      stock: row.stock,
      priceAdjustment: row.priceAdjustment,
      rowNumber: row.rowNumber
    });
  }
  return [...products.values()];
}

export function hashPimBulkImportPayload(plan: PimBulkImportProductPlan[]) {
  return createHash("sha256").update(stableJson(plan)).digest("hex");
}

export function sha256Bytes(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function pimBulkImportErrorCsv(issues: PimBulkImportIssue[]) {
  const headers = ["row_number", "product_key", "field", "value", "error_code", "message", "suggested_fix", "severity"];
  const rows = issues.map((issue) => [
    issue.rowNumber ?? "",
    issue.productKey,
    issue.field,
    issue.value,
    issue.errorCode,
    issue.message,
    issue.suggestedFix,
    issue.severity
  ]);
  return `\uFEFF${[headers, ...rows].map((row) => row.map(csvSafeCell).join(",")).join("\r\n")}\r\n`;
}

export function pimBulkImportTemplateCsv() {
  return `\uFEFF${PIM_BULK_IMPORT_HEADERS.join(",")}\r\n`;
}

export async function pimBulkImportTemplateXlsx(reference: {
  colors: Array<{ id: string; code: string; name: string; active: boolean }>;
  sizes: Array<{ id: string; code: string; name: string; active: boolean; group?: string }>;
  categories: Array<{ id: string; code: string; name: string; active: boolean }>;
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "DEBRODER";
  workbook.created = new Date(0);
  workbook.modified = new Date(0);
  const instructions = workbook.addWorksheet("INSTRUCTIONS");
  const lines = [
    ["DEBRODER PIM Bulk Import — Create Only"],
    ["Gunakan satu baris untuk satu kombinasi warna × ukuran."],
    ["product_key hanya grouping di file, wajib konsisten, contoh TSHIRT-001."],
    ["Slug wajib lowercase kebab-case; SKU wajib uppercase A–Z/0–9/minus."],
    ["Gunakan ID atau canonical code dari reference sheet; jangan memakai display label sebagai key."],
    ["base_price, price_adjustment, dan stock adalah integer; stock tidak boleh negatif."],
    ["Formula, macro, merged cell, external reference, dan embedded object dilarang."],
    ["Dry run wajib. Final import memvalidasi ulang dan membuat seluruh produk sebagai Draft."],
    ["Contoh konsep: satu product_key dapat diulang untuk BLK/S dan BLK/M dengan SKU berbeda."],
    ["Jangan mengisi contoh langsung pada PRODUCT_IMPORT; gunakan data produk aktual Anda."]
  ];
  instructions.addRows(lines);
  instructions.getColumn(1).width = 120;

  const importSheet = workbook.addWorksheet("PRODUCT_IMPORT");
  importSheet.addRow([...PIM_BULK_IMPORT_HEADERS]);
  importSheet.views = [{ state: "frozen", ySplit: 1 }];
  importSheet.getRow(1).font = { bold: true };
  importSheet.columns.forEach((column) => { column.width = 22; });

  addReferenceSheet(workbook, "COLOR_MASTER", ["id", "canonical_code", "display_name", "active"], reference.colors.map((row) => [row.id, row.code, row.name, row.active]));
  addReferenceSheet(workbook, "SIZE_MASTER", ["id", "canonical_code", "display_name", "active", "size_group"], reference.sizes.map((row) => [row.id, row.code, row.name, row.active, row.group || ""]));
  addReferenceSheet(workbook, "CATEGORY_REFERENCE", ["id", "canonical_code", "display_name", "active"], reference.categories.map((row) => [row.id, row.code, row.name, row.active]));
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}

export function referenceCsv(headers: string[], rows: Array<Array<string | boolean>>) {
  return `\uFEFF${[headers, ...rows].map((row) => row.map(csvSafeCell).join(",")).join("\r\n")}\r\n`;
}

function validateFileEnvelope(input: { fileName: string; mimeType: string; bytes: Uint8Array }) {
  const issues: PimBulkImportIssue[] = [];
  const extension = fileExtension(input.fileName);
  if (!input.bytes.byteLength) issues.push(fileIssue("FILE_EMPTY", "File kosong.", "Pilih file XLSX atau CSV yang berisi data."));
  if (input.bytes.byteLength > PIM_BULK_IMPORT_LIMITS.maxFileBytes) issues.push(fileIssue("FILE_TOO_LARGE", `Ukuran file maksimal ${PIM_BULK_IMPORT_LIMITS.maxFileBytes / 1024 / 1024} MB.`, "Pisahkan import menjadi beberapa file."));
  if (extension !== "xlsx" && extension !== "csv") issues.push(fileIssue("INVALID_EXTENSION", "Hanya file .xlsx dan .csv yang diterima.", "Gunakan template resmi DEBRODER."));
  const mime = input.mimeType.toLowerCase();
  const validMime = extension === "xlsx"
    ? ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/octet-stream"].includes(mime)
    : ["text/csv", "application/csv", "text/plain", "application/vnd.ms-excel"].includes(mime);
  if ((extension === "xlsx" || extension === "csv") && !validMime) issues.push(fileIssue("INVALID_MIME", "MIME file tidak sesuai dengan extension.", "Ekspor ulang menggunakan format XLSX atau CSV UTF-8."));
  return issues;
}

async function parseXlsxImport(bytes: Uint8Array): Promise<PimBulkImportParseResult> {
  const unsafePath = DANGEROUS_WORKBOOK_PATHS.find((path) => Buffer.from(bytes).toString("latin1").toLowerCase().includes(path));
  if (unsafePath) return { rows: [], issues: [fileIssue("UNSAFE_WORKBOOK", "Workbook mengandung macro, external reference, embedded object, atau active content.", "Salin data ke template resmi DEBRODER yang bersih.")], totalRows: 0 };
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(exactArrayBuffer(bytes));
  } catch {
    return { rows: [], issues: [fileIssue("INVALID_TYPE", "Workbook XLSX tidak dapat dibaca.", "Ekspor ulang menggunakan template resmi DEBRODER.")], totalRows: 0 };
  }
  const sheet = workbook.getWorksheet("PRODUCT_IMPORT");
  if (!sheet) return { rows: [], issues: [fileIssue("SHEET_MISSING", "Sheet PRODUCT_IMPORT tidak ditemukan.", "Gunakan template resmi tanpa mengganti nama sheet.")], totalRows: 0 };
  if (sheet.rowCount < 1) return { rows: [], issues: [fileIssue("SHEET_EMPTY", "Sheet PRODUCT_IMPORT kosong.", "Tambahkan header canonical dan data import.")], totalRows: 0 };

  const headerValues = rowTextValues(sheet.getRow(1));
  const headerIssues = validateHeaders(headerValues);
  const rows: PimBulkImportParsedRow[] = [];
  const issues = [...headerIssues];
  if (!headerIssues.length) {
    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
      const excelRow = sheet.getRow(rowNumber);
      const cells = PIM_BULK_IMPORT_HEADERS.map((_, index) => excelRow.getCell(index + 1));
      if (cells.every((cell) => cellText(cell.value) === "")) continue;
      for (let index = 0; index < cells.length; index += 1) {
        const cell = cells[index];
        if (cell.isMerged) issues.push(rowIssueFromValue(rowNumber, cells[0]?.value, PIM_BULK_IMPORT_HEADERS[index], cell.value, "MERGED_CELL_NOT_ALLOWED", "Merged cell tidak diizinkan pada PRODUCT_IMPORT.", "Unmerge cell dan isi setiap row secara eksplisit."));
        if (hasFormula(cell.value)) issues.push(rowIssueFromValue(rowNumber, cells[0]?.value, PIM_BULK_IMPORT_HEADERS[index], cell.value, "FORMULA_NOT_ALLOWED", "Formula tidak diizinkan dan cached result tidak dipercaya.", "Ganti formula dengan nilai statis."));
      }
      rows.push({ rowNumber, values: mapHeaderValues(cells.map((cell) => cellText(cell.value))) });
    }
  }
  if (!rows.length && !issues.length) issues.push(fileIssue("SHEET_EMPTY", "Sheet PRODUCT_IMPORT tidak memiliki data.", "Tambahkan minimal satu row produk."));
  if (rows.length > PIM_BULK_IMPORT_LIMITS.maxRows) issues.push(fileIssue("ROW_LIMIT_EXCEEDED", `Import maksimal ${PIM_BULK_IMPORT_LIMITS.maxRows} row.`, "Pisahkan file menjadi beberapa batch."));
  return { rows: rows.slice(0, PIM_BULK_IMPORT_LIMITS.maxRows), issues: dedupeIssues(issues), totalRows: rows.length };
}

function parseCsvImport(bytes: Uint8Array): PimBulkImportParseResult {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^\uFEFF/, "");
  } catch {
    return { rows: [], issues: [fileIssue("INVALID_TYPE", "CSV wajib menggunakan encoding UTF-8.", "Ekspor ulang sebagai CSV UTF-8.")], totalRows: 0 };
  }
  const table = parseCsv(text);
  if (!table.length || table.every((row) => row.every((cell) => !cell.trim()))) return { rows: [], issues: [fileIssue("FILE_EMPTY", "CSV kosong.", "Gunakan template resmi dan tambahkan data.")], totalRows: 0 };
  const headerIssues = validateHeaders(table[0].map((value) => value.trim()));
  const rows: PimBulkImportParsedRow[] = [];
  const issues = [...headerIssues];
  if (!headerIssues.length) {
    for (let index = 1; index < table.length; index += 1) {
      const source = table[index];
      if (source.every((cell) => !cell.trim())) continue;
      const rowNumber = index + 1;
      const values = mapHeaderValues(source.map((cell) => cell.trim()));
      for (const header of PIM_BULK_IMPORT_HEADERS) {
        if (values[header].startsWith("=")) issues.push(rowIssue({ rowNumber, values }, header, "FORMULA_NOT_ALLOWED", "Formula tidak diizinkan pada CSV.", "Ganti formula dengan nilai statis."));
      }
      rows.push({ rowNumber, values });
    }
  }
  if (!rows.length && !issues.length) issues.push(fileIssue("FILE_EMPTY", "CSV tidak memiliki data.", "Tambahkan minimal satu row produk."));
  if (rows.length > PIM_BULK_IMPORT_LIMITS.maxRows) issues.push(fileIssue("ROW_LIMIT_EXCEEDED", `Import maksimal ${PIM_BULK_IMPORT_LIMITS.maxRows} row.`, "Pisahkan file menjadi beberapa batch."));
  return { rows: rows.slice(0, PIM_BULK_IMPORT_LIMITS.maxRows), issues: dedupeIssues(issues), totalRows: rows.length };
}

function validateHeaders(headers: string[]) {
  const issues: PimBulkImportIssue[] = [];
  const normalized = headers.map((header) => header.trim()).filter(Boolean);
  const duplicates = normalized.filter((header, index) => normalized.indexOf(header) !== index);
  for (const header of new Set(duplicates)) issues.push(fileIssue("DUPLICATE_HEADER", `Header ${header} muncul lebih dari sekali.`, "Hapus header duplikat."));
  for (const header of PIM_BULK_IMPORT_HEADERS) if (!normalized.includes(header)) issues.push(fileIssue("HEADER_MISSING", `Header ${header} tidak ditemukan.`, "Gunakan header dari template resmi."));
  for (const header of normalized) if (!PIM_BULK_IMPORT_HEADERS.includes(header as PimBulkImportHeader)) issues.push(fileIssue("UNKNOWN_HEADER", `Header ${header} tidak dikenal.`, "Hapus kolom yang tidak ada pada template resmi."));
  if (normalized.length !== PIM_BULK_IMPORT_HEADERS.length || PIM_BULK_IMPORT_HEADERS.some((header, index) => normalized[index] !== header)) {
    if (!issues.length) issues.push(fileIssue("UNKNOWN_HEADER", "Urutan header tidak sesuai template canonical.", "Gunakan template resmi tanpa mengubah urutan kolom."));
  }
  return issues;
}

function validateWithinFileDuplicates(rows: PimBulkImportRow[]) {
  const issues: PimBulkImportIssue[] = [];
  const skuRows = groupBy(rows, (row) => row.sku);
  for (const group of skuRows.values()) if (group.length > 1) for (const row of group) issues.push(normalizedRowIssue(row, "sku", "DUPLICATE_SKU_IN_FILE", "SKU duplikat di dalam file.", "Gunakan sellable SKU unik."));

  const productByKey = groupBy(rows, (row) => row.productKey);
  const slugOwners = new Map<string, Set<string>>();
  for (const [productKey, group] of productByKey) {
    const roots = new Set(group.map((row) => stableJson([row.productName, row.slug, row.basePrice])));
    if (roots.size > 1) for (const row of group) issues.push(normalizedRowIssue(row, "product_key", "INCONSISTENT_PRODUCT_ROOT", "Field product root berbeda dalam product_key yang sama.", "Samakan nama, slug, kategori, dan base_price untuk seluruh group."));
    const combinations = groupBy(group, (row) => `${row.colorMasterId || row.colorCode}:${row.sizeMasterId || row.sizeCode}`);
    for (const combinationRows of combinations.values()) if (combinationRows.length > 1) for (const row of combinationRows) issues.push(normalizedRowIssue(row, "size_master_id", "DUPLICATE_VARIANT_IN_FILE", "Kombinasi warna × ukuran duplikat di dalam product_key.", "Sisakan satu row untuk setiap kombinasi."));
    const slug = group[0]?.slug;
    if (slug) {
      const owners = slugOwners.get(slug) || new Set<string>();
      owners.add(productKey);
      slugOwners.set(slug, owners);
    }
  }
  for (const [slug, owners] of slugOwners) if (owners.size > 1) for (const row of rows.filter((item) => item.slug === slug)) issues.push(normalizedRowIssue(row, "slug", "DUPLICATE_SLUG_IN_FILE", "Slug dipakai oleh lebih dari satu product_key.", "Gunakan slug unik per product root."));
  return issues;
}

function parseCsv(input: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (quoted) {
      if (char === '"' && input[index + 1] === '"') { cell += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(cell); cell = ""; }
    else if (char === "\n") { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; }
    else cell += char;
  }
  if (cell || row.length) { row.push(cell.replace(/\r$/, "")); rows.push(row); }
  return rows;
}

function mapHeaderValues(values: string[]) {
  return Object.fromEntries(PIM_BULK_IMPORT_HEADERS.map((header, index) => [header, String(values[index] || "").trim()])) as Record<PimBulkImportHeader, string>;
}

function rowTextValues(row: ExcelJS.Row) {
  return PIM_BULK_IMPORT_HEADERS.map((_, index) => cellText(row.getCell(index + 1).value));
}

function cellText(value: ExcelJS.CellValue) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value).trim();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && "text" in value) return String(value.text || "").trim();
  return "";
}

function hasFormula(value: ExcelJS.CellValue) {
  return Boolean(value && typeof value === "object" && ("formula" in value || "sharedFormula" in value));
}

function parseInteger(value: string) {
  if (!/^-?\d+$/.test(value)) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : null;
}

function rowIssue(row: PimBulkImportParsedRow, field: PimBulkImportHeader, code: PimBulkImportErrorCode, message: string, suggestedFix: string): PimBulkImportIssue {
  return { rowNumber: row.rowNumber, productKey: row.values.product_key, field, value: row.values[field], errorCode: code, message, suggestedFix, severity: "error" };
}

function rowIssueFromValue(rowNumber: number, productKey: ExcelJS.CellValue, field: PimBulkImportHeader, value: ExcelJS.CellValue, code: PimBulkImportErrorCode, message: string, suggestedFix: string): PimBulkImportIssue {
  return { rowNumber, productKey: cellText(productKey), field, value: cellText(value), errorCode: code, message, suggestedFix, severity: "error" };
}

function normalizedRowIssue(row: PimBulkImportRow, field: string, code: PimBulkImportErrorCode, message: string, suggestedFix: string): PimBulkImportIssue {
  const values: Record<string, unknown> = { product_key: row.productKey, slug: row.slug, sku: row.sku, size_master_id: row.sizeMasterId, color_master_id: row.colorMasterId };
  return { rowNumber: row.rowNumber, productKey: row.productKey, field, value: String(values[field] ?? ""), errorCode: code, message, suggestedFix, severity: "error" };
}

function fileIssue(code: PimBulkImportErrorCode, message: string, suggestedFix: string): PimBulkImportIssue {
  return { rowNumber: null, productKey: "", field: "file", value: "", errorCode: code, message, suggestedFix, severity: "error" };
}

function fileExtension(fileName: string) {
  return fileName.toLowerCase().split(".").pop() || "";
}

function exactArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function groupBy<T>(rows: T[], key: (row: T) => string) {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const value = key(row);
    const group = groups.get(value) || [];
    group.push(row);
    groups.set(value, group);
  }
  return groups;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(",")}}`;
  return JSON.stringify(value);
}

function csvSafeCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function dedupeIssues(issues: PimBulkImportIssue[]) {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.rowNumber}:${issue.field}:${issue.errorCode}:${issue.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function addReferenceSheet(workbook: ExcelJS.Workbook, name: string, headers: string[], rows: Array<Array<string | boolean>>) {
  const sheet = workbook.addWorksheet(name);
  sheet.addRow(headers);
  sheet.addRows(rows);
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.columns.forEach((column) => { column.width = 28; });
}
