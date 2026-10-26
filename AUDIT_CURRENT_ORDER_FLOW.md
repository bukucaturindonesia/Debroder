# Current order-flow audit — 2026-10-26

Source baseline: main8ccb7fefc91d70226ae3f82331761155b34326d0, merged PR62. Director's previous1d22015 checkout is older and is preserved. Audit is source-based; no remote database/provider mutation or customer data read. The earlier D1.2 cart/payment packet remains separately reviewed in PR60, and assets in PR61; neither is silently merged here.

## Existing flows and administrative friction

| Flow | Evidence | Current outcome |
|---|---|---|
| Legacy guest checkout | components/checkout/CheckoutClient.tsx, app/api/checkout/route.ts | Guest order before payment; structured-address confirmation and shipping quote/customer reapproval add handoffs. |
| Fast shipping | components/checkout/FastCheckoutClient.tsx, lib/fast-checkout/server.ts, contracts.ts | Server prices and signed provider shipping quote remove manual quote step; order saved before Snap. Staging-only/default-off, sandbox real-provider UAT blocked. |
| Fast online pickup | Same fast contracts/server | Selected branch checked against configuration; shipping zero. Activated pickup real UAT not yet proven. |
| Pay at store | Existing canonical pickup/cash workflow migrations | Legacy workflow exists; fast lane hardcodes bank_transfer, has no payment-method selector and requires Midtrans configuration. ScenarioC is not complete. |
| Payment to tasks | fast_payment_apply_v1, refresh_order_payment_summary; canonical order/payment/fulfillment/task triggers | Existing trigger engine must be reused. Stubbed fast SQL tests do not prove complete trigger integration or zero admin approvals. |
| Admin dashboard | GlobalAdminDashboard.tsx and scoped read model | KPI/trend-first; ten queue summaries compete for attention. Priority grouping can improve discovery without new data or permissions. |

## Reuse, not replacement
Canonical sync_order_operational_task_v1 upserts task_key and resolves previous stages. Ready-stock fulfillment uses ready-stock:<order_id> idempotency. Existing expiry/scheduler source releases reservations; live installed scheduler is unverified. Custom work retains design/payment/DP/Job Order prerequisites.

## Immediate bounded changes
1. Bind authenticated Midtrans status response to the exact requested provider order before applying ledger effects. Actual-handler adversarial tests required.
2. Promote existing authorized queue summaries into Siap Dikerjakan / Dalam Proses / Perlu Perhatian. New/unpaid orders are not declared work-ready. Unknown queue kinds go to attention; overlapping counts are not summed.

## Deferred pending contract and evidence
Fast pay-at-store, single-use pickup code, QRIS/cash separation, installed schema/ACL/store boundaries, full-trigger concurrency and real sandbox callbacks require further controlled work. Do not activate new production features. No measured admin-click or handling-time claim yet.

## Conflict boundary
Dedicated branch codex/auto-order-admin-v1-20261026. Remote PRs54/60/61 observed; no DTF-specific open PR visible in this snapshot, but other-computer unpushed work remains unknown. Exclude app/sablon-dtf/**, homepage, globals.css, navigation and shared checkout configuration. Recheck upstream paths before publication; no automatic merge/rebase/reset.