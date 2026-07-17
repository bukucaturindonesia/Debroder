import { createHash, randomUUID } from "node:crypto";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { isAdminRole } from "@/lib/access-control";
import {
  PIM_AUDIT_CATEGORIES,
  PIM_AUDIT_EVENT_REGISTRY,
  PIM_AUDIT_EVENT_VERSION,
  PIM_AUDIT_SOURCE_MODULES,
  PIM_AUDIT_STATUSES,
  PIM_AUDIT_TIMEZONE,
  assertPimAuditEvent,
  isPimAuditEventCode,
  safeAuditSearch,
  safeFailureCode,
  safeUuid,
  sanitizePimAuditEntity,
  sanitizePimAuditMetadata,
  type PimAuditCategory,
  type PimAuditChange,
  type PimAuditEntity,
  type PimAuditEventCode,
  type PimAuditRecordInput,
  type PimAuditStatus
} from "@/lib/pim-audit";

const PAGE_SIZE_DEFAULT = 30;
const PAGE_SIZE_MAX = 100;
const DATE_RANGE_MAX_DAYS = 366;

export type PimAuditListFilters = {
  search: string;
  from: string;
  to: string;
  actorId: string | null;
  actorRole: string;
  category: PimAuditCategory | "";
  eventCode: PimAuditEventCode | "";
  status: PimAuditStatus | "";
  sourceModule: string;
  entityType: string;
  productId: string | null;
  variantId: string | null;
  sku: string;
  batchId: string | null;
  requestId: string;
  operationId: string | null;
  cursor: { createdAt: string; id: string } | null;
  pageSize: number;
  sort: "newest" | "oldest";
};

export type PimAuditListRow = {
  id: string;
  eventCode: string;
  eventVersion: number;
  category: string;
  status: string;
  createdAt: string;
  actorId: string | null;
  actorRole: string;
  actorLabel: string;
  sourceModule: string;
  entityType: string;
  entityId: string | null;
  entityLabel: string;
  productId: string | null;
  variantId: string | null;
  sku: string | null;
  batchId: string | null;
  requestId: string | null;
  operationId: string | null;
  durationMs: number | null;
  summary: string;
  failureCode: string | null;
};

export type PimAuditDetail = PimAuditListRow & {
  parentAuditId: string | null;
  metadata: Record<string, unknown>;
  changes: PimAuditChange[];
  entities: PimAuditEntity[];
};

export class PimAuditServerError extends Error {
  constructor(public readonly status: number, message: string, public readonly code: string) {
    super(message);
  }
}

export function createPimAuditIdentity(request: Request, seed: string) {
  const requestHeader = request.headers.get("x-request-id")?.trim() || "";
  const operationHeader = request.headers.get("x-operation-id")?.trim() || "";
  const requestId = /^[A-Za-z0-9._:-]{8,120}$/.test(requestHeader) ? requestHeader : randomUUID();
  const operationId = safeUuid(operationHeader) || randomUUID();
  const idempotencyKey = createHash("sha256").update(`pim-audit-v1:${requestId}:${operationId}:${seed}`).digest("hex");
  return { requestId, operationId, idempotencyKey };
}

export function actorAuditLabel(user: User) {
  const display = user.user_metadata && typeof user.user_metadata.display_name === "string"
    ? user.user_metadata.display_name
    : user.user_metadata && typeof user.user_metadata.full_name === "string"
      ? user.user_metadata.full_name
      : "";
  return display.trim().slice(0, 120) || `Admin ${user.id.slice(0, 8)}`;
}

