"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { notificationApiFetch } from "@/lib/admin-notification-api";
import {
  formatNotificationRelativeDate,
  type NotificationRow
} from "@/lib/notifications";

type InboxResponse = {
  notifications: NotificationRow[];
  counts: { active: number; unread: number; archive: number };
};

export function AdminNotificationBell() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState("");

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
    if (!notification.read_at && !notification.archived_at) {
      try {
        await notificationApiFetch(`/api/admin/notifications/${notification.id}`, {
          method: "PATCH",
          body: JSON.stringify({ action: "read" })
        });
        window.dispatchEvent(new Event("debroder:notifications-changed"));
      } catch {
        // Navigasi tetap dilanjutkan; status baca dapat diperbarui dari halaman detail.
      }
    }
    router.push(`/admin/notifications/${notification.id}`);
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
    </div>
  );
}
