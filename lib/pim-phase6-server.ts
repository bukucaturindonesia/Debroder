import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  hashPimPhase6Value,
  mapPimPhase6Snapshot,
  PIM_PHASE6_EXPORT_SCHEMA_VERSION,
  PIM_PHASE6_LIMITS,
  PIM_PHASE6_RULE_SET_VERSION,
  PIM_PHASE6_STORAGE_BUCKET,
  phase6Expiry,
  safePhase6FileName,
  type PimPhase6Filters,
  type PimPhase6Scope,
  type PimPhase6Snapshot
} from "@/lib/pim-phase6";
import type { GeneratedPimFile } from "@/lib/pim-phase6-export";
import { reconciliationRuleRegistry, type PimReconciliationFinding } from "@/lib/pim-reconciliation";

export class PimPhase6ServerError extends Error {
  constructor(public readonly status: number, message: string, public readonly code: string) {
    super(message);
  }
}

export async function loadPimPhase6Snapshot(client: SupabaseClient, actorId: string, scope: PimPhase6Scope): Promise<PimPhase6Snapshot> {
  const scopeHash = hashPimPhase6Value(scope);
  const { data, error } = await client.rpc("pim_phase6_snapshot_v1", {
    p_actor_id: actorId,
    p_scope: scope,
    p_product_limit: PIM_PHASE6_LIMITS.directProducts,
    p_variant_limit: PIM_PHASE6_LIMITS.directVariants
  });
  if (error) {
    const code = phase6RpcCode(error.message);
    throw new PimPhase6ServerError(code === "PIM_PHASE6_PERMISSION_DENIED" ? 403 : 503, "Snapshot PIM tidak dapat dibuat secara konsisten.", code);
  }
  const snapshot = mapPimPhase6Snapshot(data, scope, scopeHash);
  if (!snapshot.productCount) throw new PimPhase6ServerError(422, "Scope tidak mempunyai Product Root.", "EXPORT_SCOPE_EMPTY");
  return snapshot;
}

export async function listPimPhase6Products(input: { client: SupabaseClient; filters: PimPhase6Filters; page: number }) {
  const page = Math.max(1, Math.floor(input.page || 1));
  const from = (page - 1) * PIM_PHASE6_LIMITS.pageSize;
  const to = from + PIM_PHASE6_LIMITS.pageSize - 1;
  let query = input.client.from("products").select("id,name,nama,slug,status,product_category_id,base_price,updated_at", { count: "exact" });
  if (input.filters.status !== "all") query = query.eq("status", input.filters.status);
  if (input.filters.categoryId) query = query.eq("product_category_id", input.filters.categoryId);
  if (input.filters.updatedFrom) query = query.gte("updated_at", input.filters.updatedFrom);
  if (input.filters.updatedTo) query = query.lte("updated_at", input.filters.updatedTo);
  const token = safeSearchToken(input.filters.query);
  if (token) query = query.or(`name.ilike.%${token}%,nama.ilike.%${token}%,slug.ilike.%${token}%,sku.ilike.%${token}%`);
  const { data, error, count } = await query.order("name", { ascending: true }).order("id", { ascending: true }).range(from, to);
  if (error) throw new PimPhase6ServerError(503, "Daftar Product Root belum dapat dimuat.", "RECONCILIATION_SNAPSHOT_FAILED");
  const rows = records(data);
  const categoryIds = [...new Set(rows.map((row) => String(row.product_category_id || "")).filter(Boolean))];
  const categoryMap = new Map<string, string>();
  if (categoryIds.length) {
    const categoryResult = await input.client.from("product_categories").select("id,name").in("id", categoryIds);
    if (categoryResult.error) throw new PimPhase6ServerError(503, "Kategori PIM belum dapat dimuat.", "RECONCILIATION_SNAPSHOT_FAILED");
    for (const row of records(categoryResult.data)) categoryMap.set(String(row.id), String(row.name || ""));
  }
  return {
    page,
    pageSize: PIM_PHASE6_LIMITS.pageSize,
    total: Number(count || 0),
    rows: rows.map((row) => ({
      id: String(row.id),
      name: String(row.name || row.nama || "Produk"),
      slug: String(row.slug || ""),
      status: String(row.status || "draft"),
      categoryId: row.product_category_id ? String(row.product_category_id) : null,
      categoryName: categoryMap.get(String(row.product_category_id || "")) || "—",
      basePrice: finiteNumber(row.base_price),
      updatedAt: row.updated_at ? String(row.updated_at) : null
    }))
  };
}

