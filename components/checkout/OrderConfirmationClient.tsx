"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { contactLinks } from "@/lib/contact";
import { getOrderStatusLabel } from "@/lib/ui-language";
import { formatRupiah } from "@/lib/url";

type OrderPayload = {
  order: {
    orderNumber: string; customerName: string; maskedPhone: string; status: string; paymentStatus: string;
    fulfillmentMethod: string; paymentMethod: string; subtotal: number; shippingCost: number | null;
    shippingCourier: string | null; shippingService: string | null; shippingEstimate: string | null;
    total: number; whatsappConfirmationExpiresAt: string | null; whatsappConfirmedAt: string | null;
    reservationExpiresAt: string | null; finalTotalApprovedAt: string | null; trackingTokenExpiresAt: string | null; createdAt: string; pricingStatus?: string;
    customQuoteStatus?: string | null; customQuoteVersion?: number | null; customQuoteLockedAt?: string | null;
  };
  items: Array<{ id: string; product_name: string; variant_name: string; color: string; size: string; sku: string; quantity: number; unit_price: number; subtotal: number; custom_project_id?: string | null; pricing_status?: string }>;
  customQuote?: { version_number: number; status: string; quoted_total: number; pricing_components: unknown; design_version_snapshot: unknown; valid_until: string; sent_at: string; locked_at: string | null } | null;
  payment?: { url: string | null; expiresAt: string | null; unavailableReason: string | null };
};

