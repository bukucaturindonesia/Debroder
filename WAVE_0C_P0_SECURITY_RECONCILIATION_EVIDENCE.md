# DEBRODER — WAVE 0C P0 SECURITY CLOSURE + MIGRATION RECONCILIATION

Date: 15 August 2026  
Mode: focused P0 remediation, repository-controlled, no remote mutation

## 1. EXECUTIVE RESULT

The Wave 0C local remediation is complete and ready for external verification.
The anonymous quotation snapshot exposure was reproduced and its root cause is
addressed by a new forward-only migration. The repository now contains a
fail-closed staging identity contract and permanent static regression coverage.

The remote database was not changed. The live fix, post-fix SQL matrix,
authenticated E2E, and deployment evidence remain blocked until an isolated
staging identity and disposable fixtures are supplied.

## 2. CURRENT BRANCH AND HEAD

- Branch: `UI-MIGRATION`.
- HEAD: `43f935b321906093df13e521f411ca3aa102799e`.
- Wave 0C changes are uncommitted local working-tree changes.

## 3. PRE-EXISTING DIRTY FILES

Before Wave 0C edits, the working tree already contained the Wave 0B changes:

- `CURRENT_PHASE_HANDOFF.md`
- `DEBRODER_MASTER_STATE.md`
- `DEBRODER_V1.2_ISSUE_REGISTER.md`
- `e2e/support/env.ts`
- `e2e/wave-0a.spec.ts`
- `WAVE_0B_RUNTIME_RELEASE_EVIDENCE.md`
- `e2e/public-readonly.spec.ts`

Those changes were preserved. Wave 0C did not reset, clean, or overwrite
unrelated owner work.

## 4. QUOTATION VULNERABILITY REPRODUCTION

Live function inspected read-only:

- `public.build_quotation_snapshot(uuid)`.
- Owner `postgres`; `SECURITY DEFINER`; `search_path=public`.
- `PUBLIC`, `anon`, `authenticated`, `postgres`, and `service_role` had
  execution grants.
- The function selected a quotation by `p_quotation_id` and returned
  `to_jsonb(q)` plus quotation items/services. It did not call `auth.uid()`,
  `has_permission`, `has_staff_role`, or a customer/store scope helper.

Controlled reproduction used a transaction and `SET LOCAL ROLE anon`. A known
existing quotation UUID was obtained internally by a privileged read-only query
and was not printed or included in this report. The anonymous call returned a
non-null snapshot. A separate anonymous REST RPC probe using only the public
anon URL/key and a random UUID returned HTTP 200 with no data. This distinction
shows that the attack requires a known/leaked quotation ID, but an ID is not an
authorization boundary.

Attack path: an unauthenticated caller can POST the public Supabase anon key to
`/rest/v1/rpc/build_quotation_snapshot` with
`{"p_quotation_id":"<known quotation UUID>"}` and receive private quotation
data.

## 5. EXACT ROOT CAUSE

The root cause is the combination of `SECURITY DEFINER`, broad execution ACLs,
and a missing authorization predicate in a function that serializes private
quotation fields. RLS on `quotations` could not protect this function because
the definer executes with owner privileges. The existing quotation model has
no `store_id` field or customer ownership policy; its live access contract is
staff/admin permission-only.

## 6. SECURITY REMEDIATION

The smallest root-cause correction is a forward `CREATE OR REPLACE FUNCTION`
plus explicit ACL correction:

- `SET search_path = ''` and fully qualified application tables.
- Require `public.has_permission('quotation.read')` inside the function.
- Revoke all execution from `PUBLIC`, `anon`, `authenticated`, and
  `service_role`.
- Grant execution only to `authenticated`; the permission predicate remains
  the actual staff/admin authorization gate.
- Do not invent customer sharing or store scope in this migration.
- Do not create a second product/quotation data source or client service-role
  path.

## 7. CORRECTIVE MIGRATION

Created:
`supabase/migrations/20260815212358_wave_0c_quotation_snapshot_security.sql`.

The migration first checks that the historical function exists with
`pg_catalog.to_regprocedure`; it fails rather than silently creating an
unrelated API. It is forward-only and does not delete, rename, squash, reset,
mark applied, or rebuild schema. It has not been applied remotely.

## 8. SECURITY REGRESSION TESTS

