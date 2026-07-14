"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { contactLinks } from "@/lib/contact";
import { formatRupiah } from "@/lib/url";

type OrderPayload = {
  order: {
    orderNumber: string; customerName: string; maskedPhone: string; status: string; paymentStatus: string;
    fulfillmentMethod: string; paymentMethod: string; subtotal: number; shippingCost: number | null;
    shippingCourier: string | null; shippingService: string | null; shippingEstimate: string | null;
    total: number; whatsappConfirmationExpiresAt: string | null; whatsappConfirmedAt: string | null;
    reservationExpiresAt: string | null; finalTotalApprovedAt: string | null; trackingTokenExpiresAt: string | null; createdAt: string;
  };
  items: Array<{ id: string; product_name: string; variant_name: string; color: string; size: string; sku: string; quantity: number; unit_price: number; subtotal: number }>;
};

const statusLabels: Record<string, string> = {
  pending_confirmation: "Menunggu verifikasi WhatsApp",
  awaiting_shipping_quote: "Ongkir sedang diperiksa Admin",
  awaiting_customer_approval: "Menunggu persetujuan total",
  awaiting_payment: "Menunggu pembayaran",
  processing: "Sedang diproses",
  ready_for_pickup: "Siap diambil",
  shipped: "Dikirim",
  completed: "Selesai",
  expired: "Kedaluwarsa",
  cancelled: "Dibatalkan"
};

export function OrderConfirmationClient({ token }: { token: string }) {
  const [data, setData] = useState<OrderPayload | null>(null);
  const [confirmationCode, setConfirmationCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [trackingCopied, setTrackingCopied] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const response = await fetch(`/api/public/orders/${encodeURIComponent(token)}`, { cache: "no-store" });
      const payload = await response.json() as OrderPayload & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Order tidak tersedia.");
      setData(payload); setError("");
    } catch (reason) { if (!quiet) setError(reason instanceof Error ? reason.message : "Order tidak tersedia."); }
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
      if (!response.ok) throw new Error(payload.error || "Total gagal disetujui.");
      await load(true);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Total gagal disetujui."); }
    finally { setApproving(false); }
  }

  if (loading) return <Shell><p>Memuat order aman...</p></Shell>;
  if (error && !data) return <Shell><p className="text-red-700">{error}</p></Shell>;
  if (!data) return null;
  const { order } = data;
  const whatsappText = confirmationCode
    ? `Halo DEBRODER, saya ingin verifikasi order ${order.orderNumber}. Kode konfirmasi: ${confirmationCode}. Nomor WhatsApp saya harus dicocokkan dengan data checkout.`
    : `Halo DEBRODER, saya memerlukan bantuan verifikasi order ${order.orderNumber}.`;
  const whatsappHref = `${contactLinks.whatsapp}?text=${encodeURIComponent(whatsappText)}`;
  const trackingPath = `/track-order/${encodeURIComponent(order.orderNumber)}?token=${encodeURIComponent(token)}`;

  async function copyTrackingLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${trackingPath}`);
      setTrackingCopied(true);
    } catch {
      setError("Browser tidak mengizinkan salin otomatis. Buka tracking lalu salin alamat halaman.");
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-sm font-semibold">DEBRODER · Order Aman</p>
      <div className="mt-5 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[28px] bg-white p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/45">Order berhasil dibuat</p>
          <h1 className="mt-2 text-3xl font-semibold">{order.orderNumber}</h1>
          <p className="mt-2 text-sm text-black/55">{order.customerName} · {order.maskedPhone}</p>
          <div className="mt-6 rounded-2xl bg-emerald-50 p-4"><p className="text-xs uppercase tracking-[0.14em] text-emerald-800/65">Status</p><p className="mt-1 font-semibold text-emerald-950">{statusLabels[order.status] ?? order.status}</p></div>

          <div className="mt-5 border border-black/10 bg-[#f8f8f4] p-5 text-sm">
            <p className="font-semibold">Simpan tautan tracking aman</p>
            <p className="mt-2 leading-6 text-black/60">Tautan ini membuka status order tanpa login. Jangan bagikan kepada orang lain.</p>
            {order.trackingTokenExpiresAt ? <p className="mt-2 text-xs text-black/50">Berlaku sampai {formatDate(order.trackingTokenExpiresAt)}.</p> : null}
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href={trackingPath} className="inline-flex min-h-11 items-center rounded-full bg-black px-5 font-semibold text-white hover:bg-black/75">Lacak Order</Link>
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
            <div className="mt-5 border border-blue-200 bg-blue-50 p-5 text-sm"><p className="font-semibold">Ongkir sudah tersedia</p><p className="mt-2">{order.shippingCourier} · {order.shippingService}{order.shippingEstimate ? ` · ${order.shippingEstimate}` : ""}</p><button disabled={approving} onClick={approveTotal} className="mt-4 min-h-11 rounded-full bg-black px-5 font-semibold text-white hover:bg-black/75 disabled:opacity-50">{approving ? "Memvalidasi stok..." : `Setujui Total ${formatRupiah(order.total)}`}</button></div>
          ) : null}

          {order.status === "awaiting_shipping_quote" ? <Info>Admin akan memasukkan kurir, layanan, ongkir, dan estimasi pada order ini. Halaman diperbarui otomatis.</Info> : null}
          {order.status === "awaiting_payment" ? <Info>Stok sudah direservasi. Admin akan mengirim tautan pembayaran privat untuk transfer manual dan upload bukti.</Info> : null}
          {order.status === "processing" && order.paymentMethod === "pay_at_store" ? <Info>Stok pickup sudah direservasi. Tunggu status siap diambil, lalu bayar di toko dengan menunjukkan nomor order dan nomor WhatsApp.</Info> : null}
          {order.reservationExpiresAt ? <p className="mt-4 text-xs text-black/50">Reservasi aktif sampai {formatDate(order.reservationExpiresAt)}.</p> : null}
          {error ? <p className="mt-4 border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        </section>

        <aside className="h-fit rounded-[28px] bg-white p-6">
          <h2 className="text-xl font-semibold">Ringkasan</h2>
          <div className="mt-5 grid gap-4">{data.items.map((item) => <div key={item.id} className="border-b border-black/10 pb-4 text-sm"><div className="flex justify-between gap-3"><strong>{item.product_name}</strong><strong>{formatRupiah(Number(item.subtotal))}</strong></div><p className="mt-1 text-black/55">{item.variant_name || item.color} · {item.size} · {item.sku} × {item.quantity}</p></div>)}</div>
          <dl className="mt-5 grid gap-3 text-sm"><div className="flex justify-between"><dt>Subtotal</dt><dd>{formatRupiah(order.subtotal)}</dd></div><div className="flex justify-between"><dt>Ongkir</dt><dd>{order.shippingCost === null ? "Menunggu Admin" : formatRupiah(order.shippingCost)}</dd></div><div className="flex justify-between border-t border-black/10 pt-3 text-base font-semibold"><dt>Total</dt><dd>{formatRupiah(order.total)}</dd></div></dl>
          <Link href="/jersey/shop" className="mt-6 inline-flex text-sm font-semibold underline">Kembali ke Jersey Shop</Link>
        </aside>
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) { return <div className="mx-auto max-w-xl rounded-[28px] bg-white p-8">{children}</div>; }
function Info({ children }: { children: React.ReactNode }) { return <div className="mt-5 border border-black/10 bg-[#f8f8f4] p-5 text-sm leading-6">{children}</div>; }
function formatDate(value: string) { return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Makassar" }).format(new Date(value)); }
