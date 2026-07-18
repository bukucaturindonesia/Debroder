"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase";

type CommerceOrder = {
  id: string; status: string; delivery_method: string; payment_method: string | null;
  payment_status: string;
  subtotal_amount: number; shipping_cost: number | null; total_amount: number;
  whatsapp_confirmed_at: string | null; whatsapp_confirmation_expires_at: string | null;
  reservation_expires_at: string | null;
};

function money(value: number | null) { return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value || 0)); }
function dateTime(value: string | null) { return value ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Makassar" }).format(new Date(value)) : "-"; }

export function CommerceOrderOperations({ orderId, onChanged }: { orderId: string; onChanged: () => Promise<void> }) {
  const [order, setOrder] = useState<CommerceOrder | null>(null);
  const [reservation, setReservation] = useState<{ quantity: number; expires_at: string } | null>(null);
  const [fulfillment, setFulfillment] = useState<{ id: string; fulfillment_number: string; status: string } | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const client = createSupabaseClient(); if (!client) return;
    const [orderResult, reservationResult, fulfillmentResult] = await Promise.all([
      client.from("orders").select("id,status,delivery_method,payment_method,payment_status,subtotal_amount,shipping_cost,total_amount,whatsapp_confirmed_at,whatsapp_confirmation_expires_at,reservation_expires_at").eq("id", orderId).maybeSingle(),
      client.from("stock_reservations").select("quantity,expires_at").eq("order_id", orderId).eq("status", "active"),
      client.from("fulfillments").select("id,fulfillment_number,status").eq("order_id", orderId).is("archived_at", null).neq("status", "cancelled").order("created_at", { ascending: false }).limit(1).maybeSingle()
    ]);
    setOrder(orderResult.data as CommerceOrder | null);
    const rows = reservationResult.data ?? [];
    setReservation(rows.length ? { quantity: rows.reduce((sum, row) => sum + Number(row.quantity), 0), expires_at: String(rows[0].expires_at) } : null);
    setFulfillment(fulfillmentResult.data as { id: string; fulfillment_number: string; status: string } | null);
  }, [orderId]);

  useEffect(() => { void load(); }, [load]);

  async function run(operation: () => Promise<{ error: { message: string } | null }>, success: string) {
    if (busy) return; setBusy(true); setMessage("");
    try {
      const result = await operation();
      if (result.error) throw new Error(result.error.message);
      setMessage(success); await Promise.all([load(), onChanged()]);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Operasi gagal."); }
    finally { setBusy(false); }
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const code = String(form.get("code") ?? "").trim().toUpperCase();
    const client = createSupabaseClient(); if (!client) return;
    if (busy) return; setBusy(true); setMessage("");
    try {
      const { data, error } = await client.rpc("verify_public_order_whatsapp", { p_order_id: orderId, p_confirmation_code: code });
      if (error) throw new Error(error.message);
      const result = data as { whatsapp_confirmed_at?: string | null; whatsapp_confirmation_attempts?: number } | null;
      if (!result?.whatsapp_confirmed_at) setMessage(`Kode tidak cocok. Percobaan ${result?.whatsapp_confirmation_attempts ?? "-"}/5 tercatat.`);
      else {
        const { data: sessionData } = await client.auth.getSession();
        const response = await fetch(`/api/admin/orders/${orderId}/payment-links`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionData.session?.access_token ?? ""}` },
          body: JSON.stringify({ action: "ensure" })
        });
        setMessage(response.ok ? "WhatsApp terverifikasi. Tautan pembayaran otomatis sudah aktif pada tracking pelanggan." : "WhatsApp terverifikasi. Pembayaran menunggu harga final terkunci.");
      }
      await Promise.all([load(), onChanged()]);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Verifikasi gagal."); }
    finally { setBusy(false); }
  }

  async function quote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const client = createSupabaseClient(); if (!client) return;
    await run(async () => client.rpc("set_public_order_shipping_quote", {
      p_order_id: orderId, p_courier: String(form.get("courier") ?? ""), p_service: String(form.get("service") ?? ""),
      p_cost: Math.round(Number(form.get("cost"))), p_estimate: String(form.get("estimate") ?? "")
    }), "Ongkir disimpan sebagai versi baru; pelanggan dapat menyetujui total pada order yang sama.");
  }

  async function extend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const client = createSupabaseClient(); if (!client) return;
    await run(async () => client.rpc("extend_public_order_reservation", { p_order_id: orderId, p_hours: Number(form.get("hours")), p_reason: String(form.get("reason") ?? "") }), "Reservasi diperpanjang dan tercatat di audit log.");
  }

  async function createFulfillment() {
    const client = createSupabaseClient(); if (!client) return;
    await run(async () => client.rpc("create_ready_stock_fulfillment", { p_order_id: orderId }), "Dokumen fulfillment Ready Stock dibuat pada domain fulfillment yang sama.");
  }

  async function completePickupAtStore() {
    if (!fulfillment) return;
    const notes = window.prompt("Catatan penerimaan pembayaran di toko:")?.trim() || "Pembayaran penuh diterima saat pickup";
    const client = createSupabaseClient(); if (!client) return;
    await run(async () => client.rpc("complete_ready_stock_pickup_at_store", { p_fulfillment_id: fulfillment.id, p_admin_notes: notes }), "Pembayaran dan pickup diselesaikan atomik.");
  }

  if (!order) return null;
  return (
    <section className="border border-brand-softGray bg-white p-5 sm:p-7">
      <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-charcoal/45">Commerce Foundation V1</p><h2 className="mt-2 text-2xl font-semibold">Operasi Ready Stock</h2><p className="mt-2 text-sm text-brand-charcoal/60">Gunakan order ini; jangan membuat order pengganti setelah verifikasi atau penetapan ongkir.</p></div>
      {message ? <div className="mt-5 border border-brand-softGray bg-brand-offWhite p-4 text-sm font-semibold">{message}</div> : null}
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="border border-brand-softGray p-5"><h3 className="font-semibold">Status Commerce</h3><dl className="mt-4 grid gap-2 text-sm"><Row label="Status" value={order.status} /><Row label="Pembayaran" value={order.payment_status} /><Row label="Fulfillment" value={order.delivery_method} /><Row label="Subtotal" value={money(order.subtotal_amount)} /><Row label="Ongkir" value={order.shipping_cost === null ? "Belum ditetapkan" : money(order.shipping_cost)} /><Row label="Total" value={money(order.total_amount)} /><Row label="WA terverifikasi" value={dateTime(order.whatsapp_confirmed_at)} /><Row label="Reservasi" value={reservation ? `${reservation.quantity} pcs sampai ${dateTime(reservation.expires_at)}` : "Belum ada"} /></dl></div>

        {order.status === "pending_confirmation" ? <form onSubmit={verify} className="border border-brand-softGray p-5"><h3 className="font-semibold">Verifikasi WhatsApp Manual</h3><p className="mt-2 text-xs leading-5 text-brand-charcoal/60">Wajib cocokkan nomor pengirim WhatsApp dengan nomor pada detail order, lalu masukkan kode sekali pakai. Nomor order saja tidak cukup. Kedaluwarsa {dateTime(order.whatsapp_confirmation_expires_at)}.</p><input name="code" minLength={8} maxLength={12} required autoComplete="off" className="mt-4 min-h-11 w-full rounded-lg border border-brand-softGray px-3 uppercase tracking-[0.15em]" placeholder="KODE KONFIRMASI"/><button disabled={busy} className="mt-3 min-h-11 rounded-full bg-brand-green px-5 text-sm font-semibold text-white disabled:opacity-50">Verifikasi WhatsApp</button></form> : null}

        {order.delivery_method === "shipping" && ["awaiting_shipping_quote", "awaiting_customer_approval"].includes(order.status) ? <form onSubmit={quote} className="border border-brand-softGray p-5"><h3 className="font-semibold">Ongkir Manual</h3><p className="mt-2 text-xs leading-5 text-brand-charcoal/60">Setiap perubahan membuat history versi dan total dihitung server-side.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><Input name="courier" label="Kurir" required/><Input name="service" label="Layanan" required/><Input name="cost" label="Ongkir" type="number" min="0" required/><Input name="estimate" label="Estimasi" placeholder="2–3 hari"/></div><button disabled={busy} className="mt-3 min-h-11 rounded-full bg-brand-charcoal px-5 text-sm font-semibold text-white disabled:opacity-50">Simpan Ongkir</button></form> : null}

        {reservation ? <form onSubmit={extend} className="border border-brand-softGray p-5"><h3 className="font-semibold">Perpanjang Reservasi</h3><p className="mt-2 text-xs leading-5 text-brand-charcoal/60">Alasan wajib; maksimal 168 jam. Aksi tercatat dalam audit log.</p><div className="mt-4 grid gap-3 sm:grid-cols-[120px_1fr]"><Input name="hours" label="Jam" type="number" min="1" max="168" required/><Input name="reason" label="Alasan" required/></div><button disabled={busy} className="mt-3 min-h-11 rounded-full border border-brand-charcoal px-5 text-sm font-semibold disabled:opacity-50">Perpanjang</button></form> : null}

        {order.whatsapp_confirmed_at ? <div className="border border-brand-softGray p-5"><h3 className="font-semibold">Fulfillment Ready Stock</h3>{fulfillment ? <><p className="mt-2 text-sm">{fulfillment.fulfillment_number} · {fulfillment.status}</p><Link href={`/admin/fulfillments/${fulfillment.id}`} className="mt-3 inline-flex min-h-10 items-center rounded-full border border-brand-charcoal px-4 text-sm font-semibold">Buka Fulfillment</Link>{fulfillment.status === "ready_for_pickup" && order.payment_method === "pay_at_store" && !["paid", "terverifikasi"].includes(order.payment_status) ? <button type="button" disabled={busy} onClick={() => void completePickupAtStore()} className="ml-2 mt-3 min-h-10 rounded-full bg-brand-green px-4 text-sm font-semibold text-white disabled:opacity-50">Bayar & Selesaikan Pickup</button> : null}</> : <><p className="mt-2 text-xs leading-5 text-brand-charcoal/60">Kurir/pickup transfer harus lunas. Pickup bayar di toko dapat dibuat selama reservasi aktif.</p><button type="button" disabled={busy} onClick={() => void createFulfillment()} className="mt-3 min-h-11 rounded-full bg-brand-charcoal px-5 text-sm font-semibold text-white disabled:opacity-50">Buat Dokumen Fulfillment</button></>}</div> : null}
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-4"><dt className="text-brand-charcoal/55">{label}</dt><dd className="text-right font-semibold">{value}</dd></div>; }
function Input({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) { return <label className="grid gap-1 text-xs font-semibold">{label}<input {...props} className="min-h-11 rounded-lg border border-brand-softGray px-3 text-sm font-normal"/></label>; }
