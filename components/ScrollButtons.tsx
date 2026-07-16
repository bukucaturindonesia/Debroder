"use client";

import { useEffect, useState } from "react";

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d={direction === "left" ? "m14.5 6-6 6 6 6" : "m9.5 6 6 6-6 6"} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ScrollButtons({
  containerId,
  largeTargets = false
}: {
  containerId: string;
  largeTargets?: boolean;
}) {
  const [scrollState, setScrollState] = useState({ previous: false, next: false });

  useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const update = () => {
      const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
      setScrollState({
        previous: container.scrollLeft > 1,
        next: container.scrollLeft < maxScroll - 1
      });
    };

    update();
    container.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      container.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [containerId]);

  function scrollByCard(direction: "prev" | "next") {
    const container = document.getElementById(containerId);
    if (!container) return;

    const firstCard = container.firstElementChild as HTMLElement | null;
    const styles = window.getComputedStyle(container);
    const gap = Number.parseFloat(styles.columnGap || styles.gap || "0") || 0;
    const amount = firstCard
      ? Math.round(firstCard.getBoundingClientRect().width + gap)
      : Math.max(280, Math.round(container.clientWidth * 0.82));
    container.scrollBy({ left: direction === "next" ? amount : -amount, behavior: "smooth" });
  }

  const buttonClass = `grid ${largeTargets ? "h-12 w-12" : "h-10 w-10"} place-items-center rounded-full bg-[#f2f2ef] text-[#111] transition duration-200 hover:bg-[#111] hover:text-white disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-[#f2f2ef] disabled:hover:text-[#111]`;

  return (
    <div className="flex items-center gap-2" aria-label="Kontrol carousel">
      <button type="button" className={buttonClass} aria-label="Geser sebelumnya" disabled={!scrollState.previous} onClick={() => scrollByCard("prev")}>
        <Chevron direction="left" />
      </button>
      <button type="button" className={buttonClass} aria-label="Geser berikutnya" disabled={!scrollState.next} onClick={() => scrollByCard("next")}>
        <Chevron direction="right" />
      </button>
    </div>
  );
}
