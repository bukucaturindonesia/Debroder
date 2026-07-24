"use client";

import Link from "next/link";
import { type FormEvent, type ReactNode, useCallback, useState } from "react";
import {
  CustomerOrderReadError,
  CustomerOrderStaleWarning
} from "@/components/customer-order/CustomerOrderReadFeedback";
import { CustomerOrderStatusCard } from "@/components/customer-order/CustomerOrderStatusCard";
import { useCustomerOrderPolling } from "@/components/customer-order/useCustomerOrderPolling";
import { CarrierTrackingActions } from "@/components/tracking/CarrierTrackingActions";
import { contactLinks } from "@/lib/contact";
import { fetchCustomerOrderTracking } from "@/lib/customer-orders/api";
import type {
  CustomerOrderTrackingCredentials,
  CustomerOrderTrackingReadModel
} from "@/lib/customer-orders/contracts";
import { resolveCustomerOrderPresentation } from "@/lib/customer-order-presentation";
import { formatRupiah } from "@/lib/url";

export function GuestOrderTracking({
  initialOrderNumber = "",
  token = ""
}: {
  initialOrderNumber?: string;
  token?: string;
}) {
  const [orderNumber, setOrderNumber] = useState(initialOrderNumber);
  const [whatsapp, setWhatsapp] = useState("");
  const [credentials, setCredentials] = useState<CustomerOrderTrackingCredentials | null>(
    initialOrderNumber && token
      ? { orderNumber: initialOrderNumber, token }
      : null
  );
  const load = useCallback((signal: AbortSignal) => {
    if (!credentials) throw new Error("Data verifikasi tracking belum lengkap.");
    return fetchCustomerOrderTracking(credentials, signal);
  }, [credentials]);
  const {
    data,
    loading,
    refreshing,
    error,
    staleWarning,
    refresh
  } = useCustomerOrderPolling({ enabled: Boolean(credentials), load });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || refreshing) return;
    const next = { orderNumber, whatsapp };
    if (sameTrackingCredentials(credentials, next)) void refresh();
    else setCredentials(next);
  }

  return (
    <section className="bg-[#f6f5f0] px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-4xl">
        {!data ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">Pelacakan Pesanan</p>
            <h1 className="mt-3 text-3xl font-semibold sm:text-5xl">Lacak pesanan tanpa login</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-black/60">
              Gunakan tautan pelacakan aman, atau masukkan nomor pesanan bersama nomor WhatsApp yang dipakai saat checkout.
            </p>
          </>
        ) : null}

        {(!token || error) && !data ? (
          <form onSubmit={submit} className="mt-8 grid gap-4 rounded-[28px] bg-white p-5 sm:grid-cols-[1fr_1fr_auto] sm:p-7">
            <Field label="Nomor pesanan">
              <input
                value={orderNumber}
                onChange={(event) => setOrderNumber(event.target.value.toUpperCase())}
                placeholder="ORD-DEB-2026-0001"
                minLength={5}
                maxLength={64}
                autoComplete="off"
                required
              />
            </Field>
            <Field label="Nomor WhatsApp checkout">
              <input
                value={whatsapp}
                onChange={(event) => setWhatsapp(event.target.value)}
                placeholder="08xxxxxxxxxx"
                inputMode="tel"
                autoComplete="tel"
                required
              />
            </Field>
            <button type="submit" disabled={loading || refreshing} className="min-h-12 self-end rounded-full bg-black px-7 text-sm font-semibold text-white hover:bg-black/75 disabled:opacity-50">
              {loading || refreshing ? "Memeriksa..." : "Lacak Pesanan"}
            </button>
          </form>
        ) : null}

        {error && !data ? (
          <div className="mt-5">
            <CustomerOrderReadError
              error={error}
              retrying={refreshing}
              onRetry={() => void refresh()}
            />
          </div>
        ) : null}

        {loading && !data ? <TrackingSkeleton /> : null}
        {data ? (
          <>
            <TrackingDetail
              data={data}
              credentials={credentials}
              refreshing={refreshing}
              onRefresh={() => void refresh()}
            />
            <CustomerOrderStaleWarning
              message={staleWarning}
              refreshing={refreshing}
              onRetry={() => void refresh()}
            />
          </>
        ) : null}
      </div>
    </section>
  );
}

