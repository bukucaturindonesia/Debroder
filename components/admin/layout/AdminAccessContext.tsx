"use client";

import { createContext, useContext, type ReactNode } from "react";
import { isAdminGuestRole, type AdminRole } from "@/lib/access-control";

export type AdminAccessState = {
  role: AdminRole;
  readOnly: boolean;
};

const AdminAccessContext = createContext<AdminAccessState | null>(null);

export function AdminAccessProvider({
  role,
  children
}: {
  role: AdminRole;
  children: ReactNode;
}) {
  return (
    <AdminAccessContext.Provider value={{ role, readOnly: isAdminGuestRole(role) }}>
      {children}
    </AdminAccessContext.Provider>
  );
}

export function useAdminAccess() {
  const value = useContext(AdminAccessContext);
  if (!value) throw new Error("AdminAccessProvider belum tersedia.");
  return value;
}