export async function recordPimAuditEvent(client: SupabaseClient, input: PimAuditRecordInput) {
  const definition = assertPimAuditEvent(input.eventCode, input.status);
  const payload = {
    p_event_code: input.eventCode,
    p_event_version: PIM_AUDIT_EVENT_VERSION,
    p_category: definition.category,
    p_status: input.status,
    p_actor_id: input.actorId,
    p_actor_role: input.actorRole.slice(0, 60),
    p_actor_label: input.actorLabel?.slice(0, 120) || null,
    p_source_module: definition.sourceModule,
    p_request_id: input.requestId.slice(0, 120),
    p_operation_id: safeUuid(input.operationId),
    p_idempotency_key: input.idempotencyKey.slice(0, 160),
    p_entity_type: input.entityType.slice(0, 80),
    p_entity_id: safeUuid(input.entityId),
    p_entity_label: input.entityLabel?.slice(0, 180) || null,
    p_product_id: safeUuid(input.productId),
    p_product_color_id: safeUuid(input.productColorId),
    p_variant_id: safeUuid(input.variantId),
    p_sku: input.sku?.slice(0, 100) || null,
    p_batch_id: safeUuid(input.batchId),
    p_parent_audit_id: safeUuid(input.parentAuditId),
    p_duration_ms: Number.isFinite(input.durationMs) && Number(input.durationMs) >= 0 ? Math.floor(Number(input.durationMs)) : null,
    p_summary: input.summary.trim().slice(0, 500),
    p_failure_code: safeFailureCode(input.failureCode),
    p_metadata: { ...sanitizePimAuditMetadata(input.metadata), timezone: PIM_AUDIT_TIMEZONE },
    p_changes: sanitizeChanges(input.changes || []),
    p_entities: (input.entities || []).slice(0, 2000).map(sanitizePimAuditEntity),
    p_retention_class: definition.retentionClass
  };
  const { data, error } = await client.rpc("record_pim_audit_event_v1", payload);
  if (error) {
    console.error("PIM audit write failed", {
      eventCode: input.eventCode,
      operationId: input.operationId,
      requestId: input.requestId,
      code: error.code || "AUDIT_WRITE_FAILED"
    });
    return null;
  }
  return typeof data === "string" ? data : null;
}

export async function linkPimAuditEntities(input: {
  client: SupabaseClient;
  eventCode: PimAuditEventCode;
  idempotencyKey: string;
  entities: PimAuditEntity[];
}) {
  const entities = input.entities.slice(0, 2000).map(sanitizePimAuditEntity);
  if (!entities.length) return true;
  const { error } = await input.client.rpc("link_pim_audit_entities_v1", {
    p_event_code: input.eventCode,
    p_idempotency_key: input.idempotencyKey.slice(0, 160),
    p_entities: entities
  });
  if (error) {
    console.error("PIM audit entity link failed", { eventCode: input.eventCode, code: error.code || "AUDIT_ENTITY_LINK_FAILED" });
    return false;
  }
  return true;
}

