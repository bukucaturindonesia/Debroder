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

## PUBLIC-CARD-CLARITY-001 — Fragmented public card contract

- Severity: **MAJOR**.
- Status: **CLOSED IN CODE — TARGETED AND FULL REGRESSION PASS**.
- Root cause: public listing cards mixed price fallbacks, instructional
  variation copy, raw metadata counts, duplicate PDP links/actions, and a
  separate Jersey Shop implementation.
- Resolution: public listings now reuse `PublicProductCard`, display canonical
  `products.base_price` or an unavailable state, expose canonical color
  swatches only, and use one whole-card link to `/produk/[slug]`.
- Verification: focused **7/7**, targeted **9 files / 52 tests**, full suite
  **107 files / 799 tests**, typecheck **PASS**, lint **0 errors / 38
  warnings**, and production build **PASS**.

## PUBLIC-CARD-CLARITY-002 — Live card verification unavailable

- Severity: **MAJOR VERIFICATION BLOCKER**.
- Status: **BLOCKED WITH EVIDENCE / OWNER RUNTIME VERIFICATION REQUIRED**.
- Existing `localhost:3100` initially rendered `/kaos-polos` with `0 produk`.
  It subsequently returned HTTP 500 after the production build updated the
  shared `.next` directory used by the long-running server.
- No second server was started. Live product image, swatch, price,
  whole-card-link, and responsive card checks remain unclaimed until a healthy
  server has product data.

## PDP-FINAL-EXPERIENCE-001 — Fragmented and fabricated PDP presentation

- Severity: **MAJOR**.
- Status: **CLOSED IN CODE — TARGETED, FULL REGRESSION, AND BUILD PASS**.
- Root cause: the active PDP mixed gallery fallback media, preselected or
  fabricated variant options, incomplete quantity validation, technical
  server-price messaging, an unbounded lightbox, and a purchase panel that
  could remain sticky when taller than the viewport.
- Resolution: the PDP now uses canonical media and active variants only,
  server-authoritative tier pricing, explicit unavailable states, bounded
  quantity/cart validation, one validated Add to Cart action, bounded
  keyboard navigation, safe conditional stickiness, accessible disclosures,
  and canonical same-category recommendations.
- Verification: focused **7/7**, corrected affected regressions **9/9**,
  typecheck **PASS**, lint **0 errors / 38 warnings**, full suite **108 files /
  806 tests**, and production build **PASS — 126 static pages**.
- Database, migration, checkout, order, payment, and security changes:
  **NONE**.

## PDP-FINAL-EXPERIENCE-002 — Live PDP verification unavailable

- Severity: **MAJOR VERIFICATION BLOCKER**.
- Status: **BLOCKED WITH EVIDENCE / OWNER RUNTIME VERIFICATION REQUIRED**.
- Existing `localhost:3100` returned HTTP 500 for `/produk/crewneck`.
  `/produk/jersey-custom-pilot` returned HTTP 200 but only the canonical
  unavailable page.
- No attached app-terminal session exposed the server stack trace, and no
  second server was started.
- Desktop/mobile media, variant selection, exact price/subtotal, Add to Cart,
  disclosure, and recommendation interactions remain unclaimed until they are
  exercised on a healthy runtime with canonical product data.

## RUNTIME-CLOSURE-001 — Corrupted generated Next.js output

- Severity: **BUILD/RUNTIME BLOCKER**.
- Status: **CLOSED — ROOT CAUSE PROVEN AND FRESH PRODUCTION RUNTIME HEALTHY**.
- Evidence: an old `next dev` process remained active while `.next` was
  replaced. Fresh `next start` then failed because
  `.next/server/webpack-runtime.js` referenced missing `5873.js`, `5611.js`,
  and `vendor-chunks/@supabase.js`.
- Resolution: stop only the verified project process tree, remove only
  generated `.next`, run one direct production rebuild, and restart one
  controlled production server.
- Result: BUILD_ID `C0zkDeBcm2GJcJ8siBKqH`; all five required routes return
  HTTP 200.
- Source, test, product data, database, and migration changes: **NONE**.

