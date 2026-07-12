"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";
import { AdminEmptyState, AdminLoadingState } from "@/components/admin/ui/AdminFeedback";

type Row = {
  id: string;
  order_number: string;
  customer_name: string;
  archived_at: string;
  archived_by: string | null;
  archive_reason: string | null;
};

const SUPER_ROLES = ["superadmin", "super_admin"];

export function OrderArchiveAdmin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const [message, setMessage] = useState("");

  async function loadRows() {
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setLoading(true);
    const { data: session } = await supabase.auth.getSession();
    const user = session.session?.user;
    const [profileResult, rowsResult] = await Promise.all([
      user
        ? supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from("orders")
        .select("id,order_number,customer_name,archived_at,archived_by,archive_reason")
        .not("archived_at", "is", null)
        .order("archived_at", { ascending: false })
    ]);
    setLoading(false);
    setRole(String(profileResult.data?.role || ""));
    setRows((rowsResult.data || []) as Row[]);
  }

  useEffect(() => {
    void loadRows();
  }, []);

  async function restore(row: Row) {
    const supabase = createSupabaseClient();
    if (!supabase || workingId) return;
    setWorkingId(row.id);
    const { error } = await supabase.rpc("restore_order", { p_order_id: row.id });
    setWorkingId(null);
    if (error) {
      setMessage("Pesanan gagal dipulihkan.");
      return;
    }
    setRows((current) => current.filter((item) => item.id !== row.id));
    setMessage(`${row.order_number} berhasil dipulihkan.`);
  }

  async function permanentlyDelete() {
    if (!deleteTarget || workingId) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setWorkingId(deleteTarget.id);
    const { error } = await supabase.rpc("permanently_delete_order", {
      p_order_id: deleteTarget.id
    });
    setWorkingId(null);
    if (error) {
      setMessage("Hapus permanen ditolak atau gagal.");
      return;
    }
    setRows((current) => current.filter((item) => item.id !== deleteTarget.id));
    setMessage(`${deleteTarget.order_number} berhasil dihapus permanen.`);
    setDeleteTarget(null);
  }

  if (loading) return <AdminLoadingState label="Memuat Gudang Arsip pesanan..." />;

  return (
    <main className="text-brand-charcoal">
      <div className="grid gap-6">
        <AdminPageHeader
          eyebrow="DEBRODER v1.2 · Pesanan"
          title="Gudang Arsip Pesanan"
          description="Pulihkan pesanan atau hapus permanen dengan akses Super Admin."
          actions={
            <Link
              href="/admin/orders"
              className="inline-flex min-h-11 items-center rounded-full border border-brand-softGray bg-white px-5 text-sm font-semibold"
            >
              Kembali ke Pesanan
            </Link>
          }
        />

        {message ? (
          <div className="border border-brand-softGray bg-white p-4 text-sm font-semibold">
            {message}
          </div>
        ) : null}

        {rows.length ? (
          <section className="grid gap-3">
            {rows.map((row) => (
              <article key={row.id} className="border border-brand-softGray bg-white p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="font-semibold">{row.order_number}</h2>
                    <p className="mt-1 text-sm text-brand-charcoal/60">{row.customer_name}</p>
                    <p className="mt-2 text-xs leading-5 text-brand-charcoal/55">
                      Diarsipkan: {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(row.archived_at))}
                      <br />Oleh: {row.archived_by || "-"}
                      <br />Alasan: {row.archive_reason || "-"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void restore(row)}
                      disabled={Boolean(workingId)}
                      className="rounded-full border border-brand-softGray px-4 py-2 text-sm font-semibold disabled:opacity-45"
                    >
                      Pulihkan
                    </button>
                    {SUPER_ROLES.includes(role) ? (
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(row)}
                        className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700"
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
            description="Pesanan yang diarsipkan akan muncul di sini."
          />
        )}
      </div>

      {deleteTarget ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4">
          <section className="w-full max-w-lg bg-white p-6 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-700">
              Super Admin Only
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Hapus Permanen?</h2>
            <p className="mt-3 text-sm leading-6 text-brand-charcoal/65">
              {deleteTarget.order_number} beserta item dan riwayat terkait tidak dapat dipulihkan.
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
                onClick={() => setDeleteTarget(null)}
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
