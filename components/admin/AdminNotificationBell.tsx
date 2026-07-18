"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { notificationApiFetch } from "@/lib/admin-notification-api";
import { createSupabaseClient } from "@/lib/supabase";
import { resolveNotificationTarget } from "@/lib/notification-routing";
import {
  formatNotificationRelativeDate,
  type NotificationRow
} from "@/lib/notifications";

type InboxResponse = {
  notifications: NotificationRow[];
  counts: { active: number; unread: number; actionRequired: number; archive: number };
};

export function AdminNotificationBell() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState("");
  const [popup, setPopup] = useState<NotificationRow | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const payload = await notificationApiFetch<InboxResponse>(
        "/api/admin/notifications?scope=active&unreadOnly=true&limit=5"
      );
      setNotifications(payload.notifications);
      setUnread(payload.counts.unread);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Notifikasi gagal dimuat.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(true);
    const timer = window.setInterval(() => void load(true), 45_000);
    const handleFocus = () => void load(true);
    const handleChanged = () => void load(true);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("debroder:notifications-changed", handleChanged);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("debroder:notifications-changed", handleChanged);
    };
  }, [load]);

  useEffect(() => {
    const client = createSupabaseClient();
    if (!client) return;
    let active = true;
    let channel: ReturnType<typeof client.channel> | null = null;
    void client.auth.getSession().then(({ data }) => {
      const userId = data.session?.user.id;
      if (!active || !userId) return;
      channel = client.channel(`admin-notifications-${userId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `recipient_id=eq.${userId}` }, (event) => {
          const row = event.new as NotificationRow;
          setPopup(row);
          void load(true);
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications", filter: `recipient_id=eq.${userId}` }, (event) => {
          const row = event.new as NotificationRow;
          setPopup((current) => current?.id === row.id && row.resolved_at ? null : current);
          void load(true);
        })
        .subscribe();
    });
    return () => { active = false; if (channel) void client.removeChannel(channel); };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  async function openNotification(notification: NotificationRow) {
    setOpen(false);
    if (!notification.archived_at) {
      try {
        await notificationApiFetch(`/api/admin/notifications/${notification.id}`, {
          method: "PATCH",
          body: JSON.stringify({ action: notification.action_required ? "acknowledge" : "read" })
        });
        window.dispatchEvent(new Event("debroder:notifications-changed"));
      } catch {
        // Navigasi tetap dilanjutkan; status baca dapat diperbarui dari halaman detail.
      }
    }
    setPopup(null);
    router.push(resolveNotificationTarget(notification));
  }

  async function postponePopup() {
    const current = popup;
    setPopup(null);
    if (!current) return;
    try { await notificationApiFetch(`/api/admin/notifications/${current.id}`, { method: "PATCH", body: JSON.stringify({ action: "seen" }) }); }
    catch { /* Popup dismissal must never interrupt the current admin task. */ }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          const nextOpen = !open;
          setOpen(nextOpen);
          if (nextOpen) void load();
        }}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-brand-softGray bg-white text-brand-charcoal transition hover:border-brand-charcoal"
        aria-label={`Notifikasi${unread ? `, ${unread} belum dibaca` : ""}`}
        aria-expanded={open}
      >
        <span aria-hidden="true" className="text-lg">🔔</span>
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-12 z-50 w-[min(92vw,390px)] border border-brand-softGray bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-brand-softGray px-4 py-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-charcoal/45">
                Kotak Masuk
              </p>
              <p className="mt-1 text-sm font-semibold">{unread} belum dibaca</p>
            </div>
            <Link
              href="/admin/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold underline underline-offset-4"
            >
              Lihat semua
            </Link>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <p className="p-5 text-sm text-brand-charcoal/60">Memuat notifikasi...</p>
            ) : error ? (
              <div className="p-4 text-sm text-red-700">
                <p>{error}</p>
                <button type="button" className="mt-2 font-semibold underline" onClick={() => void load()}>
                  Coba lagi
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <p className="p-5 text-sm text-brand-charcoal/60">Tidak ada notifikasi baru.</p>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => void openNotification(notification)}
                  className="block w-full border-b border-brand-softGray px-4 py-4 text-left transition hover:bg-brand-offWhite"
                >
                  <div className="flex gap-3">
                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-green" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{notification.title}</span>
                      <span className="mt-1 line-clamp-2 block text-xs leading-5 text-brand-charcoal/65">
                        {notification.body}
                      </span>
                      <span className="mt-2 block text-[11px] font-medium text-brand-charcoal/45">
                        {formatNotificationRelativeDate(notification.created_at)}
                      </span>
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
      {popup ? (
        <aside role="status" aria-live="polite" className="fixed right-4 top-20 z-[90] w-[min(92vw,410px)] border border-brand-softGray bg-white p-5 shadow-2xl">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-green">{popup.priority === "critical" ? "Prioritas Kritis" : "Perlu Tindakan"}</p><h2 className="mt-2 font-semibold">{popup.title}</h2></div><button type="button" onClick={() => void postponePopup()} className="grid h-9 w-9 place-items-center rounded-full border border-brand-softGray" aria-label="Tutup popup notifikasi">×</button></div>
          <p className="mt-3 text-sm leading-6 text-brand-charcoal/65">{popup.body}</p>
          <div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={() => void openNotification(popup)} className="min-h-10 rounded-full bg-brand-green px-4 text-sm font-semibold text-white">Periksa Sekarang</button><button type="button" onClick={() => void postponePopup()} className="min-h-10 rounded-full border border-brand-softGray px-4 text-sm font-semibold">Nanti</button></div>
        </aside>
      ) : null}
    </div>
  );
}
