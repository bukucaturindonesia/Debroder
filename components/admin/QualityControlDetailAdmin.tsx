"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";
import { AdminAlert, AdminErrorState, AdminLoadingState } from "@/components/admin/ui/AdminFeedback";
import {
  QC_CHECKLIST_LABELS,
  QC_RESULT_LABELS,
  QC_WORKFLOW_LABELS,
  canArchiveQc,
  canEditQc,
  formatQcDate,
  formatQcFileSize,
  isQcRole,
  isQcSuperAdmin,
  safeQcFileName,
  type QcChecklistResult,
  type QcChecklistRow,
  type QcFileRow,
  type QcRecordRow,
  type QcResult
} from "@/lib/quality-control";
import {
  WORK_ITEM_STATUS_LABELS,
  formatWorkItemTarget,
  type WorkItemRow
} from "@/lib/work-items";
import type { JobOrderRow } from "@/lib/job-orders";

type ProfileRow = {
  id: string;
  email: string | null;
  role: string | null;
};

type HistoryRow = {
  id: string;
  from_result: string | null;
  to_result: string;
  note: string | null;
  changed_by: string | null;
  changed_at: string;
};

type RevisionRow = {
  id: string;
  revision_number: number;
  reason: string;
  created_by: string | null;
  created_at: string;
};

type ChecklistDraft = {
  id: string;
  template_id: string | null;
  code: string;
  label: string;
  result: QcChecklistResult;
  note: string;
  sort_order: number;
};

type FinalizeForm = {
  result: Exclude<QcResult, "pending">;
  passed_quantity: number;
  failed_quantity: number;
  note: string;
};

function historyLabel(value: string | null) {
  if (!value) return "Mulai";
  if (value in QC_RESULT_LABELS) return QC_RESULT_LABELS[value as QcResult];
  if (value in QC_WORKFLOW_LABELS) return QC_WORKFLOW_LABELS[value as keyof typeof QC_WORKFLOW_LABELS];
  return {
    archived: "Diarsipkan",
    restored: "Dipulihkan"
  }[value] || value;
}