export function parsePimAuditFilters(url: URL): PimAuditListFilters {
  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 30 * 86_400_000);
  const from = parseDate(url.searchParams.get("from"), defaultFrom, false);
  const to = parseDate(url.searchParams.get("to"), now, true);
  if (Date.parse(to) < Date.parse(from)) throw new PimAuditServerError(400, "Rentang tanggal tidak valid.", "INVALID_DATE_RANGE");
  if (Date.parse(to) - Date.parse(from) > DATE_RANGE_MAX_DAYS * 86_400_000) {
    throw new PimAuditServerError(400, `Rentang tanggal maksimal ${DATE_RANGE_MAX_DAYS} hari.`, "DATE_RANGE_TOO_LARGE");
  }
  const categoryValue = url.searchParams.get("category") || "";
  const statusValue = url.searchParams.get("status") || "";
  const eventValue = url.searchParams.get("eventCode") || "";
  const sourceModuleValue = url.searchParams.get("sourceModule") || "";
  const actorRoleValue = url.searchParams.get("actorRole") || "";
  if (categoryValue && !PIM_AUDIT_CATEGORIES.includes(categoryValue as PimAuditCategory)) throw invalidFilter();
  if (statusValue && !PIM_AUDIT_STATUSES.includes(statusValue as PimAuditStatus)) throw invalidFilter();
  if (eventValue && !isPimAuditEventCode(eventValue)) throw invalidFilter();
  if (sourceModuleValue && !PIM_AUDIT_SOURCE_MODULES.includes(sourceModuleValue as (typeof PIM_AUDIT_SOURCE_MODULES)[number])) throw invalidFilter();
  if (actorRoleValue && !isAdminRole(actorRoleValue)) throw invalidFilter();
  const sortValue = url.searchParams.get("sort") || "newest";
  if (sortValue !== "newest" && sortValue !== "oldest") throw invalidFilter();
  const sort = sortValue;
  const cursor = parseCursor(url.searchParams.get("cursor"), sort);
  return {
    search: safeAuditSearch(url.searchParams.get("search")),
    from,
    to,
    actorId: nullableUuidFilter(url.searchParams.get("actorId"), "actorId"),
    actorRole: actorRoleValue,
    category: categoryValue as PimAuditCategory | "",
    eventCode: eventValue as PimAuditEventCode | "",
    status: statusValue as PimAuditStatus | "",
    sourceModule: sourceModuleValue,
    entityType: safeAuditSearch(url.searchParams.get("entityType")).slice(0, 80),
    productId: nullableUuidFilter(url.searchParams.get("productId"), "productId"),
    variantId: nullableUuidFilter(url.searchParams.get("variantId"), "variantId"),
    sku: safeAuditSearch(url.searchParams.get("sku")).slice(0, 100),
    batchId: nullableUuidFilter(url.searchParams.get("batchId"), "batchId"),
    requestId: safeAuditSearch(url.searchParams.get("requestId")).slice(0, 120),
    operationId: nullableUuidFilter(url.searchParams.get("operationId"), "operationId"),
    cursor,
    pageSize: Math.max(1, Math.min(PAGE_SIZE_MAX, Number(url.searchParams.get("pageSize")) || PAGE_SIZE_DEFAULT)),
    sort
  };
}

export async function listPimAuditHistory(client: SupabaseClient, filters: PimAuditListFilters) {
  const relatedProductAudits = filters.productId ? await relatedAuditIds(client, "product_id", filters.productId) : [];
  const relatedVariantAudits = filters.variantId ? await relatedAuditIds(client, "variant_id", filters.variantId) : [];
  let query = client
    .from("system_audit_log")
    .select(auditSelect())
    .not("event_code", "is", null)
    .gte("created_at", filters.from)
    .lte("created_at", filters.to);
  if (filters.actorId) query = query.eq("actor_id", filters.actorId);
  if (filters.actorRole) query = query.eq("actor_role", filters.actorRole);
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.eventCode) query = query.eq("event_code", filters.eventCode);
  if (filters.status) query = query.eq("operation_status", filters.status);
  if (filters.sourceModule) query = query.eq("source_module", filters.sourceModule);
  if (filters.entityType) query = query.eq("entity_type", filters.entityType);
  if (filters.productId) query = relatedProductAudits.length
    ? query.or(`product_id.eq.${filters.productId},id.in.(${relatedProductAudits.join(",")})`)
    : query.eq("product_id", filters.productId);
  if (filters.variantId) query = relatedVariantAudits.length
    ? query.or(`variant_id.eq.${filters.variantId},id.in.(${relatedVariantAudits.join(",")})`)
    : query.eq("variant_id", filters.variantId);
  if (filters.sku) query = query.eq("sku", filters.sku);
  if (filters.batchId) query = query.eq("batch_id", filters.batchId);
  if (filters.requestId) query = query.eq("request_id", filters.requestId);
  if (filters.operationId) query = query.eq("operation_id", filters.operationId);
  if (filters.search) query = query.ilike("search_text", `%${filters.search}%`);
  if (filters.cursor) {
    const direction = filters.sort === "newest" ? "lt" : "gt";
    query = query.or(`created_at.${direction}.${filters.cursor.createdAt},and(created_at.eq.${filters.cursor.createdAt},id.${direction}.${filters.cursor.id})`);
  }
  const ascending = filters.sort === "oldest";
  const { data, error } = await query.order("created_at", { ascending }).order("id", { ascending }).limit(filters.pageSize + 1);
  if (error) throw new PimAuditServerError(503, "Gagal memuat riwayat aktivitas.", "AUDIT_QUERY_FAILED");
  const source = records(data);
  const hasMore = source.length > filters.pageSize;
  const rows = source.slice(0, filters.pageSize).map(mapAuditRow);
  const last = rows.at(-1);
  return {
    rows,
    hasMore,
    nextCursor: hasMore && last ? encodeCursor(last.createdAt, last.id, filters.sort) : null,
    pageSize: filters.pageSize,
    timezone: PIM_AUDIT_TIMEZONE,
    summary: summarize(rows)
  };
}

