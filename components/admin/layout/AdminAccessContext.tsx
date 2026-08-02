"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { AdminAccessSnapshot } from "@/lib/access-control";

const AdminAccessContext = createContext<AdminAccessSnapshot | null>(null);

export function AdminAccessProvider({
  access,
  children
}: {
  access: AdminAccessSnapshot;
  children: ReactNode;
}) {
  return (
    <AdminAccessContext.Provider value={access}>
      {children}
    </AdminAccessContext.Provider>
  );
}

export function useAdminAccess() {
  const value = useContext(AdminAccessContext);
  if (!value) throw new Error("AdminAccessProvider belum tersedia.");
  return value;
}
