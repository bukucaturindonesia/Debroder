"use client";

import Link from "next/link";
import { type FormEvent, type InputHTMLAttributes, useCallback, useEffect, useState } from "react";
import { formatAdminOrderDateTime } from "@/lib/admin-order-detail";
import { FULFILLMENT_STATUS_LABELS } from "@/lib/fulfillments";
import { createSupabaseClient } from "@/lib/supabase";
import { getFulfillmentMethodLabel, getOrderStatusLabel, getPaymentStatusLabel } from "@/lib/ui-language";

type CommerceOrder = {
  id: string;
  status: string;
  delivery_method: string;
  payment_method: string | null;
  payment_status: string;
  subtotal_amount: number;
  shipping_cost: number | null;
  total_amount: number;
  whatsapp_confirmed_at: string | null;
  whatsapp_confirmation_expires_at: string | null;
  reservation_expires_at: string | null;
};

type CommerceFulfillment = {
  id: string;
  fulfillment_number: string;
  status: keyof typeof FULFILLMENT_STATUS_LABELS;
};

const TERMINAL_ORDER_STATUSES = new Set(["cancelled", "expired", "completed", "dibatalkan", "selesai"]);

function money(value: number | null) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function dateTime(value: string | null) {
  return formatAdminOrderDateTime(value, { fallback: "-", timeZone: "Asia/Makassar" });
}