function TrackingDetail({ data, credentials, refreshing, onRefresh }: { data: CustomerOrderTrackingReadModel; credentials: CustomerOrderTrackingCredentials | null; refreshing: boolean; onRefresh: () => void }) {
  const { order } = data;
  const isCustom = data.items.some((item) => Boolean(item.customProjectId));
  const isPickup = order.fulfillmentMethod === "pickup";
  const activeStatus = order.fulfillmentStatus ?? order.status;
  const presentation = resolveCustomerOrderPresentation({
    status: order.status,
    paymentStatus: order.paymentStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    fulfillmentMethod: order.fulfillmentMethod,
    paymentMethod: order.paymentMethod,
    hasPaymentUrl: Boolean(data.payment.url),
    isCustom,
    activeStage: data.activeStage
  });
  const pricingIsFinal = order.pricingStatus === "final";
  const productBaseSubtotal = data.items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
  const contactHref = `${contactLinks.whatsapp}?text=${encodeURIComponent(
    `Halo Admin DEBRODER, saya ingin menanyakan status pesanan ${order.orderNumber}.`
  )}`;
  const primaryAction = trackingPrimaryAction(presentation.action, data.payment.url, contactHref);
  const pickupNotReady = isPickup
    && !["ready_for_pickup", "siap_diambil", "picked_up", "completed", "selesai", "cancelled", "expired"].includes(activeStatus);

  return (
    <div>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">Status Pesanan</p>
          <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{order.orderNumber}</h1>
          <p className="mt-2 text-sm text-black/55">{dateTime(order.createdAt)} · {order.maskedPhone}</p>
        </div>
        <button type="button" onClick={onRefresh} disabled={refreshing} className="min-h-11 rounded-full border border-black bg-white px-5 text-sm font-semibold hover:bg-black hover:text-white disabled:opacity-45">
          {refreshing ? "Memperbarui..." : "Perbarui Status"}
        </button>
      </header>

      <div className="mt-7">
        <CustomerOrderStatusCard
          presentation={presentation}
          primaryAction={primaryAction}
        >
          {order.trackingNumber ? (
            <div className="grid gap-4 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/45">Pengiriman aktif</p>
                <p className="mt-1 font-semibold">{order.courier || "Kurir eksternal"}</p>
                <p className="mt-1 break-all text-black/65">Resi: {order.trackingNumber}</p>
              </div>
              <CarrierTrackingActions courier={order.courier} trackingNumber={order.trackingNumber} compact />
            </div>
          ) : null}
        </CustomerOrderStatusCard>
      </div>

      <CustomerOperationsPanel
        orderNumber={order.orderNumber}
        credentials={credentials}
        operations={data.customerOperations}
        terminal={data.terminal}
        onChanged={onRefresh}
      />

      {pickupNotReady ? (
        <section className="mt-5 rounded-[24px] border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">
          <p className="font-semibold">Jangan datang ke toko sebelum ada konfirmasi</p>
          <p className="mt-2 leading-6">Meskipun barang berstatus Ready Stock, Admin tetap perlu memastikan barang tersedia dan sudah disiapkan di lokasi pengambilan.</p>
          <a href={contactHref} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center rounded-full border border-amber-900/30 bg-white px-5 font-semibold">Hubungi Admin</a>
        </section>
      ) : null}

      <div className="mt-6 grid gap-3">
        <Disclosure title="Ringkasan pesanan" summary={`${data.items.length} item · ${pricingIsFinal ? formatRupiah(order.total) : "Harga sedang ditetapkan"}`}>
          <div className="divide-y divide-black/10 border-y border-black/10">
            {data.items.map((item) => (
              <article key={item.id} className="flex justify-between gap-5 py-4 text-sm">
                <div>
                  <h3 className="font-semibold">{item.productName}</h3>
                  <p className="mt-1 text-black/55">{[item.variantName || item.color, item.size, item.sku, `${item.quantity} pcs`].filter(Boolean).join(" · ")}</p>
                  {item.customProjectId ? <p className="mt-1 text-xs font-semibold text-[#063d24]">Pesanan Custom · {item.pricingStatus === "final" ? "Harga final" : "Harga sedang diperiksa"}</p> : null}
                </div>
                <strong className="shrink-0">{formatRupiah(Number(item.subtotal))}</strong>
              </article>
            ))}
          </div>
        </Disclosure>

        <Disclosure title="Pembayaran" summary={`${order.paymentStatusLabel} · Sisa ${pricingIsFinal ? formatRupiah(order.remainingBalance) : "belum berlaku"}`}>
          <dl className="grid gap-3 text-sm">
            <Money label={pricingIsFinal ? "Subtotal" : "Subtotal produk PIM"} value={pricingIsFinal ? order.subtotal : productBaseSubtotal} />
            {!isPickup ? <Money label="Ongkir" value={order.shippingCost} empty="Belum ditetapkan" /> : null}
            <Money label={pricingIsFinal ? "Total" : "Total terkunci"} value={pricingIsFinal ? order.total : null} empty="Menunggu penetapan harga" strong />
            <Money label="Sudah dibayar" value={order.amountPaid} />
            <Money label="Sisa" value={pricingIsFinal ? order.remainingBalance : null} empty="Belum berlaku" strong />
          </dl>
        </Disclosure>

        <Disclosure title={isPickup ? "Informasi pengambilan" : "Informasi pengiriman"} summary={isPickup ? readable(order.pickupStatus ?? order.status) : order.courier ?? "Kurir belum ditetapkan"}>
          <dl className="grid gap-3 text-sm">
            <Info label="Metode" value={isPickup ? "Ambil di Toko" : "Kurir Eksternal"} />
            {order.courier ? <Info label="Kurir" value={order.courier} /> : null}
            {order.trackingNumber ? <Info label="Nomor resi" value={order.trackingNumber} /> : null}
            {order.maskedAddress ? <Info label="Alamat terlindungi" value={order.maskedAddress} /> : null}
            {order.pickupStatus ? <Info label="Status pengambilan" value={readable(order.pickupStatus)} /> : null}
          </dl>
          {order.trackingNumber ? (
            <div className="mt-5 border-t border-black/10 pt-4">
              <CarrierTrackingActions courier={order.courier} trackingNumber={order.trackingNumber} />
            </div>
          ) : null}
          {data.shippingQuote ? (
            <div className="mt-5 border-t border-black/10 pt-4 text-sm">
              <p className="font-semibold">Ongkir versi {data.shippingQuote.version}</p>
              <p className="mt-2 text-black/60">{data.shippingQuote.courier} · {data.shippingQuote.service}</p>
              {data.shippingQuote.estimate ? <p className="mt-1 text-black/60">Estimasi {data.shippingQuote.estimate}</p> : null}
              <p className="mt-2 font-semibold">{formatRupiah(data.shippingQuote.cost)}</p>
            </div>
          ) : null}
        </Disclosure>
      </div>

      <div className="mt-7 flex flex-wrap gap-4 text-sm font-semibold">
        <Link href="/track-order" className="underline">Lacak pesanan lain</Link>
        <a href={contactHref} target="_blank" rel="noopener noreferrer" className="underline">Butuh bantuan?</a>
      </div>
    </div>
  );
}

