"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { JERSEY_NAV_ITEMS } from "@/lib/jersey-experience";

export function JerseyChrome() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navigasi kontekstual Jersey" data-ui-context-tabs className="jersey-context-header border-b border-black/10 bg-white text-[#111]">
      <div className="section-shell flex min-h-12 items-center justify-end">
        <div className="no-scrollbar flex min-h-12 max-w-full snap-x snap-proximity items-center gap-5 overflow-x-auto overscroll-x-contain sm:gap-6">
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
                className={`group relative flex min-h-12 shrink-0 snap-start items-center whitespace-nowrap text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-black ${active ? "font-semibold text-black" : "text-black/55 hover:text-black"}`}
              >
                {item.label}
                <span aria-hidden="true" data-tab-indicator data-active={active ? "true" : "false"} className="absolute inset-x-0 bottom-0 h-0.5 origin-center scale-x-0 bg-black transition-transform duration-200 group-hover:scale-x-100 group-focus-visible:scale-x-100" />
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
