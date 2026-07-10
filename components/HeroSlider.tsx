"use client";

import { useEffect, useMemo, useState } from "react";
import { ResponsivePicture } from "@/components/ResponsivePicture";
import { fallbackImages } from "@/lib/fallback-data";
import type { HeroBanner } from "@/lib/types";

const SLIDE_DURATION = 5600;

function cleanHeroText(value?: string | null) {
  const text = (value || "").trim();
  if (!text || text === "." || text === "-" || text === "—") return "";
  return text;
}


function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d={direction === "left" ? "m14.5 6-6 6 6 6" : "m9.5 6 6 6-6 6"} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlayPauseIcon({ paused }: { paused: boolean }) {
  return paused ? (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="m8 5 11 7-11 7V5Z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M7 5h3v14H7zM14 5h3v14h-3z" />
    </svg>
  );
}

export function HeroSlider({ heroes }: { heroes: HeroBanner[] }) {
  const slides = useMemo(
    () => heroes.filter((hero) => hero.status_aktif !== false),
    [heroes]
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const total = slides.length;

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (total <= 1 || paused || reducedMotion) return;

    const timer = window.setTimeout(() => {
      setActiveIndex((current) => (current + 1) % total);
    }, SLIDE_DURATION);

    return () => window.clearTimeout(timer);
  }, [activeIndex, paused, reducedMotion, total]);

  if (!slides.length) return null;

  function goNext() {
    setActiveIndex((current) => (current + 1) % total);
  }

  function goPrev() {
    setActiveIndex((current) => (current - 1 + total) % total);
  }

  function handleTouchEnd(x: number) {
    if (touchStart === null || total <= 1) return;
    const delta = touchStart - x;
    if (Math.abs(delta) > 44) {
      if (delta > 0) goNext();
      else goPrev();
    }
    setTouchStart(null);
  }

  return (
    <section
      id="beranda"
      className="hero-section relative h-[calc(100svh-64px)] min-h-[560px] w-full overflow-hidden bg-[#04160f] md:h-[calc(100svh-78px)] md:min-h-[600px]"
      aria-roledescription="carousel"
      aria-label="Koleksi utama DEBRODER"
      onTouchStart={(event) => setTouchStart(event.touches[0].clientX)}
      onTouchEnd={(event) => handleTouchEnd(event.changedTouches[0].clientX)}
    >
      <div
        className="flex h-full w-full transition-transform duration-700 ease-in-out"
        style={{ transform: `translate3d(-${activeIndex * 100}%, 0, 0)` }}
      >
      {slides.map((slide, index) => {
        const active = index === activeIndex;
        const badge = cleanHeroText(slide.badge);
        const headline = cleanHeroText(slide.headline) || cleanHeroText(slide.title);
        const subtitle = cleanHeroText(slide.subheadline) || cleanHeroText(slide.subtitle);
        const primaryText = cleanHeroText(slide.cta_text) || cleanHeroText(slide.cta_primary_text);
        const primaryHref = slide.cta_link || slide.cta_primary_link || "/koleksi";
        const secondaryText = cleanHeroText(slide.cta_secondary_text);
        const secondaryHref = slide.cta_secondary_link || "/cara-order";
        const hasCopy = Boolean(badge || headline || subtitle || primaryText || secondaryText);
        const desktopVideo = slide.desktop_video_url || slide.hero_video_url || slide.video_url;
        const mobileVideo = slide.mobile_video_url || desktopVideo;
        const desktopPosition = slide.object_position || "center center";
        const mobilePosition = slide.mobile_object_position || desktopPosition;
        // Hero copy is intentionally centered as one compact premium text block.

        return (
          <article
            key={`${slide.id || index}-${headline || slide.image_url || "hero"}`}
            className="relative h-full w-full shrink-0"
            aria-hidden={!active}
          >
            <div className="absolute inset-0">
              {desktopVideo ? (
                <video autoPlay muted loop playsInline preload={index === 0 ? "metadata" : "none"} className="h-full w-full object-cover" style={{ objectPosition: desktopPosition }}>
                  {mobileVideo ? <source src={mobileVideo} media="(max-width: 767px)" /> : null}
                  <source src={desktopVideo} />
                </video>
              ) : (
                <ResponsivePicture
                  desktopSrc={slide.image_url || "/brand/debroder/social-preview.png"}
                  mobileSrc={slide.mobile_image_url || slide.image_url || "/brand/debroder/social-preview.png"}
                  alt={slide.image_alt || headline.replace(/\n/g, " ") || "Hero DEBRODER"}
                  priority={index === 0}
                  className="h-full w-full object-cover"
                  desktopObjectPosition={desktopPosition}
                  mobileObjectPosition={mobilePosition}
                  desktopZoom={slide.focal_zoom}
                  mobileZoom={slide.mobile_focal_zoom}
                  fallbackSrc={fallbackImages.hero}
                  objectFit={slide.object_fit || "cover"}
                />
              )}
            </div>

            <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(0,0,0,.44)_0%,rgba(0,0,0,.12)_48%,rgba(0,0,0,.08)_100%)]" />
            {hasCopy ? (
              <div className="absolute inset-x-0 bottom-[10%] z-10 sm:bottom-[11%] lg:bottom-[12%]">
                <div className="section-shell">
                  <div className="hero-content mx-auto max-w-[1120px] text-white">
                    {badge ? (
                      <p className="text-[15px] font-medium uppercase tracking-normal text-white/75 sm:text-[17px]">
                        {badge}
                      </p>
                    ) : null}
                    {headline ? (
                      index === 0 ? (
                        <h1 className="hero-title mt-2 max-w-[min(92vw,1080px)] whitespace-pre-line text-center text-[clamp(2.625rem,12vw,3.25rem)] sm:text-[4rem] lg:text-[clamp(4rem,6vw,5.5rem)]">
                          {headline}
                        </h1>
                      ) : (
                        <h2 className="hero-title mt-2 max-w-[min(92vw,1080px)] whitespace-pre-line text-center text-[clamp(2.625rem,12vw,3.25rem)] sm:text-[4rem] lg:text-[clamp(4rem,6vw,5.5rem)]">
                          {headline}
                        </h2>
                      )
                    ) : null}
                    {subtitle ? (
                      <p className="hero-subtitle mt-3 max-w-[680px] whitespace-pre-line text-[17px] leading-[1.4] text-white/85 sm:text-xl sm:leading-[1.42]">
                        {subtitle}
                      </p>
                    ) : null}
                    {primaryText || secondaryText ? (
                      <div className="hero-actions mt-5 flex flex-wrap justify-center gap-2">
                        {primaryText ? (
                          <a href={primaryHref} className="cta inline-flex min-h-11 items-center justify-center rounded-full bg-white px-5 py-3 text-sm text-[#111] transition duration-200 hover:bg-[#e9e9e9]">
                            {primaryText}
                          </a>
                        ) : null}
                        {secondaryText ? (
                          <a href={secondaryHref} className="cta inline-flex min-h-11 items-center justify-center rounded-full bg-white px-5 py-3 text-sm text-[#111] transition duration-200 hover:bg-[#e9e9e9]">
                            {secondaryText}
                          </a>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </article>
        );
      })}
      </div>

      {total > 1 ? (
        <div className="absolute bottom-5 right-5 z-30 flex items-center gap-2 text-white sm:bottom-10 sm:right-10 lg:right-12">
          <button type="button" onClick={() => setPaused((current) => !current)} aria-label={paused ? "Putar slider" : "Jeda slider"} className="grid h-10 w-10 place-items-center rounded-full border border-white/25 bg-black/28 backdrop-blur-md transition hover:bg-white hover:text-[#111]">
            <PlayPauseIcon paused={paused} />
          </button>
          <button type="button" onClick={goPrev} aria-label="Slide sebelumnya" className="grid h-10 w-10 place-items-center rounded-full border border-white/25 bg-black/28 backdrop-blur-md transition hover:bg-white hover:text-[#111]">
            <ArrowIcon direction="left" />
          </button>
          <button type="button" onClick={goNext} aria-label="Slide berikutnya" className="grid h-10 w-10 place-items-center rounded-full border border-white/25 bg-black/28 backdrop-blur-md transition hover:bg-white hover:text-[#111]">
            <ArrowIcon direction="right" />
          </button>
          <div className="ml-1 hidden items-center gap-2 sm:flex" aria-label={`Slide ${activeIndex + 1} dari ${total}`}>
            {slides.map((slide, index) => (
              <button
                key={slide.id || index}
                type="button"
                aria-label={`Buka slide ${index + 1}`}
                onClick={() => setActiveIndex(index)}
                className={`h-1.5 rounded-full transition-[width,background-color] duration-200 ${index === activeIndex ? "w-7 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"}`}
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
