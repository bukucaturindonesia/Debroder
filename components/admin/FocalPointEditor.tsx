/* eslint-disable @next/next/no-img-element */
"use client";

import { PointerEvent, useMemo, useRef, useState } from "react";
import type { FocalPoint } from "@/lib/types";

const frameOptions = [
  { value: "4:5", label: "Catalog 4:5", ratio: 4 / 5 },
  { value: "16:7", label: "Hero desktop", ratio: 16 / 7 },
  { value: "4:5-mobile", label: "Hero mobile", ratio: 4 / 5 },
  { value: "12:5", label: "Banner", ratio: 12 / 5 },
  { value: "1:1", label: "Thumbnail", ratio: 1 }
];

type Props = {
  src: string;
  alt?: string;
  value: FocalPoint;
  onChange: (value: FocalPoint) => void;
  onSave?: () => void;
  compact?: boolean;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function Preview({
  src,
  alt,
  value,
  ratio,
  label
}: {
  src: string;
  alt: string;
  value: FocalPoint;
  ratio: string;
  label: string;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-brand-charcoal/60">{label}</p>
      <div className="relative overflow-hidden bg-brand-offWhite" style={{ aspectRatio: ratio }}>
        <img
          src={src}
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            objectPosition: `${value.focal_x}% ${value.focal_y}%`,
            transform: `scale(${value.zoom})`,
            transformOrigin: `${value.focal_x}% ${value.focal_y}%`
          }}
        />
      </div>
    </div>
  );
}

export function FocalPointEditor({ src, alt = "Pratinjau titik fokus", value, onChange, onSave, compact = false }: Props) {
  const dragStart = useRef<{ x: number; y: number; focalX: number; focalY: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const selectedFrame = useMemo(
    () => frameOptions.find((option) => option.value === value.target_ratio) || frameOptions[0],
    [value.target_ratio]
  );

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    dragStart.current = {
      x: event.clientX,
      y: event.clientY,
      focalX: value.focal_x,
      focalY: value.focal_y
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
  }

  function drag(event: PointerEvent<HTMLDivElement>) {
    if (!dragStart.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const deltaX = ((event.clientX - dragStart.current.x) / rect.width) * 100 / value.zoom;
    const deltaY = ((event.clientY - dragStart.current.y) / rect.height) * 100 / value.zoom;
    onChange({
      ...value,
      focal_x: clamp(dragStart.current.focalX - deltaX, 0, 100),
      focal_y: clamp(dragStart.current.focalY - deltaY, 0, 100)
    });
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    dragStart.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsDragging(false);
  }

  function reset() {
    onChange({ focal_x: 50, focal_y: 50, zoom: 1, target_ratio: value.target_ratio || "4:5" });
  }

  return (
    <div className="rounded-xl border border-brand-softGray bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Visual focal point</h3>
          <p className="mt-1 text-xs text-brand-charcoal/55">Geser gambar di dalam frame. File asli tidak dipotong.</p>
        </div>
        <select
          value={value.target_ratio}
          onChange={(event) => onChange({ ...value, target_ratio: event.target.value })}
          className="min-h-10 rounded-lg border border-brand-softGray bg-white px-3 text-xs font-semibold"
          aria-label="Rasio frame"
        >
          {frameOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>

      <div className={`mt-4 grid gap-4 ${compact ? "" : "lg:grid-cols-[0.8fr_1.2fr]"}`}>
        {!compact ? (
          <div>
            <p className="mb-2 text-xs font-semibold text-brand-charcoal/60">Gambar asli</p>
            <div className="grid min-h-48 place-items-center overflow-hidden bg-brand-offWhite p-2">
              <img src={src} alt={alt} className="max-h-72 w-full object-contain" />
            </div>
          </div>
        ) : null}
        <div>
          <p className="mb-2 text-xs font-semibold text-brand-charcoal/60">Frame publik</p>
          <div
            className={`relative touch-none overflow-hidden bg-brand-offWhite ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
            style={{ aspectRatio: selectedFrame.ratio }}
            onPointerDown={startDrag}
            onPointerMove={drag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <img
              src={src}
              alt={alt}
              draggable={false}
              className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
              style={{
                objectPosition: `${value.focal_x}% ${value.focal_y}%`,
                transform: `scale(${value.zoom})`,
                transformOrigin: `${value.focal_x}% ${value.focal_y}%`
              }}
            />
            <div className="pointer-events-none absolute inset-0 border-2 border-white/90 shadow-[inset_0_0_0_1px_rgba(0,0,0,.25)]" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-black/20" />
          </div>
        </div>
      </div>

      <label className="mt-4 block text-xs font-semibold text-brand-charcoal/60">
        Zoom {value.zoom.toFixed(2)}x
        <input
          type="range"
          min="1"
          max="3"
          step="0.05"
          value={value.zoom}
          onChange={(event) => onChange({ ...value, zoom: Number(event.target.value) })}
          className="mt-2 w-full accent-brand-green"
        />
      </label>

      {!compact ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Preview src={src} alt={alt} value={value} ratio="4 / 5" label="Ponsel / katalog" />
          <Preview src={src} alt={alt} value={value} ratio="16 / 7" label="Desktop" />
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={reset} className="min-h-10 rounded-full border border-brand-softGray px-4 text-xs font-semibold">Reset</button>
        {onSave ? <button type="button" onClick={onSave} className="min-h-10 rounded-full bg-brand-charcoal px-5 text-xs font-semibold text-white">Simpan fokus</button> : null}
      </div>
    </div>
  );
}
