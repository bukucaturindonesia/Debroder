"use client";

import { useCallback, useEffect, useId, useRef, useState, type UIEvent } from "react";
import { PublicProductCard } from "@/components/PublicProductCard";
import type { Product } from "@/lib/types";

export function ProductRecommendationRail({
  title,
  products
}: {
  title: string;
  products: Product[];
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const railId = useId();
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const updateEdges = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    setAtStart(rail.scrollLeft <= 2);
    setAtEnd(rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    updateEdges();
    const observer = new ResizeObserver(updateEdges);
    observer.observe(rail);
    return () => observer.disconnect();
  }, [updateEdges]);

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    const rail = event.currentTarget;
    setAtStart(rail.scrollLeft <= 2);
    setAtEnd(rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 2);
  }

  function move(direction: -1 | 1) {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({
      left: direction * Math.max(rail.clientWidth * 0.82, 280),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth"
    });
  }

  return (
    <section className="bg-white py-12 md:py-16 lg:py-20" aria-labelledby={`${railId}-title`}>
      <div className="section-shell">
        <div className="flex items-end justify-between gap-6">
          <h2 id={`${railId}-title`} className="public-section-title">{title}</h2>
          {products.length > 2 ? (
            <div className="hidden items-center gap-2 md:flex" aria-label={`Navigasi ${title}`}>
              <button
                type="button"
                aria-controls={railId}
                aria-label={`${title} sebelumnya`}
                disabled={atStart}
                onClick={() => move(-1)}
                className="grid h-12 w-12 place-items-center rounded-full border border-black/15 text-xl outline-none transition hover:border-black focus-visible:ring-2 focus-visible:ring-experience-focus focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <span aria-hidden="true">‹</span>
              </button>
              <button
                type="button"
                aria-controls={railId}
                aria-label={`${title} berikutnya`}
                disabled={atEnd}
                onClick={() => move(1)}
                className="grid h-12 w-12 place-items-center rounded-full border border-black/15 text-xl outline-none transition hover:border-black focus-visible:ring-2 focus-visible:ring-experience-focus focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <span aria-hidden="true">›</span>
              </button>
            </div>
          ) : null}
        </div>
        <div
          ref={railRef}
          id={railId}
          onScroll={handleScroll}
          className="no-scrollbar mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-2 lg:gap-6"
          aria-label={title}
        >
          {products.map((product) => (
            <div
              key={product.id || product.slug || product.nama}
              className="w-[72vw] max-w-[300px] shrink-0 snap-start sm:w-[42vw] md:w-[30vw] lg:w-[23vw]"
            >
              <PublicProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
