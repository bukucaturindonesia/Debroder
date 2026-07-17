import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PIM_BULK_EDIT_LIMITS,
  calculatePimBulkPrice,
  calculatePimBulkStock,
  hashPimBulkValue,
  normalizePimBulkAction,
  normalizePimBulkSelection,
  pimBulkActionLabel,
  pimBulkTargetLimit,
  type PimBulkAction,
  type PimBulkFilters,
  type PimBulkIssue,
  type PimBulkIssueCode,
  type PimBulkPreviewRow,
  type PimBulkSelection,
  type PimBulkTargetRow,
  type PimBulkTargetType
} from "@/lib/pim-bulk-edit";
import { validateProductPublishSnapshot, type ProductPublishSnapshot } from "@/lib/product-manager";
import { linkPimAuditEntities, recordPimAuditEvent } from "@/lib/pim-audit-server";

export type PimBulkListResult = {
  targetType: PimBulkTargetType;
  page: number;
  pageSize: number;
  total: number;
  rows: PimBulkTargetRow[];
};

export type PimBulkPreview = {
  status: "ready" | "blocked";
  action: PimBulkAction;
  actionLabel: string;
  selection: PimBulkSelection;
  previewToken: string;
  previewHash: string;
  targetIds: string[];
  summary: {
    targetCount: number;
    validCount: number;
    invalidCount: number;
    skippedCount: number;
    warnings: number;
    blockingErrors: number;
    estimatedUpdates: number;
  };
  rows: PimBulkPreviewRow[];
  issues: PimBulkIssue[];
  transactionState: Array<Record<string, unknown>>;
};

type PreviewClaims = {
  v: 1;
  actorId: string;
  role: string;
  previewHash: string;
  exp: number;
};

export class PimBulkEditServerError extends Error {
  constructor(public readonly status: number, message: string, public readonly code: PimBulkIssueCode | "INVALID_REQUEST" = "INVALID_REQUEST") {
    super(message);
  }
}

export function isPimBulkCommitRole(role: string) {
  return ["owner", "superadmin", "super_admin"].includes(role);
}

export async function loadPimBulkEditConfig(client: SupabaseClient, role: string) {
  const [{ data: categories, error }, history] = await Promise.all([
    client.from("product_categories").select("id,name,slug,is_active,status").order("sort_order"),
    loadPimBulkHistory(client)
  ]);
  if (error) throw new PimBulkEditServerError(503, "Kategori PIM belum dapat dimuat.");
  return {
    role,
    previewOnly: !isPimBulkCommitRole(role),
    limits: PIM_BULK_EDIT_LIMITS,
    categories: records(categories).filter((row) => row.is_active !== false && row.status !== "inactive" && !String(row.slug || "").toLowerCase().includes("jersey")).map((row) => ({ id: String(row.id), name: String(row.name), slug: String(row.slug) })),
    history: history.rows,
    historyAvailable: history.available,
    unsupportedActions: ["BULK_SKU", "BULK_SLUG", "BULK_RENAME", "BULK_TAGS", "BULK_MEDIA", "VARIANT_ARCHIVE", "PERMANENT_DELETE"]
  };
}

