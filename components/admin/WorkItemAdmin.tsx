"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";
import { AdminAlert, AdminEmptyState, AdminLoadingState } from "@/components/admin/ui/AdminFeedback";
import {
  WORK_ITEM_PRIORITY_LABELS,
  WORK_ITEM_STATUS_LABELS,
  canArchiveWorkItem,
  formatWorkItemDate,
  formatWorkItemTarget,
  isWorkItemRole,
  isWorkItemSuperAdmin,
  isWorkItemViewerRole,
  readSnapshotObject,
  type WorkItemJobOrder,
  type WorkItemPriority,
  type WorkItemRow
} from "@/lib/work-items";

type Tab = "active" | "archive";

type ProfileRow = {
  id: string;
  email: string | null;
  role: string | null;
};

type ManualForm = {
  job_order_id: string;
  title: string;
  description: string;
  quantity: number;
  unit: string;
  target_date: string;
  priority: WorkItemPriority;
};

type PendingAction =
  | { type: "archive"; row: WorkItemRow }
  | { type: "delete"; row: WorkItemRow }
  | null;

const EMPTY_FORM: ManualForm = {
  job_order_id: "",
  title: "",
  description: "",
  quantity: 1,
  unit: "pcs",
  target_date: "",
  priority: "normal"
};

function jobOrderLabel(row: WorkItemJobOrder) {
  const orderSnapshot = readSnapshotObject(row.order_snapshot);
  const sourceOrder = readSnapshotObject(orderSnapshot.order);
  const orderNumber = String(sourceOrder.order_number || "");
  const customerName = String(sourceOrder.customer_name || "");
  return [row.job_order_number, orderNumber, customerName].filter(Boolean).join(" · ");
}

