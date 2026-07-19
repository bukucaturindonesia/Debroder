# DEBRODER Order Integrity Audit Report

**Scope:** Order Integrity & Handoff Foundation v1.0 — Phase 0  
**Source baseline:** `Debroder(18).zip`  
**Git baseline:** `75ef404d3fb17e3efa3e68762e1bd5ead0811cf8` (`costum-produk-cekout`)  
**Remote project audited read-only:** `lzennundwqqtyvvcnzbg`  
**Audit date:** 20 July 2026 (Asia/Makassar)

## Safety boundary

- No order, payment, reservation, fulfillment, quotation, PIM, Jersey, notification, or audit row was changed.
- No migration was applied remotely.
- Findings are evidence for a controlled forward migration and per-order repair review.
- Historical/demo rows remain readable and are never rewritten automatically by Phase 0–3.

## Current remote snapshot

| Metric | Result |
|---|---:|
| Total orders | 33 |
| Unarchived orders | 31 |
| Terminal order with pending payment review | 1 |
| Payment review active while order is still in customer approval | 2 |
| Payment requirement met with zero verified/effective funds | 1 |
| Production eligible without payment requirement | 0 |
| Completed order with open fulfillment | 0 |
| Pickup method/status mismatch | 0 |
| Shipping method/status mismatch | 0 |
| Ready Stock with Job Order | 0 |
| Job Order released before payment eligibility | 0 |
| Expired active reservation | 0 |
| Awaiting-payment rows without live link | 2 raw / 1 actionable |
| Legacy verified payments without full checklist/mutation metadata | 7 |
| Legacy completed fulfillments without final-check evidence | 5 |

## Confirmed findings

### OI-001 — Terminal order still has pending payment review

- Order: `ORD-DEB-2026-0029`
- Order status: `cancelled`
- Payment status: `pending_verification`
- Pending payment records: 1
- Live payment links: 1
- Severity: **Critical consistency finding**
- Automatic repair: **Not allowed**

Required review:

1. Determine whether the submitted payment was made before cancellation.
2. If funds were not received, resolve/reject the payment record and revoke the payment link.
3. If funds were received, do not silently reopen the order; open the cancellation/refund workflow.
4. Record reviewer, reason, mutation reference, and final resolution.

### OI-002 — Requirement marked met with zero verified funds

- Order: `ORD-DEB-2026-0014`
- Order status: `under_review`
- Payment method: `bank_transfer`
- Required amount: `0`
- Effective/verified payment: `0`
- `payment_requirement_met`: `true`
- `payment_production_eligible`: `true`
- Severity: **Critical historical compatibility finding**
- Automatic repair: **Not allowed**

Likely cause: a legacy zero-required-amount calculation treated payment as satisfied. The row needs evidence-based classification as legitimate payment-less history, incomplete Custom pricing, or test/demo data.

### OI-003 — Payment review outranks stale customer-approval status

Orders:

- `ORD-DEB-2026-0008`
- `ORD-DEB-2026-0027`

Both have a pending payment record while the order still says `awaiting_customer_approval`. The canonical resolver must expose **Pembayaran Sedang Diperiksa**, create one finance task per active payment, and preserve the stale order status as an integrity warning rather than asking the customer to approve again.

`ORD-DEB-2026-0008` also contains a legacy verified payment that lacks the current mutation checklist, so it requires manual evidence review before any further operational transition.

### OI-004 — Awaiting payment without a live payment link

Raw rows:

- `ORD-DEB-2026-0001` — three pending submissions already exist; payment review takes precedence, so a new link is **not** the current task.
- `ORD-DEB-2026-0002` — unpaid, no pending submission, no live link; this is the one actionable missing-link case.

The Phase 0–3 evaluator therefore reports `awaiting_payment_without_live_link` only when there is no pending or verified payment record.

### OI-005 — Seven legacy verified payments lack current evidence fields

Affected orders include:

- `ORD-DEB-2026-0003`
- `ORD-DEB-2026-0004`
- `ORD-DEB-2026-0005` (two payment records)
- `ORD-DEB-2026-0008`
- `ORD-DEB-2026-0009`
- `ORD-DEB-2026-0019`

These rows were verified under an older contract and lack one or more of: reviewed actor/time, verified amount, destination account, transaction time, unique bank reference, or five checklist fields. Phase 0–3 does not fabricate those facts. It creates findings and blocks only **new** transitions into `verified` unless the evidence is complete.

### OI-006 — Five legacy terminal fulfillments lack final-check evidence

Affected completed orders:

- `ORD-DEB-2026-0003`
- `ORD-DEB-2026-0004`
- `ORD-DEB-2026-0005`
- `ORD-DEB-2026-0009`
- `ORD-DEB-2026-0019`

They remain terminal and readable. The resolver does not reopen them. An integrity task records the historical gap, while the existing/new guards keep future handover transitions behind final verification.

## Source-level weaknesses confirmed

1. The Customer Order Hub resolver existed only as a customer presentation helper, not as a canonical server/Admin/task resolver.
2. Status interpretation was duplicated across tracking, confirmation, payment, Admin detail, payment summary, fulfillment, and notification modules.
3. Notifications had `action_required` but no durable task owner, state machine, unique key, due date, blocked state, or assignment history.
4. Existing unresolved notifications can outlive terminal orders.
5. Historical states require compatibility findings; attaching broad constraints directly to old rows would be unsafe.

## Phase 0 conclusion

The database is not broadly corrupt: current method/status, Job Order, and active-reservation checks are largely clean. Material risk is concentrated in legacy payment evidence, legacy final-check evidence, stale order/payment summaries, and the absence of a canonical task ledger.

Approved implementation strategy:

1. preserve all history;
2. resolve one canonical active stage;
3. persist integrity findings rather than silently rewriting data;
4. hard-block only new dangerous transitions;
5. create one idempotent operational task per canonical stage/event.
