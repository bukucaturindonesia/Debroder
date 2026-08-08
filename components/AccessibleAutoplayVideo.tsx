"use client";

import { useEffect, useRef, useState } from "react";

type AccessibleAutoplayVideoProps = {
  src: string;
  mobileSrc?: string | null;
  poster?: string | null;
  label: string;
  className?: string;
};

export function AccessibleAutoplayVideo({
  src,
  mobileSrc,
  poster,
  label,
  className = ""
}: AccessibleAutoplayVideoProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(false);
  const [motionAllowed, setMotionAllowed] = useState(false);
  const [manuallyPaused, setManuallyPaused] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => {
      setMotionAllowed(!query.matches);
      if (query.matches) setManuallyPaused(false);
    };

    updatePreference();
    query.addEventListener("change", updatePreference);
    return () => query.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    if (!("IntersectionObserver" in window)) {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.2 }
    );
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const shouldPlay = inView && motionAllowed && !manuallyPaused;
    if (!shouldPlay) {
      video.pause();
      return;
    }

    void video.play().catch(() => undefined);
  }, [inView, manuallyPaused, motionAllowed]);

  function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;

    if (!video.paused) {
      setManuallyPaused(true);
      return;
    }

    setMotionAllowed(true);
    setManuallyPaused(false);
    void video.play().catch(() => undefined);
  }

  return (
    <div ref={wrapperRef} className={`accessible-autoplay-video relative h-full w-full ${className}`.trim()} role="group" aria-label={label}>
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        poster={poster || undefined}
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      >
        {mobileSrc ? <source src={mobileSrc} media="(max-width: 639px)" /> : null}
        <source src={src} />
      </video>
      <button
        type="button"
        className="motion-video-control absolute bottom-4 right-4 z-10 inline-flex min-h-12 items-center justify-center rounded-full border border-white/40 bg-black/55 px-4 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-[#111]"
        onClick={togglePlayback}
        aria-label={playing ? `Jeda ${label}` : `Putar ${label}`}
      >
        {playing ? "Jeda" : "Putar"}
      </button>
    </div>
  );
}
