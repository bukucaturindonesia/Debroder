"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  defaultKaosSleeve,
  MASTER_KAOS_SIZE_GUIDES,
  MASTER_KAOS_SIZE_TOLERANCE,
  type KaosSleeve
} from "@/lib/master-kaos-size-guide";

type Props = {
  productName: string;
  category?: string | null;
  subcategory?: string | null;
};

/** Informational overlay only; leaves canonical PIM size availability unchanged. */
export function MasterKaosSizeGuide({ productName, category, subcategory }: Props) {
  const [open, setOpen] = useState(false);
  const [sleeve, setSleeve] = useState<KaosSleeve>(() =>
    defaultKaosSleeve(productName, category, subcategory)
  );
  const [zoomed, setZoomed] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const guide = MASTER_KAOS_SIZE_GUIDES[sleeve];

  useEffect(() => {
    if (!open) return;
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const controls = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], [tabindex="0"]'
        ) ?? []
      );
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = priorOverflow;
      document.removeEventListener("keydown", onKeyDown);
      triggerRef.current?.focus();
    };
  }, [open]);

  function showGuide() {
    setSleeve(defaultKaosSleeve(productName, category, subcategory));
    setZoomed(false);
    setOpen(true);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={showGuide}
        aria-haspopup="dialog"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[#111] underline underline-offset-4 outline-none hover:text-black/60 focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
      >
        Panduan Ukuran
        <span className="text-xs font-normal text-black/50">(cm)</span>
      </button>
      {open && typeof document !== "undefined" ? createPortal(
        <div
          className="fixed inset-0 z-[var(--z-modal,60)] flex items-center justify-center overflow-y-auto bg-black/65 px-2 py-3 sm:px-5 sm:py-8"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="my-auto flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[700px] flex-col overflow-hidden rounded-xl bg-white text-[#111] shadow-2xl sm:max-h-[calc(100dvh-4rem)]"
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-black/10 px-4 py-3 sm:px-6 sm:py-4">
              <h2 id={titleId} className="text-lg font-semibold sm:text-xl">Panduan Ukuran</h2>
              <button
                ref={closeRef}
                type="button"
                aria-label="Tutup panduan ukuran"
                onClick={() => setOpen(false)}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-2xl text-black/65 hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <div className="overflow-y-auto px-3 pb-5 pt-4 sm:px-6 sm:pb-6">
              <div className="grid grid-cols-2 gap-2" role="group" aria-label="Jenis lengan kaos">
                {(["short", "long"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={sleeve === value}
                    onClick={() => { setSleeve(value); setZoomed(false); }}
                    className={`min-h-11 rounded-lg border px-2 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${sleeve === value ? "border-[#111] bg-[#111] text-white" : "border-black/20 bg-white text-black hover:border-black"}`}
                  >
                    {MASTER_KAOS_SIZE_GUIDES[value].title}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex flex-col items-center justify-center">
                <button
                  type="button"
                  onClick={() => setZoomed((value) => !value)}
                  aria-label={zoomed ? "Perkecil ilustrasi pengukuran" : "Perbesar ilustrasi pengukuran"}
                  aria-pressed={zoomed}
                  className={`w-full rounded-md outline-none focus-visible:ring-2 focus-visible:ring-black ${zoomed ? "max-w-[520px]" : "max-w-[320px]"}`}
                >
                  <Image
                    src={guide.illustration}
                    alt={`Diagram kaos ${guide.title.toLowerCase()}: LD lebar dada, P panjang, L panjang lengan`}
                    width={sleeve === "short" ? 321 : 361}
                    height={sleeve === "short" ? 288 : 289}
                    sizes="(max-width: 640px) 80vw, 361px"
                    className="h-auto w-full object-contain transition-[width] duration-200"
                  />
                </button>
                <p className="mt-1 text-xs text-black/50">LD: Lebar Dada · P: Panjang · L: Lengan</p>
              </div>
              <div className="mt-5 overflow-x-auto rounded-lg border border-black/10">
                <table className="w-full min-w-[335px] border-collapse text-center text-[12px] sm:text-sm">
                  <thead className="bg-[#2d2f30] text-white">
                    <tr>
                      <th scope="col" className="px-2 py-3 font-semibold sm:px-3">Size</th>
                      <th scope="col" className="px-2 py-3 font-semibold sm:px-3">Lebar Dada (cm)</th>
                      <th scope="col" className="px-2 py-3 font-semibold sm:px-3">Panjang (cm)</th>
                      <th scope="col" className="px-2 py-3 font-semibold sm:px-3">Lengan (cm)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guide.rows.map((row) => (
                      <tr key={row.size} className="border-b border-black/10 last:border-b-0">
                        <th scope="row" className="px-2 py-3 font-medium sm:px-3">{row.size}</th>
                        <td className="px-2 py-3 sm:px-3">{row.chest}</td>
                        <td className="px-2 py-3 sm:px-3">{row.length}</td>
                        <td className="px-2 py-3 sm:px-3">{String(row.sleeve).replace(".", ",")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-right text-xs font-medium text-black/70 sm:text-sm">
                {MASTER_KAOS_SIZE_TOLERANCE}
              </p>
              <p className="mt-2 text-xs leading-5 text-black/50">
                Panduan master kaos. Jika produk memiliki panduan khusus di bagian Informasi Produk, gunakan ukuran produk tersebut.
              </p>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </>
  );
}
