import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getRoleLabel } from "@/lib/access-control";
import { selectGlobalAdminDashboardGraph } from "@/lib/global-admin-dashboard/data-access";
import {
  normalizeGlobalDashboardFilter,
  projectGlobalAdminDashboard
} from "@/lib/global-admin-dashboard/domain";

const FINANCIAL_ROLES = new Set(["owner", "superadmin", "super_admin", "admin", "finance"]);

export async function loadGlobalAdminDashboard(input: {
  client: SupabaseClient;
  role: string;
  displayName: string;
  query: { period?: string | null; start?: string | null; end?: string | null; store?: string | null };
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const filter = normalizeGlobalDashboardFilter(input.query, now);
  const currentStart = new Date(filter.start);
  const currentEnd = new Date(filter.end);
  const duration = currentEnd.getTime() - currentStart.getTime();
  const queryStart = new Date(currentStart.getTime() - duration).toISOString();
  const raw = await selectGlobalAdminDashboardGraph(input.client, {
    start: queryStart,
    end: filter.end
  });

  return projectGlobalAdminDashboard({
    raw,
    filter,
    now,
    actor: {
      displayName: input.displayName,
      roleLabel: getRoleLabel(input.role),
      financialVisible: FINANCIAL_ROLES.has(input.role)
    }
  });
}

