# DEBRODER V1.2 ACTIVE ISSUE REGISTER

Last updated: 28 July 2026 (Asia/Makassar)

## P0-001 — Conflicting active governance documents

- Severity: BLOCKER
- Status: **CLOSED — VERIFIED**

## P0-002 — Local/platform artifacts tracked by Git

- Severity: HIGH
- Status: **CLOSED — VERIFIED**

## P0-003 — P15 database application and verification

- Severity: BLOCKER / PACKAGE GATE
- Status: **CLOSED — DATABASE AND LOCAL SOURCE VERIFIED; COMMIT/PUSH PENDING**
- Migration `20260727073246_p15_zero_balance_matrix_completion_v1` is remotely applied.
- All six P15 integrity counters are zero.
- Source sync and local gates must pass before P15 CHECKPOINT.

## P15-001 — Duplicate local primary P15 migration

- Severity: HIGH MIGRATION SAFETY
- Status: **CLOSED — VERIFIED**
- The unapplied duplicate `20260724041102...` is removed.
- Applied canonical primary `20260724054241...` is retained.

## P15-002 — Existing Supabase advisor backlog

- Severity: MAJOR SECURITY/PERFORMANCE
- Status: **OPEN — FINAL INTEGRATION**
- Existing findings include mutable search paths outside P15, broad privileged function exposure, RLS tables without policies, public storage buckets, leaked-password protection disabled, unindexed foreign keys, duplicate/permissive policies, and duplicate indexes.
- P15 introduced no new package-specific advisor finding.
- The backlog must be triaged before GO.

## P0-004 — Official legal content unavailable

- Severity: MAJOR CONTENT DEPENDENCY
- Status: **OPEN — OWNER LEGAL CONTENT REQUIRED**

## P0-005 — Homepage CMS link `/kaos-polo` returns 404

- Severity: HIGH
- Status: **OPEN — OWNER CMS CORRECTION REQUIRED**

## P0-006 — Public performance not proven on Preview

- Severity: MAJOR
- Status: **OPEN — PREVIEW VERIFICATION REQUIRED**

## P0-007 — Real remote Instant Custom transaction not proven

- Severity: HIGH E2E RISK
- Status: **OPEN — REMOTE E2E REQUIRED**

## P0-008 — Unlinked `Mix Size` SKU

- Severity: DATA INTEGRITY
- Status: **OPEN — EXCLUDED FROM AUTOMATIC SIZE POLICY**

## UI-UX-001 — Public global shell and icon asset recovery

- Severity: MAJOR UX CONSISTENCY
- Status: **IMPLEMENTED; STATICALLY VERIFIED; RUNTIME VERIFICATION REQUIRED**
- Shared shell and owner-icon paths pass regression and build gates.
- Browser runtime did not start because of a duplicate Windows environment key.

## PRICE-001 — Canonical trial pricing migration pending

- Severity: MAJOR COMMERCE DATA ALIGNMENT
- Status: **IMPLEMENTED LOCALLY; REMOTE APPLICATION PENDING**
- Local policy, migration tests, and build pass.
- `20260728153142_canonical_trial_pricing_v1.sql` is not remotely applied.

## MEDIA-001 — Ambiguous owner product-image mapping

- Severity: MAJOR PIM CONTENT RISK
- Status: **OPEN — OWNER/PIM IDENTITY REVIEW REQUIRED**
- `89` valid images remain staging-only because their evidence does not uniquely
  identify a canonical PIM product.
- No ambiguous image was mapped or activated.
- `12` Crewneck assets were copied hash-identically; only black/front is
  prepared as primary in the pending migration.

## Release decision

**NO-GO / NOT COMPLETE**

## PRODUCT-001 — Canonical product publication and runtime gate

- Severity: **BLOCKER**
- Status: **OPEN — DATABASE EXECUTED; PUBLICATION/RUNTIME INCOMPLETE**
- Remote canonical identity/price/content migrations are applied.
- `12` product records and `3` service records match canonical names/prices.
- All `662` valid physical sellables have aggregate active nonlegacy stock
  exactly `100`; duplicate SKU and opening movements are zero.
- Only `2` physical products and `0` Jersey products are public-active.
- Nine product/Jersey records lack a proven primary image.
- Per-product runtime matrix is not verified.

## PRODUCT-002 — ProductRow sales-mode fixture mismatch

- Severity: **BUILD BLOCKER**
- Status: **OPEN — CYCLE LIMIT REACHED**
- `pnpm.cmd typecheck` fails at
  `test/page-owned-category-pdp-isolation.test.ts:10`.
- The fixture permits `sales_mode: undefined`, while canonical `ProductRow`
  requires `ready_stock | custom | both | null`.
- No Cycle 3 correction was made.

## PRICE-001 update — 29 July 2026

- Status: **CLOSED — REMOTE APPLICATION VERIFIED**
- `canonical_trial_pricing_v1` is present in remote migration history.

## UXUI-BAB3-9-001 — Configured Jersey checkout contract

- Severity: **BLOCKER**
- Status: **BLOCKED WITH EVIDENCE**
- Server exact pricing is implemented with canonical `configurator_based`
  authority, but checkout rejects configured items and no canonical transaction
  RPC/schema contract exists.

