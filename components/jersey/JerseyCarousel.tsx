"use client";

import Link from "next/link";
import { useRef } from "react";
import { ResponsivePicture } from "@/components/ResponsivePicture";
import { safeJerseyHref } from "@/lib/jersey-experience";
import type { CmsBanner } from "@/lib/types";

export function JerseyCarousel({ items }: { items: CmsBanner[] }) {
  const railRef = useRef<HTMLDivElement>(null);

  function move(direction: -1 | 1) {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({ left: direction * Math.max(280, rail.clientWidth * 0.82), behavior: "smooth" });
  }

  return (
    <section id="team-styles" className="scroll-mt-14 bg-white py-14 sm:py-16 lg:py-20">
      <div className="section-shell">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#063D24]">Team / Style</p>
            <h2 className="mt-2 font-heading text-4xl font-bold uppercase tracking-[-0.025em] sm:text-5xl">Dibuat untuk Cara Tim Anda Bergerak</h2>
          </div>
          <div className="hidden gap-2 sm:flex">
            <button type="button" onClick={() => move(-1)} aria-label="Geser carousel ke kiri" className="grid h-11 w-11 place-items-center rounded-full border border-black/15 text-xl transition hover:border-black">←</button>
            <button type="button" onClick={() => move(1)} aria-label="Geser carousel ke kanan" className="grid h-11 w-11 place-items-center rounded-full border border-black/15 text-xl transition hover:border-black">→</button>
          </div>
        </div>
      </div>
      <div
        ref={railRef}
        className="no-scrollbar mt-8 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-5 pb-2 [scroll-padding-left:20px] sm:gap-4 lg:px-10 xl:px-16"
      >
        {items.map((item) => (
          <article key={item.id || `${item.section_key}-${item.sort_order}`} className="w-[76vw] max-w-[460px] shrink-0 snap-start sm:w-[42vw] lg:w-[30vw]">
            <Link href={safeJerseyHref(item.cta_url, "/jersey/shop")} className="group block">
              <div className="aspect-[4/5] overflow-hidden bg-[#efefec]">
                <ResponsivePicture
                  desktopSrc={item.desktop_media_url}
                  mobileSrc={item.mobile_media_url || item.desktop_media_url}
                  alt={item.image_alt || item.title}
                  className="h-full w-full transition duration-500 group-hover:scale-[1.02]"
                  desktopObjectPosition={item.object_position}
                  mobileObjectPosition={item.mobile_object_position || item.object_position}
                  desktopZoom={item.focal_zoom}
                  mobileZoom={item.mobile_focal_zoom}
                />
              </div>
              <h3 className="mt-4 text-xl font-semibold tracking-[-0.02em] sm:text-2xl">{item.title}</h3>
              {item.subtitle ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-black/60">{item.subtitle}</p> : null}
              <span className="mt-4 inline-flex text-sm font-semibold underline-offset-4 group-hover:underline">{item.cta_label || "Jelajahi"}</span>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