export function WorkItemAdmin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedJobOrderId = searchParams.get("job_order") || "";

  const [tab, setTab] = useState<Tab>("active");
  const [workItems, setWorkItems] = useState<WorkItemRow[]>([]);
  const [jobOrders, setJobOrders] = useState<WorkItemJobOrder[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [query, setQuery] = useState("");
  const [jobFilter, setJobFilter] = useState(requestedJobOrderId);
  const [notice, setNotice] = useState<{ type: "success" | "error" | "warning"; text: string } | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generateJobOrderId, setGenerateJobOrderId] = useState(requestedJobOrderId);
  const [form, setForm] = useState<ManualForm>({ ...EMPTY_FORM, job_order_id: requestedJobOrderId });
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [archiveReason, setArchiveReason] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const canManage = isWorkItemRole(role);
  const canView = isWorkItemViewerRole(role);
  const canDelete = isWorkItemSuperAdmin(role);

  const loadData = useCallback(async () => {
    const supabase = createSupabaseClient();
    if (!supabase) {
      setNotice({ type: "error", text: "Layanan data belum tersedia. Hubungi pengelola sistem." });
      setLoading(false);
      return;
    }

    setLoading(true);
    setNotice(null);
    const sessionResult = await supabase.auth.getSession();
    const userId = sessionResult.data.session?.user.id;
    const [profileResult, workResult, jobResult, profilesResult] = await Promise.all([
      userId
        ? supabase.from("profiles").select("role").eq("id", userId).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from("work_items")
        .select("id,work_item_number,job_order_id,source_order_item_id,source_order_item_service_id,source_mockup_part_id,title,description,quantity,unit,assigned_to,target_date,priority,status,instruction_snapshot,approved_design_snapshot,ready_by,ready_at,started_at,paused_at,resumed_at,completed_at,cancelled_at,cancel_reason,created_by,updated_by,created_at,updated_at,archived_at,archived_by,archive_reason")
        .order("created_at", { ascending: false }),
      supabase
        .from("job_orders")
        .select("id,job_order_number,status,priority,target_date,order_snapshot,mockup_snapshot,archived_at")
        .is("archived_at", null)
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("id,email,role")
    ]);
    setLoading(false);

    const firstError = workResult.error || jobResult.error;
    if (firstError) {
      setNotice({ type: "error", text: "Daftar pekerjaan belum dapat dimuat. Coba lagi." });
      return;
    }

    setRole(typeof profileResult.data?.role === "string" ? profileResult.data.role : null);
    setWorkItems((workResult.data || []) as WorkItemRow[]);
    setJobOrders((jobResult.data || []) as WorkItemJobOrder[]);
    setProfiles((profilesResult.data || []) as ProfileRow[]);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!requestedJobOrderId) return;
    setJobFilter(requestedJobOrderId);
    setGenerateJobOrderId(requestedJobOrderId);
    setForm((current) => ({ ...current, job_order_id: requestedJobOrderId }));
  }, [requestedJobOrderId]);

  const actors = useMemo(() => {
    const map: Record<string, string> = {};
    for (const profile of profiles) {
      map[profile.id] = profile.email?.trim() || "Akun tanpa email";
    }
    return map;
  }, [profiles]);

  const jobMap = useMemo(() => {
    const map: Record<string, WorkItemJobOrder> = {};
    for (const row of jobOrders) map[row.id] = row;
    return map;
  }, [jobOrders]);

  const editableJobOrders = useMemo(
    () => jobOrders.filter((row) => row.status === "draft" || row.status === "ready"),
    [jobOrders]
  );

  const normalizedQuery = query.trim().toLowerCase();
  const visibleRows = useMemo(() => {
    const archived = tab === "archive";
    return workItems.filter((row) => {
      if (Boolean(row.archived_at) !== archived) return false;
      if (jobFilter && row.job_order_id !== jobFilter) return false;
      const job = jobMap[row.job_order_id];
      const haystack = [
        row.work_item_number,
        row.title,
        row.description || "",
        WORK_ITEM_STATUS_LABELS[row.status],
        WORK_ITEM_PRIORITY_LABELS[row.priority],
        actors[row.assigned_to || ""] || "",
        job ? jobOrderLabel(job) : ""
      ]
        .join(" ")
        .toLowerCase();
      return !normalizedQuery || haystack.includes(normalizedQuery);
    });
  }, [actors, jobFilter, jobMap, normalizedQuery, tab, workItems]);

  function openManual(jobOrderId = requestedJobOrderId) {
    const job = jobMap[jobOrderId];
    setForm({
      ...EMPTY_FORM,
      job_order_id: jobOrderId,
      target_date: job?.target_date || "",
      priority: job?.priority || "normal"
    });
    setManualOpen(true);
    setNotice(null);
  }

  async function createManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || working || !form.job_order_id || !form.title.trim()) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;

    setWorking(true);
    setNotice(null);
    const idempotencyKey = `work-item:manual:${form.job_order_id}:${Date.now()}`;
    const result = await supabase.rpc("create_work_item", {
      p_job_order_id: form.job_order_id,
      p_title: form.title.trim(),
      p_description: form.description.trim() || null,
      p_quantity: form.quantity,
      p_unit: form.unit.trim() || "pcs",
      p_target_date: form.target_date || null,
      p_priority: form.priority,
      p_source_mockup_part_id: null,
      p_idempotency_key: idempotencyKey
    });
    setWorking(false);

    if (result.error) {
      setNotice({ type: "error", text: "Pekerjaan belum berhasil dibuat. Periksa data lalu coba lagi." });
      return;
    }

    setManualOpen(false);
    setNotice({ type: "success", text: "Pekerjaan manual berhasil dibuat." });
    await loadData();
  }

  async function generateFromJobOrder() {
    if (!canManage || working || !generateJobOrderId) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;

    setWorking(true);
    setNotice(null);
    const result = await supabase.rpc("generate_job_order_work_items", {
      p_job_order_id: generateJobOrderId
    });
    setWorking(false);

    if (result.error) {
      setNotice({ type: "error", text: "Pekerjaan otomatis belum berhasil dibuat. Coba lagi." });
      return;
    }

    const count = typeof result.data === "number" ? result.data : Number(result.data || 0);
    setGenerateOpen(false);
    setJobFilter(generateJobOrderId);
    router.replace(`/admin/work-items?job_order=${generateJobOrderId}`);
    setNotice({
      type: count > 0 ? "success" : "warning",
      text: count > 0 ? `${count} pekerjaan berhasil dibuat dari Surat Perintah Kerja.` : "Semua Surat Perintah Kerja sudah mempunyai daftar pekerjaan."
    });
    await loadData();
  }

  async function restoreRow(row: WorkItemRow) {
    if (!canManage || working) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setWorking(true);
    setNotice(null);
    const result = await supabase.rpc("restore_work_item", { p_work_item_id: row.id });
    setWorking(false);
    if (result.error) {
      setNotice({ type: "error", text: "Pekerjaan belum berhasil dipulihkan. Coba lagi." });
      return;
    }
    setNotice({ type: "success", text: `${row.work_item_number} berhasil dipulihkan.` });
    await loadData();
  }

  async function confirmPendingAction() {
    if (!pendingAction || working) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;

    if (pendingAction.type === "archive" && !archiveReason.trim()) {
      setNotice({ type: "error", text: "Alasan arsip wajib diisi." });
      return;
    }
    if (pendingAction.type === "delete" && deleteConfirmation !== pendingAction.row.work_item_number) {
      setNotice({ type: "error", text: "Ketik nomor pekerjaan secara tepat untuk konfirmasi." });
      return;
    }

    setWorking(true);
    setNotice(null);
    const result =
      pendingAction.type === "archive"
        ? await supabase.rpc("archive_work_item", {
            p_work_item_id: pendingAction.row.id,
            p_reason: archiveReason.trim()
          })
        : await supabase.rpc("permanently_delete_work_item", {
            p_work_item_id: pendingAction.row.id
          });
    setWorking(false);

    if (result.error) {
      setNotice({ type: "error", text: "Tindakan pada pekerjaan belum berhasil. Periksa status terbaru lalu coba lagi." });
      return;
    }

    const actionLabel = pendingAction.type === "archive" ? "dipindahkan ke Gudang Arsip" : "dihapus permanen";
    setNotice({ type: "success", text: `${pendingAction.row.work_item_number} berhasil ${actionLabel}.` });
    setPendingAction(null);
    setArchiveReason("");
    setDeleteConfirmation("");
    await loadData();
  }

  if (loading) return <AdminLoadingState label="Memuat daftar pekerjaan..." />;

  return (
    <main className="text-brand-charcoal">
      <div className="grid gap-6">
        <AdminPageHeader
          eyebrow="DEBRODER v1.2 · Phase 8"
          title="Daftar Pekerjaan Produksi"
          description="Bagi Surat Perintah Kerja menjadi pekerjaan yang dapat ditugaskan, diurutkan, disiapkan, dan ditelusuri."
          actions={
            canManage ? (
              <>
                <button
                  type="button"
                  onClick={() => setGenerateOpen(true)}
                  disabled={editableJobOrders.length === 0}
                  className="inline-flex min-h-10 items-center rounded-full border border-brand-softGray bg-white px-5 text-sm font-semibold disabled:opacity-45"
                >
                  Buat dari Job Order
                </button>
                <button
                  type="button"
                  onClick={() => openManual()}
                  disabled={editableJobOrders.length === 0}
                  className="inline-flex min-h-10 items-center rounded-full bg-brand-green px-5 text-sm font-semibold text-white disabled:opacity-45"
                >
                  Tambah Pekerjaan
                </button>
              </>
            ) : null
          }
        />

        {notice ? <AdminAlert type={notice.type}>{notice.text}</AdminAlert> : null}

        {!canView ? (
          <AdminAlert type="error">Akun ini tidak mempunyai akses ke pekerjaan operasional.</AdminAlert>
        ) : !canManage ? (
          <AdminAlert type="info">Mode operator: hanya pekerjaan yang ditugaskan kepada akun ini yang ditampilkan.</AdminAlert>
        ) : null}

        <section className="grid gap-4 border border-brand-softGray bg-white p-4 sm:p-5 lg:grid-cols-[1fr_280px]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari nomor, judul, status, Surat Perintah Kerja, atau penanggung jawab"
            className="min-h-11 rounded-lg border border-brand-softGray px-4 text-sm"
          />
          <select
            value={jobFilter}
            onChange={(event) => {
              const value = event.target.value;
              setJobFilter(value);
              router.replace(value ? `/admin/work-items?job_order=${value}` : "/admin/work-items");
            }}
            className="min-h-11 rounded-lg border border-brand-softGray px-4 text-sm"
          >
            <option value="">Semua Surat Perintah Kerja</option>
            {jobOrders.map((job) => (
              <option key={job.id} value={job.id}>
                {jobOrderLabel(job)}
              </option>
            ))}
          </select>
        </section>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab("active")}
            className={`rounded-full px-5 py-2.5 text-sm font-semibold ${tab === "active" ? "bg-brand-charcoal text-white" : "border border-brand-softGray bg-white"}`}
          >
            Pekerjaan Aktif
          </button>
          <button
            type="button"
            onClick={() => setTab("archive")}
            className={`rounded-full px-5 py-2.5 text-sm font-semibold ${tab === "archive" ? "bg-brand-charcoal text-white" : "border border-brand-softGray bg-white"}`}
          >
            Gudang Arsip
          </button>
        </div>

        {visibleRows.length === 0 ? (
          <AdminEmptyState
            title={tab === "archive" ? "Arsip pekerjaan masih kosong" : "Belum ada pekerjaan"}
            description={
              tab === "archive"
                ? "Pekerjaan yang diarsipkan akan tampil bersama tanggal, alasan, dan pelakunya."
                : editableJobOrders.length === 0
                  ? "Buat Surat Perintah Kerja yang masih Draft atau Siap Dirilis terlebih dahulu."
                  : "Gunakan Buat dari Surat Perintah Kerja untuk menghasilkan pekerjaan otomatis atau tambahkan pekerjaan manual."
            }
            action={
              tab === "active" && editableJobOrders.length > 0 && canManage ? (
                <button
                  type="button"
                  onClick={() => setGenerateOpen(true)}
                  className="rounded-full bg-brand-green px-6 py-3 text-sm font-semibold text-white"
                >
                  Buat Pekerjaan
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid gap-4">
            {visibleRows.map((row) => {
              const job = jobMap[row.job_order_id];
              return (
                <article key={row.id} className="grid gap-5 border border-brand-softGray bg-white p-5 sm:p-6 lg:grid-cols-[1fr_auto]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-brand-offWhite px-3 py-1 text-xs font-semibold">
                        {WORK_ITEM_STATUS_LABELS[row.status]}
                      </span>
                      <span className="rounded-full border border-brand-softGray px-3 py-1 text-xs font-semibold">
                        {WORK_ITEM_PRIORITY_LABELS[row.priority]}
                      </span>
                    </div>
                    <h2 className="mt-3 text-xl font-semibold">{row.work_item_number}</h2>
                    <p className="mt-1 text-base font-semibold">{row.title}</p>
                    <p className="mt-2 text-sm text-brand-charcoal/65">
                      {job ? jobOrderLabel(job) : "Surat Perintah Kerja tidak tersedia"}
                    </p>
                    <div className="mt-4 grid gap-2 text-sm text-brand-charcoal/65 sm:grid-cols-2 xl:grid-cols-4">
                      <span>Jumlah: {row.quantity} {row.unit}</span>
                      <span>Target: {formatWorkItemTarget(row.target_date)}</span>
                      <span>PIC: {row.assigned_to ? actors[row.assigned_to] || "Akun tidak tersedia" : "Belum ditugaskan"}</span>
                      <span>Dibuat: {formatWorkItemDate(row.created_at)}</span>
                    </div>
                    {row.archived_at ? (
                      <div className="mt-4 border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                        Diarsipkan {formatWorkItemDate(row.archived_at)} oleh {row.archived_by ? actors[row.archived_by] || "Akun tidak tersedia" : "Sistem"}
                        {row.archive_reason ? ` · ${row.archive_reason}` : ""}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap content-start gap-2 lg:max-w-64 lg:justify-end">
                    <Link
                      href={`/admin/work-items/${row.id}`}
                      className="inline-flex min-h-10 items-center rounded-full border border-brand-softGray px-4 text-sm font-semibold"
                    >
                      Lihat Detail
                    </Link>
                    {!row.archived_at && canManage && canArchiveWorkItem(row.status) ? (
                      <button
                        type="button"
                        onClick={() => {
                          setPendingAction({ type: "archive", row });
                          setArchiveReason("");
                        }}
                        className="min-h-10 rounded-full border border-amber-300 px-4 text-sm font-semibold text-amber-800"
                      >
                        Arsipkan
                      </button>
                    ) : null}
                    {row.archived_at && canManage ? (
                      <button
                        type="button"
                        onClick={() => void restoreRow(row)}
                        disabled={working}
                        className="min-h-10 rounded-full border border-brand-green px-4 text-sm font-semibold text-brand-green disabled:opacity-45"
                      >
                        Pulihkan
                      </button>
                    ) : null}
                    {row.archived_at && canDelete ? (
                      <button
                        type="button"
                        onClick={() => {
                          setPendingAction({ type: "delete", row });
                          setDeleteConfirmation("");
                        }}
                        className="min-h-10 rounded-full border border-red-300 px-4 text-sm font-semibold text-red-700"
                      >
                        Hapus Permanen
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {manualOpen ? (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/60 p-4 sm:p-8">
          <form onSubmit={createManual} className="mx-auto max-w-2xl bg-white p-6 shadow-2xl sm:p-8">
            <h2 className="text-2xl font-semibold">Tambah Pekerjaan Manual</h2>
            <p className="mt-2 text-sm leading-6 text-brand-charcoal/60">
              Gunakan untuk pekerjaan tambahan yang tidak berasal langsung dari produk atau layanan pesanan.
            </p>

            <label className="mt-6 block text-sm font-semibold">
              Job Order
              <select
                required
                value={form.job_order_id}
                onChange={(event) => {
                  const job = jobMap[event.target.value];
                  setForm((current) => ({
                    ...current,
                    job_order_id: event.target.value,
                    target_date: job?.target_date || current.target_date,
                    priority: job?.priority || current.priority
                  }));
                }}
                className="mt-2 min-h-11 w-full rounded-lg border border-brand-softGray px-4"
              >
                <option value="">Pilih Surat Perintah Kerja</option>
                {editableJobOrders.map((job) => (
                  <option key={job.id} value={job.id}>{jobOrderLabel(job)}</option>
                ))}
              </select>
            </label>

            <label className="mt-4 block text-sm font-semibold">
              Judul pekerjaan
              <input
                required
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                className="mt-2 min-h-11 w-full rounded-lg border border-brand-softGray px-4"
              />
            </label>

            <label className="mt-4 block text-sm font-semibold">
              Instruksi pekerjaan
              <textarea
                rows={4}
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                className="mt-2 w-full rounded-lg border border-brand-softGray px-4 py-3"
              />
            </label>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold">
                Jumlah
                <input
                  required
                  min={1}
                  type="number"
                  value={form.quantity}
                  onChange={(event) => setForm((current) => ({ ...current, quantity: Number(event.target.value) }))}
                  className="mt-2 min-h-11 w-full rounded-lg border border-brand-softGray px-4"
                />
              </label>
              <label className="block text-sm font-semibold">
                Satuan
                <input
                  required
                  value={form.unit}
                  onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))}
                  className="mt-2 min-h-11 w-full rounded-lg border border-brand-softGray px-4"
                />
              </label>
              <label className="block text-sm font-semibold">
                Target
                <input
                  type="date"
                  value={form.target_date}
                  onChange={(event) => setForm((current) => ({ ...current, target_date: event.target.value }))}
                  className="mt-2 min-h-11 w-full rounded-lg border border-brand-softGray px-4"
                />
              </label>
              <label className="block text-sm font-semibold">
                Prioritas
                <select
                  value={form.priority}
                  onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as WorkItemPriority }))}
                  className="mt-2 min-h-11 w-full rounded-lg border border-brand-softGray px-4"
                >
                  {Object.entries(WORK_ITEM_PRIORITY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <button type="submit" disabled={working} className="rounded-full bg-brand-green px-6 py-3 text-sm font-semibold text-white disabled:opacity-45">
                {working ? "Menyimpan..." : "Simpan Pekerjaan"}
              </button>
              <button type="button" onClick={() => setManualOpen(false)} disabled={working} className="rounded-full border border-brand-softGray px-6 py-3 text-sm font-semibold">
                Batal
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {generateOpen ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4">
          <section className="w-full max-w-xl bg-white p-6 shadow-2xl sm:p-8">
            <h2 className="text-2xl font-semibold">Buat Pekerjaan dari Surat Perintah Kerja</h2>
            <p className="mt-2 text-sm leading-6 text-brand-charcoal/60">
              Sistem membuat pekerjaan dari setiap produk dan layanan. Proses aman dijalankan ulang karena sumber yang sama tidak diduplikasi.
            </p>
            <select
              value={generateJobOrderId}
              onChange={(event) => setGenerateJobOrderId(event.target.value)}
              className="mt-6 min-h-11 w-full rounded-lg border border-brand-softGray px-4"
            >
              <option value="">Pilih Surat Perintah Kerja</option>
              {editableJobOrders.map((job) => (
                <option key={job.id} value={job.id}>{jobOrderLabel(job)}</option>
              ))}
            </select>
            <div className="mt-7 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void generateFromJobOrder()}
                disabled={working || !generateJobOrderId}
                className="rounded-full bg-brand-green px-6 py-3 text-sm font-semibold text-white disabled:opacity-45"
              >
                {working ? "Membuat..." : "Buat Sekarang"}
              </button>
              <button type="button" onClick={() => setGenerateOpen(false)} disabled={working} className="rounded-full border border-brand-softGray px-6 py-3 text-sm font-semibold">
                Batal
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {pendingAction ? (
        <div className="fixed inset-0 z-[110] grid place-items-center bg-black/60 p-4">
          <section className="w-full max-w-lg bg-white p-6 shadow-2xl sm:p-8">
            <h2 className="text-2xl font-semibold">
              {pendingAction.type === "archive" ? "Arsipkan Pekerjaan?" : "Hapus Pekerjaan Secara Permanen?"}
            </h2>
            <p className="mt-3 text-sm leading-6 text-brand-charcoal/65">
              {pendingAction.type === "archive"
                ? "Pekerjaan dapat dipulihkan dari arsip selama Surat Perintah Kerja induknya masih dapat diedit."
                : "Tindakan ini hanya tersedia bagi Super Admin, tidak dapat dibatalkan, dan akan dicatat dalam audit penghapusan."}
            </p>
            {pendingAction.type === "archive" ? (
              <textarea
                rows={4}
                value={archiveReason}
                onChange={(event) => setArchiveReason(event.target.value)}
                placeholder="Alasan arsip wajib diisi"
                className="mt-5 w-full rounded-lg border border-brand-softGray px-4 py-3"
              />
            ) : (
              <label className="mt-5 block text-sm font-semibold">
                Ketik <strong>{pendingAction.row.work_item_number}</strong>
                <input
                  value={deleteConfirmation}
                  onChange={(event) => setDeleteConfirmation(event.target.value)}
                  className="mt-2 min-h-11 w-full rounded-lg border border-red-300 px-4"
                />
              </label>
            )}
            <div className="mt-7 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void confirmPendingAction()}
                disabled={working}
                className={`rounded-full px-6 py-3 text-sm font-semibold text-white disabled:opacity-45 ${pendingAction.type === "delete" ? "bg-red-700" : "bg-amber-700"}`}
              >
                {working ? "Memproses..." : pendingAction.type === "archive" ? "Arsipkan" : "Hapus Permanen"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPendingAction(null);
                  setArchiveReason("");
                  setDeleteConfirmation("");
                }}
                disabled={working}
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
