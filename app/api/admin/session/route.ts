import { getRoleLabel, isAdminGuestRole, isAdminRole } from "@/lib/access-control";
import { roleCanAccessPath } from "@/components/admin/layout/admin-navigation";
import { phase13ErrorResponse, requirePhase13Actor } from "@/lib/phase13-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const actor = await requirePhase13Actor(request);
    const pathname = safeAdminPath(new URL(request.url).searchParams.get("path"));
    const allowed = isAdminRole(actor.role) && roleCanAccessPath(actor.role, pathname);

    return Response.json(
      {
        role: actor.role,
        roleLabel: getRoleLabel(actor.role),
        readOnly: isAdminGuestRole(actor.role),
        allowed,
        home: "/admin/dashboard"
      },
      {
        status: allowed ? 200 : 403,
        headers: { "cache-control": "private, no-store" }
      }
    );
  } catch (error) {
    return phase13ErrorResponse(error);
  }
}

function safeAdminPath(value: string | null) {
  if (!value || !value.startsWith("/admin") || value.startsWith("/admin/login")) {
    return "/admin/dashboard";
  }
  return value;
}
