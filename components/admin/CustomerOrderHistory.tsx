"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { repeatOrderApiFetch } from "@/lib/admin-repeat-order-api";
import { formatAdminOrderDate, formatAdminOrderDateTime } from "@/lib/admin-order-detail";
import type { RepeatOrderHistoryRow, RepeatOrderSource } from "@/lib/repeat-orders";
import { getOrderStatusLabel } from "@/lib/ui-language";

function money(value: number, currency: string) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: currency || "IDR",
    maximumFractionDigits: 0
  }).format(value || 0);
}

export function CustomerOrderHistory({ orderId }: { orderId: string }) {
  const [orders, setOrders] = useState<RepeatOrderSource[]>([]);
  const [history, setHistory] = useState<RepeatOrderHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const payload = await repeatOrderApiFetch<{
        orders: RepeatOrderSource[];
        repeatHistory: RepeatOrderHistoryRow[];
      }>(`/api/admin/repeat-orders/customer-history?orderId=${encodeURIComponent(orderId)}`);
      setOrders(payload.orders);
      setHistory(payload.repeatHistory);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Riwayat pelanggan gagal dimuat.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  return (
    <section className="border border-brand-softGray bg-white p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Riwayat Pelanggan</h2>
          <p className="mt-2 text-sm text-brand-charcoal/60">
            Pesanan dengan WhatsApp atau email yang sama, termasuk hubungan Repeat Order.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-full border border-brand-softGray px-4 py-2 text-sm font-semibold disabled:opacity-45"
        >
          Muat Ulang
        </button>
      </div>

      {loading ? <p className="mt-6 text-sm font-semibold">Memuat riwayat pelanggan...</p> : null}
      {error ? <p role="alert" className="mt-6 text-sm font-semibold text-red-700">{error}</p> : null}

      {!loading && !error && orders.length ? (
        <div className="mt-6 divide-y divide-brand-softGray border-y border-brand-softGray">
          {orders.map((order) => (
            <article key={order.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">{order.order_number}</p>
                <p className="mt-1 text-xs text-brand-charcoal/55">
                  {getOrderStatusLabel(order.status)} · {formatAdminOrderDate(order.created_at)}
                </p>
                <p className="mt-1 text-sm font-semibold">{money(order.total_amount, order.currency)}</p>
              </div>
              <Link
                href={`/admin/orders/${order.id}`}
                className="inline-flex min-h-10 items-center justify-center rounded-full border border-brand-softGray px-4 text-sm font-semibold"
              >
                Buka
              </Link>
            </article>
          ))}
        </div>
      ) : null}

      {!loading && !error && !orders.length ? (
        <p className="mt-6 text-sm text-brand-charcoal/60">Belum ada riwayat pelanggan lain.</p>
      ) : null}

      {history.length ? (
        <div className="mt-6 border-t border-brand-softGray pt-5">
          <h3 className="font-semibold">Hubungan Repeat Order</h3>
          <div className="mt-3 grid gap-3">
            {history.map((entry) => (
              <div key={entry.id} className="border border-brand-softGray bg-brand-offWhite p-4 text-sm">
                <p>{entry.repeat_reason || "Tanpa alasan tambahan"}</p>
                <p className="mt-2 text-xs text-brand-charcoal/55">
                  {formatAdminOrderDateTime(entry.created_at)}
                </p>
                <Link
                  href={`/admin/orders/quotations/${entry.new_quotation_id}`}
                  className="mt-3 inline-flex text-sm font-semibold text-brand-green underline"
                >
                  Buka quotation hasil repeat
                </Link>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
