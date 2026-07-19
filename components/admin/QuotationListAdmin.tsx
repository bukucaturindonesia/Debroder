"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";
import { AdminAlert, AdminEmptyState, AdminErrorState, AdminLoadingState } from "@/components/admin/ui/AdminFeedback";
import { AdminStatusBadge, getQuotationStatusOptions } from "@/components/admin/ui/AdminStatusBadge";
import { isAdminRole, QUOTATION_ROLES, QUOTATION_VIEW_ROLES } from "@/components/admin/layout/admin-navigation";

type Row = {
  id: string;
  quotation_number: string;
  customer_name: string;
  company_name: string | null;
  customer_phone: string;
  status: string;
  confirmed_total: number | null;
  estimated_total: number | null;
  has_pending_pricing: boolean;
  valid_until: string | null;
  created_at: string;
};

function money(value: number | null) {
  if (value === null) return "Menunggu harga";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(value);
}

function date(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(value));
}

export function QuotationListAdmin() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  const loadRows = useCallback(async () => {
    const supabase = createSupabaseClient();
    if (!supabase) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("quotations")
      .select("id,quotation_number,customer_name,company_name,customer_phone,status,confirmed_total,estimated_total,has_pending_pricing,valid_until,created_at")
      .is("archived_at", null)
      .order("created_at", { ascending: false });

    setLoading(false);
    if (error) {
      setMessage("Daftar penawaran belum dapat dimuat.");
      return;
    }
    setRows((data || []) as Row[]);
  }, []);

  useEffect(() => {
    let active = true;
    async function check() {
      const supabase = createSupabaseClient();
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) {
        router.replace("/admin/login");
        return;
      }
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (!active) return;
      if (
        error ||
        !profile ||
        !isAdminRole(profile.role) ||
        !QUOTATION_VIEW_ROLES.includes(profile.role)
      ) {
        setMessage("Akses quotation ditolak.");
        setCheckingAccess(false);
        setLoading(false);
        return;
      }
      setRole(profile.role);
      setAllowed(true);
      setCheckingAccess(false);
      await loadRows();
    }
    void check();
    return () => {
      active = false;
    };
  }, [loadRows, router]);

  const visible = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return rows.filter((row) => {
      const statusOk = statusFilter === "all" || row.status === statusFilter;
      const keywordOk =
        !keyword ||
        row.quotation_number.toLowerCase().includes(keyword) ||
        row.customer_name.toLowerCase().includes(keyword) ||
        (row.company_name || "").toLowerCase().includes(keyword) ||
        row.customer_phone.toLowerCase().includes(keyword);
      return statusOk && keywordOk;
    });
  }, [query, rows, statusFilter]);

  if (checkingAccess) return <AdminLoadingState label="Memeriksa akses quotation..." />;
  if (!allowed) {
    return (
      <AdminErrorState
        title="Akses Penawaran Ditolak"
        description={message || "Akun ini tidak memiliki akses quotation."}
      />
    );
  }

  return (
    <main className="text-brand-charcoal">
      <div className="grid gap-6">
        <AdminPageHeader
          eyebrow="DEBRODER v1.2 · Phase 1"
          title="Penawaran Harga Resmi"
          description="Kelola quotation aktif, status, harga, dan siklus arsip."
          actions={
            role && QUOTATION_ROLES.includes(role as (typeof QUOTATION_ROLES)[number]) ? (
            <>
              <Link
                href="/admin/orders/quotations/archive"
                className="inline-flex min-h-11 items-center rounded-full border border-brand-softGray bg-white px-5 text-sm font-semibold"
              >
                Gudang Arsip
              </Link>
              <Link
                href="/admin/orders/quotations/new"
                className="inline-flex min-h-11 items-center rounded-full bg-brand-green px-5 text-sm font-semibold text-white"
              >
                Buat Penawaran
              </Link>
            </>
            ) : null
          }
        />

        <section className="border border-brand-softGray bg-white p-5">
          <div className="grid gap-3 lg:grid-cols-[1fr_240px_auto]">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nomor, pelanggan, perusahaan, atau WhatsApp"
              className="min-h-11 rounded-lg border border-brand-softGray px-4 text-sm"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="min-h-11 rounded-lg border border-brand-softGray px-4 text-sm font-semibold"
            >
              <option value="all">Semua status</option>
              {getQuotationStatusOptions().map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void loadRows()}
              disabled={loading}
              className="min-h-11 rounded-full border border-brand-charcoal px-5 text-sm font-semibold disabled:opacity-50"
            >
              {loading ? "Memuat..." : "Refresh"}
            </button>
          </div>
          <p className="mt-4 text-xs font-semibold text-brand-charcoal/55">
            Menampilkan {visible.length} dari {rows.length} quotation aktif
          </p>
        </section>

        {message ? <AdminAlert type="error">{message}</AdminAlert> : null}

        {loading ? (
          <AdminLoadingState label="Memuat quotation..." />
        ) : visible.length ? (
          <section className="overflow-hidden border border-brand-softGray bg-white">
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="border-b border-brand-softGray bg-brand-offWhite text-xs uppercase tracking-[0.12em] text-brand-charcoal/55">
                  <tr>
                    <th className="px-5 py-4">Nomor</th>
                    <th className="px-5 py-4">Pelanggan</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Total</th>
                    <th className="px-5 py-4">Berlaku</th>
                    <th className="px-5 py-4">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((row) => (
                    <tr key={row.id} className="border-b border-brand-softGray last:border-0">
                      <td className="px-5 py-4 font-semibold">{row.quotation_number}</td>
                      <td className="px-5 py-4">
                        <p className="font-semibold">{row.customer_name}</p>
                        <p className="mt-1 text-xs text-brand-charcoal/60">
                          {row.company_name || row.customer_phone}
                        </p>
                      </td>
                      <td className="px-5 py-4"><AdminStatusBadge status={row.status} /></td>
                      <td className="px-5 py-4">
                        <p className="font-semibold">{money(row.confirmed_total ?? row.estimated_total)}</p>
                        {row.has_pending_pricing ? (
                          <p className="mt-1 text-xs font-semibold text-amber-700">Ada harga pending</p>
                        ) : null}
                      </td>
                      <td className="px-5 py-4">{date(row.valid_until)}</td>
                      <td className="px-5 py-4">
                        <Link
                          href={`/admin/orders/quotations/${row.id}`}
                          className="inline-flex rounded-full bg-brand-charcoal px-4 py-2 text-xs font-semibold text-white"
                        >
                          Buka
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 p-4 md:hidden">
              {visible.map((row) => (
                <article key={row.id} className="border border-brand-softGray bg-brand-offWhite p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{row.quotation_number}</p>
                      <p className="mt-1 truncate text-sm text-brand-charcoal/65">{row.customer_name}</p>
                    </div>
                    <AdminStatusBadge status={row.status} />
                  </div>
                  <p className="mt-4 font-semibold">{money(row.confirmed_total ?? row.estimated_total)}</p>
                  <Link
                    href={`/admin/orders/quotations/${row.id}`}
                    className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-full bg-brand-charcoal text-sm font-semibold text-white"
                  >
                    Buka Detail
                  </Link>
                </article>
              ))}
            </div>
          </section>
        ) : (
          <AdminEmptyState
            title="Belum ada quotation aktif"
            description="Buat quotation baru atau pulihkan data dari Gudang Arsip."
            action={
              <Link
                href="/admin/orders/quotations/new"
                className="inline-flex min-h-11 items-center rounded-full bg-brand-charcoal px-6 text-sm font-semibold text-white"
              >
                Buat Penawaran
              </Link>
            }
          />
        )}
      </div>
    </main>
  );
}