function trackingPrimaryAction(action: ReturnType<typeof resolveCustomerOrderPresentation>["action"], paymentUrl: string | null, contactHref: string) {
  const className = "inline-flex min-h-12 items-center justify-center rounded-full bg-black px-6 text-sm font-semibold text-white hover:bg-black/75";
  if ((action === "pay" || action === "resubmit_payment") && paymentUrl) {
    return <Link href={paymentUrl} className={className}>{action === "resubmit_payment" ? "Perbaiki Pembayaran" : "Lihat Rekening & Bayar"}</Link>;
  }
  if (action === "pickup") {
    return <a href={contactHref} target="_blank" rel="noopener noreferrer" className={className}>Hubungi Admin Sebelum Datang</a>;
  }
  if (action === "contact_admin") {
    return <a href={contactHref} target="_blank" rel="noopener noreferrer" className={className}>Hubungi Admin</a>;
  }
  return undefined;
}

function CustomerOperationsPanel({
  orderNumber,
  credentials,
  operations,
  terminal,
  onChanged
}: {
  orderNumber: string;
  credentials: CustomerOrderTrackingCredentials | null;
  operations: CustomerOrderTrackingReadModel["customerOperations"];
  terminal: boolean;
  onChanged: () => void;
}) {
  const [mode, setMode] = useState<"" | "cancel" | "extend">("");
  const [reason, setReason] = useState("");
  const [deadline, setDeadline] = useState("");
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState("");

  async function submitAction(action: "request_cancellation" | "request_pickup_extension") {
    if (!credentials || reason.trim().length < 5 || (action === "request_pickup_extension" && !deadline)) return;
    setWorking(true);
    setNotice("");
    try {
      const response = await fetch("/api/public/order-actions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...credentials,
          orderNumber,
          action,
          reason: reason.trim(),
          requestedDeadline: deadline ? new Date(deadline).toISOString() : undefined
        })
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(apiError(payload, "Permintaan belum dapat dikirim."));
      }
      setNotice(action === "request_cancellation" ? "Permintaan pembatalan sudah dikirim ke Admin." : "Permintaan perpanjangan pickup sudah dikirim.");
      setMode("");
      setReason("");
      setDeadline("");
      onChanged();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Permintaan belum dapat dikirim.");
    } finally {
      setWorking(false);
    }
  }

  const pickupCanExtend = operations.pickup && ["ready_for_pickup", "no_show"].includes(operations.pickup.status) && !operations.pickup.extensionRequestedAt;
  if (!operations.cancellation && !pickupCanExtend && !operations.refund) return null;

  return (
    <section className="mt-5 rounded-[24px] border border-black/10 bg-white p-5 text-sm">
      <h2 className="font-semibold">Bantuan Pesanan</h2>
      {operations.cancellation ? (
        <div className="mt-3 rounded-2xl bg-[#f6f5f0] p-4">
          <p className="font-semibold">Permintaan pembatalan: {operations.cancellation.status.replaceAll("_", " ")}</p>
          <p className="mt-1 text-black/60">{operations.cancellation.requiresRefund ? "Pembatalan memerlukan proses refund dana terverifikasi." : operations.cancellation.reason}</p>
        </div>
      ) : !terminal ? (
        <button type="button" onClick={() => setMode(mode === "cancel" ? "" : "cancel")} className="mt-3 min-h-11 rounded-full border border-black/20 px-5 font-semibold">
          Ajukan Pembatalan
        </button>
      ) : null}

      {operations.refund ? (
        <div className="mt-3 rounded-2xl bg-emerald-50 p-4 text-emerald-950">
          <p className="font-semibold">Refund {operations.refund.refundNumber}</p>
          <p className="mt-1">Status: {operations.refund.status.replaceAll("_", " ")} · {formatRupiah(operations.refund.amount)}</p>
        </div>
      ) : null}

      {pickupCanExtend ? (
        <button type="button" onClick={() => setMode(mode === "extend" ? "" : "extend")} className="mt-3 ml-2 min-h-11 rounded-full border border-black/20 px-5 font-semibold">
          Minta Perpanjangan Pickup
        </button>
      ) : null}

      {mode ? (
        <div className="mt-4 grid gap-3 border-t border-black/10 pt-4">
          {mode === "extend" ? (
            <label className="grid gap-2 font-semibold">Batas waktu yang diminta
              <input type="datetime-local" value={deadline} onChange={(event) => setDeadline(event.target.value)} className="min-h-11 rounded-xl border border-black/15 px-3" />
            </label>
          ) : null}
          <label className="grid gap-2 font-semibold">Alasan
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} minLength={5} maxLength={1000} rows={3} className="rounded-xl border border-black/15 p-3" />
          </label>
          <button type="button" disabled={working || reason.trim().length < 5 || (mode === "extend" && !deadline)} onClick={() => void submitAction(mode === "cancel" ? "request_cancellation" : "request_pickup_extension")} className="min-h-11 rounded-full bg-black px-5 font-semibold text-white disabled:opacity-45">
            {working ? "Mengirim..." : "Kirim Permintaan"}
          </button>
        </div>
      ) : null}
      {notice ? <p className="mt-3 rounded-xl bg-[#f6f5f0] p-3">{notice}</p> : null}
    </section>
  );
}

