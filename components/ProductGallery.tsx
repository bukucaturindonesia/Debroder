"use client";

import { useEffect, useMemo, useRef, useState, type UIEvent } from "react";
import { SafeImage } from "@/components/SafeImage";
import { useOptionalProductVariantGallery } from "@/components/ProductVariantGalleryContext";
import { fallbackImages } from "@/lib/fallback-data";
import { PRODUCT_GALLERY_LIMIT, PRODUCT_IMAGE_SLOTS, uniqueImageUrls } from "@/lib/product-gallery";
import type { FocalPoint } from "@/lib/types";

export function ProductGallery({ images, alt, focal }: { images: string[]; alt: string; focal?: FocalPoint }) {
  const variantGallery = useOptionalProductVariantGallery();
  const sourceImages = variantGallery?.galleryImages?.length ? variantGallery.galleryImages : images;
  const gallery = useMemo(() => uniqueImageUrls(sourceImages).slice(0, PRODUCT_GALLERY_LIMIT), [sourceImages]);
  const resolvedImages = gallery.length ? gallery : [fallbackImages.product];
  const mobileTrackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const galleryKey = resolvedImages.join("|");

  useEffect(() => {
    setActiveIndex(0);
    setLightboxIndex(null);
    mobileTrackRef.current?.scrollTo({ left: 0, behavior: "smooth" });
  }, [galleryKey]);

  function handleMobileScroll(event: UIEvent<HTMLDivElement>) {
    const track = event.currentTarget;
    if (!track.clientWidth) return;
    const nextIndex = Math.round(track.scrollLeft / track.clientWidth);
    setActiveIndex(Math.max(0, Math.min(resolvedImages.length - 1, nextIndex)));
  }

  function scrollToImage(index: number) {
    const track = mobileTrackRef.current;
    if (!track) return;
    track.scrollTo({ left: track.clientWidth * index, behavior: "smooth" });
    setActiveIndex(index);
  }

  return (
    <div className="min-w-0">
      <div className="lg:hidden">
        <div
          ref={mobileTrackRef}
          onScroll={handleMobileScroll}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
          aria-label="Galeri foto produk"
        >
          {resolvedImages.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => setLightboxIndex(index)}
              aria-label={`Buka ${PRODUCT_IMAGE_SLOTS[index]?.label || `foto ${index + 1}`}`}
              className="product-image-frame relative aspect-[4/5] min-w-full shrink-0 snap-center overflow-hidden text-left"
            >
              <SafeImage
                src={image}
                fallbackSrc={fallbackImages.product}
                alt={`${alt} ${PRODUCT_IMAGE_SLOTS[index]?.shortLabel || index + 1}`}
                fill
                priority={index === 0}
                className="object-cover"
                objectFit="cover"
                objectPosition="center center"
                focalX={index === 0 ? focal?.focal_x : undefined}
                focalY={index === 0 ? focal?.focal_y : undefined}
                zoom={index === 0 ? focal?.zoom || 1 : 1}
                sizes="100vw"
              />
              <span className="absolute bottom-3 right-3 rounded-full bg-white/92 px-3 py-1.5 text-xs font-semibold text-brand-charcoal">
                {index + 1} / {resolvedImages.length}
              </span>
            </button>
          ))}
        </div>
        {resolvedImages.length > 1 ? (
          <div className="mt-3 flex items-center justify-center gap-2" aria-label="Pilih foto produk">
            {resolvedImages.map((image, index) => (
              <button
                key={`dot-${image}-${index}`}
                type="button"
                onClick={() => scrollToImage(index)}
                aria-label={`Tampilkan foto ${index + 1}`}
                aria-current={activeIndex === index ? "true" : undefined}
                className={`h-2 rounded-full transition-all ${activeIndex === index ? "w-6 bg-brand-charcoal" : "w-2 bg-brand-charcoal/25"}`}
              />
            ))}
          </div>
        ) : null}
      </div>

      <div className="hidden grid-cols-2 gap-2 lg:grid">
        {resolvedImages.map((image, index) => (
          <button
            key={`${image}-${index}`}
            type="button"
            onClick={() => setLightboxIndex(index)}
            aria-label={`Perbesar ${PRODUCT_IMAGE_SLOTS[index]?.label || `foto ${index + 1}`}`}
            className="product-image-frame group relative aspect-[4/5] overflow-hidden text-left"
          >
            <SafeImage
              src={image}
              fallbackSrc={fallbackImages.product}
              alt={`${alt} ${PRODUCT_IMAGE_SLOTS[index]?.shortLabel || index + 1}`}
              fill
              priority={index === 0}
              className="object-cover transition duration-500 group-hover:scale-[1.015]"
              objectFit="cover"
              objectPosition="center center"
              focalX={index === 0 ? focal?.focal_x : undefined}
              focalY={index === 0 ? focal?.focal_y : undefined}
              zoom={index === 0 ? focal?.zoom || 1 : 1}
              sizes="(min-width: 1280px) 34vw, 42vw"
            />
            <span className="absolute bottom-3 left-3 bg-white/92 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[.08em] text-brand-charcoal opacity-0 transition group-hover:opacity-100">
              {PRODUCT_IMAGE_SLOTS[index]?.shortLabel || `Foto ${index + 1}`}
            </span>
          </button>
        ))}
      </div>

      {lightboxIndex !== null ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Pratinjau foto produk"
          className="fixed inset-0 z-[100] grid place-items-center bg-black/88 p-3 sm:p-8"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            aria-label="Tutup galeri"
            className="absolute right-4 top-4 z-20 grid h-11 w-11 place-items-center rounded-full bg-white text-xl font-medium text-brand-charcoal"
          >
            ×
          </button>
          {resolvedImages.length > 1 ? (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setLightboxIndex((current) => current === null ? 0 : (current - 1 + resolvedImages.length) % resolvedImages.length);
                }}
                aria-label="Foto sebelumnya"
                className="absolute left-3 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white text-xl text-brand-charcoal sm:left-6"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setLightboxIndex((current) => current === null ? 0 : (current + 1) % resolvedImages.length);
                }}
                aria-label="Foto berikutnya"
                className="absolute right-3 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white text-xl text-brand-charcoal sm:right-6"
              >
                ›
              </button>
            </>
          ) : null}
          <div className="relative h-[88vh] w-full max-w-5xl" onClick={(event) => event.stopPropagation()}>
            <SafeImage
              src={resolvedImages[lightboxIndex]}
              fallbackSrc={fallbackImages.product}
              alt={`${alt} diperbesar`}
              fill
              priority
              className="object-contain"
              objectFit="contain"
              sizes="100vw"
            />
            <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/65 px-3 py-1.5 text-xs font-semibold text-white">
              {lightboxIndex + 1} / {resolvedImages.length}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