export async function loadPimPhase6Config(client: SupabaseClient, actorId: string, role: string) {
  await cleanupExpiredPimPhase6Files(client);
  const [categoriesResult, jobsResult, runsResult] = await Promise.all([
    client.from("product_categories").select("id,name,slug,is_active,status").order("sort_order"),
    client.from("pim_export_jobs").select("id,actor_role,job_kind,format,scope,scope_hash,schema_version,status,product_count,variant_count,file_name,file_size,file_sha256,created_at,completed_at,expires_at,failure_code").eq("actor_id", actorId).order("created_at", { ascending: false }).limit(20),
    client.from("pim_reconciliation_runs").select("id,scope,scope_hash,snapshot_at,rule_set_version,status,completeness,product_count,variant_count,applicable_rule_count,executed_rule_count,failed_rule_count,pass_count,warning_count,error_count,total_findings,new_findings,existing_findings,resolved_findings,started_at,completed_at,duration_ms,failure_code").eq("actor_id", actorId).order("started_at", { ascending: false }).limit(20)
  ]);
  if (categoriesResult.error) throw new PimPhase6ServerError(503, "Kategori PIM belum dapat dimuat.", "RECONCILIATION_SNAPSHOT_FAILED");
  return {
    role,
    readOnlyBusinessData: true,
    schemaVersion: PIM_PHASE6_EXPORT_SCHEMA_VERSION,
    ruleSetVersion: PIM_PHASE6_RULE_SET_VERSION,
    limits: PIM_PHASE6_LIMITS,
    backgroundAvailable: false,
    ruleCodes: reconciliationRuleRegistry().map((rule) => rule.code),
    ruleApplicabilities: [...new Set(reconciliationRuleRegistry().map((rule) => rule.appliesTo))].sort(),
    categories: records(categoriesResult.data).filter((row) => row.is_active !== false && row.status !== "inactive").map((row) => ({ id: String(row.id), name: String(row.name), slug: String(row.slug) })),
    exportHistoryAvailable: !jobsResult.error,
    exportHistory: records(jobsResult.data).map(mapExportJob),
    runHistoryAvailable: !runsResult.error,
    runHistory: records(runsResult.data).map(mapRun)
  };
}

