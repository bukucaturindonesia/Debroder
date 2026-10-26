# Midtrans Snap — sandbox-first implementation and security

Status: **IMPLEMENTED FOR FAST READY-STOCK LANE / MOCK & LOCAL SQL PASS / SANDBOX BLOCKED**.

## Environment and activation

Keep `DEBRODER_FAST_CHECKOUT_ENABLED=0` until migration and safe staging runtime are approved. `DEBRODER_ENV=staging`, `FAST_CHECKOUT_SUPABASE_PROJECT_REF`, and HTTPS Supabase hostname must agree. Production project `lzennundwqqtyvvcnzbg` and lookalike hosts are rejected by new fast endpoints. Midtrans Production is explicitly unsupported by this package.

Required server environment:

- `NEXT_PUBLIC_SUPABASE_URL`, existing anon key, and `SUPABASE_SERVICE_ROLE_KEY` for selected staging only.
- `FAST_CHECKOUT_SUPABASE_PROJECT_REF=ykfjgnrigcsapblbxnxb`.
- `FAST_CHECKOUT_SIGNING_SECRET` (32+ random characters).
- `MIDTRANS_ENV=sandbox`, `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `MIDTRANS_MERCHANT_ID`.
- `NEXT_PUBLIC_SITE_URL` set to the actual HTTPS staging host.
- RajaOngkir key and complete shipping settings/PIM weights for shipped orders.

Enter secrets only in secure local/server environment management. Do not paste Server Key/service role/passwords into chat, issue, PR, or repository. Client Key is intentionally sent to the authorized browser for Snap.js; Server Key is never sent.

Configure Sandbox dashboard notification URL as `https://STAGING-HOST/api/payments/midtrans/notification`. Finish/unfinish/error dashboard URLs point back to `https://STAGING-HOST/checkout`; application requests override finish with that same checkout return. Notification must be publicly reachable HTTPS; localhost and protected Preview URLs do not establish webhook acceptance. No dashboard/environment change was performed in this task.

## Order and attempt lifecycle

The new database transaction uses canonical Ready Stock creation/activation/reservation, saves one session with request hash, validates server total, and commits unpaid order **before** requesting a Snap token. One provider ID per attempt (`DBR-<internal UUID>-<attempt number>`), one internal order across retries, immutable amount/merchant/sandbox mapping. Row/advisory locks and unique keys protect claims. Prices/item_details must sum exactly to gross_amount.

Repeated requests reuse a persisted token. A provider timeout or failed token save leaves attempt `creating`; it is not assumed absent. A Snap status 404 before method selection is not permission to create another attempt. Such uncertainty remains blocked for reconciliation. Explicitly terminal deny/cancel/expire can allow a new attempt on the same unpaid order after server verification. A late/second settlement is quarantined for finance review instead of applying money twice.

The browser loads official sandbox Snap.js, uses popup, and falls back only to a validated official sandbox `/snap/` redirect. Callback success/pending/error/close only triggers server status checks. Cart/draft remain while pending/failing, and new cart contents are not blindly cleared after an older order succeeds. Legacy recovery drafts continue through the old recovery flow.

## Webhook/reconciliation

Signature: constant-size SHA-512 verification of order_id + status_code + gross_amount + Server Key. Since that signature does not cover transaction_status, notification handling also requests authenticated current Midtrans status. Environment, merchant, currency, amount, provider transaction ID and order mapping must match. Atomic RPC applies ledger/status/audit effects once; paid/refunded/review cannot be downgraded by a delayed pending notification.

Paid requires official success status_code 200 and settlement, or capture with fraud accept. Pending/challenge is unpaid. Deny/cancel/expire do not delete the internal order. Full refund handling exists in the candidate; partial refunds require finance review and are not automatically applied. Refund-before-settlement or a second settlement is held for review. No automatic restock/refund purchase or real-money action is implemented.

New `order_payments.provider_attempt_id` evidence allows only the server-side matching paid gateway attempt; it does not fabricate human reviewers/checklist entries. Every manual/historical payment still uses the existing evidence guard conditions, whose staging definition was read. Source changes are not proof that all existing triggers accept gateway entries.

## Migration and risk gate

CLI-created candidate: `supabase/migrations/20261026045918_fast_checkout_midtrans_rajaongkir_v1.sql`. Replay classification **DO NOT RUN**. Local isolated PGlite test runs actual new SQL but uses explicit stubs for legacy order/reservation/summary functions. It does **not** verify real canonical inventory consumption, fulfillment, task/notification/audit triggers, customer roles, or staging RLS end-to-end.

Before apply: reconcile four remote-only and eleven historical local-only versions; compare function definitions, inspect guards/constraints/triggers, test candidate in disposable full-schema environment, then review/apply on chosen safe staging. Never edit applied historical migrations or disable RLS. Candidate extends an existing payment evidence guard; this sensitive change requires review before any remote application.

Safe recovery: feature off; preserve all orders/attempts; reconcile unresolved creating/review rows via provider evidence. No destructive SQL rollback. If a future rollback is needed, write a reviewed forward correction preserving gateway ledger evidence; do not drop added columns/tables/history or blindly restore a guard that rejects already verified gateway records.

Sources: [Snap integration](https://docs.midtrans.com/docs/snap-snap-integration-guide), [notification/authenticity/order handling](https://docs.midtrans.com/docs/https-notification-webhooks), [authenticated status API](https://docs.midtrans.com/reference/get-transaction-status).
