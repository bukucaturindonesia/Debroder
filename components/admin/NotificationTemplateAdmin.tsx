"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";
import { AdminAlert, AdminEmptyState, AdminLoadingState } from "@/components/admin/ui/AdminFeedback";
import { notificationApiFetch } from "@/lib/admin-notification-api";
import {
  NOTIFICATION_CHANNEL_LABELS,
  formatNotificationDate,
  getNotificationEventLabel,
  isNotificationSuperAdmin,
  type NotificationChannel,
  type NotificationTemplateRow
} from "@/lib/notifications";

type Scope = "active" | "archive";
type TemplateResponse = { templates: NotificationTemplateRow[]; role: string };
type FormState = {
  id: string;
  eventCode: string;
  channel: NotificationChannel;
  titleTemplate: string;
  bodyTemplate: string;
  active: boolean;
};

const EMPTY_FORM: FormState = {
  id: "",
  eventCode: "",
  channel: "in_app",
  titleTemplate: "",
  bodyTemplate: "",
  active: true
};

export function NotificationTemplateAdmin() {
  const [scope, setScope] = useState<Scope>("active");
  const [templates, setTemplates] = useState<NotificationTemplateRow[]>([]);
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [notice, setNotice] = useState<{ type: "success" | "error" | "warning"; text: string } | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<NotificationTemplateRow | null>(null);
  const [archiveReason, setArchiveReason] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<NotificationTemplateRow | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setNotice(null);
    try {
      const payload = await notificationApiFetch<TemplateResponse>(
        `/api/admin/notification-templates?scope=${scope}`
      );
      setTemplates(payload.templates);
      setRole(payload.role);
    } catch {
      setNotice({ type: "error", text: "Template notifikasi belum dapat dimuat. Coba lagi." });
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeCount = useMemo(() => templates.filter((template) => template.active).length, [templates]);

  function startCreate() {
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function startEdit(template: NotificationTemplateRow) {
    setForm({
      id: template.id,
      eventCode: template.event_code,
      channel: template.channel,
      titleTemplate: template.title_template,
      bodyTemplate: template.body_template,
      active: template.active
    });
    setFormOpen(true);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setWorking(true);
    setNotice(null);
    try {
      if (form.id) {
        await notificationApiFetch(`/api/admin/notification-templates/${form.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            action: "update",
            titleTemplate: form.titleTemplate,
            bodyTemplate: form.bodyTemplate,
            active: form.active
          })
        });
      } else {
        await notificationApiFetch("/api/admin/notification-templates", {
          method: "POST",
          body: JSON.stringify(form)
        });
      }
      setFormOpen(false);
      setForm(EMPTY_FORM);
      setNotice({ type: "success", text: form.id ? "Template berhasil diperbarui." : "Template berhasil dibuat." });
      await load();
    } catch {
      setNotice({ type: "error", text: "Template notifikasi belum dapat disimpan. Periksa data lalu coba lagi." });
    } finally {
      setWorking(false);
    }
  }

  async function archiveTemplate() {
    if (!archiveTarget || !archiveReason.trim()) return;
    setWorking(true);
    setNotice(null);
    try {
      await notificationApiFetch(`/api/admin/notification-templates/${archiveTarget.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "archive", reason: archiveReason })
      });
      setArchiveTarget(null);
      setArchiveReason("");
      setNotice({ type: "success", text: "Template dipindahkan ke Gudang Arsip." });
      await load();
    } catch {
      setNotice({ type: "error", text: "Template belum dapat diarsipkan. Coba lagi." });
    } finally {
      setWorking(false);
    }
  }

  async function restoreTemplate(template: NotificationTemplateRow) {
    setWorking(true);
    setNotice(null);
    try {
      await notificationApiFetch(`/api/admin/notification-templates/${template.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "restore" })
      });
      setNotice({ type: "success", text: "Template berhasil dipulihkan dan diaktifkan." });
      await load();
    } catch {
      setNotice({ type: "error", text: "Template belum dapat dipulihkan. Coba lagi." });
    } finally {
      setWorking(false);
    }
  }

  async function permanentlyDelete() {
    if (!deleteTarget || deleteConfirmation !== "HAPUS") return;
    setWorking(true);
    setNotice(null);
    try {
      await notificationApiFetch(`/api/admin/notification-templates/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      setDeleteConfirmation("");
      setNotice({ type: "success", text: "Template dihapus permanen dan audit penghapusan tersimpan." });
      await load();
    } catch {
      setNotice({ type: "error", text: "Template belum dapat dihapus. Coba lagi." });
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Phase 12"
        title="Template Notifikasi"
        description="Kelola copy event tanpa mengubah kode. Channel eksternal disimpan dalam status provider belum aktif sampai kredensial tersedia."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/notifications" className="inline-flex min-h-11 items-center rounded-full border border-brand-softGray px-5 text-sm font-semibold">Kotak Masuk</Link>
            <button type="button" onClick={startCreate} className="min-h-11 rounded-full bg-brand-charcoal px-5 text-sm font-semibold text-white">Tambah Template</button>
          </div>
        }
      />

      {notice ? <AdminAlert type={notice.type}>{notice.text}</AdminAlert> : null}

      <section className="grid gap-3 sm:grid-cols-3">
        <button type="button" onClick={() => setScope("active")} className={`border p-5 text-left ${scope === "active" ? "border-brand-green bg-brand-green text-white" : "border-brand-softGray bg-white"}`}>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] opacity-70">Template Aktif</span>
          <span className="mt-2 block text-3xl font-semibold">{scope === "active" ? activeCount : "—"}</span>
        </button>
        <button type="button" onClick={() => setScope("archive")} className={`border p-5 text-left ${scope === "archive" ? "border-brand-green bg-brand-green text-white" : "border-brand-softGray bg-white"}`}>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] opacity-70">Gudang Arsip</span>
          <span className="mt-2 block text-3xl font-semibold">{scope === "archive" ? templates.length : "—"}</span>
        </button>
        <div className="border border-amber-200 bg-amber-50 p-5">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-800/70">Provider Eksternal</span>
          <span className="mt-2 block text-lg font-semibold text-amber-900">Belum Diaktifkan</span>
          <p className="mt-1 text-xs leading-5 text-amber-900/70">Email, WhatsApp, SMS, dan push tidak mengirim tanpa konfigurasi provider.</p>
        </div>
      </section>

      {loading ? (
        <AdminLoadingState label="Memuat template notifikasi..." />
      ) : templates.length === 0 ? (
        <AdminEmptyState title={scope === "archive" ? "Arsip template kosong" : "Belum ada template"} description="Tambahkan template baru untuk event operasional yang diperlukan." />
      ) : (
        <section className="grid gap-4 xl:grid-cols-2">
          {templates.map((template) => (
            <article key={template.id} className="border border-brand-softGray bg-white p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-charcoal/45">{getNotificationEventLabel(template.event_code)}</p>
                  <h2 className="mt-2 font-mono text-sm font-semibold">{template.event_code}</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-brand-softGray bg-brand-offWhite px-3 py-1 text-xs font-semibold">{NOTIFICATION_CHANNEL_LABELS[template.channel]}</span>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${template.active ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-brand-softGray bg-brand-offWhite text-brand-charcoal/60"}`}>{template.active ? "Aktif" : "Nonaktif"}</span>
                </div>
              </div>
              <div className="mt-5 border-l-4 border-brand-green bg-brand-offWhite p-4">
                <p className="font-semibold">{template.title_template}</p>
                <p className="mt-2 text-sm leading-6 text-brand-charcoal/70">{template.body_template}</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-brand-charcoal/50">
                <span>Diperbarui {formatNotificationDate(template.updated_at)}</span>
                <span>{template.provider_configured ? "Provider siap" : "Provider belum aktif"}</span>
                {template.archive_reason ? <span>Alasan: {template.archive_reason}</span> : null}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {!template.archived_at ? (
                  <>
                    <button type="button" onClick={() => startEdit(template)} className="min-h-10 rounded-full border border-brand-softGray px-4 text-xs font-semibold">Edit</button>
                    <button type="button" onClick={() => { setArchiveTarget(template); setArchiveReason(""); }} className="min-h-10 rounded-full bg-brand-charcoal px-4 text-xs font-semibold text-white">Arsipkan</button>
                  </>
                ) : (
                  <>
                    <button type="button" disabled={working} onClick={() => void restoreTemplate(template)} className="min-h-10 rounded-full bg-brand-charcoal px-4 text-xs font-semibold text-white disabled:opacity-45">Pulihkan</button>
                    {isNotificationSuperAdmin(role) ? (
                      <button type="button" onClick={() => { setDeleteTarget(template); setDeleteConfirmation(""); }} className="min-h-10 rounded-full border border-red-300 px-4 text-xs font-semibold text-red-700">Hapus Permanen</button>
                    ) : null}
                  </>
                )}
              </div>
            </article>
          ))}
        </section>
      )}

      {formOpen ? (
        <div className="fixed inset-0 z-[80] overflow-y-auto bg-black/45 p-4 sm:p-8">
          <form onSubmit={save} className="mx-auto max-w-2xl border border-brand-softGray bg-white p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-charcoal/45">Template</p><h2 className="mt-2 text-2xl font-semibold">{form.id ? "Edit Template" : "Tambah Template"}</h2></div>
              <button type="button" onClick={() => setFormOpen(false)} className="h-10 w-10 rounded-full border border-brand-softGray" aria-label="Tutup">×</button>
            </div>
            <div className="mt-6 grid gap-5">
              <label className="grid gap-2 text-sm font-semibold">Kode event
                <input required disabled={Boolean(form.id)} value={form.eventCode} onChange={(event) => setForm((current) => ({ ...current, eventCode: event.target.value }))} placeholder="contoh: production_started" className="min-h-11 border border-brand-softGray px-4 font-mono text-sm disabled:bg-brand-offWhite" />
              </label>
              <label className="grid gap-2 text-sm font-semibold">Channel
                <select disabled={Boolean(form.id)} value={form.channel} onChange={(event) => setForm((current) => ({ ...current, channel: event.target.value as NotificationChannel }))} className="min-h-11 border border-brand-softGray bg-white px-4 disabled:bg-brand-offWhite">
                  {(Object.keys(NOTIFICATION_CHANNEL_LABELS) as NotificationChannel[]).map((value) => <option key={value} value={value}>{NOTIFICATION_CHANNEL_LABELS[value]}</option>)}
                </select>
              </label>
              {form.channel !== "in_app" ? <AdminAlert type="warning">Template dapat disimpan, tetapi provider eksternal dipaksa belum aktif dan tidak akan mengirim pesan.</AdminAlert> : null}
              <label className="grid gap-2 text-sm font-semibold">Judul template
                <input required maxLength={160} value={form.titleTemplate} onChange={(event) => setForm((current) => ({ ...current, titleTemplate: event.target.value }))} placeholder="Gunakan {{reference}} untuk data dinamis" className="min-h-11 border border-brand-softGray px-4" />
                <span className="text-xs font-normal text-brand-charcoal/45">{form.titleTemplate.length}/160</span>
              </label>
              <label className="grid gap-2 text-sm font-semibold">Isi template
                <textarea required maxLength={2000} rows={6} value={form.bodyTemplate} onChange={(event) => setForm((current) => ({ ...current, bodyTemplate: event.target.value }))} placeholder="Contoh: Produksi {{reference}} telah dimulai." className="border border-brand-softGray p-4" />
                <span className="text-xs font-normal text-brand-charcoal/45">{form.bodyTemplate.length}/2000</span>
              </label>
              {form.id ? <label className="inline-flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} />Template aktif</label> : null}
            </div>
            <div className="mt-7 flex justify-end gap-2"><button type="button" onClick={() => setFormOpen(false)} className="min-h-11 rounded-full border border-brand-softGray px-5 text-sm font-semibold">Batal</button><button type="submit" disabled={working} className="min-h-11 rounded-full bg-brand-charcoal px-6 text-sm font-semibold text-white disabled:opacity-45">{working ? "Menyimpan..." : "Simpan Template"}</button></div>
          </form>
        </div>
      ) : null}

      {archiveTarget ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-lg border border-brand-softGray bg-white p-6 shadow-2xl">
            <h2 className="text-2xl font-semibold">Arsipkan template?</h2>
            <p className="mt-2 text-sm text-brand-charcoal/65">Template akan dinonaktifkan. Alasan arsip wajib diisi.</p>
            <textarea value={archiveReason} onChange={(event) => setArchiveReason(event.target.value)} rows={3} className="mt-5 w-full border border-brand-softGray p-4" placeholder="Alasan arsip" />
            <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setArchiveTarget(null)} className="min-h-10 rounded-full border border-brand-softGray px-5 text-sm font-semibold">Batal</button><button type="button" disabled={working || !archiveReason.trim()} onClick={() => void archiveTemplate()} className="min-h-10 rounded-full bg-brand-charcoal px-5 text-sm font-semibold text-white disabled:opacity-40">Arsipkan</button></div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-lg border border-red-200 bg-white p-6 shadow-2xl">
            <h2 className="text-2xl font-semibold text-red-800">Hapus template permanen?</h2>
            <p className="mt-2 text-sm leading-6 text-brand-charcoal/65">Snapshot audit penghapusan tetap disimpan. Ketik HAPUS.</p>
            <input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} className="mt-5 min-h-11 w-full border border-brand-softGray px-4" placeholder="HAPUS" />
            <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setDeleteTarget(null)} className="min-h-10 rounded-full border border-brand-softGray px-5 text-sm font-semibold">Batal</button><button type="button" disabled={working || deleteConfirmation !== "HAPUS"} onClick={() => void permanentlyDelete()} className="min-h-10 rounded-full bg-red-700 px-5 text-sm font-semibold text-white disabled:opacity-40">Hapus Permanen</button></div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
