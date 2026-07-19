"use client";

import Link from "next/link";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { CustomerOrderStatusCard } from "@/components/customer-order/CustomerOrderStatusCard";
import { PersistentTrackingButton } from "@/components/customer-order/PersistentTrackingButton";
import { contactLinks } from "@/lib/contact";
import { resolveCustomerOrderPresentation } from "@/lib/customer-order-presentation";
import { getOrderStatusLabel } from "@/lib/ui-language";
import { formatRupiah } from "@/lib/url";

type OrderPayload = {
  order: {
    orderNumber: string;
    customerName: string;
    maskedPhone: string;
    status: string;
    paymentStatus: string;
    fulfillmentMethod: string;
    paymentMethod: string;
    subtotal: number;
    shippingCost: number | null;
    shippingCourier: string | null;
    shippingService: string | null;
    shippingEstimate: string | null;
    total: number;
    whatsappConfirmationExpiresAt: string | null;
    whatsappConfirmedAt: string | null;
    reservationExpiresAt: string | null;
    finalTotalApprovedAt: string | null;
    trackingTokenExpiresAt: string | null;
    createdAt: string;
    pricingStatus?: string;
    customQuoteStatus?: string | null;
    customQuoteVersion?: number | null;
    customQuoteLockedAt?: string | null;
  };
  items: Array<{
    id: string;
    product_name: string;
    variant_name: string;
    color: string;
    size: string;
    sku: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    custom_project_id?: string | null;
    pricing_status?: string;
  }>;
  customQuote?: {
    version_number: number;
    status: string;
    quoted_total: number;
    pricing_components: unknown;
    design_version_snapshot: unknown;
    valid_until: string;
    sent_at: string;
    locked_at: string | null;
  } | null;
  payment?: { url: string | null; expiresAt: string | null; unavailableReason: string | null };
};

const TERMINAL_ORDER_STATUSES = new Set(["completed", "selesai", "delivered", "picked_up", "cancelled", "dibatalkan", "expired"]);

