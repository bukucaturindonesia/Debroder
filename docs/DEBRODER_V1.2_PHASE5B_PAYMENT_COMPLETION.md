# DEBRODER v1.2 Phase 5B — Payment Tracking Completion

## Status teknis

BLOCKED — implementation and production build pass, but the final database audit/ACL patch and full test command could not run because the tool approval service reached its usage limit.

## Audit awal

- Live `orders`, `order_payments`, `payment_number_sequences`, RPCs, RLS, storage policies, and Phase 5A UI were inspected.
- Live row counts were zero for orders and payments.
- `payment-proofs` is private with a 10 MB MIME allowlist.
- Phase 5A balance was hardcoded to full payment and ignored corrections.
- Existing Phase 5A migration source is marker-only.

## Database

Applied migration:

- `20260712142905_v1_2_phase_5b_payment_completion.sql`

Local security patch awaiting live apply:

- `20260712143745_v1_2_phase_5b_payment_audit_lock.sql`

Added:

- `payment_submission_links`
- `payment_adjustments`
- `payment_activity_history`
- payment policy/effective balance/production eligibility fields on `orders`
- idempotency/source/link fields on `order_payments`
- constraints, FK indexes, updated-at trigger, RLS SELECT policies, server-only RPC grants
- token hash, expiry, revoke, usage limit, ten-second anti-double-submit, unique idempotency
- immutable adjustment decision flow and running-balance history
- full/percentage/fixed/deposit requirement calculation

## Routes and UI

- `GET/POST /api/public/payments/[token]`
- `GET/POST/PATCH/DELETE /api/admin/orders/[id]/payment-links`
- `POST /api/admin/orders/[id]/payment-requirement`
- `POST/PATCH /api/admin/payments/adjustments`
- `/payment/[token]`
- Phase 5B panels integrated into the existing order payment manager

The public page exposes only safe payment/order totals. Proofs are uploaded server-side to private storage. Public links use `NEXT_PUBLIC_SITE_URL` when generated.

## Lifecycle, role, and audit

- Staff roles can read payment link/adjustment/history data through RLS.
- Requirement changes and adjustments require verifier roles.
- Adjustment creator cannot self-approve unless Super Admin.
- Permanent payment-link deletion is defined as a Super Admin-only RPC and requires archive first; live application is blocked with the final patch.
- Human-readable profile email replaces raw archive actor UUID in the Phase 5A UI.

## Verification

- Live migration transaction: PASS
- Live customer submission/requirement/adjustment transaction with rollback: PASS
- Typecheck: PASS
- Lint: PASS, 0 errors
- Targeted tests: PASS, 7/7
- Full test: BLOCKED by approval usage limit
- Production build: PASS, 63 routes including the new public and admin APIs
- Desktop/mobile implementation: responsive layouts included; browser manual verification still required

## Remaining blocker

Apply the final audit/ACL migration, rerun database advisors for payment objects, and run the full test suite. Phase 6 must not start until these checks pass.

## Production freeze

Production is currently frozen. The second audit/ACL migration is included as source code only and must not be executed until the freeze is explicitly lifted. Existing data and database objects must not be removed. Phase 6–14 must not be tested yet.
