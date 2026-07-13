"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";
import {
  AdminAlert,
  AdminEmptyState,
  AdminLoadingState
} from "@/components/admin/ui/AdminFeedback";
import { notificationApiFetch } from "@/lib/admin-notification-api";
import {
  NOTIFICATION_CHANNEL_LABELS,
  NOTIFICATION_STATUS_LABELS,
  formatNotificationDate,
  getNotificationEntityLabel,
  getNotificationEventLabel,
  isNotificationSuperAdmin,
  type NotificationChannel,
  type NotificationDeletionAuditRow,
  type NotificationDeliveryRow,
  type NotificationEventRow,
  type NotificationStatus,
  type NotificationTemplateDeletionAuditRow
} from "@/lib/notifications";

type HistoryNotification = {
  id: string;
  event_id: string;
  recipient_id: string;
  channel: NotificationChannel;
  title: string;
  status: NotificationStatus;
  sent_at: string | null;
  read_at: string | null;
  archived_at: string | null;
  error_message: string | null;
  created_at: string;
};

type HistoryResponse = {
  events: NotificationEventRow[];
  notifications: HistoryNotification[];
  deliveries: NotificationDeliveryRow[];
  notificationDeletions: NotificationDeletionAuditRow[];
  templateDeletions: NotificationTemplateDeletionAuditRow[];
  role: string;
};

type Tab = "events" | "deliveries" | "deletions";

