# DEBRODER v1.2 Phase 13 — File Manifest

## New application files

- `lib/access-control.ts`
- `lib/phase13-auth.ts`
- `lib/admin-phase13-api.ts`
- `app/api/admin/access-control/session/route.ts`
- `app/api/admin/access-control/route.ts`
- `app/api/admin/access-control/users/[id]/route.ts`
- `app/api/admin/audit-log/route.ts`
- `app/admin/access-control/page.tsx`
- `app/admin/audit-log/page.tsx`
- `components/admin/AccessControlAdmin.tsx`
- `components/admin/SystemAuditAdmin.tsx`

## Updated application files

- `components/admin/layout/admin-navigation.ts`
- `components/admin/layout/AdminHeader.tsx`
- `components/admin/QuotationListAdmin.tsx`
- `components/admin/QuotationDetailAdmin.tsx`
- `components/admin/WorkItemAdmin.tsx`
- `components/admin/WorkItemDetailAdmin.tsx`
- `lib/fulfillments.ts`
- `lib/job-orders.ts`
- `lib/notifications.ts`
- `lib/payments.ts`
- `lib/quality-control.ts`
- `lib/work-items.ts`

## Database migration files

- `supabase/migrations/20260713090000_v1_2_phase_13_role_catalog_and_rls_alignment.sql`
- `supabase/migrations/20260713091500_v1_2_phase_13_production_history_rls.sql`

The local filenames preserve project source ordering. Supabase recorded the applied remote versions as:

- `20260713042309 v1_2_phase_13_role_catalog_and_rls_alignment`
- `20260713042359 v1_2_phase_13_production_history_rls`

## Test

- `test/role-audit-phase13.test.ts`

## Documentation

- `docs/DEBRODER_V1.2_PHASE13_ROLE_AUDIT.md`
- `docs/DEBRODER_V1.2_PHASE13_FILE_MANIFEST.md`
- `docs/DEBRODER_MASTER_STATE.md`
- `docs/CURRENT_PHASE_HANDOFF.md`
- `docs/DEBRODER_V1.2_EXECUTION_STATE.md`
