"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";
import { getOrderStatusLabel } from "@/lib/ui-language";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";
import { AdminEmptyState, AdminLoadingState } from "@/components/admin/ui/AdminFeedback";

type OrderRow = {
  id: string;
  order_number: string;
  customer_name: string;
  company_name: string | null;
  status: string;
  total_amount: number;
  created_at: string;
};

function money(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(value || 0);
}

export function OrderListAdmin() {
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadRows() {
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("id,order_number,customer_name,company_name,status,total_amount,created_at")
      .is("archived_at", null)
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      setMessage("Daftar pesanan belum berhasil dimuat.");
      return;
    }
    setRows((data || []) as OrderRow[]);
  }

  useEffect(() => {
    void loadRows();
  }, []);

  const visible = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return rows.filter(
      (row) =>
        !keyword ||
        row.order_number.toLowerCase().includes(keyword) ||
        row.customer_name.toLowerCase().includes(keyword) ||
        (row.company_name || "").toLowerCase().includes(keyword)
    );
  }, [query, rows]);

  if (loading) return <AdminLoadingState label="Memuat pesanan..." />;

  return (
    <main className="text-brand-charcoal">
      <div className="grid gap-6">
        <AdminPageHeader
          eyebrow="Operasional Pesanan"
          title="Pesanan"
          description="Pesanan resmi dari checkout pelanggan, penawaran yang disetujui, dan pesanan ulang."
          actions={
            <Link
              href="/admin/orders/archive"
              className="inline-flex min-h-11 items-center rounded-full border border-brand-softGray bg-white px-5 text-sm font-semibold"
            >
              Gudang Arsip
            </Link>
          }
        />

        <section className="border border-brand-softGray bg-white p-5">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari nomor pesanan, pelanggan, atau perusahaan"
            className="min-h-11 w-full rounded-lg border border-brand-softGray px-4 text-sm"
          />
          <p className="mt-3 text-xs font-semibold text-brand-charcoal/55">
            {visible.length} pesanan aktif
          </p>
        </section>

        {message ? (
          <div className="border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
            {message}
          </div>
        ) : null}

        {visible.length ? (
          <section className="grid gap-3">
            {visible.map((row) => (
              <article key={row.id} className="border border-brand-softGray bg-white p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="font-semibold">{row.order_number}</h2>
                    <p className="mt-1 text-sm text-brand-charcoal/60">
                      {row.customer_name}
                      {row.company_name ? ` · ${row.company_name}` : ""}
                    </p>
                    <p className="mt-2 text-sm font-semibold">{money(row.total_amount)}</p>
                    <p className="mt-2 text-xs text-brand-charcoal/55">
                      {getOrderStatusLabel(row.status)}
                    </p>
                  </div>
                  <Link
                    href={`/admin/orders/${row.id}#guided-workflow`}
                    className="inline-flex min-h-10 items-center justify-center rounded-full bg-brand-charcoal px-5 text-sm font-semibold text-white"
                  >
                    Buka Tahap Aktif
                  </Link>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <AdminEmptyState
            title="Belum ada pesanan"
            description="Pesanan akan muncul setelah checkout berhasil atau penawaran harga disetujui dan dijadikan pesanan."
          />
        )}
      </div>
    </main>
  );
}
