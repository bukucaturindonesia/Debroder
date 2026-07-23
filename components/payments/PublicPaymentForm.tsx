"use client";

import { type FormEvent, type ReactNode, useCallback, useEffect, useState } from "react";
import { CustomerOrderStatusCard } from "@/components/customer-order/CustomerOrderStatusCard";
import { PersistentTrackingButton } from "@/components/customer-order/PersistentTrackingButton";
import { CarrierTrackingActions } from "@/components/tracking/CarrierTrackingActions";
import { resolveCustomerOrderPresentation } from "@/lib/customer-order-presentation";
import type { OrderActiveStageResolution } from "@/lib/order-active-stage";

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

type PaymentSubmission = {
  id: string;
  paymentNumber: string;
  status: string;
  outcome: string | null;
  reason: string | null;
  amount: number;
  submittedAt: string | null;
};

type SafeOrder = {
  orderNumber: string;
  customerName: string;
  orderStatus: string;
  fulfillmentMethod: string;
  fulfillmentStatus: string | null;
  courier: string | null;
  trackingNumber: string | null;
  paymentMethod: string;
  paymentStatus: string;
  isCustom: boolean;
  totalAmount: number;
  effectivePaid: number;
  outstandingBalance: number;
  requiredAmount: number;
  requirementMet: boolean;
  expiresAt: string;
  remainingUses: number;
  items: Array<{ id: string; name: string; quantity: number; unitPrice: number; subtotal: number }>;
  submissions: PaymentSubmission[];
  methods: PaymentMethod[];
  activeStage?: OrderActiveStageResolution | null;
};

const CORRECTION_OUTCOMES = new Set(["funds_not_found", "correction_requested", "rejected"]);
const REVIEW_OUTCOMES = new Set(["pending"]);
const TERMINAL_ORDER = new Set(["completed", "selesai", "cancelled", "dibatalkan", "expired"]);
const TERMINAL_FULFILLMENT = new Set(["delivered", "picked_up", "completed", "selesai", "cancelled"]);

