"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  {
    label: "Dashboard",
    href: "/admin/dashboard",
    isActive: (pathname: string) =>
      pathname === "/admin" || pathname === "/admin/dashboard"
  },
  {
    label: "Order",
    href: "/admin/orders/quotations",
    isActive: (pathname: string) => pathname.startsWith("/admin/orders")
  }
];

export function AdminPrimaryNavigation() {
  const pathname = usePathname();

  if (pathname === "/admin/login") return null;

  return (
    <nav
      aria-label="Navigasi utama admin"
      className="sticky top-0 z-50 border-b border-brand-softGray bg-white/95 px-4 py-3 text-brand-charcoal backdrop-blur sm:px-6 lg:px-8"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-[0.18em] text-brand-charcoal/45">
            DEBRODER Admin
          </p>
          <p className="mt-1 truncate text-sm font-semibold">
            Operasional & Order Management
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {navigation.map((item) => {
            const active = item.isActive(pathname);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-10 items-center justify-center rounded-full border px-4 text-sm font-semibold transition ${
                  active
                    ? "border-brand-charcoal bg-brand-charcoal text-white"
                    : "border-brand-softGray bg-white text-brand-charcoal hover:border-brand-charcoal"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
