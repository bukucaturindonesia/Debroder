# DEBRODER WAVE 0B — EXTERNAL RUNTIME VERIFICATION & RELEASE EVIDENCE

Date: 2026-08-15
Mode: controlled implementation and executed verification
Primary repository: DEBRODER
Reference repositories: read only; no reference repository was modified.

## 1. Executive result

External read-only runtime checks succeeded for the configured public
deployment. The local static gates also pass. Authenticated transaction,
payment, cross-account RLS, RBAC, store-scope, and destructive replay tests
were not executed because a safe staging identity and isolated fixture set are
not established.

The remote Supabase project is reachable through the read-only connector and
its schema is healthy, but the applied migration history cannot be reconciled
one-to-one with the repository migration filenames. A live anonymous-executable
`SECURITY DEFINER` function, `public.build_quotation_snapshot(uuid)`, also
returns quotation data without an authorization check. This is a P0 release
blocker and was not invoked or modified.

Final decision: **WAVE 0B INCOMPLETE — EXTERNAL RUNTIME BLOCKERS REMAIN**.

## 2. Current head

- Branch: `UI-MIGRATION`.
- Current HEAD at the start and end of this wave: `43f935b321906093df13e521f411ca3aa102799e`.
- The HEAD commit was pre-existing. Wave 0B changes remain uncommitted in the
  working tree so they cannot be mistaken for a released commit.
- No deployment, push, merge, reset, or rollback was performed.

## 3. Pre-existing tree

- `git status --short` was empty before Wave 0B work began.
- `git diff --stat` and `git diff --cached --stat` were empty at baseline.
- The Wave 0A harness and evidence were pre-existing committed work; they are
  not attributed to Wave 0B.
- Reference repositories were not opened for writes and have no changed files.

## 4. Environment readiness

- Node: `v24.18.0`.
- pnpm: `10.12.4`.
- Next.js: `15.5.19`.
- Playwright: `1.62.1`; Chromium is installed.
- Supabase Auth health probe: `HTTP 200`.
- The configured public URL responded as `debroder.vercel.app` through a
  read-only request.
- All required Wave 0B mutation variables were missing from the process
  environment, including `E2E_BASE_URL`, `E2E_TARGET_ENV`,
  `E2E_SAFE_STAGING_IDENTITY`, `E2E_ALLOW_MUTATIONS`, both customer identities,
  Ready Stock fixture IDs, payment proof path, admin identities, and the
  out-of-scope order ID.
- No secret, token, password, or environment value was printed.

The required safety condition was not met:

`BLOCKED — SAFE STAGING IDENTITY NOT ESTABLISHED`

## 5. Migration reconciliation

- Supabase project discovered read-only: `DEBRODER APPAREL`, status
  `ACTIVE_HEALTHY`, region `ap-northeast-1`, PostgreSQL `17.6.1.127`.
- Remote applied migration records returned by the connector: `173`.
- Repository migration files: `132` total, consisting of `123` timestamped
  files and `9` legacy-named `_applied` files.
- Exact timestamp-key comparison found `80` matches, `43` local timestamp keys
  absent from the remote history, and `93` remote timestamp keys absent from
  the local timestamped file set.
- Examples of remote records without a matching local filename include
  `20260803095600_public_media_architecture_reconciliation_v1` and
  `20260808131000_superadmin_product_management_permissions_v1`.
- Example of a local migration not present in the remote migration list:
  `20260810100000_registered_customer_order_access_v1`.
- The mismatch may reflect historical renaming, squashing, or migrations
  applied outside this checkout; filenames alone cannot prove SQL equivalence.
- Supabase CLI and `psql` are unavailable locally. No migration was applied,
  replayed, reset, edited, or deleted. Pending status is therefore
  **UNRECONCILED**, not assumed clean.

## 6. Fixtures and side effects

