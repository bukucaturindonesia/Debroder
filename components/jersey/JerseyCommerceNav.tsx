"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { JERSEY_COMMERCE_NAV_ITEMS } from "@/lib/jersey-commerce";

export function JerseyCommerceNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedCategory = searchParams.get("category") || "";

  return (
    <nav
      aria-label="Navigasi commerce Jersey"
      className="border-b border-black/10 bg-white text-[#111111]"
    >
      <div className="section-shell grid min-h-14 grid-cols-1 items-center gap-x-8 sm:grid-cols-[auto_minmax(0,1fr)]">
        <Link
          href="/jersey/shop"
          className="inline-flex min-h-12 items-center whitespace-nowrap font-heading text-xl font-extrabold uppercase tracking-[0.035em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
        >
          DEBRODER JERSEY
        </Link>
        <div className="no-scrollbar flex min-h-12 snap-x snap-proximity items-center gap-6 overflow-x-auto overscroll-x-contain sm:justify-end">
          {JERSEY_COMMERCE_NAV_ITEMS.map((item) => {
            const category = item.href.match(/category=([^&]+)/)?.[1] || "";
            const active = category
              ? pathname === "/jersey/shop" && selectedCategory === category
              : item.href === "/jersey/shop"
                ? pathname === "/jersey/shop" && !selectedCategory
                : item.href === pathname;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-12 shrink-0 snap-start items-center whitespace-nowrap text-sm outline-none transition-colors focus-visible:underline focus-visible:decoration-2 focus-visible:underline-offset-8 ${
                  active
                    ? "font-bold underline decoration-1 underline-offset-8"
                    : "font-medium text-black/65 hover:text-black"
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
