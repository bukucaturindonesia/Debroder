# Fast Checkout V1 — review decision

**IMPLEMENTED IN PART / LOCALLY VERIFIED WITH MOCKS / NO-GO FOR ACTIVATION, RC OR PRODUCTION.**

The ready-stock fast lane, provider adapters, candidate database layer, webhook/status reconciliation, Admin setup UI, security checks, tests, and operational instructions are available. The feature defaults OFF, Midtrans only accepts sandbox, and production Supabase identity is hard blocked. No provider account, credential, staging data, production environment, DNS, or deployed release was changed.

## Remaining P0 acceptance

1. Reconcile migration drift and validate the candidate against the actual full legacy schema/triggers; local PostgreSQL fixture stubs are insufficient for staging approval.
2. Configure required keys securely in the designated staging environment, verify real origin/couriers/packing/stock allocation, and prove real RajaOngkir calls and Midtrans Sandbox token/notification/status behavior.
3. Run real guest and logged-in checkout with isolated products, pickup, stock/pricing changes, retry/concurrency, historical compatibility, Admin view/process, and two-customer/role/RLS matrix.
4. Integrate and accept Snap for approved final Custom/DP/configurator orders through the existing quotation/payment-link authority. Those modes retain the old workflow in this package and are not claimed complete.
5. Validate Admin settings and weight editing with existing authenticated owner/superadmin identities, dynamic data, and real notification/reconciliation queue. Global settings writes are intentionally restricted to owner/superadmin with all-store access.
6. Verify real device keyboard/focus/accessibility, provider popup/redirect/callback return, full refund/partial-refund handling policy, and measure the human 60–90-second experiment.
7. Confirm deployed Preview SHA/log/domain/HTTPS/rollback access; previous Vercel deployment listing returned 403. No production deploy or merge is authorized.

The broader twelve DEBRODER gates remain **BLOCKED**, with local subsets verified: DB-01 authenticated login, DB-02 real product CRUD, DB-03 populated catalog, DB-04 persisted checkout, DB-05 real order operations, DB-06 account isolation, DB-07 confirmed DTF consultation link, DB-08 complete visual/UAT, DB-09 actual Auth/RLS/transaction security, DB-10 provider/concurrency failure recovery, DB-11 deployed release/HTTPS/rollback, DB-12 operational acceptance. Local mock PASS is not a release-gate PASS. Historical v1.2 NO-GO is unchanged.

## Safe next execution

Review the draft branch payload and candidate migration. Continue in the isolated Git review checkout identified in FAST_CHECKOUT_BASELINE.md. Do not initialize or overwrite Git history in the original snapshot. Establish a disposable full-schema environment, reconcile October migrations, then perform an explicitly identified staging application and real provider tests using securely configured keys. Keep feature OFF until acceptance. Request owner approval only for production/merge/security-sensitive remote changes where required.

## Nontechnical Admin guide

1. In the approved **staging** Admin, open Pengiriman & Pembayaran.
2. Check integration status. Missing configuration must be completed by the engineer through secure environment management; the Admin never displays Server Key.
3. Search the shipping origin by name/postcode and select the correct result. Choose couriers and active pickup stores. Save.
4. Select the actual product and enter measured per-item weight (grams), length, width and height (cm). Do not use zero or guessed dimensions. Validate the packing/origin policy with operations.
5. Enable Sandbox payment only after configuration and migration approval. Use designated test customers/products; no money or data deletion.
6. For an order, read number, items, courier/service, shipping fee, total and payment status in the existing order workspace. Finance reviews unresolved `creating`/`review` attempts from the new settings queue; do not create a replacement order to hide a failure.
7. Pending/failed payment keeps the same order. Frontend success is not proof of payment. Full/partial refunds and suspicious second settlements require the documented verified server/finance flow.

No real Admin operational UAT has been passed yet. Rollback guidance is in MIDTRANS_INTEGRATION.md; preserve every payment/order/history row.
