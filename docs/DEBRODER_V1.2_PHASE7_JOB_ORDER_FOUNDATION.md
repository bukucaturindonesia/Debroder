# DEBRODER v1.2 — Phase 7 Job Order Foundation

## Scope of this batch

This package builds the operational foundation for Job Order without opening Phase 8 production work yet.

Implemented:

- actual migration source synchronized with the live Supabase migration history;
- Job Order list and eligible-order queue;
- create Job Order from an eligible order;
- immutable order, mockup, and payment snapshots;
- centralized JO numbering through Phase 6 document numbering;
- Job Order detail page;
- draft/ready editing with revision history;
- controlled foundation transitions: Draft, Siap Dirilis, Dibatalkan;
- active list, archive warehouse, restore, and Super Admin permanent delete;
- human-readable actors from profiles;
- navigation, breadcrumbs, order-detail entry point, responsive states, and static tests.

## Intentionally deferred to Phase 8/9

- generation and management of Work Items;
- release to production;
- assignment, dependencies, and production progress;
- production hold/resume/completion UI.

The database already has the shared production foundation, but this Phase 7 UI deliberately does not expose release actions before Phase 8 is implemented.

## Routes

- `/admin/job-orders`
- `/admin/job-orders/[id]`
- order detail entry: `/admin/orders/[id]` → `Job Order`

## Roles

Read and operational access:

- owner
- superadmin
- super_admin
- admin

Permanent delete:

- superadmin
- super_admin

Sales Admin is intentionally excluded from production Job Orders.

## Lifecycle available in this foundation

`Pesanan memenuhi syarat → Buat Job Order → Lihat → Edit → Siap Dirilis / Kembali ke Draft / Batalkan → Arsipkan → Gudang Arsip → Pulihkan → Hapus Permanen Super Admin`

## Database state

The connected Supabase project already contains these remote migrations:

- `20260712070529 phase7_to_phase9_production_foundation`
- `20260712095523 v1_2_phase_7_job_order_foundation_and_security`
- `20260712095652 v1_2_phase_7_job_order_creation_atomic_number`
- `20260712100924 v1_2_phase_7_notification_dependency_ambiguity_fix`
- `20260712101029 v1_2_phase_7_job_order_history_trigger_alignment`

Do not paste or apply them manually. The SQL files in this package synchronize repository source with the already-installed remote history.

## Verification performed in this environment

- latest repository base verified at Phase 6 commit;
- live Phase 7 tables, functions, RLS, ACL, triggers, and migration history inspected;
- live core transaction test previously returned `phase7_core_test_passed = true`;
- TypeScript syntax parse for new and modified files: PASS;
- static migration/navigation contract prepared.

Full dependency-based commands remain for Vercel/normal working copy:

- `pnpm run typecheck`
- `pnpm run lint`
- `pnpm run test`
- `pnpm run build`

## Status

`FOUNDATION IMPLEMENTED — LIVE DATABASE FOUNDATION PRESENT — DEPLOYMENT/OWNER VERIFICATION REQUIRED — NOT PHASE 7 COMPLETE`
