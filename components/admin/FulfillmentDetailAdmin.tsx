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
  payment_method: string | null;
  payment_status: string;
  shipping_address: string;
  custom_project_snapshot: unknown;
};

type ProfileRow = {
  id: string;
  email: string | null;
  role: string | null;
};

type AddressSnapshotRow = {
  recipient_name: string;
  recipient_phone: string;
  province_id: string;
  province_name: string;
  regency_id: string;
  regency_name: string;
  district_id: string;
  district_name: string;
  village_id: string;
  village_name: string;
  postal_code: string;
  address_detail: string;
  house_number: string | null;
  rt: string | null;
  rw: string | null;
  landmark: string | null;
  courier_note: string | null;
  formatted_address: string;
  fulfillment_method?: string;
  created_at: string;
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

const BASE_FINAL_CHECKS = [
  ["order_number", "Nomor order"], ["customer", "Nama pelanggan"], ["phone", "Nomor telepon"],
  ["product", "Produk"], ["variant", "Varian"], ["color", "Warna"], ["size", "Ukuran"],
  ["quantity", "Quantity"], ["package_content", "Isi paket"], ["package_count", "Jumlah paket"],
  ["fulfillment_method", "Metode fulfillment"], ["package_condition", "Kondisi kemasan"]
] as const;

const CUSTOM_FINAL_CHECKS = [
  ["method", "Metode Custom"], ["design", "Desain aktif"],
  ["placement", "Placement"], ["print_size", "Ukuran cetak"], ["personalization", "Personalisasi"],
  ["qc", "Hasil QC"]
] as const;

const SHIPPING_FINAL_CHECKS = [
  ["recipient_address", "Alamat penerima"], ["postal_code", "Kode pos"]
] as const;

function finalVerificationChecks(isCustom: boolean, method: string) {
  return [
    ...BASE_FINAL_CHECKS,
    ...(isCustom ? CUSTOM_FINAL_CHECKS : []),
    ...(method === "shipping" ? SHIPPING_FINAL_CHECKS : [])
  ];
}

function toLocalInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

type GuidedFulfillmentAction =
  | { kind: "transition"; target: FulfillmentStatus; label: string; instruction: string; next: string }
  | { kind: "final_check"; label: string; instruction: string; next: string }
  | { kind: "edit_tracking"; label: string; instruction: string; next: string }
  | { kind: "pickup_cash"; label: string; instruction: string; next: string }
  | null;

function resolveGuidedFulfillmentAction(record: FulfillmentRow, order: OrderRow | null): GuidedFulfillmentAction {
  if (record.archived_at || ["delivered", "picked_up", "cancelled"].includes(record.status)) return null;
  if (record.status === "preparing") {
    return { kind: "transition", target: "packing", label: "Persiapan Selesai, Mulai Pengemasan", instruction: "Pastikan seluruh item, ukuran, warna, dan jumlah sudah tersedia. Setelah siap, lanjutkan ke pengemasan.", next: "Pengemasan" };
  }
  if (record.status === "packing" && !record.final_verified_at) {
    return { kind: "final_check", label: "Lakukan Pengecekan Akhir", instruction: "Selesaikan checklist isi paket, penerima, jumlah paket, dan kondisi kemasan sebelum penyerahan.", next: record.method === "pickup" ? "Siap Diambil" : "Siap Dikirim" };
  }
  if (record.status === "packing" && record.final_verified_at) {
    const target = record.method === "pickup" ? "ready_for_pickup" : "ready_to_ship";
    return { kind: "transition", target, label: record.method === "pickup" ? "Tandai Barang Siap Diambil" : "Tandai Paket Siap Dikirim", instruction: "Pengecekan akhir sudah selesai. Konfirmasi bahwa paket siap masuk ke tahap penyerahan.", next: record.method === "pickup" ? "Serah Terima di Toko" : "Pilih Kurir dan Masukkan Resi" };
  }
  if (record.status === "ready_to_ship" && (!record.courier || !record.tracking_number)) {
    return { kind: "edit_tracking", label: "Isi Kurir & Resi Resmi", instruction: "Pilih kurir dan masukkan atau pindai nomor resi resmi yang diterbitkan kurir. Nomor Pengiriman DEBRODER bukan nomor resi kurir.", next: "Penyerahan ke Kurir" };
  }
  if (record.status === "ready_to_ship") {
    return { kind: "transition", target: "shipped", label: "Tandai Diserahkan ke Kurir", instruction: `Pastikan paket benar-benar telah diserahkan kepada ${record.courier || "kurir"} dengan resi ${record.tracking_number || "yang tersimpan"}.`, next: "Dalam Perjalanan" };
  }
  if (record.status === "shipped") {
    return { kind: "transition", target: "in_transit", label: "Tandai Dalam Perjalanan", instruction: "Perbarui setelah kurir mulai membawa paket menuju pelanggan.", next: "Pesanan Diterima" };
  }
  if (record.status === "in_transit") {
    return { kind: "transition", target: "delivered", label: "Konfirmasi Pesanan Diterima", instruction: "Gunakan setelah status kurir atau bukti serah terima memastikan paket telah diterima.", next: "Selesai" };
  }
  if (record.status === "ready_for_pickup" && order?.payment_method === "pay_at_store" && !["paid", "terverifikasi"].includes(order.payment_status)) {
    return { kind: "pickup_cash", label: "Terima Pembayaran & Serahkan Pesanan", instruction: "Catat penerimaan pembayaran tunai dan serah terima dalam satu tindakan atomik.", next: "Selesai" };
  }
  if (record.status === "ready_for_pickup") {
    return { kind: "transition", target: "picked_up", label: "Konfirmasi Pesanan Sudah Diambil", instruction: "Pastikan identitas/kode pengambilan cocok dan barang benar-benar telah diserahkan kepada pelanggan.", next: "Selesai" };
  }
  if (record.status === "problem") {
    return { kind: "transition", target: "preparing", label: "Kembalikan ke Persiapan", instruction: "Masalah harus dicatat dan diselesaikan. Kembalikan proses ke tahap aman sebelum melanjutkan.", next: "Persiapan Barang" };
  }
  return null;
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
  const [addressSnapshot, setAddressSnapshot] = useState<AddressSnapshotRow | null>(null);
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
    const [profileResult, itemResult, fileResult, historyResult, revisionResult, workResult, orderResult, profileListResult, addressSnapshotResult] = await Promise.all([
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
        .select("id,order_number,customer_name,company_name,customer_phone,status,delivery_method,payment_method,payment_status,shipping_address,custom_project_snapshot")
        .eq("id", row.order_id)
        .maybeSingle(),
      supabase.from("profiles").select("id,email,role"),
      row.method === "shipping"
        ? supabase
            .from("order_address_snapshots")
            .select("*")
            .eq("order_id", row.order_id)
            .order("version", { ascending: false })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null })
    ]);

    setLoading(false);
    const firstError = itemResult.error || fileResult.error || historyResult.error || revisionResult.error || workResult.error || orderResult.error || addressSnapshotResult.error;
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
    setAddressSnapshot((addressSnapshotResult.data || null) as AddressSnapshotRow | null);
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
      setNotice({ type: "error", text: "Perubahan pengiriman belum dapat disimpan. Coba lagi." });
      return;
    }
    setEditOpen(false);
    setNotice({ type: "success", text: "Detail penyerahan berhasil diperbarui dan revisi disimpan." });
    await loadData();
  }

  async function completeFinalVerification() {
    const checks = finalVerificationChecks(Array.isArray(order?.custom_project_snapshot) && order.custom_project_snapshot.length > 0, record?.method ?? "");
    if (!record || !canManage || working || record.status !== "packing" || checks.some(([key]) => !finalChecklist[key])) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setWorking(true); setNotice(null);
    const result = await supabase.rpc("complete_fulfillment_final_verification", {
      p_fulfillment_id: record.id,
      p_checklist: finalChecklist,
      p_note: finalNote.trim() || null,
      p_expected_updated_at: record.updated_at
    });
    setWorking(false);
    if (result.error) {
      setNotice({ type: "error", text: /admin lain/i.test(result.error.message) ? "Data ini telah diperbarui oleh admin lain. Muat ulang kondisi terbaru." : "Pengecekan akhir belum dapat disimpan. Coba lagi." });
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
      const stale = /status|berubah|admin lain|transisi|tidak valid/i.test(result.error.message);
      setNotice({
        type: "error",
        text: stale
          ? `Tahap pesanan sudah berubah atau tindakan ini tidak lagi tersedia. Data terbaru akan dimuat. (${result.error.message})`
          : `Status penyerahan belum dapat diperbarui: ${result.error.message}`
      });
      await loadData();
      return;
    }
    setTransitionTarget(null);
    setTransitionNote("");
    setTransitionReason("");
    setNotice({ type: "success", text: `Status diperbarui menjadi ${FULFILLMENT_STATUS_LABELS[transitionTarget]}.` });
    await loadData();
  }

  async function completePickupAtStore() {
    if (!record || record.status !== "ready_for_pickup" || working || !canManage) return;
    const notes = window.prompt("Catatan penerimaan pembayaran di toko:")?.trim() || "Pembayaran penuh diterima saat pengambilan";
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setWorking(true);
    setNotice(null);
    const result = await supabase.rpc("complete_ready_stock_pickup_at_store", {
      p_fulfillment_id: record.id,
      p_admin_notes: notes
    });
    setWorking(false);
    if (result.error) {
      setNotice({ type: "error", text: `Pembayaran dan serah terima belum dapat diselesaikan: ${result.error.message}` });
      await loadData();
      return;
    }
    setNotice({ type: "success", text: "Pembayaran tunai dan serah terima berhasil dicatat dalam satu proses." });
    await loadData();
  }

  function runGuidedAction(action: GuidedFulfillmentAction) {
    if (!action || working || !canManage) return;
    if (action.kind === "transition") {
      setTransitionTarget(action.target);
      return;
    }
    if (action.kind === "final_check") {
      document.getElementById("final-verification")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (action.kind === "edit_tracking") {
      setEditOpen(true);
      return;
    }
    void completePickupAtStore();
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
      setNotice({ type: "error", text: "Bukti pengiriman belum dapat diunggah. Periksa file lalu coba lagi." });
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
      setNotice({ type: "error", text: "Informasi bukti pengiriman belum dapat disimpan. Coba lagi." });
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
      setNotice({ type: "error", text: "Bukti pengiriman belum dapat dihapus. Coba lagi." });
      return;
    }
    const storageResult = await supabase.storage.from(file.bucket).remove([file.path]);
    setWorking(false);
    if (storageResult.error) {
      setNotice({ type: "warning", text: "Daftar file sudah diperbarui, tetapi file lama masih perlu dibersihkan. Coba lagi." });
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
      setNotice({ type: "error", text: "Dokumen pengiriman belum dapat diarsipkan. Coba lagi." });
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
      setNotice({ type: "error", text: "Dokumen pengiriman belum dapat dipulihkan. Coba lagi." });
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
      setNotice({ type: "error", text: "Dokumen pengiriman belum dapat dihapus permanen." });
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
  const finalChecks = finalVerificationChecks(isCustomOrder, record.method);
  const transitions = getFulfillmentTransitions(record.method, record.status).filter((target) => !(record.status === "packing" && !record.final_verified_at && ["ready_to_ship", "ready_for_pickup"].includes(target)));
  const guidedAction = resolveGuidedFulfillmentAction(record, order);
  const exceptionTransitions = transitions.filter((target) => {
    if (guidedAction?.kind === "transition" && guidedAction.target === target) return false;
    return target === "problem" || target === "cancelled" || record.status === "problem";
  });
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
          <Data label="Nomor Resi Kurir" value={record.tracking_number || "Belum tersedia"} />
          <Data label="Dibuat" value={formatFulfillmentDate(record.created_at)} />
          <div className="sm:col-span-2 lg:col-span-3"><Data label="Tujuan / Lokasi Pickup" value={record.destination || (record.method === "pickup" ? "Ambil di toko" : "-")} /></div>
          <div className="sm:col-span-2 lg:col-span-3"><Data label="Catatan" value={record.notes || "-"} /></div>
        </section>

        {isCustomOrder && record.method === "shipping" ? (
          addressSnapshot ? (
            <section className="border border-brand-softGray bg-white p-5 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-charcoal/45">Snapshot immutable</p>
                  <h2 className="mt-2 text-xl font-semibold">Alamat Pengiriman Custom</h2>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-brand-green">{addressSnapshot.fulfillment_method === "shipping" ? "Kurir Eksternal" : FULFILLMENT_METHOD_LABELS[record.method]}</span>
              </div>
              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <Data label="Nama Penerima" value={addressSnapshot.recipient_name} />
                <Data label="Nomor Penerima" value={addressSnapshot.recipient_phone} />
                <Data label="Kode Pos" value={addressSnapshot.postal_code} />
                <Data label="Provinsi" value={addressSnapshot.province_name + " · " + addressSnapshot.province_id} />
                <Data label="Kabupaten / Kota" value={addressSnapshot.regency_name + " · " + addressSnapshot.regency_id} />
                <Data label="Kecamatan" value={addressSnapshot.district_name + " · " + addressSnapshot.district_id} />
                <Data label="Kelurahan / Desa" value={addressSnapshot.village_name + " · " + addressSnapshot.village_id} />
                <Data label="Nomor Rumah / Gedung" value={addressSnapshot.house_number || "-"} />
                <Data label="RT / RW" value={[addressSnapshot.rt ? "RT " + addressSnapshot.rt : "", addressSnapshot.rw ? "RW " + addressSnapshot.rw : ""].filter(Boolean).join(" / ") || "-"} />
                <div className="sm:col-span-2 lg:col-span-3"><Data label="Alamat Lengkap" value={addressSnapshot.formatted_address} /></div>
                <Data label="Patokan" value={addressSnapshot.landmark || "-"} />
                <Data label="Catatan Kurir" value={addressSnapshot.courier_note || "-"} />
                <Data label="Disimpan" value={formatFulfillmentDate(addressSnapshot.created_at)} />
              </div>
            </section>
          ) : (
            <AdminAlert type="warning">Snapshot alamat terstruktur belum tersedia untuk Custom shipping ini. Jangan lanjutkan pengecekan akhir sebelum data alamat tervalidasi.</AdminAlert>
          )
        ) : null}

        <section id="guided-action" className="scroll-mt-24 border border-brand-softGray bg-white p-5 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-charcoal/45">Alur Penyerahan Terpandu</p>
          <div className="mt-3 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(240px,340px)] lg:items-start">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-brand-charcoal/55">Tahap saat ini</p>
              <h2 className="mt-1 break-words text-2xl font-semibold">{FULFILLMENT_STATUS_LABELS[record.status]}</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-brand-charcoal/65">
                {guidedAction?.instruction || (record.status === "delivered" || record.status === "picked_up"
                  ? "Penyerahan telah selesai. Tidak ada tindakan operasional berikutnya."
                  : record.status === "cancelled"
                    ? "Penyerahan dibatalkan. Jangan melanjutkan proses pengemasan atau pengiriman."
                    : "Dokumen ini tidak memiliki tindakan utama baru pada tahap sekarang.")}
              </p>
            </div>
            <div className="grid min-w-0 gap-3">
              <Data label="Nomor Pengiriman DEBRODER" value={record.fulfillment_number} />
              <Data label="Berikutnya" value={guidedAction?.next || "Tidak ada tindakan berikutnya"} />
            </div>
          </div>

          {guidedAction ? (
            <button
              type="button"
              onClick={() => runGuidedAction(guidedAction)}
              disabled={!canManage || working}
              className="mt-5 min-h-12 w-full rounded-full bg-brand-charcoal px-6 text-sm font-semibold text-white disabled:opacity-45 sm:w-auto"
            >
              {working ? "Memproses..." : guidedAction.label}
            </button>
          ) : null}

          {!record.archived_at && exceptionTransitions.length > 0 ? (
            <details className="mt-6 border-t border-brand-softGray pt-5">
              <summary className="cursor-pointer text-sm font-semibold">Tindakan pengecualian</summary>
              <p className="mt-2 text-xs leading-5 text-brand-charcoal/55">Gunakan hanya ketika proses normal tidak dapat dilanjutkan. Alasan dan perubahan tetap tercatat dalam audit.</p>
              <div className="mt-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap">
                {exceptionTransitions.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setTransitionTarget(status)}
                    disabled={!canManage || working}
                    className={`min-h-11 rounded-full px-5 text-sm font-semibold disabled:opacity-45 ${
                      ["problem", "cancelled"].includes(status)
                        ? "border border-red-300 text-red-700"
                        : "border border-brand-softGray text-brand-charcoal"
                    }`}
                  >
                    {getFulfillmentTransitionLabel(status)}
                  </button>
                ))}
              </div>
            </details>
          ) : null}
        </section>

        {(record.status === "packing" || record.final_verified_at) ? (
          <section id="final-verification" className="scroll-mt-24 border border-brand-softGray bg-white p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-charcoal/45">{isCustomOrder ? "PESANAN CUSTOM" : "READY STOCK"}</p><h2 className="mt-2 text-xl font-semibold">Pengecekan Akhir</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-brand-charcoal/60">Bandingkan pesanan, isi paket, kondisi kemasan, dan data penerima. {isCustomOrder ? "Hasil QC dan desain aktif juga wajib cocok. " : ""}Pengiriman terkunci sampai semua barang dikonfirmasi.</p></div>{record.final_verified_at ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-brand-green">Selesai {formatFulfillmentDate(record.final_verified_at)}</span> : <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">Wajib diselesaikan</span>}</div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{finalChecks.map(([key, label]) => <label key={key} className="flex min-h-11 items-center gap-3 border border-brand-softGray px-3 text-sm font-semibold"><input type="checkbox" checked={Boolean(finalChecklist[key])} disabled={Boolean(record.final_verified_at) || !canManage} onChange={(event) => setFinalChecklist((current) => ({ ...current, [key]: event.target.checked }))} />{label}</label>)}</div>
            <label className="mt-5 grid gap-2 text-sm font-semibold">Catatan pengecekan akhir<textarea rows={3} value={finalNote} disabled={Boolean(record.final_verified_at) || !canManage} onChange={(event) => setFinalNote(event.target.value)} className="rounded-lg border border-brand-softGray px-4 py-3" /></label>
            {!record.final_verified_at ? <button type="button" onClick={() => void completeFinalVerification()} disabled={working || !canManage || finalChecks.some(([key]) => !finalChecklist[key])} className="mt-5 min-h-11 rounded-full bg-brand-green px-5 text-sm font-semibold text-white disabled:opacity-45">{working ? "Menyimpan..." : "Konfirmasi Pengecekan Akhir"}</button> : <p className="mt-5 text-sm text-brand-charcoal/60">Checklist tersimpan read-only. Perubahan detail paket/penerima pada tahap packing akan membatalkan verifikasi dan mewajibkan pemeriksaan ulang.</p>}
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
                    <p className="font-semibold">{workItem?.work_item_number || "Pekerjaan"}</p>
                    <p className="mt-1 text-sm text-brand-charcoal/60">{workItem?.title || "Data pekerjaan tidak ditemukan"}</p>
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
                  Unggah Bukti
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
              <InputField label="Nomor resi resmi kurir" value={editForm.tracking_number} onChange={(value) => setEditForm({ ...editForm, tracking_number: value })} />
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
