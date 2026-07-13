"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { JERSEY_NAV_ITEMS } from "@/lib/jersey-experience";

export function JerseyChrome() {
  const pathname = usePathname();

  return (
    <>
      <div className="bg-[#111111] text-white">
        <div className="section-shell flex min-h-12 items-center py-3">
          <Link href="/jersey" className="font-heading text-xl font-bold uppercase tracking-[0.06em] sm:text-2xl">
            DEBRODER JERSEY
          </Link>
        </div>
      </div>
      <nav aria-label="Navigasi Jersey" className="sticky top-0 z-[90] border-b border-black/10 bg-white/95 backdrop-blur-sm">
        <div className="no-scrollbar section-shell flex min-h-12 snap-x snap-proximity items-center gap-6 overflow-x-auto overscroll-x-contain py-1 sm:gap-8">
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
                className={`relative flex min-h-11 shrink-0 snap-start items-center whitespace-nowrap text-sm font-semibold transition hover:text-[#063D24] ${active ? "text-[#063D24]" : "text-black/65"}`}
              >
                {item.label}
                <span className={`absolute inset-x-0 bottom-0 h-0.5 bg-[#063D24] transition-transform ${active ? "scale-x-100" : "scale-x-0"}`} />
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
