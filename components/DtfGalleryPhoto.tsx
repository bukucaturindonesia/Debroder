"use client";

import { useState } from "react";

/** A failed original photo is omitted, never replaced by reference/brand artwork. */
export function DtfGalleryPhoto({ src, mobileSrc, alt }: { src: string; mobileSrc?: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <figure className="dtf-gallery-photo">
      <picture>
        {mobileSrc ? <source media="(max-width: 767px)" srcSet={mobileSrc} /> : null}
        {/* Original CMS URLs must not fall back to unrelated artwork. */}
        <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} />
      </picture>
    </figure>
  );
}
