"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";
import {
  AdminAlert,
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState
} from "@/components/admin/ui/AdminFeedback";
import {
  AdminStatusBadge,
  getQuotationStatusOptions
} from "@/components/admin/ui/AdminStatusBadge";
import {
  isAdminRole,
  QUOTATION_ROLES
} from "@/components/admin/layout/admin-navigation";

type QuotationRow = {
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

function formatMoney(value: number | null) {
  if (value === null) return "Menunggu harga";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium"
  }).format(new Date(value));
}

export function QuotationListAdmin() {
  const router = useRouter();
  const [rows, setRows] = useState<QuotationRow[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [allowed, setAllowed] = useState(false);

  const loadQuotations = useCallback(async () => {
    const supabase = createSupabaseClient();
    if (!supabase) {
      setMessage("Supabase belum dikonfigurasi.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("quotations")
      .select(
        "id,quotation_number,customer_name,company_name,customer_phone,status,confirmed_total,estimated_total,has_pending_pricing,valid_until,created_at"
      )
      .order("created_at", { ascending: false });

    setLoading(false);

    if (error) {
      setMessage("Quotation gagal dimuat. Tekan Refresh untuk mencoba kembali.");
      return;
    }

    setRows((data || []) as QuotationRow[]);
  }, []);

  useEffect(() => {
    let active = true;

    async function checkAccess() {
      const supabase = createSupabaseClient();
      if (!supabase) {
        if (active) {
          setMessage("Supabase belum dikonfigurasi.");
          setCheckingAccess(false);
          setLoading(false);
        }
        return;
      }

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
        !QUOTATION_ROLES.includes(profile.role)
      ) {
        setMessage("Akses quotation ditolak.");
        setCheckingAccess(false);
        setLoading(false);
        return;
      }

      setAllowed(true);
      setCheckingAccess(false);
      await loadQuotations();
    }

    void checkAccess();

    return () => {
      active = false;
    };
  }, [loadQuotations, router]);

  const visibleRows = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return rows.filter((row) => {
      const statusMatches =
        statusFilter === "all" || row.status === statusFilter;
      const keywordMatches =
        !keyword ||
        row.quotation_number.toLowerCase().includes(keyword) ||
        row.customer_name.toLowerCase().includes(keyword) ||
        (row.company_name || "").toLowerCase().includes(keyword) ||
        row.customer_phone.toLowerCase().includes(keyword);

      return statusMatches && keywordMatches;
    });
  }, [query, rows, statusFilter]);

  if (checkingAccess) {
    return (
      <main className="text-brand-charcoal">
        <AdminLoadingState label="Memeriksa akses quotation..." />
      </main>
    );
  }

  if (!allowed) {
    return (
      <main className="text-brand-charcoal">
        <AdminErrorState
          title="Akses Quotation Ditolak"
          description={message || "Akun ini tidak memiliki akses quotation."}
        />
      </main>
    );
  }

  return (
    <main className="text-brand-charcoal">
      <div className="grid gap-6">
        <AdminPageHeader
          eyebrow="DEBRODER v1.2 · Phase 1"
          title="Formal Quotation"
          description="Kelola penawaran resmi, pelanggan, status, masa berlaku, dan total harga."
          actions={
            <Link
              href="/admin/orders/quotations/new"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand-green px-5 text-sm font-semibold text-white"
            >
              Buat Quotation
            </Link>
          }
        />

        <section className="border border-brand-softGray bg-white p-5">
          <div className="grid gap-3 lg:grid-cols-[1fr_240px_auto]">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari nomor, pelanggan, perusahaan, atau WhatsApp"
              className="min-h-11 rounded-lg border border-brand-softGray px-4 text-sm outline-none focus:border-brand-charcoal"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="min-h-11 rounded-lg border border-brand-softGray px-4 text-sm font-semibold"
            >
              <option value="all">Semua status</option>
              {getQuotationStatusOptions().map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void loadQuotations()}
              disabled={loading}
              className="min-h-11 rounded-full border border-brand-charcoal px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Memuat..." : "Refresh"}
            </button>
          </div>
          <p className="mt-4 text-xs font-semibold text-brand-charcoal/55">
            Menampilkan {visibleRows.length} dari {rows.length} quotation
          </p>
        </section>

        {message ? <AdminAlert type="error">{message}</AdminAlert> : null}

        {loading ? (
          <AdminLoadingState label="Memuat quotation..." />
        ) : visibleRows.length ? (
          <section className="overflow-hidden border border-brand-softGray bg-white">
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-brand-softGray bg-brand-offWhite text-xs uppercase tracking-[0.12em] text-brand-charcoal/55">
                    <th className="px-5 py-4 font-semibold">Nomor</th>
                    <th className="px-5 py-4 font-semibold">Pelanggan</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 font-semibold">Total</th>
                    <th className="px-5 py-4 font-semibold">Berlaku sampai</th>
                    <th className="px-5 py-4 font-semibold">Dibuat</th>
                    <th className="px-5 py-4 font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => {
                    const total =
                      row.confirmed_total !== null
                        ? row.confirmed_total
                        : row.estimated_total;

                    return (
                      <tr
                        key={row.id}
                        className="border-b border-brand-softGray last:border-0"
                      >
                        <td className="px-5 py-4 font-semibold">
                          {row.quotation_number}
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-semibold">{row.customer_name}</p>
                          <p className="mt-1 text-xs text-brand-charcoal/60">
                            {row.company_name || row.customer_phone}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <AdminStatusBadge status={row.status} />
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-semibold">{formatMoney(total)}</p>
                          {row.has_pending_pricing ? (
                            <p className="mt-1 text-xs font-semibold text-amber-700">
                              Ada harga pending
                            </p>
                          ) : null}
                        </td>
                        <td className="px-5 py-4">
                          {formatDate(row.valid_until)}
                        </td>
                        <td className="px-5 py-4">
                          {formatDate(row.created_at)}
                        </td>
                        <td className="px-5 py-4">
                          <Link
                            href={`/admin/orders/quotations/${row.id}`}
                            className="inline-flex rounded-full bg-brand-charcoal px-4 py-2 text-xs font-semibold text-white"
                          >
                            Buka
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 p-4 md:hidden">
              {visibleRows.map((row) => {
                const total =
                  row.confirmed_total !== null
                    ? row.confirmed_total
                    : row.estimated_total;

                return (
                  <article
                    key={row.id}
                    className="border border-brand-softGray bg-brand-offWhite p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {row.quotation_number}
                        </p>
                        <p className="mt-1 truncate text-sm text-brand-charcoal/65">
                          {row.customer_name}
                        </p>
                      </div>
                      <AdminStatusBadge status={row.status} />
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="text-xs text-brand-charcoal/50">Total</dt>
                        <dd className="mt-1 font-semibold">{formatMoney(total)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-brand-charcoal/50">Berlaku</dt>
                        <dd className="mt-1 font-semibold">
                          {formatDate(row.valid_until)}
                        </dd>
                      </div>
                    </dl>
                    {row.has_pending_pricing ? (
                      <p className="mt-3 text-xs font-semibold text-amber-700">
                        Ada harga pending
                      </p>
                    ) : null}
                    <Link
                      href={`/admin/orders/quotations/${row.id}`}
                      className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-full bg-brand-charcoal px-4 text-sm font-semibold text-white"
                    >
                      Buka Detail
                    </Link>
                  </article>
                );
              })}
            </div>
          </section>
        ) : (
          <AdminEmptyState
            title="Belum ada quotation yang sesuai"
            description="Ubah pencarian atau filter, atau buat quotation baru."
            action={
              <Link
                href="/admin/orders/quotations/new"
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand-charcoal px-6 text-sm font-semibold text-white"
              >
                Buat Quotation
              </Link>
            }
          />
        )}
      </div>
    </main>
  );
}