export async function storePimPhase6File(input: {
  client: SupabaseClient;
  actorId: string;
  actorRole: string;
  idempotencyToken: string;
  requestIdentity: unknown;
  jobKind: "product_export" | "reconciliation_report";
  format: "xlsx" | "csv";
  scope: unknown;
  scopeHash: string;
  snapshotAt: string;
  productCount: number;
  variantCount: number;
  schemaVersion: string;
  generate: (jobId: string) => Promise<GeneratedPimFile>;
}) {
  const token = normalizeIdempotencyToken(input.idempotencyToken);
  const idempotencyKey = hashPimPhase6Value({ actorId: input.actorId, token });
  const requestHash = hashPimPhase6Value(input.requestIdentity);
  const expiresAt = phase6Expiry();
  const insertResult = await input.client.from("pim_export_jobs").insert({
    actor_id: input.actorId,
    actor_role: input.actorRole,
    job_kind: input.jobKind,
    format: input.format,
    idempotency_key: idempotencyKey,
    request_hash: requestHash,
    scope: input.scope,
    scope_hash: input.scopeHash,
    schema_version: input.schemaVersion,
    status: "PROCESSING",
    snapshot_at: input.snapshotAt,
    product_count: input.productCount,
    variant_count: input.variantCount,
    expires_at: expiresAt
  }).select("id,actor_role,job_kind,format,scope,scope_hash,schema_version,request_hash,status,product_count,variant_count,file_name,file_size,file_sha256,created_at,completed_at,expires_at,failure_code").maybeSingle();

  if (insertResult.error || !insertResult.data) {
    const existing = await input.client.from("pim_export_jobs").select("id,actor_role,job_kind,format,scope,scope_hash,schema_version,request_hash,status,product_count,variant_count,file_name,file_size,file_sha256,created_at,completed_at,expires_at,failure_code").eq("idempotency_key", idempotencyKey).maybeSingle();
    if (existing.error || !existing.data) throw new PimPhase6ServerError(503, "Metadata export tidak dapat dibuat.", "EXPORT_GENERATION_FAILED");
    if (String(existing.data.request_hash) !== requestHash) throw new PimPhase6ServerError(409, "Idempotency token telah digunakan untuk request berbeda.", "JOB_IDEMPOTENCY_CONFLICT");
    return { replayed: true, job: mapExportJob(existing.data) };
  }

  const jobId = String(insertResult.data.id);
  try {
    const generated = await input.generate(jobId);
    if (!generated.bytes.byteLength || generated.bytes.byteLength > PIM_PHASE6_LIMITS.maximumFileBytes) throw new PimPhase6ServerError(413, "Ukuran hasil export melebihi batas direct export.", "EXPORT_LIMIT_EXCEEDED");
    const fileName = safePhase6FileName(generated.fileName);
    const storagePath = `${input.actorId}/${jobId}/${fileName}`;
    const upload = await input.client.storage.from(PIM_PHASE6_STORAGE_BUCKET).upload(storagePath, generated.bytes, { contentType: generated.mimeType, upsert: false });
    if (upload.error) throw new PimPhase6ServerError(503, "File export tidak dapat disimpan ke private storage.", "STORAGE_WRITE_FAILED");
    const fileSha256 = createHash("sha256").update(generated.bytes).digest("hex");
    const completedAt = new Date().toISOString();
    const updated = await input.client.from("pim_export_jobs").update({
      status: "COMPLETED",
      file_bucket: PIM_PHASE6_STORAGE_BUCKET,
      file_path: storagePath,
      file_name: fileName,
      file_mime: generated.mimeType,
      file_size: generated.bytes.byteLength,
      file_sha256: fileSha256,
      completed_at: completedAt,
      duration_ms: Math.max(0, Date.now() - new Date(String(insertResult.data.created_at)).getTime())
    }).eq("id", jobId).eq("actor_id", input.actorId).select("id,actor_role,job_kind,format,scope,scope_hash,schema_version,status,product_count,variant_count,file_name,file_size,file_sha256,created_at,completed_at,expires_at,failure_code").single();
    if (updated.error) throw new PimPhase6ServerError(503, "Metadata integrity export tidak dapat disimpan.", "EXPORT_INTEGRITY_FAILED");
    return { replayed: false, job: mapExportJob(updated.data) };
  } catch (error) {
    await input.client.from("pim_export_jobs").update({ status: "FAILED", failure_code: error instanceof PimPhase6ServerError ? error.code : "EXPORT_GENERATION_FAILED", completed_at: new Date().toISOString() }).eq("id", jobId).eq("actor_id", input.actorId);
    throw error;
  }
}

export async function claimPimReconciliationRun(input: { client: SupabaseClient; actorId: string; actorRole: string; idempotencyToken: string; scope: PimPhase6Scope; scopeHash: string; snapshotAt: string; productCount: number; variantCount: number }) {
  const token = normalizeIdempotencyToken(input.idempotencyToken);
  const idempotencyKey = hashPimPhase6Value({ actorId: input.actorId, token });
  const requestHash = hashPimPhase6Value({ scope: input.scope, ruleSetVersion: PIM_PHASE6_RULE_SET_VERSION });
  const result = await input.client.from("pim_reconciliation_runs").insert({
    actor_id: input.actorId,
    actor_role: input.actorRole,
    idempotency_key: idempotencyKey,
    request_hash: requestHash,
    scope: input.scope,
    scope_hash: input.scopeHash,
    snapshot_at: input.snapshotAt,
    rule_set_version: PIM_PHASE6_RULE_SET_VERSION,
    status: "INCOMPLETE",
    completeness: "INCOMPLETE",
    product_count: input.productCount,
    variant_count: input.variantCount
  }).select("id,started_at").maybeSingle();
  if (!result.error && result.data) return { replayed: false, runId: String(result.data.id), startedAt: String(result.data.started_at) };
  const existing = await input.client.from("pim_reconciliation_runs").select("id,request_hash,status,completeness,started_at,completed_at").eq("idempotency_key", idempotencyKey).maybeSingle();
  if (existing.error || !existing.data) throw new PimPhase6ServerError(503, "Metadata reconciliation tidak dapat dibuat.", "RECONCILIATION_INCOMPLETE");
  if (String(existing.data.request_hash) !== requestHash) throw new PimPhase6ServerError(409, "Idempotency token telah digunakan untuk scope berbeda.", "JOB_IDEMPOTENCY_CONFLICT");
  return { replayed: true, runId: String(existing.data.id), startedAt: String(existing.data.started_at) };
}