function Disclosure({ title, summary, children }: { title: string; summary: string; children: ReactNode }) {
  return (
    <details className="group rounded-[24px] border border-black/10 bg-white p-5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
        <div><p className="font-semibold">{title}</p><p className="mt-1 text-xs text-black/50">{summary}</p></div>
        <span className="text-xl leading-none transition group-open:rotate-45" aria-hidden="true">+</span>
      </summary>
      <div className="mt-5 border-t border-black/10 pt-5">{children}</div>
    </details>
  );
}

function TrackingSkeleton() {
  return <div aria-label="Memuat status pesanan" className="mt-8 h-80 animate-pulse rounded-[28px] bg-white" />;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-2 text-sm font-semibold [&_input]:min-h-12 [&_input]:rounded-xl [&_input]:border [&_input]:border-black/15 [&_input]:px-4">{label}{children}</label>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4"><dt className="text-black/50">{label}</dt><dd className="text-right font-semibold">{value}</dd></div>;
}

function Money({ label, value, empty, strong = false }: { label: string; value: number | null; empty?: string; strong?: boolean }) {
  return <div className={`flex justify-between gap-4 ${strong ? "border-t border-black/10 pt-3 text-base font-semibold" : ""}`}><dt className="text-black/55">{label}</dt><dd>{value === null ? empty : formatRupiah(value)}</dd></div>;
}

function readable(value: string) {
  const labels: Record<string, string> = {
    preparing: "Sedang disiapkan",
    packing: "Sedang dikemas",
    ready_for_pickup: "Siap diambil",
    ready_to_ship: "Siap dikirim",
    shipped: "Diserahkan ke kurir",
    in_transit: "Dalam perjalanan",
    delivered: "Sudah diterima",
    picked_up: "Sudah diambil",
    completed: "Selesai",
    problem: "Perlu penanganan",
    cancelled: "Dibatalkan"
  };
  return labels[value] ?? "Status sedang diperbarui";
}

function sameTrackingCredentials(
  left: CustomerOrderTrackingCredentials | null,
  right: CustomerOrderTrackingCredentials
) {
  return left?.orderNumber === right.orderNumber
    && (left.token ?? "") === (right.token ?? "")
    && (left.whatsapp ?? "") === (right.whatsapp ?? "");
}

function apiError(value: unknown, fallback: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const record = Object.fromEntries(Object.entries(value));
  return typeof record.error === "string" ? record.error : fallback;
}

function dateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Waktu belum tersedia";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Makassar" }).format(date);
}
