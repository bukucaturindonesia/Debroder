# Staging change and approval packet

Current state: read-only audit completed; mutation approval **NOT GIVEN**. No new migration duplicates the already prepared fast-checkout candidate. Historical migrations and the candidate SQL remain unchanged.

## Before any application

1. Establish provenance and safe disposition of existing staging data. Prefer a separately approved disposable full-schema environment if provenance cannot be certified. Do not assume existing data may be removed.
2. Reconcile the four remote-only/twelve local-only versions and the final canonical dependency definitions. Do not replay the local-only set or use counts as a compatibility proof.
3. Review candidate `20261026045918`, its payment-evidence guard replacement, grants, stock/activation/summary/task dependencies and recovery procedure. Any correction must be a new forward-only migration after exact deficiencies are proven, created through the repository's migration workflow.
4. Execute a local/disposable full-schema rehearsal with actual canonical triggers. Existing stubbed PGlite tests are useful but do not prove real reservation/fulfillment/task behavior.
5. Prepare target-bound prechecks, dependency fingerprints, rollback/recovery evidence and postchecks. The accompanying SQL contains metadata SELECTs only and is a review aid, not an apply script.
6. Obtain explicit owner approval for the exact target, reviewed SQL/source SHA, mutation window and recovery plan. This audit is not that approval.

## After a separately approved change

Recheck schema/ACL/RLS and safe test-data provenance; then test guest checkout, provider success/pending/failure, duplicate/out-of-order webhook, last-stock contention, pickup and cashier boundaries, unpaid/replayed handover denial, custom design/DP gates, expiry release, unique task creation and notifications. Keep the eighteen-scenario matrix accurate.

Stop on the first failing precondition, preserve data/history and keep the feature OFF. Roll back application activation separately from a reviewed forward database compensation; never drop order/payment evidence, reset history or restore over newer transactions.

## Decisions requiring the owner

- Data provenance attestation and permission for any sanitization, replacement environment or seeded test identities.
- Access to the authorized application/deployment and provider Sandbox configuration.
- Exact remote migration/mutation and deployment approvals, once the concrete rehearsal packet is ready.

No approval is needed to continue isolated code, offline validation and local tests within the current scope. No DTF/homepage/global-style files are involved.

Candidate SHA-256 recorded without changing SQL: BD9C915DFE6F5EF02F57906E238D62868FD9426256E805DAFE31B6E3992C66F9. No migration attempted/applied by this task.