export async function loadPreviousComparableFindings(client: SupabaseClient, actorId: string, scopeHash: string, excludeRunId: string) {
  const previous = await client.from("pim_reconciliation_runs").select("id").eq("actor_id", actorId).eq("scope_hash", scopeHash).eq("rule_set_version", PIM_PHASE6_RULE_SET_VERSION).eq("completeness", "COMPLETE").neq("id", excludeRunId).order("completed_at", { ascending: false }).limit(1).maybeSingle();
  if (previous.error || !previous.data) return { comparable: false, findings: [] as PimReconciliationFinding[] };
  const findings = await client.from("pim_reconciliation_findings").select("fingerprint,issue_code,rule_version,severity,lifecycle_status,product_id,product_name,product_category_id,category_name,product_status,variant_id,sku,field,current_value,value_state,message,recommendation,detected_at,source_level,editor_destination,evaluation_status,rule_applies_to").eq("run_id", previous.data.id).neq("lifecycle_status", "RESOLVED");
  if (findings.error) return { comparable: false, findings: [] as PimReconciliationFinding[] };
  return { comparable: true, findings: records(findings.data).map(mapFinding) };
}

export async function savePimReconciliationResult(input: { client: SupabaseClient; actorId: string; runId: string; startedAt: string; result: { status: string; completeness: string; findings: PimReconciliationFinding[]; summary: Record<string, number> } }) {
  const findingRows = input.result.findings.map((finding) => ({
    run_id: input.runId,
    fingerprint: finding.fingerprint,
    issue_code: finding.issueCode,
    rule_version: finding.ruleVersion,
    severity: finding.severity,
    lifecycle_status: finding.lifecycle,
    product_id: finding.productId,
    product_name: finding.productName,
    product_category_id: finding.categoryId,
    category_name: finding.categoryName,
    product_status: finding.productStatus,
    variant_id: finding.variantId,
    sku: finding.sku,
    field: finding.field,
    current_value: finding.currentValue,
    value_state: finding.valueState,
    message: finding.message,
    recommendation: finding.recommendation,
    detected_at: finding.detectedAt,
    source_level: finding.sourceLevel,
    editor_destination: finding.editorDestination,
    evaluation_status: finding.evaluationStatus,
    rule_applies_to: finding.ruleAppliesTo
  }));
  if (findingRows.length) {
    const insert = await input.client.from("pim_reconciliation_findings").insert(findingRows);
    if (insert.error) throw new PimPhase6ServerError(503, "Finding reconciliation tidak dapat disimpan lengkap.", "RECONCILIATION_INCOMPLETE");
  }
  const completedAt = new Date().toISOString();
  const update = await input.client.from("pim_reconciliation_runs").update({
    status: input.result.status,
    completeness: input.result.completeness,
    applicable_rule_count: input.result.summary.applicableRuleCount || 0,
    executed_rule_count: input.result.summary.executedRuleCount || 0,
    failed_rule_count: input.result.summary.failedRuleCount || 0,
    pass_count: input.result.summary.passCount || 0,
    warning_count: input.result.summary.warningCount || 0,
    error_count: input.result.summary.errorCount || 0,
    total_findings: input.result.summary.totalFindings || 0,
    new_findings: input.result.summary.newFindings || 0,
    existing_findings: input.result.summary.existingFindings || 0,
    resolved_findings: input.result.summary.resolvedFindings || 0,
    completed_at: completedAt,
    duration_ms: Math.max(0, Date.now() - new Date(input.startedAt).getTime())
  }).eq("id", input.runId).eq("actor_id", input.actorId);
  if (update.error) throw new PimPhase6ServerError(503, "Summary reconciliation tidak dapat disimpan.", "RECONCILIATION_INCOMPLETE");
}

export async function failPimReconciliationRun(input: { client: SupabaseClient; actorId: string; runId: string; startedAt: string; failureCode: string }) {
  await input.client.from("pim_reconciliation_runs").update({
    status: "INCOMPLETE",
    completeness: "INCOMPLETE",
    failure_code: input.failureCode.slice(0, 100),
    completed_at: new Date().toISOString(),
    duration_ms: Math.max(0, Date.now() - new Date(input.startedAt).getTime())
  }).eq("id", input.runId).eq("actor_id", input.actorId);
}