`test/wave-0c-security.test.ts` passes 8/8 tests and encodes the required
matrix:

- anonymous private quotation and arbitrary-ID calls: denied by ACL and
  permission predicate;
- customer A/B: denied under the current staff-only quotation contract;
- store A/B: no store scope exists in this quotation model, so store identity
  cannot bypass the permission predicate;
- authorized admin and superadmin: allowed only when their authenticated
  session has `quotation.read`;
- service-role boundary: no grant and no client service-role use;
- `SECURITY DEFINER` safety: existing-function precondition, empty
  `search_path`, and fully qualified tables.

These are repository/static contract tests because safe staging was not
available. Live post-migration role tests remain required.

## 9. RELATED RPC AUDIT

The focused quotation/customer RPC audit inspected grants, definer state,
search path, and authorization behavior for quotation lifecycle, revision,
repeat-order, archive/restore, and mockup-review functions.

- Mutation functions such as quotation revision, archive/restore, repeat-order,
  and mockup-link creation contain authenticated identity or staff checks and
  raise on denial.
- `get_public_mockup_review(text)` and
  `submit_mockup_part_decision(text,uuid,text,text)` are intentional public
  token-scoped mockup workflows; they validate token hash, expiry, revocation,
  and part/set association. They were not changed.
- No second equivalent anonymous private-quotation P0 was found in the focused
  domain. Existing `search_path=public` on guarded historical definer RPCs is
  a later hardening opportunity, not an equivalent unauthenticated data leak
  proven in this wave.

## 10. MIGRATION HISTORY DIAGNOSIS

Read-only remote history reports 173 applied records. The local baseline had
132 migration files, 80 exact timestamp-key matches, 43 local-only timestamp
keys, and 93 remote-only timestamp keys. Numeric local prefixes are unique, but
the repository has 9 nonnumeric `_applied.sql` artifacts, standalone SQL, a
historical `schema.sql`, and no `supabase/config.toml`.

The evidence supports historical renaming, splitting, aggregation, or manual
application, but does not prove that each remote-only record is a schema drift.
The remote applied-history listing is authoritative for applied state; the
local migration directory is authoritative for future corrections. A safe
schema/function/policy/grant/index diff requires an isolated environment.

## 11. MIGRATION RECONCILIATION MATRIX

The detailed matrix is in
`supabase/MIGRATION_RECONCILIATION_WAVE_0C.md` and classifies
`MISSING_IN_REPO`, `MISSING_IN_REMOTE`, `DUPLICATE_HISTORY`,
`ORDERING_CONFLICT`, `SCHEMA_DRIFT`, `FUNCTION_DRIFT`, `POLICY_DRIFT`,
`GRANT_DRIFT`, `INDEX_DRIFT`, `MANUAL_CHANGE`, `HISTORICAL_ONLY`, and
`NO_DRIFT` with expected state, observed evidence, risk, correction, and
implemented status.

The actionable Wave 0C function/grant drift is corrected in the new migration;
the remote state remains pending. Historical mismatches are documented rather
than rewritten.

## 12. SAFE STAGING CONTRACT

`e2e/support/env.ts` now requires:

- explicit `DEBRODER_ENV` matching `E2E_TARGET_ENV` in `staging`, `test`, or
  `preview`;
- `E2E_SAFE_STAGING_IDENTITY=DEBRODER-WAVE-0C-STAGING`;
- matching `E2E_SUPABASE_PROJECT_REF` and
  `E2E_EXPECTED_SUPABASE_PROJECT_REF` with a valid non-production ref;
- fixture prefix matching `debroder_e2e...`;
- `E2E_FIXTURE_NAMESPACE_CONFIRMED=1`;
- all disposable customer/admin/product/pickup/payment fixture variables;
- `E2E_ALLOW_MUTATIONS=1` only after the identity contract passes.

`.env.example` contains placeholders only. No staging secret, credential, or
actual staging project ref was committed.

## 13. PRODUCTION GUARD EVIDENCE

The Wave 0A mutation suite was run with the known production Supabase ref and
production target. It stopped in `requireWave0aEnv()` with
`BLOCKED — SAFE STAGING IDENTITY NOT ESTABLISHED`; five mutation tests did not
run. No browser navigation, fixture creation, checkout, payment, cleanup, or
database mutation occurred.

