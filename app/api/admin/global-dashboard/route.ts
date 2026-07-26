import { loadGlobalAdminDashboard } from "@/lib/global-admin-dashboard/page-use-case";
import { resolveGlobalDashboardAccess } from "@/lib/global-admin-dashboard/access";
import { phase13ErrorResponse, requirePhase13Actor } from "@/lib/phase13-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const actor = await requirePhase13Actor(request, "order.read");
    const url = new URL(request.url);
    const access = resolveGlobalDashboardAccess(actor, url.searchParams.get("store"));
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
        store: access.storeId
      },
      storeScopeLocked: access.storeScopeLocked
    });
    return Response.json(readModel, {
      headers: { "cache-control": "private, no-store" }
    });
  } catch (error) {
    return phase13ErrorResponse(error, request);
  }
}
