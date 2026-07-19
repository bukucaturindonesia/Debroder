"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";

type MockupSet = {
  id: string;
  quotation_id: string;
  title: string;
  status: string;
  notes: string | null;
  archived_at: string | null;
  archived_by: string | null;
  archive_reason: string | null;
  created_at: string;
  updated_at: string;
};

type MockupPart = {
  id: string;
  mockup_set_id: string;
  quotation_item_id: string | null;
  name: string;
  position: string | null;
  is_required: boolean;
  status: string;
  admin_notes: string | null;
  customer_notes: string | null;
  sort_order: number;
  archived_at: string | null;
  archived_by: string | null;
  archive_reason: string | null;
  created_at: string;
  updated_at: string;
};

type MockupFile = {
  id: string;
  mockup_part_id: string;
  version_number: number;
  bucket_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  notes: string | null;
  is_current: boolean;
  created_at: string;
};

type QuotationItem = {
  id: string;
  product_name_snapshot: string;
  color_name_snapshot: string | null;
  variant_name_snapshot: string | null;
  size_name_snapshot: string | null;
};

type HistoryRow = {
  id: string;
  mockup_set_id: string;
  mockup_part_id: string | null;
  action: string;
  from_status: string | null;
  to_status: string | null;
  note: string | null;
  changed_by: string | null;
  created_at: string;
};

const SUPER_ROLES = ["owner", "superadmin", "super_admin"];

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft Mockup",
  preparing: "Sedang Disiapkan",
  ready_for_review: "Siap Diperiksa",
  awaiting_customer: "Menunggu Persetujuan Pelanggan",
  revision_requested: "Revisi Diminta Pelanggan",
  approved: "Disetujui Pelanggan"
};