- Test users created: none.
- Orders created: none.
- Payments created: none.
- Inventory reservations or movements created: none.
- Uploads or storage objects created: none.
- Remote rows queried: no business-row contents; only connector metadata,
  table inventory, policy/function metadata, and health responses.
- Cleanup: generated local Playwright `test-results` artifacts were removed.
- Database, storage, auth, deployment, and reference repositories were not
  mutated.

## 7. Quality gates

- TypeScript typecheck: **PASS**.
- ESLint: **PASS — 0 errors / 34 warnings**; warnings are pre-existing and
  include unused values, hook dependency notices, and `<img>` optimization
  notices.
- Vitest: **PASS — 125 test files / 946 tests**.
- `pnpm build`: **PASS — production compilation and 139 routes generated**.
- Build limitation: static generation emitted the known local `fetch failed`
  / `EACCES` warnings before completing successfully. They were not classified
  as staging-safe.
- `git diff --check`: clean at the baseline and after the Wave 0B code edits.
- Public read-only Playwright smoke against the configured deployment:
  **PASS — 1 test**, with no captured browser console errors.
- Authenticated/destructive Playwright suite: **fail-closed as designed**;
  first test stopped at the safe identity guard and the remaining five did
  not run.

## 8. Authentication

- External unauthenticated GET `/admin` reached `/admin/login` with HTTP 200.
- External unauthenticated GETs to `/api/admin/session`,
  `/api/admin/orders`, `/api/admin/access-control`,
  `/api/customer/session`, and `/api/customer/orders` returned HTTP 401.
- Customer login, logout, invalid-session recovery, and verified customer
  activation were not executed because no approved customer fixtures exist.
- Supabase Auth health returned HTTP 200, but health is not proof of a valid
  customer session or production transaction.

## 9. Commerce runtime

- Read-only external GETs returned HTTP 200 for `/`, `/koleksi`, `/jersey`,
  `/kaos-polos`, `/jaket-hoodie`, `/headwear`, `/sablon-dtf`,
  `/cetak-sublim`, `/keranjang`, `/cart`, `/search`, and `/help`.
- Browser smoke covered the public shell, `/koleksi`, and the cart alias path;
  the visible `<main>` shell was present.
- No authenticated cart, Ready Stock checkout, Custom/Jersey checkout,
  order-confirmation, payment-proof upload, or customer order-history flow was
  executed.
- No conclusion of transaction completeness is made from HTTP 200 alone.

## 10. Idempotency and replay

- The Wave 0B E2E additions cover sequential replay, concurrent replay using
  the same checkout key, conflicting payload reuse, and exact single-order
  matching.
- The suite also contains a negative payment submission probe.
- These tests were not allowed to run because the safe staging guard failed.
- Therefore duplicate order prevention, conflict responses, and concurrent
  transaction behavior remain **UNVERIFIED** externally.

## 11. Payment runtime

- The repository contains a customer payment-proof endpoint at
  `/api/public/payments/[token]` and an auth callback page; no provider payment
  webhook/callback route was found.
- The payment-proof endpoint is not treated as a provider webhook. Webhook
  replay is therefore **NOT APPLICABLE to the current repository surface**,
  not falsely marked as passed.
- Payment failure, success, retry, duplicate proof, and order/payment
  idempotency were not executed against an isolated runtime.
- No payment rows or evidence files were created.

## 12. Inventory and stock

- Remote metadata confirms `stock_reservations`, `inventory_balances`,
  `inventory_movements`, inventory locations, pickup preparation, and stock
  transfer tables exist with RLS enabled.
- The repository includes reservation, inventory authority, and pickup
  transition functions/routes.
- No stock reservation, concurrent checkout, release, consume, stale cleanup,
  pickup, or transfer mutation was attempted.
- Inventory correctness remains **UNVERIFIED** externally.

## 13. RLS

- The remote public table inventory reports RLS enabled for all listed public
  tables.
