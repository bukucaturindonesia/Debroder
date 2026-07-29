"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const STICKY_TOP_PX = 96;
const STICKY_BOTTOM_GAP_PX = 32;

export function ProductStickyPurchasePanel({
  children
}: {
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [stickySafe, setStickySafe] = useState(false);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    function updateStickySafety() {
      const panelHeight = panel?.getBoundingClientRect().height || 0;
      const usableHeight = window.innerHeight - STICKY_TOP_PX - STICKY_BOTTOM_GAP_PX;
      setStickySafe(window.innerWidth >= 1024 && panelHeight > 0 && panelHeight <= usableHeight);
    }

    updateStickySafety();
    const observer = new ResizeObserver(updateStickySafety);
    observer.observe(panel);
    window.addEventListener("resize", updateStickySafety);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateStickySafety);
    };
  }, []);

  return (
    <div
      ref={panelRef}
      data-pdp-purchase-panel
      data-sticky-safe={stickySafe ? "true" : "false"}
      className={stickySafe ? "lg:sticky lg:top-24 lg:self-start" : "self-start"}
    >
      {children}
    </div>
  );
}