const TERMINAL_ORDER_STATUSES = new Set(["completed", "cancelled", "expired"]);

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
      if (!response.ok) throw new Error("Pesanan tidak tersedia. Periksa kembali tautan yang Anda gunakan.");
      setData(payload); setError("");
    } catch (reason) { if (!quiet) setError(reason instanceof Error ? reason.message : "Pesanan tidak tersedia. Periksa kembali tautan yang Anda gunakan."); }
    finally { if (!quiet) setLoading(false); }
  }, [token]);

  useEffect(() => {
    try {
      const draft = JSON.parse(sessionStorage.getItem(`debroder-order-${token}`) || "{}") as { confirmationCode?: string };
      setConfirmationCode(draft.confirmationCode ?? "");
    } catch { setConfirmationCode(""); }
    void load();
    const timer = window.setInterval(() => void load(true), 20_000);
    return () => window.clearInterval(timer);
  }, [load, token]);

  async function approveTotal() {
    if (approving) return;
    setApproving(true); setError("");
    try {
      const response = await fetch(`/api/public/orders/${encodeURIComponent(token)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "approve_total" }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error("Total pesanan belum dapat disetujui. Coba lagi.");
      await load(true);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Total gagal disetujui."); }
    finally { setApproving(false); }
  }

  async function decideCustomQuote(action: "approve_custom_quote" | "request_custom_revision") {
    if (approving) return;
    if (action === "approve_custom_quote" && !acknowledged) { setError("Konfirmasi persetujuan wajib dicentang."); return; }
    if (action === "request_custom_revision" && revisionReason.trim().length < 5) { setError("Tuliskan alasan revisi minimal 5 karakter."); return; }
    setApproving(true); setError("");
    try {
      const response = await fetch(`/api/public/orders/${encodeURIComponent(token)}`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, acknowledgement: acknowledged ? "Saya menyetujui versi, desain, rincian, dan total penawaran aktif." : "", reason: revisionReason.trim() })
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error("Pilihan penawaran belum dapat disimpan. Coba lagi.");
      setRevisionReason(""); await load(true);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Keputusan penawaran gagal disimpan."); }
    finally { setApproving(false); }
  }

  if (loading) return <Shell><p>Memuat pesanan...</p></Shell>;
  if (error && !data) return <Shell><p className="text-red-700">{error}</p></Shell>;
  if (!data) return null;
  const { order } = data;
  const pricingIsFinal = (order.pricingStatus ?? "final") === "final";
  const productBaseSubtotal = data.items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
  const customQuotePreview = customerQuotePreview(data.customQuote?.pricing_components);
  const isPickup = order.fulfillmentMethod === "pickup";
  const isBankTransfer = order.paymentMethod === "bank_transfer";
  const isPayAtStore = order.paymentMethod === "pay_at_store";
  const paymentUrl = data.payment?.url ?? null;
  const whatsappText = confirmationCode
    ? `Halo DEBRODER, saya ingin verifikasi order ${order.orderNumber}. Kode konfirmasi: ${confirmationCode}. Nomor WhatsApp saya harus dicocokkan dengan data checkout.`
    : `Halo DEBRODER, saya memerlukan bantuan verifikasi order ${order.orderNumber}.`;
  const whatsappHref = `${contactLinks.whatsapp}?text=${encodeURIComponent(whatsappText)}`;
  const pickupWhatsappText = `Halo Admin DEBRODER, saya ingin memastikan kesiapan pesanan ${order.orderNumber} sebelum datang ke toko.`;
  const pickupWhatsappHref = `${contactLinks.whatsapp}?text=${encodeURIComponent(pickupWhatsappText)}`;
  const paymentHelpText = `Halo Admin DEBRODER, saya memerlukan bantuan instruksi pembayaran untuk pesanan ${order.orderNumber}.`;
  const paymentHelpHref = `${contactLinks.whatsapp}?text=${encodeURIComponent(paymentHelpText)}`;
  const trackingPath = `/track-order/${encodeURIComponent(order.orderNumber)}?token=${encodeURIComponent(token)}`;

  async function copyTrackingLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${trackingPath}`);
      setTrackingCopied(true);
    } catch {
      setError("Tautan belum dapat disalin otomatis. Buka halaman pelacakan, lalu salin alamat halaman secara manual.");
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-sm font-semibold">DEBRODER · Pesanan Aman</p>
      <div className="mt-5 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[28px] bg-white p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/45">Pesanan berhasil dibuat</p>
          <h1 className="mt-2 text-3xl font-semibold">{order.orderNumber}</h1>
          <p className="mt-2 text-sm text-black/55">{order.customerName} · {order.maskedPhone}</p>
          <div className="mt-6 rounded-2xl bg-emerald-50 p-4"><p className="text-xs uppercase tracking-[0.14em] text-emerald-800/65">Status</p><p className="mt-1 font-semibold text-emerald-950">{getOrderStatusLabel(order.status, "customer")}</p></div>

          <div className="mt-5 border border-black/10 bg-[#f8f8f4] p-5 text-sm">
            <p className="font-semibold">Simpan tautan pelacakan aman</p>
            <p className="mt-2 leading-6 text-black/60">Tautan ini membuka status pesanan tanpa login. Jangan bagikan kepada orang lain.</p>
            {order.trackingTokenExpiresAt ? <p className="mt-2 text-xs text-black/50">Berlaku sampai {formatDate(order.trackingTokenExpiresAt)}.</p> : null}
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href={trackingPath} className="inline-flex min-h-11 items-center rounded-full bg-black px-5 font-semibold text-white hover:bg-black/75">Lacak Pesanan</Link>
              <button type="button" onClick={() => void copyTrackingLink()} className="min-h-11 rounded-full border border-black/20 px-5 font-semibold">{trackingCopied ? "Link Tersalin" : "Salin Link"}</button>
            </div>
          </div>

          {order.status === "pending_confirmation" ? (
            <div className="mt-5 border border-amber-300 bg-amber-50 p-5 text-sm">
              <p className="font-semibold">Verifikasi nomor WhatsApp maksimal 60 menit</p>
              <p className="mt-2 leading-6">Kirim pesan dari nomor WhatsApp yang dipakai saat checkout. Admin mencocokkan nomor pengirim dan kode sekali pakai—nomor order saja tidak cukup.</p>
              {confirmationCode ? <p className="mt-3 text-2xl font-bold tracking-[0.2em]">{confirmationCode}</p> : <p className="mt-3 text-amber-900">Kode tersimpan pada perangkat checkout. Hubungi Admin bila halaman dibuka dari perangkat lain.</p>}
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-black px-5 font-semibold text-white hover:bg-black/75">Verifikasi via WhatsApp</a>
            </div>
          ) : null}

          {order.status === "awaiting_customer_approval" ? (
            data.customQuote ? (
              <div className="mt-5 border border-blue-200 bg-blue-50 p-5 text-sm">
                <p className="font-semibold">Penawaran Custom v{data.customQuote.version_number}</p>
                <p className="mt-2 leading-6">Periksa produk, varian, jumlah, desain, layanan, dan total aktif. Berlaku sampai {formatDate(data.customQuote.valid_until)}.</p>
                {customQuotePreview.lines.length > 0 ? <div className="mt-4 divide-y divide-blue-200 border-y border-blue-200">{customQuotePreview.lines.map((line) => <div key={line.id} className="flex justify-between gap-4 py-3"><div><p className="font-semibold">{line.label}</p><p className="mt-1 text-xs text-black/55">{line.kind === "PRODUCT_BASE" ? "Produk dasar" : line.kind} · {line.quantity} {line.unit}</p></div><strong className="shrink-0">{formatRupiah(line.subtotal)}</strong></div>)}</div> : null}
                {customQuotePreview.customerNote ? <div className="mt-4 border border-blue-200 bg-white p-3"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/45">Catatan penawaran</p><p className="mt-2 leading-6">{customQuotePreview.customerNote}</p></div> : null}
                <div className="mt-4 flex items-center justify-between border-y border-blue-200 py-3"><span>Total penawaran</span><strong>{formatRupiah(Number(data.customQuote.quoted_total))}</strong></div>
                <label className="mt-4 flex items-start gap-3 leading-6"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} className="mt-1 h-4 w-4"/><span>Saya menyetujui versi penawaran, desain, rincian, dan total aktif ini.</span></label>
                <button type="button" disabled={approving || !acknowledged} onClick={() => void decideCustomQuote("approve_custom_quote")} className="mt-4 min-h-11 rounded-full bg-black px-5 font-semibold text-white hover:bg-black/75 disabled:opacity-50">{approving ? "Menyimpan keputusan..." : "Setujui Penawaran"}</button>
                <div className="mt-5 border-t border-blue-200 pt-4"><label className="font-semibold">Minta revisi<textarea value={revisionReason} onChange={(event) => setRevisionReason(event.target.value)} rows={3} className="mt-2 w-full border border-blue-200 bg-white p-3 font-normal" placeholder="Jelaskan bagian yang perlu direvisi"/></label><button type="button" disabled={approving || revisionReason.trim().length < 5} onClick={() => void decideCustomQuote("request_custom_revision")} className="mt-3 min-h-11 rounded-full border border-black/30 px-5 font-semibold disabled:opacity-50">Minta Revisi</button></div>
              </div>
            ) : (
              <div className="mt-5 border border-blue-200 bg-blue-50 p-5 text-sm"><p className="font-semibold">Ongkir sudah tersedia</p><p className="mt-2">{order.shippingCourier} · {order.shippingService}{order.shippingEstimate ? ` · ${order.shippingEstimate}` : ""}</p><button type="button" disabled={approving} onClick={approveTotal} className="mt-4 min-h-11 rounded-full bg-black px-5 font-semibold text-white hover:bg-black/75 disabled:opacity-50">{approving ? "Memvalidasi stok..." : `Setujui Total ${formatRupiah(order.total)}`}</button></div>
            )
          ) : null}

          {order.status === "awaiting_shipping_quote" ? <Info>Admin akan memasukkan kurir, layanan, ongkir, dan estimasi pada pesanan ini. Halaman akan diperbarui otomatis.</Info> : null}
          {order.status === "under_review" ? <Info>Proyek custom sudah tercatat pada pesanan ini. Admin akan memeriksa desain, layanan, estimasi pengerjaan, dan harga sebelum meminta pembayaran.</Info> : null}

          {order.status === "awaiting_payment" && isBankTransfer ? (
            paymentUrl ? (
              <div className="mt-5 border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-950">
                <p className="font-semibold">Instruksi pembayaran sudah tersedia</p>
                <p className="mt-2 leading-6">Total yang perlu dibayar adalah <strong>{formatRupiah(order.total)}</strong>. Buka halaman pembayaran untuk melihat rekening aktif DEBRODER, menyalin nomor rekening dan nominal, lalu mengunggah bukti pembayaran.</p>
                {data.payment?.expiresAt ? <p className="mt-2 text-xs text-emerald-900/70">Tautan pembayaran berlaku sampai {formatDate(data.payment.expiresAt)}.</p> : null}
                <Link href={paymentUrl} className="mt-4 inline-flex min-h-11 items-center rounded-full bg-black px-5 font-semibold text-white hover:bg-black/75">{order.paymentStatus === "unpaid" ? "Lihat Rekening & Bayar" : "Buka Status Pembayaran"}</Link>
              </div>
            ) : (
              <div className="mt-5 border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">
                <p className="font-semibold">Instruksi pembayaran belum tersedia</p>
                <p className="mt-2 leading-6">Pesanan tetap tersimpan. Hubungi Admin DEBRODER agar instruksi pembayaran dapat diperiksa.</p>
                <a href={paymentHelpHref} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-black px-5 font-semibold text-white hover:bg-black/75">Hubungi Admin</a>
              </div>
            )
          ) : null}

          {order.status === "processing" && isPayAtStore ? <Info>Stok untuk pengambilan di toko sudah disimpan. Anda belum perlu transfer. Tunggu konfirmasi barang siap, lalu bayar di toko dengan menunjukkan nomor pesanan dan nomor WhatsApp.</Info> : null}

          {isPickup && !TERMINAL_ORDER_STATUSES.has(order.status) ? (
            <div className="mt-5 border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">
              <p className="font-semibold">Penting sebelum datang ke toko</p>
              <p className="mt-2 leading-6">Jangan datang sebelum menerima konfirmasi dari Admin. Meskipun produk berstatus Ready Stock, barang mungkin masih berada di lokasi penyimpanan lain, sedang disiapkan, atau perlu dipindahkan ke toko.</p>
              <a href={pickupWhatsappHref} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center rounded-full border border-amber-900/30 bg-white px-5 font-semibold hover:border-amber-900">Hubungi Admin via WhatsApp</a>
            </div>
          ) : null}

          {order.reservationExpiresAt ? <p className="mt-4 text-xs text-black/50">Reservasi aktif sampai {formatDate(order.reservationExpiresAt)}.</p> : null}
          {error ? <p className="mt-4 border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        </section>

        <aside className="h-fit rounded-[28px] bg-white p-6">
          <h2 className="text-xl font-semibold">Ringkasan</h2>
          <div className="mt-5 grid gap-4">{data.items.map((item) => <div key={item.id} className="border-b border-black/10 pb-4 text-sm"><div className="flex justify-between gap-3"><strong>{item.product_name}</strong><strong>{formatRupiah(Number(item.subtotal))}</strong></div><p className="mt-1 text-black/55">{item.variant_name || item.color} · {item.size} · {item.sku} × {item.quantity}</p>{item.custom_project_id ? <p className="mt-1 text-xs font-semibold text-[#063d24]">Custom Project · {item.pricing_status === "final" ? "Harga final" : "Review harga"}</p> : null}</div>)}</div>
          <dl className="mt-5 grid gap-3 text-sm">
            <div className="flex justify-between"><dt>{pricingIsFinal ? "Subtotal" : "Subtotal produk PIM"}</dt><dd>{formatRupiah(pricingIsFinal ? order.subtotal : productBaseSubtotal)}</dd></div>
            <div className="flex justify-between"><dt>Penyerahan</dt><dd>{isPickup ? "Ambil di Toko" : "Dikirim"}</dd></div>
            <div className="flex justify-between"><dt>Pembayaran</dt><dd>{paymentMethodLabel(order.paymentMethod)}</dd></div>
            {!isPickup ? <div className="flex justify-between"><dt>Ongkir</dt><dd>{order.shippingCost === null ? "Menunggu Admin" : formatRupiah(order.shippingCost)}</dd></div> : null}
            <div className="flex justify-between border-t border-black/10 pt-3 text-base font-semibold"><dt>{pricingIsFinal ? "Total" : "Total terkunci"}</dt><dd>{pricingIsFinal ? formatRupiah(order.total) : "Menunggu penetapan harga"}</dd></div>
          </dl>
          <Link href={data.items.some((item) => item.custom_project_id) ? "/custom" : "/koleksi"} className="mt-6 inline-flex text-sm font-semibold underline">Kembali belanja</Link>
        </aside>
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) { return <div className="mx-auto max-w-xl rounded-[28px] bg-white p-8">{children}</div>; }
function Info({ children }: { children: React.ReactNode }) { return <div className="mt-5 border border-black/10 bg-[#f8f8f4] p-5 text-sm leading-6">{children}</div>; }

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
function formatDate(value: string) { return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Makassar" }).format(new Date(value)); }
