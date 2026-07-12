# DEBRODER v1.2 Phase 5B — GitHub File Manifest

This package contains only the Phase 5B source changes and its audit documents. It intentionally excludes the full repository snapshot, logs, generated TypeScript build info, unrelated assets, and Phase 6–14 UI.

## Files to copy into the repository root

- `app/api/admin/orders/[id]/payment-links/route.ts`
- `app/api/admin/orders/[id]/payment-requirement/route.ts`
- `app/api/admin/payments/adjustments/route.ts`
- `app/api/public/payments/[token]/route.ts`
- `app/payment/[token]/page.tsx`
- `components/admin/PaymentCompletionPanel.tsx`
- `components/admin/PaymentTrackingManager.tsx`
- `components/payments/PublicPaymentForm.tsx`
- `lib/payment-auth.ts`
- `lib/payments.ts`
- `supabase/migrations/20260712142905_v1_2_phase_5b_payment_completion.sql`
- `supabase/migrations/20260712143745_v1_2_phase_5b_payment_audit_lock.sql`
- `test/payment-phase5b.test.ts`
- `test/payment-phase5b-migration.test.ts`
- `docs/DEBRODER_V1.2_PHASE5B_PAYMENT_COMPLETION.md`
- `docs/DEBRODER_V1.2_EXECUTION_STATE.md`
- `docs/DEBRODER_V1.2_ISSUE_REGISTER.md`

## Important state

- Main Phase 5B migration was already applied live before production was frozen.
- `20260712143745_v1_2_phase_5b_payment_audit_lock.sql` is source-only and remains unapplied.
- Copying this package to the repository does not execute SQL.
- Do not run Supabase migrations or test Phase 6–14 while production is frozen.
- Phase 5B remains `IMPLEMENTED / BLOCKED`, not technically verified and not owner verified.

## Excluded from the original snapshot

- `dev-server.log`
- `dev-server.err.log`
- `tsconfig.tsbuildinfo`
- `.env` files or secrets
- unrelated application files
- Phase 6–14 source/UI