export async function loadPimReconciliationRun(client: SupabaseClient, actorId: string, runId: string) {
  const run = await client.from("pim_reconciliation_runs").select("id,actor_id,actor_role,scope,scope_hash,snapshot_at,rule_set_version,status,completeness,product_count,variant_count,applicable_rule_count,executed_rule_count,failed_rule_count,pass_count,warning_count,error_count,total_findings,new_findings,existing_findings,resolved_findings,started_at,completed_at,duration_ms,failure_code").eq("id", runId).eq("actor_id", actorId).maybeSingle();
  if (run.error || !run.data) throw new PimPhase6ServerError(404, "Reconciliation run tidak ditemukan.", "RECONCILIATION_RUN_NOT_FOUND");
  return mapRun(run.data);
}

export async function listPimReconciliationFindings(input: { client: SupabaseClient; actorId: string; runId: string; page: number; severity?: string; issueCode?: string; lifecycle?: string; categoryId?: string; productStatus?: string; productId?: string; variantId?: string; sku?: string; applicability?: string; query?: string }) {
  await loadPimReconciliationRun(input.client, input.actorId, input.runId);
  const page = Math.max(1, Math.floor(input.page || 1));
  const from = (page - 1) * PIM_PHASE6_LIMITS.findingPageSize;
  const to = from + PIM_PHASE6_LIMITS.findingPageSize - 1;
  let query = input.client.from("pim_reconciliation_findings").select("fingerprint,issue_code,rule_version,severity,lifecycle_status,product_id,product_name,product_category_id,category_name,product_status,variant_id,sku,field,current_value,value_state,message,recommendation,detected_at,source_level,editor_destination,evaluation_status,rule_applies_to", { count: "exact" }).eq("run_id", input.runId);
  if (["WARNING", "ERROR"].includes(input.severity || "")) query = query.eq("severity", input.severity);
  if (input.issueCode) query = query.eq("issue_code", input.issueCode.slice(0, 100));
  if (["NEW", "EXISTING", "RESOLVED", "NOT_EVALUATED"].includes(input.lifecycle || "")) query = query.eq("lifecycle_status", input.lifecycle);
  if (uuid(input.categoryId)) query = query.eq("product_category_id", input.categoryId);
  if (["draft", "active", "archived"].includes(input.productStatus || "")) query = query.eq("product_status", input.productStatus);
  if (uuid(input.productId)) query = query.eq("product_id", input.productId);
  if (uuid(input.variantId)) query = query.eq("variant_id", input.variantId);
  if (input.sku) query = query.eq("sku", input.sku.trim().slice(0, 120));
  if (input.applicability) query = query.eq("rule_applies_to", input.applicability.trim().slice(0, 100));
  const token = safeSearchToken(input.query || "");
  if (token) query = query.or(`product_name.ilike.%${token}%,sku.ilike.%${token}%,issue_code.ilike.%${token}%`);
  const result = await query.order("severity", { ascending: true }).order("issue_code", { ascending: true }).order("product_name", { ascending: true }).range(from, to);
  if (result.error) throw new PimPhase6ServerError(503, "Finding reconciliation belum dapat dimuat.", "RECONCILIATION_INCOMPLETE");
  return { page, pageSize: PIM_PHASE6_LIMITS.findingPageSize, total: Number(result.count || 0), rows: records(result.data).map(mapFinding) };
}

export async function loadAllPimReconciliationFindings(client: SupabaseClient, actorId: string, runId: string) {
  await loadPimReconciliationRun(client, actorId, runId);
  const result = await client.from("pim_reconciliation_findings").select("fingerprint,issue_code,rule_version,severity,lifecycle_status,product_id,product_name,product_category_id,category_name,product_status,variant_id,sku,field,current_value,value_state,message,recommendation,detected_at,source_level,editor_destination,evaluation_status,rule_applies_to").eq("run_id", runId).order("severity").order("issue_code").order("product_name").order("sku").order("fingerprint");
  if (result.error) throw new PimPhase6ServerError(503, "Finding report belum dapat dimuat.", "RECONCILIATION_REPORT_FAILED");
  return records(result.data).map(mapFinding);
}