export async function listPimBulkTargets(input: {
  client: SupabaseClient;
  targetType: PimBulkTargetType;
  filters: PimBulkFilters;
  page: number;
  pageSize?: number;
  excludedIds?: string[];
}): Promise<PimBulkListResult> {
  const page = Math.max(1, Math.floor(input.page || 1));
  const pageSize = Math.max(1, Math.min(input.pageSize || PIM_BULK_EDIT_LIMITS.pageSize, pimBulkTargetLimit(input.targetType) + 1));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const token = safeSearchToken(input.filters.query);
  const exclusion = (input.excludedIds || []).length ? `(${(input.excludedIds || []).join(",")})` : "";

  if (input.targetType === "product") {
    let query = input.client.from("products").select("id,name,nama,slug,status,product_category_id,base_price,product_type,updated_at", { count: "exact" });
    if (input.filters.status !== "all") query = query.eq("status", input.filters.status);
    if (input.filters.categoryId) query = query.eq("product_category_id", input.filters.categoryId);
    if (token) query = query.or(`name.ilike.%${token}%,nama.ilike.%${token}%,slug.ilike.%${token}%,sku.ilike.%${token}%`);
    if (exclusion) query = query.not("id", "in", exclusion);
    const { data, error, count } = await query.order("updated_at", { ascending: false }).range(from, to);
    if (error) throw new PimBulkEditServerError(503, "Daftar product root belum dapat dimuat.");
    const rows = records(data);
    const categories = await categoryMap(input.client, rows.map((row) => String(row.product_category_id || "")));
    return { targetType: input.targetType, page, pageSize, total: Number(count || 0), rows: rows.map((row) => mapProductRow(row, categories)) };
  }

  if (input.targetType === "variant") {
    let query = input.client.from("product_variants").select("id,product_id,name,variant_name,color_name,slug,sku,status,is_active,price_adjustment,is_default,updated_at", { count: "exact" });
    if (input.filters.status !== "all") query = query.eq("status", input.filters.status);
    if (token) query = query.or(`name.ilike.%${token}%,variant_name.ilike.%${token}%,color_name.ilike.%${token}%,slug.ilike.%${token}%,sku.ilike.%${token}%`);
    if (exclusion) query = query.not("id", "in", exclusion);
    const { data, error, count } = await query.order("updated_at", { ascending: false }).range(from, to);
    if (error) throw new PimBulkEditServerError(503, "Daftar color variant belum dapat dimuat.");
    const rows = records(data);
    const products = await productMap(input.client, rows.map((row) => String(row.product_id || "")));
    return { targetType: input.targetType, page, pageSize, total: Number(count || 0), rows: rows.map((row) => mapVariantRow(row, products)) };
  }

  let query = input.client.from("product_variant_sizes").select("id,variant_id,size_name,sku,status,is_active,stock_quantity,stock,price_adjustment,updated_at", { count: "exact" });
  if (input.filters.status !== "all") query = query.eq("status", input.filters.status);
  if (token) query = query.or(`size_name.ilike.%${token}%,sku.ilike.%${token}%`);
  if (exclusion) query = query.not("id", "in", exclusion);
  const { data, error, count } = await query.order("updated_at", { ascending: false }).range(from, to);
  if (error) throw new PimBulkEditServerError(503, "Daftar sellable SKU belum dapat dimuat.");
  const rows = records(data);
  const variants = await variantMap(input.client, rows.map((row) => String(row.variant_id || "")));
  const products = await productMap(input.client, [...variants.values()].map((row) => String(row.product_id || "")));
  return { targetType: input.targetType, page, pageSize, total: Number(count || 0), rows: rows.map((row) => mapSellableRow(row, variants, products)) };
}

export async function validatePimBulkEdit(input: {
  client: SupabaseClient;
  actorId: string;
  role: string;
  selection: unknown;
  action: unknown;
}): Promise<PimBulkPreview> {
  const rawSelection = input.selection && typeof input.selection === "object" && !Array.isArray(input.selection) ? input.selection as Record<string, unknown> : null;
  if (Array.isArray(rawSelection?.excludedIds) && rawSelection.excludedIds.length > PIM_BULK_EDIT_LIMITS.maxExclusions) {
    throw new PimBulkEditServerError(422, `Exclusion melebihi limit ${PIM_BULK_EDIT_LIMITS.maxExclusions}. Persempit filter.`, "BATCH_LIMIT_EXCEEDED");
  }
  const selection = normalizePimBulkSelection(input.selection);
  const action = normalizePimBulkAction(input.action);
  if (!selection) throw new PimBulkEditServerError(400, "Selection Bulk Edit tidak valid.", "NO_TARGET_SELECTED");
  if (!action) throw new PimBulkEditServerError(400, "Action Bulk Edit tidak valid.", "INVALID_ACTION");
  if (selection.targetType !== action.targetType) throw new PimBulkEditServerError(400, "Target type tidak sesuai action.", "INVALID_TARGET_TYPE");
  const limit = pimBulkTargetLimit(selection.targetType);
  if (selection.mode === "explicit" && (selection.ids.length > limit || selection.ids.length > PIM_BULK_EDIT_LIMITS.totalMutations)) {
    throw new PimBulkEditServerError(422, `Batch ${selection.targetType} melebihi limit ${limit}.`, "BATCH_LIMIT_EXCEEDED");
  }

  const resolved = await resolveSelection(input.client, selection);
  if (!resolved.rows.length) throw new PimBulkEditServerError(422, "Tidak ada target yang dipilih.", "NO_TARGET_SELECTED");
  if (resolved.totalBeforeExclusion > limit || resolved.rows.length > limit || resolved.rows.length > PIM_BULK_EDIT_LIMITS.totalMutations) {
    throw new PimBulkEditServerError(422, `Batch ${selection.targetType} melebihi limit ${limit}. Persempit filter.`, "BATCH_LIMIT_EXCEEDED");
  }

  const computed = await computePreview(input.client, resolved.rows, action);
  const issues = dedupeIssues([...resolved.issues, ...computed.issues]);
  const blockingIds = new Set(issues.filter((issue) => issue.severity === "error" && issue.targetId).map((issue) => issue.targetId as string));
  const rows = computed.rows.map((row) => blockingIds.has(row.id) ? { ...row, validationStatus: "error" as const, issues: issues.filter((issue) => issue.targetId === row.id) } : row);
  const blockingErrors = issues.filter((issue) => issue.severity === "error").length;
  const skippedCount = rows.filter((row) => row.validationStatus === "skipped").length;
  const beforeState = resolved.rows.map((row) => expectedState(row));
  const previewHash = hashPimBulkValue({ action, selection, targetIds: resolved.rows.map((row) => row.id), beforeState, dependencyHash: computed.dependencyHash, rows: rows.map((row) => ({ id: row.id, currentValue: row.currentValue, newValue: row.newValue, validationStatus: row.validationStatus })) });
  const previewToken = createPreviewToken({ v: 1, actorId: input.actorId, role: input.role, previewHash, exp: Math.floor(Date.now() / 1000) + PIM_BULK_EDIT_LIMITS.previewTokenTtlSeconds });
  return {
    status: blockingErrors ? "blocked" : "ready",
    action,
    actionLabel: pimBulkActionLabel(action),
    selection,
    previewToken,
    previewHash,
    targetIds: resolved.rows.map((row) => row.id),
    summary: {
      targetCount: resolved.rows.length,
      validCount: rows.filter((row) => row.validationStatus === "valid").length,
      invalidCount: rows.filter((row) => row.validationStatus === "error").length,
      skippedCount,
      warnings: issues.filter((issue) => issue.severity === "warning").length,
      blockingErrors,
      estimatedUpdates: rows.filter((row) => row.validationStatus === "valid" && row.currentValue !== row.newValue).length
    },
    rows: rows.slice(0, PIM_BULK_EDIT_LIMITS.previewRows),
    issues,
    transactionState: beforeState
  };
}

