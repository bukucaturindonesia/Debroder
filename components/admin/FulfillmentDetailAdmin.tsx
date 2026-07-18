"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";
import { AdminAlert, AdminErrorState, AdminLoadingState } from "@/components/admin/ui/AdminFeedback";
import {
  FULFILLMENT_FILE_LABELS,
  FULFILLMENT_METHOD_LABELS,
  FULFILLMENT_STATUS_LABELS,
  canArchiveFulfillment,
  canEditFulfillment,
  formatFulfillmentDate,
  formatFulfillmentFileSize,
  fulfillmentTransitionNeedsReason,
  getFulfillmentTransitionLabel,
  getFulfillmentTransitions,
  isFulfillmentRole,
  isFulfillmentSuperAdmin,
  safeFulfillmentFileName,
  type FulfillmentFileRow,
  type FulfillmentFileType,
  type FulfillmentHistoryRow,
  type FulfillmentItemRow,
  type FulfillmentRevisionRow,
  type FulfillmentRow,
  type FulfillmentStatus
} from "@/lib/fulfillments";
import type { WorkItemRow } from "@/lib/work-items";

type OrderRow = {
  id: string;
  order_number: string;
  customer_name: string;
  company_name: string | null;
  customer_phone: string;
  status: string;
  delivery_method: string;
  shipping_address: string;
  custom_project_snapshot: unknown;
};

type ProfileRow = {
  id: string;
  email: string | null;
  role: string | null;
};

type EditForm = {
  receiver_name: string;
  receiver_phone: string;
  destination: string;
  courier: string;
  tracking_number: string;
  package_count: number;
  scheduled_at: string;
  notes: string;
  reason: string;
};

const FINAL_CHECKS = [
  ["order_number", "Nomor order"], ["customer", "Nama pelanggan"], ["phone", "Nomor telepon"],
  ["product", "Produk"], ["variant", "Varian"], ["color", "Warna"], ["size", "Ukuran"],
  ["quantity", "Quantity"], ["method", "Metode Custom"], ["design", "Desain aktif"],
  ["placement", "Placement"], ["print_size", "Ukuran cetak"], ["personalization", "Personalisasi"],
  ["qc", "Hasil QC"], ["package_content", "Isi paket"], ["package_count", "Jumlah paket"],
  ["recipient_address", "Alamat penerima"], ["postal_code", "Kode pos"],
  ["fulfillment_method", "Metode fulfillment"], ["package_condition", "Kondisi kemasan"]
] as const;

function toLocalInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

