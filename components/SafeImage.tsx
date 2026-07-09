"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type SafeImageProps = {
  src?: string | null;
  fallbackSrc: string;
  alt: string;
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
  const resolvedSrc = src?.trim() || fallbackSrc;
  const [currentSrc, setCurrentSrc] = useState(resolvedSrc);

  useEffect(() => {
    setCurrentSrc(resolvedSrc);
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
  const canOptimize = currentSrc.startsWith("/") || /https:\/\/[^/]+\.supabase\.co\//.test(currentSrc);
  const imageClassName = `${fill ? "absolute inset-0 h-full w-full" : ""} ${className}`.trim();
  const handleError = () => {
    if (currentSrc !== fallbackSrc) setCurrentSrc(fallbackSrc);
  };

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
