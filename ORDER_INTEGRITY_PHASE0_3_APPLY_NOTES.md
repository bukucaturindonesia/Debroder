# DEBRODER Order Integrity & Handoff Foundation v1.0 — Phase 0–3

## Baseline

- Source archive: `Debroder(18).zip`
- Git branch recorded in archive: `costum-produk-cekout`
- Git HEAD recorded in archive: `75ef404d3fb17e3efa3e68762e1bd5ead0811cf8`
- Remote Supabase project inspected read-only: `lzennundwqqtyvvcnzbg`

## Scope delivered

### Phase 0 — Audit and repair plan

- Added a grounded integrity audit report using the current remote schema/data.
- Added a non-destructive repair plan.
- Added an invariant matrix separating hard blocks, warnings, and historical compatibility.
- No order, payment, fulfillment, reservation, quotation, or notification row was repaired or deleted.

### Phase 1 — Canonical Active Stage Resolver

- Added a pure TypeScript resolver shared by customer/admin presentation.
- Added a server-side PostgreSQL resolver with the same operational precedence.
- Wired the resolver into order confirmation, payment, tracking, and Admin Order Detail.
- Kept safe client fallback behavior when the migration/RPC is not available yet.

### Phase 2 — Order Invariant Guard

- Added an additive integrity-finding ledger.
- Added hard guards only for new dangerous transitions:
  - payment verification without mutation evidence/checklist;
  - fulfillment method mismatch;
  - fulfillment before payment eligibility;
  - Ready Stock entering production;
  - Custom production before payment eligibility.
- Historical incompatible rows are recorded as findings instead of being rewritten.

### Phase 3 — Durable Admin Task Ledger

- Added persistent, idempotent order tasks with unique `task_key`.
- Added task ownership by role, assignee, priority, lifecycle timestamps, resolution, and audit history.
- Added server-side task synchronization from the canonical active stage.
- Added controlled task action RPC with role/permission checks.
- Did not add the visual Admin Task Inbox yet; that remains a later UI phase after Preview validation.

## How to apply

1. Back up the current repository and confirm the baseline source.
2. Copy the changed-files package into the repository root with path structure preserved.
3. Review the diff carefully. Do not copy unrelated files from the original archive.
4. Install the repository dependencies with the project package manager.
5. Run the targeted test:

   ```bash
   pnpm vitest run test/order-integrity-handoff-phase0-3.test.ts
   ```

6. Run the existing regression gates:

   ```bash
   pnpm typecheck
   pnpm lint
   pnpm test
   rm -rf .next
   pnpm build
   ```

7. Apply `supabase/migrations/20260720010000_order_integrity_handoff_phase0_3.sql` to a controlled Preview database only.
8. Inspect `order_integrity_findings` and `order_tasks` before executing any repair.
9. Run controlled E2E for Ready Stock, Custom, Jersey, transfer, pay-at-store, shipping, pickup, cancellation, payment correction, and historical orders.
10. Owner decides commit, push, Preview deployment, and later production rollout.

## Important boundaries

- Migration has **not** been applied to remote Supabase.
- No production data repair has been executed.
- No commit, push, merge, or Vercel deployment was performed.
- Do not mark Phase 0–3 production-complete until migration compilation, full quality gates, and browser E2E pass in Preview.
