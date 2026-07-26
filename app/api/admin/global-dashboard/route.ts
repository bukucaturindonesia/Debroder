import { loadGlobalAdminDashboard } from "@/lib/global-admin-dashboard/page-use-case";
import { Phase13AuthError, phase13ErrorResponse, requirePhase13Actor } from "@/lib/phase13-auth";

export const dynamic = "force-dynamic";

const DASHBOARD_ROLES = new Set(["owner", "superadmin", "super_admin", "admin"]);

export async function GET(request: Request) {
  try {
    const actor = await requirePhase13Actor(request, "order.read");
    if (!DASHBOARD_ROLES.has(actor.role)) {
      throw new Phase13AuthError(403, "Role ini tidak memiliki akses Dashboard Global.");
    }
    const url = new URL(request.url);
    const metadata = actor.user.user_metadata && typeof actor.user.user_metadata === "object"
      ? actor.user.user_metadata as Record<string, unknown>
      : {};
    const fullName = typeof metadata.full_name === "string" ? metadata.full_name.trim() : "";
    const displayName = fullName || actor.user.email?.split("@")[0] || "Admin";
    const readModel = await loadGlobalAdminDashboard({
      client: actor.client,
      role: actor.role,
      displayName,
      query: {
        period: url.searchParams.get("period"),
        start: url.searchParams.get("start"),
        end: url.searchParams.get("end"),
        store: url.searchParams.get("store")
      }
    });
    return Response.json(readModel, {
      headers: { "cache-control": "private, no-store" }
    });
  } catch (error) {
    return phase13ErrorResponse(error, request);
  }
}