export function QualityControlDetailAdmin() {
  const params = useParams<{ id?: string | string[] }>();
  const router = useRouter();
  const qcId = useMemo(() => {
    const raw = params?.id;
    return Array.isArray(raw) ? raw[0] : raw || "";
  }, [params]);

  const [record, setRecord] = useState<QcRecordRow | null>(null);
  const [workItem, setWorkItem] = useState<WorkItemRow | null>(null);
  const [jobOrder, setJobOrder] = useState<JobOrderRow | null>(null);
  const [checklist, setChecklist] = useState<QcChecklistRow[]>([]);
  const [files, setFiles] = useState<QcFileRow[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [revisions, setRevisions] = useState<RevisionRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error" | "warning"; text: string } | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [checkedQuantity, setCheckedQuantity] = useState(1);
  const [defectNotes, setDefectNotes] = useState("");
  const [editReason, setEditReason] = useState("");
  const [checklistDraft, setChecklistDraft] = useState<ChecklistDraft[]>([]);
  const [beginOpen, setBeginOpen] = useState(false);
  const [beginNote, setBeginNote] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [finalizeForm, setFinalizeForm] = useState<FinalizeForm>({ result: "passed", passed_quantity: 1, failed_quantity: 0, note: "" });
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const canManage = isQcRole(role);
  const canDelete = isQcSuperAdmin(role);

  const loadData = useCallback(async () => {
    const supabase = createSupabaseClient();
    if (!supabase || !qcId) return;
    setLoading(true);
    setNotice(null);

    const sessionResult = await supabase.auth.getSession();
    const userId = sessionResult.data.session?.user.id;
    const recordResult = await supabase
      .from("qc_records")
      .select("id,qc_number,job_order_id,work_item_id,attempt_number,checked_quantity,passed_quantity,failed_quantity,result,status,defect_notes,inspector_id,inspection_started_at,inspected_at,approved_by,approved_at,created_by,updated_by,created_at,updated_at,archived_at,archived_by,archive_reason")
      .eq("id", qcId)
      .maybeSingle();

    if (recordResult.error || !recordResult.data) {
      setLoading(false);
      setRecord(null);
      return;
    }

    const nextRecord = recordResult.data as QcRecordRow;
    const [profileResult, workItemResult, jobOrderResult, checklistResult, filesResult, historyResult, revisionsResult, profilesResult] = await Promise.all([
      userId
        ? supabase.from("profiles").select("role").eq("id", userId).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from("work_items")
        .select("id,work_item_number,job_order_id,source_order_item_id,source_order_item_service_id,source_mockup_part_id,title,description,quantity,unit,assigned_to,target_date,priority,status,instruction_snapshot,approved_design_snapshot,ready_by,ready_at,started_at,paused_at,resumed_at,completed_at,cancelled_at,cancel_reason,created_by,updated_by,created_at,updated_at,archived_at,archived_by,archive_reason")
        .eq("id", nextRecord.work_item_id)
        .maybeSingle(),
      supabase
        .from("job_orders")
        .select("id,job_order_number,order_id,quotation_id,approved_mockup_set_id,status,priority,target_date,internal_notes,production_notes,order_snapshot,mockup_snapshot,payment_snapshot,progress_percentage,ready_by,ready_at,released_by,released_at,started_at,paused_at,resumed_at,completed_at,cancelled_at,cancel_reason,created_by,updated_by,created_at,updated_at,archived_at,archived_by,archive_reason")
        .eq("id", nextRecord.job_order_id)
        .maybeSingle(),
      supabase
        .from("qc_checklist_results")
        .select("id,qc_record_id,template_id,code,label,result,note,sort_order")
        .eq("qc_record_id", nextRecord.id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("qc_files")
        .select("id,qc_record_id,bucket,path,file_name,mime_type,size_bytes,uploaded_by,uploaded_at")
        .eq("qc_record_id", nextRecord.id)
        .order("uploaded_at", { ascending: false }),
      supabase
        .from("qc_status_history")
        .select("id,from_result,to_result,note,changed_by,changed_at")
        .eq("qc_record_id", nextRecord.id)
        .order("changed_at", { ascending: false }),
      supabase
        .from("qc_record_revisions")
        .select("id,revision_number,reason,created_by,created_at")
        .eq("qc_record_id", nextRecord.id)
        .order("revision_number", { ascending: false }),
      supabase.from("profiles").select("id,email,role")
    ]);

    setLoading(false);
    const firstError = workItemResult.error || jobOrderResult.error || checklistResult.error || filesResult.error || historyResult.error || revisionsResult.error;
    if (firstError) setNotice({ type: "error", text: `Sebagian detail QC gagal dimuat: ${firstError.message}` });

    const nextChecklist = (checklistResult.data || []) as QcChecklistRow[];
    setRole(typeof profileResult.data?.role === "string" ? profileResult.data.role : null);
    setRecord(nextRecord);
    setWorkItem((workItemResult.data || null) as WorkItemRow | null);
    setJobOrder((jobOrderResult.data || null) as JobOrderRow | null);
    setChecklist(nextChecklist);
    setFiles((filesResult.data || []) as QcFileRow[]);
    setHistory((historyResult.data || []) as HistoryRow[]);
    setRevisions((revisionsResult.data || []) as RevisionRow[]);
    setProfiles((profilesResult.data || []) as ProfileRow[]);
    setCheckedQuantity(nextRecord.checked_quantity);
    setDefectNotes(nextRecord.defect_notes || "");
    setEditReason("");
    setChecklistDraft(nextChecklist.map((row) => ({
      id: row.id,
      template_id: row.template_id,
      code: row.code,
      label: row.label,
      result: row.result,
      note: row.note || "",
      sort_order: row.sort_order
    })));
    setFinalizeForm({
      result: nextRecord.result === "pending" ? "passed" : (nextRecord.result as Exclude<QcResult, "pending">),
      passed_quantity: nextRecord.result === "pending" ? nextRecord.checked_quantity : nextRecord.passed_quantity,
      failed_quantity: nextRecord.result === "pending" ? 0 : nextRecord.failed_quantity,
      note: nextRecord.defect_notes || ""
    });
  }, [qcId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const actorMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const profile of profiles) map[profile.id] = profile.email?.trim() || "Akun tanpa email";
    return map;
  }, [profiles]);

  function actorLabel(id: string | null) {
    if (!id) return "Sistem";
    return actorMap[id] || "Akun tidak tersedia";
  }

  async function saveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!record || !canManage || working || !canEditQc(record)) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setWorking(true);
    setNotice(null);
    const result = await supabase.rpc("update_qc_record_draft", {
      p_qc_record_id: record.id,
      p_checked_quantity: checkedQuantity,
      p_checklist: checklistDraft.map((row) => ({
        template_id: row.template_id,
        code: row.code,
        label: row.label,
        result: row.result,
        note: row.note || null,
        sort_order: row.sort_order
      })),
      p_defect_notes: defectNotes.trim() || null,
      p_reason: editReason.trim() || null
    });
    setWorking(false);
    if (result.error) {
      setNotice({ type: "error", text: result.error.message || "Draft QC gagal disimpan." });
      return;
    }
    setEditOpen(false);
    setNotice({ type: "success", text: "Draft QC dan checklist berhasil disimpan." });
    await loadData();
  }

  async function beginInspection() {
    if (!record || !canManage || working) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setWorking(true);
    setNotice(null);
    const result = await supabase.rpc("begin_qc_record", {
      p_qc_record_id: record.id,
      p_note: beginNote.trim() || null
    });
    setWorking(false);
    if (result.error) {
      setNotice({ type: "error", text: result.error.message || "Pemeriksaan QC gagal dimulai." });
      return;
    }
    setBeginOpen(false);
    setBeginNote("");
    setNotice({ type: "success", text: "Pemeriksaan QC sudah dimulai." });
    await loadData();
  }

  async function uploadProof() {
    if (!record || !uploadFile || !canManage || working || !canEditQc(record)) return;
    if (!["image/png", "image/jpeg", "image/webp", "application/pdf"].includes(uploadFile.type)) {
      setNotice({ type: "error", text: "Bukti hanya mendukung PNG, JPG, WEBP, atau PDF." });
      return;
    }
    if (uploadFile.size <= 0 || uploadFile.size > 10 * 1024 * 1024) {
      setNotice({ type: "error", text: "Ukuran bukti maksimal 10 MB." });
      return;
    }
    const supabase = createSupabaseClient();
    if (!supabase) return;
    const path = `${record.id}/${Date.now()}-${safeQcFileName(uploadFile.name)}`;
    setWorking(true);
    setNotice(null);
    const uploadResult = await supabase.storage.from("qc-proofs").upload(path, uploadFile, {
      contentType: uploadFile.type,
      cacheControl: "3600",
      upsert: false
    });
    if (uploadResult.error) {
      setWorking(false);
      setNotice({ type: "error", text: `Upload bukti gagal: ${uploadResult.error.message}` });
      return;
    }
    const registerResult = await supabase.rpc("register_qc_file", {
      p_qc_record_id: record.id,
      p_path: path,
      p_file_name: uploadFile.name,
      p_mime_type: uploadFile.type,
      p_size_bytes: uploadFile.size
    });
    if (registerResult.error) {
      await supabase.storage.from("qc-proofs").remove([path]);
      setWorking(false);
      setNotice({ type: "error", text: registerResult.error.message || "Metadata bukti QC gagal disimpan." });
      return;
    }
    setWorking(false);
    setUploadFile(null);
    setNotice({ type: "success", text: "Bukti QC berhasil diunggah." });
    await loadData();
  }

  async function openProof(file: QcFileRow) {
    const supabase = createSupabaseClient();
    if (!supabase) return;
    const result = await supabase.storage.from(file.bucket).createSignedUrl(file.path, 60 * 10);
    if (result.error || !result.data?.signedUrl) {
      setNotice({ type: "error", text: result.error?.message || "Tautan bukti tidak dapat dibuat." });
      return;
    }
    window.open(result.data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function removeProof(file: QcFileRow) {
    if (!record || !canManage || working || !canEditQc(record)) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setWorking(true);
    setNotice(null);
    const storageResult = await supabase.storage.from(file.bucket).remove([file.path]);
    if (storageResult.error) {
      setWorking(false);
      setNotice({ type: "error", text: storageResult.error.message || "File bukti gagal dihapus." });
      return;
    }
    const result = await supabase.rpc("remove_qc_file", { p_qc_file_id: file.id });
    setWorking(false);
    if (result.error) {
      setNotice({ type: "error", text: `${result.error.message}. File storage sudah dibersihkan; muat ulang lalu ulangi pembersihan metadata.` });
      return;
    }
    setNotice({ type: "success", text: "Bukti QC berhasil dihapus." });
    await loadData();
  }

  async function finalizeQc(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!record || !canManage || working || record.status !== "in_review" || record.result !== "pending") return;
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setWorking(true);
    setNotice(null);
    const result = await supabase.rpc("finalize_qc_record", {
      p_qc_record_id: record.id,
      p_passed_quantity: finalizeForm.passed_quantity,
      p_failed_quantity: finalizeForm.failed_quantity,
      p_result: finalizeForm.result,
      p_note: finalizeForm.note.trim() || null
    });
    setWorking(false);
    if (result.error) {
      setNotice({ type: "error", text: result.error.message || "Hasil QC gagal difinalisasi." });
      return;
    }
    setFinalizeOpen(false);
    setNotice({ type: "success", text: finalizeForm.result === "passed" ? "QC lulus dan Work Item selesai." : "Work Item dikembalikan ke tahap perbaikan." });
    await loadData();
  }

  async function archiveRecord() {
    if (!record || !canManage || working || !archiveReason.trim()) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setWorking(true);
    setNotice(null);
    const result = await supabase.rpc("archive_qc_record", {
      p_qc_record_id: record.id,
      p_reason: archiveReason.trim()
    });
    setWorking(false);
    if (result.error) {
      setNotice({ type: "error", text: result.error.message || "QC gagal diarsipkan." });
      return;
    }
    router.replace("/admin/quality-control");
    router.refresh();
  }

  async function restoreRecord() {
    if (!record || !canManage || working) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setWorking(true);
    setNotice(null);
    const result = await supabase.rpc("restore_qc_record", { p_qc_record_id: record.id });
    setWorking(false);
    if (result.error) {
      setNotice({ type: "error", text: result.error.message || "QC gagal dipulihkan." });
      return;
    }
    setNotice({ type: "success", text: "Draft QC berhasil dipulihkan." });
    await loadData();
  }

  async function permanentlyDelete() {
    if (!record || !canDelete || working || deleteConfirmation !== `HAPUS ${record.qc_number}`) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setWorking(true);
    setNotice(null);
    if (files.length > 0) {
      const storageResult = await supabase.storage.from("qc-proofs").remove(files.map((file) => file.path));
      if (storageResult.error) {
        setWorking(false);
        setNotice({ type: "error", text: `File bukti belum dapat dibersihkan: ${storageResult.error.message}` });
        return;
      }
    }
    const result = await supabase.rpc("permanently_delete_qc_record", { p_qc_record_id: record.id });
    setWorking(false);
    if (result.error) {
      setNotice({ type: "error", text: result.error.message || "QC gagal dihapus permanen." });
      return;
    }
    router.replace("/admin/quality-control");
    router.refresh();
  }

  if (loading) return <AdminLoadingState label="Memuat detail Quality Control..." />;

  if (!record) {
    return (
      <AdminErrorState
        title="Quality Control tidak ditemukan"
        description="Pemeriksaan mungkin sudah dihapus atau tautannya tidak valid."
        action={<Link href="/admin/quality-control" className="inline-flex min-h-11 items-center rounded-full bg-brand-charcoal px-6 text-sm font-semibold text-white">Kembali ke Quality Control</Link>}
      />
    );
  }

  const editable = canEditQc(record);
  const pendingChecklist = checklist.filter((row) => row.result === "pending").length;
  const failedChecklist = checklist.filter((row) => row.result === "fail").length;

  return (
    <main className="text-brand-charcoal">
      <div className="grid gap-6">
        <AdminPageHeader
          eyebrow="DEBRODER v1.2 · Phase 10"
          title={record.qc_number}
          description={`${workItem?.work_item_number || "Work Item"} · ${workItem?.title || "Quality Control"} · Percobaan #${record.attempt_number}`}
          actions={
            <>
              <Link href="/admin/quality-control" className="inline-flex min-h-10 items-center rounded-full border border-brand-softGray bg-white px-5 text-sm font-semibold">Kembali</Link>
              {workItem ? <Link href={`/admin/work-items/${workItem.id}`} className="inline-flex min-h-10 items-center rounded-full border border-brand-softGray bg-white px-5 text-sm font-semibold">Work Item</Link> : null}
              {jobOrder ? <Link href={`/admin/job-orders/${jobOrder.id}`} className="inline-flex min-h-10 items-center rounded-full border border-brand-softGray bg-white px-5 text-sm font-semibold">Job Order</Link> : null}
              {editable && canManage ? <button type="button" onClick={() => setEditOpen(true)} className="inline-flex min-h-10 items-center rounded-full border border-brand-softGray bg-white px-5 text-sm font-semibold">Edit QC</button> : null}
              {!record.archived_at && record.status === "draft" && record.result === "pending" && canManage ? <button type="button" onClick={() => setBeginOpen(true)} className="inline-flex min-h-10 items-center rounded-full bg-brand-charcoal px-5 text-sm font-semibold text-white">Mulai Pemeriksaan</button> : null}
              {!record.archived_at && record.status === "in_review" && record.result === "pending" && canManage ? <button type="button" onClick={() => setFinalizeOpen(true)} className="inline-flex min-h-10 items-center rounded-full bg-brand-green px-5 text-sm font-semibold text-white">Finalisasi QC</button> : null}
              {canArchiveQc(record) && canManage ? <button type="button" onClick={() => setArchiveOpen(true)} className="inline-flex min-h-10 items-center rounded-full border border-amber-300 bg-white px-5 text-sm font-semibold text-amber-800">Arsipkan</button> : null}
              {record.archived_at && canManage ? <button type="button" onClick={() => void restoreRecord()} disabled={working} className="inline-flex min-h-10 items-center rounded-full border border-brand-green bg-white px-5 text-sm font-semibold text-brand-green disabled:opacity-45">Pulihkan</button> : null}
              {record.archived_at && canDelete ? <button type="button" onClick={() => setDeleteOpen(true)} className="inline-flex min-h-10 items-center rounded-full border border-red-300 bg-white px-5 text-sm font-semibold text-red-700">Hapus Permanen</button> : null}
            </>
          }
        />

        {notice ? <AdminAlert type={notice.type}>{notice.text}</AdminAlert> : null}
        {!canManage ? <AdminAlert type="error">Akun ini tidak mempunyai akses Quality Control.</AdminAlert> : null}
        {record.archived_at ? <AdminAlert type="warning">QC diarsipkan {formatQcDate(record.archived_at)} oleh {actorLabel(record.archived_by)}{record.archive_reason ? ` · ${record.archive_reason}` : ""}.</AdminAlert> : null}
        {record.status === "finalized" ? <AdminAlert type={record.result === "passed" ? "success" : "warning"}>Hasil QC sudah final: {QC_RESULT_LABELS[record.result]}. Catatan final tidak dapat diedit atau diarsipkan.</AdminAlert> : null}

        <section className="grid gap-4 border border-brand-softGray bg-white p-5 sm:grid-cols-2 sm:p-7 xl:grid-cols-4">
          <Data label="Status Pemeriksaan" value={QC_WORKFLOW_LABELS[record.status]} />
          <Data label="Hasil" value={QC_RESULT_LABELS[record.result]} />
          <Data label="Jumlah Diperiksa" value={`${record.checked_quantity} ${workItem?.unit || "pcs"}`} />
          <Data label="Lulus / Gagal" value={`${record.passed_quantity} / ${record.failed_quantity}`} />
          <Data label="Work Item" value={workItem?.work_item_number || "-"} />
          <Data label="Job Order" value={jobOrder?.job_order_number || "-"} />
          <Data label="Target Work Item" value={formatWorkItemTarget(workItem?.target_date)} />
          <Data label="Status Work Item" value={workItem ? WORK_ITEM_STATUS_LABELS[workItem.status] : "-"} />
          <Data label="Inspector" value={actorLabel(record.inspector_id)} />
          <Data label="Pemeriksaan Dimulai" value={formatQcDate(record.inspection_started_at)} />
          <Data label="Disahkan oleh" value={actorLabel(record.approved_by)} />
          <Data label="Disahkan" value={formatQcDate(record.approved_at)} />
        </section>

        <section className="border border-brand-softGray bg-white p-5 sm:p-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Checklist Pemeriksaan</h2>
              <p className="mt-2 text-sm text-brand-charcoal/60">{pendingChecklist} belum diperiksa · {failedChecklist} gagal.</p>
            </div>
            {editable && canManage ? <button type="button" onClick={() => setEditOpen(true)} className="rounded-full border border-brand-softGray px-5 py-2.5 text-sm font-semibold">Perbarui Checklist</button> : null}
          </div>
          <div className="mt-6 divide-y divide-brand-softGray border-y border-brand-softGray">
            {checklist.map((row) => (
              <article key={row.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <h3 className="font-semibold">{row.label}</h3>
                  {row.note ? <p className="mt-1 text-sm text-brand-charcoal/60">{row.note}</p> : null}
                </div>
                <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${row.result === "pass" ? "bg-emerald-50 text-emerald-800" : row.result === "fail" ? "bg-red-50 text-red-800" : "bg-brand-offWhite"}`}>
                  {QC_CHECKLIST_LABELS[row.result]}
                </span>
              </article>
            ))}
          </div>
        </section>

        <section className="border border-brand-softGray bg-white p-5 sm:p-7">
          <h2 className="text-2xl font-semibold">Bukti Quality Control</h2>
          <p className="mt-2 text-sm text-brand-charcoal/60">Minimal satu foto atau PDF diperlukan sebelum finalisasi.</p>
          {editable && canManage ? (
            <div className="mt-5 grid gap-3 rounded-lg border border-dashed border-brand-softGray bg-brand-offWhite p-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(event) => setUploadFile(event.target.files?.[0] || null)} className="text-sm" />
              <button type="button" onClick={() => void uploadProof()} disabled={!uploadFile || working} className="rounded-full bg-brand-charcoal px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-45">{working ? "Memproses..." : "Upload Bukti QC"}</button>
            </div>
          ) : null}
          <div className="mt-5 grid gap-3">
            {files.length === 0 ? <p className="text-sm text-brand-charcoal/55">Belum ada bukti QC.</p> : files.map((file) => (
              <article key={file.id} className="flex flex-col gap-3 border border-brand-softGray p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">{file.file_name}</p>
                  <p className="mt-1 text-xs text-brand-charcoal/55">{formatQcFileSize(file.size_bytes)} · {formatQcDate(file.uploaded_at)} · {actorLabel(file.uploaded_by)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => void openProof(file)} className="rounded-full border border-brand-softGray px-4 py-2 text-sm font-semibold">Buka</button>
                  {editable && canManage ? <button type="button" onClick={() => void removeProof(file)} disabled={working} className="rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-45">Hapus</button> : null}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="border border-brand-softGray bg-white p-5 sm:p-7">
            <h2 className="text-2xl font-semibold">Riwayat Status</h2>
            <div className="mt-5 grid gap-3">
              {history.length === 0 ? <p className="text-sm text-brand-charcoal/55">Belum ada riwayat.</p> : history.map((row) => (
                <article key={row.id} className="border-l-2 border-brand-softGray pl-4">
                  <p className="font-semibold">{historyLabel(row.from_result)} → {historyLabel(row.to_result)}</p>
                  <p className="mt-1 text-xs text-brand-charcoal/55">{formatQcDate(row.changed_at)} · {actorLabel(row.changed_by)}</p>
                  {row.note ? <p className="mt-2 text-sm text-brand-charcoal/65">{row.note}</p> : null}
                </article>
              ))}
            </div>
          </div>
          <div className="border border-brand-softGray bg-white p-5 sm:p-7">
            <h2 className="text-2xl font-semibold">Riwayat Revisi</h2>
            <div className="mt-5 grid gap-3">
              {revisions.length === 0 ? <p className="text-sm text-brand-charcoal/55">Belum ada revisi draft.</p> : revisions.map((row) => (
                <article key={row.id} className="border-l-2 border-brand-softGray pl-4">
                  <p className="font-semibold">Revisi #{row.revision_number}</p>
                  <p className="mt-1 text-xs text-brand-charcoal/55">{formatQcDate(row.created_at)} · {actorLabel(row.created_by)}</p>
                  <p className="mt-2 text-sm text-brand-charcoal/65">{row.reason}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>

      {editOpen ? (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/60 p-4 sm:p-8">
          <form onSubmit={saveDraft} className="mx-auto max-w-3xl bg-white p-6 shadow-2xl sm:p-8">
            <h2 className="text-2xl font-semibold">Edit Draft Quality Control</h2>
            <label className="mt-5 block text-sm font-semibold">Jumlah diperiksa<input type="number" min={1} max={workItem?.quantity || undefined} value={checkedQuantity} onChange={(event) => setCheckedQuantity(Number(event.target.value) || 1)} className="mt-2 min-h-11 w-full rounded-lg border border-brand-softGray px-4" /></label>
            <label className="mt-4 block text-sm font-semibold">Catatan cacat / catatan umum<textarea rows={3} value={defectNotes} onChange={(event) => setDefectNotes(event.target.value)} className="mt-2 w-full rounded-lg border border-brand-softGray px-4 py-3" /></label>
            <div className="mt-6 grid gap-4">
              {checklistDraft.map((row, index) => (
                <article key={row.id} className="grid gap-3 border border-brand-softGray p-4 md:grid-cols-[1fr_180px]">
                  <div>
                    <p className="font-semibold">{row.label}</p>
                    <input value={row.note} onChange={(event) => setChecklistDraft((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, note: event.target.value } : item))} placeholder="Catatan item" className="mt-2 min-h-10 w-full rounded-lg border border-brand-softGray px-3 text-sm" />
                  </div>
                  <select value={row.result} onChange={(event) => setChecklistDraft((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, result: event.target.value as QcChecklistResult } : item))} className="min-h-11 rounded-lg border border-brand-softGray px-3 text-sm">
                    {Object.entries(QC_CHECKLIST_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </article>
              ))}
            </div>
            {record.status === "in_review" ? <label className="mt-5 block text-sm font-semibold">Alasan perubahan selama pemeriksaan<input value={editReason} onChange={(event) => setEditReason(event.target.value)} className="mt-2 min-h-11 w-full rounded-lg border border-brand-softGray px-4" /></label> : null}
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="submit" disabled={working || (record.status === "in_review" && !editReason.trim())} className="rounded-full bg-brand-green px-6 py-3 text-sm font-semibold text-white disabled:opacity-45">{working ? "Menyimpan..." : "Simpan Draft"}</button>
              <button type="button" onClick={() => setEditOpen(false)} disabled={working} className="rounded-full border border-brand-softGray px-6 py-3 text-sm font-semibold">Batal</button>
            </div>
          </form>
        </div>
      ) : null}

      {beginOpen ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4">
          <section className="w-full max-w-lg bg-white p-6 shadow-2xl">
            <h2 className="text-2xl font-semibold">Mulai Pemeriksaan QC?</h2>
            <p className="mt-3 text-sm leading-6 text-brand-charcoal/65">Checklist tetap dapat diedit selama pemeriksaan berjalan. Setiap perubahan akan tercatat sebagai revisi.</p>
            <textarea rows={3} value={beginNote} onChange={(event) => setBeginNote(event.target.value)} placeholder="Catatan awal pemeriksaan" className="mt-5 w-full rounded-lg border border-brand-softGray px-4 py-3" />
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={() => void beginInspection()} disabled={working} className="rounded-full bg-brand-charcoal px-6 py-3 text-sm font-semibold text-white disabled:opacity-45">Mulai Pemeriksaan</button>
              <button type="button" onClick={() => setBeginOpen(false)} disabled={working} className="rounded-full border border-brand-softGray px-6 py-3 text-sm font-semibold">Batal</button>
            </div>
          </section>
        </div>
      ) : null}

      {finalizeOpen ? (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/60 p-4 sm:p-8">
          <form onSubmit={finalizeQc} className="mx-auto max-w-xl bg-white p-6 shadow-2xl sm:p-8">
            <h2 className="text-2xl font-semibold">Finalisasi Quality Control</h2>
            <p className="mt-2 text-sm leading-6 text-brand-charcoal/60">Keputusan final akan menyelesaikan Work Item atau mengembalikannya ke tahap perbaikan.</p>
            <label className="mt-5 block text-sm font-semibold">Hasil akhir<select value={finalizeForm.result} onChange={(event) => {
              const result = event.target.value as Exclude<QcResult, "pending">;
              setFinalizeForm((current) => ({
                ...current,
                result,
                passed_quantity: result === "passed" ? record.checked_quantity : current.passed_quantity,
                failed_quantity: result === "passed" ? 0 : current.failed_quantity
              }));
            }} className="mt-2 min-h-11 w-full rounded-lg border border-brand-softGray px-4">
              <option value="passed">Lulus</option>
              <option value="rework">Perlu Perbaikan</option>
              <option value="failed">Tidak Lulus</option>
              <option value="partial">Lulus Sebagian / Perbaikan</option>
            </select></label>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold">Jumlah lulus<input type="number" min={0} value={finalizeForm.passed_quantity} onChange={(event) => setFinalizeForm((current) => ({ ...current, passed_quantity: Number(event.target.value) || 0 }))} className="mt-2 min-h-11 w-full rounded-lg border border-brand-softGray px-4" /></label>
              <label className="text-sm font-semibold">Jumlah gagal<input type="number" min={0} value={finalizeForm.failed_quantity} onChange={(event) => setFinalizeForm((current) => ({ ...current, failed_quantity: Number(event.target.value) || 0 }))} className="mt-2 min-h-11 w-full rounded-lg border border-brand-softGray px-4" /></label>
            </div>
            <label className="mt-4 block text-sm font-semibold">Catatan keputusan<textarea rows={4} value={finalizeForm.note} onChange={(event) => setFinalizeForm((current) => ({ ...current, note: event.target.value }))} className="mt-2 w-full rounded-lg border border-brand-softGray px-4 py-3" /></label>
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="submit" disabled={working} className="rounded-full bg-brand-green px-6 py-3 text-sm font-semibold text-white disabled:opacity-45">{working ? "Memfinalisasi..." : "Sahkan Hasil QC"}</button>
              <button type="button" onClick={() => setFinalizeOpen(false)} disabled={working} className="rounded-full border border-brand-softGray px-6 py-3 text-sm font-semibold">Batal</button>
            </div>
          </form>
        </div>
      ) : null}

      {archiveOpen ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4">
          <section className="w-full max-w-lg bg-white p-6 shadow-2xl">
            <h2 className="text-2xl font-semibold">Arsipkan Draft QC?</h2>
            <p className="mt-3 text-sm leading-6 text-brand-charcoal/65">Draft dapat dipulihkan melalui Gudang Arsip. Hasil QC final tidak dapat diarsipkan.</p>
            <textarea rows={4} value={archiveReason} onChange={(event) => setArchiveReason(event.target.value)} placeholder="Alasan arsip" className="mt-5 w-full rounded-lg border border-brand-softGray px-4 py-3" />
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={() => void archiveRecord()} disabled={working || !archiveReason.trim()} className="rounded-full bg-amber-700 px-6 py-3 text-sm font-semibold text-white disabled:opacity-45">Arsipkan</button>
              <button type="button" onClick={() => setArchiveOpen(false)} disabled={working} className="rounded-full border border-brand-softGray px-6 py-3 text-sm font-semibold">Batal</button>
            </div>
          </section>
        </div>
      ) : null}

      {deleteOpen ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4">
          <section className="w-full max-w-lg bg-white p-6 shadow-2xl">
            <h2 className="text-2xl font-semibold text-red-700">Hapus Permanen?</h2>
            <p className="mt-3 text-sm leading-6 text-brand-charcoal/65">File bukti akan dibersihkan dan audit tetap tersimpan. Ketik <strong>HAPUS {record.qc_number}</strong>.</p>
            <input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} className="mt-5 min-h-11 w-full rounded-lg border border-red-300 px-4" />
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={() => void permanentlyDelete()} disabled={working || deleteConfirmation !== `HAPUS ${record.qc_number}`} className="rounded-full bg-red-700 px-6 py-3 text-sm font-semibold text-white disabled:opacity-45">Hapus Permanen</button>
              <button type="button" onClick={() => setDeleteOpen(false)} disabled={working} className="rounded-full border border-brand-softGray px-6 py-3 text-sm font-semibold">Batal</button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function Data({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-charcoal/45">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold">{value}</p>
    </div>
  );
}
