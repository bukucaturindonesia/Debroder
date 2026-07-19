# DEBRODER Order Invariant Matrix

## Enforcement levels

- **Hard block:** reject a new dangerous transition.
- **Critical finding:** preserve historical readability and create an integrity task.
- **Warning:** operational follow-up required; no automatic business decision.

| Code | Invariant | Level | Phase 0–3 behavior |
|---|---|---|---|
| `terminal_pending_payment` | Cancelled/expired order must not retain unresolved payment review | Critical finding | Persist finding and `resolve_integrity` task |
| `payment_review_order_status_mismatch` | Pending payment review outranks stale approval/review order status | Warning | Canonical stage becomes payment review; one finance task |
| `pending_payment_summary_without_record` | Pending payment summary requires a pending payment record | Warning | Persist finding; Admin review |
| `verified_payment_missing_evidence` | New verified payment requires five checks, reviewer/time, amount, destination, transaction time, and unique reference | Hard block + historical finding | Trigger blocks new incomplete verification; legacy rows preserved |
| `requirement_met_without_verified_payment` | Bank-transfer requirement cannot be met with zero verified/effective funds | Hard block/finding | Canonical stage becomes integrity review |
| `eligible_without_payment_requirement` | Production eligibility requires payment requirement met, except governed pay-at-store pickup | Hard block/finding | Prevent new production release |
| `fulfillment_before_payment` | Packing/handover cannot begin before payment eligibility, except pay-at-store pickup | Hard block/finding | Fulfillment trigger rejects new transition |
| `handover_without_final_check` | Ready/shipped/picked-up/delivered requires final-check evidence | Hard block/finding | Existing final-check guard protects new transitions; historical gap persisted |
| `completed_with_open_fulfillment` | Completed order requires terminal fulfillment | Hard block/finding | Preserve terminal customer state; create integrity task |
| `pickup_method_mismatch` | Pickup statuses require `method=pickup` | Hard block | Fulfillment trigger rejects transition |
| `shipping_method_mismatch` | Shipping statuses require `method=shipping` | Hard block | Fulfillment trigger rejects transition |
| `ready_stock_has_job_order` | Ready Stock cannot enter production Job Order | Hard block | Job Order release trigger rejects transition |
| `custom_job_before_payment` | Custom production cannot release before payment eligibility | Hard block | Job Order release trigger rejects transition |
| `expired_reservation_still_active` | Expired reservation must not remain active | Warning | Persist finding; controlled cleanup |
| `awaiting_payment_without_live_link` | Bank-transfer order needs a live link when no proof is under review | Warning | `payment_review` wins when proof exists; otherwise integrity task |
| `terminal_open_task` | Terminal order cannot retain obsolete active operational tasks | Ledger invariant | Task sync resolves/cancels obsolete tasks |
| `duplicate_active_task` | One canonical stage/event creates one task | Ledger invariant | Unique `task_key` and idempotent upsert |

## Canonical precedence

1. Terminal order/terminal fulfillment.
2. Hard integrity issue.
3. Concrete valid post-payment fulfillment stage.
4. Production and quality-control facts.
5. Verified payment/post-payment routing.
6. Submitted proof/payment review.
7. Payment correction.
8. Partial or pending payment/link.
9. Customer approval.
10. WhatsApp confirmation.
11. Shipping quote.
12. Order review/pricing.
13. Pay-at-store pickup preparation.
14. Integrity fallback.

Terminal states remain terminal for customers. Contradictions create an Admin integrity task instead of silently reopening the journey. Proof submission never equals verified payment.
