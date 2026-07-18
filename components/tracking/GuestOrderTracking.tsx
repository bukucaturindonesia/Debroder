"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useState } from "react";
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
    courier: string | null;
    trackingNumber: string | null;
    pickupStatus: string | null;
    fulfillmentStatus: string | null;
    nextStep: string;
    pricingStatus?: string;
    paymentUrl?: string | null;
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

  const lookup = useCallback(async (credentials: { orderNumber: string; token?: string; whatsapp?: string }) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/public/order-tracking", {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(credentials)
      });
      const payload = await response.json() as TrackingPayload & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Pesanan belum dapat dilacak.");
      setData(payload);
    } catch (reason) {
      setData(null);
      setError(reason instanceof Error ? reason.message : "Pesanan belum dapat dilacak.");
    } finally {
      setLoading(false);
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
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">Guest Order Tracking</p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-5xl">Lacak pesanan tanpa login</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-black/60">
          Gunakan tautan tracking aman, atau masukkan nomor order bersama nomor WhatsApp yang dipakai saat checkout.
        </p>

        {(!token || error) ? (
          <form onSubmit={submit} className="mt-8 grid gap-4 rounded-[28px] bg-white p-5 sm:grid-cols-[1fr_1fr_auto] sm:p-7">
            <Field label="Nomor order">
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
            <button
              type="submit"
              disabled={loading}
              className="min-h-12 self-end rounded-full bg-black px-7 text-sm font-semibold text-white hover:bg-black/75 disabled:opacity-50"
            >
              {loading ? "Memeriksa..." : "Lacak Order"}
            </button>
          </form>
        ) : null}

        {error ? (
          <div role="alert" className="mt-5 border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <p className="font-semibold">Order belum dapat dibuka</p>
            <p className="mt-1 leading-6">{error}</p>
          </div>
        ) : null}

        {loading && !data ? <TrackingSkeleton /> : null}
        {data ? <TrackingDetail data={data} /> : null}
      </div>
    </section>
  );
}

function TrackingDetail({ data }: { data: TrackingPayload }) {
  const { order } = data;
  const pricingIsFinal = (order.pricingStatus ?? "final") === "final";
  const productBaseSubtotal = data.items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="grid gap-6">
        <section className="rounded-[28px] bg-white p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/45">Nomor order</p>
              <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">{order.orderNumber}</h2>
              <p className="mt-2 text-sm text-black/55">{dateTime(order.createdAt)} · {order.maskedPhone}</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900">{order.statusLabel}</span>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <Info label="Status pembayaran" value={order.paymentStatusLabel} />
            <Info label="Metode fulfillment" value={order.fulfillmentMethod === "pickup" ? "Pickup Toko" : "Kurir Eksternal"} />
            <Info label="Sudah dibayar" value={formatRupiah(order.amountPaid)} />
            <Info label="Sisa pembayaran" value={pricingIsFinal ? formatRupiah(order.remainingBalance) : "Belum berlaku sampai harga final"} />
            {order.courier ? <Info label="Kurir" value={order.courier} /> : null}
            {order.trackingNumber ? <Info label="Nomor resi" value={order.trackingNumber} /> : null}
            {order.pickupStatus ? <Info label="Status pickup" value={readable(order.pickupStatus)} /> : null}
            {order.maskedAddress ? <Info label="Alamat terlindungi" value={order.maskedAddress} /> : null}
          </div>

          <div className="mt-7 border border-black/10 bg-[#f8f8f4] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/45">Langkah berikutnya</p>
            <p className="mt-2 text-sm leading-6">{order.nextStep}</p>
          </div>
          {order.paymentUrl ? <Link href={order.paymentUrl} className="mt-5 inline-flex min-h-12 items-center rounded-full bg-black px-6 text-sm font-semibold text-white hover:bg-black/75">Bayar Pesanan</Link> : null}
        </section>

        <section className="rounded-[28px] bg-white p-6 sm:p-8">
          <h2 className="text-xl font-semibold">Item pesanan</h2>
          <div className="mt-5 divide-y divide-black/10 border-y border-black/10">
            {data.items.map((item) => (
              <article key={item.id} className="flex justify-between gap-5 py-5 text-sm">
                <div>
                  <h3 className="font-semibold">{item.product_name}</h3>
                  <p className="mt-1 text-black/55">{[item.variant_name || item.color, item.size, item.sku, `${item.quantity} pcs`].filter(Boolean).join(" · ")}</p>
                  {item.custom_project_id ? <p className="mt-1 text-xs font-semibold text-[#063d24]">Custom Project · {item.pricing_status === "final" ? "Harga final" : "Review harga"}</p> : null}
                </div>
                <strong className="shrink-0">{formatRupiah(Number(item.subtotal))}</strong>
              </article>
            ))}
          </div>
        </section>
      </div>

      <aside className="h-fit rounded-[28px] bg-white p-6 lg:sticky lg:top-24">
        <h2 className="text-xl font-semibold">Ringkasan pembayaran</h2>
        <dl className="mt-5 grid gap-3 text-sm">
          <Money label={pricingIsFinal ? "Subtotal" : "Subtotal produk PIM"} value={pricingIsFinal ? order.subtotal : productBaseSubtotal} />
          <Money label="Ongkir" value={order.shippingCost} empty="Belum ditetapkan" />
          <Money label={pricingIsFinal ? "Total" : "Total terkunci"} value={pricingIsFinal ? order.total : null} empty="Menunggu penetapan harga" strong />
          <Money label="Sudah dibayar" value={order.amountPaid} />
          <Money label="Sisa" value={pricingIsFinal ? order.remainingBalance : null} empty="Belum berlaku" strong />
        </dl>

        {data.shippingQuote ? (
          <div className="mt-6 border-t border-black/10 pt-5 text-sm">
            <p className="font-semibold">Ongkir versi {data.shippingQuote.version}</p>
            <p className="mt-2 text-black/60">{data.shippingQuote.courier} · {data.shippingQuote.service}</p>
            {data.shippingQuote.estimate ? <p className="mt-1 text-black/60">Estimasi {data.shippingQuote.estimate}</p> : null}
            <p className="mt-2 font-semibold">{formatRupiah(data.shippingQuote.cost)}</p>
          </div>
        ) : null}

        <Link href="/track-order" className="mt-7 inline-flex text-sm font-semibold underline">Lacak order lain</Link>
      </aside>
    </div>
  );
}

function TrackingSkeleton() {
  return <div aria-label="Memuat tracking order" className="mt-8 grid animate-pulse gap-6 lg:grid-cols-2"><div className="h-72 rounded-[28px] bg-white"/><div className="h-72 rounded-[28px] bg-white"/></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2 text-sm font-semibold [&_input]:min-h-12 [&_input]:rounded-xl [&_input]:border [&_input]:border-black/15 [&_input]:px-4">{label}{children}</label>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs uppercase tracking-[0.12em] text-black/45">{label}</p><p className="mt-1 font-semibold">{value}</p></div>;
}

function Money({ label, value, empty, strong = false }: { label: string; value: number | null; empty?: string; strong?: boolean }) {
  return <div className={`flex justify-between gap-4 ${strong ? "border-t border-black/10 pt-3 text-base font-semibold" : ""}`}><dt>{label}</dt><dd>{value === null ? empty : formatRupiah(value)}</dd></div>;
}

function readable(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Makassar" }).format(new Date(value));
}