export function CommerceOrderOperations({ orderId, onChanged }: { orderId: string; onChanged: () => Promise<void> }) {
  const [order, setOrder] = useState<CommerceOrder | null>(null);
  const [reservation, setReservation] = useState<{ quantity: number; expires_at: string } | null>(null);
  const [fulfillment, setFulfillment] = useState<CommerceFulfillment | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const client = createSupabaseClient();
    if (!client) return;
    const [orderResult, reservationResult, fulfillmentResult] = await Promise.all([
      client
        .from("orders")
        .select("id,status,delivery_method,payment_method,payment_status,subtotal_amount,shipping_cost,total_amount,whatsapp_confirmed_at,whatsapp_confirmation_expires_at,reservation_expires_at")
        .eq("id", orderId)
        .maybeSingle(),
      client.from("stock_reservations").select("quantity,expires_at").eq("order_id", orderId).eq("status", "active"),
      client
        .from("fulfillments")
        .select("id,fulfillment_number,status")
        .eq("order_id", orderId)
        .is("archived_at", null)
        .neq("status", "cancelled")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    ]);
    setOrder(orderResult.data as CommerceOrder | null);
    const rows = reservationResult.data ?? [];
    setReservation(rows.length
      ? {
          quantity: rows.reduce((sum, row) => sum + Number(row.quantity), 0),
          expires_at: String(rows[0].expires_at)
        }
      : null);
    setFulfillment(fulfillmentResult.data as CommerceFulfillment | null);
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(operation: () => Promise<{ error: { message: string } | null }>, success: string) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await operation();
      if (result.error) throw new Error(result.error.message);
      setMessage(success);
      await Promise.all([load(), onChanged()]);
    } catch (error) {
      setMessage(error instanceof Error && error.message
        ? `Tindakan belum berhasil: ${error.message}`
        : "Tindakan belum berhasil diproses. Periksa data terbaru, lalu coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const code = String(form.get("code") ?? "").trim().toUpperCase();
    const client = createSupabaseClient();
    if (!client || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const { data, error } = await client.rpc("verify_public_order_whatsapp", {
        p_order_id: orderId,
        p_confirmation_code: code
      });
      if (error) throw new Error(error.message);
      const result = data as { whatsapp_confirmed_at?: string | null; whatsapp_confirmation_attempts?: number } | null;
      if (!result?.whatsapp_confirmed_at) {
        setMessage(`Kode tidak cocok. Percobaan ${result?.whatsapp_confirmation_attempts ?? "-"}/5 tercatat.`);
      } else {
        const { data: sessionData } = await client.auth.getSession();
        const response = await fetch(`/api/admin/orders/${orderId}/payment-links`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session?.access_token ?? ""}`
          },
          body: JSON.stringify({ action: "ensure" })
        });
        setMessage(response.ok
          ? "WhatsApp terverifikasi. Tautan pembayaran otomatis sudah aktif pada tracking pelanggan."
          : "WhatsApp terverifikasi. Pembayaran menunggu harga final dikunci.");
      }
      await Promise.all([load(), onChanged()]);
    } catch (error) {
      setMessage(error instanceof Error && error.message
        ? `Verifikasi belum berhasil: ${error.message}`
        : "Verifikasi belum berhasil. Periksa kode lalu coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  async function quote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const client = createSupabaseClient();
    if (!client) return;
    await run(
      async () => client.rpc("set_public_order_shipping_quote", {
        p_order_id: orderId,
        p_courier: String(form.get("courier") ?? ""),
        p_service: String(form.get("service") ?? ""),
        p_cost: Math.round(Number(form.get("cost"))),
        p_estimate: String(form.get("estimate") ?? "")
      }),
      "Ongkir disimpan sebagai versi baru. Pelanggan dapat menyetujui total pada pesanan yang sama."
    );
  }

  async function extend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const client = createSupabaseClient();
    if (!client) return;
    await run(
      async () => client.rpc("extend_public_order_reservation", {
        p_order_id: orderId,
        p_hours: Number(form.get("hours")),
        p_reason: String(form.get("reason") ?? "")
      }),
      "Reservasi diperpanjang dan tercatat dalam riwayat aktivitas."
    );
  }

  if (!order) return null;

  const terminal = TERMINAL_ORDER_STATUSES.has(order.status);

  return (
    <section className="min-w-0 border border-brand-softGray bg-white p-5 sm:p-7">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-charcoal/45">Operasional Pendukung</p>
        <h2 className="mt-2 break-words text-2xl font-semibold">Produk Siap Beli</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-brand-charcoal/60">
          Informasi dan form di bawah disusun mengikuti tahap pesanan. Dokumen pengiriman internal dibuat otomatis oleh sistem saat seluruh syarat terpenuhi.
        </p>
      </div>

      {message ? <div className="mt-5 break-words border border-brand-softGray bg-brand-offWhite p-4 text-sm font-semibold">{message}</div> : null}

      {terminal ? (
        <div className="mt-6 border-l-4 border-brand-charcoal bg-brand-offWhite p-5">
          <h3 className="font-semibold">Proses operasional sudah ditutup</h3>
          <p className="mt-2 text-sm leading-6 text-brand-charcoal/65">
            Pesanan ini tidak boleh dilanjutkan ke persiapan, pengemasan, atau pengiriman. Gunakan bagian pembayaran atau riwayat hanya untuk menutup temuan yang masih tersisa.
          </p>
        </div>
      ) : null}

      <div className="mt-6 grid min-w-0 gap-5 xl:grid-cols-2">
        <div className="min-w-0 border border-brand-softGray p-5">
          <h3 className="font-semibold">Ringkasan Pesanan</h3>
          <dl className="mt-4 grid min-w-0 gap-3 text-sm">
            <Row label="Status" value={getOrderStatusLabel(order.status)} />
            <Row label="Pembayaran" value={getPaymentStatusLabel(order.payment_status)} />
            <Row label="Metode Penyerahan" value={getFulfillmentMethodLabel(order.delivery_method)} />
            <Row label="Subtotal" value={money(order.subtotal_amount)} />
            <Row label="Ongkir" value={order.shipping_cost === null ? "Belum ditetapkan" : money(order.shipping_cost)} />
            <Row label="Total" value={money(order.total_amount)} />
            <Row label="WhatsApp terverifikasi" value={dateTime(order.whatsapp_confirmed_at)} />
            <Row label="Reservasi" value={reservation ? `${reservation.quantity} pcs sampai ${dateTime(reservation.expires_at)}` : "Belum ada"} />
          </dl>
        </div>

        {!terminal && order.status === "pending_confirmation" ? (
          <form onSubmit={verify} className="min-w-0 border border-brand-softGray p-5">
            <h3 className="font-semibold">Tugas Saat Ini: Verifikasi WhatsApp</h3>
            <p className="mt-2 text-xs leading-5 text-brand-charcoal/60">
              Cocokkan nomor pengirim WhatsApp dengan nomor pelanggan, lalu masukkan kode sekali pakai. Kedaluwarsa {dateTime(order.whatsapp_confirmation_expires_at)}.
            </p>
            <input name="code" minLength={8} maxLength={12} required autoComplete="off" className="mt-4 min-h-11 w-full max-w-full rounded-lg border border-brand-softGray px-3 uppercase tracking-[0.15em]" placeholder="KODE KONFIRMASI" />
            <button disabled={busy} className="mt-3 min-h-11 w-full rounded-full bg-brand-green px-5 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto">
              {busy ? "Memproses..." : "Verifikasi WhatsApp"}
            </button>
          </form>
        ) : null}

        {!terminal && order.delivery_method === "shipping" && ["awaiting_shipping_quote", "awaiting_customer_approval"].includes(order.status) ? (
          <form onSubmit={quote} className="min-w-0 border border-brand-softGray p-5">
            <h3 className="font-semibold">Tugas Saat Ini: Tetapkan Ongkir</h3>
            <p className="mt-2 text-xs leading-5 text-brand-charcoal/60">Setiap perubahan disimpan sebagai versi baru dan total dihitung ulang oleh sistem.</p>
            <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2">
              <Input name="courier" label="Kurir" required />
              <Input name="service" label="Layanan" required />
              <Input name="cost" label="Ongkir" type="number" min="0" required />
              <Input name="estimate" label="Estimasi" placeholder="2–3 hari" />
            </div>
            <button disabled={busy} className="mt-3 min-h-11 w-full rounded-full bg-brand-charcoal px-5 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto">
              {busy ? "Menyimpan..." : "Simpan Ongkir"}
            </button>
          </form>
        ) : null}

        {!terminal && reservation ? (
          <form onSubmit={extend} className="min-w-0 border border-brand-softGray p-5">
            <h3 className="font-semibold">Reservasi Stok</h3>
            <p className="mt-2 text-xs leading-5 text-brand-charcoal/60">Perpanjang hanya ketika dibutuhkan. Alasan wajib dan seluruh tindakan dicatat.</p>
            <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-[120px_minmax(0,1fr)]">
              <Input name="hours" label="Jam" type="number" min="1" max="168" required />
              <Input name="reason" label="Alasan" required />
            </div>
            <button disabled={busy} className="mt-3 min-h-11 w-full rounded-full border border-brand-charcoal px-5 text-sm font-semibold disabled:opacity-50 sm:w-auto">
              {busy ? "Memproses..." : "Perpanjang Reservasi"}
            </button>
          </form>
        ) : null}

        {!terminal && order.whatsapp_confirmed_at ? (
          <div className="min-w-0 border border-brand-softGray p-5">
            <h3 className="font-semibold">Pengiriman / Ambil di Toko</h3>
            {fulfillment ? (
              <>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-brand-charcoal/45">Nomor Pengiriman DEBRODER</p>
                <p className="mt-1 break-all text-lg font-semibold">{fulfillment.fulfillment_number}</p>
                <p className="mt-2 text-sm text-brand-charcoal/65">Tahap: {FULFILLMENT_STATUS_LABELS[fulfillment.status] || "Status belum dikenali"}</p>
                <Link href={`/admin/fulfillments/${fulfillment.id}#guided-action`} className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-brand-charcoal px-5 text-sm font-semibold text-white sm:w-auto">
                  Lanjutkan Tahap Aktif
                </Link>
              </>
            ) : (
              <div className="mt-3 border-l-4 border-blue-500 bg-blue-50 p-4 text-sm text-blue-950">
                <p className="font-semibold">Dokumen internal dibuat otomatis</p>
                <p className="mt-1 leading-6">
                  Sistem akan membuat nomor pengiriman DEBRODER setelah konfirmasi, pembayaran/reservasi, dan metode penyerahan memenuhi syarat. Admin tidak perlu membuat dokumen secara manual.
                </p>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-w-0 gap-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] sm:gap-4">
      <dt className="text-brand-charcoal/55">{label}</dt>
      <dd className="min-w-0 break-words font-semibold sm:text-right">{value}</dd>
    </div>
  );
}

function Input({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="grid min-w-0 gap-1 text-xs font-semibold">
      {label}
      <input {...props} className="min-h-11 min-w-0 w-full max-w-full rounded-lg border border-brand-softGray px-3 text-sm font-normal" />
    </label>
  );
}