export async function commitPimBulkEdit(input: {
  client: SupabaseClient;
  actorId: string;
  role: string;
  selection: unknown;
  action: unknown;
  previewToken: string;
}) {
  if (!isPimBulkCommitRole(input.role)) {
    const operationId = randomUUID();
    await recordPimAuditEvent(input.client, { eventCode: "BULK_EDIT_DENIED", status: "DENIED", actorId: input.actorId, actorRole: input.role, requestId: operationId, operationId, idempotencyKey: `bulk-edit-denied:${operationId}`, entityType: "pim_bulk_action_batch", summary: "Bulk Edit ditolak", failureCode: "PERMISSION_DENIED_BULK_COMMIT", metadata: { reasonCode: "PERMISSION_DENIED_BULK_COMMIT" } });
    throw new PimBulkEditServerError(403, "Role ini hanya dapat menjalankan preview.", "PERMISSION_DENIED_BULK_COMMIT");
  }
  const claims = verifyPreviewToken(input.previewToken, input.actorId, input.role);
  const preview = await validatePimBulkEdit(input);
  if (preview.previewHash !== claims.previewHash) throw new PimBulkEditServerError(409, "DATA CHANGED — RUN PREVIEW AGAIN", "PREVIEW_HASH_MISMATCH");
  if (preview.status !== "ready") throw new PimBulkEditServerError(422, "Bulk Edit diblokir oleh validasi terbaru.", "TRANSACTION_ROLLED_BACK");
  const idempotencyKey = createHmac("sha256", "DEBRODER_PIM_BULK_EDIT_V1").update(`${input.actorId}:${preview.previewHash}:${input.previewToken}`).digest("hex");
  const { data, error } = await input.client.rpc("pim_bulk_edit_apply_v1", {
    p_actor_id: input.actorId,
    p_preview_hash: preview.previewHash,
    p_idempotency_key: idempotencyKey,
    p_selection_mode: preview.selection.mode,
    p_action: preview.action,
    p_target_ids: preview.targetIds,
    p_before_state: preview.transactionState
  });
  if (error) {
    console.error("PIM bulk edit RPC failed", { code: error.code });
    const code = rpcIssueCode(error.message || "");
    const operationId = randomUUID();
    await recordPimAuditEvent(input.client, { eventCode: "BULK_EDIT_ROLLED_BACK", status: "ROLLED_BACK", actorId: input.actorId, actorRole: input.role, requestId: idempotencyKey, operationId, idempotencyKey: `${idempotencyKey}:rollback`, entityType: "pim_bulk_action_batch", summary: "Bulk Edit di-rollback", failureCode: code, metadata: { actionType: preview.action.type, selectionMode: preview.selection.mode, targetType: preview.selection.targetType, targetCount: preview.summary.targetCount } });
    throw new PimBulkEditServerError(409, code === "CONCURRENT_MODIFICATION" ? "DATA CHANGED — RUN PREVIEW AGAIN" : "Bulk Edit gagal dan seluruh transaction di-rollback.", code);
  }
  const auditedTargets = await loadRowsByIds(input.client, preview.selection.targetType, preview.targetIds);
  await linkPimAuditEntities({
    client: input.client,
    eventCode: "BULK_EDIT_COMPLETED",
    idempotencyKey,
    entities: preview.targetIds.map((id) => {
      const row = auditedTargets.find((candidate) => candidate.id === id);
      return {
        entityType: preview.selection.targetType === "product" ? "products" : preview.selection.targetType === "variant" ? "product_variants" : "product_variant_sizes",
        entityId: id,
        entityLabel: row?.label || null,
        productId: row?.productId || (preview.selection.targetType === "product" ? id : null),
        variantId: preview.selection.targetType === "variant" ? id : null,
        sku: row?.sku || null,
        resultStatus: "COMPLETED" as const
      };
    })
  });
  return data;
}

