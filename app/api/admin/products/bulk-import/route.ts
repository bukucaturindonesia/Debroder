import { NextResponse } from "next/server";
import type { AdminRole } from "@/lib/access-control";
import { PRODUCT_MANAGER_ROLES } from "@/lib/product-manager";
import {
  PIM_BULK_IMPORT_LIMITS,
  pimBulkImportTemplateCsv,
  pimBulkImportTemplateXlsx,
  referenceCsv
} from "@/lib/pim-bulk-import";
import {
  PimBulkImportServerError,
  commitPimBulkImport,
  loadPimBulkImportReferences,
  validatePimBulkImport
} from "@/lib/pim-bulk-import-server";
import { Phase13AuthError, requirePhase13Actor } from "@/lib/phase13-auth";
import { actorAuditLabel, createPimAuditIdentity, recordPimAuditEvent } from "@/lib/pim-audit-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const actor = await requireBulkImportActor(request);
    const references = await loadPimBulkImportReferences(actor.adminClient);
    const download = new URL(request.url).searchParams.get("download");
    if (!download) {
      return noStoreJson({
        role: actor.role,
        previewOnly: actor.role === "admin_guest",
        limits: PIM_BULK_IMPORT_LIMITS
      });
    }
    if (download === "xlsx") {
      const bytes = await pimBulkImportTemplateXlsx(references);
      return fileResponse(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "DEBRODER_PIM_BULK_IMPORT_TEMPLATE.xlsx");
    }
    if (download === "csv") return fileResponse(pimBulkImportTemplateCsv(), "text/csv; charset=utf-8", "DEBRODER_PIM_BULK_IMPORT_TEMPLATE.csv");
    if (download === "color-reference") {
      return fileResponse(referenceCsv(["id", "canonical_code", "display_name", "active"], references.colors.map((row) => [row.id, row.code, row.name, row.active])), "text/csv; charset=utf-8", "DEBRODER_COLOR_MASTER_REFERENCE.csv");
    }
    if (download === "size-reference") {
      return fileResponse(referenceCsv(["id", "canonical_code", "display_name", "active", "size_group"], references.sizes.map((row) => [row.id, row.code, row.name, row.active, row.group || ""])), "text/csv; charset=utf-8", "DEBRODER_SIZE_MASTER_REFERENCE.csv");
    }
    if (download === "category-reference") {
      return fileResponse(referenceCsv(["id", "canonical_code", "display_name", "active"], references.categories.map((row) => [row.id, row.code, row.name, row.active])), "text/csv; charset=utf-8", "DEBRODER_CATEGORY_REFERENCE.csv");
    }
    throw new PimBulkImportServerError(404, "Template atau reference tidak ditemukan.");
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const action = new URL(request.url).searchParams.get("action");
    if (action !== "preview" && action !== "commit") throw new PimBulkImportServerError(400, "Action Bulk Import tidak valid.");
    const authRequest = action === "preview"
      ? new Request(request.url, { method: "GET", headers: request.headers })
      : request;
    const actor = await requireBulkImportActor(authRequest);
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > PIM_BULK_IMPORT_LIMITS.maxFileBytes + 512 * 1024) throw new PimBulkImportServerError(413, "Request Bulk Import terlalu besar.");
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new PimBulkImportServerError(400, "File XLSX atau CSV wajib dipilih.");
    if (file.size > PIM_BULK_IMPORT_LIMITS.maxFileBytes) throw new PimBulkImportServerError(413, "Ukuran file melebihi batas Bulk Import.");
    const fileInput = { fileName: file.name, mimeType: file.type, bytes: new Uint8Array(await file.arrayBuffer()) };

    if (action === "preview") {
      const preview = await validatePimBulkImport({ client: actor.adminClient, actorId: actor.user.id, file: fileInput });
      const identity = createPimAuditIdentity(request, `bulk-import-preview:${preview.fileChecksum}`);
      await recordPimAuditEvent(actor.adminClient, {
        eventCode: "BULK_IMPORT_PREVIEWED",
        status: preview.status === "blocked" ? "FAILED" : "COMPLETED",
        actorId: actor.user.id,
        actorRole: actor.role,
        actorLabel: actorAuditLabel(actor.user),
        requestId: identity.requestId,
        operationId: identity.operationId,
        idempotencyKey: identity.idempotencyKey,
        entityType: "pim_bulk_import_preview",
        entityLabel: preview.fileName,
        summary: "Dry run Bulk Import dijalankan",
        failureCode: preview.status === "blocked" ? "IMPORT_VALIDATION_FAILED" : null,
        metadata: { fileChecksum: preview.fileChecksum, payloadHash: preview.payloadHash, rowCount: preview.summary.totalRows, errorCount: preview.summary.errors, warningCount: preview.summary.warnings, importMode: preview.importMode }
      });
      return noStoreJson(preview, preview.status === "blocked" ? 422 : 200);
    }

    const previewToken = String(form.get("previewToken") || "");
    if (!previewToken) throw new PimBulkImportServerError(400, "Dry-run preview wajib dijalankan sebelum final import.");
    const result = await commitPimBulkImport({
      client: actor.adminClient,
      actorId: actor.user.id,
      role: actor.role,
      file: fileInput,
      previewToken
    });
    return noStoreJson({ ok: true, result });
  } catch (error) {
    return errorResponse(error);
  }
}

async function requireBulkImportActor(request: Request) {
  const actor = await requirePhase13Actor(request);
  if (!PRODUCT_MANAGER_ROLES.includes(actor.role as AdminRole)) throw new Phase13AuthError(403, "Role ini tidak memiliki akses Product Manager.");
  return actor;
}

function fileResponse(body: string | Uint8Array, contentType: string, fileName: string) {
  const responseBody = typeof body === "string"
    ? body
    : body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer;
  return new Response(responseBody, {
    headers: {
      "content-type": contentType,
      "content-disposition": `attachment; filename="${fileName}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff"
    }
  });
}

function noStoreJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "cache-control": "private, no-store" } });
}

function errorResponse(error: unknown) {
  if (error instanceof PimBulkImportServerError || error instanceof Phase13AuthError) {
    return noStoreJson({ error: error.message, code: error instanceof PimBulkImportServerError ? error.code : undefined }, error.status);
  }
  console.error("PIM Bulk Import route failed", { error: error instanceof Error ? error.name : "unknown" });
  return noStoreJson({ error: "Bulk Import gagal diproses." }, 500);
}
