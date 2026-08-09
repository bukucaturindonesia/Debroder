"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import {
  getNavigationGroups,
  getRoleHome,
  isNavigationActive,
  isNavigationLink,
  type AdminRole
} from "./admin-navigation";
import type { AdminAccessSnapshot } from "@/lib/access-control";

export function AdminSidebar({
  access,
  onNavigate,
  onLogout
}: {
  access: AdminAccessSnapshot;
  onNavigate?: () => void;
  onLogout: () => void;
}) {
  const pathname = usePathname();
  const role: AdminRole = access.role;
  const groups = getNavigationGroups(role, access.permissions);
  return (
    <div className="admin-sidebar flex h-full flex-col bg-white text-zinc-900">
      <div className="border-b border-zinc-200/70 p-6">
        <Link href={getRoleHome(role)} onClick={onNavigate}>
          <Logo variant="primary-dark" size="md" />
        </Link>
        <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
          Area Kerja Admin
        </p>
        <div className="mt-4 border-t border-zinc-200/70 pt-4 text-xs leading-5 text-zinc-500">
          <p className="font-semibold text-zinc-900">{access.displayName}</p>
          <p>{access.roleLabel}</p>
          <p>{access.scopeLabel}</p>
        </div>
      </div>

      <nav className="admin-sidebar-nav min-h-0 flex-1 overflow-y-auto px-3 py-6" aria-label="Menu admin">
        <div className="grid gap-8">
          {groups.map((group) => (
            <section key={group.label}>
              <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                {group.label}
              </p>
              <div className="mt-2 grid gap-1">
                {group.items.map((item) => {
                  if (isNavigationLink(item)) {
                    const active = isNavigationActive(pathname, item)
                      || (pathname === "/admin" && item.href === "/admin/dashboard");
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onNavigate}
                        aria-current={active ? "page" : undefined}
                        className={`admin-nav-link border-l-2 px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
                          active
                            ? "border-zinc-900 bg-zinc-100 text-zinc-950"
                            : "border-transparent text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950"
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  }

                  const groupActive = item.children.some((child) =>
                    isNavigationActive(pathname, child)
                  );

                  return (
                    <div
                      key={item.label}
                      className={`border-l p-2 ${
                        groupActive
                          ? "border-zinc-300 bg-zinc-50/80"
                          : "border-zinc-200/70"
                      }`}
                    >
                      <p className="px-2 py-1.5 text-sm font-semibold">
                        {item.label}
                      </p>
                      <div className="mt-1 grid gap-1 pl-2">
                        {item.children.map((child) => {
                          const active = isNavigationActive(pathname, child);
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={onNavigate}
                              aria-current={active ? "page" : undefined}
                              className={`admin-nav-link border-l-2 px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                                active
                                  ? "border-zinc-900 bg-zinc-100 text-zinc-950"
                                  : "border-transparent text-zinc-600 hover:bg-white hover:text-zinc-950"
                              }`}
                            >
                              {child.label}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </nav>

      <div className="border-t border-zinc-200/70 p-4">
        <button
          type="button"
          onClick={onLogout}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-zinc-200/80 px-4 text-sm font-medium text-zinc-600 transition-colors duration-150 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-950"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
