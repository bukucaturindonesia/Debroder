"use client";

import type { CSSProperties } from "react";
import {
  fallbackSwatchHex,
  normalizeHex,
  safePatternImageUrl,
  type ProductColorSwatchValue
} from "@/lib/product-variants";

export function ProductColorSwatch({
  value,
  label,
  className = "h-10 w-10"
}: {
  value: ProductColorSwatchValue;
  label: string;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label={`Swatch ${label}`}
      className={`inline-block shrink-0 overflow-hidden rounded-full border border-black/10 bg-white ${className}`}
      style={swatchStyle(value)}
    />
  );
}

export function swatchStyle(value: ProductColorSwatchValue): CSSProperties {
  const fallback = fallbackSwatchHex(value);
  if (value.colorType === "pattern") {
    const image = safePatternImageUrl(value.patternImageUrl);
    return image
      ? {
        backgroundColor: fallback,
        backgroundImage: `url(${JSON.stringify(image)})`,
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover"
      }
      : { backgroundColor: fallback };
  }

  if (value.colorType === "combination") {
    const primary = value.primaryHex || fallback;
    const secondary = value.secondaryHex || fallback;
    const tertiary = normalizeHex(value.tertiaryHex);
    const angle = value.swatchDirection === "horizontal"
      ? "90deg"
      : value.swatchDirection === "vertical"
        ? "180deg"
        : "135deg";
    const stops = tertiary
      ? `${primary} 0 33.333%, ${secondary} 33.333% 66.666%, ${tertiary} 66.666% 100%`
      : `${primary} 0 50%, ${secondary} 50% 100%`;
    return { backgroundImage: `linear-gradient(${angle}, ${stops})` };
  }

  return { backgroundColor: value.primaryHex || fallback };
}
