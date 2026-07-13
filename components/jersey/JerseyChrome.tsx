"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { JERSEY_NAV_ITEMS } from "@/lib/jersey-experience";

export function JerseyChrome() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navigasi Jersey" className="jersey-context-header sticky top-0 z-[80] bg-[#050505] text-[#39FF88]">
      <div className="jersey-shell grid min-h-[var(--jersey-header-height)] md:grid-cols-[auto_minmax(0,1fr)] md:items-center md:gap-8">
        <Link href="/jersey" className="jersey-neon inline-flex min-h-12 items-center whitespace-nowrap font-heading text-lg font-bold uppercase tracking-[0.07em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#39FF88] sm:text-xl">
          DEBRODER JERSEY
        </Link>
        <div className="no-scrollbar flex min-h-12 snap-x snap-proximity items-center gap-6 overflow-x-auto overscroll-x-contain md:justify-end">
          {JERSEY_NAV_ITEMS.map((item) => {
            const active = item.href === "/jersey/shop"
              ? pathname === "/jersey/shop"
              : item.href === "/jersey/configurator"
                ? pathname === "/jersey/configurator"
                : item.href === "/jersey" && pathname === "/jersey";
            return (
              <Link
                key={`${item.label}-${item.href}`}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`group relative flex min-h-12 shrink-0 snap-start items-center whitespace-nowrap text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#39FF88] ${active ? "jersey-neon-active text-[#39FF88]" : "text-[#39FF88]/70 hover:text-[#39FF88]"}`}
              >
                {item.label}
                <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 origin-center scale-x-0 bg-[#39FF88] transition-transform duration-200 group-hover:scale-x-100 group-focus-visible:scale-x-100" />
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
