# DEBRODER v1.2 Phase 7 Foundation — File Manifest

Copy the entire extracted package into the repository root and choose **Replace** when prompted.

## New files

- `app/admin/job-orders/page.tsx`
- `app/admin/job-orders/[id]/page.tsx`
- `components/admin/JobOrderAdmin.tsx`
- `components/admin/JobOrderDetailAdmin.tsx`
- `lib/job-orders.ts`
- `supabase/migrations/20260712070529_phase7_to_phase9_production_foundation.sql`
- `supabase/migrations/20260712095523_v1_2_phase_7_job_order_foundation_and_security.sql`
- `supabase/migrations/20260712095652_v1_2_phase_7_job_order_creation_atomic_number.sql`
- `supabase/migrations/20260712100924_v1_2_phase_7_notification_dependency_ambiguity_fix.sql`
- `supabase/migrations/20260712101029_v1_2_phase_7_job_order_history_trigger_alignment.sql`
- `test/job-order-phase7-foundation.test.ts`
- `docs/DEBRODER_V1.2_PHASE7_JOB_ORDER_FOUNDATION.md`
- `docs/DEBRODER_V1.2_PHASE7_FILE_MANIFEST.md`
- `docs/DEBRODER_V1.2_FAST_COMPLETION_PATH.md`

## Replaced files

- `components/admin/layout/admin-navigation.ts`
- `components/admin/OrderDetailAdmin.tsx`
- `docs/DEBRODER_V1.2_EXECUTION_STATE.md`
- `docs/DEBRODER_V1.2_ISSUE_REGISTER.md`

## Important

The Phase 7 migrations are already installed remotely. Copying these SQL files only synchronizes source control. Do not run them manually.

## Commit message

`feat(v1.2): add Phase 7 Job Order foundation`
