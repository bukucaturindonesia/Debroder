"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode
} from "react";

const STICKY_GAP_PX = 16;

export function ProductStickyPurchasePanel({
  children
}: {
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [stickySafe, setStickySafe] = useState(false);
  const [stickyTop, setStickyTop] = useState(88);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const header = document.querySelector<HTMLElement>("[data-public-header]");

    function updateStickySafety() {
      const panelHeight = panel?.getBoundingClientRect().height || 0;
      const nextStickyTop = (header?.getBoundingClientRect().height || 72) + STICKY_GAP_PX;
      const usableHeight = window.innerHeight - nextStickyTop - STICKY_GAP_PX;
      setStickyTop(nextStickyTop);
      setStickySafe(window.innerWidth >= 1024 && panelHeight > 0 && panelHeight <= usableHeight);
    }

    updateStickySafety();
    const observer = new ResizeObserver(updateStickySafety);
    observer.observe(panel);
    if (header) observer.observe(header);
    window.addEventListener("resize", updateStickySafety);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateStickySafety);
    };
  }, []);

  return (
    <div
      ref={panelRef}
      data-pdp-sticky-gallery
      data-sticky-safe={stickySafe ? "true" : "false"}
      style={{ "--pdp-sticky-top": `${stickyTop}px` } as CSSProperties}
      className={stickySafe ? "lg:sticky lg:top-[var(--pdp-sticky-top)] lg:self-start" : "self-start"}
    >
      {children}
    </div>
  );
}
