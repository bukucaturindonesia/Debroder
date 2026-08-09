"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getAdminBreadcrumbs } from "./admin-navigation";

export function AdminBreadcrumb() {
  const pathname = usePathname();
  const breadcrumbs = getAdminBreadcrumbs(pathname);

  return (
    <nav aria-label="Breadcrumb admin" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-2 overflow-hidden text-[11px] font-medium text-zinc-400">
        {breadcrumbs.map((item, index) => {
          const last = index === breadcrumbs.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-2">
              {index > 0 ? <span aria-hidden="true">/</span> : null}
              {item.href && !last ? (
                <Link
                  href={item.href}
                  className="truncate transition-colors duration-150 hover:text-zinc-900"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={`truncate ${last ? "text-zinc-700" : ""}`}
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
