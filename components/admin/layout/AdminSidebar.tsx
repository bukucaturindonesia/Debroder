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

export function AdminSidebar({
  role,
  onNavigate,
  onLogout
}: {
  role: AdminRole;
  onNavigate?: () => void;
  onLogout: () => void;
}) {
  const pathname = usePathname();
  const groups = getNavigationGroups(role);

  return (
    <div className="flex h-full flex-col bg-white text-brand-charcoal">
      <div className="border-b border-brand-softGray p-5">
        <Link href={getRoleHome(role)} onClick={onNavigate}>
          <Logo variant="primary-dark" size="md" />
        </Link>
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-charcoal/45">
          Admin Workspace
        </p>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-4 py-5" aria-label="Menu admin">
        <div className="grid gap-7">
          {groups.map((group) => (
            <section key={group.label}>
              <p className="px-3 text-[11px] font-semibold tracking-[0.18em] text-brand-charcoal/40">
                {group.label}
              </p>
              <div className="mt-2 grid gap-1">
                {group.items.map((item) => {
                  if (isNavigationLink(item)) {
                    const active = isNavigationActive(pathname, item);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onNavigate}
                        aria-current={active ? "page" : undefined}
                        className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                          active
                            ? "bg-brand-charcoal text-white"
                            : "hover:bg-brand-offWhite"
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
                      className={`rounded-xl border p-2 ${
                        groupActive
                          ? "border-brand-charcoal/25 bg-brand-offWhite"
                          : "border-transparent"
                      }`}
                    >
                      <p className="px-2 py-1.5 text-sm font-semibold">
                        {item.label}
                      </p>
                      <div className="mt-1 grid gap-1 border-l border-brand-softGray pl-2">
                        {item.children.map((child) => {
                          const active = isNavigationActive(pathname, child);
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={onNavigate}
                              aria-current={active ? "page" : undefined}
                              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                                active
                                  ? "bg-brand-charcoal text-white"
                                  : "text-brand-charcoal/75 hover:bg-white hover:text-brand-charcoal"
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

      <div className="border-t border-brand-softGray p-4">
        <button
          type="button"
          onClick={onLogout}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-brand-softGray px-4 text-sm font-semibold text-red-700 transition hover:border-red-200 hover:bg-red-50"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