- Key policy metadata includes customer ownership on orders, staff permission
  checks, admin-guest deny policies, and store-scope predicates such as
  `can_access_order` and `can_access_inventory_location`.
- Seven RLS-enabled tables had zero explicit policies in the metadata query;
  their direct anon/authenticated table privileges were denied except for
  `order_task_sla_policies`, which still has RLS enabled and therefore remains
  default-deny without a policy.
- Cross-account customer A/B reads were not executed because the identities
  and isolated orders are missing.

## 14. RBAC

- Remote function/policy metadata exposes the expected role and permission
  primitives, including `current_actor_role`, `is_superadmin`,
  `has_staff_role`, and `has_permission`.
- Key orders, payments, products, inventory, and profile policies include role
  or permission predicates, and admin-guest write-deny policies are present.
- Full-admin, admin-guest, and scoped-admin browser/API checks were not run
  against the live runtime.
- RBAC is **implemented in metadata but not externally verified in this wave**.

## 15. Store scope

- Remote policies include order and inventory-location scope predicates for
  `store_admin` actors.
- The remote schema contains store assignments, inventory locations, and
  store-scoped order/inventory relationships.
- No multi-store fixture, scoped admin session, or out-of-scope order ID was
  available; store isolation is **UNVERIFIED**.

## 16. Privilege escalation

- Remote metadata reports `299` `SECURITY DEFINER` functions. Every one has a
  function `search_path` configuration: `71` explicitly use `public` and
  `228` use an empty search path.
- `47` are executable by `anon`; `184` are executable by `authenticated`.
- Several anonymous functions were inspected and showed intended auth/staff
  checks or public-token behavior, including CMS workflow, mockup review, and
  staff archive operations.
- P0 finding: `public.build_quotation_snapshot(uuid)` is `SECURITY DEFINER`,
  has `search_path=public`, is executable by `anon`, and returns a JSON
  quotation snapshot containing `to_jsonb(q)` fields without an authorization
  or permission predicate. No local application caller was found. It was not
  invoked, because invoking it would access business data unnecessarily.
- Required disposition: revoke anonymous execution and replace it with an
  explicitly authorized database path in an isolated staging/test environment,
  then prove the ACL and ownership behavior before production release.

## 17. Deployment verification

- Read-only GET of the configured deployment root returned HTTP 200.
- Read-only public route GETs returned HTTP 200 for the routes recorded in
  section 9.
- Vercel connector authentication was available for the `OKDEAL` team, but it
  returned no accessible projects. No project ID, deployment ID, commit SHA,
  build log, or promotion record was available through that connector.
- No `.vercel/project.json` exists in this checkout.
- The live deployment cannot be proven to correspond to current HEAD.

## 18. Rollback readiness

- No deployment version or promotion record was available to identify a safe
  rollback target.
- No rollback was performed.
- No database rollback was attempted; no migration or schema change was made.
- Release rollback readiness is **UNVERIFIED** until the deployment project,
  immutable build SHA, and rollback procedure are supplied.

## 19. Defects found

### P0 — anonymous quotation snapshot exposure

The live database exposes `build_quotation_snapshot(uuid)` to `anon` as a
`SECURITY DEFINER` function without an authorization check. This can permit
unauthorized quotation-data reads when an ID is known or obtained.

### P0 — migration history not reconciled

Remote applied migration records and the repository migration set have
different version/name identities. The release cannot assert schema parity or
safe pending migration state.

### P0 — authenticated release evidence unavailable

The required safe staging identity, fixture IDs, and credentials are absent.
The destructive suite correctly refuses to run.

### P1 — static-generation network warning unclassified

The production build succeeds but emits `fetch failed` / `EACCES` during local
static generation. A deployment/staging classification is still required.

### P2 — quality warnings remain

ESLint reports 34 warnings. They do not fail the gate, but they leave known
unused values, hook dependency, and image optimization debt.

