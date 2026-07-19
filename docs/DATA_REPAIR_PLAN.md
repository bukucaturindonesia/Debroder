# DEBRODER Data Repair Plan

**Status:** Review plan only — **No repair executed**.

## Repair principles

- Never update a payment merely to make an order status look consistent.
- Never mark paid from proof upload alone.
- Never invent mutation metadata for a legacy verified payment.
- Never invent final-check evidence for a fulfillment that historically lacks it.
- Never delete order/payment/task history to remove a warning.
- Every repair must record actor, reason, before/after values, and evidence.
- Prefer canonical RPCs over direct table updates.
- Run one order at a time in controlled Preview before production correction.

## Classification

| Class | Meaning | Treatment |
|---|---|---|
| A | Current valid state | No repair |
| B | Historical-compatible state | Keep; resolve/ignore finding with evidence |
| C | Deterministic safe repair | Controlled RPC with audit |
| D | Requires business/bank evidence | Manual review; no automatic change |

## Per-case plan

### `ORD-DEB-2026-0029` — Class D

Cancelled order with pending payment and live payment link:

1. inspect proof and actual DEBRODER bank mutation;
2. funds not found: record outcome/rejection, revoke link, keep order cancelled;
3. funds found: verify using full checklist, create cancellation/refund case, revoke link;
4. never reopen production automatically.

### `ORD-DEB-2026-0014` — Class D/B

Zero required amount made requirement/eligibility true without verified funds:

1. classify as legitimate historical override, incomplete Custom pricing, or test/demo;
2. legitimate historical override requires explicit reason and authorized actor;
3. incomplete Custom pricing must restore safe requirement/eligibility through a dedicated forward repair RPC;
4. test/demo data may be archived, never deleted.

### `ORD-DEB-2026-0008` and `ORD-DEB-2026-0027` — Class D

Pending payment review while order says customer approval:

- canonical stage must be payment review;
- create one task for the latest active payment;
- do not ask the customer to approve again;
- review/reject duplicates explicitly;
- `0008` additionally requires evidence review for its legacy verified payment.

### `ORD-DEB-2026-0001` — Class D

Three pending submissions and no live link:

- current task is payment review, not link generation;
- one canonical finance task, not three duplicate tasks;
- only issue a replacement link if the review outcome requests correction.

### `ORD-DEB-2026-0002` — Class C after validation

Awaiting payment, no live link, no pending submission:

- confirm order remains active and pricing final;
- confirm an active payment method;
- issue one idempotent automatic link;
- do not create a finance review task until proof is submitted.

### Legacy verified payments — Class B/D

Seven legacy records lack current evidence fields. Do not backfill guessed values. For each row:

- compare against bank records and historical audit;
- where evidence exists, use a dedicated controlled evidence-normalization action;
- where evidence is unavailable but the completed order is accepted as historical, resolve/ignore the finding with an explicit compatibility note;
- active order `ORD-DEB-2026-0008` must remain blocked until evidence is resolved.

### Legacy terminal fulfillments without final-check evidence — Class B

Five completed orders remain terminal. Do not set `final_verified_at` retroactively without real evidence. Resolve the finding as historical-compatible or attach archived evidence when available. Future fulfillment transitions remain hard-gated.

## Controlled repair workflow

1. Apply Phase 0–3 migration in Preview.
2. Run `evaluate_order_integrity_v1(order_id)`.
3. Capture order, payment, link, reservation, Job Order, QC, task, and fulfillment snapshots.
4. Execute only an approved canonical action/RPC.
5. Run `refresh_order_integrity_v1(order_id)` and `sync_order_operational_task_v1(order_id, null)`.
6. Confirm the finding and task reach the intended state.
7. Confirm public tracking and Admin detail show the same canonical stage.
8. Repeat in production only after owner approval.

## Prohibited repair methods

- bulk `UPDATE orders SET payment_status=...`;
- setting payment requirement met without verified evidence/approved override;
- fabricating checklist, bank reference, reviewer, or final-check timestamps;
- deleting duplicate payment submissions;
- forcing fulfillment completion;
- disabling triggers/RLS;
- truncating task, audit, notification, order, or payment tables.
