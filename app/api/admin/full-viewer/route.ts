import { isAdminGuestRole } from "@/lib/access-control";
import { sanitizeAdminGuestRecord } from "@/lib/admin-data-masking";
import { getAdminViewerPanel } from "@/lib/admin-full-viewer";
import { phase13ErrorResponse, requirePhase13Actor } from "@/lib/phase13-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const actor = await requirePhase13Actor(request);
    if (!isAdminGuestRole(actor.role)) {
      return Response.json(
        { error: "Endpoint ini khusus tampilan read-only Admin Guest." },
        { status: 403, headers: { "cache-control": "private, no-store" } }
      );
    }

    const pathname = safeAdminPath(new URL(request.url).searchParams.get("path"));
    const panel = getAdminViewerPanel(pathname);
    const resources = await Promise.all(panel.resources.map(async (resource) => {
      let query = actor.adminClient
        .from(resource.table)
        .select("*")
        .limit(resource.limit ?? 50);

      if (resource.orderBy) {
        query = query.order(resource.orderBy, {
          ascending: resource.ascending ?? false,
          nullsFirst: false
        });
      }

      const { data, error } = await query;
      if (error) {
        return {
          label: resource.label,
          columns: [...resource.columns],
          rows: [],
          unavailable: true
        };
      }

      const rows = Array.isArray(data)
        ? data.map((row) => {
            const source = row as Record<string, unknown>;
            const allowed = Object.fromEntries(
              resource.columns
                .filter((column) => Object.prototype.hasOwnProperty.call(source, column))
                .map((column) => [column, source[column]])
            );
            return sanitizeAdminGuestRecord(allowed);
          })
        : [];

      return {
        label: resource.label,
        columns: [...resource.columns],
        rows,
        unavailable: false
      };
    }));

    return Response.json(
      {
        pathname,
        eyebrow: panel.eyebrow,
        title: panel.title,
        description: panel.description,
        resources
      },
      { headers: { "cache-control": "private, no-store" } }
    );
  } catch (error) {
    return phase13ErrorResponse(error);
  }
}

function safeAdminPath(value: string | null) {
  if (!value || !value.startsWith("/admin") || value.startsWith("/admin/login")) {
    return "/admin/reports";
  }
  return value;
}
