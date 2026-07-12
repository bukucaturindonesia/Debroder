import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminPrimaryNavigation } from "@/components/admin/AdminPrimaryNavigation";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false
  }
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AdminPrimaryNavigation />
      {children}
    </>
  );
}
