import { loadAdminOrderListPage } from "@/lib/admin-orders/page-use-case";
import { phase13ErrorResponse, requirePhase13Actor } from "@/lib/phase13-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const actor = await requirePhase13Actor(request, "order.read");
    const readModel = await loadAdminOrderListPage(actor.client);
    return Response.json(readModel, {
      headers: { "cache-control": "private, no-store" }
    });
  } catch (error) {
    return phase13ErrorResponse(error);
  }
}
