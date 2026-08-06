"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AccountPanel } from "@/components/customer-account/CustomerAccountFrame";
import { useCustomerAuth } from "@/components/customer-auth/CustomerAuthProvider";
import { getOrderStatusLabel, getPaymentStatusLabel } from "@/lib/ui-language";
import { formatRupiah } from "@/lib/url";

type Order = {
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
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!auth.accessToken) return;
    void fetch("/api/customer/orders", { cache: "no-store", headers: { authorization: `Bearer ${auth.accessToken}` } })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({})) as { orders?: Order[]; error?: string };
        if (!response.ok) throw new Error(payload.error || "Riwayat pesanan belum dapat dimuat.");
        setOrders(payload.orders ?? []);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Riwayat pesanan belum dapat dimuat."))
      .finally(() => setLoading(false));
  }, [auth.accessToken]);

  return (
    <AccountPanel eyebrow="Pesanan" title="Riwayat pesanan" description="Pesanan lama dengan email yang sama akan muncul setelah email akun diverifikasi.">
      {loading ? <p className="text-sm text-black/55">Memuat pesanan...</p> : null}
      {error ? <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p> : null}
      {!loading && !error && !orders.length ? <div className="rounded-2xl bg-brand-offWhite p-6 text-center"><p className="font-semibold">Belum ada pesanan pada akun ini.</p><Link href="/koleksi" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-black px-5 text-sm font-semibold text-white">Mulai Belanja</Link></div> : null}
      <div className="grid gap-3">
        {orders.map((order) => <Link key={order.id} href={`/account/orders/${encodeURIComponent(order.id)}`} className="grid gap-4 rounded-2xl border border-black/10 p-5 transition hover:border-black sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="font-semibold">{order.orderNumber}</p><p className="mt-1 text-xs text-black/50">{formatDate(order.createdAt)} · {order.fulfillmentMethod === "pickup" ? "Ambil di Toko" : "Dikirim"}</p><p className="mt-3 text-sm text-black/65">{getOrderStatusLabel(order.status, "customer")} · {getPaymentStatusLabel(order.paymentStatus, "customer")}</p></div><div className="text-left sm:text-right"><p className="font-semibold">{formatRupiah(order.total)}</p><p className="mt-2 text-xs font-semibold underline underline-offset-4">Lihat detail</p></div></Link>)}
      </div>
    </AccountPanel>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Tanggal tidak tersedia" : new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(date);
}
