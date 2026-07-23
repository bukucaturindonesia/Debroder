import "server-only";

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PIM_BULK_IMPORT_LIMITS,
  buildPimBulkImportPlan,
  hashPimBulkImportPayload,
  normalizePimBulkImportRows,
  parsePimBulkImportFile,
  sha256Bytes,
  type PimBulkImportIssue,
  type PimBulkImportResolvedRow,
  type PimBulkImportRow
} from "@/lib/pim-bulk-import";
import { linkPimAuditEntities, recordPimAuditEvent } from "@/lib/pim-audit-server";

export type PimBulkImportFileInput = {
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
};

export type PimBulkImportPreview = {
  fileName: string;
  fileChecksum: string;
  payloadHash: string;
  previewToken: string;
  importMode: "create_only";
  status: "ready" | "blocked";
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    productRoots: number;
    colorAssociations: number;
    variants: number;
    skus: number;
    errors: number;
    warnings: number;
  };
  rows: Array<{
    rowNumber: number;
    productKey: string;
    productName: string;
    slug: string;
    color: string;
    size: string;
    sku: string;
    basePrice: number;
    priceAdjustment: number;
    stock: number;
    validationStatus: "valid" | "error";
  }>;
  issues: PimBulkImportIssue[];
};

type MasterRow = {
  id: string;
  code: string;
  name: string;
  active: boolean;
  hex?: string;
  group?: string;
};

export class PimBulkImportServerError extends Error {
  constructor(public readonly status: number, message: string, public readonly code?: string) {
    super(message);
  }
}

export async function loadPimBulkImportReferences(client: SupabaseClient) {
  const [categoriesResult, colorsResult, sizesResult] = await Promise.all([
    client.from("product_categories").select("id,name,slug,is_active,status").order("sort_order"),
    client.from("product_color_master").select("id,name,slug,color_hex,is_active").order("sort_order"),
    client.from("product_size_master").select("id,name,slug,size_group,is_active").order("sort_order")
  ]);
  const error = categoriesResult.error || colorsResult.error || sizesResult.error;
  if (error) throw new PimBulkImportServerError(503, "Reference master PIM belum dapat dimuat.");
  return {
    categories: records(categoriesResult.data).map((row) => ({ id: String(row.id), code: String(row.slug), name: String(row.name), active: row.is_active !== false && row.status !== "inactive" })),
    colors: records(colorsResult.data).map((row) => ({ id: String(row.id), code: String(row.slug), name: String(row.name), active: row.is_active !== false, hex: String(row.color_hex || "#111111") })),
    sizes: records(sizesResult.data).map((row) => ({ id: String(row.id), code: String(row.slug), name: String(row.name), active: row.is_active !== false, group: String(row.size_group || "apparel") }))
  };
}

export async function validatePimBulkImport(input: {
  client: SupabaseClient;
  actorId: string;
  file: PimBulkImportFileInput;
}): Promise<PimBulkImportPreview> {
  const fileChecksum = sha256Bytes(input.file.bytes);
  const parsed = await parsePimBulkImportFile(input.file);
  const normalized = normalizePimBulkImportRows(parsed.rows);
  const references = await loadPimBulkImportReferences(input.client);
  const resolved = resolveRows(normalized.rows, references);
  const resolvedFileIssues = validateResolvedFileRows(resolved.rows);
  const databaseIssues = await loadDatabaseConflictIssues(input.client, resolved.rows);
  const issues = dedupeIssues([...parsed.issues, ...normalized.issues, ...resolved.issues, ...resolvedFileIssues, ...databaseIssues]);
  const invalidRowNumbers = new Set(issues.filter((issue) => issue.severity === "error" && issue.rowNumber !== null).map((issue) => issue.rowNumber as number));
  const validRows = resolved.rows.filter((row) => !invalidRowNumbers.has(row.rowNumber));
  const plan = buildPimBulkImportPlan(validRows);
  const payloadHash = hashPimBulkImportPayload(plan);
  const blocking = issues.filter((issue) => issue.severity === "error");
  const colorAssociations = plan.reduce((count, product) => count + product.colors.length, 0);
  const previewToken = createPimBulkPreviewToken({
    actorId: input.actorId,
    fileChecksum,
    payloadHash,
    expiresAt: Math.floor(Date.now() / 1000) + PIM_BULK_IMPORT_LIMITS.previewTokenTtlSeconds
  });

  return {
    fileName: sanitizeFileName(input.file.fileName),
    fileChecksum,
    payloadHash,
    previewToken,
    importMode: "create_only",
    status: blocking.length ? "blocked" : "ready",
    summary: {
      totalRows: parsed.totalRows,
      validRows: validRows.length,
      invalidRows: parsed.totalRows - validRows.length,
      productRoots: plan.length,
      colorAssociations,
      variants: colorAssociations,
      skus: validRows.length,
      errors: blocking.length,
      warnings: issues.filter((issue) => issue.severity === "warning").length
    },
    rows: resolved.rows.slice(0, PIM_BULK_IMPORT_LIMITS.previewRows).map((row) => ({
      rowNumber: row.rowNumber,
      productKey: row.productKey,
      productName: row.productName,
      slug: row.slug,
      color: row.colorName,
      size: row.sizeName,
      sku: row.sku,
      basePrice: row.basePrice,
      priceAdjustment: row.priceAdjustment,
      stock: row.stock,
      validationStatus: invalidRowNumbers.has(row.rowNumber) ? "error" : "valid"
    })),
    issues
  };
}