export async function loadPimAuditDetail(client: SupabaseClient, auditId: string): Promise<PimAuditDetail> {
  const id = safeUuid(auditId);
  if (!id) throw new PimAuditServerError(400, "Audit ID tidak valid.", "INVALID_AUDIT_ID");
  const [{ data, error }, changesResult, entitiesResult] = await Promise.all([
    client.from("system_audit_log").select(`${auditSelect()},parent_audit_id,metadata,old_value,new_value`).eq("id", id).not("event_code", "is", null).maybeSingle(),
    client.from("pim_audit_changes").select("field_name,before_value,after_value,before_state,after_state").eq("audit_id", id).order("field_name"),
    client.from("pim_audit_entities").select("entity_type,entity_id,entity_label,product_id,variant_id,sku,result_status,failure_code").eq("audit_id", id).order("created_at").limit(500)
  ]);
  if (error) throw new PimAuditServerError(503, "Gagal memuat detail audit.", "AUDIT_DETAIL_QUERY_FAILED");
  if (!data) throw new PimAuditServerError(404, "Audit tidak ditemukan.", "AUDIT_NOT_FOUND");
  if (changesResult.error || entitiesResult.error) throw new PimAuditServerError(503, "Detail audit belum tersedia.", "AUDIT_CHILD_QUERY_FAILED");
  const row = mapAuditRow(data as Record<string, unknown>);
  return {
    ...row,
    parentAuditId: textOrNull((data as Record<string, unknown>).parent_audit_id),
    metadata: {
      ...record((data as Record<string, unknown>).metadata),
      beforeSummary: (data as Record<string, unknown>).old_value ?? null,
      afterSummary: (data as Record<string, unknown>).new_value ?? null
    },
    changes: records(changesResult.data).map((change) => ({
      field: String(change.field_name || ""),
      beforeValue: change.before_value,
      afterValue: change.after_value,
      beforeState: String(change.before_state || "NULL") as PimAuditChange["beforeState"],
      afterState: String(change.after_state || "NULL") as PimAuditChange["afterState"]
    })),
    entities: records(entitiesResult.data).map((entity) => ({
      entityType: String(entity.entity_type || ""),
      entityId: textOrNull(entity.entity_id),
      entityLabel: textOrNull(entity.entity_label),
      productId: textOrNull(entity.product_id),
      variantId: textOrNull(entity.variant_id),
      sku: textOrNull(entity.sku),
      resultStatus: textOrNull(entity.result_status) as PimAuditStatus | null,
      failureCode: textOrNull(entity.failure_code)
    }))
  };
}

function auditSelect() {
  return "id,event_code,event_version,category,operation_status,created_at,actor_id,actor_role,actor_label,source_module,entity_type,entity_id,entity_label,product_id,variant_id,sku,batch_id,request_id,operation_id,duration_ms,event_summary,failure_code";
}

