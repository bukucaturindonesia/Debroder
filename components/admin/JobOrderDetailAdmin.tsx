"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";
import { AdminAlert, AdminErrorState, AdminLoadingState } from "@/components/admin/ui/AdminFeedback";
import {
  JOB_ORDER_PRIORITY_LABELS,
  JOB_ORDER_STATUS_LABELS,
  canArchiveJobOrder,
  canEditJobOrder,
  formatJobOrderDate,
  getFoundationTransitions,
  type JobOrderPriority,
  type JobOrderRow,
  type JobOrderStatus
} from "@/lib/job-orders";

type HistoryRow = {
  id: string;
  from_status: JobOrderStatus | null;
  to_status: JobOrderStatus;
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

type EditForm = {
  target_date: string;
  priority: JobOrderPriority;
  internal_notes: string;
  production_notes: string;
  reason: string;
};

function objectValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value : [];
}

export function JobOrderDetailAdmin() {
  const params = useParams<{ id?: string | string[] }>();
  const router = useRouter();
  const jobOrderId = useMemo(() => {
    const raw = params?.id;
    return Array.isArray(raw) ? raw[0] : raw || "";
  }, [params]);

  const [row, setRow] = useState<JobOrderRow | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [revisions, setRevisions] = useState<RevisionRow[]>([]);
  const [actors, setActors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error" | "warning"; text: string } | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    target_date: "",
    priority: "normal",
    internal_notes: "",
    production_notes: "",
    reason: ""
  });
  const [transitionTarget, setTransitionTarget] = useState<JobOrderStatus | null>(null);
  const [transitionNote, setTransitionNote] = useState("");
  const [transitionReason, setTransitionReason] = useState("");
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState("");

  const loadData = useCallback(async () => {
    const supabase = createSupabaseClient();
    if (!supabase || !jobOrderId) return;
    setLoading(true);
    setNotice(null);
    const [jobResult, historyResult, revisionsResult, actorsResult] = await Promise.all([
      supabase
        .from("job_orders")
        .select("id,job_order_number,order_id,quotation_id,approved_mockup_set_id,status,priority,target_date,internal_notes,production_notes,order_snapshot,mockup_snapshot,payment_snapshot,progress_percentage,ready_by,ready_at,released_by,released_at,created_by,updated_by,created_at,updated_at,archived_at,archived_by,archive_reason")
        .eq("id", jobOrderId)
        .maybeSingle(),
      supabase
        .from("job_order_status_history")
        .select("id,from_status,to_status,note,reason,changed_by,changed_at,metadata")
        .eq("job_order_id", jobOrderId)
        .order("changed_at", { ascending: false }),
      supabase
        .from("job_order_revisions")
        .select("id,revision_number,reason,created_by,created_at")
        .eq("job_order_id", jobOrderId)
        .order("revision_number", { ascending: false }),
      supabase.from("profiles").select("id,email")
    ]);
    setLoading(false);
    if (jobResult.error || !jobResult.data) {
      setRow(null);
      return;
    }
    const nextRow = jobResult.data as JobOrderRow;
    setRow(nextRow);
    setHistory((historyResult.data || []) as HistoryRow[]);
    setRevisions((revisionsResult.data || []) as RevisionRow[]);
    setEditForm({
      target_date: nextRow.target_date || "",
      priority: nextRow.priority,
      internal_notes: nextRow.internal_notes || "",
      production_notes: nextRow.production_notes || "",
      reason: ""
    });
    const actorMap: Record<string, string> = {};
    for (const actor of actorsResult.data || []) {
      if (typeof actor.id === "string") {
        actorMap[actor.id] = typeof actor.email === "string" && actor.email.trim() ? actor.email : "Akun tanpa email";
      }
    }
    setActors(actorMap);
  }, [jobOrderId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function actorLabel(id: string | null) {
    if (!id) return "Sistem";
    return actors[id] || "Akun tidak tersedia";
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!row || working || !canEditJobOrder(row.status)) return;
    if (row.status === "ready" && !editForm.reason.trim()) {
      setNotice({ type: "error", text: "Alasan perubahan wajib diisi untuk Job Order Siap Dirilis." });
      return;
    }
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setWorking(true);
    const result = await supabase.rpc("update_job_order_draft", {
      p_job_order_id: row.id,
      p_target_date: editForm.target_date || null,
      p_priority: editForm.priority,
      p_internal_notes: editForm.internal_notes.trim() || null,
      p_production_notes: editForm.production_notes.trim() || null,
      p_reason: editForm.reason.trim() || null
    });
    setWorking(false);
    if (result.error) {
      setNotice({ type: "error", text: result.error.message || "Perubahan Job Order gagal disimpan." });
      return;
    }
    setEditOpen(false);
    setNotice({ type: "success", text: "Perubahan Job Order berhasil disimpan dan dicatat sebagai revisi." });
    await loadData();
  }

  async function transitionStatus() {
    if (!row || !transitionTarget || working) return;
    if (["cancelled", "on_hold"].includes(transitionTarget) && !transitionReason.trim()) {
      setNotice({ type: "error", text: "Alasan wajib diisi untuk tindakan ini." });
      return;
    }
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setWorking(true);
    const result = await supabase.rpc("transition_job_order_status", {
      p_job_order_id: row.id,
      p_to_status: transitionTarget,
      p_note: transitionNote.trim() || null,
      p_reason: transitionReason.trim() || null
    });
    setWorking(false);
    if (result.error) {
      setNotice({ type: "error", text: result.error.message || "Perubahan status ditolak." });
      return;
    }
    setTransitionTarget(null);
    setTransitionNote("");
    setTransitionReason("");
    setNotice({ type: "success", text: "Status Job Order berhasil diperbarui." });
    await loadData();
  }

  async function archiveJobOrder() {
    if (!row || working || !archiveReason.trim()) return;
    const supabase = createSupabaseClient();
    if (!supabase) return;
    setWorking(true);
    const result = await supabase.rpc("archive_job_order", {
      p_job_order_id: row.id,
      p_reason: archiveReason.trim()
    });
    setWorking(false);
    if (result.error) {
      setNotice({ type: "error", text: result.error.message || "Job Order gagal diarsipkan." });
      return;
    }
    router.replace("/admin/job-orders");
    router.refresh();
  }

  if (loading) return <AdminLoadingState label="Memuat detail Job Order..." />;

  if (!row) {
    return (
      <AdminErrorState
        title="Job Order tidak ditemukan"
        description="Job Order mungkin sudah dihapus atau tautannya tidak valid."
        action={
          <Link href="/admin/job-orders" className="inline-flex min-h-11 items-center rounded-full bg-brand-charcoal px-6 text-sm font-semibold text-white">
            Kembali ke Job Order
          </Link>
        }
      />
    );
  }

  const orderSnapshot = objectValue(row.order_snapshot);
  const sourceOrder = objectValue(orderSnapshot.order);
  const sourceItems = arrayValue(orderSnapshot.items);
  const paymentSnapshot = objectValue(row.payment_snapshot);
  const foundationTransitions = getFoundationTransitions(row.status);

  return (
    <main className="text-brand-charcoal">
      <div className="grid gap-6">
        <AdminPageHeader
          eyebrow="DEBRODER v1.2 · Phase 7–8"
          title={row.job_order_number}
          description={`${String(sourceOrder.order_number || "Pesanan")}${sourceOrder.customer_name ? ` · ${String(sourceOrder.customer_name)}` : ""}`}
          actions={
            <>
              <Link href="/admin/job-orders" className="inline-flex min-h-10 items-center rounded-full border border-brand-softGray bg-white px-5 text-sm font-semibold">
                Kembali
              </Link>
              <Link href={`/admin/work-items?job_order=${row.id}`} className="inline-flex min-h-10 items-center rounded-full border border-brand-softGray bg-white px-5 text-sm font-semibold">
                Kelola Work Item
              </Link>
              {canEditJobOrder(row.status) ? (
                <button type="button" onClick={() => setEditOpen(true)} className="inline-flex min-h-10 items-center rounded-full border border-brand-softGray bg-white px-5 text-sm font-semibold">
                  Edit Job Order
                </button>
              ) : null}
              {canArchiveJobOrder(row.status) ? (
                <button type="button" onClick={() => setArchiveOpen(true)} className="inline-flex min-h-10 items-center rounded-full border border-amber-300 bg-white px-5 text-sm font-semibold text-amber-800">
                  Arsipkan
                </button>
              ) : null}
            </>
          }
        />

        {notice ? <AdminAlert type={notice.type}>{notice.text}</AdminAlert> : null}

        <section className="grid gap-4 border border-brand-softGray bg-white p-5 sm:grid-cols-2 lg:grid-cols-4 sm:p-7">
          <Data label="Status" value={JOB_ORDER_STATUS_LABELS[row.status]} />
          <Data label="Prioritas" value={JOB_ORDER_PRIORITY_LABELS[row.priority]} />
          <Data label="Target Produksi" value={row.target_date || "Belum ditentukan"} />
          <Data label="Progress" value={`${Number(row.progress_percentage || 0)}%`} />
          <Data label="Dibuat Oleh" value={actorLabel(row.created_by)} />
          <Data label="Dibuat" value={formatJobOrderDate(row.created_at)} />
          <Data label="Siap Dirilis" value={row.ready_at ? `${formatJobOrderDate(row.ready_at)} · ${actorLabel(row.ready_by)}` : "-"} />
          <Data label="Dirilis" value={row.released_at ? `${formatJobOrderDate(row.released_at)} · ${actorLabel(row.released_by)}` : "-"} />
        </section>

        {foundationTransitions.length ? (
          <section className="border border-brand-softGray bg-white p-5 sm:p-7">
            <h2 className="text-xl font-semibold">Tindakan Fase 7</h2>
            <p className="mt-2 text-sm leading-6 text-brand-charcoal/60">
              Fondasi ini mengelola Draft dan Siap Dirilis. Pelepasan ke produksi baru dibuka setelah Work Item Phase 8 tersedia.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {foundationTransitions.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setTransitionTarget(status)}
                  className={`rounded-full px-5 py-2.5 text-sm font-semibold ${status === "cancelled" ? "border border-red-200 text-red-700" : "bg-brand-green text-white"}`}
                >
                  {status === "ready" ? "Tandai Siap Dirilis" : status === "released" ? "Rilis ke Produksi" : status === "draft" ? "Kembalikan ke Draft" : "Batalkan Job Order"}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <section className="grid gap-5 lg:grid-cols-2">
          <article className="border border-brand-softGray bg-white p-5 sm:p-7">
            <h2 className="text-xl font-semibold">Instruksi Produksi</h2>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-brand-charcoal/70">{row.production_notes || "Belum ada instruksi produksi."}</p>
            <h3 className="mt-6 text-sm font-semibold uppercase tracking-[0.15em] text-brand-charcoal/50">Catatan Internal</h3>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-brand-charcoal/70">{row.internal_notes || "-"}</p>
          </article>
          <article className="border border-brand-softGray bg-white p-5 sm:p-7">
            <h2 className="text-xl font-semibold">Snapshot Pembayaran</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Data label="Syarat Terpenuhi" value={paymentSnapshot.production_eligible ? "Ya" : "Tidak"} />
              <Data label="Jenis Kebijakan" value={String(paymentSnapshot.requirement_type || "-")} />
              <Data label="Pembayaran Efektif" value={String(paymentSnapshot.effective_total ?? "-")} />
              <Data label="Nominal Wajib" value={String(paymentSnapshot.required_amount ?? "-")} />
            </div>
          </article>
        </section>

        <section className="border border-brand-softGray bg-white p-5 sm:p-7">
          <h2 className="text-xl font-semibold">Snapshot Item Produksi</h2>
          <p className="mt-2 text-sm text-brand-charcoal/60">Data ini dikunci saat Job Order dibuat dan tidak mengikuti perubahan katalog setelahnya.</p>
          <div className="mt-5 divide-y divide-brand-softGray border-y border-brand-softGray">
            {sourceItems.length ? sourceItems.map((entry, index) => {
              const item = objectValue(objectValue(entry).item);
              const services = arrayValue(objectValue(entry).services);
              return (
                <article key={String(item.id || index)} className="py-5">
                  <h3 className="font-semibold">{String(item.product_name || `Item ${index + 1}`)}</h3>
                  <p className="mt-1 text-sm text-brand-charcoal/60">
                    {[item.variant_name, item.color, item.size, item.quantity ? `${String(item.quantity)} pcs` : null].filter(Boolean).map(String).join(" · ")}
                  </p>
                  {services.length ? (
                    <ul className="mt-3 grid gap-2 text-sm text-brand-charcoal/65">
                      {services.map((serviceEntry, serviceIndex) => {
                        const service = objectValue(serviceEntry);
                        return <li key={String(service.id || serviceIndex)}>• {String(service.service_name || "Layanan produksi")}</li>;
                      })}
                    </ul>
                  ) : null}
                </article>
              );
            }) : <p className="py-6 text-sm text-brand-charcoal/60">Snapshot item tidak tersedia.</p>}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <article className="border border-brand-softGray bg-white p-5 sm:p-7">
            <h2 className="text-xl font-semibold">Riwayat Status</h2>
            <div className="mt-5 grid gap-3">
              {history.length ? history.map((entry) => (
                <div key={entry.id} className="border border-brand-softGray p-4">
                  <p className="text-sm font-semibold">{JOB_ORDER_STATUS_LABELS[entry.to_status] || entry.to_status}</p>
                  <p className="mt-1 text-xs text-brand-charcoal/55">{formatJobOrderDate(entry.changed_at)} · {actorLabel(entry.changed_by)}</p>
                  {entry.note ? <p className="mt-2 text-sm text-brand-charcoal/70">{entry.note}</p> : null}
                  {entry.reason ? <p className="mt-1 text-sm text-brand-charcoal/70">Alasan: {entry.reason}</p> : null}
                </div>
              )) : <p className="text-sm text-brand-charcoal/60">Belum ada riwayat.</p>}
            </div>
          </article>
          <article className="border border-brand-softGray bg-white p-5 sm:p-7">
            <h2 className="text-xl font-semibold">Riwayat Revisi</h2>
            <div className="mt-5 grid gap-3">
              {revisions.length ? revisions.map((entry) => (
                <div key={entry.id} className="border border-brand-softGray p-4">
                  <p className="text-sm font-semibold">Revisi {entry.revision_number}</p>
                  <p className="mt-1 text-xs text-brand-charcoal/55">{formatJobOrderDate(entry.created_at)} · {actorLabel(entry.created_by)}</p>
                  <p className="mt-2 text-sm text-brand-charcoal/70">{entry.reason}</p>
                </div>
              )) : <p className="text-sm text-brand-charcoal/60">Belum ada revisi.</p>}
            </div>
          </article>
        </section>
      </div>

      {editOpen ? (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/60 p-4 sm:p-8">
          <form onSubmit={saveEdit} className="mx-auto max-w-2xl bg-white p-6 shadow-2xl sm:p-8">
            <h2 className="text-2xl font-semibold">Edit Job Order</h2>
            <p className="mt-2 text-sm text-brand-charcoal/60">Perubahan dicatat sebagai revisi. Snapshot pesanan dan mockup tidak ditimpa.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold">
                Target produksi
                <input type="date" required min={new Date().toISOString().slice(0, 10)} value={editForm.target_date} onChange={(event) => setEditForm((current) => ({ ...current, target_date: event.target.value }))} className="mt-2 min-h-11 w-full rounded-lg border border-brand-softGray px-4" />
              </label>
              <label className="block text-sm font-semibold">
                Prioritas
                <select value={editForm.priority} onChange={(event) => setEditForm((current) => ({ ...current, priority: event.target.value as JobOrderPriority }))} className="mt-2 min-h-11 w-full rounded-lg border border-brand-softGray px-4">
                  {Object.entries(JOB_ORDER_PRIORITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
            </div>
            <label className="mt-4 block text-sm font-semibold">Catatan internal<textarea rows={3} value={editForm.internal_notes} onChange={(event) => setEditForm((current) => ({ ...current, internal_notes: event.target.value }))} className="mt-2 w-full rounded-lg border border-brand-softGray px-4 py-3" /></label>
            <label className="mt-4 block text-sm font-semibold">Instruksi produksi<textarea rows={4} value={editForm.production_notes} onChange={(event) => setEditForm((current) => ({ ...current, production_notes: event.target.value }))} className="mt-2 w-full rounded-lg border border-brand-softGray px-4 py-3" /></label>
            <label className="mt-4 block text-sm font-semibold">Alasan perubahan{row.status === "ready" ? " (wajib)" : ""}<textarea rows={3} value={editForm.reason} onChange={(event) => setEditForm((current) => ({ ...current, reason: event.target.value }))} className="mt-2 w-full rounded-lg border border-brand-softGray px-4 py-3" /></label>
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="submit" disabled={working || !editForm.target_date} className="rounded-full bg-brand-green px-6 py-3 text-sm font-semibold text-white disabled:opacity-45">{working ? "Menyimpan..." : "Simpan Perubahan"}</button>
              <button type="button" onClick={() => setEditOpen(false)} disabled={working} className="rounded-full border border-brand-softGray px-6 py-3 text-sm font-semibold">Batal</button>
            </div>
          </form>
        </div>
      ) : null}

      {transitionTarget ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4">
          <section className="w-full max-w-lg bg-white p-6 shadow-2xl">
            <h2 className="text-2xl font-semibold">Ubah Status Job Order</h2>
            <p className="mt-2 text-sm text-brand-charcoal/60">Tujuan: {JOB_ORDER_STATUS_LABELS[transitionTarget]}</p>
            <textarea rows={3} value={transitionNote} onChange={(event) => setTransitionNote(event.target.value)} placeholder="Catatan tindakan" className="mt-5 w-full rounded-lg border border-brand-softGray px-4 py-3" />
            {transitionTarget === "cancelled" ? <textarea rows={3} value={transitionReason} onChange={(event) => setTransitionReason(event.target.value)} placeholder="Alasan pembatalan wajib diisi" className="mt-4 w-full rounded-lg border border-red-200 px-4 py-3" /> : null}
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={() => void transitionStatus()} disabled={working || (transitionTarget === "cancelled" && !transitionReason.trim())} className="rounded-full bg-brand-green px-6 py-3 text-sm font-semibold text-white disabled:opacity-45">{working ? "Memproses..." : "Konfirmasi"}</button>
              <button type="button" onClick={() => setTransitionTarget(null)} disabled={working} className="rounded-full border border-brand-softGray px-6 py-3 text-sm font-semibold">Batal</button>
            </div>
          </section>
        </div>
      ) : null}

      {archiveOpen ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4">
          <section className="w-full max-w-lg bg-white p-6 shadow-2xl">
            <h2 className="text-2xl font-semibold">Arsipkan Job Order?</h2>
            <textarea rows={4} value={archiveReason} onChange={(event) => setArchiveReason(event.target.value)} placeholder="Alasan arsip wajib diisi" className="mt-5 w-full rounded-lg border border-brand-softGray px-4 py-3" />
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={() => void archiveJobOrder()} disabled={working || !archiveReason.trim()} className="rounded-full bg-amber-700 px-6 py-3 text-sm font-semibold text-white disabled:opacity-45">{working ? "Memindahkan..." : "Arsipkan"}</button>
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
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-charcoal/45">{label}</p>
      <p className="mt-2 text-sm font-semibold leading-6">{value}</p>
    </div>
  );
}
