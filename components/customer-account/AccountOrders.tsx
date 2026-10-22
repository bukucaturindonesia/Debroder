"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AccountPanel } from "@/components/customer-account/CustomerAccountFrame";
import { useCustomerAuth } from "@/components/customer-auth/CustomerAuthProvider";
import { getOrderStatusLabel, getPaymentStatusLabel } from "@/lib/ui-language";
import { formatRupiah } from "@/lib/url";

export type AccountOrderSummary = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  fulfillmentMethod: string;
  total: number;
  createdAt: string;
};

export function AccountOrders() {
  const auth = useCustomerAuth();
  const [orders, setOrders] = useState<AccountOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!auth.accessToken) return;
    void fetch("/api/customer/orders", { cache: "no-store", headers: { authorization: `Bearer ${auth.accessToken}` } })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({})) as { orders?: AccountOrderSummary[]; error?: string };
        if (!response.ok) throw new Error(payload.error || "Riwayat pesanan belum dapat dimuat.");
        setOrders(payload.orders ?? []);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Riwayat pesanan belum dapat dimuat."))
      .finally(() => setLoading(false));
  }, [auth.accessToken]);

  return (
    <AccountPanel eyebrow="Pesanan" title="Riwayat pesanan" description="Pesanan lama dengan email yang sama akan muncul setelah email akun diverifikasi.">
      {loading ? <p role="status" className="customer-empty text-sm text-black/55">Memuat pesanan...</p> : null}
      {error ? <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p> : null}
      {!loading && !error && !orders.length ? <div className="customer-empty rounded-functional bg-brand-offWhite p-6 text-center"><p className="font-semibold">Belum ada pesanan pada akun ini.</p><p className="mt-2 text-sm leading-6 text-black/60">Pesanan dengan email terverifikasi Anda akan tampil di sini.</p><Link href="/koleksi" className="public-button public-button--primary mt-4">Mulai Belanja</Link></div> : null}
      <AccountOrderCards orders={orders} />
    </AccountPanel>
  );
}

export function AccountOrderCards({ orders }: { orders: AccountOrderSummary[] }) {
  return <div className="grid gap-3">{orders.map((order) => (
    <Link key={order.id} href={`/account/orders/${encodeURIComponent(order.id)}`} className="customer-order-card grid gap-4 rounded-functional border border-black/10 p-4 transition hover:border-black sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5">
      <div>
        <p className="font-semibold">{order.orderNumber}</p>
        <p className="mt-2 text-xs leading-5 text-black/55"><time dateTime={order.createdAt}>{formatDate(order.createdAt)}</time> · {order.fulfillmentMethod === "pickup" ? "Ambil di Toko" : "Dikirim"}</p>
        <dl className="mt-3 flex flex-wrap gap-2 text-xs">
          <div className="customer-status"><dt className="sr-only">Status pesanan</dt><dd>{getOrderStatusLabel(order.status, "customer")}</dd></div>
          <div className="customer-status border border-black/10 bg-white"><dt className="sr-only">Status pembayaran</dt><dd>{getPaymentStatusLabel(order.paymentStatus, "customer")}</dd></div>
        </dl>
      </div>
      <div className="border-t border-black/10 pt-3 sm:border-0 sm:pt-0 sm:text-right">
        <p className="text-xs text-black/55">Total pesanan</p><p className="mt-1 font-semibold tabular-nums">{formatRupiah(order.total)}</p>
        <p className="mt-2 text-xs font-semibold underline underline-offset-4">Lihat item & detail pesanan →</p>
      </div>
    </Link>
  ))}</div>;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Tanggal tidak tersedia" : new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(date);
}
