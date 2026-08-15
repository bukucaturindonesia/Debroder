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
      aria-label="Tab katalog Jersey"
      data-ui-context-tabs
      className="border-b border-black/10 bg-white text-[#111111]"
    >
      <div className="section-shell flex min-h-12 items-center justify-end">
        <div className="no-scrollbar flex min-h-12 max-w-full snap-x snap-proximity items-center gap-5 overflow-x-auto overscroll-x-contain sm:gap-6">
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