function money(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

function createSubmissionKey() {
  return crypto.randomUUID().replace(/-/g, "");
}

export function PublicPaymentForm({ token }: { token: string }) {
  const [order, setOrder] = useState<SafeOrder | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState("");
  const [selectedMethodId, setSelectedMethodId] = useState("");
  const [copied, setCopied] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(createSubmissionKey);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const response = await fetch(`/api/public/payments/${encodeURIComponent(token)}`, { cache: "no-store" });
      const payload = (await response.json()) as SafeOrder & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Tautan pembayaran tidak tersedia atau sudah tidak berlaku.");
      setOrder(payload);
      setSelectedMethodId((current) => payload.methods.some((method) => method.id === current) ? current : payload.methods[0]?.id ?? "");
      setError("");
    } catch (reason) {
      if (!quiet) setError(reason instanceof Error ? reason.message : "Tautan tidak tersedia.");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!order) return;
    const terminal = TERMINAL_ORDER.has(order.orderStatus)
      || TERMINAL_FULFILLMENT.has(order.fulfillmentStatus ?? "");
    if (terminal) return;
    const timer = window.setInterval(() => void load(true), 20_000);
    return () => window.clearInterval(timer);
  }, [load, order]);

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
    const formElement = event.currentTarget;
    setSending(true);
    setError("");
    setSuccess("");
    const form = new FormData(formElement);
    form.set("idempotencyKey", idempotencyKey);
    form.set("paymentMethodId", selectedMethodId);
    try {
      const response = await fetch(`/api/public/payments/${encodeURIComponent(token)}`, { method: "POST", body: form });
      const payload = (await response.json()) as { paymentNumber?: string; error?: string };
      if (!response.ok) throw new Error(payload.error || "Pembayaran belum dapat dikirim.");
      setSuccess(`${payload.paymentNumber ?? "Laporan pembayaran"} berhasil dikirim.`);
      setIdempotencyKey(createSubmissionKey());
      formElement.reset();
      await load(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Pembayaran gagal dikirim.");
    } finally {
      setSending(false);
    }
  }

  if (loading) return <div className="rounded-[28px] border border-black/10 bg-white p-6">Memuat instruksi pembayaran...</div>;
  if (error && !order) return <div className="rounded-[28px] border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>;
  if (!order) return null;

  const latestSubmission = order.submissions[0] ?? null;
  const awaitingReview = Boolean(
    latestSubmission && (REVIEW_OUTCOMES.has(latestSubmission.outcome ?? "") || latestSubmission.status === "pending")
  ) || ["pending", "pending_verification", "menunggu_verifikasi"].includes(order.paymentStatus);
  const needsCorrection = Boolean(latestSubmission && CORRECTION_OUTCOMES.has(latestSubmission.outcome ?? ""))
    || ["rejected", "ditolak"].includes(order.paymentStatus);
  const presentationPaymentStatus = awaitingReview
    ? "pending_verification"
    : needsCorrection
      ? "rejected"
      : order.paymentStatus;
  const presentation = resolveCustomerOrderPresentation({
    status: order.orderStatus,
    paymentStatus: presentationPaymentStatus,
    latestPaymentStatus: latestSubmission?.status ?? presentationPaymentStatus,
    latestPaymentReviewOutcome: latestSubmission?.outcome ?? null,
    fulfillmentStatus: order.fulfillmentStatus,
    fulfillmentMethod: order.fulfillmentMethod,
    paymentMethod: order.paymentMethod,
    hasPaymentUrl: true,
    isCustom: order.isCustom,
    paymentRequirementMet: order.requirementMet,
    paymentEffectiveTotal: order.effectivePaid,
    hasVerifiedPayment: order.effectivePaid > 0,
    trackingNumber: order.trackingNumber,
    activeStage: order.activeStage
  });
  const selectedMethod = order.methods.find((method) => method.id === selectedMethodId) ?? null;
  const showPaymentWorkspace = !order.requirementMet && !awaitingReview;
  const trackingHref = `/track-order/${encodeURIComponent(order.orderNumber)}`;

  return (
    <div className="mx-auto max-w-4xl pb-24 sm:pb-0">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">Pembayaran DEBRODER</p>
          <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{order.orderNumber}</h1>
          <p className="mt-2 text-sm text-black/55">{order.customerName} · Total {money(order.totalAmount)}</p>
        </div>
        <PersistentTrackingButton href={trackingHref} />
      </header>

      <div className="mt-7">
        <CustomerOrderStatusCard presentation={presentation}>
          {success ? <p className="font-semibold text-emerald-900">{success}</p> : null}
          {needsCorrection && latestSubmission?.reason ? (
            <div className="rounded-2xl border border-amber-300 bg-white/70 p-4 text-sm">
              <p className="font-semibold">Catatan Admin</p>
              <p className="mt-2 leading-6">{latestSubmission.reason}</p>
            </div>
          ) : null}
          {awaitingReview && latestSubmission ? (
            <div className="text-sm leading-6">
              <p className="font-semibold">{latestSubmission.paymentNumber}</p>
              <p className="mt-1">Nominal yang dilaporkan: {money(latestSubmission.amount)}</p>
              <p className="mt-1 text-black/60">Anda tidak perlu mengirim bukti lagi selama pemeriksaan berlangsung.</p>
            </div>
          ) : null}
          {order.trackingNumber ? (
            <div className="mt-4 grid gap-3 border-t border-black/10 pt-4 text-sm">
              <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/45">Pengiriman</p><p className="mt-1 font-semibold">{order.courier || "Kurir"} · {order.trackingNumber}</p></div>
              <CarrierTrackingActions courier={order.courier} trackingNumber={order.trackingNumber} compact />
            </div>
          ) : null}
        </CustomerOrderStatusCard>
      </div>

      {order.fulfillmentMethod === "pickup" && !order.requirementMet ? (
        <section className="mt-5 rounded-[24px] border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">
          <p className="font-semibold">Jangan datang ke toko sebelum barang dinyatakan siap</p>
          <p className="mt-2 leading-6">Pembayaran dan status barang adalah dua tahap berbeda. Tunggu konfirmasi Admin bahwa barang sudah disiapkan sebelum datang.</p>
        </section>
      ) : null}

      {showPaymentWorkspace ? (
        <section className="mt-6 rounded-[28px] border border-black/10 bg-white p-5 sm:p-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/45">Tugas saat ini</p>
            <h2 className="mt-2 text-2xl font-semibold">Transfer dan kirim bukti</h2>
            <p className="mt-2 text-sm leading-6 text-black/60">Transfer sesuai sisa tagihan, lalu lengkapi laporan pembayaran di bawah ini.</p>
          </div>

          {!order.methods.length ? (
            <div className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
              Metode pembayaran belum diaktifkan oleh Admin. Jangan melakukan transfer sebelum instruksi resmi tersedia.
            </div>
          ) : (
            <>
              <fieldset className="mt-6 grid gap-3">
                <legend className="text-sm font-semibold">Tujuan pembayaran</legend>
                {order.methods.map((method) => (
                  <label key={method.id} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border p-4 text-sm ${selectedMethodId === method.id ? "border-black bg-[#f6f5f0]" : "border-black/10"}`}>
                    <input type="radio" name="methodChoice" checked={selectedMethodId === method.id} onChange={() => setSelectedMethodId(method.id)} />
                    <span><strong>{method.displayName}</strong>{method.bankName ? ` · ${method.bankName}` : ""}</span>
                  </label>
                ))}
              </fieldset>

              {selectedMethod ? (
                <div className="mt-4 rounded-2xl border border-black/10 bg-[#f6f5f0] p-5 text-sm">
                  {selectedMethod.qrisImageUrl ? <img src={selectedMethod.qrisImageUrl} alt={`QRIS ${selectedMethod.displayName}`} className="mx-auto mb-4 max-h-72 max-w-full object-contain" /> : null}
                  <dl className="grid gap-3">
                    {selectedMethod.bankName ? <Summary label="Bank / kanal" value={selectedMethod.bankName} /> : null}
                    {selectedMethod.accountNumber ? <Summary label="Nomor tujuan" value={selectedMethod.accountNumber} /> : null}
                    {selectedMethod.accountHolder ? <Summary label="Atas nama" value={selectedMethod.accountHolder} /> : null}
                    <Summary label="Nominal" value={money(order.outstandingBalance || order.requiredAmount)} strong />
                  </dl>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {selectedMethod.accountNumber ? (
                      <button type="button" onClick={() => void copy(selectedMethod.accountNumber!, "rekening")} className="min-h-10 rounded-full border border-black px-4 font-semibold">
                        {copied === "rekening" ? "Nomor tersalin" : "Salin nomor rekening"}
                      </button>
                    ) : null}
                    <button type="button" onClick={() => void copy(String(order.outstandingBalance || order.requiredAmount), "nominal")} className="min-h-10 rounded-full border border-black px-4 font-semibold">
                      {copied === "nominal" ? "Nominal tersalin" : "Salin nominal"}
                    </button>
                  </div>
                  {selectedMethod.instructions ? <p className="mt-4 whitespace-pre-line leading-6 text-black/65">{selectedMethod.instructions}</p> : null}
                </div>
              ) : null}
            </>
          )}

          {order.methods.length ? (
            <form onSubmit={submit} className="mt-6 grid gap-4 border-t border-black/10 pt-6">
              <Field label="Nominal yang ditransfer"><input name="amount" type="number" min="1" defaultValue={order.outstandingBalance || order.requiredAmount} required /></Field>
              <Field label="Tanggal dan waktu pembayaran"><input name="paidAt" type="datetime-local" required /></Field>
              <Field label="Nama pengirim"><input name="senderName" maxLength={150} required /></Field>
              <Field label="Bank / dompet digital pengirim"><input name="channelName" maxLength={120} required /></Field>
              <Field label="Nomor referensi (opsional)"><input name="referenceNumber" maxLength={150} /></Field>
              <Field label="Catatan (opsional)"><textarea name="customerNotes" rows={3} maxLength={1000} /></Field>
              <Field label="Bukti pembayaran (PNG, JPG, PDF; maks. 5 MB)"><input name="proof" type="file" accept="image/png,image/jpeg,application/pdf" required /></Field>
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs leading-5 text-amber-950">
                Bukti transfer bukan konfirmasi pembayaran final. Pembayaran dinyatakan berhasil setelah Admin menemukan dana pada mutasi rekening DEBRODER.
              </div>
              {error ? <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
              <button disabled={sending || !selectedMethodId} className="min-h-12 rounded-full bg-black px-5 font-semibold text-white hover:bg-black/75 disabled:cursor-not-allowed disabled:opacity-45">
                {sending ? "Mengirim..." : needsCorrection ? "Kirim Bukti Perbaikan" : "Kirim Bukti Pembayaran"}
              </button>
            </form>
          ) : null}
        </section>
      ) : null}

      {error && order && !showPaymentWorkspace ? <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}

      <div className="mt-6 grid gap-3">
        <Disclosure title="Ringkasan tagihan" summary={`${money(order.outstandingBalance)} tersisa`}>
          <div className="divide-y divide-black/10 border-y border-black/10">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between gap-4 py-4 text-sm">
                <div><p className="font-semibold">{item.name}</p><p className="mt-1 text-xs text-black/55">{item.quantity} × {money(item.unitPrice)}</p></div>
                <p className="font-semibold">{money(item.subtotal)}</p>
              </div>
            ))}
          </div>
          <dl className="mt-4 grid gap-3 text-sm">
            <Summary label="Total tagihan" value={money(order.totalAmount)} />
            <Summary label="Pembayaran terverifikasi" value={money(order.effectivePaid)} />
            <Summary label="Sisa tagihan" value={money(order.outstandingBalance)} strong />
          </dl>
          <p className="mt-4 text-xs leading-5 text-black/50">Tautan berlaku sampai {dateTime(order.expiresAt)}.</p>
        </Disclosure>

        {order.submissions.length ? (
          <Disclosure title="Riwayat laporan pembayaran" summary={`${order.submissions.length} laporan tersimpan`}>
            <div className="grid gap-3">
              {order.submissions.map((submission) => (
                <article key={submission.id} className="rounded-2xl border border-black/10 p-4 text-sm">
                  <div className="flex justify-between gap-3"><strong>{submission.paymentNumber}</strong><strong>{money(submission.amount)}</strong></div>
                  <p className="mt-2 text-black/60">{submissionOutcome(submission.outcome, submission.status)}</p>
                  {submission.reason ? <p className="mt-2 text-amber-800">Catatan: {submission.reason}</p> : null}
                </article>
              ))}
            </div>
          </Disclosure>
        ) : null}
      </div>
    </div>
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

function Summary({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className={`flex justify-between gap-4 ${strong ? "border-t border-black/10 pt-3 text-base font-semibold" : ""}`}><dt className="text-black/55">{label}</dt><dd className="text-right font-semibold">{value}</dd></div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-2 text-sm font-semibold [&_input]:min-h-11 [&_input]:rounded-xl [&_input]:border [&_input]:border-black/15 [&_input]:px-3 [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-black/15 [&_textarea]:p-3">{label}{children}</label>;
}

function submissionOutcome(outcome: string | null, status: string) {
  return ({
    verified: "Dana sudah diverifikasi dari mutasi.",
    funds_not_found: "Dana belum ditemukan pada mutasi.",
    correction_requested: "Admin meminta perbaikan laporan pembayaran.",
    rejected: "Laporan pembayaran ditolak.",
    pending: "Menunggu pemeriksaan mutasi oleh Admin."
  } as Record<string, string>)[outcome ?? ""] ?? (status === "verified" ? "Dana terverifikasi." : "Menunggu pemeriksaan.");
}

function dateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "waktu belum tersedia";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Makassar" }).format(date);
}
