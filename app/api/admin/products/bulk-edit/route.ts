import { NextResponse } from "next/server";
import type { AdminRole } from "@/lib/access-control";
import { normalizePimBulkFilters, type PimBulkTargetType } from "@/lib/pim-bulk-edit";
import {
  PimBulkEditServerError,
  commitPimBulkEdit,
  listPimBulkTargets,
  loadPimBulkEditConfig,
  validatePimBulkEdit
} from "@/lib/pim-bulk-edit-server";
import { PRODUCT_MANAGER_ROLES } from "@/lib/product-manager";
import { Phase13AuthError, requirePhase13Actor } from "@/lib/phase13-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TARGET_TYPES: PimBulkTargetType[] = ["product", "variant", "sellable"];

export async function GET(request: Request) {
  try {
    const actor = await requireBulkEditActor(request);
    const url = new URL(request.url);
    if (url.searchParams.get("view") !== "targets") return noStoreJson(await loadPimBulkEditConfig(actor.adminClient, actor.role));
    const targetType = TARGET_TYPES.includes(url.searchParams.get("targetType") as PimBulkTargetType) ? url.searchParams.get("targetType") as PimBulkTargetType : "product";
    const filters = normalizePimBulkFilters({ query: url.searchParams.get("query"), status: url.searchParams.get("status"), categoryId: url.searchParams.get("categoryId") }, targetType);
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    return noStoreJson(await listPimBulkTargets({ client: actor.adminClient, targetType, filters, page }));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const action = new URL(request.url).searchParams.get("action");
    if (action !== "preview" && action !== "commit") throw new PimBulkEditServerError(400, "Action Bulk Edit tidak valid.", "INVALID_ACTION");
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 64 * 1024) throw new PimBulkEditServerError(413, "Payload Bulk Edit terlalu besar.", "BATCH_LIMIT_EXCEEDED");
    const authRequest = new Request(request.url, { method: "GET", headers: request.headers });
    const actor = await requireBulkEditActor(authRequest);
    const body = await request.json().catch(() => null) as { selection?: unknown; action?: unknown; previewToken?: unknown } | null;
    if (!body) throw new PimBulkEditServerError(400, "Payload Bulk Edit tidak valid.");
    if (action === "preview") {
      const preview = await validatePimBulkEdit({ client: actor.adminClient, actorId: actor.user.id, role: actor.role, selection: body.selection, action: body.action });
      const { transactionState, ...safePreview } = preview;
      void transactionState;
      return noStoreJson(safePreview, preview.status === "blocked" ? 422 : 200);
    }
    const previewToken = typeof body.previewToken === "string" ? body.previewToken : "";
    if (!previewToken) throw new PimBulkEditServerError(400, "Preview wajib dijalankan sebelum final commit.", "PREVIEW_HASH_MISMATCH");
    const result = await commitPimBulkEdit({ client: actor.adminClient, actorId: actor.user.id, role: actor.role, selection: body.selection, action: body.action, previewToken });
    return noStoreJson({ ok: true, result });
  } catch (error) {
    return errorResponse(error);
  }
}

async function requireBulkEditActor(request: Request) {
  const actor = await requirePhase13Actor(request);
  if (!PRODUCT_MANAGER_ROLES.includes(actor.role as AdminRole)) throw new Phase13AuthError(403, "Role ini tidak memiliki akses Product Manager.");
  return actor;
}

function noStoreJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
}

function errorResponse(error: unknown) {
  if (error instanceof PimBulkEditServerError || error instanceof Phase13AuthError) {
    return noStoreJson({ error: error.message, code: error instanceof PimBulkEditServerError ? error.code : undefined }, error.status);
  }
  console.error("PIM Bulk Edit route failed", { error: error instanceof Error ? error.name : "unknown" });
  return noStoreJson({ error: "Bulk Edit gagal diproses." }, 500);
}
