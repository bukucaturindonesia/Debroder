"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";
import { AdminAlert, AdminEmptyState, AdminLoadingState } from "@/components/admin/ui/AdminFeedback";
import {
  JOB_ORDER_PRIORITY_LABELS,
  JOB_ORDER_STATUS_LABELS,
  formatJobOrderDate,
  isSuperAdminRole,
  type JobOrderPriority,
  type JobOrderRow
} from "@/lib/job-orders";

type OrderCandidate = {
  id: string;
  order_number: string;
  customer_name: string;
  company_name: string | null;
  status: string;
  total_amount: number;
  payment_production_eligible: boolean;
  approved_mockup_set_id: string | null;
  archived_at: string | null;
};

type Tab = "active" | "eligible" | "archive";

type CreateForm = {
  order_id: string;
  target_date: string;
  priority: JobOrderPriority;
  internal_notes: string;
  production_notes: string;
};

const EMPTY_FORM: CreateForm = {
  order_id: "",
  target_date: "",
  priority: "normal",
  internal_notes: "",
  production_notes: ""
};

function money(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(value || 0);
}

export function JobOrderAdmin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedOrderId = searchParams.get("order") || "";
  const [tab, setTab] = useState<Tab>(requestedOrderId ? "eligible" : "active");
  const [jobOrders, setJobOrders] = useState<JobOrderRow[]>([]);
  const [orders, setOrders] = useState<OrderCandidate[]>([]);
  const [actors, setActors] = useState<Record<string, string>>({});
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<{ type: "success" | "error" | "warning"; text: string } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateForm>({ ...EMPTY_FORM });
  const [archiveTarget, setArchiveTarget] = useState<JobOrderRow | null>(null);
  const [archiveReason, setArchiveReason] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<JobOrderRow | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const loadData = useCallback(async () => {
    const supabase = createSupabaseClient();
    if (!supabase) {
      setNotice({ type: "error", text: "Supabase belum dikonfigurasi." });
      setLoading(false);
      return;
    }

    setLoading(true);
    setNotice(null);
    const sessionResult = await supabase.auth.getSession();
    const userId = sessionResult.data.session?.user.id;

    const [profileResult, jobResult, orderResult, actorsResult] = await Promise.all([
      userId
        ? supabase.from("profiles").select("role").eq("id", userId).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from("job_orders")
        .select("id,job_order_number,order_id,quotation_id,approved_mockup_set_id,status,priority,target_date,internal_notes,production_notes,order_snapshot,mockup_snapshot,payment_snapshot,progress_percentage,ready_by,ready_at,released_by,released_at,created_by,updated_by,created_at,updated_at,archived_at,archived_by,archive_reason")
        .order("created_at", { ascending: false }),
      supabase
        .from("orders")
        .select("id,order_number,customer_name,company_name,status,total_amount,payment_production_eligible,approved_mockup_set_id,archived_at")
        .is("archived_at", null)
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("id,email")
    ]);

    setLoading(false);
    const firstError = jobResult.error || orderResult.error;
    if (firstError) {
      setNotice({ type: "error", text: `Fondasi Job Order belum dapat dimuat: ${firstError.message}` });
      return;
    }

    setRole(typeof profileResult.data?.role === "string" ? profileResult.data.role : null);
    setJobOrders((jobResult.data || []) as JobOrderRow[]);
    setOrders((orderResult.data || []) as OrderCandidate[]);
    const actorMap: Record<string, string> = {};
    for (const actor of actorsResult.data || []) {
      if (typeof actor.id === "string") {
        actorMap[actor.id] = typeof actor.email === "string" && actor.email.trim() ? actor.email : "Akun tanpa email";
      }
    }
    setActors(actorMap);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!requestedOrderId || loading || createOpen) return;
    const candidate = orders.find((row) => row.id === requestedOrderId);
    if (!candidate) return;
    const existing = jobOrders.find(
      (row) => row.order_id === candidate.id && !row.archived_at && row.status !== "cancelled"
    );
    if (existing) {
      router.replace(`/admin/job-orders/${existing.id}`);
      return;
    }
    if (candidate.payment_production_eligible && candidate.approved_mockup_set_id) {
      openCreate(candidate.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedOrderId, loading]);

  const activeOrderIds = useMemo(
    () => new Set(jobOrders.filter((row) => !row.archived_at && row.status !== "cancelled").map((row) => row.order_id)),
    [jobOrders]
  );

  const eligibleOrders = useMemo(
    () =>
      orders.filter(
        (row) =>
          !activeOrderIds.has(row.id) &&
          row.status !== "dibatalkan" &&
          row.status !== "selesai" &&
          row.payment_production_eligible &&
          Boolean(row.approved_mockup_set_id)
      ),
    [activeOrderIds, orders]
  );

  const normalizedQuery = query.trim().toLowerCase();
  const visibleJobOrders = useMemo(() => {
    const archived = tab === "archive";
    return jobOrders.filter((row) => {
      if (Boolean(row.archived_at) !== archived) return false;
      const snapshotOrder = row.order_snapshot?.order as Record<string, unknown> | undefined;
      const haystack = [
        row.job_order_number,
        String(snapshotOrder?.order_number || ""),
        String(snapshotOrder?.customer_name || ""),
        JOB_ORDER_STATUS_LABELS[row.status]
      ]
        .join(" ")
        .toLowerCase();
      return !normalizedQuery || haystack.includes(normalizedQuery);
    });
  }, [jobOrders, normalizedQuery, tab]);

  const visibleEligible = useMemo(
    () =>
      eligibleOrders.filter((row) => {
        const haystack = [row.order_number, row.customer_name, row.company_name || ""].join(" ").toLowerCase();
        return !normalizedQuery || haystack.includes(normalizedQuery);
      }),
    [eligibleOrders, normalizedQuery]
  );

  function actorLabel(id: string | null) {
    if (!id) return "Sistem";
    return actors[id] || "Akun tidak tersedia";
  }

  function openCreate(orderId = "") {
    setForm({ ...EMPTY_FORM, order_id: orderId });
    setCreateOpen(true);
    setNotice(null);
  }

  async function createJobOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (working || !form.order_id || !form.target_date) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setWorking(true);
    setNotice(null);
    const result = await supabase.rpc("create_job_order", {
      p_order_id: form.order_id,
      p_target_date: form.target_date,
      p_priority: form.priority,
      p_internal_notes: form.internal_notes.trim() || null,
      p_production_notes: form.production_notes.trim() || null,
      p_idempotency_key: `job-order:${form.order_id}`
    });
    setWorking(false);
    if (result.error) {
      setNotice({ type: "error", text: result.error.message || "Job Order gagal dibuat." });
      return;
    }
    const created = Array.isArray(result.data) ? result.data[0] : result.data;
    if (!created?.id) {
      setNotice({ type: "error", text: "Job Order tersimpan tetapi ID hasil tidak ditemukan." });
      return;
    }
    router.push(`/admin/job-orders/${created.id}`);
    router.refresh();
  }

  async function archiveJobOrder() {
    if (!archiveTarget || working || !archiveReason.trim()) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setWorking(true);
    const result = await supabase.rpc("archive_job_order", {
      p_job_order_id: archiveTarget.id,
      p_reason: archiveReason.trim()
    });
    setWorking(false);
    if (result.error) {
      setNotice({ type: "error", text: result.error.message || "Job Order gagal diarsipkan." });
      return;
    }
    setArchiveTarget(null);
    setArchiveReason("");
    setNotice({ type: "success", text: `${archiveTarget.job_order_number} dipindahkan ke Gudang Arsip.` });
    await loadData();
  }

  async function restoreJobOrder(row: JobOrderRow) {
    if (working) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setWorking(true);
    const result = await supabase.rpc("restore_job_order", { p_job_order_id: row.id });
    setWorking(false);
    if (result.error) {
      setNotice({ type: "error", text: result.error.message || "Job Order gagal dipulihkan." });
      return;
    }
    setNotice({ type: "success", text: `${row.job_order_number} berhasil dipulihkan.` });
    await loadData();
  }

  async function permanentlyDeleteJobOrder() {
    if (!deleteTarget || working || deleteConfirmation !== "HAPUS PERMANEN") return;
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setWorking(true);
    const result = await supabase.rpc("permanently_delete_job_order", {
      p_job_order_id: deleteTarget.id
    });
    setWorking(false);
    if (result.error) {
      setNotice({ type: "error", text: result.error.message || "Hapus permanen ditolak." });
      return;
    }
    setNotice({ type: "success", text: `${deleteTarget.job_order_number} berhasil dihapus permanen.` });
    setDeleteTarget(null);
    setDeleteConfirmation("");
    await loadData();
  }

  if (loading) return <AdminLoadingState label="Memuat fondasi Job Order..." />;

  return (
    <main className="text-brand-charcoal">
      <div className="grid gap-6">
        <AdminPageHeader
          eyebrow="DEBRODER v1.2 · Phase 7 Foundation"
          title="Job Order"
          description="Pusat pembuatan surat kerja produksi dari pesanan yang mockup dan syarat pembayarannya sudah valid."
          actions={
            <button
              type="button"
              onClick={() => {
                setTab("eligible");
                openCreate();
              }}
              disabled={!eligibleOrders.length}
              className="inline-flex min-h-11 items-center rounded-full bg-brand-green px-5 text-sm font-semibold text-white disabled:opacity-45"
            >
              Buat Job Order
            </button>
          }
        />

        {notice ? <AdminAlert type={notice.type}>{notice.text}</AdminAlert> : null}

        <section className="border border-brand-softGray bg-white p-5">
          <div className="flex flex-wrap gap-2">
            {([
              ["active", `Aktif (${jobOrders.filter((row) => !row.archived_at).length})`],
              ["eligible", `Pesanan Siap (${eligibleOrders.length})`],
              ["archive", `Gudang Arsip (${jobOrders.filter((row) => row.archived_at).length})`]
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === value ? "bg-brand-charcoal text-white" : "border border-brand-softGray bg-white"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari nomor Job Order, pesanan, atau pelanggan"
            className="mt-4 min-h-11 w-full rounded-lg border border-brand-softGray px-4 text-sm"
          />
        </section>

        {tab === "eligible" ? (
          visibleEligible.length ? (
            <section className="grid gap-3">
              {visibleEligible.map((row) => (
                <article key={row.id} className="border border-brand-softGray bg-white p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h2 className="font-semibold">{row.order_number}</h2>
                      <p className="mt-1 text-sm text-brand-charcoal/60">
                        {row.customer_name}{row.company_name ? ` · ${row.company_name}` : ""}
                      </p>
                      <p className="mt-2 text-sm font-semibold">{money(row.total_amount)}</p>
                      <p className="mt-2 text-xs text-emerald-700">Pembayaran dan mockup memenuhi syarat.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openCreate(row.id)}
                      className="inline-flex min-h-10 items-center justify-center rounded-full bg-brand-green px-5 text-sm font-semibold text-white"
                    >
                      Buat Job Order
                    </button>
                  </div>
                </article>
              ))}
            </section>
          ) : (
            <AdminEmptyState
              title="Belum ada pesanan siap produksi"
              description="Pesanan harus aktif, memiliki mockup approved, dan memenuhi kebijakan pembayaran produksi."
            />
          )
        ) : visibleJobOrders.length ? (
          <section className="grid gap-3">
            {visibleJobOrders.map((row) => {
              const snapshotOrder = row.order_snapshot?.order as Record<string, unknown> | undefined;
              return (
                <article key={row.id} className="border border-brand-softGray bg-white p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h2 className="font-semibold">{row.job_order_number}</h2>
                      <p className="mt-1 text-sm text-brand-charcoal/60">
                        {String(snapshotOrder?.order_number || "Pesanan")}{snapshotOrder?.customer_name ? ` · ${String(snapshotOrder.customer_name)}` : ""}
                      </p>
                      <p className="mt-2 text-xs font-semibold text-brand-charcoal/55">
                        {JOB_ORDER_STATUS_LABELS[row.status]} · {JOB_ORDER_PRIORITY_LABELS[row.priority]}
                      </p>
                      <p className="mt-1 text-xs text-brand-charcoal/55">Target: {row.target_date || "Belum ditentukan"}</p>
                      {row.archived_at ? (
                        <p className="mt-2 text-xs leading-5 text-brand-charcoal/55">
                          Diarsipkan {formatJobOrderDate(row.archived_at)} · {actorLabel(row.archived_by)}<br />
                          Alasan: {row.archive_reason || "-"}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!row.archived_at ? (
                        <>
                          <Link
                            href={`/admin/job-orders/${row.id}`}
                            className="inline-flex min-h-10 items-center rounded-full bg-brand-charcoal px-5 text-sm font-semibold text-white"
                          >
                            Buka Detail
                          </Link>
                          {["draft", "completed", "cancelled"].includes(row.status) ? (
                            <button
                              type="button"
                              onClick={() => setArchiveTarget(row)}
                              className="rounded-full border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-800"
                            >
                              Arsipkan
                            </button>
                          ) : null}
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => void restoreJobOrder(row)}
                            disabled={working}
                            className="rounded-full border border-brand-softGray px-4 py-2 text-sm font-semibold disabled:opacity-45"
                          >
                            Pulihkan
                          </button>
                          {isSuperAdminRole(role) ? (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(row)}
                              className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700"
                            >
                              Hapus Permanen
                            </button>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <AdminEmptyState
            title={tab === "archive" ? "Gudang Arsip Job Order kosong" : "Belum ada Job Order"}
            description={tab === "archive" ? "Job Order yang diarsipkan akan muncul di sini." : "Buat Job Order dari pesanan yang sudah memenuhi syarat produksi."}
          />
        )}
      </div>

      {createOpen ? (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/60 p-4 sm:p-8">
          <form onSubmit={createJobOrder} className="mx-auto max-w-2xl bg-white p-6 shadow-2xl sm:p-8">
            <h2 className="text-2xl font-semibold">Buat Job Order</h2>
            <p className="mt-2 text-sm text-brand-charcoal/60">Nomor Job Order dan snapshot produksi dibuat otomatis oleh database.</p>

            <label className="mt-5 block text-sm font-semibold">
              Pesanan siap produksi
              <select
                required
                value={form.order_id}
                onChange={(event) => setForm((current) => ({ ...current, order_id: event.target.value }))}
                className="mt-2 min-h-11 w-full rounded-lg border border-brand-softGray px-4"
              >
                <option value="">Pilih pesanan</option>
                {eligibleOrders.map((row) => (
                  <option key={row.id} value={row.id}>{row.order_number} · {row.customer_name}</option>
                ))}
              </select>
            </label>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold">
                Target produksi
                <input
                  type="date"
                  required
                  min={new Date().toISOString().slice(0, 10)}
                  value={form.target_date}
                  onChange={(event) => setForm((current) => ({ ...current, target_date: event.target.value }))}
                  className="mt-2 min-h-11 w-full rounded-lg border border-brand-softGray px-4"
                />
              </label>
              <label className="block text-sm font-semibold">
                Prioritas
                <select
                  value={form.priority}
                  onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as JobOrderPriority }))}
                  className="mt-2 min-h-11 w-full rounded-lg border border-brand-softGray px-4"
                >
                  {Object.entries(JOB_ORDER_PRIORITY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="mt-4 block text-sm font-semibold">
              Catatan internal
              <textarea
                rows={3}
                value={form.internal_notes}
                onChange={(event) => setForm((current) => ({ ...current, internal_notes: event.target.value }))}
                className="mt-2 w-full rounded-lg border border-brand-softGray px-4 py-3"
              />
            </label>
            <label className="mt-4 block text-sm font-semibold">
              Instruksi produksi
              <textarea
                rows={4}
                value={form.production_notes}
                onChange={(event) => setForm((current) => ({ ...current, production_notes: event.target.value }))}
                className="mt-2 w-full rounded-lg border border-brand-softGray px-4 py-3"
              />
            </label>

            <div className="mt-6 flex flex-wrap gap-3">
              <button type="submit" disabled={working || !form.order_id || !form.target_date} className="rounded-full bg-brand-green px-6 py-3 text-sm font-semibold text-white disabled:opacity-45">
                {working ? "Membuat..." : "Buat Job Order"}
              </button>
              <button type="button" onClick={() => setCreateOpen(false)} disabled={working} className="rounded-full border border-brand-softGray px-6 py-3 text-sm font-semibold">
                Batal
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {archiveTarget ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4">
          <section className="w-full max-w-lg bg-white p-6 shadow-2xl">
            <h2 className="text-2xl font-semibold">Arsipkan Job Order?</h2>
            <p className="mt-2 text-sm text-brand-charcoal/60">{archiveTarget.job_order_number} dapat dipulihkan melalui Gudang Arsip.</p>
            <textarea
              rows={4}
              value={archiveReason}
              onChange={(event) => setArchiveReason(event.target.value)}
              placeholder="Alasan arsip wajib diisi"
              className="mt-5 w-full rounded-lg border border-brand-softGray px-4 py-3"
            />
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={() => void archiveJobOrder()} disabled={working || !archiveReason.trim()} className="rounded-full bg-amber-700 px-6 py-3 text-sm font-semibold text-white disabled:opacity-45">
                {working ? "Memindahkan..." : "Arsipkan"}
              </button>
              <button type="button" onClick={() => setArchiveTarget(null)} disabled={working} className="rounded-full border border-brand-softGray px-6 py-3 text-sm font-semibold">Batal</button>
            </div>
          </section>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4">
          <section className="w-full max-w-lg bg-white p-6 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-700">Super Admin Only</p>
            <h2 className="mt-2 text-2xl font-semibold">Hapus Permanen?</h2>
            <p className="mt-3 text-sm leading-6 text-brand-charcoal/65">Hanya Job Order Draft atau Dibatalkan tanpa Work Item yang dapat dihapus permanen.</p>
            <input
              value={deleteConfirmation}
              onChange={(event) => setDeleteConfirmation(event.target.value)}
              placeholder="Ketik HAPUS PERMANEN"
              className="mt-5 min-h-11 w-full rounded-lg border border-red-200 px-4"
            />
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={() => void permanentlyDeleteJobOrder()} disabled={working || deleteConfirmation !== "HAPUS PERMANEN"} className="rounded-full bg-red-700 px-6 py-3 text-sm font-semibold text-white disabled:opacity-45">
                {working ? "Menghapus..." : "Hapus Permanen"}
              </button>
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={working} className="rounded-full border border-brand-softGray px-6 py-3 text-sm font-semibold">Batal</button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
