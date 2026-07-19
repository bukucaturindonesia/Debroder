"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from "@/components/admin/ui/AdminFeedback";
import { RepeatOrderDialog } from "@/components/admin/RepeatOrderDialog";
import { repeatOrderApiFetch } from "@/lib/admin-repeat-order-api";
import {
  canCreateRepeatOrder,
  type RepeatOrderHistoryRow,
  type RepeatOrderSource
} from "@/lib/repeat-orders";
import { getOrderStatusLabel } from "@/lib/ui-language";

function money(value: number, currency: string) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: currency || "IDR",
    maximumFractionDigits: 0
  }).format(value || 0);
}

export function RepeatOrderAdmin() {
  const [sources, setSources] = useState<RepeatOrderSource[]>([]);
  const [history, setHistory] = useState<RepeatOrderHistoryRow[]>([]);
  const [role, setRole] = useState("");
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const historyBySource = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of history) map.set(row.source_order_id, (map.get(row.source_order_id) ?? 0) + 1);
    return map;
  }, [history]);

  async function load(nextQuery = submittedQuery) {
    setLoading(true);
    setError("");
    try {
      const payload = await repeatOrderApiFetch<{
        sources: RepeatOrderSource[];
        history: RepeatOrderHistoryRow[];
        role: string;
      }>(`/api/admin/repeat-orders?q=${encodeURIComponent(nextQuery)}`);
      setSources(payload.sources);
      setHistory(payload.history);
      setRole(payload.role);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Pesanan ulang belum dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = query.trim();
    setSubmittedQuery(next);
    void load(next);
  }

  if (loading && !sources.length) return <AdminLoadingState label="Memuat pesanan ulang..." />;

  if (error && !sources.length) {
    return (
      <AdminErrorState
        title="Pesanan ulang belum dapat dimuat"
        description={error}
        action={
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-full bg-brand-charcoal px-6 py-3 text-sm font-semibold text-white"
          >
            Coba Lagi
          </button>
        }
      />
    );
  }

  return (
    <main className="text-brand-charcoal">
      <div className="grid gap-6">
        <AdminPageHeader
          eyebrow="DEBRODER v1.2 · Phase 14"
          title="Pesan Ulang"
          description="Pilih order lama yang siap/selesai, periksa harga aktif dan stok, lalu buat quotation baru yang terhubung secara audit-safe."
          actions={
            <Link
              href="/admin/orders"
              className="inline-flex min-h-11 items-center rounded-full border border-brand-softGray bg-white px-5 text-sm font-semibold"
            >
              Semua Pesanan
            </Link>
          }
        />

        {!canCreateRepeatOrder(role) ? (
          <div className="border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
            Role Anda hanya memiliki akses baca. Pembuatan Repeat Order dibatasi untuk Owner, Super Admin, Admin Umum, dan Sales/Admin Order.
          </div>
        ) : null}

        <form onSubmit={search} className="flex flex-col gap-3 border border-brand-softGray bg-white p-5 sm:flex-row">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari nomor order, pelanggan, perusahaan, atau WhatsApp"
            className="min-h-11 flex-1 rounded-lg border border-brand-softGray px-4 text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="min-h-11 rounded-full bg-brand-charcoal px-6 text-sm font-semibold text-white disabled:opacity-45"
          >
            {loading ? "Mencari..." : "Cari"}
          </button>
        </form>

        {error ? (
          <div role="alert" className="border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
            {error}
          </div>
        ) : null}

        {sources.length ? (
          <section className="grid gap-3">
            {sources.map((source) => (
              <article key={source.id} className="border border-brand-softGray bg-white p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">{source.order_number}</h2>
                      <span className="rounded-full bg-brand-green/10 px-3 py-1 text-xs font-semibold text-brand-green">
                        {getOrderStatusLabel(source.status)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-brand-charcoal/65">
                      {source.customer_name}{source.company_name ? ` · ${source.company_name}` : ""}
                    </p>
                    <p className="mt-2 text-sm font-semibold">{money(source.total_amount, source.currency)}</p>
                    <p className="mt-2 text-xs text-brand-charcoal/50">
                      {historyBySource.get(source.id) ?? 0} repeat order tercatat
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/admin/orders/${source.id}`}
                      className="inline-flex min-h-10 items-center rounded-full border border-brand-softGray px-4 text-sm font-semibold"
                    >
                      Detail Order
                    </Link>
                    {canCreateRepeatOrder(role) ? (
                      <RepeatOrderDialog orderId={source.id} compact onCreated={() => void load()} />
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <AdminEmptyState
            title="Tidak ada order yang memenuhi syarat"
            description="Pesan ulang hanya tersedia untuk pesanan aktif berstatus siap diambil, siap dikirim, atau selesai."
          />
        )}

        <section className="border border-brand-softGray bg-white p-5 sm:p-7">
          <h2 className="text-2xl font-semibold">Riwayat Pesan Ulang</h2>
          <p className="mt-2 text-sm text-brand-charcoal/60">
            Riwayat bersifat append-only dan mempertahankan hubungan source order dengan quotation baru.
          </p>
          {history.length ? (
            <div className="mt-6 divide-y divide-brand-softGray border-y border-brand-softGray">
              {history.slice(0, 50).map((row) => (
                <article key={row.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold">{row.repeat_reason || "Repeat Order"}</p>
                    <p className="mt-1 text-xs text-brand-charcoal/55">
                      {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(row.created_at))}
                    </p>
                  </div>
                  <Link
                    href={`/admin/orders/quotations/${row.new_quotation_id}`}
                    className="inline-flex min-h-10 items-center justify-center rounded-full border border-brand-softGray px-4 text-sm font-semibold"
                  >
                    Buka Penawaran
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-6 text-sm text-brand-charcoal/60">Belum ada pesanan ulang.</p>
          )}
        </section>
      </div>
    </main>
  );
}
