"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ResponsivePicture } from "@/components/ResponsivePicture";
import { fallbackImages } from "@/lib/fallback-data";
import type { HeroBanner } from "@/lib/types";

const SLIDE_DURATION = 5600;

function cleanHeroText(value?: string | null) {
  const text = (value || "").trim();
  if (!text || text === "." || text === "-" || text === "—") return "";
  return text;
}


function safeHeroCta(href: string, text: string) {
  const normalizedHref = href.toLowerCase();
  const normalizedText = text.toLowerCase();
  const directOrder = normalizedHref.includes("wa.me") || normalizedHref.includes("whatsapp") || normalizedHref === "/order" || normalizedHref.includes("pesan");
  const orderText = /pesan|order|beli/.test(normalizedText);

  if (directOrder || orderText) {
    return { href: "/koleksi", text: "Lihat Koleksi" };
  }

  return { href, text };
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
  const [progress, setProgress] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const progressRef = useRef(0);
  const total = slides.length;

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    if (total <= 1 || paused || reducedMotion) return;

    const tick = 50 / SLIDE_DURATION;
    const timer = window.setInterval(() => {
      const nextProgress = progressRef.current + tick;
      if (nextProgress >= 1) {
        progressRef.current = 0;
        setProgress(0);
        setActiveIndex((current) => (current + 1) % total);
        return;
      }
      progressRef.current = nextProgress;
      setProgress(nextProgress);
    }, 50);

    return () => window.clearInterval(timer);
  }, [paused, reducedMotion, total]);

  if (!slides.length) return null;

  function resetProgress() {
    progressRef.current = 0;
    setProgress(0);
  }

  function goNext() {
    setActiveIndex((current) => (current + 1) % total);
    resetProgress();
  }

  function goPrev() {
    setActiveIndex((current) => (current - 1 + total) % total);
    resetProgress();
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
      className="hero-section relative h-[clamp(440px,70vh,540px)] w-full overflow-hidden bg-[#04160f] sm:h-[540px] lg:h-[calc(100svh-170px)] lg:min-h-[460px] lg:max-h-[600px]"
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
        const ctaText = cleanHeroText(slide.cta_text) || cleanHeroText(slide.cta_primary_text);
        const ctaHref = slide.cta_link || slide.cta_primary_link || "/koleksi";
        const cta = ctaText ? safeHeroCta(ctaHref, ctaText) : null;
        const hasCopy = Boolean(badge || headline || subtitle || cta);
        const desktopVideo = slide.desktop_video_url || slide.hero_video_url || slide.video_url;
        const mobileVideo = slide.mobile_video_url || desktopVideo;
        const desktopPosition = slide.object_position || "center center";
        const mobilePosition = slide.mobile_object_position || desktopPosition;
        const textAlignment = slide.text_position === "center" ? "mx-auto text-center" : slide.text_position === "right" ? "ml-auto text-right" : "";

        return (
          <article
            key={`${slide.id || index}-${headline || slide.image_url || "hero"}`}
            className="relative h-full w-full shrink-0"
            aria-hidden={!active}
          >
            <div className={`absolute inset-0 transition-transform duration-[5600ms] ease-out ${active && !paused && !reducedMotion ? "scale-[1.02]" : "scale-100"}`}>
              {desktopVideo ? (
                <video autoPlay muted loop playsInline preload={index === 0 ? "metadata" : "none"} className="h-full w-full object-cover" style={{ objectPosition: desktopPosition }}>
                  {mobileVideo ? <source src={mobileVideo} media="(max-width: 767px)" /> : null}
                  <source src={desktopVideo} />
                </video>
              ) : (
                <ResponsivePicture
                  desktopSrc={slide.image_url || "/images/debroder/editorial/hero-apparel-wide.webp"}
                  mobileSrc={slide.mobile_image_url || "/images/debroder/editorial/hero-apparel-mobile.webp"}
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

            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(1,9,6,.58)_0%,rgba(1,9,6,.34)_36%,rgba(1,9,6,.04)_68%,rgba(1,9,6,.10)_100%),linear-gradient(0deg,rgba(1,9,6,.34)_0%,rgba(1,9,6,0)_46%)] sm:bg-[linear-gradient(90deg,rgba(1,9,6,.62)_0%,rgba(1,9,6,.36)_38%,rgba(1,9,6,.03)_70%,rgba(1,9,6,.08)_100%),linear-gradient(0deg,rgba(1,9,6,.30)_0%,rgba(1,9,6,0)_44%)]" />
            {hasCopy ? (
              <div className="absolute inset-x-0 bottom-16 z-10 sm:bottom-14 lg:bottom-16">
                <div className="section-shell">
                  <div className={`max-w-[620px] text-white ${textAlignment}`}>
                    {badge ? (
                      <p className="text-[15px] font-medium uppercase tracking-normal text-white/75 sm:text-[17px]">
                        {badge}
                      </p>
                    ) : null}
                    {headline ? (
                      index === 0 ? (
                        <h1 className="hero-title mt-2 whitespace-pre-line text-[clamp(2.625rem,12vw,3.25rem)] sm:text-[4rem] lg:text-[clamp(4rem,6vw,5.5rem)]">
                          {headline}
                        </h1>
                      ) : (
                        <h2 className="hero-title mt-2 whitespace-pre-line text-[clamp(2.625rem,12vw,3.25rem)] sm:text-[4rem] lg:text-[clamp(4rem,6vw,5.5rem)]">
                          {headline}
                        </h2>
                      )
                    ) : null}
                    {subtitle ? (
                      <p className="mt-2.5 max-w-lg whitespace-pre-line text-[17px] leading-[1.25] text-white/80 sm:text-xl">
                        {subtitle}
                      </p>
                    ) : null}
                    {cta ? (
                      <a href={cta.href} className="cta mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 py-3 text-sm text-[#111] transition duration-200 hover:bg-[#e9eee9]">
                        {cta.text}
                        <ArrowIcon direction="right" />
                      </a>
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
          <div className="ml-1 hidden items-center gap-2 text-[11px] font-semibold tabular-nums sm:flex">
            <span>{String(activeIndex + 1).padStart(2, "0")}</span>
            <span className="h-px w-20 overflow-hidden bg-white/35">
              <span className="block h-full bg-white" style={{ width: `${Math.max(2, progress * 100)}%` }} />
            </span>
            <span className="text-white/55">{String(total).padStart(2, "0")}</span>
          </div>
        </div>
      ) : null}
    </section>
  );
}
