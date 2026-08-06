"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AccountPanel } from "@/components/customer-account/CustomerAccountFrame";
import { useCustomerAuth } from "@/components/customer-auth/CustomerAuthProvider";
import type { CustomerOrderTrackingReadModel } from "@/lib/customer-orders/contracts";
import { formatRupiah } from "@/lib/url";

export function AccountOrderDetail({ id }: { id: string }) {
  const auth = useCustomerAuth();
  const [order, setOrder] = useState<CustomerOrderTrackingReadModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!auth.accessToken) return;
    void fetch(`/api/customer/orders/${encodeURIComponent(id)}`, { cache: "no-store", headers: { authorization: `Bearer ${auth.accessToken}` } })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({})) as CustomerOrderTrackingReadModel & { error?: string };
        if (!response.ok) throw new Error(payload.error || "Pesanan belum dapat dimuat.");
        setOrder(payload);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Pesanan belum dapat dimuat."))
      .finally(() => setLoading(false));
  }, [auth.accessToken, id]);

  return (
    <AccountPanel eyebrow="Detail pesanan" title={order?.order.orderNumber || "Pesanan"} description={order ? `${order.order.statusLabel} · ${order.order.paymentStatusLabel}` : "Status pesanan pelanggan terverifikasi."}>
      {loading ? <p className="text-sm text-black/55">Memuat detail pesanan...</p> : null}
      {error ? <div><p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p><Link href="/account/orders" className="mt-5 inline-flex text-sm font-semibold underline">Kembali ke pesanan</Link></div> : null}
      {order ? <div className="grid gap-5">
        <section className="rounded-2xl bg-brand-offWhite p-5"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-black/45">Langkah berikutnya</p><p className="mt-3 font-semibold">{order.order.nextStep}</p><p className="mt-2 text-sm leading-6 text-black/60">{order.activeStage.customerDescription}</p></section>
        <section className="rounded-2xl border border-black/10 p-5"><h2 className="font-semibold">Ringkasan biaya</h2><dl className="mt-4 grid gap-3 text-sm"><Row label="Subtotal" value={formatRupiah(order.order.subtotal)} /><Row label="Ongkir" value={order.order.shippingCost === null ? "Belum ditetapkan" : formatRupiah(order.order.shippingCost)} /><Row label="Total" value={formatRupiah(order.order.total)} strong /><Row label="Sudah dibayar" value={formatRupiah(order.order.amountPaid)} /><Row label="Sisa" value={formatRupiah(order.order.remainingBalance)} /></dl>{order.payment.url ? <Link href={order.payment.url} className="mt-5 inline-flex min-h-11 items-center rounded-full bg-black px-5 text-sm font-semibold text-white">Lanjutkan Pembayaran</Link> : null}</section>
        <section className="rounded-2xl border border-black/10 p-5"><h2 className="font-semibold">Item pesanan</h2><div className="mt-4 divide-y divide-black/10">{order.items.map((item) => <div key={item.id} className="flex justify-between gap-4 py-4 text-sm"><div><p className="font-semibold">{item.productName}</p><p className="mt-1 text-black/50">{[item.variantName || item.color, item.size, `${item.quantity} pcs`].filter(Boolean).join(" · ")}</p></div><p className="shrink-0 font-semibold">{formatRupiah(item.subtotal)}</p></div>)}</div></section>
        <section className="rounded-2xl border border-black/10 p-5"><h2 className="font-semibold">Penyerahan</h2><dl className="mt-4 grid gap-3 text-sm"><Row label="Metode" value={order.order.fulfillmentMethod === "pickup" ? "Ambil di Toko" : "Dikirim"} /><Row label="Kurir" value={order.order.courier || "Belum tersedia"} /><Row label="Nomor resi" value={order.order.trackingNumber || "Belum tersedia"} /></dl></section>
      </div> : null}
    </AccountPanel>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className={`flex justify-between gap-4 ${strong ? "border-t border-black/10 pt-3 text-base font-semibold" : ""}`}><dt className="text-black/55">{label}</dt><dd className="text-right font-semibold">{value}</dd></div>;
}
