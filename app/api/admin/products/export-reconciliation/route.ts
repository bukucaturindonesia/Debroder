import { NextResponse } from "next/server";
import type { AdminRole } from "@/lib/access-control";
import {
  emptyPimPhase6Filters,
  hashPimPhase6Value,
  normalizePimPhase6Scope,
  PIM_PHASE6_EXPORT_SCHEMA_VERSION,
  PIM_PHASE6_REPORT_SCHEMA_VERSION,
  PIM_PHASE6_RULE_SET_VERSION,
  stablePimPhase6Json,
  type PimPhase6Filters,
  type PimPhase6Format
} from "@/lib/pim-phase6";
import { generatePimProductExport, generatePimReconciliationReport } from "@/lib/pim-phase6-export";
import {
  claimPimReconciliationRun,
  failPimReconciliationRun,
  listPimPhase6Products,
  listPimReconciliationFindings,
  loadAllPimReconciliationFindings,
  loadPimPhase6Config,
  loadPimPhase6Snapshot,
  loadPimReconciliationRun,
  loadPreviousComparableFindings,
  phase6ScopeLabel,
  PimPhase6ServerError,
  savePimReconciliationResult,
  storePimPhase6File
} from "@/lib/pim-phase6-server";
import { evaluatePimReconciliation } from "@/lib/pim-reconciliation";
import { PRODUCT_MANAGER_ROLES } from "@/lib/product-manager";
import { Phase13AuthError, requirePhase13Actor } from "@/lib/phase13-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const actor = await requirePimPhase6Actor(request);
    const url = new URL(request.url);
    const view = url.searchParams.get("view") || "config";
    if (view === "products") {
      const filters = filtersFromUrl(url);
      const page = Math.max(1, Number(url.searchParams.get("page") || 1));
      return noStoreJson(await listPimPhase6Products({ client: actor.adminClient, filters, page }));
    }
    if (view === "findings") {
      const runId = uuid(url.searchParams.get("runId"));
      if (!runId) throw new PimPhase6ServerError(400, "Run ID tidak valid.", "RECONCILIATION_RUN_NOT_FOUND");
      return noStoreJson(await listPimReconciliationFindings({
        client: actor.adminClient,
        actorId: actor.user.id,
        runId,
        page: Math.max(1, Number(url.searchParams.get("page") || 1)),
        severity: url.searchParams.get("severity") || undefined,
        issueCode: url.searchParams.get("issueCode") || undefined,
        lifecycle: url.searchParams.get("lifecycle") || undefined,
        categoryId: url.searchParams.get("categoryId") || undefined,
        productStatus: url.searchParams.get("productStatus") || undefined,
        productId: url.searchParams.get("productId") || undefined,
        variantId: url.searchParams.get("variantId") || undefined,
        sku: url.searchParams.get("sku") || undefined,
        applicability: url.searchParams.get("applicability") || undefined,
        query: url.searchParams.get("query") || undefined
      }));
    }
    return noStoreJson(await loadPimPhase6Config(actor.adminClient, actor.user.id, actor.role));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 128 * 1024) throw new PimPhase6ServerError(413, "Payload Phase 6 terlalu besar.", "EXPORT_LIMIT_EXCEEDED");
    const actor = await requirePimPhase6Actor(request);
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body) throw new PimPhase6ServerError(400, "Payload Phase 6 tidak valid.", "EXPORT_GENERATION_FAILED");
    const action = String(body.action || "");

    if (action === "report") return noStoreJson(await createReport(actor, body));

    const scope = normalizePimPhase6Scope(body.scope);
    if (!scope) throw new PimPhase6ServerError(400, "Scope export/reconciliation tidak valid.", action === "reconcile" ? "RECONCILIATION_SCOPE_EMPTY" : "EXPORT_SCOPE_EMPTY");
    const snapshot = await loadPimPhase6Snapshot(actor.adminClient, actor.user.id, scope);
    const directAvailable = !snapshot.productLimitExceeded && !snapshot.variantLimitExceeded;

    if (action === "estimate") {
      return noStoreJson({
        scope,
        scopeLabel: phase6ScopeLabel(scope),
        scopeHash: snapshot.scopeHash,
        snapshotAt: snapshot.snapshotAt,
        productCount: snapshot.productCount,
        variantCount: snapshot.variantCount,
        mode: directAvailable ? "DIRECT" : "BLOCKED_BACKGROUND_UNAVAILABLE",
        schemaVersion: PIM_PHASE6_EXPORT_SCHEMA_VERSION,
        ruleSetVersion: PIM_PHASE6_RULE_SET_VERSION
      });
    }

    if (!directAvailable) {
      const code = action === "reconcile" ? "RECONCILIATION_LIMIT_EXCEEDED" : "EXPORT_BACKGROUND_UNAVAILABLE";
      throw new PimPhase6ServerError(413, "Scope melebihi batas direct processing. Persempit scope; background runner belum tersedia.", code);
    }

    if (action === "export") return noStoreJson(await createExport(actor, body, scope, snapshot));
    if (action === "reconcile") return noStoreJson(await createReconciliation(actor, body, scope, snapshot));
    throw new PimPhase6ServerError(400, "Action Phase 6 tidak valid.", "EXPORT_GENERATION_FAILED");
  } catch (error) {
    return errorResponse(error);
  }
}

