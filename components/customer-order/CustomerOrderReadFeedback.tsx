"use client";

import Link from "next/link";
export function CustomerOrderReadError({
  error,
  retrying,
  onRetry
}: {
  error: { code: string; message: string };
  retrying: boolean;
  onRetry: () => void;
}) {
  const title = errorTitle(error.code);
  const retryable = ![
    "CUSTOMER_ORDER_ACCESS_EXPIRED",
    "CUSTOMER_ORDER_ACCESS_DENIED",
    "CUSTOMER_ORDER_NOT_FOUND",
    "CUSTOMER_ORDER_INVALID_REQUEST"
  ].includes(error.code);

  return (
    <section role="alert" className="mx-auto max-w-2xl rounded-[24px] border border-red-200 bg-red-50 p-6 text-red-950">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm leading-6">{error.message}</p>
      <div className="mt-5 flex flex-wrap gap-3">
        {retryable ? (
          <button
            type="button"
            disabled={retrying}
            onClick={onRetry}
            className="min-h-11 rounded-full bg-red-950 px-5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {retrying ? "Mencoba lagi..." : "Coba Lagi"}
          </button>
        ) : null}
        <Link href="/track-order" className="inline-flex min-h-11 items-center rounded-full border border-red-900/30 bg-white px-5 text-sm font-semibold">
          Verifikasi lewat Pelacakan
        </Link>
      </div>
    </section>
  );
}

export function CustomerOrderStaleWarning({
  message,
  refreshing,
  onRetry
}: {
  message: string;
  refreshing: boolean;
  onRetry: () => void;
}) {
  if (!message) return null;
  return (
    <section role="status" className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
      <p className="max-w-2xl leading-6">{message}</p>
      <button
        type="button"
        disabled={refreshing}
        onClick={onRetry}
        className="min-h-10 rounded-full border border-amber-900/30 bg-white px-4 font-semibold disabled:opacity-50"
      >
        {refreshing ? "Memperbarui..." : "Coba Lagi"}
      </button>
    </section>
  );
}

function errorTitle(code: string) {
  const titles: Record<string, string> = {
    CUSTOMER_ORDER_INVALID_REQUEST: "Tautan pesanan tidak valid",
    CUSTOMER_ORDER_NOT_FOUND: "Pesanan tidak ditemukan",
    CUSTOMER_ORDER_ACCESS_EXPIRED: "Akses pesanan kedaluwarsa",
    CUSTOMER_ORDER_ACCESS_DENIED: "Akses pesanan belum terverifikasi",
    CUSTOMER_ORDER_RATE_LIMITED: "Terlalu banyak percobaan",
    CUSTOMER_ORDER_UNAVAILABLE: "Status pesanan belum tersedia"
  };
  return titles[code] ?? "Status pesanan belum tersedia";
}
