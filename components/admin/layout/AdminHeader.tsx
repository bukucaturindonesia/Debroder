"use client";

import { AdminNotificationBell } from "@/components/admin/AdminNotificationBell";
import { AdminBreadcrumb } from "./AdminBreadcrumb";
import type { AdminRole } from "./admin-navigation";
import { getCurrentNavigationLabel, ROLE_LABELS } from "./admin-navigation";
import { isAdminGuestRole } from "@/lib/access-control";
import { usePathname } from "next/navigation";

export function AdminHeader({
  role,
  onOpenMenu,
  onLogout
}: {
  role: AdminRole;
  onOpenMenu: () => void;
  onLogout: () => void;
}) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-brand-softGray bg-white/95 backdrop-blur">
      <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenMenu}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brand-softGray text-lg font-semibold lg:hidden"
            aria-label="Buka menu admin"
          >
            ☰
          </button>
          <div className="min-w-0">
            <AdminBreadcrumb />
            <p className="mt-1 truncate text-sm font-semibold text-brand-charcoal">
              {getCurrentNavigationLabel(pathname)}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isAdminGuestRole(role) ? null : <AdminNotificationBell />}
          {isAdminGuestRole(role) ? (
            <span className="hidden rounded-full border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 sm:inline-flex">
              MODE LIHAT SAJA
            </span>
          ) : null}
          <span className="hidden rounded-full border border-brand-softGray bg-brand-offWhite px-3 py-2 text-xs font-semibold text-brand-charcoal/70 sm:inline-flex">
            {ROLE_LABELS[role]}
          </span>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-brand-softGray px-4 text-sm font-semibold transition hover:border-brand-charcoal"
          >
            Keluar
          </button>
        </div>
      </div>
    </header>
  );
}