## 20. Fixes applied

- Tightened `requireWave0aEnv()` so mutation-capable E2E requires an explicit
  staging/test/preview URL, the exact safe identity marker
  `DEBRODER-WAVE-0B-STAGING`, and `E2E_ALLOW_MUTATIONS=1`.
- Added concurrent checkout replay and conflicting-key assertions.
- Added a negative payment-failure assertion.
- Added a public non-mutating browser smoke test.
- No database fix was applied because the target environment is not proven to
  be isolated and no safe staging identity exists.
- No reference repository, deployment, migration history, or production data
  was changed.

## 21. Reference adoption matrix

| Area | Reference | Pattern considered | Wave 0B decision | Risk |
|---|---|---|---|---|
| Public route smoke and loading boundary | `vercel-commerce` | Canonical public route checks and explicit storefront states | ADAPTED as read-only smoke only | Does not prove commerce transactions or caching correctness |
| Admin/RBAC interaction states | `shadcn-ui` | Consistent form/table/dialog/error/loading composition | REFERENCE ONLY; defer to the Admin wave | UI adoption could expand scope without fixing P0 data safety |
| Transaction replay and lifecycle verification | `medusa` | Atomic workflow thinking, explicit lifecycle transitions, compensation testing | ADAPTED as replay/conflict test intent; no migration | A full workflow abstraction could diverge from DEBRODER’s existing Supabase RPCs |
| Durable retries, queues, and human approval | `trigger-dev` | Durable execution and retry semantics | ADOPT LATER; no agentic runtime in Wave 0B | Introducing jobs before transaction correctness can hide failures or duplicate work |

All four reference repositories remained read-only. No module or framework was
copied or merged.

## 22. Files changed

Wave 0B working-tree files:

- `e2e/support/env.ts`
- `e2e/wave-0a.spec.ts`
- `e2e/public-readonly.spec.ts`
- `WAVE_0B_RUNTIME_RELEASE_EVIDENCE.md`
- `CURRENT_PHASE_HANDOFF.md`
- `DEBRODER_MASTER_STATE.md`
- `DEBRODER_V1.2_ISSUE_REGISTER.md`

No Wave 0B commit was created. Wave 0A files already present in the baseline
commit are not re-attributed to this wave.

## 23. Database and migration changes

- Database changes: **NONE**.
- Remote SQL executed: read-only metadata queries only.
- Migrations applied: **NONE**.
- Migrations edited, deleted, reset, or replayed: **NONE**.
- Supabase policies, functions, triggers, indexes, tables, storage, auth
  users, and production data: **UNCHANGED**.

## 24. Blockers

1. `BLOCKED — SAFE STAGING IDENTITY NOT ESTABLISHED`.
2. Authenticated customer/admin fixtures and safe test order/payment data are
   missing.
3. Remote/local migration history is unreconciled.
4. Anonymous execution of `build_quotation_snapshot(uuid)` requires a P0 ACL
   correction and isolated verification.
5. The live deployment cannot be associated with current HEAD through the
   available deployment connector.
6. Rollback target and rollback evidence are unavailable.

## 25. Release matrix

| Gate | Result | Evidence |
|---|---|---|
| TypeScript | PASS | `pnpm typecheck` |
| ESLint | PASS WITH WARNINGS | 0 errors / 34 warnings |
| Unit/contract tests | PASS | 125 files / 946 tests |
| Production build | PASS WITH WARNINGS | 139 routes; local fetch/EACCES warnings |
| Public browser smoke | PASS | 1 Playwright test against `debroder.vercel.app` |
| Unauthenticated API denial | PASS | Admin/customer API probes returned 401 |
| Customer login/logout | BLOCKED | No safe customer fixture |
| Ready Stock checkout/order | BLOCKED | No isolated fixture or mutation authorization |
| Payment success/failure/replay | BLOCKED | No safe payment fixture |
| Concurrent idempotency | BLOCKED | Guard stopped suite before mutation |
| Customer A/B RLS | BLOCKED | No two-customer fixture |
| Admin/RBAC/store scope | BLOCKED | No role/store fixture |
| Migration parity | BLOCKED | 173 remote records vs unreconciled local set |
| Deployment commit evidence | BLOCKED | Vercel project inaccessible |
| Rollback evidence | BLOCKED | No deployment target/version |
| Provider webhook replay | NOT APPLICABLE | No provider webhook route in repository |

