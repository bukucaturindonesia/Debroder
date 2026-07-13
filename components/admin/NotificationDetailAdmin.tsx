"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";
import { AdminAlert, AdminErrorState, AdminLoadingState } from "@/components/admin/ui/AdminFeedback";
import { notificationApiFetch } from "@/lib/admin-notification-api";
import { isAdminRole, roleCanAccessPath } from "@/components/admin/layout/admin-navigation";
import {
  NOTIFICATION_CHANNEL_LABELS,
  NOTIFICATION_STATUS_LABELS,
  formatNotificationDate,
  getNotificationEntityLabel,
  getNotificationEventLabel,
  isNotificationSuperAdmin,
  type NotificationDeliveryRow,
  type NotificationEventRow,
  type NotificationRow
} from "@/lib/notifications";

type DetailResponse = {
  notification: NotificationRow;
  event: NotificationEventRow | null;
  deliveries: NotificationDeliveryRow[];
  role: string;
};

export function NotificationDetailAdmin({ notificationId }: { notificationId: string }) {
  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await notificationApiFetch<DetailResponse>(
        `/api/admin/notifications/${notificationId}`
      );
      setData(payload);

      if (!payload.notification.read_at && !payload.notification.archived_at) {
        await notificationApiFetch(`/api/admin/notifications/${notificationId}`, {
          method: "PATCH",
          body: JSON.stringify({ action: "read" })
        });
        window.dispatchEvent(new Event("debroder:notifications-changed"));
        const refreshed = await notificationApiFetch<DetailResponse>(
          `/api/admin/notifications/${notificationId}`
        );
        setData(refreshed);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Detail notifikasi gagal dimuat.");
    } finally {
      setLoading(false);
    }
  }, [notificationId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAction(action: "archive" | "restore") {
    setWorking(true);
    setNotice(null);
    try {
      await notificationApiFetch(`/api/admin/notifications/${notificationId}`, {
        method: "PATCH",
        body: JSON.stringify({ action })
      });
      setNotice({
        type: "success",
        text: action === "archive" ? "Notifikasi dipindahkan ke Gudang Arsip." : "Notifikasi berhasil dipulihkan."
      });
      window.dispatchEvent(new Event("debroder:notifications-changed"));
      await load();
    } catch (actionError) {
      setNotice({ type: "error", text: actionError instanceof Error ? actionError.message : "Aksi gagal." });
    } finally {
      setWorking(false);
    }
  }

  async function permanentlyDelete() {
    if (deleteConfirmation !== "HAPUS") return;
    setWorking(true);
    setNotice(null);
    try {
      await notificationApiFetch(`/api/admin/notifications/${notificationId}`, { method: "DELETE" });
      window.location.assign("/admin/notifications?scope=archive");
    } catch (deleteError) {
      setNotice({ type: "error", text: deleteError instanceof Error ? deleteError.message : "Penghapusan gagal." });
      setWorking(false);
    }
  }

  if (loading) return <AdminLoadingState label="Memuat detail notifikasi..." />;
  if (error || !data) {
    return (
      <AdminErrorState
        title="Detail notifikasi tidak tersedia"
        description={error || "Data tidak ditemukan."}
        action={<Link href="/admin/notifications" className="font-semibold underline">Kembali ke Notifikasi</Link>}
      />
    );
  }

  const { notification, event, deliveries, role } = data;
  const canOpenRelatedPath = Boolean(
    notification.related_path &&
      isAdminRole(role) &&
      roleCanAccessPath(role, notification.related_path)
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Phase 12"
        title={notification.title}
        description="Detail pesan, event sumber, jalur terkait, dan riwayat delivery yang tidak dapat diubah."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/notifications" className="inline-flex min-h-11 items-center rounded-full border border-brand-softGray px-5 text-sm font-semibold">Kembali</Link>
            {canOpenRelatedPath && notification.related_path ? (
              <Link href={notification.related_path} className="inline-flex min-h-11 items-center rounded-full bg-brand-charcoal px-5 text-sm font-semibold text-white">Buka Data Terkait</Link>
            ) : null}
          </div>
        }
      />

      {notice ? <AdminAlert type={notice.type}>{notice.text}</AdminAlert> : null}

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
        <div className="border border-brand-softGray bg-white p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-brand-softGray bg-brand-offWhite px-3 py-1 text-xs font-semibold">
              {NOTIFICATION_CHANNEL_LABELS[notification.channel]}
            </span>
            <span className="rounded-full border border-brand-softGray bg-brand-offWhite px-3 py-1 text-xs font-semibold">
              {NOTIFICATION_STATUS_LABELS[notification.status]}
            </span>
          </div>
          <p className="mt-5 text-base leading-8 text-brand-charcoal/80">{notification.body}</p>
          {notification.error_message ? (
            <div className="mt-5 border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {notification.error_message}
            </div>
          ) : null}
        </div>

        <aside className="border border-brand-softGray bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Status</h2>
          <dl className="mt-4 space-y-4 text-sm">
            <Meta label="Dibuat" value={formatNotificationDate(notification.created_at)} />
            <Meta label="Terkirim" value={formatNotificationDate(notification.sent_at)} />
            <Meta label="Dibaca" value={formatNotificationDate(notification.read_at)} />
            <Meta label="Diarsipkan" value={formatNotificationDate(notification.archived_at)} />
            {notification.archive_reason ? <Meta label="Alasan arsip" value={notification.archive_reason} /> : null}
          </dl>
          <div className="mt-6 flex flex-wrap gap-2">
            {!notification.archived_at ? (
              <button type="button" disabled={working} onClick={() => void runAction("archive")} className="min-h-10 rounded-full bg-brand-charcoal px-5 text-sm font-semibold text-white disabled:opacity-45">Arsipkan</button>
            ) : (
              <button type="button" disabled={working} onClick={() => void runAction("restore")} className="min-h-10 rounded-full bg-brand-charcoal px-5 text-sm font-semibold text-white disabled:opacity-45">Pulihkan</button>
            )}
          </div>
        </aside>
      </section>

      <section className="border border-brand-softGray bg-white p-5 sm:p-7">
        <h2 className="text-xl font-semibold">Event Sumber</h2>
        {event ? (
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <dl className="space-y-4 text-sm">
              <Meta label="Event" value={getNotificationEventLabel(event.event_code)} />
              <Meta label="Kode event" value={event.event_code} mono />
              <Meta label="Entitas" value={getNotificationEntityLabel(event.entity_type)} />
              <Meta label="Entity ID" value={event.entity_id} mono />
              <Meta label="Idempotency key" value={event.idempotency_key} mono />
              <Meta label="Waktu event" value={formatNotificationDate(event.created_at)} />
            </dl>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-charcoal/45">Payload</p>
              <pre className="mt-2 max-h-80 overflow-auto border border-brand-softGray bg-brand-offWhite p-4 text-xs leading-6">{JSON.stringify(event.payload, null, 2)}</pre>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-brand-charcoal/60">Event sumber tidak dapat dibaca oleh role ini atau sudah tidak tersedia.</p>
        )}
      </section>

      <section className="border border-brand-softGray bg-white p-5 sm:p-7">
        <h2 className="text-xl font-semibold">Riwayat Delivery</h2>
        <p className="mt-2 text-sm text-brand-charcoal/60">Riwayat attempt bersifat append-only dan tidak dapat diedit.</p>
        {deliveries.length === 0 ? (
          <p className="mt-5 border border-dashed border-brand-softGray bg-brand-offWhite p-5 text-sm text-brand-charcoal/60">
            Tidak ada attempt provider. Untuk channel in-app, status terkirim dicatat langsung pada notifikasi.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-brand-softGray text-xs uppercase tracking-[0.12em] text-brand-charcoal/45">
                <tr><th className="px-3 py-3">Attempt</th><th className="px-3 py-3">Provider</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Waktu</th><th className="px-3 py-3">Error</th></tr>
              </thead>
              <tbody className="divide-y divide-brand-softGray">
                {deliveries.map((delivery) => (
                  <tr key={delivery.id}>
                    <td className="px-3 py-4 font-semibold">#{delivery.attempt_number}</td>
                    <td className="px-3 py-4">{delivery.provider || "-"}</td>
                    <td className="px-3 py-4">{NOTIFICATION_STATUS_LABELS[delivery.status]}</td>
                    <td className="px-3 py-4">{formatNotificationDate(delivery.attempted_at)}</td>
                    <td className="px-3 py-4 text-red-700">{delivery.error_message || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {notification.archived_at && isNotificationSuperAdmin(role) ? (
        <section className="border border-red-200 bg-white p-5 sm:p-7">
          <h2 className="text-xl font-semibold text-red-800">Zona Hapus Permanen</h2>
          <p className="mt-2 text-sm leading-6 text-brand-charcoal/65">Snapshot akan disimpan ke audit deletion. Ketik HAPUS untuk mengonfirmasi.</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input value={deleteConfirmation} onChange={(eventValue) => setDeleteConfirmation(eventValue.target.value)} placeholder="HAPUS" className="min-h-11 flex-1 border border-brand-softGray px-4" />
            <button type="button" disabled={working || deleteConfirmation !== "HAPUS"} onClick={() => void permanentlyDelete()} className="min-h-11 rounded-full bg-red-700 px-6 text-sm font-semibold text-white disabled:opacity-40">Hapus Permanen</button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Meta({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-charcoal/45">{label}</dt>
      <dd className={`mt-1 break-words text-brand-charcoal/80 ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}
