# DEBRODER v1.2 Issue Register

## Open

- V12-010 — Local sandbox cannot run full dependency-based quality gates because `node_modules` is absent and package manager/dependency downloads are blocked. Verify final build on Vercel.

## Closed in Phase 10

- V12-009 — QC workflow needed alignment beyond legacy `phase10_qc_phase11_fulfillment`; resolved with Phase 10 QC-specific schema, workflow, completion, storage, and lifecycle migrations.

## Closed in Phase 11

- V12-011 — Duplicate legacy immutable trigger blocked controlled permanent deletion of archived fulfillment. Resolved by migration `20260713003444_v1_2_phase_11_history_trigger_alignment.sql`; transactional lifecycle test passed with rollback.

## V12-012 — Phase 11 deployment verification

- Severity: Gate
- Status: OPEN
- Detail: Source, database alignment, and transactional lifecycle verification completed. Final Vercel build and owner UI verification are pending.
