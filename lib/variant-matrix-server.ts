import type { SupabaseClient } from "@supabase/supabase-js";
import {
  SELLABLE_SKU_PATTERN,
  isValidSkuCode,
  normalizeSellableSku,
  type VariantMatrixIssue,
  type VariantMatrixSaveInput,
  type VariantMatrixSaveRow,
  type VariantMatrixSummary
} from "@/lib/variant-matrix";

const MAX_MATRIX_ROWS = 500;

export class VariantMatrixServerError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly issues: VariantMatrixIssue[] = []
  ) {
    super(message);
  }
}

type RecordRow = Record<string, unknown>;

type PlannedRow = {
  input: VariantMatrixSaveRow;
  existing: RecordRow | null;
  resolvedVariantId: string | null;
  colorMaster: RecordRow | null;
  size: RecordRow;
};

export async function saveVariantMatrixAtomic(client: SupabaseClient, raw: VariantMatrixSaveInput) {
  const input = normalizeInput(raw);
  const product = await loadProduct(client, input.productId);
  if (!isValidSkuCode(String(product.sku || ""))) {
    blocked("SKU induk produk wajib menjadi product code uppercase yang valid.", "product-code");
  }

  const variants = await loadVariants(client, input.productId);
  const variantById = new Map(variants.map((row) => [String(row.id), row]));
  const sellable = await loadSellable(client, variants.map((row) => String(row.id)));
  const sellableById = new Map(sellable.map((row) => [String(row.id), row]));
  const masters = await loadColorMasters(client, unique(input.rows.map((row) => row.colorMasterId).filter(Boolean) as string[]));
  const masterById = new Map(masters.map((row) => [String(row.id), row]));
  const sizes = await loadSizes(client, unique(input.rows.map((row) => row.sizeId)));
  const sizeById = new Map(sizes.map((row) => [String(row.id), row]));
  const globalSkuRows = await loadGlobalSkuRows(client, unique(input.rows.map((row) => row.sku)));

  const issues: VariantMatrixIssue[] = [];
  const localSkus = new Map<string, string[]>();
  const localCombinations = new Map<string, string[]>();
  const planned: PlannedRow[] = [];

  for (const row of input.rows) {
    const key = row.id || `${row.variantId || row.colorMasterId}:${row.sizeId}`;
    const existing = row.id ? sellableById.get(row.id) || null : null;
    if (row.id && !existing) issues.push(issue(key, "Sellable row tidak ditemukan pada produk ini."));

    let resolvedVariantId = row.variantId || (existing?.variant_id ? String(existing.variant_id) : null);
    let colorMaster: RecordRow | null = null;
    if (resolvedVariantId) {
      const variant = variantById.get(resolvedVariantId);
      if (!variant) issues.push(issue(key, "product_variant tidak ditemukan atau bukan milik produk ini."));
      else if ((variant.status === "inactive" || variant.is_active === false) && row.status === "active") {
        issues.push(issue(key, "Color variant tidak aktif; sellable row tidak dapat diaktifkan."));
      }
    } else if (row.colorMasterId) {
      colorMaster = masterById.get(row.colorMasterId) || null;
      if (!colorMaster || colorMaster.is_active === false) {
        issues.push(issue(key, "Color master tidak valid atau tidak aktif."));
      } else {
        const matching = variants.find((variant) => String(variant.slug || "") === String(colorMaster?.slug || ""));
        if (matching) resolvedVariantId = String(matching.id);
      }
    } else {
      issues.push(issue(key, "product_variant ID atau color master ID wajib tersedia."));
    }

    const size = sizeById.get(row.sizeId);
    if (!size || size.is_active === false) issues.push(issue(key, "size_id tidak valid atau master ukuran tidak aktif."));

    const sku = normalizeSellableSku(row.sku);
    if (!sku || sku !== row.sku || !SELLABLE_SKU_PATTERN.test(sku)) {
      issues.push(issue(key, "SKU wajib uppercase dan hanya memakai A–Z, 0–9, atau minus."));
    }
    if (!Number.isInteger(row.stockQuantity) || row.stockQuantity < 0) issues.push(issue(key, "stock_quantity wajib integer ≥ 0."));
    if (!Number.isInteger(row.priceAdjustment)) issues.push(issue(key, "price adjustment wajib integer."));

    const skuOwners = localSkus.get(sku) || [];
    skuOwners.push(key);
    localSkus.set(sku, skuOwners);

    const colorIdentity = resolvedVariantId || `master:${row.colorMasterId}`;
    const combination = `${colorIdentity}:${row.sizeId}`;
    const combinationOwners = localCombinations.get(combination) || [];
    combinationOwners.push(key);
    localCombinations.set(combination, combinationOwners);

    const globalConflict = globalSkuRows.find((globalRow) => String(globalRow.sku) === sku && String(globalRow.id) !== String(row.id || ""));
    if (globalConflict) issues.push(issue(key, `${sku}: SKU sudah digunakan secara global.`));

    if (!row.id && resolvedVariantId) {
      const collision = sellable.find((candidate) => String(candidate.variant_id) === resolvedVariantId && String(candidate.size_id) === row.sizeId);
      if (collision) issues.push(issue(key, "Kombinasi warna × ukuran sudah ada dan tidak boleh ditimpa sebagai row baru."));
    }
    if (existing && row.variantId && String(existing.variant_id) !== row.variantId) {
      issues.push(issue(key, "Existing sellable row tidak boleh dipindahkan ke color variant lain."));
    }

    planned.push({ input: { ...row, sku }, existing, resolvedVariantId, colorMaster, size: size || {} });
  }

  for (const [sku, owners] of localSkus) {
    if (owners.length > 1) for (const key of owners) issues.push(issue(key, `${sku}: duplicate SKU di dalam matrix.`));
  }
  for (const owners of localCombinations.values()) {
    if (owners.length > 1) for (const key of owners) issues.push(issue(key, "Duplicate kombinasi warna × ukuran di dalam matrix."));
  }

  const blockers = dedupe(issues);
  if (blockers.length) {
    throw new VariantMatrixServerError(422, "Variant Matrix masih memiliki BLOCKER.", blockers);
  }

  const createdVariantIds: string[] = [];
  const createdSellableIds: string[] = [];
  const updatedSnapshots: RecordRow[] = [];
  const summary: VariantMatrixSummary = { created: 0, updated: 0, unchanged: 0, deactivated: 0, conflicts: 0, affected: 0 };
  const variantForMaster = new Map<string, string>();

  try {
    for (const item of planned) {
      let variantId = item.resolvedVariantId;
      if (!variantId && item.input.colorMasterId && item.colorMaster) {
        variantId = variantForMaster.get(item.input.colorMasterId) || null;
        if (!variantId) {
          variantId = await createVariantFromMaster(client, input.productId, item.colorMaster, variants.length + createdVariantIds.length);
          variantForMaster.set(item.input.colorMasterId, variantId);
          createdVariantIds.push(variantId);
        }
      }
      if (!variantId) throw new Error("variant resolution failed");

      const payload = {
        variant_id: variantId,
        size_id: item.input.sizeId,
        size_name: String(item.size.name || ""),
        sku: item.input.sku,
        stock_quantity: item.input.stockQuantity,
        stock: item.input.stockQuantity,
        price_adjustment: item.input.priceAdjustment,
        status: item.input.status,
        is_active: item.input.status === "active",
        sort_order: item.input.sortOrder,
        updated_at: new Date().toISOString()
      };

      if (item.existing) {
        if (sameSellable(item.existing, payload)) {
          summary.unchanged += 1;
          continue;
        }
        updatedSnapshots.push(item.existing);
        const { data, error } = await client.from("product_variant_sizes").update(payload).eq("id", String(item.existing.id)).select("id").maybeSingle();
        if (error || !data) throw new Error(`update:${error?.code || "missing"}`);
        summary.updated += 1;
        if (item.input.status === "inactive" && item.existing.status !== "inactive") summary.deactivated += 1;
      } else {
        const { data, error } = await client.from("product_variant_sizes").insert(payload).select("id").single();
        if (error || !data?.id) throw new Error(`insert:${error?.code || "missing"}`);
        createdSellableIds.push(String(data.id));
        summary.created += 1;
      }
    }
  } catch {
    const recovered = await rollbackMatrix(client, updatedSnapshots, createdSellableIds, createdVariantIds);
    console.error("Variant matrix save failed", { recovered, created: createdSellableIds.length, updated: updatedSnapshots.length });
    throw new VariantMatrixServerError(
      recovered ? 409 : 500,
      recovered
        ? "Variant Matrix gagal disimpan dan seluruh perubahan berhasil dipulihkan. Muat ulang lalu coba lagi."
        : "Variant Matrix gagal disimpan dan recovery tidak lengkap. Hentikan operasi dan periksa audit database."
    );
  }

  summary.affected = summary.created + summary.updated;
  console.info("Variant matrix bulk save", {
    productId: input.productId,
    created: summary.created,
    updated: summary.updated,
    unchanged: summary.unchanged,
    deactivated: summary.deactivated
  });
  return { productId: input.productId, summary };
}