export async function commitPimBulkImport(input: {
  client: SupabaseClient;
  actorId: string;
  role: string;
  file: PimBulkImportFileInput;
  previewToken: string;
}) {
  if (!isPimBulkImportWriteRole(input.role)) {
    const operationId = randomUUID();
    await recordPimAuditEvent(input.client, { eventCode: "BULK_IMPORT_DENIED", status: "DENIED", actorId: input.actorId, actorRole: input.role, requestId: operationId, operationId, idempotencyKey: `bulk-import-denied:${operationId}`, entityType: "pim_bulk_import_batch", summary: "Bulk Import ditolak", failureCode: "PERMISSION_DENIED", metadata: { reasonCode: "PERMISSION_DENIED" } });
    throw new PimBulkImportServerError(403, "Role ini hanya dapat melakukan preview Bulk Import.", "PERMISSION_DENIED");
  }
  const previewClaims = verifyPimBulkPreviewToken(input.previewToken, input.actorId);
  const preview = await validatePimBulkImport({ client: input.client, actorId: input.actorId, file: input.file });
  if (preview.fileChecksum !== previewClaims.fileChecksum) throw new PimBulkImportServerError(409, "Checksum file berubah sejak dry run.", "FILE_CHECKSUM_MISMATCH");
  if (preview.payloadHash !== previewClaims.payloadHash) throw new PimBulkImportServerError(409, "Payload berubah atau master data tidak lagi cocok sejak dry run.", "PAYLOAD_HASH_MISMATCH");
  if (preview.status !== "ready") throw new PimBulkImportServerError(422, "Final import diblokir karena validasi terbaru menemukan error.");

  const parsed = await parsePimBulkImportFile(input.file);
  const normalized = normalizePimBulkImportRows(parsed.rows);
  const references = await loadPimBulkImportReferences(input.client);
  const resolved = resolveRows(normalized.rows, references);
  const plan = buildPimBulkImportPlan(resolved.rows);
  const idempotencyKey = createHmac("sha256", "DEBRODER_PIM_BULK_IMPORT_V1")
    .update(`${input.actorId}:${preview.fileChecksum}:${preview.payloadHash}:create_only`)
    .digest("hex");
  const { data, error } = await input.client.rpc("pim_bulk_import_create_v1", {
    p_actor_id: input.actorId,
    p_file_name: sanitizeFileName(input.file.fileName),
    p_file_sha256: preview.fileChecksum,
    p_payload_hash: preview.payloadHash,
    p_idempotency_key: idempotencyKey,
    p_products: plan
  });
  if (error) {
    console.error("PIM bulk import RPC failed", { code: error.code });
    const operationId = randomUUID();
    await recordPimAuditEvent(input.client, { eventCode: "BULK_IMPORT_ROLLED_BACK", status: "ROLLED_BACK", actorId: input.actorId, actorRole: input.role, requestId: idempotencyKey, operationId, idempotencyKey: `${idempotencyKey}:rollback`, entityType: "pim_bulk_import_batch", summary: "Bulk Import di-rollback", failureCode: "TRANSACTION_ROLLED_BACK", metadata: { fileChecksum: preview.fileChecksum, payloadHash: preview.payloadHash, rowCount: preview.summary.totalRows, importMode: preview.importMode } });
    throw new PimBulkImportServerError(409, "Import dibatalkan dan seluruh transaction di-rollback.", "TRANSACTION_ROLLED_BACK");
  }
  const slugs = [...new Set(plan.map((product) => product.slug))];
  const products = slugs.length
    ? await input.client.from("products").select("id,name,slug").in("slug", slugs)
    : { data: [], error: null };
  if (!products.error) {
    await linkPimAuditEntities({
      client: input.client,
      eventCode: "BULK_IMPORT_COMPLETED",
      idempotencyKey,
      entities: records(products.data).map((product) => ({
        entityType: "products",
        entityId: String(product.id),
        entityLabel: String(product.name || product.slug || "Produk"),
        productId: String(product.id),
        resultStatus: "COMPLETED"
      }))
    });
  }
  return data;
}

