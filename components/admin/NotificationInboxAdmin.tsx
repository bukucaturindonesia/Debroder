"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";
import { AdminAlert, AdminEmptyState, AdminLoadingState } from "@/components/admin/ui/AdminFeedback";
import { notificationApiFetch } from "@/lib/admin-notification-api";
import { resolveNotificationTarget } from "@/lib/notification-routing";
import {
  NOTIFICATION_CHANNEL_LABELS,
  NOTIFICATION_STATUS_LABELS,
  formatNotificationDate,
  getNotificationStatusTone,
  isNotificationSuperAdmin,
  type NotificationChannel,
  type NotificationRow,
  type NotificationStatus
} from "@/lib/notifications";

type Scope = "active" | "archive";
type InboxResponse = {
  notifications: NotificationRow[];
  counts: { active: number; unread: number; actionRequired: number; archive: number };
  role: string;
};

const STATUS_CLASSES = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  error: "border-red-200 bg-red-50 text-red-800",
  neutral: "border-brand-softGray bg-brand-offWhite text-brand-charcoal/70"
};

export function NotificationInboxAdmin({ initialScope = "active" }: { initialScope?: Scope }) {
  const [scope, setScope] = useState<Scope>(initialScope);
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [counts, setCounts] = useState({ active: 0, unread: 0, actionRequired: 0, archive: 0 });
  const [category, setCategory] = useState<"all" | "action" | "payment" | "order" | "production" | "system">("all");
  const [role, setRole] = useState("");
  const [search, setSearch] = useState("");
  const [channel, setChannel] = useState<"all" | NotificationChannel>("all");
  const [status, setStatus] = useState<"all" | NotificationStatus>("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");
  const [notice, setNotice] = useState<{ type: "success" | "error" | "warning"; text: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NotificationRow | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setNotice(null);
    try {
      const params = new URLSearchParams({ scope, limit: "100" });
      if (search.trim()) params.set("search", search.trim());
      if (channel !== "all") params.set("channel", channel);
      if (status !== "all") params.set("status", status);
      if (scope === "active" && unreadOnly) params.set("unreadOnly", "true");

      const payload = await notificationApiFetch<InboxResponse>(
        `/api/admin/notifications?${params.toString()}`
      );
      setRows(payload.notifications);
      setCounts(payload.counts);
      setRole(payload.role);
    } catch {
      setNotice({
        type: "error",
        text: "Notifikasi belum dapat dimuat. Coba lagi."
      });
    } finally {
      setLoading(false);
    }
  }, [channel, scope, search, status, unreadOnly]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 180);
    return () => window.clearTimeout(timer);
  }, [load]);

  const filteredStatusOptions = useMemo(() => {
    const values = Object.keys(NOTIFICATION_STATUS_LABELS) as NotificationStatus[];
    return scope === "archive" ? values.filter((value) => value === "archived") : values.filter((value) => value !== "archived");
  }, [scope]);
  const visibleRows = useMemo(() => rows.filter((row) => {
    const text = `${row.title} ${row.body} ${row.related_path ?? ""}`.toLowerCase();
    if (category === "all") return true;
    if (category === "action") return row.action_required && !row.resolved_at;
    if (category === "payment") return /payment|pembayaran/.test(text);
    if (category === "order") return /order|pesanan|quotation|penawaran/.test(text);
    if (category === "production") return /job-order|production|produksi|quality|qc|fulfillment|pengiriman|pickup/.test(text);
    return !/payment|pembayaran|order|pesanan|quotation|produksi|quality|qc|fulfillment/.test(text);
  }), [category, rows]);

  async function runAction(row: NotificationRow, action: "read" | "archive" | "restore") {
    setWorkingId(row.id);
    setNotice(null);
    try {
      await notificationApiFetch(`/api/admin/notifications/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action })
      });
      setNotice({
        type: "success",
        text:
          action === "read"
            ? "Notifikasi ditandai sudah dibaca."
            : action === "archive"
              ? "Notifikasi dipindahkan ke Gudang Arsip."
              : "Notifikasi berhasil dipulihkan."
      });
      window.dispatchEvent(new Event("debroder:notifications-changed"));
      await load();
    } catch {
      setNotice({ type: "error", text: "Notifikasi belum dapat diperbarui. Coba lagi." });
    } finally {
      setWorkingId("");
    }
  }

  async function markAllRead() {
    setWorkingId("all");
    setNotice(null);
    try {
      const result = await notificationApiFetch<{ affected: number }>("/api/admin/notifications", {
        method: "POST",
        body: JSON.stringify({ action: "mark_all_read" })
      });
      setNotice({ type: "success", text: `${result.affected} notifikasi ditandai sudah dibaca.` });
      window.dispatchEvent(new Event("debroder:notifications-changed"));
      await load();
    } catch {
      setNotice({ type: "error", text: "Notifikasi belum dapat diperbarui. Coba lagi." });
    } finally {
      setWorkingId("");
    }
  }

  async function permanentlyDelete() {
    if (!deleteTarget || deleteConfirmation !== "HAPUS") return;
    setWorkingId(deleteTarget.id);
    setNotice(null);
    try {
      await notificationApiFetch(`/api/admin/notifications/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      setDeleteConfirmation("");
      setNotice({ type: "success", text: "Notifikasi dihapus permanen dan audit penghapusan disimpan." });
      await load();
    } catch {
      setNotice({ type: "error", text: "Notifikasi belum dapat dihapus. Coba lagi." });
    } finally {
      setWorkingId("");
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Phase 12"
        title="Notifikasi"
        description="Kotak masuk operasional berbasis event. Channel eksternal tetap tidak mengirim sampai provider dikonfigurasi."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/notifications/history" className="inline-flex min-h-11 items-center rounded-full border border-brand-softGray px-5 text-sm font-semibold hover:border-brand-charcoal">
              Riwayat Event
            </Link>
            {role && role !== "sales_admin" ? (
              <Link href="/admin/notifications/templates" className="inline-flex min-h-11 items-center rounded-full bg-brand-charcoal px-5 text-sm font-semibold text-white">
                Kelola Template
              </Link>
            ) : null}
          </div>
        }
      />

      {notice ? <AdminAlert type={notice.type}>{notice.text}</AdminAlert> : null}

      <section className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Aktif" value={counts.active} active={scope === "active"} onClick={() => setScope("active")} />
        <SummaryCard label="Belum Dibaca" value={counts.unread} active={scope === "active" && unreadOnly} onClick={() => { setScope("active"); setUnreadOnly(true); }} />
        <SummaryCard label="Gudang Arsip" value={counts.archive} active={scope === "archive"} onClick={() => { setScope("archive"); setUnreadOnly(false); setStatus("all"); }} />
      </section>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Kategori notifikasi">
        {([['all','Semua'],['action',`Perlu Tindakan · ${counts.actionRequired}`],['payment','Pembayaran'],['order','Pesanan'],['production','Produksi'],['system','Sistem']] as const).map(([value,label]) => <button key={value} type="button" role="tab" aria-selected={category===value} onClick={()=>setCategory(value)} className={`min-h-10 rounded-full px-4 text-xs font-semibold ${category===value?'bg-brand-charcoal text-white':'border border-brand-softGray bg-white'}`}>{label}</button>)}
      </div>

      <section className="border border-brand-softGray bg-white p-4 sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_180px_180px_auto]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari judul atau isi notifikasi"
            className="min-h-11 border border-brand-softGray px-4 text-sm outline-none focus:border-brand-charcoal"
          />
          <select value={channel} onChange={(event) => setChannel(event.target.value as "all" | NotificationChannel)} className="min-h-11 border border-brand-softGray bg-white px-3 text-sm">
            <option value="all">Semua channel</option>
            {(Object.keys(NOTIFICATION_CHANNEL_LABELS) as NotificationChannel[]).map((value) => (
              <option key={value} value={value}>{NOTIFICATION_CHANNEL_LABELS[value]}</option>
            ))}
          </select>
          <select value={status} onChange={(event) => setStatus(event.target.value as "all" | NotificationStatus)} className="min-h-11 border border-brand-softGray bg-white px-3 text-sm">
            <option value="all">Semua status</option>
            {filteredStatusOptions.map((value) => (
              <option key={value} value={value}>{NOTIFICATION_STATUS_LABELS[value]}</option>
            ))}
          </select>
          {scope === "active" ? (
            <button type="button" onClick={() => void markAllRead()} disabled={workingId === "all" || counts.unread === 0} className="min-h-11 rounded-full border border-brand-softGray px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45">
              Tandai Semua Dibaca
            </button>
          ) : null}
        </div>
        {scope === "active" ? (
          <label className="mt-4 inline-flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={unreadOnly} onChange={(event) => setUnreadOnly(event.target.checked)} />
            Hanya yang belum dibaca
          </label>
        ) : null}
      </section>

      {loading ? (
        <AdminLoadingState label="Memuat kotak masuk notifikasi..." />
      ) : visibleRows.length === 0 ? (
        <AdminEmptyState title={scope === "archive" ? "Gudang Arsip kosong" : "Tidak ada notifikasi"} description="Filter saat ini tidak menemukan data yang sesuai." />
      ) : (
        <section className="overflow-hidden border border-brand-softGray bg-white">
          <div className="divide-y divide-brand-softGray">
            {visibleRows.map((row) => {
              const tone = getNotificationStatusTone(row.status);
              const working = workingId === row.id;
              return (
                <article key={row.id} className={`p-4 sm:p-5 ${!row.read_at && !row.archived_at ? "bg-emerald-50/35" : "bg-white"}`}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {!row.read_at && !row.archived_at ? <span className="h-2.5 w-2.5 rounded-full bg-brand-green" aria-label="Belum dibaca" /> : null}
                        <h2 className="text-base font-semibold">{row.title}</h2>
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${STATUS_CLASSES[tone]}`}>
                          {NOTIFICATION_STATUS_LABELS[row.status]}
                        </span>
                        <span className="inline-flex rounded-full border border-brand-softGray bg-brand-offWhite px-2.5 py-1 text-[11px] font-semibold text-brand-charcoal/65">
                          {NOTIFICATION_CHANNEL_LABELS[row.channel]}
                        </span>
                        {row.action_required && !row.resolved_at ? <span className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900">Perlu Tindakan</span> : row.resolved_at ? <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">Selesai</span> : null}
                      </div>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-brand-charcoal/70">{row.body}</p>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-brand-charcoal/50">
                        <span>{formatNotificationDate(row.created_at)}</span>
                        {row.read_at ? <span>Dibaca: {formatNotificationDate(row.read_at)}</span> : null}
                        {row.archive_reason ? <span>Alasan arsip: {row.archive_reason}</span> : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 lg:max-w-[360px] lg:justify-end">
                      <Link href={`/admin/notifications/${row.id}`} className="inline-flex min-h-10 items-center rounded-full border border-brand-softGray px-4 text-xs font-semibold hover:border-brand-charcoal">
                        Detail
                      </Link>
                      {row.action_required && !row.resolved_at ? <Link href={resolveNotificationTarget(row)} className="inline-flex min-h-10 items-center rounded-full bg-brand-green px-4 text-xs font-semibold text-white">Periksa Sekarang</Link> : null}
                      {!row.read_at && !row.archived_at ? (
                        <button type="button" disabled={working} onClick={() => void runAction(row, "read")} className="min-h-10 rounded-full border border-brand-softGray px-4 text-xs font-semibold disabled:opacity-45">
                          Tandai Dibaca
                        </button>
                      ) : null}
                      {!row.archived_at ? (
                        <button type="button" disabled={working} onClick={() => void runAction(row, "archive")} className="min-h-10 rounded-full bg-brand-charcoal px-4 text-xs font-semibold text-white disabled:opacity-45">
                          Arsipkan
                        </button>
                      ) : (
                        <>
                          <button type="button" disabled={working} onClick={() => void runAction(row, "restore")} className="min-h-10 rounded-full bg-brand-charcoal px-4 text-xs font-semibold text-white disabled:opacity-45">
                            Pulihkan
                          </button>
                          {isNotificationSuperAdmin(role) ? (
                            <button type="button" disabled={working} onClick={() => { setDeleteTarget(row); setDeleteConfirmation(""); }} className="min-h-10 rounded-full border border-red-300 px-4 text-xs font-semibold text-red-700 disabled:opacity-45">
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
          </div>
        </section>
      )}

      {deleteTarget ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-lg border border-brand-softGray bg-white p-6 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-700">Aksi Super Admin</p>
            <h2 className="mt-2 text-2xl font-semibold">Hapus notifikasi permanen?</h2>
            <p className="mt-3 text-sm leading-6 text-brand-charcoal/65">
              Data utama akan dihapus, tetapi snapshot audit penghapusan tetap permanen. Ketik <strong>HAPUS</strong> untuk melanjutkan.
            </p>
            <input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} className="mt-5 min-h-11 w-full border border-brand-softGray px-4" placeholder="HAPUS" />
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteTarget(null)} className="min-h-10 rounded-full border border-brand-softGray px-5 text-sm font-semibold">Batal</button>
              <button type="button" disabled={deleteConfirmation !== "HAPUS" || workingId === deleteTarget.id} onClick={() => void permanentlyDelete()} className="min-h-10 rounded-full bg-red-700 px-5 text-sm font-semibold text-white disabled:opacity-40">Hapus Permanen</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SummaryCard({ label, value, active, onClick }: { label: string; value: number; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`border p-5 text-left transition ${active ? "border-brand-green bg-brand-green text-white" : "border-brand-softGray bg-white hover:border-brand-charcoal"}`}>
      <span className={`text-xs font-semibold uppercase tracking-[0.16em] ${active ? "text-white/70" : "text-brand-charcoal/45"}`}>{label}</span>
      <span className="mt-2 block text-3xl font-semibold">{value}</span>
    </button>
  );
}