function normalizeInput(raw: VariantMatrixSaveInput): VariantMatrixSaveInput {
  if (!raw || typeof raw !== "object" || !isUuid(raw.productId) || !Array.isArray(raw.rows)) {
    throw new VariantMatrixServerError(400, "Payload Variant Matrix tidak valid.");
  }
  if (raw.rows.length > MAX_MATRIX_ROWS) throw new VariantMatrixServerError(413, `Variant Matrix maksimal ${MAX_MATRIX_ROWS} row per save.`);
  const normalizedRows: VariantMatrixSaveRow[] = [];
  for (const candidate of raw.rows as unknown[]) {
    if (!candidate || typeof candidate !== "object") {
      throw new VariantMatrixServerError(400, "Row Variant Matrix tidak valid.");
    }
    const row = candidate as Record<string, unknown>;
    normalizedRows.push({
      id: nullableUuid(row.id),
      variantId: nullableUuid(row.variantId),
      colorMasterId: nullableUuid(row.colorMasterId),
      sizeId: isUuid(row.sizeId) ? row.sizeId : "",
      sku: typeof row.sku === "string" ? row.sku.trim() : "",
      stockQuantity: Number(row.stockQuantity),
      priceAdjustment: Number(row.priceAdjustment),
      status: row.status === "inactive" ? "inactive" : "active",
      sortOrder: Number.isInteger(Number(row.sortOrder)) && Number(row.sortOrder) >= 0 ? Number(row.sortOrder) : 0
    });
  }
  return { productId: raw.productId, rows: normalizedRows };
}