export function isPimBulkImportWriteRole(role: string) {
  return ["owner", "superadmin", "super_admin"].includes(role);
}

export function createPimBulkPreviewToken(input: { actorId: string; fileChecksum: string; payloadHash: string; expiresAt: number }) {
  const payload = Buffer.from(JSON.stringify({ v: 1, actorId: input.actorId, fileChecksum: input.fileChecksum, payloadHash: input.payloadHash, exp: input.expiresAt, mode: "create_only" })).toString("base64url");
  const signature = createHmac("sha256", previewSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyPimBulkPreviewToken(token: string, actorId: string) {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) throw new PimBulkImportServerError(400, "Preview token tidak valid.");
  const expected = createHmac("sha256", previewSecret()).update(payload).digest("base64url");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) throw new PimBulkImportServerError(400, "Preview token tidak valid.");
  let claims: { actorId?: string; fileChecksum?: string; payloadHash?: string; exp?: number; mode?: string };
  try { claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")); }
  catch { throw new PimBulkImportServerError(400, "Preview token tidak valid."); }
  if (claims.actorId !== actorId || claims.mode !== "create_only") throw new PimBulkImportServerError(403, "Preview token bukan milik actor saat ini.", "PERMISSION_DENIED");
  if (!claims.exp || claims.exp < Math.floor(Date.now() / 1000)) throw new PimBulkImportServerError(409, "Preview sudah kedaluwarsa. Jalankan dry run kembali.", "PREVIEW_EXPIRED");
  if (!claims.fileChecksum || !claims.payloadHash) throw new PimBulkImportServerError(400, "Preview token tidak lengkap.");
  return { fileChecksum: claims.fileChecksum, payloadHash: claims.payloadHash };
}

function resolveRows(rows: PimBulkImportRow[], references: Awaited<ReturnType<typeof loadPimBulkImportReferences>>) {
  const issues: PimBulkImportIssue[] = [];
  const resolved: PimBulkImportResolvedRow[] = [];
  for (const row of rows) {
    const category = resolveMaster(row, "category", row.categoryId, row.categoryCode, references.categories, issues);
    const color = resolveMaster(row, "color", row.colorMasterId, row.colorCode, references.colors, issues);
    const size = resolveMaster(row, "size", row.sizeMasterId, row.sizeCode, references.sizes, issues);
    if (!category || !color || !size) continue;
    resolved.push({
      ...row,
      categoryId: category.id,
      categoryCode: category.code,
      categoryName: category.name,
      colorMasterId: color.id,
      colorCode: color.code,
      colorName: color.name,
      colorHex: color.hex || "#111111",
      sizeMasterId: size.id,
      sizeCode: size.code,
      sizeName: size.name
    });
  }
  return { rows: resolved, issues };
}

function resolveMaster(row: PimBulkImportRow, kind: "category" | "color" | "size", id: string | null, code: string | null, master: MasterRow[], issues: PimBulkImportIssue[]) {
  const byId = id ? master.find((item) => item.id === id) : undefined;
  const byCode = code ? master.find((item) => item.code === code) : undefined;
  const field = kind === "category" ? "category_id" : kind === "color" ? "color_master_id" : "size_master_id";
  if (id && !byId) issues.push(masterIssue(row, field, id, "INVALID_MASTER_ID", `${kind} master ID tidak ditemukan.`));
  if (code && !byCode) issues.push(masterIssue(row, field.replace("_id", "_code"), code, "INVALID_MASTER_CODE", `${kind} canonical code tidak ditemukan.`));
  if (byId && byCode && byId.id !== byCode.id) issues.push(masterIssue(row, field, `${id} / ${code}`, "MASTER_ID_CODE_MISMATCH", `${kind} ID dan canonical code merujuk record berbeda.`));
  const selected = byId || byCode;
  if (selected && !selected.active) issues.push(masterIssue(row, field, selected.id, "INACTIVE_MASTER", `${kind} master tidak aktif.`));
  return selected?.active && (!byId || !byCode || byId.id === byCode.id) ? selected : null;
}

function validateResolvedFileRows(rows: PimBulkImportResolvedRow[]) {
  const issues: PimBulkImportIssue[] = [];
  const groups = new Map<string, PimBulkImportResolvedRow[]>();
  for (const row of rows) groups.set(row.productKey, [...(groups.get(row.productKey) || []), row]);
  for (const group of groups.values()) {
    const roots = new Set(group.map((row) => `${row.productName}\u0000${row.slug}\u0000${row.categoryId}\u0000${row.basePrice}`));
    if (roots.size > 1) {
      for (const row of group) issues.push(masterIssue(row, "product_key", row.productKey, "INCONSISTENT_PRODUCT_ROOT", "Field product root berbeda dalam product_key yang sama."));
    }
    const combinations = new Map<string, PimBulkImportResolvedRow[]>();
    for (const row of group) {
      const key = `${row.colorMasterId}:${row.sizeMasterId}`;
      combinations.set(key, [...(combinations.get(key) || []), row]);
    }
    for (const combination of combinations.values()) {
      if (combination.length > 1) {
        for (const row of combination) issues.push(masterIssue(row, "size_master_id", row.sizeMasterId, "DUPLICATE_VARIANT_IN_FILE", "Kombinasi warna × ukuran duplikat di dalam product_key."));
      }
    }
  }
  return issues;
}

async function loadDatabaseConflictIssues(client: SupabaseClient, rows: PimBulkImportResolvedRow[]) {
  const issues: PimBulkImportIssue[] = [];
  const slugs = [...new Set(rows.map((row) => row.slug))];
  const skus = [...new Set(rows.map((row) => row.sku))];
  const [productRows, skuRows] = await Promise.all([
    selectInChunks(client, "products", "id,slug", "slug", slugs),
    selectInChunks(client, "product_variant_sizes", "id,sku", "sku", skus)
  ]);
  const existingSlugs = new Set(productRows.map((row) => String(row.slug)));
  const existingSkus = new Set(skuRows.map((row) => String(row.sku)));
  for (const row of rows) {
    if (existingSlugs.has(row.slug)) issues.push(masterIssue(row, "slug", row.slug, "DUPLICATE_SLUG_DATABASE", "Slug sudah digunakan produk existing."));
    if (existingSkus.has(row.sku)) issues.push(masterIssue(row, "sku", row.sku, "DUPLICATE_SKU_DATABASE", "SKU sudah digunakan pada database."));
  }
  return issues;
}

async function selectInChunks(client: SupabaseClient, table: string, columns: string, field: string, values: string[]) {
  const output: Record<string, unknown>[] = [];
  for (let index = 0; index < values.length; index += 100) {
    const chunk = values.slice(index, index + 100);
    if (!chunk.length) continue;
    const { data, error } = await client.from(table).select(columns).in(field, chunk);
    if (error) throw new PimBulkImportServerError(503, "Validasi duplicate database belum dapat dijalankan.");
    output.push(...records(data));
  }
  return output;
}

function masterIssue(row: PimBulkImportRow, field: string, value: string, errorCode: PimBulkImportIssue["errorCode"], message: string): PimBulkImportIssue {
  return { rowNumber: row.rowNumber, productKey: row.productKey, field, value, errorCode, message, suggestedFix: "Unduh reference terbaru lalu perbaiki row ini.", severity: "error" };
}

function previewSecret() {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!secret) throw new PimBulkImportServerError(503, "Secret server untuk preview Bulk Import belum dikonfigurasi.");
  return `${secret}:DEBRODER_PIM_BULK_IMPORT_PREVIEW_V1`;
}

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 180) || "bulk-import";
}

function records(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === "object") as Record<string, unknown>[] : [];
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
