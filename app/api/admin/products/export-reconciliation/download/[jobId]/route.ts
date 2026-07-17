import { NextResponse } from "next/server";
import type { AdminRole } from "@/lib/access-control";
import { PRODUCT_MANAGER_ROLES } from "@/lib/product-manager";
import { loadOwnedPimPhase6File, PimPhase6ServerError } from "@/lib/pim-phase6-server";
import { Phase13AuthError, requirePhase13Actor } from "@/lib/phase13-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ jobId: string }> }) {
  try {
    const actor = await requirePhase13Actor(request);
    if (!PRODUCT_MANAGER_ROLES.includes(actor.role as AdminRole)) throw new Phase13AuthError(403, "Role ini tidak memiliki akses Product Manager.");
    const { jobId } = await context.params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(jobId)) throw new PimPhase6ServerError(404, "File export tidak ditemukan.", "EXPORT_JOB_NOT_FOUND");
    const file = await loadOwnedPimPhase6File(actor.adminClient, actor.user.id, jobId);
    return new Response(Buffer.from(file.bytes), {
      status: 200,
      headers: {
        "content-type": file.mimeType,
        "content-length": String(file.fileSize),
        "content-disposition": `attachment; filename="${file.fileName}"`,
        "cache-control": "private, no-store, max-age=0",
        "x-content-type-options": "nosniff",
        "x-debroder-file-sha256": file.sha256
      }
    });
  } catch (error) {
    if (error instanceof PimPhase6ServerError || error instanceof Phase13AuthError) {
      return NextResponse.json({ error: error.message, code: error instanceof PimPhase6ServerError ? error.code : "PIM_PHASE6_PERMISSION_DENIED" }, { status: error.status, headers: { "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
    }
    return NextResponse.json({ error: "Download export gagal.", code: "STORAGE_READ_FAILED" }, { status: 500, headers: { "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
  }
}