The pure guard tests also prove production ref rejection, missing/mismatched
attestation rejection, missing fixture namespace rejection, missing credential
rejection, and mutation opt-in rejection.

## 14. QUALITY GATE RESULTS

- Focused Wave 0C Vitest: **PASS — 2 files / 11 tests**.
- Full Vitest: **PASS — 127 files / 957 tests**.
- TypeScript: **PASS**.
- ESLint: **PASS — 0 errors / 34 warnings**.
- Production build: **PASS — Next.js compiled and generated 139 routes**.
- `git diff --check`: **PASS** (only Git LF/CRLF normalization warnings).
- Relevant destructive Playwright: **EXPECTED BLOCK — safe staging guard**.
- Authenticated staging/security matrix: **NOT RUN — no safe staging inputs**.

## 15. BUILD WARNING ASSESSMENT

Build compilation succeeded. During local static generation, the restricted
environment emitted `TypeError: fetch failed` with `EACCES` causes. Generation
completed for all 139 routes and the process exited 0. These are classified as
local environment/network warnings, not harmless production proof; staging or
deployment reproduction remains required.

The 34 lint warnings are existing unused-variable, hook-dependency, and image
optimization warnings. They are non-fatal and unrelated to the Wave 0C files.

## 16. REFERENCE ADOPTION DECISIONS

- shadcn/ui: **REFERENCE ONLY**. No UI, form, dialog, table, or accessibility
  change was in Wave 0C.
- Vercel Commerce: **REFERENCE ONLY**. No storefront, caching, SEO, or image
  architecture change was in Wave 0C.
- Medusa: **ADAPTED PRINCIPLE** for narrow transaction/access discipline:
  preserve the existing quotation lifecycle and authorization boundary rather
  than migrate commerce architecture. No Medusa module or schema was copied.
- Trigger.dev: **DEFERRED**. Durable jobs, retries, queues, and agentic
  workflows are outside Wave 0C and Wave 1 remains prohibited.

## 17. FILES CHANGED BY WAVE 0C

- `.env.example`
- `e2e/support/env.ts`
- `supabase/MIGRATION_RECONCILIATION_WAVE_0C.md`
- `supabase/migrations/20260815212358_wave_0c_quotation_snapshot_security.sql`
- `test/wave-0c-security.test.ts`
- `test/wave-0c-migration-history.test.ts`
- `WAVE_0C_P0_SECURITY_RECONCILIATION_EVIDENCE.md`
- governance append: `CURRENT_PHASE_HANDOFF.md`, `DEBRODER_MASTER_STATE.md`,
  `DEBRODER_V1.2_ISSUE_REGISTER.md`.

## 18. DATABASE MIGRATION FILES CREATED

One file: `20260815212358_wave_0c_quotation_snapshot_security.sql`.

The Supabase CLI was unavailable, so the unique timestamped filename was
created manually after checking local numeric-prefix uniqueness. No dependency
was installed.

## 19. ACTUAL REMOTE DATABASE CHANGES

`REMOTE DATABASE CHANGED: NO`.

Only read-only metadata, catalog, function-definition, ACL, policy, and role
reproduction queries were run against the remote project. No migration, DDL,
grant, revoke, data mutation, or dashboard SQL was executed.

`REFERENCE REPOSITORIES CHANGED: NO`.

## 20. REMAINING EXTERNAL BLOCKERS

- owner-approved safe staging project/ref and namespace attestation;
- disposable customer A/B, admin, store, product/variant, pickup, and payment
  fixtures;
- apply the corrective migration to staging and run post-fix catalog/ACL
  checks;
- live anonymous/customer/store/admin/superadmin/service-role security matrix;
- authenticated Wave 0B checkout/payment/replay/RLS/RBAC E2E;
- accessible Vercel deployment identity, build evidence, and rollback target;
- staging/deployment classification of local build-time fetch warnings.

## 21. EXACT NEXT ACTION

Provide the isolated staging identity and disposable fixture contract, apply
only the Wave 0C migration there, then run the post-fix role/ACL matrix and
resume the blocked Wave 0B authenticated E2E suite. Do not apply the migration
to production and do not start Wave 1.

WAVE 0C COMPLETE — P0 LOCAL REMEDIATION READY FOR EXTERNAL VERIFICATION
