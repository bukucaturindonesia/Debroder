"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type SafeOrder = {
  orderNumber: string; totalAmount: number; effectivePaid: number; outstandingBalance: number;
  requiredAmount: number; requirementMet: boolean; expiresAt: string; remainingUses: number;
};

function money(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

export function PublicPaymentForm({ token }: { token: string }) {
  const [order, setOrder] = useState<SafeOrder | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState("");
  const idempotencyKey = useMemo(() => crypto.randomUUID().replace(/-/g, ""), []);

  useEffect(() => {
    fetch(`/api/public/payments/${encodeURIComponent(token)}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as SafeOrder & { error?: string };
        if (!response.ok) throw new Error(payload.error || "Tautan tidak tersedia.");
        setOrder(payload);
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Tautan tidak tersedia."))
      .finally(() => setLoading(false));
  }, [token]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (sending) return;
    setSending(true); setError("");
    const form = new FormData(event.currentTarget); form.set("idempotencyKey", idempotencyKey);
    try {
      const response = await fetch(`/api/public/payments/${encodeURIComponent(token)}`, { method: "POST", body: form });
      const payload = (await response.json()) as { paymentNumber?: string; error?: string };
      if (!response.ok) throw new Error(payload.error || "Pembayaran gagal dikirim.");
      setSuccess(`${payload.paymentNumber ?? "Pembayaran"} berhasil dikirim dan menunggu verifikasi.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Pembayaran gagal dikirim."); }
    finally { setSending(false); }
  }

  if (loading) return <div className="border border-brand-softGray bg-white p-6">Memuat tautan pembayaran...</div>;
  if (error && !order) return <div className="border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>;
  if (!order) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
      <section className="border border-brand-softGray bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-charcoal/50">Pesanan</p>
        <h1 className="mt-2 text-2xl font-semibold">{order.orderNumber}</h1>
        <dl className="mt-6 grid gap-4 text-sm">
          <div><dt className="text-brand-charcoal/55">Total tagihan</dt><dd className="mt-1 font-semibold">{money(order.totalAmount)}</dd></div>
          <div><dt className="text-brand-charcoal/55">Sudah efektif dibayar</dt><dd className="mt-1 font-semibold">{money(order.effectivePaid)}</dd></div>
          <div><dt className="text-brand-charcoal/55">Sisa tagihan</dt><dd className="mt-1 font-semibold">{money(order.outstandingBalance)}</dd></div>
          <div><dt className="text-brand-charcoal/55">Minimum pembayaran saat ini</dt><dd className="mt-1 font-semibold">{money(order.requiredAmount)}</dd></div>
        </dl>
        <p className="mt-6 text-xs leading-5 text-brand-charcoal/55">Tautan berlaku sampai {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(order.expiresAt))}.</p>
      </section>
      <section className="border border-brand-softGray bg-white p-6">
        <h2 className="text-xl font-semibold">Kirim pembayaran</h2>
        {success ? <div className="mt-5 border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{success}</div> : (
          <form onSubmit={submit} className="mt-5 grid gap-4">
            <Field label="Nominal"><input name="amount" type="number" min="1" required /></Field>
            <Field label="Tanggal pembayaran"><input name="paidAt" type="datetime-local" required /></Field>
            <input name="method" type="hidden" value="bank_transfer" />
            <Field label="Nama pengirim"><input name="senderName" maxLength={150} required /></Field>
            <Field label="Bank pengirim"><input name="channelName" required /></Field>
            <Field label="Nomor referensi"><input name="referenceNumber" /></Field>
            <Field label="Catatan"><textarea name="customerNotes" rows={3} /></Field>
            <Field label="Bukti pembayaran (PNG, JPG, PDF; maks. 5 MB)"><input name="proof" type="file" accept="image/png,image/jpeg,application/pdf" required /></Field>
            {error ? <p className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
            <button disabled={sending} className="min-h-12 bg-brand-green px-5 font-semibold text-white disabled:opacity-50">{sending ? "Mengirim..." : "Kirim untuk Verifikasi"}</button>
          </form>
        )}
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2 text-sm font-semibold [&_input]:min-h-11 [&_input]:rounded-lg [&_input]:border [&_input]:border-brand-softGray [&_input]:px-3 [&_select]:min-h-11 [&_select]:rounded-lg [&_select]:border [&_select]:border-brand-softGray [&_select]:px-3 [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-brand-softGray [&_textarea]:p-3">{label}{children}</label>;
}