## 26. Wave status

Wave 0B did not satisfy its exit criteria. Wave 1 was not started and remains
prohibited until the P0 findings are corrected or explicitly accepted by the
owner, migration parity is reconciled, and authenticated destructive E2E is
executed against a proven isolated staging/test runtime.

## 27. Wave 0B resume attempt — safe staging activation — 2026-08-15

Current branch/HEAD remained `UI-MIGRATION` /
`43f935b321906093df13e521f411ca3aa102799e`.

The Wave 0C guard was inspected at `e2e/support/env.ts`. It reads the process
environment, not `.env.local`, and requires the following exact names. Status
below is effective process-environment presence only; no values were printed:

| Variable | Status |
|---|---|
| `DEBRODER_ENV` | MISSING |
| `E2E_TARGET_ENV` | MISSING |
| `E2E_BASE_URL` | MISSING |
| `E2E_SAFE_STAGING_IDENTITY` | MISSING |
| `E2E_SUPABASE_PROJECT_REF` | MISSING |
| `E2E_EXPECTED_SUPABASE_PROJECT_REF` | MISSING |
| `E2E_FIXTURE_PREFIX` | MISSING |
| `E2E_FIXTURE_NAMESPACE_CONFIRMED` | MISSING |
| `E2E_ALLOW_MUTATIONS` | MISSING |
| `E2E_CUSTOMER_A_EMAIL` | MISSING |
| `E2E_CUSTOMER_A_PASSWORD` | MISSING |
| `E2E_CUSTOMER_B_EMAIL` | MISSING |
| `E2E_CUSTOMER_B_PASSWORD` | MISSING |
| `E2E_READY_STOCK_PRODUCT_SLUG` | MISSING |
| `E2E_READY_STOCK_VARIANT_LABEL` | MISSING |
| `E2E_READY_STOCK_SIZE_LABEL` | MISSING |
| `E2E_READY_STOCK_PICKUP_LOCATION_ID` | MISSING |
| `E2E_PAYMENT_PROOF_PATH` | MISSING |
| `E2E_FULL_ADMIN_EMAIL` | MISSING |
| `E2E_FULL_ADMIN_PASSWORD` | MISSING |
| `E2E_ADMIN_GUEST_EMAIL` | MISSING |
| `E2E_ADMIN_GUEST_PASSWORD` | MISSING |
| `E2E_SCOPED_ADMIN_EMAIL` | MISSING |
| `E2E_SCOPED_ADMIN_PASSWORD` | MISSING |
| `E2E_OUT_OF_SCOPE_ORDER_ID` | MISSING |

The existing `.env.local` application names were checked without reading values:
`NEXT_PUBLIC_SITE_URL` PRESENT, `NEXT_PUBLIC_SUPABASE_URL` PRESENT,
`NEXT_PUBLIC_SUPABASE_ANON_KEY` PRESENT, `SUPABASE_SERVICE_ROLE_KEY` MISSING,
`NEXT_PUBLIC_RECAPTCHA_SITE_KEY` MISSING, `RECAPTCHA_SECRET_KEY` MISSING, and
`NEXT_PUBLIC_WHATSAPP_NUMBER` MISSING. These do not satisfy the Wave 0C E2E
guard because the staging attestation names are absent from the process.

