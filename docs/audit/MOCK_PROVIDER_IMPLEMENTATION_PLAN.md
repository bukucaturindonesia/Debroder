# DEBRODER Mock Provider — Implementation and Acceptance Plan

Status: PLANNED — branch isolated; no runtime tests executed.

## Objective
Verify checkout from product selection through admin fulfillment without live Midtrans or RajaOngkir credentials.

## Existing constraints
- Preserve current Fast Checkout and legacy checkout paths.
- Read docs/checkout/UX_QA_EVIDENCE.md and docs/checkout/FAST_CHECKOUT_BASELINE.md.
- Staging migration drift must be reconciled before schema writes.
- Existing Fast Checkout is feature-flagged and provider integration is not production-proven.

## Implementation
1. Inspect existing shipping/payment adapters and environment validation; reuse existing interfaces, not a parallel checkout.
2. Add deterministic test-only shipping quotes with signed/validated quote semantics, destination/weight checks, timeout and 503 cases.
3. Add test-only payment adapter with pending/success/failed/expired transitions; only a trusted test harness may trigger outcomes.
4. Hard-fail mock adapters when deployed with production environment, production DB, or production credentials. Do not expose public status mutation routes.
5. Test checkout idempotency, inventory reservation/release, callback replay, authorization and order visibility in admin.
6. Run isolated unit/integration/Playwright tests. Verify actual staging DB configuration before writing any test orders.
7. Record exact commands and evidence in docs/audit/DEBRODER_CHECKOUT_E2E_REPORT.md. Mark provider-live integration BLOCKED until verified.

## Guardrails
- No writes to production Supabase.
- No migration reset, destructive SQL, or production deployment.
- No invented payment success.
- No credential commits.
- Use a separate test identity and deterministic fixtures.

## Acceptance
- One checkout attempt creates exactly one order.
- Valid simulated payment event alone transitions to PAID.
- Invalid/replayed events cannot double-fulfill.
- Admin can see test order and valid inventory transitions.
- Error/timeout cases preserve recoverability.
- Typecheck, lint, tests, build and Playwright evidence reported separately.
