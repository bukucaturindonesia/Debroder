"use client";

import { useState } from "react";
import { SafeImage } from "@/components/SafeImage";
import { fallbackImages } from "@/lib/fallback-data";
import type { FocalPoint } from "@/lib/types";

export function ProductGallery({ images, alt, focal }: { images: string[]; alt: string; focal?: FocalPoint }) {
  const [selected, setSelected] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const current = images[selected] || fallbackImages.product;

  return (
    <div>
      <button type="button" onClick={() => setZoomed((value) => !value)} aria-label={zoomed ? "Tutup zoom gambar" : "Zoom gambar"} className="product-image-frame relative block aspect-[4/5] w-full cursor-zoom-in overflow-hidden">
        <SafeImage src={current} fallbackSrc={fallbackImages.product} alt={`${alt} ${selected + 1}`} fill priority className="object-cover transition duration-300" objectFit="cover" objectPosition="center center" focalX={focal?.focal_x} focalY={focal?.focal_y} zoom={(focal?.zoom || 1) * (zoomed ? 1.5 : 1)} sizes="(min-width: 1024px) 50vw, 100vw" />
        <span className="absolute bottom-3 right-3 rounded-full bg-white/90 px-3 py-2 text-xs font-semibold shadow">{zoomed ? "Tutup zoom" : "Klik untuk zoom"}</span>
      </button>
      {images.length > 1 ? <div className="mt-3 grid grid-cols-5 gap-2">{images.map((image, index) => <button key={`${image}-${index}`} type="button" onClick={() => { setSelected(index); setZoomed(false); }} aria-label={`Tampilkan gambar ${index + 1}`} className={`product-image-frame relative aspect-[4/5] overflow-hidden ${selected === index ? "ring-2 ring-brand-green" : ""}`}><SafeImage src={image} fallbackSrc={fallbackImages.product} alt={`${alt} thumbnail ${index + 1}`} fill className="object-cover" objectFit="cover" sizes="10vw" /></button>)}</div> : null}
    </div>
  );
}
