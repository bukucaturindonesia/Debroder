"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type PaymentMethod = {
  id: string;
  code: string;
  type: "bank_transfer" | "qris" | "ewallet";
  displayName: string;
  bankName: string | null;
  accountNumber: string | null;
  accountHolder: string | null;
  qrisImageUrl: string | null;
  instructions: string;
  expiresInHours: number;
};

type SafeOrder = {
  orderNumber: string;
  customerName: string;
  paymentStatus: string;
  totalAmount: number;
  effectivePaid: number;
  outstandingBalance: number;
  requiredAmount: number;
  requirementMet: boolean;
  expiresAt: string;
  remainingUses: number;
  items: Array<{ id: string; name: string; quantity: number; unitPrice: number; subtotal: number }>;
  submissions: Array<{ id: string; paymentNumber: string; status: string; outcome: string; reason: string | null; amount: number; submittedAt: string | null }>;
  methods: PaymentMethod[];
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
  const [selectedMethodId, setSelectedMethodId] = useState("");
  const [copied, setCopied] = useState("");
  const idempotencyKey = useMemo(() => crypto.randomUUID().replace(/-/g, ""), []);
  const selectedMethod = order?.methods.find((method) => method.id === selectedMethodId) ?? null;

  useEffect(() => {
    fetch(`/api/public/payments/${encodeURIComponent(token)}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as SafeOrder & { error?: string };
        if (!response.ok) throw new Error(payload.error || "Tautan pembayaran tidak tersedia atau sudah tidak berlaku.");
        setOrder(payload);
        setSelectedMethodId(payload.methods[0]?.id ?? "");
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Tautan tidak tersedia."))
      .finally(() => setLoading(false));
  }, [token]);

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(""), 1800);
    } catch {
      setError("Salin otomatis tidak tersedia. Pilih teks lalu salin manual.");
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending || !selectedMethodId) return;
    setSending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    form.set("idempotencyKey", idempotencyKey);
    form.set("paymentMethodId", selectedMethodId);
    try {
      const response = await fetch(`/api/public/payments/${encodeURIComponent(token)}`, { method: "POST", body: form });
      const payload = (await response.json()) as { paymentNumber?: string; error?: string };
      if (!response.ok) throw new Error(payload.error || "Pembayaran belum dapat dikirim.");
      setSuccess(`${payload.paymentNumber ?? "Laporan pembayaran"} berhasil dikirim dan menunggu pemeriksaan mutasi oleh Admin.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Pembayaran gagal dikirim.");
    } finally {
      setSending(false);
    }
  }

  if (loading) return <div className="border border-brand-softGray bg-white p-6">Memuat instruksi pembayaran...</div>;
  if (error && !order) return <div className="border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>;
  if (!order) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="grid content-start gap-6">
        <section className="border border-brand-softGray bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-charcoal/50">Pesanan</p>
          <h1 className="mt-2 text-2xl font-semibold">{order.orderNumber}</h1>
          <p className="mt-1 text-sm text-brand-charcoal/60">Pelanggan: {order.customerName}</p>
          <div className="mt-5 divide-y divide-brand-softGray border-y border-brand-softGray">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between gap-4 py-3 text-sm">
                <div><p className="font-semibold">{item.name}</p><p className="mt-1 text-xs text-brand-charcoal/55">{item.quantity} × {money(item.unitPrice)}</p></div>
                <p className="font-semibold">{money(item.subtotal)}</p>
              </div>
            ))}
          </div>
          <dl className="mt-5 grid gap-3 text-sm">
            <Summary label="Total tagihan" value={money(order.totalAmount)} />
            <Summary label="Pembayaran terverifikasi" value={money(order.effectivePaid)} />
            <Summary label="Sisa tagihan" value={money(order.outstandingBalance)} />
            <Summary label="Syarat pembayaran" value={`${money(order.requiredAmount)}${order.requirementMet ? " · terpenuhi" : ""}`} />
          </dl>
          <button type="button" onClick={() => void copy(String(order.outstandingBalance), "nominal")} className="mt-5 min-h-10 rounded-full border border-brand-charcoal px-4 text-sm font-semibold">
            {copied === "nominal" ? "Nominal tersalin" : "Salin sisa tagihan"}
          </button>
          <p className="mt-5 text-xs leading-5 text-brand-charcoal/55">Tautan berlaku sampai {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(order.expiresAt))}.</p>
        </section>

        <section className="border border-amber-300 bg-amber-50 p-5 text-sm leading-6 text-amber-950" role="note">
          <p className="font-semibold">Bukti transfer bukan konfirmasi pembayaran final.</p>
          <p className="mt-1">Status pembayaran hanya berubah setelah Admin mencocokkan dana yang benar-benar masuk pada mutasi rekening DEBRODER. Jangan membuat order baru saat mengirim ulang bukti.</p>
        </section>

        {order.submissions.length ? <section className="border border-brand-softGray bg-white p-5"><h2 className="font-semibold">Riwayat laporan pembayaran</h2><div className="mt-4 grid gap-3">{order.submissions.map((submission) => <article key={submission.id} className="border-l-2 border-brand-softGray pl-3 text-sm"><div className="flex justify-between gap-3"><strong>{submission.paymentNumber}</strong><strong>{money(submission.amount)}</strong></div><p className="mt-1 text-brand-charcoal/60">{submissionOutcome(submission.outcome, submission.status)}</p>{submission.reason ? <p className="mt-1 text-red-700">Tindak lanjut: {submission.reason}</p> : null}</article>)}</div></section> : null}
      </div>

      <section className="border border-brand-softGray bg-white p-6">
        <h2 className="text-xl font-semibold">Instruksi dan laporan pembayaran</h2>
        {!order.methods.length ? (
          <div className="mt-5 border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">Metode pembayaran belum diaktifkan oleh Admin. Jangan melakukan transfer sebelum instruksi resmi tersedia.</div>
        ) : (
          <>
            <fieldset className="mt-5 grid gap-3">
              <legend className="text-sm font-semibold">Pilih tujuan pembayaran</legend>
              {order.methods.map((method) => (
                <label key={method.id} className={`flex min-h-12 cursor-pointer items-center gap-3 border p-3 text-sm ${selectedMethodId === method.id ? "border-brand-charcoal bg-brand-offWhite" : "border-brand-softGray"}`}>
                  <input type="radio" name="methodChoice" checked={selectedMethodId === method.id} onChange={() => setSelectedMethodId(method.id)} />
                  <span><strong>{method.displayName}</strong>{method.bankName ? ` · ${method.bankName}` : ""}</span>
                </label>
              ))}
            </fieldset>

            {selectedMethod ? (
              <div className="mt-4 border border-brand-softGray bg-brand-offWhite p-4 text-sm">
                {selectedMethod.qrisImageUrl ? <img src={selectedMethod.qrisImageUrl} alt={`QRIS ${selectedMethod.displayName}`} className="mx-auto mb-4 max-h-72 max-w-full object-contain" /> : null}
                <dl className="grid gap-2">
                  {selectedMethod.bankName ? <Summary label="Bank / kanal" value={selectedMethod.bankName} /> : null}
                  {selectedMethod.accountNumber ? <Summary label="Nomor tujuan" value={selectedMethod.accountNumber} /> : null}
                  {selectedMethod.accountHolder ? <Summary label="Atas nama" value={selectedMethod.accountHolder} /> : null}
                </dl>
                {selectedMethod.accountNumber ? <button type="button" onClick={() => void copy(selectedMethod.accountNumber!, "rekening")} className="mt-4 min-h-10 rounded-full border border-brand-charcoal px-4 font-semibold">{copied === "rekening" ? "Nomor tersalin" : "Salin nomor tujuan"}</button> : null}
                {selectedMethod.instructions ? <p className="mt-4 whitespace-pre-line leading-6 text-brand-charcoal/70">{selectedMethod.instructions}</p> : null}
              </div>
            ) : null}
          </>
        )}

        {success ? <div className="mt-5 border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{success}</div> : (
          <form onSubmit={submit} className="mt-6 grid gap-4">
            <Field label="Nominal yang ditransfer"><input name="amount" type="number" min="1" defaultValue={order.outstandingBalance || order.requiredAmount} required /></Field>
            <Field label="Tanggal dan waktu pembayaran"><input name="paidAt" type="datetime-local" required /></Field>
            <Field label="Nama pengirim"><input name="senderName" maxLength={150} required /></Field>
            <Field label="Bank / dompet digital pengirim"><input name="channelName" maxLength={120} required /></Field>
            <Field label="Nomor referensi dari pengirim (opsional)"><input name="referenceNumber" maxLength={150} /></Field>
            <Field label="Catatan (opsional)"><textarea name="customerNotes" rows={3} maxLength={1000} /></Field>
            <Field label="Bukti pembayaran (PNG, JPG, PDF; maks. 5 MB)"><input name="proof" type="file" accept="image/png,image/jpeg,application/pdf" required /></Field>
            {error ? <p className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
            <button disabled={sending || !selectedMethodId} className="min-h-12 bg-black px-5 font-semibold text-white hover:bg-black/75 disabled:cursor-not-allowed disabled:opacity-45">{sending ? "Mengirim..." : "Kirim Laporan Pembayaran"}</button>
          </form>
        )}
      </section>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4"><dt className="text-brand-charcoal/55">{label}</dt><dd className="text-right font-semibold">{value}</dd></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2 text-sm font-semibold [&_input]:min-h-11 [&_input]:rounded-lg [&_input]:border [&_input]:border-brand-softGray [&_input]:px-3 [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-brand-softGray [&_textarea]:p-3">{label}{children}</label>;
}

function submissionOutcome(outcome: string, status: string) {
  return ({
    verified: "Dana sudah diverifikasi dari mutasi.",
    funds_not_found: "Dana belum ditemukan pada mutasi. Periksa kembali data transfer.",
    correction_requested: "Admin meminta koreksi laporan pembayaran.",
    rejected: "Laporan pembayaran ditolak.",
    pending: "Menunggu pemeriksaan mutasi oleh Admin."
  } as Record<string, string>)[outcome] ?? (status === "verified" ? "Dana terverifikasi." : "Menunggu pemeriksaan.");
}
