"use client";

import Link from "next/link";
import { type FormEvent, type ReactNode, useCallback, useEffect, useState } from "react";
import { CustomerOrderStatusCard } from "@/components/customer-order/CustomerOrderStatusCard";
import { contactLinks } from "@/lib/contact";
import { resolveCustomerOrderPresentation } from "@/lib/customer-order-presentation";
import type { OrderActiveStageResolution } from "@/lib/order-active-stage";
import { formatRupiah } from "@/lib/url";

type TrackingPayload = {
  order: {
    orderNumber: string;
    createdAt: string;
    maskedPhone: string;
    maskedAddress: string | null;
    status: string;
    statusLabel: string;
    paymentStatus: string;
    paymentStatusLabel: string;
    subtotal: number;
    shippingCost: number | null;
    total: number;
    amountPaid: number;
    remainingBalance: number;
    fulfillmentMethod: string;
    paymentMethod: string;
    courier: string | null;
    trackingNumber: string | null;
    pickupStatus: string | null;
    fulfillmentStatus: string | null;
    nextStep: string;
    pricingStatus?: string;
    paymentUrl?: string | null;
    activeStage?: OrderActiveStageResolution | null;
  };
  items: Array<{
    id: string;
    product_name: string;
    variant_name: string | null;
    color: string;
    size: string;
    sku: string | null;
    quantity: number;
    unit_price: number;
    subtotal: number;
    custom_project_id?: string | null;
    pricing_status?: string;
  }>;
  shippingQuote: {
    version: number;
    courier: string;
    service: string;
    cost: number;
    estimate: string | null;
    total: number;
    status: string;
    createdAt: string;
  } | null;
};

type TrackingCredentials = { orderNumber: string; token?: string; whatsapp?: string };

export function GuestOrderTracking({
  initialOrderNumber = "",
  token = ""
}: {
  initialOrderNumber?: string;
  token?: string;
}) {
  const [orderNumber, setOrderNumber] = useState(initialOrderNumber);
  const [whatsapp, setWhatsapp] = useState("");
  const [data, setData] = useState<TrackingPayload | null>(null);
  const [loading, setLoading] = useState(Boolean(initialOrderNumber && token));
  const [error, setError] = useState("");
  const [lastCredentials, setLastCredentials] = useState<TrackingCredentials | null>(null);

  const lookup = useCallback(async (credentials: TrackingCredentials, quiet = false) => {
    if (!quiet) setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/public/order-tracking", {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(credentials)
      });
      const payload = await response.json() as TrackingPayload & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Pesanan belum dapat dilacak. Periksa nomor pesanan dan data penerima lalu coba lagi.");
      setData(payload);
      setLastCredentials(credentials);
    } catch (reason) {
      if (!quiet) setData(null);
      setError(reason instanceof Error ? reason.message : "Pesanan belum dapat dilacak.");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialOrderNumber && token) void lookup({ orderNumber: initialOrderNumber, token });
  }, [initialOrderNumber, lookup, token]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    void lookup({ orderNumber, whatsapp });
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
            <button type="submit" disabled={loading} className="min-h-12 self-end rounded-full bg-black px-7 text-sm font-semibold text-white hover:bg-black/75 disabled:opacity-50">
              {loading ? "Memeriksa..." : "Lacak Pesanan"}
            </button>
          </form>
        ) : null}

        {error ? (
          <div role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <p className="font-semibold">Status belum dapat diperbarui</p>
            <p className="mt-1 leading-6">{error}</p>
          </div>
        ) : null}

        {loading && !data ? <TrackingSkeleton /> : null}
        {data ? (
          <TrackingDetail
            data={data}
            refreshing={loading}
            onRefresh={() => lastCredentials ? void lookup(lastCredentials) : undefined}
          />
        ) : null}
      </div>
    </section>
  );
}

function TrackingDetail({ data, refreshing, onRefresh }: { data: TrackingPayload; refreshing: boolean; onRefresh: () => void }) {
  const { order } = data;
  const isCustom = data.items.some((item) => Boolean(item.custom_project_id));
  const isPickup = order.fulfillmentMethod === "pickup";
  const activeStatus = order.fulfillmentStatus ?? order.status;
  const presentation = resolveCustomerOrderPresentation({
    status: order.status,
    paymentStatus: order.paymentStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    fulfillmentMethod: order.fulfillmentMethod,
    paymentMethod: order.paymentMethod,
    hasPaymentUrl: Boolean(order.paymentUrl),
    isCustom,
    activeStage: order.activeStage
  });
  const pricingIsFinal = (order.pricingStatus ?? "final") === "final";
  const productBaseSubtotal = data.items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
  const contactHref = `${contactLinks.whatsapp}?text=${encodeURIComponent(
    `Halo Admin DEBRODER, saya ingin menanyakan status pesanan ${order.orderNumber}.`
  )}`;
  const primaryAction = trackingPrimaryAction(presentation.action, order.paymentUrl ?? null, contactHref);
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
            <div className="text-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/45">Nomor resi</p>
              <p className="mt-1 font-semibold">{order.trackingNumber}</p>
            </div>
          ) : null}
        </CustomerOrderStatusCard>
      </div>

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
                  <h3 className="font-semibold">{item.product_name}</h3>
                  <p className="mt-1 text-black/55">{[item.variant_name || item.color, item.size, item.sku, `${item.quantity} pcs`].filter(Boolean).join(" · ")}</p>
                  {item.custom_project_id ? <p className="mt-1 text-xs font-semibold text-[#063d24]">Pesanan Custom · {item.pricing_status === "final" ? "Harga final" : "Harga sedang diperiksa"}</p> : null}
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
    shipped: "Sudah dikirim",
    delivered: "Sudah diterima",
    picked_up: "Sudah diambil",
    completed: "Selesai",
    problem: "Perlu penanganan",
    cancelled: "Dibatalkan"
  };
  return labels[value] ?? "Status sedang diperbarui";
}

function dateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Waktu belum tersedia";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Makassar" }).format(date);
}
