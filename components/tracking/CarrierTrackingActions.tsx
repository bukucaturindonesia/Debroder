"use client";

import { useState } from "react";
import { resolveCarrierTrackingTarget } from "@/lib/carrier-tracking";

export function CarrierTrackingActions({
  courier,
  trackingNumber,
  compact = false
}: {
  courier?: string | null;
  trackingNumber?: string | null;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const target = resolveCarrierTrackingTarget(courier, trackingNumber);
  const normalizedTracking = typeof trackingNumber === "string" ? trackingNumber.trim() : "";
  if (!normalizedTracking) return null;

  async function copyTracking() {
    try {
      await navigator.clipboard.writeText(normalizedTracking);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  const buttonClass = compact
    ? "inline-flex min-h-10 items-center justify-center rounded-full border border-current px-4 text-xs font-semibold"
    : "inline-flex min-h-11 items-center justify-center rounded-full border border-black px-5 text-sm font-semibold";

  return (
    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
      <button type="button" onClick={() => void copyTracking()} className={buttonClass}>
        {copied ? "Nomor resi tersalin" : "Salin nomor resi"}
      </button>
      {target ? (
        <a
          href={target.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`${buttonClass} bg-black text-white`}
        >
          Lacak di {target.carrierLabel}
        </a>
      ) : null}
    </div>
  );
}
