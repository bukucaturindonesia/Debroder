"use client";

import Link from "next/link";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { ResponsivePicture } from "@/components/ResponsivePicture";
import { validJerseyHref } from "@/lib/jersey-experience";
import type { CmsBanner } from "@/lib/types";

type JerseyCarouselProps = {
  id: string;
  eyebrow?: string;
  title: string;
  description?: string;
  items: CmsBanner[];
};

function CarouselCard({ item }: { item: CmsBanner }) {
  const href = validJerseyHref(item.cta_url);
  const overlay = Math.min(.82, Math.max(.18, Number(item.overlay_strength ?? .42)));
  const media = item.media_type === "video" ? item.poster_url || item.desktop_media_url : item.desktop_media_url;
  const mobileMedia = item.media_type === "video" ? item.poster_url || media : item.mobile_media_url || media;
  const content = (
    <div className="group relative aspect-[4/5] overflow-hidden bg-[#101010]">
      <ResponsivePicture
        desktopSrc={media}
        mobileSrc={mobileMedia}
        alt={item.image_alt || item.title}
        className="h-full w-full transition-transform duration-500 group-hover:scale-[1.015]"
        desktopObjectPosition={item.object_position}
        mobileObjectPosition={item.mobile_object_position || item.object_position}
        desktopZoom={item.focal_zoom}
        mobileZoom={item.mobile_focal_zoom}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent"
        style={{ "--tw-gradient-from": `rgba(0,0,0,${overlay})` } as CSSProperties}
      />
      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
        {item.eyebrow ? <p className="jersey-neon text-[11px] font-semibold uppercase tracking-[0.18em]">{item.eyebrow}</p> : null}
        <h3 className="mt-2 font-heading text-2xl font-bold uppercase leading-[.95] tracking-[-0.025em] text-white sm:text-3xl">{item.title}</h3>
        {item.subtitle ? <p className="mt-3 line-clamp-2 text-sm leading-5 text-white/72">{item.subtitle}</p> : null}
        {href && item.cta_label ? <span className="mt-5 inline-flex min-h-10 items-center rounded-full bg-white px-4 text-xs font-semibold text-black">{item.cta_label}</span> : null}
      </div>
    </div>
  );

  return (
    <article id={item.anchor_id || undefined} className="jersey-carousel-card jersey-anchor shrink-0 snap-start">
      {href ? <Link href={href} className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#39FF88]">{content}</Link> : content}
    </article>
  );
}

export function JerseyCarousel({ id, eyebrow, title, description, items }: JerseyCarouselProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef(0);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(items.length > 1);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const update = () => {
      frameRef.current = 0;
      const max = rail.scrollWidth - rail.clientWidth;
      setCanLeft(rail.scrollLeft > 2);
      setCanRight(rail.scrollLeft < max - 2);
    };
    const schedule = () => {
      if (!frameRef.current) frameRef.current = window.requestAnimationFrame(update);
    };
    update();
    rail.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    return () => {
      rail.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
    };
  }, [items.length]);

  function move(direction: -1 | 1) {
    const rail = railRef.current;
    if (!rail) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    rail.scrollBy({ left: direction * rail.clientWidth * .82, behavior: reduced ? "auto" : "smooth" });
  }

  if (!items.length) return null;

  return (
    <section id={id} className="jersey-anchor jersey-section keep-section-bg overflow-hidden bg-[#050505] text-white">
      <div className="jersey-shell flex items-end justify-between gap-6">
        <div className="max-w-4xl">
          {eyebrow ? <p className="jersey-neon text-xs font-semibold uppercase tracking-[0.18em]">{eyebrow}</p> : null}
          <h2 className="mt-3 font-heading text-[clamp(2rem,4vw,4rem)] font-bold uppercase leading-[.95] tracking-[-0.03em]">{title}</h2>
          {description ? <p className="mt-4 max-w-2xl text-sm leading-6 text-white/64 sm:text-base">{description}</p> : null}
        </div>
        <div className="hidden shrink-0 gap-2 sm:flex">
          <button type="button" onClick={() => move(-1)} disabled={!canLeft} aria-label={`Geser ${title} ke kiri`} className="grid h-11 w-11 place-items-center rounded-full border border-white/28 text-lg text-white transition hover:border-[#39FF88] hover:text-[#39FF88] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#39FF88] disabled:cursor-not-allowed disabled:opacity-25">←</button>
          <button type="button" onClick={() => move(1)} disabled={!canRight} aria-label={`Geser ${title} ke kanan`} className="grid h-11 w-11 place-items-center rounded-full border border-white/28 text-lg text-white transition hover:border-[#39FF88] hover:text-[#39FF88] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#39FF88] disabled:cursor-not-allowed disabled:opacity-25">→</button>
        </div>
      </div>
      <div ref={railRef} tabIndex={0} aria-label={title} className="jersey-carousel-rail no-scrollbar mt-[var(--jersey-heading-gap)] flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain pb-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#39FF88]">
        {items.map((item) => <CarouselCard key={item.id || `${item.section_key}-${item.sort_order}`} item={item} />)}
      </div>
    </section>
  );
}
