"use client";

import { getImageProps } from "next/image";
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
  fallbackSrc = "/debroder/social-preview.png",
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

  const canOptimize = (src: string) => {
    const isLogoAsset = /(?:^|\/)logo(?:[-_.\/]|$)/i.test(src);
    return !isLogoAsset && (src.startsWith("/") || /https:\/\/[^/]+\.supabase\.co\//.test(src));
  };
  const optimizedDesktop = canOptimize(desktopSource)
    ? getImageProps({
        src: desktopSource,
        alt,
        fill: true,
        sizes: "100vw",
        priority,
        className: `responsive-picture-img ${className}`,
        style: {
          objectFit,
          objectPosition: desktopObjectPosition,
          transform: Number(desktopZoom) > 1 ? `scale(${desktopZoom})` : undefined,
          transformOrigin: desktopObjectPosition
        }
      }).props
    : null;
  const optimizedMobile = canOptimize(mobileSource)
    ? getImageProps({
        src: mobileSource,
        alt,
        fill: true,
        sizes: "100vw",
        priority,
        className: `responsive-picture-img ${className}`,
        style: {
          objectFit,
          objectPosition: mobileObjectPosition || desktopObjectPosition,
          transform: Number(mobileZoom || desktopZoom) > 1 ? `scale(${mobileZoom || desktopZoom})` : undefined,
          transformOrigin: mobileObjectPosition || desktopObjectPosition
        }
      }).props
    : null;

  return (
    <picture className="relative block h-full w-full">
      <source media="(max-width: 767px)" srcSet={optimizedMobile?.srcSet || mobileSource} sizes={optimizedMobile?.sizes} />
      <img
        {...optimizedDesktop}
        src={optimizedDesktop?.src || desktopSource}
        alt={alt}
        className={optimizedDesktop?.className || `responsive-picture-img ${className}`}
        loading={optimizedDesktop?.loading || (priority ? "eager" : "lazy")}
        fetchPriority={optimizedDesktop?.fetchPriority || (priority ? "high" : "auto")}
        decoding={optimizedDesktop?.decoding || (priority ? "sync" : "async")}
        style={optimizedDesktop?.style || imageStyle}
        onError={() => setHasError(true)}
      />
    </picture>
  );
}