function statusLabel(status: string) {
  return STATUS_LABELS[status] || "Status mockup belum dikenali";
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatBytes(value: number | null) {
  if (!value) return "-";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function sanitizeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-");
}

export function MockupApprovalManager() {
  const params = useParams<{ id?: string | string[] }>();
  const quotationId = useMemo(() => {
    const raw = params?.id;
    return Array.isArray(raw) ? raw[0] : raw || "";
  }, [params]);

  const [quotationStatus, setQuotationStatus] = useState("");
  const [role, setRole] = useState("");
  const [sets, setSets] = useState<MockupSet[]>([]);
  const [parts, setParts] = useState<MockupPart[]>([]);
  const [files, setFiles] = useState<MockupFile[]>([]);
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"active" | "archive" | "history">("active");
  const [selectedSetId, setSelectedSetId] = useState("");
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const [setMode, setSetMode] = useState<"add" | "edit" | null>(null);
  const [editingSet, setEditingSet] = useState<MockupSet | null>(null);
  const [setTitle, setSetTitle] = useState("Mockup Desain");
  const [setNotes, setSetNotes] = useState("");

  const [partMode, setPartMode] = useState<"add" | "edit" | null>(null);
  const [editingPart, setEditingPart] = useState<MockupPart | null>(null);
  const [partName, setPartName] = useState("");
  const [partPosition, setPartPosition] = useState("");
  const [partItemId, setPartItemId] = useState("");
  const [partRequired, setPartRequired] = useState(true);
  const [partNotes, setPartNotes] = useState("");

  const [archiveTarget, setArchiveTarget] = useState<
    { type: "set" | "part"; id: string; label: string } | null
  >(null);
  const [archiveReason, setArchiveReason] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<
    { type: "set" | "part"; id: string; label: string } | null
  >(null);

  const [uploadPart, setUploadPart] = useState<MockupPart | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadNotes, setUploadNotes] = useState("");
  const [reviewDays, setReviewDays] = useState("7");
  const [reviewUrl, setReviewUrl] = useState("");
  const [showReviewLink, setShowReviewLink] = useState(false);

  async function loadData() {
    const supabase = createSupabaseClient();
    if (!supabase || !quotationId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;

    const [quotationResult, setResult, itemResult, profileResult] =
      await Promise.all([
        supabase
          .from("quotations")
          .select("status")
          .eq("id", quotationId)
          .maybeSingle(),
        supabase
          .from("mockup_sets")
          .select(
            "id,quotation_id,title,status,notes,archived_at,archived_by,archive_reason,created_at,updated_at"
          )
          .eq("quotation_id", quotationId)
          .order("created_at", { ascending: false }),
        supabase
          .from("quotation_items")
          .select(
            "id,product_name_snapshot,color_name_snapshot,variant_name_snapshot,size_name_snapshot"
          )
          .eq("quotation_id", quotationId)
          .is("archived_at", null)
          .order("sort_order", { ascending: true }),
        user
          ? supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
          : Promise.resolve({ data: null, error: null })
      ]);

    if (
      quotationResult.error ||
      setResult.error ||
      itemResult.error ||
      profileResult.error
    ) {
      setLoading(false);
      setMessage("Data mockup belum berhasil dimuat.");
      return;
    }

    const nextSets = (setResult.data || []) as MockupSet[];
    const setIds = nextSets.map((row) => row.id);

    let nextParts: MockupPart[] = [];
    let nextFiles: MockupFile[] = [];
    let nextHistory: HistoryRow[] = [];

    if (setIds.length) {
      const [partResult, historyResult] = await Promise.all([
        supabase
          .from("mockup_parts")
          .select(
            "id,mockup_set_id,quotation_item_id,name,position,is_required,status,admin_notes,customer_notes,sort_order,archived_at,archived_by,archive_reason,created_at,updated_at"
          )
          .in("mockup_set_id", setIds)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true }),
        supabase
          .from("mockup_approval_history")
          .select(
            "id,mockup_set_id,mockup_part_id,action,from_status,to_status,note,changed_by,created_at"
          )
          .in("mockup_set_id", setIds)
          .order("created_at", { ascending: false })
      ]);

      if (partResult.error || historyResult.error) {
        setLoading(false);
        setMessage("Sebagian data mockup belum berhasil dimuat.");
        return;
      }

      nextParts = (partResult.data || []) as MockupPart[];
      nextHistory = (historyResult.data || []) as HistoryRow[];

      const partIds = nextParts.map((row) => row.id);
      if (partIds.length) {
        const fileResult = await supabase
          .from("mockup_files")
          .select(
            "id,mockup_part_id,version_number,bucket_id,storage_path,file_name,mime_type,size_bytes,notes,is_current,created_at"
          )
          .in("mockup_part_id", partIds)
          .order("version_number", { ascending: false });

        if (fileResult.error) {
          setLoading(false);
          setMessage("Riwayat file mockup belum berhasil dimuat.");
          return;
        }
        nextFiles = (fileResult.data || []) as MockupFile[];
      }
    }

    setQuotationStatus(String(quotationResult.data?.status || ""));
    setRole(String(profileResult.data?.role || ""));
    setSets(nextSets);
    setParts(nextParts);
    setFiles(nextFiles);
    setItems((itemResult.data || []) as QuotationItem[]);
    setHistory(nextHistory);
    setSelectedSetId((current) => {
      if (current && nextSets.some((row) => row.id === current)) return current;
      return nextSets.find((row) => !row.archived_at)?.id || nextSets[0]?.id || "";
    });
    setLoading(false);
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotationId]);

  const activeSets = sets.filter((row) => !row.archived_at);
  const archivedSets = sets.filter((row) => Boolean(row.archived_at));
  const selectedSet = sets.find((row) => row.id === selectedSetId) || null;
  const selectedParts = parts.filter(
    (row) => row.mockup_set_id === selectedSetId
  );
  const activeParts = selectedParts.filter((row) => !row.archived_at);
  const archivedParts = selectedParts.filter((row) => Boolean(row.archived_at));
  const isSuperAdmin = SUPER_ROLES.includes(role);
  const canCreate = quotationStatus === "approved";

  function currentFile(partId: string) {
    return files.find((row) => row.mockup_part_id === partId && row.is_current);
  }

  function fileHistory(partId: string) {
    return files
      .filter((row) => row.mockup_part_id === partId)
      .sort((a, b) => b.version_number - a.version_number);
  }

  function openAddSet() {
    if (!canCreate) {
      setMessage(
        "Mockup baru hanya dapat dibuat setelah penawaran disetujui pelanggan."
      );
      return;
    }
    setEditingSet(null);
    setSetTitle("Mockup Desain");
    setSetNotes("");
    setSetMode("add");
  }

  function openEditSet(row: MockupSet) {
    setEditingSet(row);
    setSetTitle(row.title);
    setSetNotes(row.notes || "");
    setSetMode("edit");
  }

  async function saveSet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (workingId || !setTitle.trim()) return;

    const supabase = createSupabaseClient();
    if (!supabase) return;

    const actionId = editingSet?.id || "new-set";
    setWorkingId(actionId);
    setMessage("");

    const result =
      setMode === "edit" && editingSet
        ? await supabase
            .from("mockup_sets")
            .update({
              title: setTitle.trim(),
              notes: setNotes.trim() || null,
              updated_at: new Date().toISOString()
            })
            .eq("id", editingSet.id)
            .is("archived_at", null)
        : await supabase
            .from("mockup_sets")
            .insert({
              quotation_id: quotationId,
              title: setTitle.trim(),
              notes: setNotes.trim() || null
            })
            .select("id")
            .single();

    setWorkingId(null);

    if (result.error) {
      setMessage(
        setMode === "add"
          ? "Mockup gagal dibuat. Pastikan penawaran sudah disetujui."
          : "Perubahan mockup gagal disimpan."
      );
      return;
    }

    setSetMode(null);
    setEditingSet(null);
    setMessage(
      setMode === "add"
        ? "Mockup berhasil dibuat."
        : "Perubahan mockup berhasil disimpan."
    );
    await loadData();
  }

  function openAddPart() {
    if (!selectedSet || selectedSet.archived_at) {
      setMessage("Pilih mockup aktif terlebih dahulu.");
      return;
    }
    setEditingPart(null);
    setPartName("");
    setPartPosition("");
    setPartItemId(items[0]?.id || "");
    setPartRequired(true);
    setPartNotes("");
    setPartMode("add");
  }

  function openEditPart(row: MockupPart) {
    setEditingPart(row);
    setPartName(row.name);
    setPartPosition(row.position || "");
    setPartItemId(row.quotation_item_id || "");
    setPartRequired(row.is_required);
    setPartNotes(row.admin_notes || "");
    setPartMode("edit");
  }

  async function savePart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSet || workingId || !partName.trim()) return;

    const supabase = createSupabaseClient();
    if (!supabase) return;

    const actionId = editingPart?.id || "new-part";
    setWorkingId(actionId);
    setMessage("");

    const payload = {
      mockup_set_id: selectedSet.id,
      quotation_item_id: partItemId || null,
      name: partName.trim(),
      position: partPosition.trim() || null,
      is_required: partRequired,
      admin_notes: partNotes.trim() || null,
      updated_at: new Date().toISOString()
    };

    const result =
      partMode === "edit" && editingPart
        ? await supabase
            .from("mockup_parts")
            .update(payload)
            .eq("id", editingPart.id)
            .is("archived_at", null)
        : await supabase.from("mockup_parts").insert(payload);

    setWorkingId(null);

    if (result.error) {
      setMessage("Bagian desain gagal disimpan.");
      return;
    }

    setPartMode(null);
    setEditingPart(null);
    setMessage(
      partMode === "add"
        ? "Bagian desain berhasil ditambahkan."
        : "Bagian desain berhasil diperbarui."
    );
    await loadData();
  }

  async function archiveSelected() {
    if (!archiveTarget || workingId) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;

    setWorkingId(archiveTarget.id);
    const rpc =
      archiveTarget.type === "set"
        ? "archive_mockup_set"
        : "archive_mockup_part";
    const args =
      archiveTarget.type === "set"
        ? {
            p_mockup_set_id: archiveTarget.id,
            p_reason: archiveReason.trim() || null
          }
        : {
            p_mockup_part_id: archiveTarget.id,
            p_reason: archiveReason.trim() || null
          };

    const { error } = await supabase.rpc(rpc, args);
    setWorkingId(null);

    if (error) {
      setMessage("Data mockup gagal dipindahkan ke Gudang Arsip.");
      return;
    }

    setArchiveTarget(null);
    setArchiveReason("");
    setTab("archive");
    setMessage("Data berhasil dipindahkan ke Gudang Arsip.");
    await loadData();
  }

  async function restore(type: "set" | "part", id: string) {
    if (workingId) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;

    setWorkingId(id);
    const rpc = type === "set" ? "restore_mockup_set" : "restore_mockup_part";
    const args =
      type === "set"
        ? { p_mockup_set_id: id }
        : { p_mockup_part_id: id };
    const { error } = await supabase.rpc(rpc, args);
    setWorkingId(null);

    if (error) {
      setMessage("Data mockup gagal dipulihkan.");
      return;
    }

    setTab("active");
    setMessage("Data mockup berhasil dipulihkan.");
    await loadData();
  }

  async function permanentlyDelete() {
    if (!deleteTarget || workingId || !isSuperAdmin) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;

    setWorkingId(deleteTarget.id);
    const rpc =
      deleteTarget.type === "set"
        ? "permanently_delete_mockup_set"
        : "permanently_delete_mockup_part";
    const args =
      deleteTarget.type === "set"
        ? { p_mockup_set_id: deleteTarget.id }
        : { p_mockup_part_id: deleteTarget.id };
    const { error } = await supabase.rpc(rpc, args);
    setWorkingId(null);

    if (error) {
      setMessage("Hapus permanen ditolak atau gagal diproses.");
      return;
    }

    setDeleteTarget(null);
    setMessage("Data mockup berhasil dihapus permanen.");
    await loadData();
  }

  async function uploadMockup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!uploadPart || !uploadFile || workingId) return;

    if (uploadFile.size > 15 * 1024 * 1024) {
      setMessage("Ukuran file maksimal 15 MB.");
      return;
    }

    const allowed = [
      "image/png",
      "image/jpeg",
      "image/webp",
      "application/pdf"
    ];
    if (!allowed.includes(uploadFile.type)) {
      setMessage("File mockup harus berupa PNG, JPG, WEBP, atau PDF.");
      return;
    }

    const supabase = createSupabaseClient();
    if (!supabase || !selectedSet) return;

    setWorkingId(uploadPart.id);
    setMessage("");

    const safeName = sanitizeFileName(uploadFile.name);
    const path = `mockups/${quotationId}/${selectedSet.id}/${uploadPart.id}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("customer-designs")
      .upload(path, uploadFile, {
        cacheControl: "3600",
        upsert: false,
        contentType: uploadFile.type
      });

    if (uploadError) {
      setWorkingId(null);
      setMessage("File mockup gagal diunggah.");
      return;
    }

    const { error: registerError } = await supabase.rpc("register_mockup_file", {
      p_mockup_part_id: uploadPart.id,
      p_bucket_id: "customer-designs",
      p_storage_path: path,
      p_file_name: uploadFile.name,
      p_mime_type: uploadFile.type || null,
      p_size_bytes: uploadFile.size,
      p_notes: uploadNotes.trim() || null
    });

    if (registerError) {
      await supabase.storage.from("customer-designs").remove([path]);
      setWorkingId(null);
      setMessage("File terunggah, tetapi riwayat versinya gagal disimpan.");
      return;
    }

    setWorkingId(null);
    setUploadPart(null);
    setUploadFile(null);
    setUploadNotes("");
    setMessage("File mockup berhasil diunggah sebagai versi baru.");
    await loadData();
  }

  async function viewFile(file: MockupFile) {
    const supabase = createSupabaseClient();
    if (!supabase) return;

    const { data, error } = await supabase.storage
      .from(file.bucket_id)
      .createSignedUrl(file.storage_path, 60 * 10);

    if (error || !data?.signedUrl) {
      setMessage("File mockup belum dapat dibuka.");
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function markReady() {
    if (!selectedSet || workingId) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;

    setWorkingId(selectedSet.id);
    const { error } = await supabase.rpc("mark_mockup_ready_for_review", {
      p_mockup_set_id: selectedSet.id,
      p_note: "Seluruh bagian wajib sudah memiliki file terbaru."
    });
    setWorkingId(null);

    if (error) {
      setMessage(
        "Mockup belum siap diperiksa. Pastikan setiap bagian wajib sudah memiliki file."
      );
      return;
    }

    setMessage("Mockup sudah ditandai siap diperiksa.");
    await loadData();
  }


  async function createReviewLink() {
    if (!selectedSet || workingId) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;

    const days = Math.max(1, Math.min(30, Math.floor(Number(reviewDays) || 7)));
    setWorkingId(selectedSet.id);
    setMessage("");

    const { data, error } = await supabase.rpc("create_mockup_review_link", {
      p_mockup_set_id: selectedSet.id,
      p_expires_in_days: days
    });

    setWorkingId(null);

    if (error || !data?.[0]?.token) {
      setMessage(
        "Tautan belum dapat dibuat. Pastikan mockup sudah berstatus Siap Diperiksa."
      );
      return;
    }

    const url = `${window.location.origin}/persetujuan/mockup/${data[0].token}`;
    setReviewUrl(url);
    setShowReviewLink(true);
    setMessage("Tautan persetujuan pelanggan berhasil dibuat.");
    await loadData();
  }

  async function copyReviewLink() {
    if (!reviewUrl) return;
    try {
      await navigator.clipboard.writeText(reviewUrl);
      setMessage("Tautan persetujuan berhasil disalin.");
    } catch {
      setMessage("Tautan belum dapat disalin otomatis. Salin secara manual.");
    }
  }

  async function revokeReviewLink() {
    if (!selectedSet || workingId) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;

    setWorkingId(selectedSet.id);
    const { error } = await supabase.rpc("revoke_mockup_review_link", {
      p_mockup_set_id: selectedSet.id
    });
    setWorkingId(null);

    if (error) {
      setMessage("Tautan persetujuan gagal dinonaktifkan.");
      return;
    }

    setReviewUrl("");
    setShowReviewLink(false);
    setMessage("Tautan persetujuan pelanggan sudah dinonaktifkan.");
    await loadData();
  }

  async function prepareRevision(part: MockupPart) {
    if (workingId) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;

    setWorkingId(part.id);
    const { error } = await supabase.rpc("prepare_mockup_part_revision", {
      p_mockup_part_id: part.id,
      p_note: "Revisi mulai dikerjakan oleh admin."
    });
    setWorkingId(null);

    if (error) {
      setMessage("Bagian desain belum dapat dipindahkan ke proses revisi.");
      return;
    }

    setMessage(
      "Bagian desain masuk proses revisi. Unggah file versi baru setelah perbaikan selesai."
    );
    await loadData();
  }

  if (loading) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex min-h-10 items-center rounded-full border border-brand-softGray bg-white px-4 text-sm font-semibold opacity-50"
      >
        Memuat mockup...
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setMessage("");
        }}
        className="inline-flex min-h-10 items-center rounded-full border border-brand-softGray bg-white px-4 text-sm font-semibold transition hover:border-brand-charcoal"
      >
        Mockup & Persetujuan
      </button>

      {open ? (
        <div className="fixed inset-0 z-[94] overflow-y-auto bg-black/45 p-4 sm:p-8">
          <section className="mx-auto max-w-7xl border border-brand-softGray bg-brand-offWhite shadow-2xl">
            <header className="flex flex-col gap-5 border-b border-brand-softGray bg-white p-5 lg:flex-row lg:items-start lg:justify-between lg:p-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-charcoal/45">
                  v1.2 · Phase 3B
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  Mockup & Persetujuan Desain
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-brand-charcoal/60">
                  Kelola mockup, bagian desain, file versi, dan kesiapan pemeriksaan sebelum dikirim kepada pelanggan.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={openAddSet}
                  disabled={!canCreate}
                  className="rounded-full bg-brand-green px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Tambah Mockup
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={Boolean(workingId)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-brand-softGray bg-white text-xl"
                  aria-label="Tutup"
                >
                  ×
                </button>
              </div>
            </header>

            <div className="p-5 lg:p-7">
              {!canCreate ? (
                <div className="border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
                  Mockup baru dapat dibuat setelah status penawaran menjadi Disetujui Pelanggan.
                </div>
              ) : null}

              {message ? (
                <div className="mt-4 border border-brand-softGray bg-white p-4 text-sm font-semibold">
                  {message}
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  ["active", "Mockup Aktif"],
                  ["archive", "Gudang Arsip"],
                  ["history", "Riwayat Aktivitas"]
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTab(value as typeof tab)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${
                      tab === value
                        ? "bg-brand-charcoal text-white"
                        : "border border-brand-softGray bg-white"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {tab === "active" ? (
                <div className="mt-6 grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
                  <aside className="grid content-start gap-3">
                    {activeSets.map((row) => (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => setSelectedSetId(row.id)}
                        className={`border p-4 text-left ${
                          selectedSetId === row.id
                            ? "border-brand-charcoal bg-brand-charcoal text-white"
                            : "border-brand-softGray bg-white"
                        }`}
                      >
                        <p className="font-semibold">{row.title}</p>
                        <p className="mt-2 text-xs opacity-70">
                          {statusLabel(row.status)}
                        </p>
                      </button>
                    ))}

                    {!activeSets.length ? (
                      <div className="border border-dashed border-brand-softGray bg-white p-6 text-center">
                        <p className="font-semibold">Belum ada mockup aktif</p>
                      </div>
                    ) : null}
                  </aside>

                  <div className="grid content-start gap-5">
                    {selectedSet && !selectedSet.archived_at ? (
                      <>
                        <section className="border border-brand-softGray bg-white p-5">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-charcoal/45">
                                Mockup Aktif
                              </p>
                              <h3 className="mt-2 text-2xl font-semibold">
                                {selectedSet.title}
                              </h3>
                              <p className="mt-2 text-sm text-brand-charcoal/60">
                                {selectedSet.notes || "Tidak ada catatan mockup."}
                              </p>
                              <span className="mt-4 inline-flex rounded-full border border-brand-softGray px-3 py-1.5 text-xs font-semibold">
                                {statusLabel(selectedSet.status)}
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => openEditSet(selectedSet)}
                                className="rounded-full border border-brand-softGray px-4 py-2 text-sm font-semibold"
                              >
                                Edit Mockup
                              </button>
                              <button
                                type="button"
                                onClick={openAddPart}
                                className="rounded-full bg-brand-charcoal px-4 py-2 text-sm font-semibold text-white"
                              >
                                Tambah Bagian
                              </button>
                              <button
                                type="button"
                                onClick={() => void markReady()}
                                disabled={Boolean(workingId)}
                                className="rounded-full border border-brand-green px-4 py-2 text-sm font-semibold text-brand-green disabled:opacity-45"
                              >
                                Tandai Siap Diperiksa
                              </button>
                              {selectedSet.status === "ready_for_review" ? (
                                <button
                                  type="button"
                                  onClick={() => setShowReviewLink(true)}
                                  className="rounded-full bg-brand-green px-4 py-2 text-sm font-semibold text-white"
                                >
                                  Kirim ke Pelanggan
                                </button>
                              ) : null}
                              {selectedSet.status === "awaiting_customer" ? (
                                <button
                                  type="button"
                                  onClick={() => void revokeReviewLink()}
                                  disabled={Boolean(workingId)}
                                  className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-45"
                                >
                                  Nonaktifkan Tautan
                                </button>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => {
                                  setArchiveTarget({
                                    type: "set",
                                    id: selectedSet.id,
                                    label: selectedSet.title
                                  });
                                  setArchiveReason("");
                                }}
                                className="rounded-full border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-800"
                              >
                                Arsipkan
                              </button>
                            </div>
                          </div>
                        </section>

                        <section className="border border-brand-softGray bg-white p-5">
                          <div className="flex items-end justify-between gap-4">
                            <div>
                              <h3 className="text-xl font-semibold">
                                Bagian Desain
                              </h3>
                              <p className="mt-2 text-sm text-brand-charcoal/60">
                                Setiap bagian wajib dapat memiliki file dan riwayat versi sendiri.
                              </p>
                            </div>
                            <span className="text-sm font-semibold">
                              {activeParts.length} bagian
                            </span>
                          </div>

                          <div className="mt-5 grid gap-4">
                            {activeParts.map((part) => {
                              const latestFile = currentFile(part.id);
                              const versions = fileHistory(part.id);
                              const item = items.find(
                                (row) => row.id === part.quotation_item_id
                              );

                              return (
                                <article
                                  key={part.id}
                                  className="border border-brand-softGray bg-brand-offWhite p-4"
                                >
                                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <h4 className="font-semibold">
                                          {part.name}
                                        </h4>
                                        {part.is_required ? (
                                          <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                                            Wajib
                                          </span>
                                        ) : (
                                          <span className="rounded-full border border-brand-softGray bg-white px-2.5 py-1 text-xs font-semibold">
                                            Opsional
                                          </span>
                                        )}
                                      </div>
                                      <p className="mt-2 text-sm text-brand-charcoal/60">
                                        {[
                                          item?.product_name_snapshot,
                                          part.position,
                                          statusLabel(part.status)
                                        ]
                                          .filter(Boolean)
                                          .join(" · ")}
                                      </p>
                                      {part.admin_notes ? (
                                        <p className="mt-2 text-sm text-brand-charcoal/60">
                                          Catatan: {part.admin_notes}
                                        </p>
                                      ) : null}

                                      <div className="mt-4">
                                        {latestFile ? (
                                          <>
                                            <p className="text-sm font-semibold">
                                              File terbaru: versi{" "}
                                              {latestFile.version_number}
                                            </p>
                                            <p className="mt-1 text-xs text-brand-charcoal/55">
                                              {latestFile.file_name} ·{" "}
                                              {formatBytes(latestFile.size_bytes)}
                                            </p>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                void viewFile(latestFile)
                                              }
                                              className="mt-2 text-sm font-semibold underline"
                                            >
                                              Buka File
                                            </button>
                                          </>
                                        ) : (
                                          <p className="text-sm font-semibold text-amber-800">
                                            Belum ada file mockup
                                          </p>
                                        )}
                                      </div>

                                      {versions.length > 1 ? (
                                        <details className="mt-4">
                                          <summary className="cursor-pointer text-sm font-semibold">
                                            Riwayat {versions.length} versi file
                                          </summary>
                                          <div className="mt-3 grid gap-2">
                                            {versions.map((file) => (
                                              <button
                                                key={file.id}
                                                type="button"
                                                onClick={() =>
                                                  void viewFile(file)
                                                }
                                                className="border border-brand-softGray bg-white p-3 text-left text-sm"
                                              >
                                                Versi {file.version_number} ·{" "}
                                                {file.file_name} ·{" "}
                                                {formatDate(file.created_at)}
                                              </button>
                                            ))}
                                          </div>
                                        </details>
                                      ) : null}
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                      {part.status === "revision_requested" ? (
                                        <button
                                          type="button"
                                          onClick={() => void prepareRevision(part)}
                                          disabled={Boolean(workingId)}
                                          className="rounded-full bg-amber-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-45"
                                        >
                                          Mulai Revisi
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setUploadPart(part);
                                            setUploadFile(null);
                                            setUploadNotes("");
                                          }}
                                          className="rounded-full bg-brand-green px-4 py-2 text-sm font-semibold text-white"
                                        >
                                          Unggah File
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => openEditPart(part)}
                                        className="rounded-full border border-brand-softGray px-4 py-2 text-sm font-semibold"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setArchiveTarget({
                                            type: "part",
                                            id: part.id,
                                            label: part.name
                                          });
                                          setArchiveReason("");
                                        }}
                                        className="rounded-full border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-800"
                                      >
                                        Arsipkan
                                      </button>
                                    </div>
                                  </div>
                                </article>
                              );
                            })}

                            {!activeParts.length ? (
                              <div className="border border-dashed border-brand-softGray bg-brand-offWhite p-8 text-center">
                                <p className="font-semibold">
                                  Belum ada bagian desain
                                </p>
                                <p className="mt-2 text-sm text-brand-charcoal/60">
                                  Tambahkan bagian seperti depan, belakang, dada kiri, nama, atau nomor.
                                </p>
                              </div>
                            ) : null}
                          </div>
                        </section>

                        <div className="border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
                          Mockup yang berstatus Siap Diperiksa dapat dikirim melalui tautan publik aman. Pelanggan dapat menyetujui atau meminta revisi untuk setiap bagian secara terpisah.
                        </div>
                      </>
                    ) : (
                      <div className="border border-dashed border-brand-softGray bg-white p-8 text-center">
                        <p className="font-semibold">
                          Pilih atau buat mockup aktif
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {tab === "archive" ? (
                <div className="mt-6 grid gap-6">
                  <section>
                    <h3 className="text-xl font-semibold">Mockup Diarsipkan</h3>
                    <div className="mt-4 grid gap-3">
                      {archivedSets.map((row) => (
                        <article
                          key={row.id}
                          className="border border-brand-softGray bg-white p-4"
                        >
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                              <p className="font-semibold">{row.title}</p>
                              <p className="mt-2 text-xs leading-5 text-brand-charcoal/55">
                                Diarsipkan: {formatDate(row.archived_at)}
                                <br />
                                Oleh: {row.archived_by || "-"}
                                <br />
                                Alasan: {row.archive_reason || "-"}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => void restore("set", row.id)}
                                disabled={Boolean(workingId)}
                                className="rounded-full border border-brand-softGray px-4 py-2 text-sm font-semibold disabled:opacity-45"
                              >
                                Pulihkan
                              </button>
                              {isSuperAdmin ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDeleteTarget({
                                      type: "set",
                                      id: row.id,
                                      label: row.title
                                    })
                                  }
                                  className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700"
                                >
                                  Hapus Permanen
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </article>
                      ))}
                      {!archivedSets.length ? (
                        <p className="border border-dashed border-brand-softGray bg-white p-6 text-center font-semibold">
                          Gudang Arsip mockup kosong
                        </p>
                      ) : null}
                    </div>
                  </section>

                  {selectedSet ? (
                    <section>
                      <h3 className="text-xl font-semibold">
                        Bagian Desain Diarsipkan
                      </h3>
                      <div className="mt-4 grid gap-3">
                        {archivedParts.map((row) => (
                          <article
                            key={row.id}
                            className="border border-brand-softGray bg-white p-4"
                          >
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                              <div>
                                <p className="font-semibold">{row.name}</p>
                                <p className="mt-2 text-xs leading-5 text-brand-charcoal/55">
                                  Diarsipkan: {formatDate(row.archived_at)}
                                  <br />
                                  Oleh: {row.archived_by || "-"}
                                  <br />
                                  Alasan: {row.archive_reason || "-"}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => void restore("part", row.id)}
                                  className="rounded-full border border-brand-softGray px-4 py-2 text-sm font-semibold"
                                >
                                  Pulihkan
                                </button>
                                {isSuperAdmin ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setDeleteTarget({
                                        type: "part",
                                        id: row.id,
                                        label: row.name
                                      })
                                    }
                                    className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700"
                                  >
                                    Hapus Permanen
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          </article>
                        ))}
                        {!archivedParts.length ? (
                          <p className="border border-dashed border-brand-softGray bg-white p-6 text-center font-semibold">
                            Tidak ada bagian desain yang diarsipkan pada mockup terpilih
                          </p>
                        ) : null}
                      </div>
                    </section>
                  ) : null}
                </div>
              ) : null}

              {tab === "history" ? (
                <div className="mt-6 grid gap-3">
                  {history.map((row) => (
                    <article
                      key={row.id}
                      className="border-l-2 border-brand-charcoal bg-white p-4 pl-5"
                    >
                      <p className="font-semibold">{row.action}</p>
                      <p className="mt-1 text-xs text-brand-charcoal/55">
                        {formatDate(row.created_at)} · {row.changed_by || "-"}
                      </p>
                      {row.note ? (
                        <p className="mt-2 text-sm text-brand-charcoal/65">
                          {row.note}
                        </p>
                      ) : null}
                    </article>
                  ))}
                  {!history.length ? (
                    <p className="border border-dashed border-brand-softGray bg-white p-6 text-center font-semibold">
                      Belum ada aktivitas mockup
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}


      {showReviewLink && selectedSet ? (
        <ModalShell title="Kirim Mockup ke Pelanggan">
          <p className="text-sm leading-6 text-brand-charcoal/65">
            Buat tautan privat untuk pelanggan. Tautan lama otomatis dinonaktifkan ketika tautan baru dibuat.
          </p>
          <label className="mt-5 block text-sm font-semibold">
            Masa berlaku tautan
            <select
              value={reviewDays}
              onChange={(event) => setReviewDays(event.target.value)}
              className="mt-2 min-h-11 w-full rounded-lg border border-brand-softGray px-4"
            >
              <option value="3">3 hari</option>
              <option value="7">7 hari</option>
              <option value="14">14 hari</option>
              <option value="30">30 hari</option>
            </select>
          </label>

          {reviewUrl ? (
            <div className="mt-5 border border-brand-softGray bg-brand-offWhite p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-charcoal/45">
                Tautan Persetujuan
              </p>
              <p className="mt-2 break-all text-sm font-semibold">{reviewUrl}</p>
              <button
                type="button"
                onClick={() => void copyReviewLink()}
                className="mt-4 rounded-full bg-brand-charcoal px-5 py-2.5 text-sm font-semibold text-white"
              >
                Salin Tautan
              </button>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void createReviewLink()}
              disabled={Boolean(workingId)}
              className="rounded-full bg-brand-green px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {workingId ? "Membuat Tautan..." : "Buat Tautan Baru"}
            </button>
            <button
              type="button"
              onClick={() => setShowReviewLink(false)}
              disabled={Boolean(workingId)}
              className="rounded-full border border-brand-softGray px-6 py-3 text-sm font-semibold"
            >
              Tutup
            </button>
          </div>
        </ModalShell>
      ) : null}

      {setMode ? (
        <ModalShell title={setMode === "add" ? "Tambah Mockup" : "Edit Mockup"}>
          <form onSubmit={saveSet}>
            <label className="text-sm font-semibold">
              Nama mockup
              <input
                value={setTitle}
                onChange={(event) => setSetTitle(event.target.value)}
                className="mt-2 min-h-11 w-full rounded-lg border border-brand-softGray px-4"
              />
            </label>
            <label className="mt-4 block text-sm font-semibold">
              Catatan
              <textarea
                rows={4}
                value={setNotes}
                onChange={(event) => setSetNotes(event.target.value)}
                className="mt-2 w-full rounded-lg border border-brand-softGray px-4 py-3"
              />
            </label>
            <ModalActions
              working={Boolean(workingId)}
              submitLabel={
                setMode === "add" ? "Simpan Mockup" : "Simpan Perubahan"
              }
              onCancel={() => setSetMode(null)}
            />
          </form>
        </ModalShell>
      ) : null}

      {partMode ? (
        <ModalShell
          title={partMode === "add" ? "Tambah Bagian Desain" : "Edit Bagian Desain"}
        >
          <form onSubmit={savePart}>
            <label className="text-sm font-semibold">
              Nama bagian
              <input
                value={partName}
                onChange={(event) => setPartName(event.target.value)}
                placeholder="Contoh: Depan, Belakang, Dada Kiri"
                className="mt-2 min-h-11 w-full rounded-lg border border-brand-softGray px-4"
              />
            </label>
            <label className="mt-4 block text-sm font-semibold">
              Produk terkait
              <select
                value={partItemId}
                onChange={(event) => setPartItemId(event.target.value)}
                className="mt-2 min-h-11 w-full rounded-lg border border-brand-softGray px-4"
              >
                <option value="">Tidak dikaitkan ke produk tertentu</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.product_name_snapshot} ·{" "}
                    {item.color_name_snapshot ||
                      item.variant_name_snapshot ||
                      "Tanpa warna"}{" "}
                    · {item.size_name_snapshot || "Tanpa ukuran"}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-4 block text-sm font-semibold">
              Posisi
              <input
                value={partPosition}
                onChange={(event) => setPartPosition(event.target.value)}
                placeholder="Contoh: tengah depan"
                className="mt-2 min-h-11 w-full rounded-lg border border-brand-softGray px-4"
              />
            </label>
            <label className="mt-4 flex items-center gap-3 text-sm font-semibold">
              <input
                type="checkbox"
                checked={partRequired}
                onChange={(event) => setPartRequired(event.target.checked)}
              />
              Bagian ini wajib disetujui
            </label>
            <label className="mt-4 block text-sm font-semibold">
              Catatan admin
              <textarea
                rows={4}
                value={partNotes}
                onChange={(event) => setPartNotes(event.target.value)}
                className="mt-2 w-full rounded-lg border border-brand-softGray px-4 py-3"
              />
            </label>
            <ModalActions
              working={Boolean(workingId)}
              submitLabel={
                partMode === "add" ? "Simpan Bagian" : "Simpan Perubahan"
              }
              onCancel={() => setPartMode(null)}
            />
          </form>
        </ModalShell>
      ) : null}

      {uploadPart ? (
        <ModalShell title={`Unggah File — ${uploadPart.name}`}>
          <form onSubmit={uploadMockup}>
            <label className="text-sm font-semibold">
              File mockup
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.pdf,image/png,image/jpeg,image/webp,application/pdf"
                onChange={(event) =>
                  setUploadFile(event.target.files?.[0] || null)
                }
                className="mt-2 block w-full rounded-lg border border-brand-softGray bg-white p-3 text-sm"
              />
            </label>
            <p className="mt-2 text-xs leading-5 text-brand-charcoal/55">
              Format PNG, JPG, WEBP, atau PDF. Maksimal 15 MB. File baru tidak menimpa file lama dan otomatis menjadi versi terbaru.
            </p>
            <label className="mt-4 block text-sm font-semibold">
              Catatan versi
              <textarea
                rows={4}
                value={uploadNotes}
                onChange={(event) => setUploadNotes(event.target.value)}
                className="mt-2 w-full rounded-lg border border-brand-softGray px-4 py-3"
              />
            </label>
            <ModalActions
              working={Boolean(workingId)}
              submitLabel="Unggah sebagai Versi Baru"
              onCancel={() => setUploadPart(null)}
            />
          </form>
        </ModalShell>
      ) : null}

      {archiveTarget ? (
        <ModalShell title={`Arsipkan ${archiveTarget.label}?`}>
          <p className="text-sm leading-6 text-brand-charcoal/65">
            Data tidak akan hilang permanen dan dapat dipulihkan melalui Gudang Arsip.
          </p>
          <textarea
            rows={4}
            value={archiveReason}
            onChange={(event) => setArchiveReason(event.target.value)}
            placeholder="Alasan arsip"
            className="mt-4 w-full rounded-lg border border-brand-softGray px-4 py-3"
          />
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void archiveSelected()}
              disabled={Boolean(workingId)}
              className="rounded-full bg-amber-700 px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {workingId ? "Mengarsipkan..." : "Pindahkan ke Gudang Arsip"}
            </button>
            <button
              type="button"
              onClick={() => setArchiveTarget(null)}
              disabled={Boolean(workingId)}
              className="rounded-full border border-brand-softGray px-6 py-3 text-sm font-semibold"
            >
              Batal
            </button>
          </div>
        </ModalShell>
      ) : null}

      {deleteTarget ? (
        <ModalShell title={`Hapus permanen ${deleteTarget.label}?`}>
          <p className="text-sm leading-6 text-brand-charcoal/65">
            Data beserta file dan riwayat terkait akan dihapus permanen dan tidak dapat dipulihkan.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void permanentlyDelete()}
              disabled={Boolean(workingId)}
              className="rounded-full bg-red-700 px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
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
        </ModalShell>
      ) : null}
    </>
  );
}

function ModalShell({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[105] overflow-y-auto bg-black/60 p-4 sm:p-8">
      <section className="mx-auto max-w-xl border border-brand-softGray bg-white p-6 shadow-2xl sm:p-7">
        <h2 className="text-2xl font-semibold">{title}</h2>
        <div className="mt-6">{children}</div>
      </section>
    </div>
  );
}

function ModalActions({
  working,
  submitLabel,
  onCancel
}: {
  working: boolean;
  submitLabel: string;
  onCancel: () => void;
}) {
  return (
    <div className="mt-6 flex flex-wrap gap-3">
      <button
        type="submit"
        disabled={working}
        className="rounded-full bg-brand-green px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {working ? "Menyimpan..." : submitLabel}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={working}
        className="rounded-full border border-brand-softGray px-6 py-3 text-sm font-semibold"
      >
        Batal
      </button>
    </div>
  );
}
