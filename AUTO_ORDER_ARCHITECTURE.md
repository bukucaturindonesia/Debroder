# Auto-order architecture — controlled wave1

Date2026-10-26. Baseline8ccb7fefc91d70226ae3f82331761155b34326d0. Goal: at most3major customer steps and zero approval clicks for valid paid normal orders; these are targets, not measured achievements.

## Existing canonical path
Product/PIM/cart -> guest checkout -> server pricing/quote/branch validation -> canonical order creator -> canonical activation -> payment attempt -> Midtrans sandbox -> signature verification -> authenticated current status -> requested-order/merchant/transaction/currency/amount binding -> payment ledger -> refresh summary -> canonical fulfillment/task/audit triggers -> employee physical work -> shipment or pickup.

Order creation and activation can have separate transaction boundaries; durable order recovery must reuse the same idempotency key. Gateway failure must not erase the order or cause a second order. Payment attempts and orders are distinct identities. Browser Snap callbacks request reconciliation and never establish paid status.

Reuse task_key and ready-stock:<order_id> identifiers. Conceptual events from the owner map onto existing mutations/triggers; no parallel generic event engine/tables are proposed. Do not emit task.created independently of canonical eligibility.

## Three required scenarios
- A shipping+online: authoritative rate/total, confirmed provider payment, allocated stock, eligible preparation/packing, physical dispatch. Existing fast candidate implements the route; complete real sandbox/full-schema acceptance is blocked.
- B pickup+online: eligible branch, zero shipping, paid guard, preparation, ready, single-use code, handover. Online branch exists; single-use code contract and activated UAT remain missing.
- C pickup+pay-at-store: ready stock only, unpaid order, bounded reservation, preparation, authorized cash or server-verified QRIS, paid handover, expiry release. Existing legacy path stays intact; fast-lane integration is NOT implemented in this wave.

## Failure and retry
Signature/status mismatches reject before ledger effects. Provider unavailability leaves recoverable existing order/attempt. Duplicate/out-of-order notifications reconcile authenticated current state and use existing attempt/event/ledger locks. Unknown refunds and partial refunds go to review; do not invent refund totals. Task/fulfillment trigger errors require full-schema testing and an explicit exception/recovery procedure before release.

## Safe wave and rollback
No schema/environment mutation or production deployment. First wave changes only status-response identity binding and read-only dashboard presentation. Feature flags remain default-off and staging/sandbox guards retained. Roll back reviewed application commits through a separately reviewed revert if needed; do not rewrite Git or delete order/payment/task data. Future DB corrections must be new forward-only migrations with installed-definition prechecks, constrained ACLs, postchecks and named-target owner authorization.