Guard evidence: the existing authenticated Wave 0A suite was invoked with a
non-production placeholder base URL and stopped before browser activity with
`BLOCKED — SAFE STAGING IDENTITY NOT ESTABLISHED`. No staging project was
accepted, no remote migration or SQL was run, no fixture was created, and no
authenticated checkout/payment test was executed.

Remote database changed: **NO**. Reference repositories changed: **NO**.
Wave 1 remains prohibited.

## 28. Controlled staging bootstrap continuation — 2026-08-16

- Scope: resume Wave 0B staging bootstrap from the previously blocked safe
  staging identity check. Wave 1 was not started.
- Current HEAD remains `43f935b321906093df13e521f411ca3aa102799e` on
  `UI-MIGRATION`.
- The 25 exact Wave 0C guard and authenticated-fixture names were checked in
  the effective PowerShell process environment and were all **MISSING**. The
  three application Supabase runtime names were also **MISSING**:
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
  `SUPABASE_SERVICE_ROLE_KEY`. No secret values were printed.
- `.env.local` contains only existing application-level names and is not loaded
  by the Wave 0C guard or Playwright configuration. It therefore does not
  establish the required staging identity.
- Result: `BLOCKED — SAFE STAGING IDENTITY NOT ESTABLISHED`. The configured
  project was not accepted as staging.
- Migration reconciliation against staging was **NOT PERFORMED** because no
  staging project was accepted. No repository migration and no Wave 0C
  quotation RPC security migration was applied.
- Deterministic E2E fixtures, auth users, product/variant/inventory/pickup
  records, order fixtures, and payment proof fixtures were **NOT CREATED**.
- No Playwright browser suite, deployment, rollback, or external runtime
  verification was executed in this continuation.
- Remote database changes: **NONE**. Production remained untouched. Reference
  repositories remained unchanged.
- Required next action: inject the exact process-level staging contract and
  staging application Supabase variables, then rerun the Wave 0C guard before
  any migration, fixture, or E2E action.

## FINAL WAVE 0 MASTER CLOSURE EVIDENCE — 2026-08-19

- Staging `debroder-staging` / `ykfjgnrigcsapblbxnxb`: clean reset,
  empty-state proof, corrected baseline, full logical replay (126 records),
  C1, and Wave 0C: **EXECUTED AND PASSED**.
- Baseline SHA-256:
  `FF449D72D0E37F31E62A1D91E70BD58EC3519AA1BFEB5A899653CA0D0488FBC7`.
- Current HEAD structural/security verification: **EXECUTED AND PASSED**.
  Canonical authorities remain modern product, `product_size_master`,
  inventory ledger, orders, `order_payments`, formal quotation, current
  fulfillment, and `system_audit_log`.
- C1 and Wave 0C security checks passed; retired public payment/order RPCs,
  legacy upload policy, and legacy bucket remained absent.
- Five staging Auth identities and namespace-scoped fixtures:
  **EXECUTED AND PASSED**. Fixture cleanup: **NOT RUN — reusable staging
  namespace retained**.
- Customer isolation, admin RBAC/store scope, Ready Stock checkout/order,
  payment submission/review/replay, idempotency, inventory, fulfillment state,
  and notification event/outbox generation: **EXECUTED AND PASSED**.
- External notification delivery worker/provider webhook:
  **NOT APPLICABLE / NOT RUN**.
- Full Vitest: **150 files / 1040 tests PASS**. Typecheck, lint (0 errors/34
  warnings), `pnpm build`, and `git diff --check`: **EXECUTED AND PASSED**.
- Production contact/mutation: **NO**. Deployment/rollback:
  **NOT RUN — not authorized**.

**WAVE 0 COMPLETE — READY FOR WAVE 1**

**WAVE 0B INCOMPLETE — EXTERNAL RUNTIME BLOCKERS REMAIN**

The historical status above is superseded by the final executed closure
section immediately preceding this line. Current status:

**WAVE 0 COMPLETE — READY FOR WAVE 1**
