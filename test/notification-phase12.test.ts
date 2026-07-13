import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  NOTIFICATION_EVENT_LABELS,
  canManageNotificationTemplates,
  formatNotificationRelativeDate,
  getNotificationStatusTone,
  isNotificationRole,
  isNotificationSuperAdmin,
  normalizeNotificationEventCode,
  validateNotificationTemplateInput
} from "@/lib/notifications";

const inboxApi = readFileSync(resolve("app/api/admin/notifications/route.ts"), "utf8");
const detailApi = readFileSync(
  resolve("app/api/admin/notifications/[id]/route.ts"),
  "utf8"
);
const templateApi = readFileSync(
  resolve("app/api/admin/notification-templates/route.ts"),
  "utf8"
);
const templateDetailApi = readFileSync(
  resolve("app/api/admin/notification-templates/[id]/route.ts"),
  "utf8"
);
const historyApi = readFileSync(
  resolve("app/api/admin/notification-history/route.ts"),
  "utf8"
);
const navigation = readFileSync(
  resolve("components/admin/layout/admin-navigation.ts"),
  "utf8"
);
const header = readFileSync(resolve("components/admin/layout/AdminHeader.tsx"), "utf8");
const inboxUi = readFileSync(
  resolve("components/admin/NotificationInboxAdmin.tsx"),
  "utf8"
);
const templateUi = readFileSync(
  resolve("components/admin/NotificationTemplateAdmin.tsx"),
  "utf8"
);
const historyUi = readFileSync(
  resolve("components/admin/NotificationHistoryAdmin.tsx"),
  "utf8"
);

describe("Phase 12 notification helpers", () => {
  it("normalizes event codes and validates template content", () => {
    expect(normalizeNotificationEventCode("  Production Started / Manual ")).toBe(
      "production_started_manual"
    );
    expect(
      validateNotificationTemplateInput({
        eventCode: "",
        channel: "in_app",
        titleTemplate: "",
        bodyTemplate: ""
      })
    ).toHaveLength(3);
    expect(
      validateNotificationTemplateInput({
        eventCode: "production_started",
        channel: "in_app",
        titleTemplate: "Produksi dimulai",
        bodyTemplate: "Produksi {{reference}} telah dimulai."
      })
    ).toEqual([]);
  });

  it("keeps role gates aligned with Phase 12 permission levels", () => {
    expect(isNotificationRole("sales_admin")).toBe(true);
    expect(canManageNotificationTemplates("sales_admin")).toBe(false);
    expect(canManageNotificationTemplates("admin")).toBe(true);
    expect(isNotificationSuperAdmin("superadmin")).toBe(true);
    expect(isNotificationSuperAdmin("owner")).toBe(false);
  });

  it("labels operational events and status tones", () => {
    expect(NOTIFICATION_EVENT_LABELS.payment_verified).toContain("Diverifikasi");
    expect(NOTIFICATION_EVENT_LABELS.tracking_available).toContain("Resi");
    expect(getNotificationStatusTone("failed")).toBe("error");
    expect(getNotificationStatusTone("not_configured")).toBe("warning");
    expect(getNotificationStatusTone("sent")).toBe("success");
  });

  it("formats recent notification time without exposing an invalid date", () => {
    const now = Date.parse("2026-07-13T02:00:00.000Z");
    expect(
      formatNotificationRelativeDate("2026-07-13T01:59:40.000Z", now)
    ).toBe("Baru saja");
    expect(formatNotificationRelativeDate("invalid", now)).toBe("-");
  });
});

describe("Phase 12 backend and UI contract", () => {
  it("uses authenticated user-scoped RPCs for inbox lifecycle", () => {
    expect(inboxApi).toContain("mark_all_notifications_read");
    expect(detailApi).toContain("mark_notification_read");
    expect(detailApi).toContain("archive_notification");
    expect(detailApi).toContain("restore_notification");
    expect(detailApi).toContain("permanently_delete_notification");
    expect(detailApi).toContain('requireNotificationActor(request, "superadmin")');
  });

  it("ships template CRUD, archive, restore, and deletion audit lifecycle", () => {
    expect(templateApi).toContain("create_notification_template");
    expect(templateApi).toContain("Channel notifikasi tidak valid");
    expect(templateDetailApi).toContain("update_notification_template");
    expect(templateDetailApi).toContain("archive_notification_template");
    expect(templateDetailApi).toContain("restore_notification_template");
    expect(templateDetailApi).toContain("permanently_delete_notification_template");
    expect(templateUi).toContain("Provider Eksternal");
    expect(templateUi).toContain("Belum Diaktifkan");
  });

  it("exposes immutable event, delivery, and deletion history", () => {
    expect(historyApi).toContain("notification_events");
    expect(historyApi).toContain("notification_deliveries");
    expect(historyApi).toContain("notification_deletion_audit");
    expect(historyApi).toContain("notification_template_deletion_audit");
    expect(historyUi).toContain("append-only");
    expect(historyUi).toContain("Audit Penghapusan");
  });

  it("integrates the bell, inbox, routes, navigation, and sales role restriction", () => {
    expect(header).toContain("AdminNotificationBell");
    expect(navigation).toContain('href: "/admin/notifications"');
    expect(navigation).toContain('pathname.startsWith("/admin/notifications")');
    expect(navigation).toContain('pathname === "/admin/notifications/templates"');
    expect(inboxUi).toContain("Tandai Semua Dibaca");
    expect(inboxUi).toContain("Gudang Arsip");
  });
});
