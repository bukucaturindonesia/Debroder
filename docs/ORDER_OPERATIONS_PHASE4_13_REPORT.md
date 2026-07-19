# DEBRODER Order Operations Phase 4–13 — Implementation Report

Date: 2026-07-20  
Source baseline: `Debroder(19).zip`  
Required foundation: Phase 0–3 migration `20260720010000_order_integrity_handoff_phase0_3.sql`

## Status

Phase 4–13 has been implemented in source and one forward-only migration. No GitHub, Vercel, or production Supabase write was performed during packaging.

## Implemented phases

### Phase 4 — Transactional Customer–Admin Handoff

- Canonical stage changes synchronize the lifecycle task and customer outbox.
- Exception tasks such as refund, cancellation, pickup no-show, outbox failure, and health reconciliation are preserved until their own workflow resolves them.
- Handoff state is idempotent and does not send historical customer messages during migration backfill.

### Phase 5 — Checkout Recovery & Idempotency

- Checkout identity is written to `sessionStorage` before the first request.
- Refresh, retry, and temporary network failure reuse the same idempotency key.
- A server recovery endpoint returns the existing order only when the deterministic tracking token matches its stored hash.
- Same key with a conflicting order identity fails closed.

### Phase 6 — Location-Aware Ready Stock

- Adds inventory locations, balances, movements, transfers, pickup preparations, and pickup item reservations.
- Ready Stock is not treated as ready for pickup until physical stock is present and reserved at the selected store.
- Source transfer selection requires one location to cover every missing pickup line, not merely one SKU.
- Legacy/global reservations belonging to other orders are subtracted before stock can be transferred.
- Catalog stock changes synchronize to the legacy location ledger.
- Pickup handover suppresses the legacy mirror only for the already-recorded store consumption, preventing double counting.

### Phase 7 — Public Error Hardening

- Public routes map failures to safe Indonesian messages and reference IDs.
- Database, RPC, storage, constraint, and stack details are logged server-side and not returned to customers.

### Phase 8 — Cancellation & Refund Consistency

- Historical verified funds are recognized from either payment `status` or `review_outcome`.
- A pending payment proof must be resolved before cancellation approval.
- Operational progression is blocked while an active cancellation decision exists.
- Orders already shipped, delivered, or picked up require a future return workflow instead of direct cancellation.
- Refund allocation is tied to verified source payments.
- Refund completion requires a real object in the private `refund-evidence` bucket, a case-owned object path, valid metadata, transfer reference, and transfer timestamp.

### Phase 9 — Customer Notification Outbox

- Adds manual WhatsApp, email, and in-app outbox records with retries and idempotent event keys.
- Recipient changes are refreshed on conflict.
- Failed outbox entries create a dedicated Admin task; retry, send, or cancellation resolves that task.

### Phase 10 — Pickup Reservation & No-Show

- Adds ready time, pickup deadline, reminder, extension request, approval/rejection, expiry, and no-show handling.
- Pay-at-store pickup records a fully verified cash payment atomically before handover.

### Phase 11 — SLA & Escalation

- Adds configurable SLA policies per task type.
- Overdue tasks become urgent and can be reassigned to the configured escalation role.

### Phase 12 — Admin Task Inbox

- Adds a role- and assignment-aware task inbox.
- Broad managers can see all tasks; operational staff can see only their assignment or unassigned queue for their role.
- Quality Control receives task permissions and can open the linked order detail.
- Five operational pages are added: Task Inbox, Location Stock & Pickup, Refunds, Customer Outbox, and Operations Health.

### Phase 13 — Reconciliation & System Health

- Reconciles terminal orders, pending payments, open tasks, outbox failures, pickup no-show, refund evidence, active reservation overbooking, location ledger mismatch, and invalid balances.
- `health_reconcile` tasks are excluded from terminal-open-task detection to prevent self-generated loops.
- Failed health runs are retained with a failed status rather than disappearing with the failed sub-transaction.

## Six final hardening findings closed

1. Refund proof must exist in private storage: **closed**.
2. Historical verified payments are recognized despite stale summary columns: **closed**.
3. Task Inbox direct-table access is role/assignment aware: **closed**.
4. Health reconciliation excludes its own task type: **closed**.
5. Every new RLS policy is drop-before-create and redeploy-safe: **closed**.
6. Quality Control Task Inbox and order-detail access are aligned: **closed**.

## Safety properties

- Forward-only and additive.
- No `TRUNCATE`.
- No `DROP TABLE`.
- No deletion of core order, payment, fulfillment, production, or reservation data.
- Existing historical records are not automatically repaired or rewritten.
- Phase 0–3 remains the canonical stage and lifecycle foundation.

## Pending quality gates

The package is source-complete but not yet production-certified. The following must run in the owner's repository/Preview environment:

- `pnpm typecheck`
- `pnpm lint`
- targeted Vitest through installed pnpm
- full Vitest suite
- clean Next.js production build
- PostgreSQL migration compile/apply on a Preview database
- browser E2E for Ready Stock, Custom, Jersey, payment exceptions, cancellation, refund, pickup, retry, and role access
- Supabase security and performance advisors after migration

Do not apply this migration before the Phase 0–3 migration is present and verified.
