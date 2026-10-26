# Security/payment audit —2026-10-26

Baseline8ccb7fefc91d70226ae3f82331761155b34326d0. Source audit plus local regression is distinct from installed-target security acceptance. No secret/customer rows/payment API request or remote SQL performed.

## Existing controls
- Fast context requires feature flag and exact staging project/environment; production explicitly blocked. Midtrans configuration is sandbox-only and fails closed. Server key confined to server provider adapter.
- Notification verifies timing-safe SHA512 signature then fetches authenticated current status because signature does not cover transaction_status. Browser redirect cannot mark paid.
- Application/RPC check merchant, currencyIDR, amount, provider attempt/transaction identity and canonical order. Existing SQL handles duplicate event/attempt locks and prevents stale paid/refund downgrade; late states route to review. Partial refund requires review rather than invented settlement totals.
- Existing payment/cash permissions and scoped dashboard server access remain. No new RLS/authentication mechanism or widened ACL introduced.

## Wave1 correction
Authenticated provider response must belong to the exact order ID requested, for signed webhook reconciliation and authorized status polling. Reject missing/different returned orderID before ledger RPC. Tests exercise actual handlers with deterministic mocked provider replies; this is not real-provider proof. No change to signature rules, monetary policy or migration.

## Open release-security gates
- Direct RPC and Storage role/branch ownership, authenticated cashier scope, order visibility and privilege escalation require effective installed-policy tests. Restricted candidate evidence stays local; no claim of live exploit or resolved cross-store authorization.
- Full canonical trigger integration, last-stock contention, deadlocks, reservation expiry/release and idempotent handover remain unverified on named target.
- Single-use pickup code is not found in audited source. Existing handover confirmation/evidence must not be represented as a single-use secret implementation.
- Screenshot/manual QRIS cannot satisfy server-verified payment. Authorized cash and integrated-provider QRIS remain separate authorities.
- Backup/PITR and rollback readiness must precede risky target changes. No new migration authored from incomplete target evidence.

## Access prerequisites
Use named disposable staging, existing canonical schema/dependency prechecks, separate owner approval for mutations and sandbox merchant keys configured through secret manager (never pasted). Public HTTPS callback must reach exact staging application. No production transactions or fallback target guessing. Current Vercel project owner-confirmedokdeal/debroder but connector404 from prior check; no repeated identical lookup without new access evidence.

Sources: lib/fast-checkout/{providers,server}.ts, fast-checkout SQL candidate, canonical pickup/task/fulfillment/payment migrations, lib/global-admin-dashboard/access.ts. Detailed test command/result appended after execution. Overall security acceptanceNO-GO.

Refund exception backlog: partial-refund/unmatched refund amounts are rejected for review before the apply RPC, while status polling retains stored state. That guard is preserved; a durable canonical exception record/finance queue for these provider cases is not demonstrated. A reviewed contract is required before adding a new mutation. Notification delivery is also not accepted merely because a task/status exists; no configured outbound channel/delivery receipt was tested.

Official Midtrans references used by Agent05: https://docs.midtrans.com/docs/https-notification-webhooks and https://docs.midtrans.com/reference/get-transaction-status. Documentation review does not count as real sandbox execution.
