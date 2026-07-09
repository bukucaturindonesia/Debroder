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
  // Hero Nike Style V2: CTA harus mengikuti teks dan link dari admin.
  // Tidak lagi diubah otomatis menjadi “Lihat Koleksi”.
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
      className="hero-section relative h-[clamp(500px,78vh,680px)] w-full overflow-hidden bg-black sm:h-[620px] lg:h-[calc(100svh-104px)] lg:min-h-[560px] lg:max-h-[820px]"
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
        const textAlignment = slide.text_position === "right" ? "ml-auto text-right" : slide.text_position === "left" ? "mr-auto text-left" : "mx-auto text-center";

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

            {hasCopy ? (
              <div className="absolute inset-x-0 bottom-[9%] z-10 sm:bottom-[10%] lg:bottom-[9%] xl:bottom-[8%]">
                <div className="section-shell">
                  <div className={`max-w-[1040px] text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.22)] ${textAlignment}`}>
                    {badge ? (
                      <p className="text-[14px] font-semibold leading-none tracking-[-0.01em] text-white sm:text-[18px] lg:text-[20px]">
                        {badge}
                      </p>
                    ) : null}
                    {headline ? (
                      index === 0 ? (
                        <h1 className="mt-3 whitespace-pre-line text-balance text-[clamp(3rem,11vw,4.7rem)] font-black uppercase leading-[0.92] tracking-[-0.04em] sm:text-[clamp(4.7rem,8.2vw,6.4rem)] lg:text-[clamp(5.25rem,6.9vw,7rem)] xl:text-[clamp(5.6rem,6.4vw,7.35rem)]">
                          {headline}
                        </h1>
                      ) : (
                        <h2 className="mt-3 whitespace-pre-line text-balance text-[clamp(3rem,11vw,4.7rem)] font-black uppercase leading-[0.92] tracking-[-0.04em] sm:text-[clamp(4.7rem,8.2vw,6.4rem)] lg:text-[clamp(5.25rem,6.9vw,7rem)] xl:text-[clamp(5.6rem,6.4vw,7.35rem)]">
                          {headline}
                        </h2>
                      )
                    ) : null}
                    {subtitle ? (
                      <p className={`mt-5 max-w-[760px] whitespace-pre-line text-pretty text-[16px] font-medium leading-[1.38] text-white sm:text-[21px] lg:text-[24px] ${textAlignment.includes("text-center") ? "mx-auto" : textAlignment.includes("text-right") ? "ml-auto" : "mr-auto"}`}>
                        {subtitle}
                      </p>
                    ) : null}
                    {cta ? (
                      <a href={cta.href} className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full bg-white px-7 py-3 text-[16px] font-semibold text-[#111] shadow-none transition duration-200 hover:bg-[#e9eee9] sm:min-h-12 sm:px-8 sm:text-[18px]">
                        {cta.text}
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
