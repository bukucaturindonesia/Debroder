# DEBRODER v1.2 Phase 12 — File Manifest

## New files

### Admin pages

- `app/admin/notifications/page.tsx`
- `app/admin/notifications/[id]/page.tsx`
- `app/admin/notifications/templates/page.tsx`
- `app/admin/notifications/history/page.tsx`

### API

- `app/api/admin/notifications/route.ts`
- `app/api/admin/notifications/[id]/route.ts`
- `app/api/admin/notification-templates/route.ts`
- `app/api/admin/notification-templates/[id]/route.ts`
- `app/api/admin/notification-history/route.ts`

### Services and helpers

- `lib/notifications.ts`
- `lib/notification-auth.ts`
- `lib/admin-notification-api.ts`

### UI

- `components/admin/AdminNotificationBell.tsx`
- `components/admin/NotificationInboxAdmin.tsx`
- `components/admin/NotificationDetailAdmin.tsx`
- `components/admin/NotificationTemplateAdmin.tsx`
- `components/admin/NotificationHistoryAdmin.tsx`

### Test and documentation

- `test/notification-phase12.test.ts`
- `docs/DEBRODER_V1.2_PHASE12_NOTIFICATIONS.md`
- `docs/DEBRODER_V1.2_PHASE12_FILE_MANIFEST.md`
- `PHASE12_SHA256SUMS.txt`

## Updated files

- `components/admin/layout/AdminHeader.tsx` — notification bell.
- `components/admin/layout/admin-navigation.ts` — routes, breadcrumb, access gate.
- `components/admin/QualityControlDetailAdmin.tsx` — restores the existing Phase 10 test-contract label `Upload Bukti QC`.
- `docs/DEBRODER_V1.2_EXECUTION_STATE.md`
- `docs/DEBRODER_V1.2_ISSUE_REGISTER.md`

## Database files

Tidak ada SQL atau migration baru di paket ini. Remote migration Phase 12 sudah applied dan tidak boleh dijalankan ulang.

## Installation

Copy source ke repository root dan replace file yang disebutkan. Jangan menjalankan SQL Phase 12 secara manual dan jangan reset database.

## Suggested commit message

`feat(v1.2): complete Phase 12 notifications`

## Deployment gate

- Build deployment harus hijau.
- Login sebagai Admin dan buka **Operasional → Notifikasi**.
- Verifikasi bell, inbox, mark read, archive/restore, detail, dan history.
- Login sebagai Super Admin untuk verifikasi deletion audit dan permanent-delete gate.
- Login sebagai Sales Admin untuk memastikan template manager ditolak.
- Jangan memulai Phase 13 dalam paket ini.