## PUBLIC-CARD-CLARITY-002 update — 29 July 2026

- Status: **CLOSED — LIVE DATA VERIFIED**.
- `/kaos-polos` returned one canonical product and `/koleksi` returned five.
- Runtime verified canonical 4:5 media, swatch cap plus remainder, metadata,
  base price, single semantic PDP link, mobile/desktop layout, and absence of
  obsolete card copy/actions.

## PDP-FINAL-EXPERIENCE-002 update — 29 July 2026

- Status: **CORE RUNTIME VERIFIED; TWO EXPLICIT DEFERRALS REMAIN**.
- `cotton-combed-24s` verified gallery, Benhur/M/SKU/stock mapping, canonical
  tiers, exact price/subtotal, quantity behavior, stale-response protection,
  invalid-selection feedback, and single cart insertion.
- Deferred data state: no inspected canonical product exposed a supported
  zero-stock size; Cotton Combed Benhur and Jersey Lime reported stock 100 on
  all supported sizes.
- Deferred environment check: native 200% browser zoom could not be measured;
  640px equivalent reflow passed without horizontal overflow.
- No canonical UGC, complementary relationship, or same-context similar
  relationship was returned, so those sections correctly remained hidden.

## PRICE-002 — Cotton Combed active tiers bypassed by product scope

- Severity: **MAJOR**.
- Status: **CLOSED — DATA CORRECTION, REGRESSION, BUILD, AND RUNTIME PASS**.
- Root cause: applied publication-readiness migration directly set
  `cotton-combed-24s` to `tier_scope = 'none'`; the tier-sync trigger did not
  run because no `product_price_tiers` row changed.
- Evidence: the product retained three valid active tiers but server pricing
  correctly bypassed them while the scope was `none`.
- Resolution: idempotent migration
  `20260729141510_cotton_combed_tier_pricing_canonical_closure_v1.sql`
  validates the canonical product and exact existing tier contract, then
  changes only its scope from `none` to `product`.
- Preserved tier IDs/prices: 1–11/Rp45.000, 12–23/Rp42.000, and
  24+/Rp40.000; duplicate active tiers zero.
- Historical orders, order items, and pricing snapshots: **UNCHANGED**.
- Boundary quantities 1, 11, 12, 13, 23, and 24, server-authoritative price,
  stale-response protection, PDP, and cart: **VERIFIED**.
- Full regression: **108 files / 813 tests PASS**; typecheck **PASS**; lint
  **0 errors / 38 existing warnings**; production build **126 pages PASS**.
- Commit, push, deploy: **NOT PERFORMED**.

## PUBLIC-V2-001 — Desktop mega dropdown separated from navbar

- Severity: **MAJOR VISUAL/INTERACTION**.
- Status: **CLOSED — CODE, TEST, AND RUNTIME VERIFIED**.
- Root cause: dropdown used hard-coded `top-[72px]`, `pt-3`, and a vertical
  translate transition, which created a gap and did not derive position from
  the actual navbar.
- Resolution: measure the public header with `ResizeObserver`, apply its
  exact height as fixed `top`, remove vertical padding and transforms, and
  retain opacity/visibility transitions only.
- Runtime evidence at 1440px: header bottom `72px`, dropdown top `72px`, gap
  `0px`, margin top `0px`, padding top `0px`, transform `none`.

## PUBLIC-V2-002 — Koleksi and Custom below locked V2 composition

- Severity: **MAJOR**.
- Status: **CLOSED IN CODE — QUALITY GATE AND AVAILABLE-DATA RUNTIME PASS**.
- Root cause: `/koleksi` contained only a hero and catalog; `/custom` was a
  basic category hub.
- Resolution: implemented the locked discovery/editorial structures while
  sourcing products and categories only from canonical PIM/CMS data and
  preserving official Custom and Jersey transaction destinations.
- Verification: focused **30/30**, full suite **109 files / 819 tests**,
  typecheck **PASS**, lint **0 errors / 38 warnings**, build **126 routes
  PASS**, and all in-scope routes **HTTP 200**.

## PUBLIC-V2-003 — Custom live content unavailable

