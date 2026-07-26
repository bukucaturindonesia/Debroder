"use client";

import { AdminGuestDashboard } from "@/components/admin/AdminGuestDashboard";
import { GlobalAdminDashboard } from "@/components/admin/GlobalAdminDashboard";
import { useAdminAccess } from "@/components/admin/layout/AdminAccessContext";

export function AdminDashboardGate() {
  const { readOnly } = useAdminAccess();
  if (readOnly) return <AdminGuestDashboard />;
  return <GlobalAdminDashboard />;
}
