"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { normalizePublicMediaPath } from "@/lib/public-media";

type ResponsivePictureProps = {
  desktopSrc?: string | null;
  mobileSrc?: string | null;
  alt: string;
  className: string;
  priority?: boolean;
  desktopObjectPosition?: string;
  mobileObjectPosition?: string;
  fallbackSrc?: string | null;
  mobileFallbackSrc?: string | null;
  objectFit?: "cover" | "contain";
  desktopZoom?: number | null;
  mobileZoom?: number | null;
};

export function ResponsivePicture({
  desktopSrc,
  mobileSrc,
  alt,
  className,
  priority = false,
  desktopObjectPosition = "center center",
  mobileObjectPosition,
  fallbackSrc = null,
  mobileFallbackSrc = null,
  objectFit = "cover",
  desktopZoom = 1,
  mobileZoom
}: ResponsivePictureProps) {
  const [hasError, setHasError] = useState(false);
  const resolvedFallback = useMemo(
    () => normalizePublicMediaPath(fallbackSrc),
    [fallbackSrc]
  );
  const resolvedMobileFallback = useMemo(
    () => normalizePublicMediaPath(mobileFallbackSrc) || resolvedFallback,
    [mobileFallbackSrc, resolvedFallback]
  );
  const resolvedDesktopSrc = useMemo(
    () => normalizePublicMediaPath(desktopSrc) || resolvedFallback,
    [desktopSrc, resolvedFallback]
  );
  const resolvedMobileSrc = useMemo(
    () => normalizePublicMediaPath(mobileSrc) || resolvedMobileFallback,
    [mobileSrc, resolvedMobileFallback]
  );
  const desktopSource = hasError ? resolvedFallback : resolvedDesktopSrc;
  const mobileSource = hasError ? resolvedMobileFallback : resolvedMobileSrc;

  useEffect(() => {
    setHasError(false);
  }, [desktopSrc, mobileSrc, fallbackSrc, mobileFallbackSrc]);

  const imageStyle = {
    "--desktop-object-position": desktopObjectPosition,
    "--mobile-object-position": mobileObjectPosition || desktopObjectPosition,
    "--desktop-image-zoom": String(desktopZoom || 1),
    "--mobile-image-zoom": String(mobileZoom || desktopZoom || 1),
    objectFit
  } as CSSProperties;

  if (!desktopSource) {
    return (
      <span
        role="img"
        aria-label={alt}
        className={`grid h-full w-full place-items-center bg-[#efefec] text-xs font-medium text-black/45 ${className}`}
      >
        Gambar belum tersedia
      </span>
    );
  }

  return (
    <picture className="block h-full w-full">
      {mobileSource ? <source media="(max-width: 767px)" srcSet={mobileSource} /> : null}
      <img
        src={desktopSource}
        alt={alt}
        className={`responsive-picture-img ${className}`}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding={priority ? "sync" : "async"}
        style={imageStyle}
        onError={() => {
          if (resolvedFallback && desktopSource !== resolvedFallback) {
            setHasError(true);
          }
        }}
      />
    </picture>
  );
}