async function loadProduct(client: SupabaseClient, productId: string) {
  const { data, error } = await client.from("products").select("id,sku,status").eq("id", productId).maybeSingle();
  if (error || !data) throw new VariantMatrixServerError(404, "Produk tidak ditemukan.");
  return data as RecordRow;
}

async function loadVariants(client: SupabaseClient, productId: string) {
  const { data, error } = await client.from("product_variants").select("id,product_id,name,variant_name,color_name,slug,hex_code,color_hex,status,is_active,sort_order").eq("product_id", productId);
  if (error) throw new VariantMatrixServerError(503, "Color variant belum dapat dimuat.");
  return rows(data);
}

async function loadSellable(client: SupabaseClient, variantIds: string[]) {
  if (!variantIds.length) return [];
  const { data, error } = await client.from("product_variant_sizes").select("id,variant_id,size_id,size_name,sku,stock_quantity,stock,price_adjustment,status,is_active,sort_order").in("variant_id", variantIds);
  if (error) throw new VariantMatrixServerError(503, "Sellable SKU belum dapat dimuat.");
  return rows(data);
}

async function loadColorMasters(client: SupabaseClient, ids: string[]) {
  if (!ids.length) return [];
  const { data, error } = await client.from("product_color_master").select("id,name,slug,color_hex,is_active").in("id", ids);
  if (error) throw new VariantMatrixServerError(503, "Master warna belum dapat dimuat.");
  return rows(data);
}