- Severity: **DATA-DEPENDENT VERIFICATION**.
- Status: **OPEN — NOT A SOURCE-CODE FAILURE**.
- Runtime `/custom` returns the designed canonical empty state because the
  source contains no published Custom categories. Rich Custom T-Shirt and
  Jersey Custom sections remain conditionally hidden.
- Required next action: publish verified categories/products through the
  existing CMS/PIM workflow; do not seed or fabricate public data for visual
  verification.

## LEGAL-V2-001 — Legal draft not publication-ready

- Severity: **PUBLICATION BLOCKER**.
- Status: **OPEN — OWNER AND LEGAL COUNSEL ACTION REQUIRED**.
- Missing verified values include official business identity, address,
  contact channels, return address, service hours, processing times, QC
  tolerance, refund estimate, pickup limit, vendor/cookie audit, and data
  retention periods.
- `/legal/terms` and `/legal/privacy` intentionally remain `noindex` and
  visibly marked as draft/not legally approved.
- No legally approved or compliance-complete status may be assigned until
  owner verification and review by qualified Indonesian counsel are recorded.

## PUBLIC-PDP-002 — Sticky gallery had no desktop travel range

- Severity: **MAJOR VISUAL/INTERACTION**.
- Status: **CLOSED — RUNTIME PROVEN, MINIMUM FIX, REGRESSION, BUILD, AND
  RUNTIME PASS**.
- Root cause: the PDP grid used `items-start`; its media grid item therefore
  stayed exactly as tall as the sticky gallery instead of stretching to the
  taller purchase column. The sticky child had no containing-block travel
  range even though computed `position` and `top` were correct.
- Resolution: add only `lg:self-stretch` to `data-pdp-media`.
- Runtime evidence at 1440px: header bottom `72px`, sticky top `88px`, gallery
  top `88px` while active, and gallery bottom equals media bottom when stopped.
- Regression: focused **12/12 PASS**, full suite **110 files / 824 tests
  PASS**, build **126 routes PASS**.
- Database, pricing, stock, cart, checkout, order/payment, migration, and
  deployment: **UNCHANGED / NOT PERFORMED**.

## RUNTIME-OBS-002 — Bounded timeout entries during rapid navigation

- Severity: **OBSERVABILITY / MINOR**.
- Status: **OPEN FOR REPRODUCTION — NO USER-FACING FAILURE OBSERVED**.
- Final production runtime stderr recorded `TimeoutError` entries while the
  browser automation rapidly navigated and exercised Back/Forward.
- Counter-evidence: tested routes returned HTTP 200, server pricing resolved,
  cart/checkout/configurator handoffs succeeded, and browser console error
  count was zero.
- Next action: reproduce only if the same error appears during normal
  user-paced navigation or Vercel observability shows correlated route
  failures; do not expand the current package speculatively.

## PUBLIC-KAOS-001 — Kaos Polos catalog below locked editorial composition

- Severity: **MAJOR VISUAL/INTERACTION**.
- Status: **CLOSED IN CODE — QUALITY GATE PASS; RUNTIME EXPLICITLY DEFERRED**.
- Root cause: `/kaos-polos` used the generic category composition and shared
  four-column desktop catalog, with a modal filter on desktop and no
  asymmetric first-row editorial placement.
- Resolution: dedicated Kaos Polos editorial experience plus an opt-in catalog
  layout that preserves all other category defaults.
- Locked result: desktop 3 columns; first row 1 product + 2-column editorial
  media; open filter sidebar + 2 columns; mobile 2 columns + full-width
  editorial media; canonical 4:5 Product Card with no permanent CTA.
- Data integrity: CMS/PIM canonical only; no product, campaign, taxonomy, or
  database record created.
- Verification: typecheck **PASS**; lint **0 errors / 38 existing warnings**;
  full suite **112 files / 832 tests PASS**; production build **126 routes
  PASS**.
- Runtime evidence: **DEFERRED** under the owner's active prohibition against
  further Windows local runtime launcher attempts.
- Commit, push, deploy: **NOT PERFORMED**.