export function NotificationHistoryAdmin() {
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [tab, setTab] = useState<Tab>("events");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await notificationApiFetch<HistoryResponse>(
        "/api/admin/notification-history?limit=120"
      );
      setData(payload);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Riwayat notifikasi gagal dimuat."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const notificationByEvent = useMemo(() => {
    const map = new Map<string, HistoryNotification[]>();
    for (const row of data?.notifications ?? []) {
      const current = map.get(row.event_id) ?? [];
      current.push(row);
      map.set(row.event_id, current);
    }
    return map;
  }, [data?.notifications]);

  const notificationById = useMemo(
    () => new Map((data?.notifications ?? []).map((row) => [row.id, row])),
    [data?.notifications]
  );

  const normalizedSearch = search.trim().toLowerCase();
  const events = useMemo(
    () =>
      (data?.events ?? []).filter((event) => {
        if (!normalizedSearch) return true;
        return [
          event.event_code,
          event.entity_type,
          event.entity_id,
          event.idempotency_key,
          JSON.stringify(event.payload)
        ].some((value) => value.toLowerCase().includes(normalizedSearch));
      }),
    [data?.events, normalizedSearch]
  );

  const deliveries = useMemo(
    () =>
      (data?.deliveries ?? []).filter((delivery) => {
        if (!normalizedSearch) return true;
        const notification = notificationById.get(delivery.notification_id);
        return [
          delivery.provider ?? "",
          delivery.provider_message_id ?? "",
          delivery.status,
          delivery.error_message ?? "",
          notification?.title ?? ""
        ].some((value) => value.toLowerCase().includes(normalizedSearch));
      }),
    [data?.deliveries, normalizedSearch, notificationById]
  );

  const deletions = useMemo(() => {
    const notificationRows = (data?.notificationDeletions ?? []).map((row) => ({
      kind: "notification" as const,
      id: row.id,
      reference: row.notification_id,
      eventCode: String(row.snapshot?.title ?? "Notifikasi"),
      channel: row.channel,
      reason: row.reason,
      deletedAt: row.deleted_at,
      snapshot: row.snapshot
    }));
    const templateRows = (data?.templateDeletions ?? []).map((row) => ({
      kind: "template" as const,
      id: row.id,
      reference: row.template_id,
      eventCode: row.event_code,
      channel: row.channel,
      reason: row.reason,
      deletedAt: row.deleted_at,
      snapshot: row.snapshot
    }));
    return [...notificationRows, ...templateRows]
      .sort((a, b) => b.deletedAt.localeCompare(a.deletedAt))
      .filter((row) => {
        if (!normalizedSearch) return true;
        return [row.kind, row.reference, row.eventCode, row.channel, row.reason]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);
      });
  }, [data?.notificationDeletions, data?.templateDeletions, normalizedSearch]);

  if (loading) return <AdminLoadingState label="Memuat riwayat notifikasi..." />;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Phase 12"
        title="Riwayat Notifikasi"
        description="Jejak event, delivery provider, dan audit penghapusan. Event dan delivery bersifat append-only."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/notifications"
              className="inline-flex min-h-11 items-center rounded-full border border-brand-softGray px-5 text-sm font-semibold hover:border-brand-charcoal"
            >
              Kotak Masuk
            </Link>
            {data?.role && data.role !== "sales_admin" ? (
              <Link
                href="/admin/notifications/templates"
                className="inline-flex min-h-11 items-center rounded-full bg-brand-charcoal px-5 text-sm font-semibold text-white"
              >
                Template
              </Link>
            ) : null}
          </div>
        }
      />

      {error ? (
        <AdminAlert type="error">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{error}</span>
            <button type="button" onClick={() => void load()} className="underline">
              Coba lagi
            </button>
          </div>
        </AdminAlert>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-3">
        <HistoryTab
          label="Event"
          value={data?.events.length ?? 0}
          active={tab === "events"}
          onClick={() => setTab("events")}
        />
        <HistoryTab
          label="Delivery Attempt"
          value={data?.deliveries.length ?? 0}
          active={tab === "deliveries"}
          onClick={() => setTab("deliveries")}
        />
        <HistoryTab
          label="Audit Penghapusan"
          value={(data?.notificationDeletions.length ?? 0) + (data?.templateDeletions.length ?? 0)}
          active={tab === "deletions"}
          disabled={!isNotificationSuperAdmin(data?.role)}
          onClick={() => setTab("deletions")}
        />
      </section>

      <section className="border border-brand-softGray bg-white p-4 sm:p-5">
        <label className="grid gap-2 text-sm font-semibold">
          Cari riwayat
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Kode event, entitas, provider, atau referensi"
            className="min-h-11 border border-brand-softGray px-4 text-sm font-normal outline-none focus:border-brand-charcoal"
          />
        </label>
      </section>

      {tab === "events" ? (
        events.length === 0 ? (
          <AdminEmptyState
            title="Riwayat event tidak ditemukan"
            description="Belum ada event atau pencarian tidak menemukan data yang sesuai."
          />
        ) : (
          <section className="space-y-3">
            {events.map((event) => {
              const eventNotifications = notificationByEvent.get(event.id) ?? [];
              const sentCount = eventNotifications.filter((row) => row.status === "sent" || row.status === "read").length;
              const failedCount = eventNotifications.filter((row) => row.status === "failed").length;
              return (
                <details key={event.id} className="border border-brand-softGray bg-white">
                  <summary className="cursor-pointer list-none p-5 sm:p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-charcoal/45">
                          {getNotificationEntityLabel(event.entity_type)}
                        </p>
                        <h2 className="mt-2 text-lg font-semibold">
                          {getNotificationEventLabel(event.event_code)}
                        </h2>
                        <p className="mt-1 break-all font-mono text-xs text-brand-charcoal/50">
                          {event.event_code} · {event.entity_id}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs font-semibold">
                        <span className="rounded-full border border-brand-softGray bg-brand-offWhite px-3 py-1.5">
                          {eventNotifications.length} penerima/channel
                        </span>
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-800">
                          {sentCount} terkirim
                        </span>
                        {failedCount ? (
                          <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-red-800">
                            {failedCount} gagal
                          </span>
                        ) : null}
                        <span className="rounded-full border border-brand-softGray px-3 py-1.5 text-brand-charcoal/60">
                          {formatNotificationDate(event.created_at)}
                        </span>
                      </div>
                    </div>
                  </summary>
                  <div className="grid gap-5 border-t border-brand-softGray p-5 sm:p-6 lg:grid-cols-2">
                    <dl className="space-y-4 text-sm">
                      <HistoryMeta label="Event ID" value={event.id} mono />
                      <HistoryMeta label="Idempotency key" value={event.idempotency_key} mono />
                      <HistoryMeta label="Dibuat oleh" value={event.created_by || "Sistem / trigger"} mono />
                      <HistoryMeta label="Waktu" value={formatNotificationDate(event.created_at)} />
                      <HistoryMeta
                        label="Status notifikasi"
                        value={
                          eventNotifications.length
                            ? eventNotifications
                                .map(
                                  (row) =>
                                    `${NOTIFICATION_CHANNEL_LABELS[row.channel]}: ${NOTIFICATION_STATUS_LABELS[row.status]}`
                                )
                                .join(" · ")
                            : "Tidak ada baris notifikasi yang dapat dibaca role ini"
                        }
                      />
                    </dl>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-charcoal/45">
                        Payload Event
                      </p>
                      <pre className="mt-2 max-h-72 overflow-auto border border-brand-softGray bg-brand-offWhite p-4 text-xs leading-6">
                        {JSON.stringify(event.payload, null, 2)}
                      </pre>
                    </div>
                  </div>
                </details>
              );
            })}
          </section>
        )
      ) : null}

      {tab === "deliveries" ? (
        deliveries.length === 0 ? (
          <AdminEmptyState
            title="Belum ada delivery attempt"
            description="Channel in-app tidak memerlukan attempt provider. Attempt akan muncul saat provider eksternal diaktifkan."
          />
        ) : (
          <section className="overflow-x-auto border border-brand-softGray bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-brand-softGray text-xs uppercase tracking-[0.12em] text-brand-charcoal/45">
                <tr>
                  <th className="px-4 py-4">Notifikasi</th>
                  <th className="px-4 py-4">Attempt</th>
                  <th className="px-4 py-4">Provider</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4">Waktu</th>
                  <th className="px-4 py-4">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-softGray">
                {deliveries.map((delivery) => {
                  const notification = notificationById.get(delivery.notification_id);
                  return (
                    <tr key={delivery.id}>
                      <td className="px-4 py-4">
                        {notification ? (
                          <Link href={`/admin/notifications/${notification.id}`} className="font-semibold underline underline-offset-4">
                            {notification.title}
                          </Link>
                        ) : (
                          <span className="font-mono text-xs">{delivery.notification_id}</span>
                        )}
                      </td>
                      <td className="px-4 py-4 font-semibold">#{delivery.attempt_number}</td>
                      <td className="px-4 py-4">{delivery.provider || "-"}</td>
                      <td className="px-4 py-4">{NOTIFICATION_STATUS_LABELS[delivery.status]}</td>
                      <td className="px-4 py-4">{formatNotificationDate(delivery.attempted_at)}</td>
                      <td className="max-w-sm px-4 py-4 text-red-700">{delivery.error_message || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        )
      ) : null}

      {tab === "deletions" ? (
        !isNotificationSuperAdmin(data?.role) ? (
          <AdminAlert type="warning">
            Audit penghapusan permanen hanya dapat dibaca oleh Super Admin.
          </AdminAlert>
        ) : deletions.length === 0 ? (
          <AdminEmptyState
            title="Belum ada penghapusan permanen"
            description="Audit akan tersimpan otomatis ketika Super Admin menghapus notifikasi atau template dari Gudang Arsip."
          />
        ) : (
          <section className="space-y-3">
            {deletions.map((row) => (
              <details key={`${row.kind}-${row.id}`} className="border border-red-200 bg-white">
                <summary className="cursor-pointer list-none p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-red-700">
                        {row.kind === "notification" ? "Notifikasi Dihapus" : "Template Dihapus"}
                      </p>
                      <h2 className="mt-2 font-semibold">{getNotificationEventLabel(row.eventCode)}</h2>
                      <p className="mt-1 text-xs text-brand-charcoal/55">
                        {NOTIFICATION_CHANNEL_LABELS[row.channel]} · {row.reference}
                      </p>
                    </div>
                    <div className="text-sm text-brand-charcoal/60">
                      {formatNotificationDate(row.deletedAt)}
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-brand-charcoal/70">Alasan: {row.reason}</p>
                </summary>
                <pre className="max-h-80 overflow-auto border-t border-red-100 bg-red-50/40 p-5 text-xs leading-6">
                  {JSON.stringify(row.snapshot, null, 2)}
                </pre>
              </details>
            ))}
          </section>
        )
      ) : null}
    </div>
  );
}

function HistoryTab({
  label,
  value,
  active,
  disabled = false,
  onClick
}: {
  label: string;
  value: number;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`border p-5 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${
        active
          ? "border-brand-green bg-brand-green text-white"
          : "border-brand-softGray bg-white hover:border-brand-charcoal"
      }`}
    >
      <span
        className={`text-xs font-semibold uppercase tracking-[0.15em] ${
          active ? "text-white/70" : "text-brand-charcoal/45"
        }`}
      >
        {label}
      </span>
      <span className="mt-2 block text-3xl font-semibold">{value}</span>
    </button>
  );
}

function HistoryMeta({
  label,
  value,
  mono = false
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-charcoal/45">
        {label}
      </dt>
      <dd className={`mt-1 break-words text-brand-charcoal/75 ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
