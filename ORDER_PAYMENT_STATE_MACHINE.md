# Canonical state-machine mapping

Source review2026-10-26 at8ccb7fefc91d70226ae3f82331761155b34326d0. These are existing source vocabularies, not newly created enum/table definitions. Live installed schema remains unverified.

| Domain | Existing source states / meaning | Required transition guards |
|---|---|---|
| Order | pending_confirmation, awaiting_payment, confirmed, processing, completed, cancelled, expired (flow-specific shipping-quote states retained) | Server order/activation authority, valid totals/branch/reservation. Accepted/confirmed never means paid. |
| Payment summary | unpaid, pending_verification, partially_paid, paid; failure/expiry/refund represented in provider attempts/ledger | Verified provider binding or authorized cash evidence; server computes summary. Screenshot/redirect alone has no authority. |
| Provider attempt | pending, paid, deny, cancel, expire, refunded; late/partial cases review | Signature+authenticated status, requested provider order, merchant, transaction, IDR and exact amount; existing locks/idempotency. No downgrade from paid by stale pending. |
| Fulfillment | preparing, ready_to_ship, ready_for_pickup, completed/problem plus canonical dispatch states | Eligible payment/stock and physical QC. Pickup handover requires verified paid and authorized staff. |
| Operational task | open, acknowledged, in_progress, blocked, resolved, cancelled | Canonical task_key upsert; stale stages resolved; role/store scope preserved. |
| Custom production | JobOrder/WorkItem/QC canonical states | Payment/DP threshold AND design/spec approval AND operational readiness; payment alone insufficient. |

Owner conceptual events map to canonical operations: order.created -> creator/activation; payment.verified -> ledger+summary; inventory.reserved -> existing reservation authority; task.created -> task sync; physical completion -> canonical production/QC/fulfillment actions; expiry -> existing expiry function; refund.updated -> canonical adjustment/review. No direct frontend event may bypass guards.

Open transitions requiring new reviewed contract: single-use pickup token issue/redeem/replay, fast-lane cash versus integrated QRIS selection, complete same-key/different-key stock contention, installed expiry scheduling, cross-store direct RPC denial. Do not silently invent state transitions or enable unpaid custom production.