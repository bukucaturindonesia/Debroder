"use client";

import { AdminGuestDashboard } from "@/components/admin/AdminGuestDashboard";
import { GlobalAdminDashboard } from "@/components/admin/GlobalAdminDashboard";
import { RoleBasedDashboard } from "@/components/admin/RoleBasedDashboard";
import { useAdminAccess } from "@/components/admin/layout/AdminAccessContext";

export function AdminDashboardGate() {
  const access = useAdminAccess();
  if (access.readOnly) return <AdminGuestDashboard />;
  if (["owner", "superadmin", "super_admin", "admin"].includes(access.role)) {
    return <GlobalAdminDashboard />;
  }
  return <RoleBasedDashboard />;
}
