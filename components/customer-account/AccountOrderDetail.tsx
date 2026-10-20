"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AccountPanel } from "@/components/customer-account/CustomerAccountFrame";
import { useCustomerAuth } from "@/components/customer-auth/CustomerAuthProvider";
import type { CustomerOrderTrackingReadModel } from "@/lib/customer-orders/contracts";
import { formatRupiah } from "@/lib/url";
import { CustomerOrderStatusCard } from "@/components/customer-order/CustomerOrderStatusCard";
import { resolveCustomerOrderPresentation } from "@/lib/customer-order-presentation";

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
      <Link href="/account/orders" className="mb-5 inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4">← Riwayat pesanan</Link>
      {loading ? <p role="status" className="customer-empty text-sm text-black/55">Memuat detail pesanan...</p> : null}
      {error ? <div><p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p><Link href="/account/orders" className="mt-5 inline-flex text-sm font-semibold underline">Kembali ke pesanan</Link></div> : null}
      {order ? <div className="grid gap-5">
        <CustomerOrderStatusCard className="keep-section-bg rounded-functional" presentation={{ ...resolveCustomerOrderPresentation({
          status: order.order.status,
          paymentStatus: order.order.paymentStatus,
          fulfillmentStatus: order.order.fulfillmentStatus,
          fulfillmentMethod: order.order.fulfillmentMethod,
          paymentMethod: order.order.paymentMethod,
          customerArrivedAt: order.order.customerArrivedAt,
          finalVerificationCompleted: Boolean(order.order.finalVerifiedAt),
          handoverCompletedAt: order.order.handoverCompletedAt,
          hasPaymentUrl: Boolean(order.payment.url),
          isCustom: order.items.some((item) => Boolean(item.customProjectId)),
          activeStage: order.activeStage
        }), nextStep: order.order.nextStep, description: order.activeStage.customerDescription }} />
        <Link href={`/track-order/${encodeURIComponent(order.order.orderNumber)}`} className="public-secondary-action justify-center">Buka pelacakan pesanan</Link>
        <section className="rounded-2xl border border-black/10 p-5"><h2 className="font-semibold">Ringkasan biaya</h2><dl className="mt-4 grid gap-3 text-sm"><Row label="Subtotal" value={formatRupiah(order.order.subtotal)} /><Row label="Ongkir" value={order.order.shippingCost === null ? "Belum ditetapkan" : formatRupiah(order.order.shippingCost)} /><Row label="Total" value={formatRupiah(order.order.total)} strong /><Row label="Sudah dibayar" value={formatRupiah(order.order.amountPaid)} /><Row label="Sisa" value={formatRupiah(order.order.remainingBalance)} /></dl>{order.payment.url ? <Link href={order.payment.url} className="mt-5 inline-flex min-h-11 items-center rounded-full bg-black px-5 text-sm font-semibold text-white">Lanjutkan Pembayaran</Link> : null}</section>
        <section className="rounded-2xl border border-black/10 p-5"><h2 className="font-semibold">Item pesanan</h2><div className="mt-4 divide-y divide-black/10">{order.items.map((item) => <div key={item.id} className="customer-item-row py-4 text-sm"><div><p className="font-semibold">{item.productName}</p><p className="mt-1 text-black/50">{[item.variantName || item.color, item.size, `${item.quantity} pcs`].filter(Boolean).join(" · ")}</p></div><p className="font-semibold tabular-nums">{formatRupiah(item.subtotal)}</p></div>)}</div>{!order.items.length ? <p className="mt-4 text-sm text-black/60">Rincian item belum tersedia.</p> : null}</section>
        <section className="rounded-2xl border border-black/10 p-5"><h2 className="font-semibold">Penyerahan</h2><dl className="mt-4 grid gap-3 text-sm"><Row label="Metode" value={order.order.fulfillmentMethod === "pickup" ? "Ambil di Toko" : "Dikirim"} /><Row label="Kurir" value={order.order.courier || "Belum tersedia"} /><Row label="Nomor resi" value={order.order.trackingNumber || "Belum tersedia"} /></dl></section>
      </div> : null}
    </AccountPanel>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className={`customer-summary-row ${strong ? "border-t border-black/10 pt-3 text-base font-semibold" : ""}`}><dt className="text-black/55">{label}</dt><dd className="text-right font-semibold tabular-nums">{value}</dd></div>;
}
