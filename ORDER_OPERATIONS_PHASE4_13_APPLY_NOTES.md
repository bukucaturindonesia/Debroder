# DEBRODER Phase 4–13 — Apply Notes

## Ownership boundary

ChatGPT prepared source, migration, tests, and this package. The owner handles GitHub branch, commit, push, merge, and Vercel deployment.

## Required order

1. Confirm the repository already contains Phase 0–3:
   - `lib/order-active-stage.ts`
   - `lib/order-tasks.ts`
   - `supabase/migrations/20260720010000_order_integrity_handoff_phase0_3.sql`
2. Copy this changed-files-only package into the repository root and merge folders.
3. Review the exact changed-file manifest.
4. Run source gates before database work:

```bash
pnpm install --frozen-lockfile
pnpm vitest run test/order-operations-phase4-13.test.ts
pnpm typecheck
pnpm lint
pnpm test
rm -rf .next
pnpm build
```

5. Apply migrations to a Preview database in timestamp order:

```text
20260720010000_order_integrity_handoff_phase0_3.sql
20260720020000_order_operations_phase4_13.sql
```

6. Verify new tables and RPCs in Preview.
7. Run the E2E matrix below.
8. Run Supabase security and performance advisors.
9. Deploy a Vercel Preview from the owner-managed branch.
10. Merge/apply to production only after every gate is green.

## Required Preview verification

### Database

Confirm these objects exist:

```text
customer_notification_outbox
order_handoff_state
order_task_sla_policies
inventory_locations
inventory_balances
inventory_movements
stock_transfers
stock_transfer_items
pickup_preparations
pickup_preparation_items
order_cancellation_requests
refund_cases
refund_allocations
refund_evidence
operations_health_runs
operations_health_findings
```

Check:

- RLS is enabled.
- `anon` has no direct table access.
- authenticated users only see permitted task/outbox/inventory/refund/health records.
- Quality Control can see its QC task and linked order.
- a Sales Admin cannot read Finance-only assigned tasks.
- duplicate event/task/idempotency keys do not create duplicate rows.

### E2E minimum

```text
Ready Stock + bank transfer + shipping
Ready Stock + bank transfer + pickup
Ready Stock + pay at store + pickup
Custom + bank transfer + shipping
Custom + bank transfer + pickup
Jersey Ready Stock
Jersey Custom
Checkout double-click
Network timeout after order commit
Browser refresh during checkout
Payment proof pending then cancellation request
Historical verified payment then refund
Refund evidence missing from storage
Refund evidence path owned by another case
Pickup transfer with one missing SKU
Pickup reminder, extension, no-show, and handover
Failed outbox, retry, and task resolution
QC Task Inbox visibility
Health reconciliation repeated twice without self-loop
```

## Production restrictions

- Do not repair historical orders automatically from this migration.
- Do not mark proof upload as verified payment.
- Do not mark pickup ready without physical location reservation.
- Do not approve cancellation while a payment proof is pending review.
- Do not mark refund sent without the private storage object.
- Do not bypass task RLS with a browser service-role key.

## Rollback guidance

This is a forward-only migration. A production rollback should be a new migration that disables the new triggers/RPC entry points while preserving tables, history, evidence, tasks, and audit data. Do not drop the new tables after they have received operational data.
