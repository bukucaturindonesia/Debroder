"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";
import { AdminAlert, AdminEmptyState, AdminLoadingState } from "@/components/admin/ui/AdminFeedback";
import {
  QC_RESULT_LABELS,
  QC_WORKFLOW_LABELS,
  formatQcDate,
  isQcRole,
  isQcSuperAdmin,
  type QcFileRow,
  type QcRecordRow
} from "@/lib/quality-control";
import {
  WORK_ITEM_STATUS_LABELS,
  type WorkItemRow
} from "@/lib/work-items";
import type { JobOrderRow } from "@/lib/job-orders";

type Tab = "queue" | "records" | "archive";

type ProfileRow = {
  id: string;
  email: string | null;
  role: string | null;
};

type CreateForm = {
  work_item_id: string;
  checked_quantity: number;
  defect_notes: string;
};

type DeleteTarget = {
  record: QcRecordRow;
  confirmation: string;
};

const EMPTY_CREATE: CreateForm = {
  work_item_id: "",
  checked_quantity: 1,
  defect_notes: ""
};

function objectValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function QualityControlAdmin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedWorkItem = searchParams.get("work_item") || "";

  const [tab, setTab] = useState<Tab>("queue");
  const [records, setRecords] = useState<QcRecordRow[]>([]);
  const [workItems, setWorkItems] = useState<WorkItemRow[]>([]);
  const [jobOrders, setJobOrders] = useState<JobOrderRow[]>([]);
  const [files, setFiles] = useState<QcFileRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState<{ type: "success" | "error" | "warning"; text: string } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>({ ...EMPTY_CREATE });
  const [restoreTarget, setRestoreTarget] = useState<QcRecordRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const canManage = isQcRole(role);
  const canDelete = isQcSuperAdmin(role);

  const loadData = useCallback(async () => {
    const supabase = createSupabaseClient();
    if (!supabase) {
      setLoading(false);
      setNotice({ type: "error", text: "Supabase belum dikonfigurasi." });
      return;
    }

    setLoading(true);
    setNotice(null);
    const sessionResult = await supabase.auth.getSession();
    const userId = sessionResult.data.session?.user.id;

    const [profileResult, recordsResult, workItemsResult, jobOrdersResult, filesResult, profilesResult] = await Promise.all([
      userId
        ? supabase.from("profiles").select("role").eq("id", userId).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from("qc_records")
        .select("id,qc_number,job_order_id,work_item_id,attempt_number,checked_quantity,passed_quantity,failed_quantity,result,status,defect_notes,inspector_id,inspection_started_at,inspected_at,approved_by,approved_at,created_by,updated_by,created_at,updated_at,archived_at,archived_by,archive_reason")
        .order("created_at", { ascending: false }),
      supabase
        .from("work_items")
        .select("id,work_item_number,job_order_id,source_order_item_id,source_order_item_service_id,source_mockup_part_id,title,description,quantity,unit,assigned_to,target_date,priority,status,instruction_snapshot,approved_design_snapshot,ready_by,ready_at,started_at,paused_at,resumed_at,completed_at,cancelled_at,cancel_reason,created_by,updated_by,created_at,updated_at,archived_at,archived_by,archive_reason")
        .order("created_at", { ascending: false }),
      supabase
        .from("job_orders")
        .select("id,job_order_number,order_id,quotation_id,approved_mockup_set_id,status,priority,target_date,internal_notes,production_notes,order_snapshot,mockup_snapshot,payment_snapshot,progress_percentage,ready_by,ready_at,released_by,released_at,started_at,paused_at,resumed_at,completed_at,cancelled_at,cancel_reason,created_by,updated_by,created_at,updated_at,archived_at,archived_by,archive_reason")
        .order("created_at", { ascending: false }),
      supabase
        .from("qc_files")
        .select("id,qc_record_id,bucket,path,file_name,mime_type,size_bytes,uploaded_by,uploaded_at"),
      supabase.from("profiles").select("id,email,role")
    ]);

    setLoading(false);
    const firstError = recordsResult.error || workItemsResult.error || jobOrdersResult.error || filesResult.error;
    if (firstError) {
      setNotice({ type: "error", text: `Quality Control belum dapat dimuat: ${firstError.message}` });
      return;
    }

    setRole(typeof profileResult.data?.role === "string" ? profileResult.data.role : null);
    setRecords((recordsResult.data || []) as QcRecordRow[]);
    setWorkItems((workItemsResult.data || []) as WorkItemRow[]);
    setJobOrders((jobOrdersResult.data || []) as JobOrderRow[]);
    setFiles((filesResult.data || []) as QcFileRow[]);
    setProfiles((profilesResult.data || []) as ProfileRow[]);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const workItemMap = useMemo(() => {
    const map: Record<string, WorkItemRow> = {};
    for (const row of workItems) map[row.id] = row;
    return map;
  }, [workItems]);

  const jobOrderMap = useMemo(() => {
    const map: Record<string, JobOrderRow> = {};
    for (const row of jobOrders) map[row.id] = row;
    return map;
  }, [jobOrders]);

  const actorMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const profile of profiles) map[profile.id] = profile.email?.trim() || "Akun tanpa email";
    return map;
  }, [profiles]);

  const fileMap = useMemo(() => {
    const map: Record<string, QcFileRow[]> = {};
    for (const file of files) {
      map[file.qc_record_id] = [...(map[file.qc_record_id] || []), file];
    }
    return map;
  }, [files]);

  const activePendingByWorkItem = useMemo(() => {
    const map: Record<string, QcRecordRow> = {};
    for (const record of records) {
      if (!record.archived_at && record.result === "pending") map[record.work_item_id] = record;
    }
    return map;
  }, [records]);

  const normalizedSearch = search.trim().toLowerCase();
  const queue = useMemo(() => {
    return workItems.filter((item) => {
      if (item.archived_at || item.status !== "awaiting_qc") return false;
      if (!normalizedSearch) return true;
      const job = jobOrderMap[item.job_order_id];
      const sourceOrder = objectValue(job?.order_snapshot).order;
      const sourceOrderObject = objectValue(sourceOrder);
      return [
        item.work_item_number,
        item.title,
        job?.job_order_number || "",
        String(sourceOrderObject.customer_name || ""),
        String(sourceOrderObject.order_number || "")
      ].some((value) => value.toLowerCase().includes(normalizedSearch));
    });
  }, [jobOrderMap, normalizedSearch, workItems]);

  const visibleRecords = useMemo(() => {
    const archived = tab === "archive";
    return records.filter((record) => {
      if (Boolean(record.archived_at) !== archived) return false;
      if (!normalizedSearch) return true;
      const item = workItemMap[record.work_item_id];
      const job = jobOrderMap[record.job_order_id];
      return [
        record.qc_number,
        item?.work_item_number || "",
        item?.title || "",
        job?.job_order_number || "",
        QC_RESULT_LABELS[record.result],
        QC_WORKFLOW_LABELS[record.status]
      ].some((value) => value.toLowerCase().includes(normalizedSearch));
    });
  }, [jobOrderMap, normalizedSearch, records, tab, workItemMap]);

  useEffect(() => {
    if (!requestedWorkItem || loading || createOpen) return;
    const item = workItemMap[requestedWorkItem];
    if (!item || item.status !== "awaiting_qc" || item.archived_at) return;
    const active = activePendingByWorkItem[item.id];
    if (active) {
      router.replace(`/admin/quality-control/${active.id}`);
      return;
    }
    setCreateForm({ work_item_id: item.id, checked_quantity: item.quantity, defect_notes: "" });
    setCreateOpen(true);
  }, [activePendingByWorkItem, createOpen, loading, requestedWorkItem, router, workItemMap]);

  function openCreate(item: WorkItemRow) {
    const active = activePendingByWorkItem[item.id];
    if (active) {
      router.push(`/admin/quality-control/${active.id}`);
      return;
    }
    setCreateForm({ work_item_id: item.id, checked_quantity: item.quantity, defect_notes: "" });
    setCreateOpen(true);
    setNotice(null);
  }

  async function createQc(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || working || !createForm.work_item_id) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setWorking(true);
    setNotice(null);
    const result = await supabase.rpc("create_qc_record", {
      p_work_item_id: createForm.work_item_id,
      p_checked_quantity: createForm.checked_quantity,
      p_checklist: [],
      p_defect_notes: createForm.defect_notes.trim() || null
    });
    setWorking(false);
    if (result.error) {
      setNotice({ type: "error", text: result.error.message || "Draft QC gagal dibuat." });
      return;
    }
    const id = typeof result.data?.id === "string" ? result.data.id : null;
    setCreateOpen(false);
    setCreateForm({ ...EMPTY_CREATE });
    if (id) router.push(`/admin/quality-control/${id}`);
    else await loadData();
  }

  async function restoreRecord(record: QcRecordRow) {
    if (!canManage || working) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setWorking(true);
    setNotice(null);
    const result = await supabase.rpc("restore_qc_record", { p_qc_record_id: record.id });
    setWorking(false);
    if (result.error) {
      setNotice({ type: "error", text: result.error.message || "Draft QC gagal dipulihkan." });
      return;
    }
    setRestoreTarget(null);
    setNotice({ type: "success", text: "Draft QC berhasil dipulihkan." });
    await loadData();
  }

  async function permanentlyDelete() {
    if (!deleteTarget || !canDelete || working) return;
    const expected = `HAPUS ${deleteTarget.record.qc_number}`;
    if (deleteTarget.confirmation !== expected) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setWorking(true);
    setNotice(null);

    const recordFiles = fileMap[deleteTarget.record.id] || [];
    if (recordFiles.length > 0) {
      const removeResult = await supabase.storage.from("qc-proofs").remove(recordFiles.map((file) => file.path));
      if (removeResult.error) {
        setWorking(false);
        setNotice({ type: "error", text: `File bukti belum dapat dibersihkan: ${removeResult.error.message}` });
        return;
      }
    }

    const result = await supabase.rpc("permanently_delete_qc_record", {
      p_qc_record_id: deleteTarget.record.id
    });
    setWorking(false);
    if (result.error) {
      setNotice({ type: "error", text: result.error.message || "QC gagal dihapus permanen." });
      return;
    }
    setDeleteTarget(null);
    setNotice({ type: "success", text: "Draft QC berhasil dihapus permanen dan dicatat pada audit." });
    await loadData();
  }

  if (loading) return <AdminLoadingState label="Memuat Quality Control..." />;

  return (
    <main className="text-brand-charcoal">
      <div className="grid gap-6">
        <AdminPageHeader
          eyebrow="DEBRODER v1.2 · Phase 10"
          title="Quality Control"
          description="Periksa hasil produksi, simpan checklist dan bukti, lalu putuskan lulus atau kembali ke perbaikan."
          actions={
            <Link href="/admin/production" className="inline-flex min-h-10 items-center rounded-full border border-brand-softGray bg-white px-5 text-sm font-semibold">
              Status Produksi
            </Link>
          }
        />

        {notice ? <AdminAlert type={notice.type}>{notice.text}</AdminAlert> : null}
        {!canManage ? <AdminAlert type="error">Akun ini tidak mempunyai akses Quality Control.</AdminAlert> : null}

        <section className="border border-brand-softGray bg-white p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {([
                ["queue", `Menunggu QC (${queue.length})`],
                ["records", `Pemeriksaan (${records.filter((row) => !row.archived_at).length})`],
                ["archive", `Gudang Arsip (${records.filter((row) => row.archived_at).length})`]
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
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nomor QC, Work Item, atau Job Order"
              className="min-h-11 w-full rounded-lg border border-brand-softGray px-4 text-sm lg:max-w-md"
            />
          </div>
        </section>

        {tab === "queue" ? (
          queue.length === 0 ? (
            <AdminEmptyState title="Belum ada Work Item menunggu QC" description="Work Item akan muncul setelah produksi mengirimkannya ke tahap Menunggu QC." />
          ) : (
            <section className="grid gap-4">
              {queue.map((item) => {
                const job = jobOrderMap[item.job_order_id];
                const active = activePendingByWorkItem[item.id];
                return (
                  <article key={item.id} className="border border-brand-softGray bg-white p-5 sm:p-6">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-charcoal/50">{job?.job_order_number || "Job Order"}</p>
                        <h2 className="mt-2 text-xl font-semibold">{item.work_item_number} · {item.title}</h2>
                        <p className="mt-2 text-sm text-brand-charcoal/60">{item.quantity} {item.unit} · {WORK_ITEM_STATUS_LABELS[item.status]}</p>
                        {active ? <p className="mt-3 text-sm font-semibold text-amber-700">Draft aktif: {active.qc_number}</p> : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/admin/work-items/${item.id}`} className="inline-flex min-h-10 items-center rounded-full border border-brand-softGray px-5 text-sm font-semibold">Detail Work Item</Link>
                        <button
                          type="button"
                          onClick={() => openCreate(item)}
                          disabled={!canManage || working}
                          className="inline-flex min-h-10 items-center rounded-full bg-brand-green px-5 text-sm font-semibold text-white disabled:opacity-45"
                        >
                          {active ? "Buka Pemeriksaan" : "Mulai QC"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          )
        ) : visibleRecords.length === 0 ? (
          <AdminEmptyState
            title={tab === "archive" ? "Gudang Arsip QC masih kosong" : "Belum ada pemeriksaan QC"}
            description={tab === "archive" ? "Draft QC yang diarsipkan akan tersimpan di sini." : "Mulai pemeriksaan dari tab Menunggu QC."}
          />
        ) : (
          <section className="grid gap-4">
            {visibleRecords.map((record) => {
              const item = workItemMap[record.work_item_id];
              const job = jobOrderMap[record.job_order_id];
              const archivedBy = record.archived_by ? actorMap[record.archived_by] || "Akun tidak tersedia" : "Sistem";
              return (
                <article key={record.id} className="border border-brand-softGray bg-white p-5 sm:p-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-charcoal/50">Percobaan #{record.attempt_number} · {job?.job_order_number || "Job Order"}</p>
                      <h2 className="mt-2 text-xl font-semibold">{record.qc_number}</h2>
                      <p className="mt-2 text-sm text-brand-charcoal/65">{item?.work_item_number || "Work Item"} · {item?.title || "Pekerjaan tidak tersedia"}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                        <span className="rounded-full bg-brand-offWhite px-3 py-1.5">{QC_WORKFLOW_LABELS[record.status]}</span>
                        <span className="rounded-full bg-brand-offWhite px-3 py-1.5">{QC_RESULT_LABELS[record.result]}</span>
                        <span className="rounded-full bg-brand-offWhite px-3 py-1.5">{record.checked_quantity} diperiksa</span>
                      </div>
                      {record.archived_at ? (
                        <p className="mt-3 text-sm text-amber-800">Diarsipkan {formatQcDate(record.archived_at)} oleh {archivedBy}{record.archive_reason ? ` · ${record.archive_reason}` : ""}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/admin/quality-control/${record.id}`} className="inline-flex min-h-10 items-center rounded-full border border-brand-softGray px-5 text-sm font-semibold">Lihat Detail</Link>
                      {record.archived_at && canManage ? (
                        <button type="button" onClick={() => setRestoreTarget(record)} className="inline-flex min-h-10 items-center rounded-full border border-brand-green px-5 text-sm font-semibold text-brand-green">Pulihkan</button>
                      ) : null}
                      {record.archived_at && canDelete ? (
                        <button type="button" onClick={() => setDeleteTarget({ record, confirmation: "" })} className="inline-flex min-h-10 items-center rounded-full border border-red-300 px-5 text-sm font-semibold text-red-700">Hapus Permanen</button>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>

      {createOpen ? (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/60 p-4 sm:p-8">
          <form onSubmit={createQc} className="mx-auto max-w-xl bg-white p-6 shadow-2xl sm:p-8">
            <h2 className="text-2xl font-semibold">Buat Draft Quality Control</h2>
            <p className="mt-2 text-sm leading-6 text-brand-charcoal/60">Checklist standar akan dibuat otomatis dan dapat diperbarui pada halaman detail.</p>
            <label className="mt-5 block text-sm font-semibold">
              Jumlah yang diperiksa
              <input type="number" min={1} value={createForm.checked_quantity} onChange={(event) => setCreateForm((current) => ({ ...current, checked_quantity: Number(event.target.value) || 1 }))} className="mt-2 min-h-11 w-full rounded-lg border border-brand-softGray px-4" />
            </label>
            <label className="mt-4 block text-sm font-semibold">
              Catatan awal
              <textarea rows={4} value={createForm.defect_notes} onChange={(event) => setCreateForm((current) => ({ ...current, defect_notes: event.target.value }))} className="mt-2 w-full rounded-lg border border-brand-softGray px-4 py-3" />
            </label>
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="submit" disabled={working || !canManage} className="rounded-full bg-brand-green px-6 py-3 text-sm font-semibold text-white disabled:opacity-45">{working ? "Membuat..." : "Buat Draft QC"}</button>
              <button type="button" onClick={() => setCreateOpen(false)} disabled={working} className="rounded-full border border-brand-softGray px-6 py-3 text-sm font-semibold">Batal</button>
            </div>
          </form>
        </div>
      ) : null}

      {restoreTarget ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4">
          <section className="w-full max-w-lg bg-white p-6 shadow-2xl">
            <h2 className="text-2xl font-semibold">Pulihkan {restoreTarget.qc_number}?</h2>
            <p className="mt-3 text-sm leading-6 text-brand-charcoal/65">Draft QC akan kembali ke daftar pemeriksaan aktif.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={() => void restoreRecord(restoreTarget)} disabled={working} className="rounded-full bg-brand-green px-6 py-3 text-sm font-semibold text-white disabled:opacity-45">Pulihkan</button>
              <button type="button" onClick={() => setRestoreTarget(null)} disabled={working} className="rounded-full border border-brand-softGray px-6 py-3 text-sm font-semibold">Batal</button>
            </div>
          </section>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4">
          <section className="w-full max-w-lg bg-white p-6 shadow-2xl">
            <h2 className="text-2xl font-semibold text-red-700">Hapus Permanen?</h2>
            <p className="mt-3 text-sm leading-6 text-brand-charcoal/65">File bukti akan dibersihkan dan audit penghapusan tetap disimpan. Ketik <strong>HAPUS {deleteTarget.record.qc_number}</strong>.</p>
            <input value={deleteTarget.confirmation} onChange={(event) => setDeleteTarget((current) => current ? { ...current, confirmation: event.target.value } : current)} className="mt-5 min-h-11 w-full rounded-lg border border-red-300 px-4" />
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={() => void permanentlyDelete()} disabled={working || deleteTarget.confirmation !== `HAPUS ${deleteTarget.record.qc_number}`} className="rounded-full bg-red-700 px-6 py-3 text-sm font-semibold text-white disabled:opacity-45">Hapus Permanen</button>
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={working} className="rounded-full border border-brand-softGray px-6 py-3 text-sm font-semibold">Batal</button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
