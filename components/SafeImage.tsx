"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type SafeImageProps = {
  src?: string | null;
  fallbackSrc?: string | null;
  alt: string;
  unavailableLabel?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  fill?: boolean;
  objectPosition?: string;
  objectFit?: "cover" | "contain";
  focalX?: number | null;
  focalY?: number | null;
  zoom?: number | null;
};

export function SafeImage({
  src,
  fallbackSrc,
  alt,
  unavailableLabel,
  className = "",
  sizes,
  priority = false,
  fill = false,
  objectPosition,
  objectFit,
  focalX,
  focalY,
  zoom = 1
}: SafeImageProps) {
  const resolvedSrc = src?.trim() || fallbackSrc?.trim() || "";
  const [currentSrc, setCurrentSrc] = useState(resolvedSrc);
  const [unavailable, setUnavailable] = useState(!resolvedSrc);

  useEffect(() => {
    setCurrentSrc(resolvedSrc);
    setUnavailable(!resolvedSrc);
  }, [resolvedSrc]);

  const position = typeof focalX === "number" && typeof focalY === "number"
    ? `${Math.max(0, Math.min(100, focalX))}% ${Math.max(0, Math.min(100, focalY))}%`
    : objectPosition;
  const imageStyle = {
    objectPosition: position,
    objectFit,
    transform: Number(zoom) > 1 ? `scale(${zoom})` : undefined,
    transformOrigin: position
  };
  const isLogoAsset = /(?:^|\/)logo(?:[-_.\/]|$)/i.test(currentSrc);
  const canOptimize = !isLogoAsset && (currentSrc.startsWith("/") || /https:\/\/[^/]+\.supabase\.co\//.test(currentSrc));
  const imageClassName = `${fill ? "absolute inset-0 h-full w-full" : ""} ${className}`.trim();
  const handleError = () => {
    const fallback = fallbackSrc?.trim() || "";
    if (fallback && currentSrc !== fallback) {
      setCurrentSrc(fallback);
      return;
    }
    setUnavailable(true);
  };

  if (unavailable || !currentSrc) {
    return (
      <span
        role="img"
        aria-label={alt}
        className={`${fill ? "absolute inset-0" : ""} grid place-items-center bg-[#f3f3ef] px-4 text-center text-xs font-semibold text-black/45 ${className}`.trim()}
      >
        {unavailableLabel || "Gambar tidak tersedia"}
      </span>
    );
  }

  if (!canOptimize) {
    // CMS entries may point at a third-party host not declared in next.config.
    // eslint-disable-next-line @next/next/no-img-element
    return <img
      src={currentSrc}
      alt={alt}
      className={imageClassName}
      sizes={sizes}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding={priority ? "sync" : "async"}
      style={imageStyle}
      onError={handleError}
    />;
  }

  return (
    <Image
      src={currentSrc}
      alt={alt}
      className={imageClassName}
      sizes={sizes || "100vw"}
      priority={priority}
      fill={fill}
      width={fill ? undefined : 1200}
      height={fill ? undefined : 1500}
      style={imageStyle}
      onError={handleError}
    />
  );
}