export async function cleanupExpiredPimPhase6Files(client: SupabaseClient) {
  const now = new Date().toISOString();
  const stale = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  await client.from("pim_export_jobs").update({ status: "FAILED", failure_code: "EXPORT_GENERATION_FAILED", completed_at: now }).eq("status", "PROCESSING").lt("created_at", stale);
  const expired = await client.from("pim_export_jobs").select("id,file_bucket,file_path").eq("status", "COMPLETED").lt("expires_at", now).limit(PIM_PHASE6_LIMITS.cleanupBatchSize);
  if (expired.error) return;
  const rows = records(expired.data);
  const byBucket = new Map<string, { paths: string[]; ids: string[] }>();
  for (const row of rows) {
    const bucket = String(row.file_bucket || "");
    const path = String(row.file_path || "");
    if (!bucket || !path) continue;
    const group = byBucket.get(bucket) || { paths: [], ids: [] };
    group.paths.push(path);
    group.ids.push(String(row.id));
    byBucket.set(bucket, group);
  }
  const removedIds: string[] = [];
  for (const [bucket, group] of byBucket) {
    const removed = await client.storage.from(bucket).remove(group.paths);
    if (!removed.error) removedIds.push(...group.ids);
  }
  if (removedIds.length) await client.from("pim_export_jobs").update({ status: "EXPIRED" }).in("id", removedIds);
}

export async function loadOwnedPimPhase6File(client: SupabaseClient, actorId: string, jobId: string) {
  await cleanupExpiredPimPhase6Files(client);
  const result = await client.from("pim_export_jobs").select("id,actor_id,job_kind,status,file_bucket,file_path,file_name,file_mime,file_size,file_sha256,expires_at").eq("id", jobId).eq("actor_id", actorId).maybeSingle();
  if (result.error || !result.data) throw new PimPhase6ServerError(404, "File export tidak ditemukan.", "EXPORT_JOB_NOT_FOUND");
  if (String(result.data.status) === "EXPIRED" || new Date(String(result.data.expires_at)).getTime() <= Date.now()) throw new PimPhase6ServerError(410, "File export sudah kedaluwarsa.", "EXPORT_JOB_EXPIRED");
  if (String(result.data.status) !== "COMPLETED" || !result.data.file_bucket || !result.data.file_path) throw new PimPhase6ServerError(409, "File export belum tersedia.", "EXPORT_FILE_MISSING");
  const download = await client.storage.from(String(result.data.file_bucket)).download(String(result.data.file_path));
  if (download.error || !download.data) throw new PimPhase6ServerError(404, "File private tidak ditemukan.", "STORAGE_READ_FAILED");
  const bytes = new Uint8Array(await download.data.arrayBuffer());
  const actualHash = createHash("sha256").update(bytes).digest("hex");
  if (actualHash !== String(result.data.file_sha256 || "")) throw new PimPhase6ServerError(409, "Integritas file export gagal diverifikasi.", "EXPORT_INTEGRITY_FAILED");
  return { bytes, fileName: safePhase6FileName(String(result.data.file_name)), mimeType: String(result.data.file_mime), fileSize: Number(result.data.file_size || bytes.byteLength), sha256: actualHash, jobKind: String(result.data.job_kind || "product_export") };
}

export function phase6ScopeLabel(scope: PimPhase6Scope) {
  const labels: Record<PimPhase6Scope["kind"], string> = {
    selected: "Selected Products",
    current_page: "Current Page Selection",
    all_matching: "All Matching Current Filters",
    category: "Category",
    status: "Product Status",
    updated_range: "Updated Date Range",
    full: "Full PIM"
  };
  return labels[scope.kind];
}

function normalizeIdempotencyToken(value: string) {
  const token = value.trim();
  if (!/^[A-Za-z0-9_-]{16,120}$/.test(token)) throw new PimPhase6ServerError(400, "Idempotency token tidak valid.", "JOB_IDEMPOTENCY_CONFLICT");
  return token;
}

function mapExportJob(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    actorRole: String(row.actor_role || ""),
    jobKind: String(row.job_kind || "product_export"),
    format: String(row.format || ""),
    scope: row.scope,
    scopeHash: String(row.scope_hash || ""),
    schemaVersion: String(row.schema_version || ""),
    status: String(row.status || ""),
    productCount: Number(row.product_count || 0),
    variantCount: Number(row.variant_count || 0),
    fileName: row.file_name ? String(row.file_name) : null,
    fileSize: row.file_size === null || row.file_size === undefined ? null : Number(row.file_size),
    fileSha256: row.file_sha256 ? String(row.file_sha256) : null,
    createdAt: row.created_at ? String(row.created_at) : null,
    completedAt: row.completed_at ? String(row.completed_at) : null,
    expiresAt: row.expires_at ? String(row.expires_at) : null,
    failureCode: row.failure_code ? String(row.failure_code) : null
  };
}

