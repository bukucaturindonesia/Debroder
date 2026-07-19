"use client";

import Link from "next/link";
import { type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";
import { AdminAlert, AdminErrorState, AdminLoadingState } from "@/components/admin/ui/AdminFeedback";
import {
  WORK_ITEM_PRIORITY_LABELS,
  WORK_ITEM_STATUS_LABELS,
  canArchiveWorkItem,
  canEditWorkItem,
  formatWorkItemDate,
  formatWorkItemTarget,
  getPhase9WorkItemTransitions,
  getWorkItemTransitionLabel,
  isWorkItemRole,
  isWorkItemViewerRole,
  workItemTransitionNeedsReason,
  isWorkItemSuperAdmin,
  readSnapshotObject,
  type WorkItemJobOrder,
  type WorkItemPriority,
  type WorkItemRow,
  type WorkItemStatus
} from "@/lib/work-items";

type ProfileRow = {
  id: string;
  email: string | null;
  role: string | null;
};

type StatusHistoryRow = {
  id: string;
  from_status: WorkItemStatus | null;
  to_status: WorkItemStatus;
  note: string | null;
  reason: string | null;
  changed_by: string | null;
  changed_at: string;
  metadata: Record<string, unknown>;
};

type RevisionRow = {
  id: string;
  revision_number: number;
  reason: string;
  created_by: string | null;
  created_at: string;
};

type AssignmentHistoryRow = {
  id: string;
  from_user_id: string | null;
  to_user_id: string | null;
  reason: string | null;
  changed_by: string | null;
  changed_at: string;
};

type DependencyRow = {
  work_item_id: string;
  depends_on_work_item_id: string;
  created_by: string | null;
  created_at: string;
};

type DependencyHistoryRow = {
  id: string;
  work_item_id: string;
  depends_on_work_item_id: string;
  action: "added" | "removed";
  actor_id: string | null;
  created_at: string;
};

type EditForm = {
  title: string;
  description: string;
  quantity: number;
  unit: string;
  target_date: string;
  priority: WorkItemPriority;
  reason: string;
};

export function WorkItemDetailAdmin() {
  const params = useParams<{ id?: string | string[] }>();
  const router = useRouter();
  const workItemId = useMemo(() => {
    const raw = params?.id;
    return Array.isArray(raw) ? raw[0] : raw || "";
  }, [params]);

  const [row, setRow] = useState<WorkItemRow | null>(null);
  const [jobOrder, setJobOrder] = useState<WorkItemJobOrder | null>(null);
  const [siblings, setSiblings] = useState<WorkItemRow[]>([]);
  const [dependencies, setDependencies] = useState<DependencyRow[]>([]);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryRow[]>([]);
  const [revisions, setRevisions] = useState<RevisionRow[]>([]);
  const [assignmentHistory, setAssignmentHistory] = useState<AssignmentHistoryRow[]>([]);
  const [dependencyHistory, setDependencyHistory] = useState<DependencyHistoryRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error" | "warning"; text: string } | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    title: "",
    description: "",
    quantity: 1,
    unit: "pcs",
    target_date: "",
    priority: "normal",
    reason: ""
  });
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [assignedTo, setAssignedTo] = useState("");
  const [assignmentReason, setAssignmentReason] = useState("");
  const [dependencyOpen, setDependencyOpen] = useState(false);
  const [dependencyId, setDependencyId] = useState("");
  const [transitionTarget, setTransitionTarget] = useState<WorkItemStatus | null>(null);
  const [transitionNote, setTransitionNote] = useState("");
  const [transitionReason, setTransitionReason] = useState("");
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const canManage = isWorkItemRole(role);
  const canView = isWorkItemViewerRole(role);
  const canTransition = canManage || role === "operator";
  const canDelete = isWorkItemSuperAdmin(role);

  const loadData = useCallback(async () => {
    const supabase = createSupabaseClient();
    if (!supabase || !workItemId) return;
    setLoading(true);
    setNotice(null);

    const sessionResult = await supabase.auth.getSession();
    const userId = sessionResult.data.session?.user.id;
    const itemResult = await supabase
      .from("work_items")
      .select("id,work_item_number,job_order_id,source_order_item_id,source_order_item_service_id,source_mockup_part_id,title,description,quantity,unit,assigned_to,target_date,priority,status,instruction_snapshot,approved_design_snapshot,ready_by,ready_at,started_at,paused_at,resumed_at,completed_at,cancelled_at,cancel_reason,created_by,updated_by,created_at,updated_at,archived_at,archived_by,archive_reason")
      .eq("id", workItemId)
      .maybeSingle();

    if (itemResult.error || !itemResult.data) {
      setLoading(false);
      setRow(null);
      return;
    }

    const nextRow = itemResult.data as WorkItemRow;
    const [profileResult, jobResult, siblingsResult, dependenciesResult, statusResult, revisionsResult, assignmentsResult, dependencyHistoryResult, profilesResult] = await Promise.all([
      userId
        ? supabase.from("profiles").select("role").eq("id", userId).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from("job_orders")
        .select("id,job_order_number,status,priority,target_date,order_snapshot,mockup_snapshot,archived_at")
        .eq("id", nextRow.job_order_id)
        .maybeSingle(),
      supabase
        .from("work_items")
        .select("id,work_item_number,job_order_id,source_order_item_id,source_order_item_service_id,source_mockup_part_id,title,description,quantity,unit,assigned_to,target_date,priority,status,instruction_snapshot,approved_design_snapshot,ready_by,ready_at,started_at,paused_at,resumed_at,completed_at,cancelled_at,cancel_reason,created_by,updated_by,created_at,updated_at,archived_at,archived_by,archive_reason")
        .eq("job_order_id", nextRow.job_order_id)
        .order("created_at", { ascending: true }),
      supabase
        .from("work_item_dependencies")
        .select("work_item_id,depends_on_work_item_id,created_by,created_at")
        .eq("work_item_id", nextRow.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("work_item_status_history")
        .select("id,from_status,to_status,note,reason,changed_by,changed_at,metadata")
        .eq("work_item_id", nextRow.id)
        .order("changed_at", { ascending: false }),
      supabase
        .from("work_item_revisions")
        .select("id,revision_number,reason,created_by,created_at")
        .eq("work_item_id", nextRow.id)
        .order("revision_number", { ascending: false }),
      supabase
        .from("work_item_assignment_history")
        .select("id,from_user_id,to_user_id,reason,changed_by,changed_at")
        .eq("work_item_id", nextRow.id)
        .order("changed_at", { ascending: false }),
      supabase
        .from("work_item_dependency_history")
        .select("id,work_item_id,depends_on_work_item_id,action,actor_id,created_at")
        .eq("work_item_id", nextRow.id)
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("id,email,role")
    ]);

    setLoading(false);
    const firstError = jobResult.error || siblingsResult.error || dependenciesResult.error || statusResult.error || revisionsResult.error || assignmentsResult.error || dependencyHistoryResult.error;
    if (firstError) {
      setNotice({ type: "error", text: "Sebagian detail pekerjaan belum dapat dimuat. Muat ulang halaman atau coba lagi." });
    }

    setRole(typeof profileResult.data?.role === "string" ? profileResult.data.role : null);
    setRow(nextRow);
    setJobOrder((jobResult.data || null) as WorkItemJobOrder | null);
    setSiblings((siblingsResult.data || []) as WorkItemRow[]);
    setDependencies((dependenciesResult.data || []) as DependencyRow[]);
    setStatusHistory((statusResult.data || []) as StatusHistoryRow[]);
    setRevisions((revisionsResult.data || []) as RevisionRow[]);
    setAssignmentHistory((assignmentsResult.data || []) as AssignmentHistoryRow[]);
    setDependencyHistory((dependencyHistoryResult.data || []) as DependencyHistoryRow[]);
    setProfiles((profilesResult.data || []) as ProfileRow[]);
    setEditForm({
      title: nextRow.title,
      description: nextRow.description || "",
      quantity: nextRow.quantity,
      unit: nextRow.unit,
      target_date: nextRow.target_date || "",
      priority: nextRow.priority,
      reason: ""
    });
    setAssignedTo(nextRow.assigned_to || "");
  }, [workItemId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const actors = useMemo(() => {
    const map: Record<string, string> = {};
    for (const profile of profiles) map[profile.id] = profile.email?.trim() || "Akun tanpa email";
    return map;
  }, [profiles]);

  const productionProfiles = useMemo(
    () => profiles.filter((profile) => ["owner", "superadmin", "super_admin", "admin"].includes(profile.role || "")),
    [profiles]
  );

  const siblingMap = useMemo(() => {
    const map: Record<string, WorkItemRow> = {};
    for (const item of siblings) map[item.id] = item;
    return map;
  }, [siblings]);

  const dependencyIds = useMemo(
    () => new Set(dependencies.map((dependency) => dependency.depends_on_work_item_id)),
    [dependencies]
  );

  const dependencyCandidates = useMemo(
    () => siblings.filter((item) => item.id !== row?.id && !item.archived_at && !dependencyIds.has(item.id) && ["draft", "ready"].includes(item.status)),
    [dependencyIds, row?.id, siblings]
  );

  function actorLabel(id: string | null) {
    if (!id) return "Sistem";
    return actors[id] || "Akun tidak tersedia";
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!row || !canManage || working || !canEditWorkItem(row.status)) return;
    if (row.status === "ready" && !editForm.reason.trim()) {
      setNotice({ type: "error", text: "Alasan perubahan wajib diisi untuk pekerjaan yang siap dikerjakan." });
      return;
    }
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setWorking(true);
    setNotice(null);
    const result = await supabase.rpc("update_work_item_draft", {
      p_work_item_id: row.id,
      p_title: editForm.title.trim(),
      p_description: editForm.description.trim() || null,
      p_quantity: editForm.quantity,
      p_unit: editForm.unit.trim() || "pcs",
      p_target_date: editForm.target_date || null,
      p_priority: editForm.priority,
      p_reason: editForm.reason.trim() || null
    });
    setWorking(false);
    if (result.error) {
      setNotice({ type: "error", text: "Perubahan pekerjaan belum berhasil disimpan. Coba lagi." });
      return;
    }
    setEditOpen(false);
    setNotice({ type: "success", text: "Perubahan pekerjaan berhasil disimpan sebagai revisi." });
    await loadData();
  }

  async function saveAssignment() {
    if (!row || !canManage || working) return;
    if (row.status === "ready" && !assignmentReason.trim()) {
      setNotice({ type: "error", text: "Alasan perubahan penanggung jawab wajib diisi." });
      return;
    }
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setWorking(true);
    setNotice(null);
    const result = await supabase.rpc("assign_work_item", {
      p_work_item_id: row.id,
      p_assigned_to: assignedTo || null,
      p_reason: assignmentReason.trim() || null
    });
    setWorking(false);
    if (result.error) {
      setNotice({ type: "error", text: "Penugasan pekerjaan belum berhasil disimpan. Coba lagi." });
      return;
    }
    setAssignmentOpen(false);
    setAssignmentReason("");
    setNotice({ type: "success", text: assignedTo ? "Penanggung jawab berhasil ditetapkan." : "Penanggung jawab berhasil dilepas." });
    await loadData();
  }

  async function addDependency() {
    if (!row || !dependencyId || !canManage || working) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setWorking(true);
    setNotice(null);
    const result = await supabase.rpc("add_work_item_dependency", {
      p_work_item_id: row.id,
      p_depends_on_work_item_id: dependencyId
    });
    setWorking(false);
    if (result.error) {
      setNotice({ type: "error", text: "Keterkaitan pekerjaan belum dapat ditambahkan." });
      return;
    }
    setDependencyId("");
    setDependencyOpen(false);
    setNotice({ type: "success", text: "Ketergantungan pekerjaan berhasil ditambahkan." });
    await loadData();
  }

  async function removeDependency(dependency: DependencyRow) {
    if (!row || !canManage || working) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setWorking(true);
    setNotice(null);
    const result = await supabase.rpc("remove_work_item_dependency", {
      p_work_item_id: row.id,
      p_depends_on_work_item_id: dependency.depends_on_work_item_id
    });
    setWorking(false);
    if (result.error) {
      setNotice({ type: "error", text: "Keterkaitan pekerjaan belum dapat dihapus." });
      return;
    }
    setNotice({ type: "success", text: "Ketergantungan pekerjaan berhasil dihapus." });
    await loadData();
  }

  async function transitionStatus() {
    if (!row || !transitionTarget || !canTransition || working) return;
    if (workItemTransitionNeedsReason(transitionTarget) && !transitionReason.trim()) {
      setNotice({ type: "error", text: "Alasan pembatalan wajib diisi." });
      return;
    }
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setWorking(true);
    setNotice(null);
    const result = await supabase.rpc("transition_work_item_status", {
      p_work_item_id: row.id,
      p_to_status: transitionTarget,
      p_note: transitionNote.trim() || null,
      p_reason: transitionReason.trim() || null
    });
    setWorking(false);
    if (result.error) {
      setNotice({ type: "error", text: "Status belum dapat diubah. Muat ulang data lalu coba lagi." });
      return;
    }
    setTransitionTarget(null);
    setTransitionNote("");
    setTransitionReason("");
    setNotice({ type: "success", text: "Status pekerjaan berhasil diperbarui." });
    await loadData();
  }

  async function archiveItem() {
    if (!row || !archiveReason.trim() || !canManage || working) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setWorking(true);
    setNotice(null);
    const result = await supabase.rpc("archive_work_item", {
      p_work_item_id: row.id,
      p_reason: archiveReason.trim()
    });
    setWorking(false);
    if (result.error) {
      setNotice({ type: "error", text: "Pekerjaan belum dapat diarsipkan. Coba lagi." });
      return;
    }
    router.replace(`/admin/work-items?job_order=${row.job_order_id}`);
    router.refresh();
  }

  async function restoreItem() {
    if (!row || !canManage || working) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setWorking(true);
    setNotice(null);
    const result = await supabase.rpc("restore_work_item", { p_work_item_id: row.id });
    setWorking(false);
    if (result.error) {
      setNotice({ type: "error", text: "Pekerjaan belum dapat dipulihkan. Coba lagi." });
      return;
    }
    setNotice({ type: "success", text: "Pekerjaan berhasil dipulihkan." });
    await loadData();
  }

  async function permanentlyDelete() {
    if (!row || !canDelete || working || deleteConfirmation !== row.work_item_number) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setWorking(true);
    setNotice(null);
    const result = await supabase.rpc("permanently_delete_work_item", { p_work_item_id: row.id });
    setWorking(false);
    if (result.error) {
      setNotice({ type: "error", text: "Pekerjaan belum dapat dihapus permanen." });
      return;
    }
    router.replace(`/admin/work-items?job_order=${row.job_order_id}`);
    router.refresh();
  }

  if (loading) return <AdminLoadingState label="Memuat detail pekerjaan..." />;

  if (!row) {
    return (
      <AdminErrorState
        title="Pekerjaan tidak ditemukan"
        description="Pekerjaan mungkin sudah dihapus atau tautannya tidak valid. Kembali ke daftar dan pilih data yang tersedia."
        action={
          <Link href="/admin/work-items" className="inline-flex min-h-11 items-center rounded-full bg-brand-charcoal px-6 text-sm font-semibold text-white">
            Kembali ke Daftar Pekerjaan
          </Link>
        }
      />
    );
  }

  const transitions = row.archived_at ? [] : getPhase9WorkItemTransitions(row.status, jobOrder?.status);
  const instruction = readSnapshotObject(row.instruction_snapshot);
  const sourceType = row.source_order_item_service_id
    ? "Layanan produksi"
    : row.source_order_item_id
      ? "Produk pesanan"
      : "Pekerjaan manual";

  return (
    <main className="text-brand-charcoal">
      <div className="grid gap-6">
        <AdminPageHeader
          eyebrow="DEBRODER v1.2 · Phase 9"
          title={row.work_item_number}
          description={`${row.title} · ${jobOrder?.job_order_number || "Surat Perintah Kerja tidak tersedia"}`}
          actions={
            <>
              <Link href={`/admin/work-items?job_order=${row.job_order_id}`} className="inline-flex min-h-10 items-center rounded-full border border-brand-softGray bg-white px-5 text-sm font-semibold">
                Kembali
              </Link>
              <Link href="/admin/production" className="inline-flex min-h-10 items-center rounded-full border border-brand-softGray bg-white px-5 text-sm font-semibold">
                Status Produksi
              </Link>
              {jobOrder ? (
                <Link href={`/admin/job-orders/${jobOrder.id}`} className="inline-flex min-h-10 items-center rounded-full border border-brand-softGray bg-white px-5 text-sm font-semibold">
                  Buka Surat Perintah Kerja
                </Link>
              ) : null}
              {!row.archived_at && canManage && canEditWorkItem(row.status) ? (
                <>
                  <button type="button" onClick={() => setEditOpen(true)} className="inline-flex min-h-10 items-center rounded-full border border-brand-softGray bg-white px-5 text-sm font-semibold">
                    Edit
                  </button>
                  <button type="button" onClick={() => setAssignmentOpen(true)} className="inline-flex min-h-10 items-center rounded-full border border-brand-softGray bg-white px-5 text-sm font-semibold">
                    Tugaskan
                  </button>
                </>
              ) : null}
              {!row.archived_at && canManage && canArchiveWorkItem(row.status) ? (
                <button type="button" onClick={() => setArchiveOpen(true)} className="inline-flex min-h-10 items-center rounded-full border border-amber-300 bg-white px-5 text-sm font-semibold text-amber-800">
                  Arsipkan
                </button>
              ) : null}
              {row.archived_at && canManage ? (
                <button type="button" onClick={() => void restoreItem()} disabled={working} className="inline-flex min-h-10 items-center rounded-full border border-brand-green bg-white px-5 text-sm font-semibold text-brand-green disabled:opacity-45">
                  Pulihkan
                </button>
              ) : null}
              {row.archived_at && canDelete ? (
                <button type="button" onClick={() => setDeleteOpen(true)} className="inline-flex min-h-10 items-center rounded-full border border-red-300 bg-white px-5 text-sm font-semibold text-red-700">
                  Hapus Permanen
                </button>
              ) : null}
            </>
          }
        />

        {notice ? <AdminAlert type={notice.type}>{notice.text}</AdminAlert> : null}
        {!canView ? <AdminAlert type="error">Akun ini tidak mempunyai akses ke pekerjaan operasional.</AdminAlert> : !canManage ? <AdminAlert type="info">Mode operator: perubahan dibatasi pada pekerjaan yang ditugaskan kepada akun ini.</AdminAlert> : null}
        {row.archived_at ? (
          <AdminAlert type="warning">
            Pekerjaan diarsipkan {formatWorkItemDate(row.archived_at)} oleh {actorLabel(row.archived_by)}{row.archive_reason ? ` · ${row.archive_reason}` : ""}.
          </AdminAlert>
        ) : null}

        <section className="grid gap-4 border border-brand-softGray bg-white p-5 sm:grid-cols-2 sm:p-7 xl:grid-cols-4">
          <Data label="Status" value={WORK_ITEM_STATUS_LABELS[row.status]} />
          <Data label="Prioritas" value={WORK_ITEM_PRIORITY_LABELS[row.priority]} />
          <Data label="Jumlah" value={`${row.quantity} ${row.unit}`} />
          <Data label="Target" value={formatWorkItemTarget(row.target_date)} />
          <Data label="Penanggung Jawab" value={row.assigned_to ? actorLabel(row.assigned_to) : "Belum ditugaskan"} />
          <Data label="Sumber" value={sourceType} />
          <Data label="Dibuat oleh" value={actorLabel(row.created_by)} />
          <Data label="Diperbarui" value={formatWorkItemDate(row.updated_at)} />
          <Data label="Mulai" value={formatWorkItemDate(row.started_at)} />
          <Data label="Ditahan" value={formatWorkItemDate(row.paused_at)} />
          <Data label="Dilanjutkan" value={formatWorkItemDate(row.resumed_at)} />
        </section>

        {!row.archived_at && canTransition && transitions.length > 0 ? (
          <section className="border border-brand-softGray bg-white p-5 sm:p-7">
            <h2 className="text-xl font-semibold">Kontrol Pekerjaan</h2>
            <p className="mt-2 text-sm leading-6 text-brand-charcoal/60">
              Mulai, tahan, lanjutkan, atau kirim pekerjaan ke Pemeriksaan Kualitas. Keputusan lulus dan perbaikan diselesaikan pada tahap tersebut.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {transitions.map((target) => (
                <button
                  key={target}
                  type="button"
                  onClick={() => setTransitionTarget(target)}
                  className={`rounded-full px-5 py-2.5 text-sm font-semibold ${target === "cancelled" ? "border border-red-300 text-red-700" : target === "on_hold" ? "border border-amber-300 text-amber-800" : "bg-brand-charcoal text-white"}`}
                >
                  {getWorkItemTransitionLabel(target)}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {row.status === "awaiting_qc" ? (
          <section className="border border-brand-softGray bg-white p-5 sm:p-7">
            <AdminAlert type="success">Pekerjaan sudah diserahkan ke Pemeriksaan Kualitas dan tidak dapat ditandai selesai sebelum pemeriksaan berakhir.</AdminAlert>
            <Link href={`/admin/quality-control?work_item=${row.id}`} className="mt-4 inline-flex min-h-10 items-center rounded-full bg-brand-green px-5 text-sm font-semibold text-white">
              Buka Pemeriksaan Kualitas
            </Link>
          </section>
        ) : null}

        <section className="grid gap-5 border border-brand-softGray bg-white p-5 sm:p-7 lg:grid-cols-2">
          <div>
            <h2 className="text-xl font-semibold">Instruksi Pekerjaan</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-brand-charcoal/70">{row.description || "Belum ada instruksi tambahan."}</p>
          </div>
          <div>
            <h2 className="text-xl font-semibold">Sumber Terkunci</h2>
            <div className="mt-3 grid gap-2 text-sm text-brand-charcoal/65">
              <span>Jenis: {sourceType}</span>
              <span>Nama sumber: {String(instruction.product_name || instruction.service_name || row.title)}</span>
              <span>Varian: {[instruction.variant_name, instruction.color, instruction.size].filter(Boolean).map(String).join(" · ") || "-"}</span>
              <span>Snapshot desain: {Object.keys(row.approved_design_snapshot || {}).length > 0 ? "Tersedia" : "Belum tersedia"}</span>
            </div>
          </div>
        </section>

        <section className="border border-brand-softGray bg-white p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Dependensi Pekerjaan</h2>
              <p className="mt-2 text-sm leading-6 text-brand-charcoal/60">
                Pekerjaan ini baru dapat dimulai setelah pekerjaan yang menjadi ketergantungannya selesai. Ketergantungan berulang tidak diizinkan.
              </p>
            </div>
            {!row.archived_at && canManage && canEditWorkItem(row.status) ? (
              <button type="button" onClick={() => setDependencyOpen(true)} disabled={dependencyCandidates.length === 0} className="rounded-full border border-brand-softGray px-5 py-2.5 text-sm font-semibold disabled:opacity-45">
                Tambah Dependensi
              </button>
            ) : null}
          </div>
          {dependencies.length === 0 ? (
            <p className="mt-5 border border-dashed border-brand-softGray bg-brand-offWhite p-5 text-sm text-brand-charcoal/60">Belum ada dependensi.</p>
          ) : (
            <div className="mt-5 grid gap-3">
              {dependencies.map((dependency) => {
                const source = siblingMap[dependency.depends_on_work_item_id];
                return (
                  <article key={dependency.depends_on_work_item_id} className="flex flex-wrap items-center justify-between gap-3 border border-brand-softGray p-4">
                    <div>
                      <p className="font-semibold">{source?.work_item_number || "Pekerjaan tidak tersedia"}</p>
                      <p className="mt-1 text-sm text-brand-charcoal/60">{source?.title || "Data sumber tidak tersedia"}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {source ? (
                        <Link href={`/admin/work-items/${source.id}`} className="rounded-full border border-brand-softGray px-4 py-2 text-sm font-semibold">Lihat</Link>
                      ) : null}
                      {!row.archived_at && canManage && canEditWorkItem(row.status) ? (
                        <button type="button" onClick={() => void removeDependency(dependency)} disabled={working} className="rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-45">Hapus</button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <HistoryBlock title="Riwayat Status" empty="Belum ada riwayat status.">
            {statusHistory.map((history) => (
              <article key={history.id} className="border-b border-brand-softGray py-4 last:border-b-0">
                <p className="font-semibold">
                  {history.from_status ? WORK_ITEM_STATUS_LABELS[history.from_status] : "Dibuat"} → {WORK_ITEM_STATUS_LABELS[history.to_status]}
                </p>
                <p className="mt-1 text-sm text-brand-charcoal/60">{formatWorkItemDate(history.changed_at)} · {actorLabel(history.changed_by)}</p>
                {history.note || history.reason ? <p className="mt-2 text-sm leading-6 text-brand-charcoal/70">{[history.note, history.reason].filter(Boolean).join(" · ")}</p> : null}
              </article>
            ))}
          </HistoryBlock>

          <HistoryBlock title="Riwayat Penugasan" empty="Belum ada perubahan penanggung jawab.">
            {assignmentHistory.map((history) => (
              <article key={history.id} className="border-b border-brand-softGray py-4 last:border-b-0">
                <p className="font-semibold">{actorLabel(history.from_user_id)} → {history.to_user_id ? actorLabel(history.to_user_id) : "Belum ditugaskan"}</p>
                <p className="mt-1 text-sm text-brand-charcoal/60">{formatWorkItemDate(history.changed_at)} · diubah oleh {actorLabel(history.changed_by)}</p>
                {history.reason ? <p className="mt-2 text-sm text-brand-charcoal/70">{history.reason}</p> : null}
              </article>
            ))}
          </HistoryBlock>

          <HistoryBlock title="Riwayat Revisi" empty="Belum ada revisi detail.">
            {revisions.map((revision) => (
              <article key={revision.id} className="border-b border-brand-softGray py-4 last:border-b-0">
                <p className="font-semibold">Revisi {revision.revision_number}</p>
                <p className="mt-1 text-sm text-brand-charcoal/60">{formatWorkItemDate(revision.created_at)} · {actorLabel(revision.created_by)}</p>
                <p className="mt-2 text-sm text-brand-charcoal/70">{revision.reason}</p>
              </article>
            ))}
          </HistoryBlock>

          <HistoryBlock title="Riwayat Dependensi" empty="Belum ada perubahan dependensi.">
            {dependencyHistory.map((history) => {
              const source = siblingMap[history.depends_on_work_item_id];
              return (
                <article key={history.id} className="border-b border-brand-softGray py-4 last:border-b-0">
                  <p className="font-semibold">{history.action === "added" ? "Ditambahkan" : "Dihapus"}: {source?.work_item_number || "Pekerjaan lama"}</p>
                  <p className="mt-1 text-sm text-brand-charcoal/60">{formatWorkItemDate(history.created_at)} · {actorLabel(history.actor_id)}</p>
                </article>
              );
            })}
          </HistoryBlock>
        </section>
      </div>

      {editOpen ? (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/60 p-4 sm:p-8">
          <form onSubmit={saveEdit} className="mx-auto max-w-2xl bg-white p-6 shadow-2xl sm:p-8">
            <h2 className="text-2xl font-semibold">Edit Pekerjaan</h2>
            <p className="mt-2 text-sm text-brand-charcoal/60">Perubahan disimpan sebagai revisi dan tidak mengubah snapshot sumber.</p>
            <label className="mt-6 block text-sm font-semibold">Judul<input required value={editForm.title} onChange={(event) => setEditForm((current) => ({ ...current, title: event.target.value }))} className="mt-2 min-h-11 w-full rounded-lg border border-brand-softGray px-4" /></label>
            <label className="mt-4 block text-sm font-semibold">Instruksi<textarea rows={4} value={editForm.description} onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))} className="mt-2 w-full rounded-lg border border-brand-softGray px-4 py-3" /></label>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold">Jumlah<input required min={1} type="number" value={editForm.quantity} onChange={(event) => setEditForm((current) => ({ ...current, quantity: Number(event.target.value) }))} className="mt-2 min-h-11 w-full rounded-lg border border-brand-softGray px-4" /></label>
              <label className="block text-sm font-semibold">Satuan<input required value={editForm.unit} onChange={(event) => setEditForm((current) => ({ ...current, unit: event.target.value }))} className="mt-2 min-h-11 w-full rounded-lg border border-brand-softGray px-4" /></label>
              <label className="block text-sm font-semibold">Target<input type="date" value={editForm.target_date} onChange={(event) => setEditForm((current) => ({ ...current, target_date: event.target.value }))} className="mt-2 min-h-11 w-full rounded-lg border border-brand-softGray px-4" /></label>
              <label className="block text-sm font-semibold">Prioritas<select value={editForm.priority} onChange={(event) => setEditForm((current) => ({ ...current, priority: event.target.value as WorkItemPriority }))} className="mt-2 min-h-11 w-full rounded-lg border border-brand-softGray px-4">{Object.entries(WORK_ITEM_PRIORITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            </div>
            <label className="mt-4 block text-sm font-semibold">Alasan perubahan{row.status === "ready" ? " (wajib)" : ""}<textarea rows={3} value={editForm.reason} onChange={(event) => setEditForm((current) => ({ ...current, reason: event.target.value }))} className="mt-2 w-full rounded-lg border border-brand-softGray px-4 py-3" /></label>
            <ModalActions working={working} primary="Simpan Perubahan" onCancel={() => setEditOpen(false)} />
          </form>
        </div>
      ) : null}

      {assignmentOpen ? (
        <Modal title="Tugaskan Pekerjaan" description="Pilih penanggung jawab produksi. Setiap perubahan dicatat dalam riwayat penugasan.">
          <select value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)} className="mt-5 min-h-11 w-full rounded-lg border border-brand-softGray px-4">
            <option value="">Belum ditugaskan</option>
            {productionProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.email || "Akun tanpa email"}</option>)}
          </select>
          <textarea rows={3} value={assignmentReason} onChange={(event) => setAssignmentReason(event.target.value)} placeholder={row.status === "ready" ? "Alasan perubahan wajib diisi" : "Alasan perubahan (opsional)"} className="mt-4 w-full rounded-lg border border-brand-softGray px-4 py-3" />
          <ModalActions working={working} primary="Simpan Penugasan" onPrimary={() => void saveAssignment()} onCancel={() => setAssignmentOpen(false)} />
        </Modal>
      ) : null}

      {dependencyOpen ? (
        <Modal title="Tambah Ketergantungan" description="Pilih pekerjaan yang harus diselesaikan lebih dahulu. Ketergantungan lintas Surat Perintah Kerja dan berulang tidak diizinkan.">
          <select value={dependencyId} onChange={(event) => setDependencyId(event.target.value)} className="mt-5 min-h-11 w-full rounded-lg border border-brand-softGray px-4">
            <option value="">Pilih Pekerjaan</option>
            {dependencyCandidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.work_item_number} · {candidate.title}</option>)}
          </select>
          <ModalActions working={working} primary="Tambah Dependensi" onPrimary={() => void addDependency()} onCancel={() => setDependencyOpen(false)} />
        </Modal>
      ) : null}

      {transitionTarget ? (
        <Modal title="Ubah Status Pekerjaan" description={`${WORK_ITEM_STATUS_LABELS[row.status]} → ${WORK_ITEM_STATUS_LABELS[transitionTarget]}`}>
          <textarea rows={3} value={transitionNote} onChange={(event) => setTransitionNote(event.target.value)} placeholder="Catatan tindakan (opsional)" className="mt-5 w-full rounded-lg border border-brand-softGray px-4 py-3" />
          {workItemTransitionNeedsReason(transitionTarget) ? <textarea rows={3} value={transitionReason} onChange={(event) => setTransitionReason(event.target.value)} placeholder={transitionTarget === "on_hold" ? "Alasan penahanan wajib diisi" : transitionTarget === "rework" ? "Alasan perbaikan wajib diisi" : "Alasan pembatalan wajib diisi"} className="mt-4 w-full rounded-lg border border-amber-300 px-4 py-3" /> : null}
          <ModalActions working={working} primary="Konfirmasi Status" onPrimary={() => void transitionStatus()} onCancel={() => setTransitionTarget(null)} />
        </Modal>
      ) : null}

      {archiveOpen ? (
        <Modal title="Arsipkan Pekerjaan?" description="Pekerjaan dapat dipulihkan dari arsip selama Surat Perintah Kerja induknya masih dapat diedit.">
          <textarea rows={4} value={archiveReason} onChange={(event) => setArchiveReason(event.target.value)} placeholder="Alasan arsip wajib diisi" className="mt-5 w-full rounded-lg border border-brand-softGray px-4 py-3" />
          <ModalActions working={working} primary="Arsipkan" onPrimary={() => void archiveItem()} onCancel={() => setArchiveOpen(false)} danger />
        </Modal>
      ) : null}

      {deleteOpen ? (
        <Modal title="Hapus Pekerjaan Secara Permanen?" description="Tindakan Super Admin ini tidak dapat dibatalkan. Pekerjaan yang mempunyai catatan pemeriksaan kualitas tidak dapat dihapus.">
          <label className="mt-5 block text-sm font-semibold">Ketik <strong>{row.work_item_number}</strong><input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} className="mt-2 min-h-11 w-full rounded-lg border border-red-300 px-4" /></label>
          <ModalActions working={working} primary="Hapus Permanen" onPrimary={() => void permanentlyDelete()} onCancel={() => setDeleteOpen(false)} danger />
        </Modal>
      ) : null}
    </main>
  );
}

function Data({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-charcoal/45">{label}</p><p className="mt-2 break-words text-sm font-semibold">{value}</p></div>;
}

function HistoryBlock({ title, empty, children }: { title: string; empty: string; children?: ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return <section className="border border-brand-softGray bg-white p-5 sm:p-7"><h2 className="text-xl font-semibold">{title}</h2><div className="mt-3">{hasChildren ? children : <p className="py-4 text-sm text-brand-charcoal/60">{empty}</p>}</div></section>;
}

function Modal({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/60 p-4"><section className="my-6 w-full max-w-xl bg-white p-6 shadow-2xl sm:p-8"><h2 className="text-2xl font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-brand-charcoal/60">{description}</p>{children}</section></div>;
}

function ModalActions({ working, primary, onPrimary, onCancel, danger = false }: { working: boolean; primary: string; onPrimary?: () => void; onCancel: () => void; danger?: boolean }) {
  return <div className="mt-7 flex flex-wrap gap-3"><button type={onPrimary ? "button" : "submit"} onClick={onPrimary} disabled={working} className={`rounded-full px-6 py-3 text-sm font-semibold text-white disabled:opacity-45 ${danger ? "bg-red-700" : "bg-brand-green"}`}>{working ? "Memproses..." : primary}</button><button type="button" onClick={onCancel} disabled={working} className="rounded-full border border-brand-softGray px-6 py-3 text-sm font-semibold">Batal</button></div>;
}
