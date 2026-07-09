"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";

type ResponsivePictureProps = {
  desktopSrc: string;
  mobileSrc?: string;
  alt: string;
  className: string;
  priority?: boolean;
  desktopObjectPosition?: string;
  mobileObjectPosition?: string;
  fallbackSrc?: string;
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
  fallbackSrc = "/images/debroder/fallback/fallback-page-hero.jpg",
  objectFit = "cover",
  desktopZoom = 1,
  mobileZoom
}: ResponsivePictureProps) {
  const [hasError, setHasError] = useState(false);
  const resolvedDesktopSrc = desktopSrc || fallbackSrc;
  const resolvedMobileSrc = mobileSrc || resolvedDesktopSrc;
  const desktopSource = hasError ? fallbackSrc : resolvedDesktopSrc;
  const mobileSource = hasError ? fallbackSrc : resolvedMobileSrc;

  useEffect(() => {
    setHasError(false);
  }, [desktopSrc, mobileSrc]);
  const imageStyle = {
    "--desktop-object-position": desktopObjectPosition,
    "--mobile-object-position": mobileObjectPosition || desktopObjectPosition,
    "--desktop-image-zoom": String(desktopZoom || 1),
    "--mobile-image-zoom": String(mobileZoom || desktopZoom || 1),
    objectFit
  } as CSSProperties;

  return (
    <picture className="block h-full w-full">
      <source media="(max-width: 767px)" srcSet={mobileSource} />
      <img
        src={desktopSource}
        alt={alt}
        className={`responsive-picture-img ${className}`}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding={priority ? "sync" : "async"}
        style={imageStyle}
        onError={() => setHasError(true)}
      />
    </picture>
  );
}
