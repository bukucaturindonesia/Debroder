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
  const displayedIndex = Math.min(activeIndex, resolvedImages.length - 1);

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
                className="grid h-12 w-12 place-items-center rounded-full"
              >
                <span
                  aria-hidden="true"
                  className={`h-2 rounded-full transition-all ${activeIndex === index ? "w-6 bg-brand-charcoal" : "w-2 bg-brand-charcoal/25"}`}
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="hidden min-w-0 grid-cols-[72px_minmax(0,1fr)] gap-3 lg:grid xl:grid-cols-[80px_minmax(0,1fr)] xl:gap-4">
        <div
          className="no-scrollbar flex max-h-[calc(100vh-7.5rem)] flex-col gap-2 overflow-y-auto overscroll-contain"
          aria-label="Pilih foto produk"
        >
          {resolvedImages.map((image, index) => {
            const selected = displayedIndex === index;
            return (
              <button
                key={`thumbnail-${image}-${index}`}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Tampilkan ${PRODUCT_IMAGE_SLOTS[index]?.label || `foto ${index + 1}`}`}
                aria-pressed={selected}
                className={`product-image-frame relative aspect-[4/5] min-h-12 w-full shrink-0 overflow-hidden outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-experience-focus focus-visible:ring-offset-2 ${
                  selected ? "ring-2 ring-[#111111] ring-offset-2" : "opacity-65 hover:opacity-100"
                }`}
              >
                <SafeImage
                  src={image}
                  fallbackSrc={fallbackImages.product}
                  alt=""
                  fill
                  className="object-cover"
                  objectFit="cover"
                  objectPosition="center center"
                  focalX={index === 0 ? focal?.focal_x : undefined}
                  focalY={index === 0 ? focal?.focal_y : undefined}
                  zoom={index === 0 ? focal?.zoom || 1 : 1}
                  sizes="80px"
                />
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setLightboxIndex(displayedIndex)}
          aria-label={`Perbesar ${PRODUCT_IMAGE_SLOTS[displayedIndex]?.label || `foto ${displayedIndex + 1}`}`}
          className="product-image-frame group relative aspect-[4/5] w-full max-w-[calc((100vh-7.5rem)*0.8)] justify-self-center overflow-hidden text-left outline-none focus-visible:ring-2 focus-visible:ring-experience-focus focus-visible:ring-offset-2"
        >
          <SafeImage
            src={resolvedImages[displayedIndex]}
            fallbackSrc={fallbackImages.product}
            alt={`${alt} ${PRODUCT_IMAGE_SLOTS[displayedIndex]?.shortLabel || displayedIndex + 1}`}
            fill
            priority={displayedIndex === 0}
            className="object-cover transition duration-500 group-hover:scale-[1.015] motion-reduce:transition-none"
            objectFit="cover"
            objectPosition="center center"
            focalX={displayedIndex === 0 ? focal?.focal_x : undefined}
            focalY={displayedIndex === 0 ? focal?.focal_y : undefined}
            zoom={displayedIndex === 0 ? focal?.zoom || 1 : 1}
            sizes="(min-width: 1440px) 640px, (min-width: 1024px) 45vw, 100vw"
          />
          <span className="absolute bottom-3 left-3 bg-white/92 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[.08em] text-brand-charcoal">
            {PRODUCT_IMAGE_SLOTS[displayedIndex]?.shortLabel || `Foto ${displayedIndex + 1}`}
          </span>
          <span className="absolute bottom-3 right-3 bg-white/92 px-3 py-1.5 text-xs font-semibold text-brand-charcoal">
            {displayedIndex + 1} / {resolvedImages.length}
          </span>
        </button>
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
            className="absolute right-4 top-4 z-20 grid h-12 w-12 place-items-center rounded-full bg-white text-xl font-medium text-brand-charcoal"
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
                className="absolute left-3 top-1/2 z-20 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white text-xl text-brand-charcoal sm:left-6"
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
                className="absolute right-3 top-1/2 z-20 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white text-xl text-brand-charcoal sm:right-6"
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
