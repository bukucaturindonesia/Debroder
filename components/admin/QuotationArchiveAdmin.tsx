"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";
import { AdminAlert, AdminEmptyState, AdminLoadingState } from "@/components/admin/ui/AdminFeedback";
import { isAdminRole, QUOTATION_ROLES } from "@/components/admin/layout/admin-navigation";

type Row = {
  id: string;
  quotation_number: string;
  customer_name: string;
  company_name: string | null;
  status: string;
  confirmed_total: number | null;
  estimated_total: number | null;
  archived_at: string;
  archived_by: string | null;
  archive_reason: string | null;
};

const SUPER_ROLES = ["owner", "superadmin", "super_admin"];

function money(value: number | null) {
  if (value === null) return "Menunggu harga";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(value);
}

function date(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function QuotationArchiveAdmin() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [role, setRole] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Row | null>(null);
  const [message, setMessage] = useState("");

  async function loadRows() {
    const supabase = createSupabaseClient();
    if (!supabase) return;

    setLoading(true)

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) {
      router.replace("/admin/login");
      return;
    }

    const [profileResult, rowsResult] = await Promise.all([
      supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
      supabase
        .from("quotations")
        .select("id,quotation_number,customer_name,company_name,status,confirmed_total,estimated_total,archived_at,archived_by,archive_reason")
        .not("archived_at", "is", null)
        .order("archived_at", { ascending: false })
    ]);

    setLoading(false);

    if (
      profileResult.error ||
      !profileResult.data ||
      !isAdminRole(profileResult.data.role) ||
      !QUOTATION_ROLES.includes(profileResult.data.role)
    ) {
      setMessage("Akses Gudang Arsip quotation ditolak.");
      return;
    }

    if (rowsResult.error) {
      setMessage("Gudang Arsip quotation gagal dimuat.");
      return;
    }

    setRole(String(profileResult.data.role));
    setRows((rowsResult.data || []) as Row[]);
  }

  useEffect(() => {
    void loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return rows.filter((row) =>
      !keyword ||
      row.quotation_number.toLowerCase().includes(keyword) ||
      row.customer_name.toLowerCase().includes(keyword) ||
      (row.company_name || "").toLowerCase().includes(keyword)
    );
  }, [query, rows]);

  async function restore(row: Row) {
    const supabase = createSupabaseClient();
    if (!supabase || workingId) return;
    setWorkingId(row.id);
    setMessage("");

    const { error } = await supabase.rpc("restore_quotation", {
      p_quotation_id: row.id
    });

    setWorkingId(null);

    if (error) {
      setMessage("Penawaran belum dapat dipulihkan.");
      return;
    }

    setRows((current) => current.filter((item) => item.id !== row.id));
    setMessage(`${row.quotation_number} berhasil dipulihkan.`);
  }

  async function permanentlyDelete() {
    if (!confirmDelete || workingId) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;

    setWorkingId(confirmDelete.id);
    const { error } = await supabase.rpc("permanently_delete_quotation", {
      p_quotation_id: confirmDelete.id
    });
    setWorkingId(null);

    if (error) {
      setMessage("Hapus permanen ditolak atau gagal diproses.");
      return;
    }

    setRows((current) => current.filter((item) => item.id !== confirmDelete.id));
    setMessage(`${confirmDelete.quotation_number} berhasil dihapus permanen.`);
    setConfirmDelete(null);
  }

  if (loading) return <AdminLoadingState label="Memuat Gudang Arsip quotation..." />;

  return (
    <main className="text-brand-charcoal">
      <div className="grid gap-6">
        <AdminPageHeader
          eyebrow="DEBRODER v1.2 · PENAWARAN HARGA RESMI"
          title="Arsip Penawaran"
          description="Pulihkan quotation yang diarsipkan atau hapus permanen dengan akses Super Admin."
          actions={
            <Link
              href="/admin/orders/quotations"
              className="inline-flex min-h-11 items-center rounded-full border border-brand-softGray bg-white px-5 text-sm font-semibold"
            >
              Kembali ke Penawaran
            </Link>
          }
        />

        <section className="border border-brand-softGray bg-white p-5">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nomor, pelanggan, atau perusahaan"
            className="min-h-11 w-full rounded-lg border border-brand-softGray px-4 text-sm"
          />
          <p className="mt-3 text-xs font-semibold text-brand-charcoal/55">
            {visible.length} quotation di arsip
          </p>
        </section>

        {message ? <AdminAlert type="warning">{message}</AdminAlert> : null}

        {visible.length ? (
          <section className="grid gap-3">
            {visible.map((row) => (
              <article key={row.id} className="border border-brand-softGray bg-white p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="font-semibold">{row.quotation_number}</h2>
                    <p className="mt-1 text-sm text-brand-charcoal/60">
                      {row.customer_name}{row.company_name ? ` · ${row.company_name}` : ""}
                    </p>
                    <p className="mt-2 text-sm font-semibold">
                      {money(row.confirmed_total ?? row.estimated_total)}
                    </p>
                    <div className="mt-3 text-xs leading-5 text-brand-charcoal/55">
                      <p>Diarsipkan: {date(row.archived_at)}</p>
                      <p>Oleh: {row.archived_by || "-"}</p>
                      <p>Alasan: {row.archive_reason || "-"}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void restore(row)}
                      disabled={Boolean(workingId)}
                      className="rounded-full border border-brand-softGray px-4 py-2 text-sm font-semibold disabled:opacity-45"
                    >
                      {workingId === row.id ? "Memulihkan..." : "Pulihkan"}
                    </button>
                    {SUPER_ROLES.includes(role) ? (
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(row)}
                        disabled={Boolean(workingId)}
                        className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-45"
                      >
                        Hapus Permanen
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <AdminEmptyState
            title="Gudang Arsip kosong"
            description="Penawaran yang diarsipkan akan muncul di halaman ini."
          />
        )}
      </div>

      {confirmDelete ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4">
          <section className="w-full max-w-lg border border-red-200 bg-white p-6 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-700">
              Super Admin Only
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Hapus Permanen?</h2>
            <p className="mt-3 text-sm leading-6 text-brand-charcoal/65">
              <strong>{confirmDelete.quotation_number}</strong> beserta seluruh item, layanan, dan riwayatnya akan dihapus permanen.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void permanentlyDelete()}
                disabled={Boolean(workingId)}
                className="rounded-full bg-red-700 px-6 py-3 text-sm font-semibold text-white disabled:opacity-45"
              >
                {workingId ? "Menghapus..." : "Hapus Permanen"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                disabled={Boolean(workingId)}
                className="rounded-full border border-brand-softGray px-6 py-3 text-sm font-semibold"
              >
                Batal
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