function createPreviewToken(claims: PreviewClaims) {
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${payload}.${createHmac("sha256", previewSecret()).update(payload).digest("base64url")}`;
}

function verifyPreviewToken(token: string, actorId: string, role: string) {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) throw new PimBulkEditServerError(400, "Preview token tidak valid.", "PREVIEW_HASH_MISMATCH");
  const expected = createHmac("sha256", previewSecret()).update(payload).digest("base64url");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) throw new PimBulkEditServerError(400, "Preview token tidak valid.", "PREVIEW_HASH_MISMATCH");
  let claims: PreviewClaims;
  try { claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as PreviewClaims; }
  catch { throw new PimBulkEditServerError(400, "Preview token tidak valid.", "PREVIEW_HASH_MISMATCH"); }
  if (claims.actorId !== actorId || claims.role !== role) throw new PimBulkEditServerError(403, "Permission atau actor berubah sejak preview.", "PERMISSION_DENIED_BULK_COMMIT");
  if (!claims.exp || claims.exp < Math.floor(Date.now() / 1000)) throw new PimBulkEditServerError(409, "Preview kedaluwarsa. Jalankan preview lagi.", "PREVIEW_EXPIRED");
  return claims;
}

async function resolveSelection(client: SupabaseClient, selection: PimBulkSelection) {
  if (selection.mode === "explicit") {
    const rows = await loadRowsByIds(client, selection.targetType, selection.ids);
    const found = new Set(rows.map((row) => row.id));
    const missing = selection.ids.filter((id) => !found.has(id));
    const issues = missing.map((id) => issue(id, "TARGET_NOT_FOUND", "Target tidak ditemukan atau tidak lagi tersedia.", "selection"));
    return { rows, issues, totalBeforeExclusion: selection.ids.length };
  }
  const limit = pimBulkTargetLimit(selection.targetType);
  const listed = await listPimBulkTargets({ client, targetType: selection.targetType, filters: selection.filters, page: 1, pageSize: limit + 1, excludedIds: selection.excludedIds });
  const excluded = new Set(selection.excludedIds);
  return { rows: listed.rows.filter((row) => !excluded.has(row.id)), issues: [] as PimBulkIssue[], totalBeforeExclusion: listed.total };
}

async function computePreview(client: SupabaseClient, targets: PimBulkTargetRow[], action: PimBulkAction) {
  const issues: PimBulkIssue[] = [];
  let dependencyHash = "";
  let category: { id: string; name: string; slug: string } | null = null;
  if (action.type === "PRODUCT_SET_CATEGORY") {
    const { data, error } = await client.from("product_categories").select("id,name,slug,is_active,status,updated_at").eq("id", action.categoryId).maybeSingle();
    if (error || !data || data.is_active === false || data.status === "inactive") issues.push(issue(null, "INVALID_CATEGORY", "Kategori tujuan tidak valid atau tidak aktif.", "categoryId"));
    else if (String(data.slug || "").toLowerCase().includes("jersey")) issues.push(issue(null, "CATEGORY_COMPATIBILITY_ERROR", "Kategori tujuan Jersey dilindungi dari generic Bulk Edit.", "categoryId"));
    else category = { id: String(data.id), name: String(data.name), slug: String(data.slug) };
    dependencyHash = hashPimBulkValue(data || null);
  }

  if (action.type === "PRODUCT_SET_STATUS" && action.status === "active") {
    const publish = await validatePublishTargets(client, targets.map((row) => row.id));
    issues.push(...publish.issues);
    dependencyHash = publish.dependencyHash;
  }

  if (action.type === "VARIANT_SET_STATUS" && action.status === "inactive") {
    const dependency = await validateVariantDeactivate(client, targets);
    issues.push(...dependency.issues);
    dependencyHash = dependency.dependencyHash;
  }

  const rows = targets.map((row): PimBulkPreviewRow => {
    let currentValue: string | number = row.status;
    let newValue: string | number = row.status;
    const ownIssues: PimBulkIssue[] = [];
    if (action.type === "PRODUCT_SET_CATEGORY") {
      currentValue = row.categoryName || row.categoryId || "—";
      newValue = category?.name || "—";
      if (isJerseyProduct(row)) ownIssues.push(issue(row.id, "CATEGORY_COMPATIBILITY_ERROR", "Kategori produk Jersey dilindungi dari bulk category move.", "categoryId"));
    } else if (action.type === "PRODUCT_SET_STATUS") {
      currentValue = row.status;
      newValue = action.status;
      if (action.status === "active" && row.status !== "draft") ownIssues.push(issue(row.id, "PRODUCT_STATE_CONFLICT", "Bulk Publish hanya menerima product Draft.", "status"));
      if (action.status === "archived" && row.status !== "active") ownIssues.push(issue(row.id, "PRODUCT_STATE_CONFLICT", "Archive hanya menerima product Active.", "status"));
    } else if (action.type === "PRODUCT_PRICE" || action.type === "VARIANT_PRICE") {
      currentValue = action.type === "PRODUCT_PRICE" ? row.basePrice ?? -1 : row.priceAdjustment ?? 0;
      const calculated = calculatePimBulkPrice(Number(currentValue), action.mode, action.value);
      if (calculated.code) ownIssues.push(issue(row.id, calculated.code, priceErrorMessage(calculated.code), "price"));
      else newValue = calculated.value as number;
    } else if (action.type === "VARIANT_SET_STATUS") {
      currentValue = row.status;
      newValue = action.status;
    } else {
      currentValue = row.stockQuantity ?? -1;
      const calculated = calculatePimBulkStock(Number(currentValue), action.mode, action.value);
      if (calculated.code) ownIssues.push(issue(row.id, calculated.code, stockErrorMessage(calculated.code), "stock"));
      else newValue = calculated.value as number;
    }
    issues.push(...ownIssues);
    const noChange = currentValue === newValue && !ownIssues.length;
    return { id: row.id, label: row.label, secondary: row.secondary, currentValue, newValue, validationStatus: ownIssues.length ? "error" : noChange ? "skipped" : "valid", issues: ownIssues };
  });
  return { rows, issues, dependencyHash };
}

async function validatePublishTargets(client: SupabaseClient, productIds: string[]) {
  const products = await loadRowsByIds(client, "product", productIds);
  const { data: variantsData, error: variantsError } = await client.from("product_variants").select("id,product_id,name,variant_name,slug,hex_code,color_hex,status,is_active").in("product_id", productIds).limit(PIM_BULK_EDIT_LIMITS.totalMutations + 1);
  if (variantsError) throw new PimBulkEditServerError(503, "Dependency Publish belum dapat dimuat.");
  const variants = records(variantsData);
  const variantIds = variants.map((row) => String(row.id));
  const [sellables, images, sizes, categories] = await Promise.all([
    selectChunks(client, "product_variant_sizes", "id,variant_id,sku,size_id,stock_quantity,stock,status,is_active", "variant_id", variantIds),
    selectChunks(client, "product_variant_images", "id,variant_id,image_role,image_url,is_cover,sort_order", "variant_id", variantIds),
    selectAll(client, "product_size_master", "id,is_active", "Size Master belum dapat dimuat."),
    selectChunks(client, "product_categories", "id,status,is_active,updated_at", "id", products.map((product) => product.categoryId || "").filter(Boolean))
  ]);
  const slugs = products.map((product) => product.secondary.replace(/^\//, "")).filter(Boolean);
  const skus = sellables.map((item) => String(item.sku || "")).filter(Boolean);
  const [duplicateProducts, duplicateSellables] = await Promise.all([
    selectChunks(client, "products", "id,slug", "slug", slugs),
    selectChunks(client, "product_variant_sizes", "id,sku", "sku", skus)
  ]);
  const categoryById = new Map(categories.map((category) => [String(category.id), category]));
  const issues: PimBulkIssue[] = [];
  for (const product of products) {
    const ownVariants = variants.filter((row) => String(row.product_id) === product.id);
    const snapshot: ProductPublishSnapshot = {
      id: product.id,
      name: product.label,
      slug: product.secondary.replace(/^\//, ""),
      productCategoryId: product.categoryId,
      basePrice: product.basePrice,
      status: product.status as "draft" | "active" | "archived",
      categoryActive: Boolean(product.categoryId && categoryById.get(product.categoryId)?.is_active !== false && categoryById.get(product.categoryId)?.status !== "inactive"),
      duplicateSlug: duplicateProducts.some((candidate) => String(candidate.slug) === product.secondary.replace(/^\//, "") && String(candidate.id) !== product.id),
      variants: ownVariants.map((variant) => {
        const id = String(variant.id);
        return {
          id,
          name: String(variant.name || variant.variant_name || ""),
          slug: String(variant.slug || ""),
          hexCode: String(variant.hex_code || variant.color_hex || ""),
          status: variantStatus(variant),
          hasFrontImage: images.some((image) => String(image.variant_id) === id && image.image_url && (image.image_role === "front" || image.is_cover === true)),
          sellable: sellables.filter((item) => String(item.variant_id) === id).map((item) => ({
            id: String(item.id),
            sku: typeof item.sku === "string" ? item.sku : null,
            sizeId: item.size_id ? String(item.size_id) : null,
            sizeActive: sizes.some((size) => String(size.id) === String(item.size_id) && size.is_active !== false),
            stockQuantity: finiteNumber(item.stock_quantity ?? item.stock),
            status: variantStatus(item),
            duplicateSku: duplicateSellables.some((candidate) => String(candidate.sku) === String(item.sku || "") && String(candidate.id) !== String(item.id))
          }))
        };
      })
    };
    for (const validation of validateProductPublishSnapshot(snapshot)) {
      if (validation.severity === "error") issues.push(issue(product.id, "PUBLISH_VALIDATION_FAILED", validation.message, validation.field));
    }
  }
  return { issues, dependencyHash: hashPimBulkValue({ products, variants, sellables, images, sizes, categories, duplicateProducts, duplicateSellables }) };
}

async function validateVariantDeactivate(client: SupabaseClient, targets: PimBulkTargetRow[]) {
  const productIds = [...new Set(targets.map((row) => row.productId))];
  const variants = await selectChunks(client, "product_variants", "id,product_id,status,is_active,updated_at", "product_id", productIds);
  const products = await productMap(client, productIds);
  const targetIds = new Set(targets.map((row) => row.id));
  const issues: PimBulkIssue[] = [];
  for (const productId of productIds) {
    const product = products.get(productId);
    if (product && String(product.status) === "active") {
      const remaining = variants.filter((row) => String(row.product_id) === productId && variantStatus(row) === "active" && !targetIds.has(String(row.id)));
      if (!remaining.length) for (const target of targets.filter((row) => row.productId === productId)) issues.push(issue(target.id, "VARIANT_INACTIVE_CONFLICT", "Published product wajib memiliki minimal satu variant aktif.", "status"));
    }
  }
  return { issues, dependencyHash: hashPimBulkValue({ products: [...products.values()], variants }) };
}

async function loadRowsByIds(client: SupabaseClient, targetType: PimBulkTargetType, ids: string[]) {
  if (!ids.length) return [];
  const rows: PimBulkTargetRow[] = [];
  for (let index = 0; index < ids.length; index += 100) {
    const chunk = ids.slice(index, index + 100);
    if (targetType === "product") {
      const { data, error } = await client.from("products").select("id,name,nama,slug,status,product_category_id,base_price,product_type,updated_at").in("id", chunk);
      if (error) throw new PimBulkEditServerError(503, "Target product belum dapat dimuat.");
      const recordsValue = records(data);
      const categories = await categoryMap(client, recordsValue.map((row) => String(row.product_category_id || "")));
      rows.push(...recordsValue.map((row) => mapProductRow(row, categories)));
    } else if (targetType === "variant") {
      const { data, error } = await client.from("product_variants").select("id,product_id,name,variant_name,color_name,slug,sku,status,is_active,price_adjustment,is_default,updated_at").in("id", chunk);
      if (error) throw new PimBulkEditServerError(503, "Target variant belum dapat dimuat.");
      const recordsValue = records(data);
      const products = await productMap(client, recordsValue.map((row) => String(row.product_id || "")));
      rows.push(...recordsValue.map((row) => mapVariantRow(row, products)));
    } else {
      const { data, error } = await client.from("product_variant_sizes").select("id,variant_id,size_name,sku,status,is_active,stock_quantity,stock,price_adjustment,updated_at").in("id", chunk);
      if (error) throw new PimBulkEditServerError(503, "Target sellable SKU belum dapat dimuat.");
      const recordsValue = records(data);
      const variants = await variantMap(client, recordsValue.map((row) => String(row.variant_id || "")));
      const products = await productMap(client, [...variants.values()].map((row) => String(row.product_id || "")));
      rows.push(...recordsValue.map((row) => mapSellableRow(row, variants, products)));
    }
  }
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.map((id) => byId.get(id)).filter(Boolean) as PimBulkTargetRow[];
}

async function loadPimBulkHistory(client: SupabaseClient) {
  const { data, error } = await client.from("pim_bulk_action_batches").select("id,action_type,target_type,selection_mode,target_count,status,result,created_at,completed_at,actor_role").order("created_at", { ascending: false }).limit(20);
  if (error) return { available: false, rows: [] };
  return { available: true, rows: records(data).map((row) => ({ id: String(row.id), action: String(row.action_type), targetType: String(row.target_type), selectionMode: String(row.selection_mode), targetCount: Number(row.target_count || 0), status: String(row.status), result: row.result, createdAt: String(row.created_at), completedAt: row.completed_at ? String(row.completed_at) : null, actorRole: String(row.actor_role || "") })) };
}

function mapProductRow(row: Record<string, unknown>, categories: Map<string, Record<string, unknown>>): PimBulkTargetRow {
  const category = categories.get(String(row.product_category_id || ""));
  return { id: String(row.id), targetType: "product", productId: String(row.id), label: String(row.name || row.nama || "Produk"), secondary: `/${String(row.slug || "")}`, status: String(row.status || "draft"), categoryId: row.product_category_id ? String(row.product_category_id) : null, categoryName: String(category?.name || ""), categorySlug: String(category?.slug || ""), productType: String(row.product_type || "standard_product"), productStatus: String(row.status || "draft"), basePrice: finiteNumber(row.base_price), priceAdjustment: null, stockQuantity: null, sku: "", updatedAt: row.updated_at ? String(row.updated_at) : null };
}

function mapVariantRow(row: Record<string, unknown>, products: Map<string, Record<string, unknown>>): PimBulkTargetRow {
  const product = products.get(String(row.product_id));
  return { id: String(row.id), targetType: "variant", productId: String(row.product_id), label: String(row.name || row.variant_name || row.color_name || "Variant"), secondary: `${String(product?.name || product?.nama || "Produk")} · /${String(row.slug || "")}`, status: variantStatus(row), categoryId: product?.product_category_id ? String(product.product_category_id) : null, categoryName: "", categorySlug: "", productType: String(product?.product_type || "standard_product"), productStatus: String(product?.status || "draft"), basePrice: finiteNumber(product?.base_price), priceAdjustment: finiteNumber(row.price_adjustment) ?? 0, stockQuantity: null, sku: String(row.sku || ""), updatedAt: row.updated_at ? String(row.updated_at) : null };
}

function mapSellableRow(row: Record<string, unknown>, variants: Map<string, Record<string, unknown>>, products: Map<string, Record<string, unknown>>): PimBulkTargetRow {
  const variant = variants.get(String(row.variant_id));
  const product = products.get(String(variant?.product_id || ""));
  return { id: String(row.id), targetType: "sellable", productId: String(variant?.product_id || ""), label: String(row.sku || row.size_name || "Sellable SKU"), secondary: `${String(product?.name || product?.nama || "Produk")} · ${String(variant?.name || variant?.variant_name || variant?.color_name || "Variant")} · ${String(row.size_name || "")}`, status: variantStatus(row), categoryId: product?.product_category_id ? String(product.product_category_id) : null, categoryName: "", categorySlug: "", productType: String(product?.product_type || "standard_product"), productStatus: String(product?.status || "draft"), basePrice: finiteNumber(product?.base_price), priceAdjustment: finiteNumber(row.price_adjustment) ?? 0, stockQuantity: finiteNumber(row.stock_quantity ?? row.stock), sku: String(row.sku || ""), updatedAt: row.updated_at ? String(row.updated_at) : null };
}

async function productMap(client: SupabaseClient, ids: string[]) {
  const rows = await selectChunks(client, "products", "id,name,nama,status,product_category_id,base_price,product_type", "id", [...new Set(ids.filter(Boolean))]);
  return new Map(rows.map((row) => [String(row.id), row]));
}

async function variantMap(client: SupabaseClient, ids: string[]) {
  const rows = await selectChunks(client, "product_variants", "id,product_id,name,variant_name,color_name,status,is_active", "id", [...new Set(ids.filter(Boolean))]);
  return new Map(rows.map((row) => [String(row.id), row]));
}

async function categoryMap(client: SupabaseClient, ids: string[]) {
  const rows = await selectChunks(client, "product_categories", "id,name,slug,status,is_active", "id", [...new Set(ids.filter(Boolean))]);
  return new Map(rows.map((row) => [String(row.id), row]));
}

async function selectChunks(client: SupabaseClient, table: string, columns: string, field: string, values: string[]) {
  const output: Record<string, unknown>[] = [];
  for (let index = 0; index < values.length; index += 100) {
    const chunk = values.slice(index, index + 100);
    if (!chunk.length) continue;
    const { data, error } = await client.from(table).select(columns).in(field, chunk);
    if (error) throw new PimBulkEditServerError(503, "Dependency PIM belum dapat dimuat.");
    output.push(...records(data));
  }
  return output;
}

async function selectAll(client: SupabaseClient, table: string, columns: string, errorMessage: string) {
  const { data, error } = await client.from(table).select(columns);
  if (error) throw new PimBulkEditServerError(503, errorMessage);
  return records(data);
}

function expectedState(row: PimBulkTargetRow) {
  return { id: row.id, updatedAt: row.updatedAt, status: row.status, categoryId: row.categoryId, basePrice: row.basePrice, priceAdjustment: row.priceAdjustment, stockQuantity: row.stockQuantity };
}

function isJerseyProduct(row: PimBulkTargetRow) {
  return row.categorySlug.toLowerCase().includes("jersey") || row.productType.toLowerCase().includes("jersey");
}

function issue(targetId: string | null, code: PimBulkIssueCode, message: string, field: string): PimBulkIssue {
  return { targetId, code, message, field, severity: "error" };
}

function priceErrorMessage(code: PimBulkIssueCode) {
  if (code === "NEGATIVE_PRICE_RESULT") return "Hasil harga tidak boleh negatif.";
  if (code === "PRICE_ROUNDING_RULE_MISSING") return "Persentase menghasilkan pecahan Rupiah; batch diblokir tanpa pembulatan diam-diam.";
  return "Nilai harga tidak valid atau melebihi batas aman.";
}

function stockErrorMessage(code: PimBulkIssueCode) {
  if (code === "INSUFFICIENT_STOCK_FOR_BULK_DECREASE") return "Pengurangan menghasilkan stok negatif.";
  return "Nilai stok tidak valid atau melebihi batas aman.";
}

function safeSearchToken(value: string) {
  return value.replace(/[,().:%_*]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

function variantStatus(row: Record<string, unknown>) {
  return row.status === "inactive" || row.is_active === false ? "inactive" : "active";
}

function finiteNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function records(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === "object") as Record<string, unknown>[] : [];
}

function dedupeIssues(issues: PimBulkIssue[]) {
  const seen = new Set<string>();
  return issues.filter((item) => {
    const key = `${item.targetId}:${item.code}:${item.field}:${item.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function rpcIssueCode(message: string): PimBulkIssueCode {
  const codes: PimBulkIssueCode[] = [
    "CONCURRENT_MODIFICATION",
    "IDEMPOTENCY_CONFLICT",
    "PERMISSION_DENIED_BULK_COMMIT",
    "BATCH_LIMIT_EXCEEDED",
    "INVALID_ACTION",
    "INVALID_TARGET_TYPE",
    "INVALID_CATEGORY",
    "CATEGORY_COMPATIBILITY_ERROR",
    "INVALID_STATUS",
    "PUBLISH_VALIDATION_FAILED",
    "INVALID_PRICE",
    "NEGATIVE_PRICE_RESULT",
    "PRICE_ROUNDING_RULE_MISSING",
    "INVALID_STOCK",
    "INSUFFICIENT_STOCK_FOR_BULK_DECREASE",
    "VARIANT_INACTIVE_CONFLICT",
    "PRODUCT_STATE_CONFLICT",
    "AUDIT_WRITE_FAILED"
  ];
  return codes.find((code) => message.includes(code)) || "TRANSACTION_ROLLED_BACK";
}

function previewSecret() {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!secret) throw new PimBulkEditServerError(503, "Secret server untuk preview Bulk Edit belum dikonfigurasi.");
  return `${secret}:DEBRODER_PIM_BULK_EDIT_PREVIEW_V1`;
}