async function loadSizes(client: SupabaseClient, ids: string[]) {
  if (!ids.length) return [];
  const { data, error } = await client.from("product_size_master").select("id,name,slug,is_active").in("id", ids);
  if (error) throw new VariantMatrixServerError(503, "Master ukuran belum dapat dimuat.");
  return rows(data);
}

async function loadGlobalSkuRows(client: SupabaseClient, skus: string[]) {
  if (!skus.length) return [];
  const { data, error } = await client.from("product_variant_sizes").select("id,sku").in("sku", skus);
  if (error) throw new VariantMatrixServerError(503, "Validasi SKU global belum dapat dijalankan.");
  return rows(data);
}

async function createVariantFromMaster(client: SupabaseClient, productId: string, master: RecordRow, sortOrder: number) {
  const payload = {
    product_id: productId,
    name: String(master.name || ""),
    variant_name: String(master.name || ""),
    color_name: String(master.name || ""),
    slug: String(master.slug || ""),
    hex_code: String(master.color_hex || "#111111"),
    color_hex: String(master.color_hex || "#111111"),
    price_adjustment: 0,
    status: "active",
    is_active: true,
    is_default: false,
    sort_order: sortOrder,
    updated_at: new Date().toISOString()
  };
  const { data, error } = await client.from("product_variants").insert(payload).select("id").single();
  if (error || !data?.id) throw new Error(`variant:${error?.code || "missing"}`);
  return String(data.id);
}

async function rollbackMatrix(client: SupabaseClient, snapshots: RecordRow[], createdSellableIds: string[], createdVariantIds: string[]) {
  try {
    if (createdSellableIds.length) {
      const { error } = await client.from("product_variant_sizes").delete().in("id", createdSellableIds);
      if (error) return false;
    }
    for (const snapshot of [...snapshots].reverse()) {
      const payload = {
        variant_id: snapshot.variant_id,
        size_id: snapshot.size_id,
        size_name: snapshot.size_name,
        sku: snapshot.sku,
        stock_quantity: snapshot.stock_quantity,
        stock: snapshot.stock,
        price_adjustment: snapshot.price_adjustment,
        status: snapshot.status,
        is_active: snapshot.is_active,
        sort_order: snapshot.sort_order
      };
      const { error } = await client.from("product_variant_sizes").update(payload).eq("id", String(snapshot.id));
      if (error) return false;
    }
    if (createdVariantIds.length) {
      const { error } = await client.from("product_variants").delete().in("id", createdVariantIds);
      if (error) return false;
    }
    return true;
  } catch {
    return false;
  }
}

function sameSellable(existing: RecordRow, payload: RecordRow) {
  return String(existing.variant_id) === String(payload.variant_id) &&
    String(existing.size_id) === String(payload.size_id) &&
    String(existing.sku || "") === String(payload.sku || "") &&
    Number(existing.stock_quantity ?? existing.stock ?? 0) === Number(payload.stock_quantity) &&
    Number(existing.price_adjustment || 0) === Number(payload.price_adjustment) &&
    String(existing.status || (existing.is_active === false ? "inactive" : "active")) === String(payload.status) &&
    Number(existing.sort_order || 0) === Number(payload.sort_order || 0);
}

function issue(key: string, message: string): VariantMatrixIssue {
  return { severity: "blocker", key, message };
}
function blocked(message: string, key: string): never {
  throw new VariantMatrixServerError(422, message, [issue(key, message)]);
}
function dedupe(issues: VariantMatrixIssue[]) {
  const seen = new Set<string>();
  return issues.filter((item) => {
    const key = `${item.key}:${item.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function unique(values: string[]) { return [...new Set(values)]; }
function rows(value: unknown): RecordRow[] { return Array.isArray(value) ? value as RecordRow[] : []; }
function isUuid(value: unknown): value is string { return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
function nullableUuid(value: unknown) { return isUuid(value) ? value : null; }
