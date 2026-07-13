# Phase 9 GitHub File Manifest

Salin seluruh isi paket ke root repository DEBRODER dan pilih **Replace**.

## New files

- `app/admin/production/page.tsx`
- `components/admin/ProductionStatusAdmin.tsx`
- `lib/production.ts`
- `supabase/migrations/20260712131753_v1_2_phase_9_production_status_and_progress.sql`
- `supabase/migrations/20260712132103_v1_2_phase_9_job_order_status.sql`
- `supabase/migrations/20260712132131_v1_2_phase_9_work_item_status.sql`
- `test/production-phase9.test.ts`
- `docs/DEBRODER_V1.2_PHASE9_PRODUCTION_STATUS.md`
- `docs/DEBRODER_V1.2_PHASE9_FILE_MANIFEST.md`

## Updated files

- `components/admin/JobOrderDetailAdmin.tsx`
- `components/admin/WorkItemDetailAdmin.tsx`
- `components/admin/layout/admin-navigation.ts`
- `lib/job-orders.ts`
- `lib/work-items.ts`
- `test/job-order-phase7-foundation.test.ts`
- `test/work-item-phase8-foundation.test.ts`
- `docs/DEBRODER_V1.2_EXECUTION_STATE.md`
- `docs/DEBRODER_V1.2_ISSUE_REGISTER.md`

## Database status

The three Phase 9 migrations are already installed on the connected production database. The SQL files in this package synchronize the repository migration source with the exact remote versions.

**Do not paste or run these migrations manually.**

## Commit message

`feat(v1.2): complete Phase 9 production status`

## Verification after deployment

1. Open `OPERASIONAL → Status Produksi`.
2. Confirm the dashboard opens on desktop and mobile.
3. Open a released Job Order and start production.
4. Start, hold, and resume a Work Item.
5. Send a Work Item to `Menunggu QC`.
6. Confirm progress and status history update.
7. Confirm Phase 10 actions are not yet available.