async function createExport(actor: Awaited<ReturnType<typeof requirePimPhase6Actor>>, body: Record<string, unknown>, scope: NonNullable<ReturnType<typeof normalizePimPhase6Scope>>, snapshot: Awaited<ReturnType<typeof loadPimPhase6Snapshot>>) {
  const format = fileFormat(body.format);
  const idempotencyToken = String(body.idempotencyToken || "");
  const generatedAt = new Date().toISOString();
  const scopeLabel = phase6ScopeLabel(scope);
  const stored = await storePimPhase6File({
    client: actor.adminClient,
    actorId: actor.user.id,
    actorRole: actor.role,
    idempotencyToken,
    requestIdentity: { kind: "product_export", scope, format, schemaVersion: PIM_PHASE6_EXPORT_SCHEMA_VERSION },
    jobKind: "product_export",
    format,
    scope,
    scopeHash: snapshot.scopeHash,
    snapshotAt: snapshot.snapshotAt,
    productCount: snapshot.productCount,
    variantCount: snapshot.variantCount,
    schemaVersion: PIM_PHASE6_EXPORT_SCHEMA_VERSION,
    generate: (jobId) => generatePimProductExport(format, snapshot, {
      exportId: jobId,
      generatedAt,
      generatedBy: actor.user.id,
      generatedByRole: actor.role,
      sourceEnvironment: safeEnvironment(),
      scopeLabel,
      filterSummary: stablePimPhase6Json(scope.filters),
      filterHash: snapshot.scopeHash
    })
  });
  return { ...stored, downloadPath: stored.job.status === "COMPLETED" ? `/api/admin/products/export-reconciliation/download/${stored.job.id}` : null };
}

async function createReconciliation(actor: Awaited<ReturnType<typeof requirePimPhase6Actor>>, body: Record<string, unknown>, scope: NonNullable<ReturnType<typeof normalizePimPhase6Scope>>, snapshot: Awaited<ReturnType<typeof loadPimPhase6Snapshot>>) {
  const claim = await claimPimReconciliationRun({
    client: actor.adminClient,
    actorId: actor.user.id,
    actorRole: actor.role,
    idempotencyToken: String(body.idempotencyToken || ""),
    scope,
    scopeHash: snapshot.scopeHash,
    snapshotAt: snapshot.snapshotAt,
    productCount: snapshot.productCount,
    variantCount: snapshot.variantCount
  });
  if (claim.replayed) {
    const run = await loadPimReconciliationRun(actor.adminClient, actor.user.id, claim.runId);
    const findings = await listPimReconciliationFindings({ client: actor.adminClient, actorId: actor.user.id, runId: claim.runId, page: 1 });
    return { replayed: true, run, findings };
  }
  try {
    const previous = await loadPreviousComparableFindings(actor.adminClient, actor.user.id, snapshot.scopeHash, claim.runId);
    const result = evaluatePimReconciliation(snapshot, previous.findings, previous.comparable);
    await savePimReconciliationResult({ client: actor.adminClient, actorId: actor.user.id, runId: claim.runId, startedAt: claim.startedAt, result });
    const run = await loadPimReconciliationRun(actor.adminClient, actor.user.id, claim.runId);
    return { replayed: false, run, findings: { page: 1, pageSize: 50, total: result.findings.length, rows: result.findings.slice(0, 50) } };
  } catch (error) {
    await failPimReconciliationRun({ client: actor.adminClient, actorId: actor.user.id, runId: claim.runId, startedAt: claim.startedAt, failureCode: error instanceof PimPhase6ServerError ? error.code : "RECONCILIATION_RULE_FAILED" });
    throw error;
  }
}

