# DEBRODER Staging Migration Reconciliation — 9 November 2026

**Decision: NO-GO for staging application and database-backed E2E.**
**Scope:** Supabase project `ykfjgnrigcsapblbxnxb` (debroder-staging). All remote operations in this audit were read-only. Production `lzennundwqqtyvvcnzbg` was not accessed.

## Directly verified staging catalog (read-only SQL)
- Applied migration records: **138**.
- Candidate `20261026045918_fast_checkout_midtrans_rajaongkir_v1.sql`: **not applied** (0 matches).
- Fast Checkout `fast_*` tables/functions: **0** before migration.
- Existing orders/order_payments/stock_reservations/order_shipping_quotes and the other six listed dependency tables: **present**.
- Required columns and six function signatures checked by `supabase/audit/fast_checkout_staging_readonly_preflight.sql`: **none missing**.
- Existing order/payment/stock reservation business triggers (non-internal): **22**.
- Existing `public.guard_verified_payment_evidence_v1()` function-definition MD5: `36d6d8ecf478b9b87d68f633c47b65f4` at audit time.
- Product shipping dimensions/weight fields introduced by the candidate: **not yet present**.
- Full read-only preflight SQL was committed and executed through the staging connection; result confirmed above.

## Migration identity reconciliation — provisional

Compared **138 remote applied versions** with **145 numeric rows in the repository's existing `DEBRODER_FRESH_DATABASE_REPLAY_MANIFEST.md` classification table**. This is a **manifest-vs-remote comparison, not a complete filesystem directory comparison**. Do not assert repository file count from these 145 entries.

Five remote records absent from that classification table:

| Applied remote version | Name | Actual repository file lookup |
| --- | --- | --- |
| 20260816102253 | debroder_fresh_database_baseline | PRESENT in repository; omitted from classification table but present elsewhere in manifest |
| 20260819144305 | wave_1_quotation_order_service_snapshot | NOT FOUND; repository has analogous version 20260819144205 |
| 20260819144442 | wave_1_order_item_service_trigger_contract | NOT FOUND; repository has analogous version 20260819144405 |
| 20261020163915 | p0_regular_checkout_recovery_v1 | NOT FOUND |
| 20261021041852 | p0_instant_checkout_lock_v1 | NOT FOUND |

Twelve manifest classification rows are absent from remote history:
- 2 historical product foundations classified `REPLACED BY BASELINE`;
- 7 entries explicitly classified `HISTORICAL ONLY`;
- 2 August quotation/order-item correction files with version differences relative to remote;
- 1 current Fast Checkout candidate classified `DO NOT RUN`.

No function/schema equality is implied by identical migration names. No `migration repair`, replay, rename, or history manipulation was performed.

## Runtime compatibility risks still unverified
1. Candidate replaces the existing security-definer `guard_verified_payment_evidence_v1()`. Current staging manual payment guard has been read, but any changes must be checked against its exact current definition before application.
2. Twenty-two existing order/payment/reservation triggers can affect checkout, stock, audit, handoff, and admin visibility. The existing PGlite fixture has **stub** canonical RPCs; passing it does not validate these production-like triggers.
3. Pay-at-store, pickup reservation, shipping quote creation, late settlement, failure and expiry behaviors need actual database-backed isolation/UAT.
4. Four missing historical source files need provenance; staging migration history must not be altered merely to make version counts equal.
5. Mock providers exist as **test fixtures**, not safely enabled runtime routes. No shipping/payment provider account or real status callback has been verified.

## Verification performed
- GitHub provider mock tests and adapter integration tests committed on `codex/mock-provider-staging-20261109`.
- CI workflow expanded to run `test/fast-checkout-database.test.ts` against isolated PGlite with legacy stubs, alongside shipping/payment tests and typecheck. Its result must be checked independently; it does **not** establish full-schema parity.
- Read-only catalog query: **PASS** (10 dependency tables; 21 required column checks; 6 function-signature checks).
- Disposable **full-schema** replay with actual legacy triggers: **NOT RUN**.
- Database-backed staging E2E: **NOT RUN**.

## Mandatory release gates
1. Recover and review the four missing applied migration sources (or document equivalent exact remote schema/function state with trustworthy provenance), and reconcile altered August version identifiers.
2. Reconstruct staging's full schema/triggers in a disposable environment, test the candidate there, and prove existing manual payment guard/stock/handoff remain functional.
3. Review and explicitly approve any subsequent staging DDL; stage is not production but contains existing records.
4. Test browser customer checkout -> deterministic provider simulation -> atomic paid/pending/failure outcomes -> admin order visibility -> stock transitions with disposable test data.
5. Repeat audit, security checks and release decision. Keep the Fast Checkout flag OFF and PR #65 Draft until proof is recorded.

**No data row was inserted, updated or deleted. No schema changes or remote deployments were performed as part of this migration audit.**

## Applied-SQL recovery and identity resolution — verified later in the same audit
- `supabase_migrations.schema_migrations.statements[1]` exists for all four missing-file remote versions. This was inspected read-only.
- Version `20260819144305` vs local `20260819144205`: SQL bodies are **equal after CRLF normalization and trim** (no content drift detected for this historical statement).
- Version `20260819144442` vs local `20260819144405`: likewise normalized SQL **equal**.
- Versions `20261020163915` and `20261021041852` were recovered from staging's applied statement archive and saved unmodified under `docs/audit/applied-migration-evidence/` as `.sql.txt`; read-back equality **PASS**.
- No executable `supabase/migrations` files were renamed, inserted or removed. No migration repair and no remote writes.
- Staging currently has **no existing Supabase development branches** (read-only listing); a disposable full-schema branch has not been created.

### Updated CI proof
- GitHub Actions run [42558047689](https://github.com/bukucaturindonesia/Debroder/actions/runs/42558047689) completed **SUCCESS**.
- Four Vitest files, **49/49 tests PASSED**. Includes existing **10 PGlite candidate migration tests with legacy stubs**. TypeScript typecheck also PASSED.
- This fixes a skipped seven-test suite caused by the project's `test/**/*.test.ts` inclusion pattern; suite was moved under `test/` before successful CI.

**Remaining release gate:** full-schema disposable PostgreSQL replay and real browser/database-backed E2E with all live business triggers. Passing PGlite stub tests is insufficient to apply this migration to the existing staging database.