## UXUI-BAB3-9-002 — Product image and taxonomy readiness

- Severity: **MAJOR**
- Status: **BLOCKED WITH EVIDENCE**
- Nine canonical product/Jersey primary images remain unproven.
- `89` ambiguous assets remain unactivated.
- Active `jersey-custom-pilot` has no subcategory.

## UXUI-BAB3-9-003 — Preview runtime/performance/analytics evidence

- Severity: **MAJOR**
- Status: **OPEN — OWNER PREVIEW REQUIRED**
- Eight viewport overflow checks pass, but the isolated browser denied Supabase
  media, `/koleksi` navigation aborted once, keyboard automation timed out, and
  real Preview performance/transaction E2E is not proven.
- No existing analytics architecture was found; none was invented.

## PRODUCT-002 update — 29 July 2026

- Status: **CLOSED — VERIFIED**
- `sales_mode` fixture normalization is present.
- Final typecheck, 106-file/793-test suite, and production build pass.

## UXUI Bab 3–9 release decision

**BLOCKED WITH EVIDENCE / NO-GO / NOT COMPLETE**

## UXUI-BAB9-CLOSURE-001 — Configured Jersey local contract

- Severity: **BLOCKER**
- Status: **IMPLEMENTED LOCALLY; NOT APPLIED; PASS LIMIT REACHED**
- Local checkout now transports configured draft identity only, rereads the
  canonical Jersey definition, reruns domain validation and server pricing,
  compares the exact input fingerprint, and calls a service-role-only additive
  RPC.
- The RPC inserts an unpaid order and immutable configuration/pricing snapshot
  before payment. Checkout idempotency uses the existing key plus a transaction
  advisory lock. Existing payment submission remains bound to that `order_id`.
- Remote migration was not applied because Pass 2 still had two test failures.

## UXUI-BAB9-CLOSURE-002 — Exact remaining data evidence

- Severity: **MAJOR**
- Status: **BLOCKED WITH EVIDENCE**
- Missing proven primary images:
  `3600-soft-tee`, `72y00-youth`, `8100-polo`, `bomber-jacket`,
  `jersey-futsal-custom`, `jersey-sepak-bola-custom`, `pullover-hooded`,
  `windbreaker`, `zip-hooded`.
- Exact PIM evidence: all nine have `image_url = null` and zero variant-image
  relations. Owner inventory has no unique mapping to these identities.
- `jersey-custom-pilot` has category `jersey`, `product_subcategory_id = null`,
  and no sport discriminator among 12 active canonical Jersey subcategories.
- Random image mapping: **0**. Guessed taxonomy writes: **0**.

## UXUI-BAB9-CLOSURE-003 — Pass 2 regression stop

- Severity: **BUILD BLOCKER**
- Status: **OPEN — PASS LIMIT REACHED**
- Typecheck: **PASS**.
- Focused closure test: **PASS — 4/4**.
- Regression: **105/107 files and 795/797 tests PASS**.
- Remaining failures:
  `test/b4-a3-checkout-integrity.test.ts` expects the obsolete two-mode parser
  implementation string; `test/uxui-bab8-high-fidelity.test.ts` expects the
  obsolete configured-checkout blocker copy.
- No Pass 3 correction was made.

## UXUI-BAB9-CLOSURE-001 update — 29 July 2026

- Status: **CLOSED — REMOTE RPC AND IDEMPOTENCY VERIFIED**.
- Configured checkout migration is applied. One remote test order is unpaid,
  has one immutable configured/pricing snapshot, zero payments, and repeated
  checkout returns the same order ID.

## UXUI-BAB9-CLOSURE-002 update — 29 July 2026

- Primary-image portion: **CLOSED — 9/9 PROVISIONAL, 9/9 HTTP 200**.
- Public product missing-image count: `0`.
- Taxonomy portion remains **BLOCKED WITH EVIDENCE**:
  `jersey-custom-pilot` has no subcategory or sport discriminator across 12
  active canonical candidates.

## UXUI-BAB9-CLOSURE-003 update — 29 July 2026

- Status: **CLOSED**.
- Both stale assertions were aligned with the three-mode checkout and
  customer-safe configured checkout copy.
- Full suite: **PASS — 107 files / 798 tests**.

## UXUI-BAB9-CLOSURE-004 — Existing fulfillment trigger regression

- Severity: **BLOCKER**.
- Status: **CLOSED — REMOTE FIX VERIFIED**.
- Evidence: configured order initially failed with PostgreSQL `42703` because
  `trigger_ensure_ready_stock_fulfillment_v2()` evaluated `NEW.order_id` on an
  `orders` row. Migration `20260729045016` restores table-specific `IF/ELSIF`
  field resolution while preserving the Instant Custom service guard.

## UXUI-BAB9-CLOSURE-005 — Local runtime outbound dependency

- Severity: **MAJOR VERIFICATION BLOCKER**.
- Status: **BLOCKED WITH EVIDENCE**.
- Existing server `localhost:3100` renders the shell and all nine local image
  URLs return HTTP 200, but server-side Supabase reads fail with
  `TypeError: fetch failed`.
- `/koleksi` therefore reports `0 produk`; canonical Jersey PDP reports
  `Produk belum dapat dimuat`. No full browser cart/checkout/payment E2E is
  claimed.