export function OrderConfirmationClient({ token }: { token: string }) {
  const [data, setData] = useState<OrderPayload | null>(null);
  const [confirmationCode, setConfirmationCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [trackingCopied, setTrackingCopied] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [revisionReason, setRevisionReason] = useState("");

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const response = await fetch(`/api/public/orders/${encodeURIComponent(token)}`, { cache: "no-store" });
      const payload = await response.json() as OrderPayload & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Pesanan tidak tersedia. Periksa kembali tautan yang Anda gunakan.");
      setData(payload);
      setError("");
    } catch (reason) {
      if (!quiet) setError(reason instanceof Error ? reason.message : "Pesanan tidak tersedia. Periksa kembali tautan yang Anda gunakan.");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    try {
      const draft = JSON.parse(sessionStorage.getItem(`debroder-order-${token}`) || "{}") as { confirmationCode?: string };
      setConfirmationCode(draft.confirmationCode ?? "");
    } catch {
      setConfirmationCode("");
    }
    void load();
    const timer = window.setInterval(() => void load(true), 20_000);
    return () => window.clearInterval(timer);
  }, [load, token]);

  async function approveTotal() {
    if (approving) return;
    setApproving(true);
    setError("");
    try {
      const response = await fetch(`/api/public/orders/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "approve_total" })
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Total pesanan belum dapat disetujui. Coba lagi.");
      await load(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Total gagal disetujui.");
    } finally {
      setApproving(false);
    }
  }

  async function decideCustomQuote(action: "approve_custom_quote" | "request_custom_revision") {
    if (approving) return;
    if (action === "approve_custom_quote" && !acknowledged) {
      setError("Konfirmasi persetujuan wajib dicentang.");
      return;
    }
    if (action === "request_custom_revision" && revisionReason.trim().length < 5) {
      setError("Tuliskan alasan revisi minimal 5 karakter.");
      return;
    }
    setApproving(true);
    setError("");
    try {
      const response = await fetch(`/api/public/orders/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action,
          acknowledgement: acknowledged ? "Saya menyetujui versi, desain, rincian, dan total penawaran aktif." : "",
          reason: revisionReason.trim()
        })
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Pilihan penawaran belum dapat disimpan. Coba lagi.");
      setRevisionReason("");
      await load(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Keputusan penawaran gagal disimpan.");
    } finally {
      setApproving(false);
    }
  }

  if (loading) return <Shell><p>Memuat pesanan...</p></Shell>;
  if (error && !data) return <Shell><p className="text-red-700">{error}</p></Shell>;
  if (!data) return null;

  const { order } = data;
  const isCustom = data.items.some((item) => Boolean(item.custom_project_id));
  const isPickup = order.fulfillmentMethod === "pickup";
  const paymentUrl = data.payment?.url ?? null;
  const trackingPath = `/track-order/${encodeURIComponent(order.orderNumber)}?token=${encodeURIComponent(token)}`;
  const presentation = resolveCustomerOrderPresentation({
    status: order.status,
    paymentStatus: order.paymentStatus,
    fulfillmentMethod: order.fulfillmentMethod,
    paymentMethod: order.paymentMethod,
    hasPaymentUrl: Boolean(paymentUrl),
    isCustom
  });
  const pricingIsFinal = (order.pricingStatus ?? "final") === "final";
  const productBaseSubtotal = data.items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
  const customQuotePreview = customerQuotePreview(data.customQuote?.pricing_components);
  const verifyWhatsappHref = `${contactLinks.whatsapp}?text=${encodeURIComponent(
    confirmationCode
      ? `Halo DEBRODER, saya ingin verifikasi pesanan ${order.orderNumber}. Kode konfirmasi: ${confirmationCode}. Nomor WhatsApp saya harus dicocokkan dengan data checkout.`
      : `Halo DEBRODER, saya memerlukan bantuan verifikasi pesanan ${order.orderNumber}.`
  )}`;
  const pickupWhatsappHref = `${contactLinks.whatsapp}?text=${encodeURIComponent(
    `Halo Admin DEBRODER, saya ingin memastikan kesiapan pesanan ${order.orderNumber} sebelum datang ke toko.`
  )}`;
  const adminHelpHref = `${contactLinks.whatsapp}?text=${encodeURIComponent(
    `Halo Admin DEBRODER, saya memerlukan bantuan untuk pesanan ${order.orderNumber}.`
  )}`;

  async function copyTrackingLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${trackingPath}`);
      setTrackingCopied(true);
    } catch {
      setError("Tautan belum dapat disalin otomatis. Buka halaman pelacakan, lalu salin alamat halaman secara manual.");
    }
  }

  const primaryAction = renderPrimaryAction({
    presentationAction: presentation.action,
    paymentUrl,
    paymentHelpHref: adminHelpHref,
    pickupWhatsappHref,
    verifyWhatsappHref,
    orderTotal: order.total,
    paymentStatus: order.paymentStatus
  });

  return (
    <div className="mx-auto max-w-4xl pb-24 sm:pb-0">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">Pesanan DEBRODER</p>
          <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{order.orderNumber}</h1>
          <p className="mt-2 text-sm text-black/55">
            {order.customerName} · {order.maskedPhone} · {getOrderStatusLabel(order.status, "customer")}
          </p>
        </div>
        <PersistentTrackingButton href={trackingPath} />
      </header>

      <div className="mt-7">
        <CustomerOrderStatusCard
          presentation={presentation}
          primaryAction={primaryAction}
        >
          {presentation.action === "verify_whatsapp" ? (
            <div className="text-sm leading-6">
              <p>Kirim pesan dari nomor WhatsApp yang dipakai saat checkout. Nomor pesanan saja tidak cukup.</p>
              {confirmationCode ? (
                <p className="mt-3 text-2xl font-bold tracking-[0.2em]">{confirmationCode}</p>
              ) : (
                <p className="mt-3">Kode tersimpan pada perangkat checkout. Hubungi Admin bila halaman dibuka dari perangkat lain.</p>
              )}
            </div>
          ) : null}

          {presentation.action === "approve_quote" && data.customQuote ? (
            <div className="text-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">Penawaran Custom v{data.customQuote.version_number}</p>
                  <p className="mt-1 text-black/55">Berlaku sampai {formatDate(data.customQuote.valid_until)}</p>
                </div>
                <strong className="text-lg">{formatRupiah(Number(data.customQuote.quoted_total))}</strong>
              </div>
              <details className="mt-4 rounded-2xl border border-black/10 bg-white/70 p-4">
                <summary className="cursor-pointer font-semibold">Lihat rincian penawaran</summary>
                <div className="mt-4 divide-y divide-black/10 border-y border-black/10">
                  {customQuotePreview.lines.map((line) => (
                    <div key={line.id} className="flex justify-between gap-4 py-3">
                      <div>
                        <p className="font-semibold">{line.label}</p>
                        <p className="mt-1 text-xs text-black/55">{line.kind === "PRODUCT_BASE" ? "Produk dasar" : line.kind} · {line.quantity} {line.unit}</p>
                      </div>
                      <strong className="shrink-0">{formatRupiah(line.subtotal)}</strong>
                    </div>
                  ))}
                </div>
                {customQuotePreview.customerNote ? <div className="mt-4"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/45">Catatan penawaran</p><p className="mt-2 leading-6">{customQuotePreview.customerNote}</p></div> : null}
              </details>
              <label className="mt-4 flex items-start gap-3 leading-6">
                <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} className="mt-1 h-4 w-4" />
                <span>Saya menyetujui versi penawaran, desain, rincian, dan total aktif ini.</span>
              </label>
              <button
                type="button"
                disabled={approving || !acknowledged}
                onClick={() => void decideCustomQuote("approve_custom_quote")}
                className="mt-4 min-h-11 rounded-full bg-black px-5 font-semibold text-white hover:bg-black/75 disabled:opacity-45"
              >
                {approving ? "Menyimpan keputusan..." : "Setujui Penawaran"}
              </button>
              <details className="mt-4 rounded-2xl border border-black/10 bg-white/70 p-4">
                <summary className="cursor-pointer font-semibold">Perlu revisi?</summary>
                <label className="mt-4 grid gap-2 font-semibold">
                  Alasan revisi
                  <textarea
                    value={revisionReason}
                    onChange={(event) => setRevisionReason(event.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-black/15 bg-white p-3 font-normal"
                    placeholder="Jelaskan bagian yang perlu direvisi"
                  />
                </label>
                <button
                  type="button"
                  disabled={approving || revisionReason.trim().length < 5}
                  onClick={() => void decideCustomQuote("request_custom_revision")}
                  className="mt-3 min-h-11 rounded-full border border-black/30 bg-white px-5 font-semibold disabled:opacity-45"
                >
                  Minta Revisi
                </button>
              </details>
            </div>
          ) : null}

          {presentation.action === "approve_total" ? (
            <div className="text-sm leading-6">
              <p className="font-semibold">{order.shippingCourier} · {order.shippingService}</p>
              {order.shippingEstimate ? <p className="mt-1 text-black/60">Estimasi {order.shippingEstimate}</p> : null}
              <div className="mt-4 flex items-center justify-between border-y border-black/10 py-3">
                <span>Total akhir</span>
                <strong>{formatRupiah(order.total)}</strong>
              </div>
              <button
                type="button"
                disabled={approving}
                onClick={() => void approveTotal()}
                className="mt-4 min-h-11 rounded-full bg-black px-5 font-semibold text-white disabled:opacity-45"
              >
                {approving ? "Memvalidasi stok..." : "Setujui Total"}
              </button>
            </div>
          ) : null}

          {presentation.action === "pay" && data.payment?.expiresAt ? (
            <p className="text-xs text-black/55">Tautan pembayaran berlaku sampai {formatDate(data.payment.expiresAt)}.</p>
          ) : null}
        </CustomerOrderStatusCard>
      </div>

      {isPickup && presentation.action !== "pickup" && !TERMINAL_ORDER_STATUSES.has(order.status) ? (
        <section className="mt-5 rounded-[24px] border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">
          <p className="font-semibold">Penting sebelum datang ke toko</p>
          <p className="mt-2 leading-6">Jangan datang sebelum menerima konfirmasi dari Admin. Barang Ready Stock mungkin masih berada di lokasi penyimpanan lain, sedang disiapkan, atau perlu dipindahkan ke toko.</p>
          <a href={pickupWhatsappHref} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center rounded-full border border-amber-900/30 bg-white px-5 font-semibold hover:border-amber-900">
            Hubungi Admin via WhatsApp
          </a>
        </section>
      ) : null}

      {error ? <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}

      <div className="mt-6 grid gap-3">
        <Disclosure title="Ringkasan pesanan" summary={`${data.items.length} item · ${pricingIsFinal ? formatRupiah(order.total) : "Harga sedang ditetapkan"}`}>
          <div className="divide-y divide-black/10 border-y border-black/10">
            {data.items.map((item) => (
              <article key={item.id} className="flex justify-between gap-4 py-4 text-sm">
                <div>
                  <p className="font-semibold">{item.product_name}</p>
                  <p className="mt-1 text-black/55">{[item.variant_name || item.color, item.size, item.sku, `${item.quantity} pcs`].filter(Boolean).join(" · ")}</p>
                </div>
                <strong className="shrink-0">{formatRupiah(Number(item.subtotal))}</strong>
              </article>
            ))}
          </div>
          <dl className="mt-4 grid gap-3 text-sm">
            <Summary label={pricingIsFinal ? "Subtotal" : "Subtotal produk PIM"} value={formatRupiah(pricingIsFinal ? order.subtotal : productBaseSubtotal)} />
            {!isPickup ? <Summary label="Ongkir" value={order.shippingCost === null ? "Menunggu Admin" : formatRupiah(order.shippingCost)} /> : null}
            <Summary label="Total" value={pricingIsFinal ? formatRupiah(order.total) : "Menunggu penetapan harga"} strong />
          </dl>
        </Disclosure>

        <Disclosure title="Penyerahan dan pembayaran" summary={`${isPickup ? "Ambil di Toko" : "Dikirim"} · ${paymentMethodLabel(order.paymentMethod)}`}>
          <dl className="grid gap-3 text-sm">
            <Summary label="Metode penyerahan" value={isPickup ? "Ambil di Toko" : "Kurir Eksternal"} />
            <Summary label="Metode pembayaran" value={paymentMethodLabel(order.paymentMethod)} />
            {order.shippingCourier ? <Summary label="Kurir" value={`${order.shippingCourier}${order.shippingService ? ` · ${order.shippingService}` : ""}`} /> : null}
            {order.reservationExpiresAt ? <Summary label="Reservasi aktif sampai" value={formatDate(order.reservationExpiresAt)} /> : null}
          </dl>
        </Disclosure>

        <Disclosure title="Tautan pelacakan aman" summary={trackingCopied ? "Tautan berhasil disalin" : "Simpan untuk membuka status tanpa login"}>
          <p className="text-sm leading-6 text-black/60">Jangan bagikan tautan ini kepada orang lain.</p>
          {order.trackingTokenExpiresAt ? <p className="mt-2 text-xs text-black/50">Berlaku sampai {formatDate(order.trackingTokenExpiresAt)}.</p> : null}
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href={trackingPath} className="inline-flex min-h-11 items-center rounded-full bg-black px-5 text-sm font-semibold text-white">Lacak Pesanan</Link>
            <button type="button" onClick={() => void copyTrackingLink()} className="min-h-11 rounded-full border border-black/20 px-5 text-sm font-semibold">
              {trackingCopied ? "Link Tersalin" : "Salin Link"}
            </button>
          </div>
        </Disclosure>
      </div>
    </div>
  );
}

function renderPrimaryAction({
  presentationAction,
  paymentUrl,
  paymentHelpHref,
  pickupWhatsappHref,
  verifyWhatsappHref,
  orderTotal,
  paymentStatus
}: {
  presentationAction: ReturnType<typeof resolveCustomerOrderPresentation>["action"];
  paymentUrl: string | null;
  paymentHelpHref: string;
  pickupWhatsappHref: string;
  verifyWhatsappHref: string;
  orderTotal: number;
  paymentStatus: string;
}) {
  const primaryClass = "inline-flex min-h-12 items-center justify-center rounded-full bg-black px-6 text-sm font-semibold text-white hover:bg-black/75";
  if (presentationAction === "verify_whatsapp") {
    return <a href={verifyWhatsappHref} target="_blank" rel="noopener noreferrer" className={primaryClass}>Verifikasi via WhatsApp</a>;
  }
  if ((presentationAction === "pay" || presentationAction === "resubmit_payment") && paymentUrl) {
    return (
      <Link href={paymentUrl} className={primaryClass}>
        {presentationAction === "resubmit_payment" || paymentStatus === "rejected" ? "Perbaiki Pembayaran" : `Lihat Rekening & Bayar ${formatRupiah(orderTotal)}`}
      </Link>
    );
  }
  if (presentationAction === "contact_admin") {
    return <a href={paymentHelpHref} target="_blank" rel="noopener noreferrer" className={primaryClass}>Hubungi Admin</a>;
  }
  if (presentationAction === "pickup") {
    return <a href={pickupWhatsappHref} target="_blank" rel="noopener noreferrer" className={primaryClass}>Hubungi Admin Sebelum Datang</a>;
  }
  return undefined;
}

function Disclosure({ title, summary, children }: { title: string; summary: string; children: ReactNode }) {
  return (
    <details className="group rounded-[24px] border border-black/10 bg-white p-5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
        <div>
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-xs text-black/50">{summary}</p>
        </div>
        <span className="text-xl leading-none transition group-open:rotate-45" aria-hidden="true">+</span>
      </summary>
      <div className="mt-5 border-t border-black/10 pt-5">{children}</div>
    </details>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-xl rounded-[28px] bg-white p-8">{children}</div>;
}

function Summary({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className={`flex justify-between gap-4 ${strong ? "border-t border-black/10 pt-3 text-base font-semibold" : ""}`}><dt className="text-black/55">{label}</dt><dd className="text-right font-semibold">{value}</dd></div>;
}

function paymentMethodLabel(value: string) {
  if (value === "bank_transfer") return "Transfer Bank";
  if (value === "pay_at_store") return "Bayar di Toko";
  return "Diperiksa Admin";
}

function customerQuotePreview(value: unknown) {
  const record = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
  const productLines = Array.isArray(record?.product_lines) ? record.product_lines : [];
  const editableLines = Array.isArray(record?.editable_lines) ? record.editable_lines : [];
  const lines = [...productLines, ...editableLines].flatMap((candidate, index) => {
    const line = candidate && typeof candidate === "object" && !Array.isArray(candidate) ? candidate as Record<string, unknown> : null;
    const quantity = integerQuoteValue(line?.quantity);
    const subtotal = integerQuoteValue(line?.subtotal);
    if (!line || quantity === null || subtotal === null) return [];
    return [{
      id: typeof line.id === "string" ? line.id : `quote-line-${index}`,
      kind: typeof line.kind === "string" ? line.kind : "OTHER",
      label: typeof line.label === "string" && line.label.trim() ? line.label : "Komponen harga",
      quantity,
      unit: typeof line.unit === "string" && line.unit.trim() ? line.unit : "unit",
      subtotal
    }];
  });
  return {
    lines,
    customerNote: typeof record?.customer_note === "string" ? record.customer_note.trim() : ""
  };
}

function integerQuoteValue(value: unknown) {
  const numeric = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : Number.NaN;
  return Number.isSafeInteger(numeric) ? numeric : null;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "waktu belum tersedia";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Makassar" }).format(date);
}