export function FulfillmentDetailAdmin() {
  const params = useParams<{ id?: string | string[] }>();
  const router = useRouter();
  const fulfillmentId = useMemo(() => {
    const raw = params?.id;
    return Array.isArray(raw) ? raw[0] : raw || "";
  }, [params]);

  const [record, setRecord] = useState<FulfillmentRow | null>(null);
  const [items, setItems] = useState<FulfillmentItemRow[]>([]);
  const [files, setFiles] = useState<FulfillmentFileRow[]>([]);
  const [history, setHistory] = useState<FulfillmentHistoryRow[]>([]);
  const [revisions, setRevisions] = useState<FulfillmentRevisionRow[]>([]);
  const [workItems, setWorkItems] = useState<WorkItemRow[]>([]);
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error" | "warning"; text: string } | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    receiver_name: "",
    receiver_phone: "",
    destination: "",
    courier: "",
    tracking_number: "",
    package_count: 1,
    scheduled_at: "",
    notes: "",
    reason: ""
  });
  const [transitionTarget, setTransitionTarget] = useState<FulfillmentStatus | null>(null);
  const [transitionNote, setTransitionNote] = useState("");
  const [transitionReason, setTransitionReason] = useState("");
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<FulfillmentFileType>("photo");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [finalChecklist, setFinalChecklist] = useState<Record<string, boolean>>({});
  const [finalNote, setFinalNote] = useState("");

  const canManage = isFulfillmentRole(role);
  const canDelete = isFulfillmentSuperAdmin(role);

  const loadData = useCallback(async () => {
    const supabase = createSupabaseClient();
    if (!supabase || !fulfillmentId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setNotice(null);

    const sessionResult = await supabase.auth.getSession();
    const userId = sessionResult.data.session?.user.id;
    const recordResult = await supabase
      .from("fulfillments")
      .select("id,fulfillment_number,order_id,job_order_id,method,status,receiver_name,receiver_phone,destination,courier,tracking_number,package_count,scheduled_at,packing_at,ready_at,shipped_at,delivered_at,picked_up_at,problem_at,cancelled_at,cancel_reason,notes,idempotency_key,created_by,updated_by,created_at,updated_at,archived_at,archived_by,archive_reason,final_verification_checklist,final_verified_at,final_verified_by,final_verification_note")
      .eq("id", fulfillmentId)
      .maybeSingle();

    if (recordResult.error || !recordResult.data) {
      setRecord(null);
      setLoading(false);
      return;
    }

    const row = recordResult.data as FulfillmentRow;
    const [profileResult, itemResult, fileResult, historyResult, revisionResult, workResult, orderResult, profileListResult] = await Promise.all([
      userId
        ? supabase.from("profiles").select("role").eq("id", userId).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from("fulfillment_items")
        .select("id,fulfillment_id,work_item_id,order_item_id,quantity,created_at")
        .eq("fulfillment_id", row.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("fulfillment_files")
        .select("id,fulfillment_id,file_type,bucket,path,file_name,mime_type,size_bytes,uploaded_by,uploaded_at")
        .eq("fulfillment_id", row.id)
        .order("uploaded_at", { ascending: false }),
      supabase
        .from("fulfillment_status_history")
        .select("id,fulfillment_id,from_status,to_status,note,reason,changed_by,changed_at,metadata")
        .eq("fulfillment_id", row.id)
        .order("changed_at", { ascending: false }),
      supabase
        .from("fulfillment_revisions")
        .select("id,fulfillment_id,revision_number,reason,previous_snapshot,new_snapshot,created_by,created_at")
        .eq("fulfillment_id", row.id)
        .order("revision_number", { ascending: false }),
      row.job_order_id
        ? supabase
            .from("work_items")
            .select("id,work_item_number,job_order_id,source_order_item_id,source_order_item_service_id,source_mockup_part_id,title,description,quantity,unit,assigned_to,target_date,priority,status,instruction_snapshot,approved_design_snapshot,ready_by,ready_at,started_at,paused_at,resumed_at,completed_at,cancelled_at,cancel_reason,created_by,updated_by,created_at,updated_at,archived_at,archived_by,archive_reason")
            .eq("job_order_id", row.job_order_id)
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from("orders")
        .select("id,order_number,customer_name,company_name,customer_phone,status,delivery_method,shipping_address,custom_project_snapshot")
        .eq("id", row.order_id)
        .maybeSingle(),
      supabase.from("profiles").select("id,email,role")
    ]);

    setLoading(false);
    const firstError = itemResult.error || fileResult.error || historyResult.error || revisionResult.error || workResult.error || orderResult.error;
    if (firstError) {
      setNotice({ type: "error", text: `Detail penyerahan belum dapat dimuat lengkap: ${firstError.message}` });
    }

    setRecord(row);
    setRole(typeof profileResult.data?.role === "string" ? profileResult.data.role : null);
    setItems((itemResult.data || []) as FulfillmentItemRow[]);
    setFiles((fileResult.data || []) as FulfillmentFileRow[]);
    setHistory((historyResult.data || []) as FulfillmentHistoryRow[]);
    setRevisions((revisionResult.data || []) as FulfillmentRevisionRow[]);
    setWorkItems((workResult.data || []) as WorkItemRow[]);
    setOrder((orderResult.data || null) as OrderRow | null);
    setProfiles((profileListResult.data || []) as ProfileRow[]);
    setFinalChecklist(isBooleanRecord(row.final_verification_checklist) ? row.final_verification_checklist : {});
    setFinalNote(row.final_verification_note || "");
    setEditForm({
      receiver_name: row.receiver_name || "",
      receiver_phone: row.receiver_phone || "",
      destination: row.destination || "",
      courier: row.courier || "",
      tracking_number: row.tracking_number || "",
      package_count: row.package_count,
      scheduled_at: toLocalInput(row.scheduled_at),
      notes: row.notes || "",
      reason: ""
    });
  }, [fulfillmentId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const workItemMap = useMemo(() => {
    const map: Record<string, WorkItemRow> = {};
    for (const item of workItems) map[item.id] = item;
    return map;
  }, [workItems]);

  const actorMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const profile of profiles) map[profile.id] = profile.email?.trim() || "Akun tanpa email";
    return map;
  }, [profiles]);

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!record || !canManage || working || !canEditFulfillment(record.status, record.archived_at)) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setWorking(true);
    setNotice(null);
    const result = await supabase.rpc("update_fulfillment_details", {
      p_fulfillment_id: record.id,
      p_receiver_name: editForm.receiver_name.trim(),
      p_receiver_phone: editForm.receiver_phone.trim(),
      p_destination: editForm.destination.trim() || null,
      p_courier: editForm.courier.trim() || null,
      p_tracking_number: editForm.tracking_number.trim() || null,
      p_package_count: editForm.package_count,
      p_scheduled_at: editForm.scheduled_at ? new Date(editForm.scheduled_at).toISOString() : null,
      p_notes: editForm.notes.trim() || null,
      p_reason: editForm.reason.trim() || null
    });
    setWorking(false);
    if (result.error) {
      setNotice({ type: "error", text: result.error.message || "Perubahan gagal disimpan." });
      return;
    }
    setEditOpen(false);
    setNotice({ type: "success", text: "Detail penyerahan berhasil diperbarui dan revisi disimpan." });
    await loadData();
  }

  async function completeFinalVerification() {
    if (!record || !canManage || working || record.status !== "packing" || FINAL_CHECKS.some(([key]) => !finalChecklist[key])) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setWorking(true); setNotice(null);
    const result = await supabase.rpc("complete_custom_fulfillment_final_verification", {
      p_fulfillment_id: record.id,
      p_checklist: finalChecklist,
      p_note: finalNote.trim() || null,
      p_expected_updated_at: record.updated_at
    });
    setWorking(false);
    if (result.error) {
      setNotice({ type: "error", text: /admin lain/i.test(result.error.message) ? "Data ini telah diperbarui oleh admin lain. Muat ulang kondisi terbaru." : result.error.message || "Pengecekan akhir gagal disimpan." });
      return;
    }
    setNotice({ type: "success", text: "Pengecekan akhir tersimpan. Pengiriman / pickup sekarang dapat dilanjutkan." });
    await loadData();
  }

  async function transitionStatus() {
    if (!record || !transitionTarget || !canManage || working) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setWorking(true);
    setNotice(null);
    const result = await supabase.rpc("transition_fulfillment_status", {
      p_fulfillment_id: record.id,
      p_to_status: transitionTarget,
      p_note: transitionNote.trim() || null,
      p_reason: transitionReason.trim() || null
    });
    setWorking(false);
    if (result.error) {
      setNotice({ type: "error", text: result.error.message || "Status penyerahan gagal diperbarui." });
      return;
    }
    setTransitionTarget(null);
    setTransitionNote("");
    setTransitionReason("");
    setNotice({ type: "success", text: `Status diperbarui menjadi ${FULFILLMENT_STATUS_LABELS[transitionTarget]}.` });
    await loadData();
  }

  async function uploadProof() {
    if (!record || !uploadFile || !canManage || working || record.archived_at) return;
    if (!canEditFulfillment(record.status, record.archived_at) && !["shipped", "in_transit"].includes(record.status)) {
      setNotice({ type: "error", text: "Bukti tidak dapat ditambahkan pada status ini." });
      return;
    }
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
    const path = `${record.id}/${Date.now()}-${safeFulfillmentFileName(uploadFile.name)}`;
    setWorking(true);
    setNotice(null);
    const uploadResult = await supabase.storage.from("fulfillment-proofs").upload(path, uploadFile, {
      contentType: uploadFile.type,
      cacheControl: "3600",
      upsert: false
    });
    if (uploadResult.error) {
      setWorking(false);
      setNotice({ type: "error", text: `Upload bukti gagal: ${uploadResult.error.message}` });
      return;
    }
    const registerResult = await supabase.rpc("register_fulfillment_file", {
      p_fulfillment_id: record.id,
      p_file_type: uploadType,
      p_path: path,
      p_file_name: uploadFile.name,
      p_mime_type: uploadFile.type,
      p_size_bytes: uploadFile.size
    });
    if (registerResult.error) {
      await supabase.storage.from("fulfillment-proofs").remove([path]);
      setWorking(false);
      setNotice({ type: "error", text: registerResult.error.message || "Metadata bukti gagal disimpan." });
      return;
    }
    setWorking(false);
    setUploadFile(null);
    setNotice({ type: "success", text: "Bukti penyerahan berhasil diunggah." });
    await loadData();
  }

  async function openProof(file: FulfillmentFileRow) {
    const supabase = createSupabaseClient();
    if (!supabase) return;
    const result = await supabase.storage.from(file.bucket).createSignedUrl(file.path, 120);
    if (result.error || !result.data?.signedUrl) {
      setNotice({ type: "error", text: result.error?.message || "Bukti tidak dapat dibuka." });
      return;
    }
    window.open(result.data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function removeProof(file: FulfillmentFileRow) {
    if (!record || !canManage || working) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setWorking(true);
    setNotice(null);
    const rpcResult = await supabase.rpc("remove_fulfillment_file", { p_file_id: file.id });
    if (rpcResult.error) {
      setWorking(false);
      setNotice({ type: "error", text: rpcResult.error.message || "Bukti gagal dihapus." });
      return;
    }
    const storageResult = await supabase.storage.from(file.bucket).remove([file.path]);
    setWorking(false);
    if (storageResult.error) {
      setNotice({ type: "warning", text: `Metadata sudah dihapus, tetapi objek storage perlu dibersihkan: ${storageResult.error.message}` });
    } else {
      setNotice({ type: "success", text: "Bukti berhasil dihapus." });
    }
    await loadData();
  }

  async function archiveRecord() {
    if (!record || !canManage || working || !canArchiveFulfillment(record.status, record.archived_at)) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setWorking(true);
    setNotice(null);
    const result = await supabase.rpc("archive_fulfillment", {
      p_fulfillment_id: record.id,
      p_reason: archiveReason.trim() || null
    });
    setWorking(false);
    if (result.error) {
      setNotice({ type: "error", text: result.error.message || "Dokumen gagal diarsipkan." });
      return;
    }
    setArchiveOpen(false);
    setArchiveReason("");
    setNotice({ type: "success", text: "Dokumen dipindahkan ke Gudang Arsip." });
    await loadData();
  }

  async function restoreRecord() {
    if (!record || !canManage || working || !record.archived_at) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setWorking(true);
    setNotice(null);
    const result = await supabase.rpc("restore_fulfillment", { p_fulfillment_id: record.id });
    setWorking(false);
    if (result.error) {
      setNotice({ type: "error", text: result.error.message || "Dokumen gagal dipulihkan." });
      return;
    }
    setNotice({ type: "success", text: "Dokumen berhasil dipulihkan dari Gudang Arsip." });
    await loadData();
  }

  async function deletePermanently() {
    if (!record || !canDelete || working || !record.archived_at || deleteConfirmation !== record.fulfillment_number) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setWorking(true);
    setNotice(null);
    const result = await supabase.rpc("permanently_delete_fulfillment", { p_fulfillment_id: record.id });
    setWorking(false);
    if (result.error) {
      setNotice({ type: "error", text: result.error.message || "Hapus permanen gagal." });
      return;
    }
    router.replace("/admin/fulfillments");
    router.refresh();
  }

  if (loading) return <AdminLoadingState label="Memuat detail pengiriman / pickup..." />;

  if (!record) {
    return (
      <AdminErrorState
        title="Dokumen penyerahan tidak ditemukan"
        description="Dokumen mungkin sudah dihapus atau tautannya tidak valid."
        action={
          <Link href="/admin/fulfillments" className="rounded-full bg-brand-charcoal px-6 py-3 text-sm font-semibold text-white">
            Kembali ke Pengiriman & Pickup
          </Link>
        }
      />
    );
  }

  const isCustomOrder = Array.isArray(order?.custom_project_snapshot) && order.custom_project_snapshot.length > 0;
  const transitions = getFulfillmentTransitions(record.method, record.status).filter((target) => !(isCustomOrder && record.status === "packing" && !record.final_verified_at && ["ready_to_ship", "ready_for_pickup"].includes(target)));
  const filesCanBeRemoved = !record.archived_at
    ? !["delivered", "picked_up", "cancelled"].includes(record.status)
    : canDelete && ["preparing", "cancelled"].includes(record.status);

  return (
    <main className="text-brand-charcoal">
      <div className="grid gap-6">
        <AdminPageHeader
          eyebrow={`DEBRODER v1.2 · ${FULFILLMENT_METHOD_LABELS[record.method]}`}
          title={record.fulfillment_number}
          description={`${order?.order_number || "Pesanan"} · ${order?.customer_name || record.receiver_name || "-"}`}
          actions={
            <>
              <Link href="/admin/fulfillments" className="rounded-full border border-brand-softGray px-5 py-2.5 text-sm font-semibold">
                Kembali
              </Link>
              {canEditFulfillment(record.status, record.archived_at) ? (
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  disabled={!canManage}
                  className="rounded-full border border-brand-softGray px-5 py-2.5 text-sm font-semibold disabled:opacity-45"
                >
                  Edit Detail
                </button>
              ) : null}
              {canArchiveFulfillment(record.status, record.archived_at) ? (
                <button
                  type="button"
                  onClick={() => setArchiveOpen(true)}
                  disabled={!canManage}
                  className="rounded-full border border-amber-300 px-5 py-2.5 text-sm font-semibold text-amber-800 disabled:opacity-45"
                >
                  Arsipkan
                </button>
              ) : null}
              {record.archived_at ? (
                <button
                  type="button"
                  onClick={() => void restoreRecord()}
                  disabled={!canManage || working}
                  className="rounded-full bg-brand-green px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-45"
                >
                  Pulihkan
                </button>
              ) : null}
            </>
          }
        />

        {notice ? <AdminAlert type={notice.type}>{notice.text}</AdminAlert> : null}
        {!canManage ? <AdminAlert type="warning">Akun ini hanya dapat melihat data penyerahan.</AdminAlert> : null}
        {record.archived_at ? (
          <AdminAlert type="warning">
            Dokumen diarsipkan {formatFulfillmentDate(record.archived_at)} oleh {record.archived_by ? actorMap[record.archived_by] || "Akun tidak ditemukan" : "-"}
            {record.archive_reason ? ` · ${record.archive_reason}` : ""}
          </AdminAlert>
        ) : null}

        <section className="grid gap-5 border border-brand-softGray bg-white p-5 sm:grid-cols-2 sm:p-7 lg:grid-cols-3">
          <Data label="Status" value={FULFILLMENT_STATUS_LABELS[record.status]} />
          <Data label="Metode" value={FULFILLMENT_METHOD_LABELS[record.method]} />
          <Data label="Jumlah Paket" value={String(record.package_count)} />
          <Data label="Penerima" value={record.receiver_name || "-"} />
          <Data label="Nomor Penerima" value={record.receiver_phone || "-"} />
          <Data label="Jadwal" value={formatFulfillmentDate(record.scheduled_at)} />
          <Data label="Kurir" value={record.courier || "-"} />
          <Data label="Nomor Resi" value={record.tracking_number || "-"} />
          <Data label="Dibuat" value={formatFulfillmentDate(record.created_at)} />
          <div className="sm:col-span-2 lg:col-span-3"><Data label="Tujuan / Lokasi Pickup" value={record.destination || (record.method === "pickup" ? "Ambil di toko" : "-")} /></div>
          <div className="sm:col-span-2 lg:col-span-3"><Data label="Catatan" value={record.notes || "-"} /></div>
        </section>

        {!record.archived_at && transitions.length > 0 ? (
          <section className="border border-brand-softGray bg-white p-5 sm:p-7">
            <h2 className="text-xl font-semibold">Aksi Status</h2>
            <p className="mt-2 text-sm text-brand-charcoal/60">Perubahan status divalidasi oleh database sesuai metode pengiriman atau pickup.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              {transitions.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setTransitionTarget(status)}
                  disabled={!canManage || working}
                  className={`rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-45 ${
                    ["problem", "cancelled"].includes(status)
                      ? "border border-red-300 text-red-700"
                      : "bg-brand-green text-white"
                  }`}
                >
                  {getFulfillmentTransitionLabel(status)}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {isCustomOrder && (record.status === "packing" || record.final_verified_at) ? (
          <section id="final-verification" className="scroll-mt-24 border border-brand-softGray bg-white p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-charcoal/45">Custom Order</p><h2 className="mt-2 text-xl font-semibold">Pengecekan Akhir</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-brand-charcoal/60">Bandingkan order pelanggan, hasil QC, isi paket, dan data penerima. Pengiriman terkunci sampai semua item dikonfirmasi server.</p></div>{record.final_verified_at ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-brand-green">Selesai {formatFulfillmentDate(record.final_verified_at)}</span> : <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">Wajib diselesaikan</span>}</div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{FINAL_CHECKS.map(([key, label]) => <label key={key} className="flex min-h-11 items-center gap-3 border border-brand-softGray px-3 text-sm font-semibold"><input type="checkbox" checked={Boolean(finalChecklist[key])} disabled={Boolean(record.final_verified_at) || !canManage} onChange={(event) => setFinalChecklist((current) => ({ ...current, [key]: event.target.checked }))} />{label}</label>)}</div>
            <label className="mt-5 grid gap-2 text-sm font-semibold">Catatan pengecekan akhir<textarea rows={3} value={finalNote} disabled={Boolean(record.final_verified_at) || !canManage} onChange={(event) => setFinalNote(event.target.value)} className="rounded-lg border border-brand-softGray px-4 py-3" /></label>
            {!record.final_verified_at ? <button type="button" onClick={() => void completeFinalVerification()} disabled={working || !canManage || FINAL_CHECKS.some(([key]) => !finalChecklist[key])} className="mt-5 min-h-11 rounded-full bg-brand-green px-5 text-sm font-semibold text-white disabled:opacity-45">{working ? "Menyimpan..." : "Konfirmasi Sesuai & Lanjut Kirim"}</button> : <p className="mt-5 text-sm text-brand-charcoal/60">Checklist tersimpan read-only. Perubahan detail paket/penerima pada tahap packing akan membatalkan verifikasi dan mewajibkan pemeriksaan ulang.</p>}
          </section>
        ) : null}

        <section className="border border-brand-softGray bg-white p-5 sm:p-7">
          <h2 className="text-xl font-semibold">Item Penyerahan</h2>
          <div className="mt-5 divide-y divide-brand-softGray border-y border-brand-softGray">
            {items.map((item) => {
              const workItem = item.work_item_id ? workItemMap[item.work_item_id] : null;
              return (
                <article key={item.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <p className="font-semibold">{workItem?.work_item_number || "Work Item"}</p>
                    <p className="mt-1 text-sm text-brand-charcoal/60">{workItem?.title || "Data Work Item tidak ditemukan"}</p>
                  </div>
                  <p className="font-semibold">{item.quantity} {workItem?.unit || "pcs"}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="border border-brand-softGray bg-white p-5 sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Bukti & Dokumen</h2>
              <p className="mt-2 text-sm text-brand-charcoal/60">Bukti foto, tanda tangan, atau serah terima wajib tersedia sebelum status selesai.</p>
            </div>
            {!record.archived_at && !["delivered", "picked_up", "cancelled"].includes(record.status) ? (
              <div className="grid gap-2 sm:grid-cols-[160px_1fr_auto]">
                <select
                  value={uploadType}
                  onChange={(event) => setUploadType(event.target.value as FulfillmentFileType)}
                  className="min-h-11 rounded-lg border border-brand-softGray px-3 text-sm"
                >
                  {Object.entries(FULFILLMENT_FILE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  onChange={(event) => setUploadFile(event.target.files?.[0] || null)}
                  className="min-h-11 rounded-lg border border-brand-softGray px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => void uploadProof()}
                  disabled={!uploadFile || !canManage || working}
                  className="rounded-full bg-brand-green px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-45"
                >
                  Upload Bukti
                </button>
              </div>
            ) : null}
          </div>
          {files.length === 0 ? (
            <p className="mt-5 border border-dashed border-brand-softGray p-5 text-sm text-brand-charcoal/60">Belum ada bukti.</p>
          ) : (
            <div className="mt-5 grid gap-3">
              {files.map((file) => (
                <article key={file.id} className="flex flex-col gap-3 border border-brand-softGray p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold">{file.file_name}</p>
                    <p className="mt-1 text-xs text-brand-charcoal/55">
                      {FULFILLMENT_FILE_LABELS[file.file_type]} · {formatFulfillmentFileSize(file.size_bytes)} · {formatFulfillmentDate(file.uploaded_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => void openProof(file)} className="rounded-full border border-brand-softGray px-4 py-2 text-sm font-semibold">
                      Buka
                    </button>
                    {filesCanBeRemoved ? (
                      <button
                        type="button"
                        onClick={() => void removeProof(file)}
                        disabled={!canManage || working}
                        className="rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-45"
                      >
                        Hapus
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="border border-brand-softGray bg-white p-5 sm:p-7">
            <h2 className="text-xl font-semibold">Riwayat Status</h2>
            <div className="mt-5 grid gap-3">
              {history.length === 0 ? <p className="text-sm text-brand-charcoal/60">Belum ada riwayat.</p> : history.map((row) => (
                <article key={row.id} className="border-l-2 border-brand-green pl-4">
                  <p className="font-semibold">{FULFILLMENT_STATUS_LABELS[row.to_status]}</p>
                  <p className="mt-1 text-xs text-brand-charcoal/55">
                    {formatFulfillmentDate(row.changed_at)} · {row.changed_by ? actorMap[row.changed_by] || "Akun tidak ditemukan" : "Sistem"}
                  </p>
                  {row.note ? <p className="mt-2 text-sm">{row.note}</p> : null}
                  {row.reason ? <p className="mt-1 text-sm text-red-700">Alasan: {row.reason}</p> : null}
                </article>
              ))}
            </div>
          </div>
          <div className="border border-brand-softGray bg-white p-5 sm:p-7">
            <h2 className="text-xl font-semibold">Riwayat Revisi</h2>
            <div className="mt-5 grid gap-3">
              {revisions.length === 0 ? <p className="text-sm text-brand-charcoal/60">Belum ada revisi detail.</p> : revisions.map((row) => (
                <article key={row.id} className="border border-brand-softGray p-4">
                  <p className="font-semibold">Revisi {row.revision_number}</p>
                  <p className="mt-1 text-xs text-brand-charcoal/55">
                    {formatFulfillmentDate(row.created_at)} · {row.created_by ? actorMap[row.created_by] || "Akun tidak ditemukan" : "Sistem"}
                  </p>
                  <p className="mt-2 text-sm">{row.reason}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {record.archived_at && canDelete ? (
          <section className="border border-red-200 bg-white p-5 sm:p-7">
            <h2 className="text-xl font-semibold text-red-800">Hapus Permanen</h2>
            <p className="mt-2 text-sm leading-6 text-brand-charcoal/65">
              Hanya dokumen Persiapan atau Dibatalkan yang sudah diarsipkan dapat dihapus. File bukti harus dihapus terlebih dahulu. Audit penghapusan tetap disimpan.
            </p>
            <label className="mt-5 block max-w-md text-sm font-semibold">
              Ketik {record.fulfillment_number}
              <input
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                className="mt-2 min-h-11 w-full rounded-lg border border-red-300 px-4"
              />
            </label>
            <button
              type="button"
              onClick={() => void deletePermanently()}
              disabled={working || files.length > 0 || deleteConfirmation !== record.fulfillment_number || !["preparing", "cancelled"].includes(record.status)}
              className="mt-4 rounded-full bg-red-700 px-6 py-3 text-sm font-semibold text-white disabled:opacity-45"
            >
              Hapus Permanen
            </button>
          </section>
        ) : null}
      </div>

      {editOpen ? (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/60 p-4 sm:p-8">
          <form onSubmit={saveEdit} className="mx-auto max-w-2xl bg-white p-6 shadow-2xl sm:p-8">
            <h2 className="text-2xl font-semibold">Edit Detail Penyerahan</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <InputField label="Nama penerima" value={editForm.receiver_name} onChange={(value) => setEditForm({ ...editForm, receiver_name: value })} required />
              <InputField label="Nomor penerima" value={editForm.receiver_phone} onChange={(value) => setEditForm({ ...editForm, receiver_phone: value })} required />
              {record.method === "shipping" ? (
                <label className="block text-sm font-semibold sm:col-span-2">
                  Alamat tujuan
                  <textarea rows={3} required value={editForm.destination} onChange={(event) => setEditForm({ ...editForm, destination: event.target.value })} className="mt-2 w-full rounded-lg border border-brand-softGray px-4 py-3" />
                </label>
              ) : null}
              <InputField label="Kurir" value={editForm.courier} onChange={(value) => setEditForm({ ...editForm, courier: value })} />
              <InputField label="Nomor resi" value={editForm.tracking_number} onChange={(value) => setEditForm({ ...editForm, tracking_number: value })} />
              <label className="block text-sm font-semibold">
                Jumlah paket
                <input type="number" min={1} value={editForm.package_count} onChange={(event) => setEditForm({ ...editForm, package_count: Number(event.target.value) })} className="mt-2 min-h-11 w-full rounded-lg border border-brand-softGray px-4" />
              </label>
              <label className="block text-sm font-semibold">
                Jadwal
                <input type="datetime-local" value={editForm.scheduled_at} onChange={(event) => setEditForm({ ...editForm, scheduled_at: event.target.value })} className="mt-2 min-h-11 w-full rounded-lg border border-brand-softGray px-4" />
              </label>
              <label className="block text-sm font-semibold sm:col-span-2">
                Catatan
                <textarea rows={3} value={editForm.notes} onChange={(event) => setEditForm({ ...editForm, notes: event.target.value })} className="mt-2 w-full rounded-lg border border-brand-softGray px-4 py-3" />
              </label>
              {record.status !== "preparing" ? (
                <label className="block text-sm font-semibold sm:col-span-2">
                  Alasan perubahan
                  <textarea rows={3} required value={editForm.reason} onChange={(event) => setEditForm({ ...editForm, reason: event.target.value })} className="mt-2 w-full rounded-lg border border-brand-softGray px-4 py-3" />
                </label>
              ) : null}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="submit" disabled={working} className="rounded-full bg-brand-green px-6 py-3 text-sm font-semibold text-white disabled:opacity-45">
                {working ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
              <button type="button" onClick={() => setEditOpen(false)} disabled={working} className="rounded-full border border-brand-softGray px-6 py-3 text-sm font-semibold">Batal</button>
            </div>
          </form>
        </div>
      ) : null}

      {transitionTarget ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4">
          <section className="w-full max-w-lg bg-white p-6 shadow-2xl">
            <h2 className="text-2xl font-semibold">{getFulfillmentTransitionLabel(transitionTarget)}</h2>
            <p className="mt-2 text-sm text-brand-charcoal/65">Status berikutnya: {FULFILLMENT_STATUS_LABELS[transitionTarget]}</p>
            <label className="mt-5 block text-sm font-semibold">
              Catatan
              <textarea rows={3} value={transitionNote} onChange={(event) => setTransitionNote(event.target.value)} className="mt-2 w-full rounded-lg border border-brand-softGray px-4 py-3" />
            </label>
            {fulfillmentTransitionNeedsReason(transitionTarget) ? (
              <label className="mt-4 block text-sm font-semibold">
                Alasan wajib
                <textarea rows={3} required value={transitionReason} onChange={(event) => setTransitionReason(event.target.value)} className="mt-2 w-full rounded-lg border border-red-300 px-4 py-3" />
              </label>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void transitionStatus()}
                disabled={working || (fulfillmentTransitionNeedsReason(transitionTarget) && !transitionReason.trim())}
                className="rounded-full bg-brand-green px-6 py-3 text-sm font-semibold text-white disabled:opacity-45"
              >
                {working ? "Memproses..." : "Konfirmasi"}
              </button>
              <button type="button" onClick={() => setTransitionTarget(null)} disabled={working} className="rounded-full border border-brand-softGray px-6 py-3 text-sm font-semibold">Batal</button>
            </div>
          </section>
        </div>
      ) : null}

      {archiveOpen ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4">
          <section className="w-full max-w-lg bg-white p-6 shadow-2xl">
            <h2 className="text-2xl font-semibold">Arsipkan Dokumen?</h2>
            <p className="mt-2 text-sm text-brand-charcoal/65">Dokumen dapat dipulihkan melalui Gudang Arsip.</p>
            <textarea rows={4} value={archiveReason} onChange={(event) => setArchiveReason(event.target.value)} placeholder="Alasan arsip wajib" className="mt-5 w-full rounded-lg border border-brand-softGray px-4 py-3" />
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={() => void archiveRecord()} disabled={working || !archiveReason.trim()} className="rounded-full bg-amber-700 px-6 py-3 text-sm font-semibold text-white disabled:opacity-45">Arsipkan</button>
              <button type="button" onClick={() => setArchiveOpen(false)} disabled={working} className="rounded-full border border-brand-softGray px-6 py-3 text-sm font-semibold">Batal</button>
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
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-charcoal/45">{label}</p>
      <p className="mt-2 break-words font-semibold">{value}</p>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  required = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <input required={required} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 min-h-11 w-full rounded-lg border border-brand-softGray px-4" />
    </label>
  );
}

function isBooleanRecord(value: unknown): value is Record<string, boolean> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    && Object.values(value as Record<string, unknown>).every((entry) => typeof entry === "boolean");
}
