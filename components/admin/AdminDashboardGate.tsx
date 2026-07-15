"use client";

import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminGuestDashboard } from "@/components/admin/AdminGuestDashboard";
import { useAdminAccess } from "@/components/admin/layout/AdminAccessContext";

export function AdminDashboardGate() {
  const { readOnly } = useAdminAccess();
  return readOnly ? <AdminGuestDashboard /> : <AdminDashboard />;
}
