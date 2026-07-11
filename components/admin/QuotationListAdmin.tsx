"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";

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

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Diajukan",
  under_review: "Dalam Review",
  pricing: "Penyusunan Harga",
  sent: "Terkirim",
  revision_requested: "Minta Revisi",
  approved: "Disetujui",
  rejected: "Ditolak",
  expired: "Kedaluwarsa",
  converted_to_order: "Menjadi Order"
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
  const [message, setMessage] = useState("Memeriksa akses...");
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  async function loadQuotations() {
    const supabase = createSupabaseClient();
    if (!supabase) {
      setMessage("Supabase belum dikonfigurasi.");
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("quotations")
      .select(
        "id,quotation_number,customer_name,company_name,customer_phone,status,confirmed_total,estimated_total,has_pending_pricing,valid_until,created_at"
      )
      .order("created_at", { ascending: false });

    setLoading(false);

    if (error) {
      setMessage(`Quotation gagal dimuat: ${error.message}`);
      return;
    }

    setRows((data || []) as QuotationRow[]);
    setMessage("");
  }

  useEffect(() => {
    async function checkAccess() {
      const supabase = createSupabaseClient();
      if (!supabase) {
        setMessage("Supabase belum dikonfigurasi.");
        setLoading(false);
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

      if (error || !profile) {
        setMessage("Profil admin tidak dapat diverifikasi.");
        setLoading(false);
        return;
      }

      const acceptedRoles = [
        "owner",
        "superadmin",
        "super_admin",
        "sales_admin",
        "admin"
      ];

      if (!acceptedRoles.includes(String(profile.role))) {
        setMessage("Akses quotation ditolak.");
        setLoading(false);
        return;
      }

      setAllowed(true);
      await loadQuotations();
    }

    void checkAccess();
  }, [router]);

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

  if (!allowed) {
    return (
      <main className="min-h-screen bg-brand-offWhite p-6 text-brand-charcoal">
        <div className="mx-auto mt-20 max-w-lg border border-brand-softGray bg-white p-8 text-center">
          <h1 className="text-3xl font-semibold">Formal Quotation</h1>
          <p className="mt-4 text-sm font-medium text-brand-charcoal/70">
            {message}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-offWhite p-4 text-brand-charcoal sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="border border-brand-softGray bg-white p-5 sm:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-charcoal/50">
                DEBRODER v1.2 · Phase 1
              </p>
              <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
                Formal Quotation
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-brand-charcoal/65">
                Kelola penawaran resmi, pelanggan, status, masa berlaku, dan
                total harga.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin/dashboard"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-brand-softGray px-5 text-sm font-semibold"
              >
                Dashboard
              </Link>
              <Link
                href="/admin/orders/quotations/new"
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand-green px-5 text-sm font-semibold text-white"
              >
                Buat Quotation
              </Link>
            </div>
          </div>
        </header>

        <section className="mt-6 border border-brand-softGray bg-white p-5">
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
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void loadQuotations()}
              className="min-h-11 rounded-full border border-brand-charcoal px-5 text-sm font-semibold"
            >
              Refresh
            </button>
          </div>

          {message ? (
            <p className="mt-4 border border-brand-softGray bg-brand-offWhite p-4 text-sm font-semibold">
              {message}
            </p>
          ) : null}
        </section>

        <section className="mt-6 overflow-hidden border border-brand-softGray bg-white">
          <div className="overflow-x-auto">
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
                        <span className="inline-flex rounded-full border border-brand-softGray bg-brand-offWhite px-3 py-1 text-xs font-semibold">
                          {STATUS_LABELS[row.status] || row.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold">{formatMoney(total)}</p>
                        {row.has_pending_pricing ? (
                          <p className="mt-1 text-xs font-semibold text-amber-700">
                            Ada harga pending
                          </p>
                        ) : null}
                      </td>
                      <td className="px-5 py-4">{formatDate(row.valid_until)}</td>
                      <td className="px-5 py-4">{formatDate(row.created_at)}</td>
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

          {!loading && !visibleRows.length ? (
            <div className="p-8 text-center text-sm font-medium text-brand-charcoal/60">
              Belum ada quotation yang sesuai.
            </div>
          ) : null}

          {loading ? (
            <div className="p-8 text-center text-sm font-medium text-brand-charcoal/60">
              Memuat quotation...
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