async function createReport(actor: Awaited<ReturnType<typeof requirePimPhase6Actor>>, body: Record<string, unknown>) {
  const runId = uuid(body.runId);
  if (!runId) throw new PimPhase6ServerError(400, "Run ID tidak valid.", "RECONCILIATION_RUN_NOT_FOUND");
  const format = fileFormat(body.format);
  const [run, findings] = await Promise.all([
    loadPimReconciliationRun(actor.adminClient, actor.user.id, runId),
    loadAllPimReconciliationFindings(actor.adminClient, actor.user.id, runId)
  ]);
  if (run.completeness !== "COMPLETE") throw new PimPhase6ServerError(409, "Report tidak dapat dibuat dari run INCOMPLETE.", "RECONCILIATION_REPORT_FAILED");
  const scope = normalizePimPhase6Scope(run.scope);
  if (!scope) throw new PimPhase6ServerError(409, "Scope run tidak dapat diverifikasi.", "RECONCILIATION_REPORT_FAILED");
  const generatedAt = new Date().toISOString();
  const stored = await storePimPhase6File({
    client: actor.adminClient,
    actorId: actor.user.id,
    actorRole: actor.role,
    idempotencyToken: String(body.idempotencyToken || ""),
    requestIdentity: { kind: "reconciliation_report", runId, format, schemaVersion: PIM_PHASE6_REPORT_SCHEMA_VERSION },
    jobKind: "reconciliation_report",
    format,
    scope,
    scopeHash: run.scopeHash,
    snapshotAt: run.snapshotAt || generatedAt,
    productCount: run.productCount,
    variantCount: run.variantCount,
    schemaVersion: PIM_PHASE6_REPORT_SCHEMA_VERSION,
    generate: () => generatePimReconciliationReport(format, {
      runId,
      generatedAt,
      generatedBy: actor.user.id,
      generatedByRole: actor.role,
      scopeLabel: phase6ScopeLabel(scope),
      scopeHash: run.scopeHash,
      snapshotAt: run.snapshotAt || generatedAt,
      ruleSetVersion: run.ruleSetVersion,
      overallStatus: run.status as "PASS" | "WARNING" | "ERROR" | "INCOMPLETE",
      completeness: run.completeness as "COMPLETE" | "INCOMPLETE",
      productCount: run.productCount,
      variantCount: run.variantCount,
      findings
    })
  });
  return { ...stored, downloadPath: stored.job.status === "COMPLETED" ? `/api/admin/products/export-reconciliation/download/${stored.job.id}` : null };
}

async function requirePimPhase6Actor(request: Request) {
  const authRequest = request.method === "GET" ? request : new Request(request.url, { method: "GET", headers: request.headers });
  const actor = await requirePhase13Actor(authRequest);
  if (!PRODUCT_MANAGER_ROLES.includes(actor.role as AdminRole)) throw new Phase13AuthError(403, "Role ini tidak memiliki akses Product Manager.");
  return actor;
}

function filtersFromUrl(url: URL): PimPhase6Filters {
  const scope = normalizePimPhase6Scope({
    kind: "all_matching",
    ids: [],
    excludedIds: [],
    filters: {
      query: url.searchParams.get("query"),
      status: url.searchParams.get("status"),
      categoryId: url.searchParams.get("categoryId"),
      updatedFrom: url.searchParams.get("updatedFrom"),
      updatedTo: url.searchParams.get("updatedTo")
    }
  });
  return scope?.filters || emptyPimPhase6Filters();
}

function fileFormat(value: unknown): PimPhase6Format {
  if (value === "xlsx" || value === "csv") return value;
  throw new PimPhase6ServerError(400, "Format file harus XLSX atau CSV UTF-8.", "EXPORT_GENERATION_FAILED");
}

function uuid(value: unknown) {
  const source = typeof value === "string" ? value : "";
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(source) ? source : null;
}

function safeEnvironment() {
  return process.env.VERCEL_ENV === "production" ? "production" : process.env.VERCEL_ENV === "preview" ? "preview" : "local";
}

function noStoreJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
}

function errorResponse(error: unknown) {
  if (error instanceof PimPhase6ServerError || error instanceof Phase13AuthError) {
    return noStoreJson({ error: error.message, code: error instanceof PimPhase6ServerError ? error.code : "PIM_PHASE6_PERMISSION_DENIED" }, error.status);
  }
  console.error("PIM Phase 6 route failed", { error: error instanceof Error ? error.name : "unknown", fingerprint: hashPimPhase6Value(error instanceof Error ? error.message : "unknown") });
  return noStoreJson({ error: "Export & Reconciliation gagal diproses.", code: "RECONCILIATION_INCOMPLETE" }, 500);
}
