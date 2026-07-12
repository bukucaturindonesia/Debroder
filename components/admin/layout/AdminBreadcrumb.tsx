"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getAdminBreadcrumbs } from "./admin-navigation";

export function AdminBreadcrumb() {
  const pathname = usePathname();
  const breadcrumbs = getAdminBreadcrumbs(pathname);

  return (
    <nav aria-label="Breadcrumb admin" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-2 overflow-hidden text-xs font-semibold text-brand-charcoal/55">
        {breadcrumbs.map((item, index) => {
          const last = index === breadcrumbs.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-2">
              {index > 0 ? <span aria-hidden="true">/</span> : null}
              {item.href && !last ? (
                <Link
                  href={item.href}
                  className="truncate transition hover:text-brand-charcoal"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={`truncate ${last ? "text-brand-charcoal" : ""}`}
                  aria-current={last ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
