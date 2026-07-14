"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { type CartProductInput, useCart } from "@/components/CartProvider";
import type { ProductRecommendation, RecommendationItem } from "@/lib/recommendation-rules";

function recommendationCartItem(item: RecommendationItem, sourceProduct: string): CartProductInput {
  return {
    id: `recommendation:${sourceProduct}:${item.name}`,
    name: item.name,
    category: item.category,
    priceLabel: "Konfirmasi admin",
    href: item.href
  };
}

export function ProductRecommendationDrawer({
  recommendation,
  sourceProduct
}: {
  recommendation: ProductRecommendation;
  sourceProduct: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { addItem } = useCart();

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      <section className="mt-7 border-y border-brand-softGray py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-charcoal/45">Rekomendasi</p>
            <h2 className="mt-2 text-lg font-semibold">{recommendation.title}</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-brand-charcoal/60">{recommendation.description}</p>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-brand-charcoal px-5 text-sm font-semibold transition hover:bg-brand-charcoal hover:text-white"
          >
            {recommendation.ctaLabel}
          </button>
        </div>
      </section>

      <div
        className={`fixed inset-0 z-[170] bg-black/45 transition ${isOpen ? "visible opacity-100" : "invisible opacity-0"}`}
        onMouseDown={(event) => event.target === event.currentTarget && setIsOpen(false)}
      />
      <aside
        className={`fixed bottom-0 right-0 z-[180] flex max-h-[88dvh] w-full flex-col bg-white shadow-[0_-20px_60px_rgba(0,0,0,0.18)] transition-transform duration-300 sm:bottom-auto sm:top-0 sm:h-dvh sm:max-h-none sm:max-w-md sm:shadow-[-18px_0_50px_rgba(0,0,0,0.18)] ${isOpen ? "translate-y-0 sm:translate-x-0" : "translate-y-full sm:translate-x-full sm:translate-y-0"}`}
        role="dialog"
        aria-modal="true"
        aria-label={recommendation.title}
      >
        <div className="flex items-start justify-between gap-4 border-b border-black/10 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">Lengkapi pesanan</p>
            <h2 className="mt-1 text-2xl font-semibold leading-tight">{recommendation.title}</h2>
            <p className="mt-2 text-sm leading-6 text-black/55">{recommendation.description}</p>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Tutup rekomendasi"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-black/10 text-xl leading-none transition hover:bg-[#f5f5ef]"
          >
            x
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid gap-5">
            {recommendation.groups.map((group) => (
              <section key={group.title}>
                <h3 className="text-sm font-semibold">{group.title}</h3>
                <div className="mt-3 grid gap-3">
                  {group.items.map((item) => (
                    <article key={`${group.title}-${item.name}`} className="rounded-lg border border-black/10 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0f5a36]">{item.category}</p>
                          <h4 className="mt-1 text-base font-semibold leading-snug">{item.name}</h4>
                          <p className="mt-2 text-sm leading-6 text-black/55">{item.detail}</p>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <Link
                          href={item.href}
                          onClick={() => setIsOpen(false)}
                          className="inline-flex min-h-10 items-center justify-center rounded-full border border-black/10 px-3 text-xs font-semibold transition hover:border-black"
                        >
                          Lihat
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            addItem(recommendationCartItem(item, sourceProduct), "additional");
                            setIsOpen(false);
                          }}
                          className="inline-flex min-h-10 items-center justify-center rounded-full bg-black px-3 text-xs font-semibold text-white transition hover:bg-black/75"
                        >
                          Tambah
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}