function mapAuditRow(value: Record<string, unknown>): PimAuditListRow {
  const eventCode = String(value.event_code || "");
  const registry = isPimAuditEventCode(eventCode) ? PIM_AUDIT_EVENT_REGISTRY[eventCode] : null;
  return {
    id: String(value.id || ""),
    eventCode,
    eventVersion: Number(value.event_version || 1),
    category: String(value.category || registry?.category || "SYSTEM"),
    status: String(value.operation_status || "COMPLETED"),
    createdAt: String(value.created_at || ""),
    actorId: textOrNull(value.actor_id),
    actorRole: String(value.actor_role || "system"),
    actorLabel: String(value.actor_label || (value.actor_id ? `Admin ${String(value.actor_id).slice(0, 8)}` : "Sistem")),
    sourceModule: String(value.source_module || registry?.sourceModule || value.source || "System"),
    entityType: String(value.entity_type || "system"),
    entityId: textOrNull(value.entity_id),
    entityLabel: String(value.entity_label || ""),
    productId: textOrNull(value.product_id),
    variantId: textOrNull(value.variant_id),
    sku: textOrNull(value.sku),
    batchId: textOrNull(value.batch_id),
    requestId: textOrNull(value.request_id),
    operationId: textOrNull(value.operation_id),
    durationMs: value.duration_ms === null || value.duration_ms === undefined ? null : Number(value.duration_ms),
    summary: String(value.event_summary || registry?.label || eventCode),
    failureCode: textOrNull(value.failure_code)
  };
}

function summarize(rows: PimAuditListRow[]) {
  return {
    activities: rows.length,
    completed: rows.filter((row) => row.status === "COMPLETED").length,
    failed: rows.filter((row) => row.status === "FAILED" || row.status === "INCOMPLETE").length,
    denied: rows.filter((row) => row.status === "DENIED").length,
    bulk: rows.filter((row) => row.category === "BULK_IMPORT" || row.category === "BULK_EDIT").length
  };
}

async function relatedAuditIds(client: SupabaseClient, field: "product_id" | "variant_id", id: string) {
  const { data, error } = await client.from("pim_audit_entities").select("audit_id").eq(field, id).order("created_at", { ascending: false }).limit(500);
  if (error) throw new PimAuditServerError(503, "Riwayat entity belum dapat dimuat.", "AUDIT_ENTITY_QUERY_FAILED");
  return [...new Set(records(data).map((row) => String(row.audit_id || "")).filter((value) => safeUuid(value)))] as string[];
}

function sanitizeChanges(changes: PimAuditChange[]) {
  return changes.slice(0, 200).filter((change) => /^[A-Za-z0-9_.-]{1,100}$/.test(change.field)).map((change) => ({
    field: change.field,
    beforeValue: change.beforeValue,
    afterValue: change.afterValue,
    beforeState: change.beforeState,
    afterState: change.afterState
  }));
}

function parseDate(value: string | null, fallback: Date, endOfDay: boolean) {
  if (!value) return fallback.toISOString();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw invalidFilter();
  const suffix = endOfDay ? "T23:59:59.999+08:00" : "T00:00:00.000+08:00";
  const parsed = new Date(`${value}${suffix}`);
  if (Number.isNaN(parsed.getTime())) throw invalidFilter();
  return parsed.toISOString();
}

function nullableUuidFilter(value: string | null, label: string) {
  if (!value) return null;
  const parsed = safeUuid(value);
  if (!parsed) throw new PimAuditServerError(400, `${label} tidak valid.`, "INVALID_FILTER");
  return parsed;
}

function parseCursor(value: string | null, sort: "newest" | "oldest") {
  if (!value) return null;
  try {
    const decoded = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as { createdAt?: string; id?: string; sort?: string };
    if (!decoded.createdAt || Number.isNaN(Date.parse(decoded.createdAt)) || !safeUuid(decoded.id) || decoded.sort !== sort) throw new Error("invalid");
    return { createdAt: decoded.createdAt, id: decoded.id };
  } catch {
    throw new PimAuditServerError(400, "Cursor pagination tidak valid.", "INVALID_CURSOR");
  }
}

function encodeCursor(createdAt: string, id: string, sort: "newest" | "oldest") {
  return Buffer.from(JSON.stringify({ createdAt, id, sort })).toString("base64url");
}

function invalidFilter() {
  return new PimAuditServerError(400, "Filter tidak valid.", "INVALID_FILTER");
}

function records(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value as Record<string, unknown>[] : [];
}
function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function textOrNull(value: unknown) {
  return typeof value === "string" && value ? value : null;
}
