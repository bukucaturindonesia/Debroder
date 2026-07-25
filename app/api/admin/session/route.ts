import {
  getRoleLabel,
  isAdminGuestRole,
  isAdminRole
} from "@/lib/access-control";
import { getRoleHome, roleCanAccessPath } from "@/components/admin/layout/admin-navigation";
import { registerSingleAdminSession } from "@/lib/admin-session-security";
import { phase13ErrorResponse, requirePhase13Actor } from "@/lib/phase13-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const actor = await requirePhase13Actor(request);
    const pathname = safeAdminPath(new URL(request.url).searchParams.get("path"));
    const allowed = isAdminRole(actor.role) && roleCanAccessPath(actor.role, pathname);

    const authorization = request.headers.get("authorization") ?? "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
    await registerSingleAdminSession(actor.client, token);

    return Response.json(
      {
        role: actor.role,
        roleLabel: getRoleLabel(actor.role),
        accountStatus: actor.accountStatus,
        primaryStoreId: actor.primaryStoreId,
        allStoreAccess: actor.allStoreAccess,
        readOnly: isAdminGuestRole(actor.role),
        allowed,
        home: getRoleHome(actor.role)
      },
      {
        status: allowed ? 200 : 403,
        headers: { "cache-control": "private, no-store" }
      }
    );
  } catch (error) {
    return phase13ErrorResponse(error, request);
  }
}

function safeAdminPath(value: string | null) {
  if (!value || !value.startsWith("/admin") || value.startsWith("/admin/login")) {
    return "/admin/dashboard";
  }
  return value;
}
