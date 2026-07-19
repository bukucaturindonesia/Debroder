"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";
import { AdminErrorState, AdminLoadingState } from "@/components/admin/ui/AdminFeedback";
import { getPaymentStatusLabel } from "@/lib/ui-language";

type Tab = "pending" | "verified" | "rejected" | "correction" | "all";
type PaymentInboxRow = {
  id: string; order_id: string; payment_number: string; amount: number; method: string; status: string;
  submitted_at: string | null; created_at: string; proof_bucket: string | null; proof_path: string | null;
  proof_mime_type: string | null; customer_notes: string | null; rejection_reason: string | null;
  orders: { order_number?: string; customer_name?: string; total_amount?: number; payment_balance?: number } | Array<{ order_number?: string; customer_name?: string; total_amount?: number; payment_balance?: number }> | null;
};

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "pending", label: "Menunggu Verifikasi" },
  { id: "verified", label: "Terverifikasi" },
  { id: "rejected", label: "Ditolak" },
  { id: "correction", label: "Koreksi / Refund" },
  { id: "all", label: "Semua Pembayaran" }
];

export function PaymentInboxAdmin() {
  const [rows, setRows] = useState<PaymentInboxRow[]>([]);
  const [tab, setTab] = useState<Tab>("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [proofUrls, setProofUrls] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const client = createSupabaseClient();
    if (!client) { setError("Layanan data belum tersedia. Hubungi pengelola sistem."); setLoading(false); return; }
    setLoading(true); setError("");
    const { data, error: queryError } = await client.from("order_payments")
      .select("id,order_id,payment_number,amount,method,status,submitted_at,created_at,proof_bucket,proof_path,proof_mime_type,customer_notes,rejection_reason,orders!inner(order_number,customer_name,total_amount,payment_balance)")
      .is("archived_at", null).order("created_at", { ascending: false }).limit(200);
    if (queryError) { setError(queryError.message); setLoading(false); return; }
    const nextRows = (data ?? []) as unknown as PaymentInboxRow[];
    setRows(nextRows);
    const images = nextRows.filter((row) => row.proof_bucket && row.proof_path && row.proof_mime_type?.startsWith("image/"));
    const signed = await Promise.all(images.map(async (row) => {
      const result = await client.storage.from(row.proof_bucket!).createSignedUrl(row.proof_path!, 300);
      return [row.id, result.data?.signedUrl ?? ""] as const;
    }));
    setProofUrls(Object.fromEntries(signed.filter((entry) => entry[1])));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => rows.filter((row) => {
    if (tab === "all") return true;
    if (tab === "correction") return ["refunded"].includes(row.status);
    return row.status === tab;
  }), [rows, tab]);

  if (loading) return <AdminLoadingState label="Memuat antrean pembayaran..." />;
  if (error) return <AdminErrorState title="Antrean pembayaran gagal dimuat" description={error} action={<button type="button" onClick={() => void load()} className="font-semibold underline">Coba lagi</button>} />;

  return <main className="grid gap-6 text-brand-charcoal">
    <AdminPageHeader eyebrow="ANTREAN KERJA" title="Pembayaran" description="Periksa bukti pembayaran dari satu antrean, lalu lanjutkan keputusan pada detail pesanan." />
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter pembayaran">
      {TABS.map((item) => { const count = item.id === "all" ? rows.length : item.id === "correction" ? rows.filter((row) => row.status === "refunded").length : rows.filter((row) => row.status === item.id).length; return <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)} className={`min-h-11 rounded-full px-4 text-sm font-semibold ${tab === item.id ? "bg-brand-charcoal text-white" : "border border-brand-softGray bg-white"}`}>{item.label} · {count}</button>; })}
    </div>
    <section className="grid gap-4">
      {filtered.map((row) => { const order = Array.isArray(row.orders) ? row.orders[0] : row.orders; return <article key={row.id} className="grid gap-5 border border-brand-softGray bg-white p-5 lg:grid-cols-[96px_1fr_auto] lg:items-center">
        <div className="h-24 w-24 overflow-hidden bg-brand-offWhite">{proofUrls[row.id] ? <img src={proofUrls[row.id]} alt={`Bukti ${row.payment_number}`} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center p-2 text-center text-[11px] font-semibold text-brand-charcoal/45">{row.proof_path ? "Bukti tersimpan" : "Tanpa bukti"}</div>}</div>
        <div>
          <div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{row.payment_number}</h2><span className="rounded-full border border-brand-softGray px-3 py-1 text-xs font-semibold">{statusLabel(row.status)}</span></div>
          <p className="mt-2 text-sm font-semibold">{order?.order_number ?? "Nomor pesanan tidak tersedia"} · {order?.customer_name ?? "Pelanggan"}</p>
          <div className="mt-3 grid gap-1 text-sm text-brand-charcoal/60 sm:grid-cols-2"><p>Dikirim: <strong>{money(row.amount)}</strong></p><p>Sisa pembayaran: <strong>{money(order?.payment_balance ?? 0)}</strong></p><p>Metode: {paymentMethodLabel(row.method)}</p><p>Waktu: {dateTime(row.submitted_at ?? row.created_at)}</p></div>
          {row.rejection_reason ? <p className="mt-2 text-sm text-red-700">Alasan: {row.rejection_reason}</p> : null}
        </div>
        <Link href={`/admin/orders/${row.order_id}#payment`} className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand-green px-5 text-sm font-semibold text-white">{row.status === "pending" ? "Periksa Pembayaran" : "Buka Riwayat"}</Link>
      </article>; })}
      {!filtered.length ? <div className="border border-brand-softGray bg-white p-10 text-center text-sm text-brand-charcoal/55">Tidak ada pembayaran pada antrean ini.</div> : null}
    </section>
  </main>;
}

function money(value: number) { return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value || 0)); }
function dateTime(value: string) { return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Makassar" }).format(new Date(value)); }
function paymentMethodLabel(value: string) { return value === "bank_transfer" ? "Transfer bank" : value === "qris" ? "QRIS" : value === "cash" ? "Tunai" : "Metode pembayaran lainnya"; }
function statusLabel(status: string) { return getPaymentStatusLabel(status); }
