# P8B — Size Adjustment Data Mutation

Tanggal: 2026-07-24  
Project: `DEBRODER APPAREL` (`lzennundwqqtyvvcnzbg`)

## Approved cohort

Owner instruction `Lanjut` after the P8A full gate approves the exact P8A
`PENDING_CHANGE` cohort:

- fingerprint: `c8de001d6a246fe4465873326b7ad634`;
- 190 SKU 2XL: Rp0 → Rp10.000;
- 76 SKU 3XL: Rp0 → Rp20.000;
- 21 SKU 4XL: Rp0 → Rp30.000;
- total: 287 SKU;
- active/draft: 45/242;
- proven override: 0.

Excluded from mutation:

- 25 SKU XS because P8A defines no XS policy;
- one `Mix Size` SKU with `size_id = NULL`;
- historical order and pricing snapshots;
- product/variant price, inventory, route, UI, and pricing formula.

## Safety controls

Migration
`20260724011535_p8b_size_adjustment_data_mutation_v1.sql` is atomic and
abort-on-drift. Before mutation it locks the canonical PIM tables and verifies
the approved fingerprint, counts, Rp0 before values, active/draft split,
normalized duplicates, missing SKU, and new explicit override evidence.

Every changed SKU receives a canonical `system_audit_log` record containing
before/after, size, SKU, preview fingerprint, batch ID, and idempotency key.
The transaction aborts unless both audit and update counts equal 287.

Read-only verification:
`supabase/sql/05_p8b_size_adjustment_verification_read_only.sql`.

## Applied and verified

- Remote migration version:
  `20260724011535_p8b_size_adjustment_data_mutation_v1`.
- Migration preview transaction: PASS and rolled back with zero residue.
- Applied update count: 287.
- Audit row count / batch count: 287 / 1.
- Audit fingerprint: `c8de001d6a246fe4465873326b7ad634`.
- Managed SKU count / mismatch count: 1.147 / 0.
- Final managed distribution: S 215, M 215, L 215, XL 215, 2XL 190,
  3XL 76, 4XL 21.
- `Mix Size` unlinked/nonzero adjustment: 1 / 0.
- Security/performance advisors: no P8B-specific finding; existing
  repository-wide advisor backlog remains outside scope.
- Permanent schema/RLS change: none.

## Recovery

Do not run an unconditional rollback. If recovery is required, first select
the exact audit batch and restore only rows whose current adjustment still
equals the audited P8B after-value. Any row changed after P8B requires owner
review; historical order/pricing snapshots must never be rewritten.