function mapRun(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    actorRole: String(row.actor_role || ""),
    scope: row.scope,
    scopeHash: String(row.scope_hash || ""),
    snapshotAt: row.snapshot_at ? String(row.snapshot_at) : null,
    ruleSetVersion: String(row.rule_set_version || ""),
    status: String(row.status || "INCOMPLETE"),
    completeness: String(row.completeness || "INCOMPLETE"),
    productCount: Number(row.product_count || 0),
    variantCount: Number(row.variant_count || 0),
    applicableRuleCount: Number(row.applicable_rule_count || 0),
    executedRuleCount: Number(row.executed_rule_count || 0),
    failedRuleCount: Number(row.failed_rule_count || 0),
    passCount: Number(row.pass_count || 0),
    warningCount: Number(row.warning_count || 0),
    errorCount: Number(row.error_count || 0),
    totalFindings: Number(row.total_findings || 0),
    newFindings: Number(row.new_findings || 0),
    existingFindings: Number(row.existing_findings || 0),
    resolvedFindings: Number(row.resolved_findings || 0),
    startedAt: row.started_at ? String(row.started_at) : null,
    completedAt: row.completed_at ? String(row.completed_at) : null,
    durationMs: row.duration_ms === null || row.duration_ms === undefined ? null : Number(row.duration_ms),
    failureCode: row.failure_code ? String(row.failure_code) : null
  };
}

function mapFinding(row: Record<string, unknown>): PimReconciliationFinding {
  return {
    fingerprint: String(row.fingerprint),
    issueCode: String(row.issue_code),
    ruleVersion: String(row.rule_version),
    severity: row.severity === "WARNING" ? "WARNING" : "ERROR",
    lifecycle: ["NEW", "EXISTING", "RESOLVED", "NOT_EVALUATED"].includes(String(row.lifecycle_status)) ? String(row.lifecycle_status) as PimReconciliationFinding["lifecycle"] : "NOT_EVALUATED",
    productId: String(row.product_id),
    productName: String(row.product_name || "Produk"),
    categoryId: row.product_category_id ? String(row.product_category_id) : null,
    categoryName: String(row.category_name || ""),
    productStatus: String(row.product_status || ""),
    variantId: row.variant_id ? String(row.variant_id) : null,
    sku: row.sku ? String(row.sku) : null,
    field: String(row.field),
    currentValue: scalarValue(row.current_value),
    valueState: ["VALUE", "ZERO", "NULL", "EMPTY", "NOT_APPLICABLE"].includes(String(row.value_state)) ? String(row.value_state) as PimReconciliationFinding["valueState"] : "VALUE",
    message: String(row.message),
    recommendation: String(row.recommendation),
    detectedAt: String(row.detected_at),
    sourceLevel: ["PRODUCT_ROOT", "PRODUCT_COLOR", "PRODUCT_VARIANT", "DERIVED_READ_ONLY"].includes(String(row.source_level)) ? String(row.source_level) as PimReconciliationFinding["sourceLevel"] : "DERIVED_READ_ONLY",
    editorDestination: row.editor_destination === "/admin/products/bulk-edit" ? "/admin/products/bulk-edit" : "/admin/products",
    evaluationStatus: ["EVALUATED", "NOT_APPLICABLE", "SKIPPED", "FAILED"].includes(String(row.evaluation_status)) ? String(row.evaluation_status) as PimReconciliationFinding["evaluationStatus"] : "FAILED",
    ruleAppliesTo: String(row.rule_applies_to || "")
  };
}

function uuid(value: string | undefined) {
  const source = value || "";
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(source) ? source : null;
}

function scalarValue(value: unknown): string | number | boolean | null {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value) && value.length === 1) return scalarValue(value[0]);
  return JSON.stringify(value);
}

function phase6RpcCode(message: string) {
  return ["PIM_PHASE6_PERMISSION_DENIED", "PIM_PHASE6_INVALID_SCOPE", "PIM_PHASE6_LIMIT_INVALID"].find((code) => message.includes(code)) || "EXPORT_SNAPSHOT_FAILED";
}

function safeSearchToken(value: string) {
  return value.replace(/[,().:%_*]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

function finiteNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function records(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === "object") as Record<string, unknown>[] : [];
}
