import type { AdminRole } from "@/lib/access-control";
import { PRODUCT_MANAGER_ROLES } from "@/lib/product-manager";
import {
  PimAuditServerError,
  listPimAuditHistory,
  loadPimAuditDetail,
  parsePimAuditFilters
} from "@/lib/pim-audit-server";
import { Phase13AuthError, requirePhase13Actor } from "@/lib/phase13-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const actor = await requirePhase13Actor(request);
    if (!PRODUCT_MANAGER_ROLES.includes(actor.role as AdminRole)) {
      throw new Phase13AuthError(403, "Anda tidak mempunyai akses ke riwayat PIM.");
    }
    const url = new URL(request.url);
    const auditId = url.searchParams.get("auditId");
    if (auditId) {
      return noStoreJson({ detail: await loadPimAuditDetail(actor.adminClient, auditId), actorRole: actor.role });
    }
    return noStoreJson({ ...(await listPimAuditHistory(actor.adminClient, parsePimAuditFilters(url))), actorRole: actor.role });
  } catch (error) {
    if (error instanceof PimAuditServerError || error instanceof Phase13AuthError) {
      return noStoreJson({ error: error.message, code: error instanceof PimAuditServerError ? error.code : "PIM_AUDIT_PERMISSION_DENIED" }, error.status);
    }
    console.error("PIM audit history route failed", { error: error instanceof Error ? error.name : "unknown" });
    return noStoreJson({ error: "Gagal memuat riwayat aktivitas.", code: "AUDIT_QUERY_FAILED" }, 500);
  }
}

function noStoreJson(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "private, no-store, max-age=0",
      "x-content-type-options": "nosniff"
    }
  });
}
