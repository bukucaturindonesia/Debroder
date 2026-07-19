# Migration Notes — Phase 0–3

Migration:

```text
supabase/migrations/20260720010000_order_integrity_handoff_phase0_3.sql
```

## Migration type

- Forward-only.
- Additive.
- No `TRUNCATE`.
- No core-table `DROP`.
- No order/payment/fulfillment deletion.
- No rewrite of historical business rows.

## Added database objects

### Tables

- `order_integrity_findings`
- `order_tasks`
- `order_task_history`

### Permissions

- `order.task.read`
- `order.task.manage`
- `order.integrity.read`

### Main functions

- `_evaluate_order_integrity_v1`
- `evaluate_order_integrity_v1`
- `refresh_order_integrity_v1`
- `_resolve_order_active_stage_v1`
- `resolve_order_active_stage_v1`
- `sync_order_operational_task_v1`
- `update_order_task_v1`

### New hard guards

- `guard_verified_payment_evidence_v1`
- `guard_fulfillment_method_invariants_v1`
- `guard_job_order_release_invariants_v1`

### Task synchronization triggers

Task/finding synchronization is attached to:

- `orders`
- `order_payments`
- `fulfillments`
- `job_orders`
- `qc_records`

## Historical compatibility

The migration backfill only creates findings/tasks. It intentionally does not invent:

- missing bank mutation references;
- missing payment checklist evidence;
- missing final-check timestamps;
- missing payment links;
- corrected order/payment statuses.

These conditions require controlled manual review or a separately approved forward repair migration.

## Current read-only audit evidence

At audit time, the remote database contained:

- 33 total orders; 31 unarchived.
- 1 terminal order with a pending payment review.
- 2 orders with payment review active while the order remained at customer approval.
- 1 historical zero-required order marked payment-eligible without verified funds.
- 7 legacy verified payment records missing the current mutation/checklist evidence model.
- 5 completed historical fulfillments without `final_verified_at`.
- 1 actionable awaiting-payment order without a live payment link after excluding orders that already have pending/verified submissions.

See `docs/ORDER_INTEGRITY_AUDIT_REPORT.md` and `docs/DATA_REPAIR_PLAN.md`.

## Preview verification required

After Preview application, verify:

1. Tables, indexes, RLS, policies, functions, and triggers exist.
2. `anon` has no task/finding access.
3. `authenticated` can only read through RLS and mutate through the controlled RPC.
4. `task_key` prevents duplicates under repeated trigger execution.
5. A payment cannot newly enter `verified` without all required mutation evidence.
6. Ready Stock cannot enter Job Order production.
7. Custom production cannot start before payment eligibility.
8. Pickup/shipping fulfillment cannot use an incompatible method.
9. Historical rows are readable and represented as findings, not rewritten.
10. Existing React #130, Jersey, Ready Stock, Custom, payment, and fulfillment regression suites remain green.
