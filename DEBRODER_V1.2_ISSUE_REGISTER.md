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

## P0-TRANS-001 — Payment review conflicts were non-reconciling in Admin UI

- Severity: **BLOCKER / TRANSACTION OPERABILITY**.
- Status: **CLOSED IN CODE; FOCUSED/FULL/BUILD PASS; RUNTIME PENDING**.
- Evidence: the API collapsed stale and missing-pending states into generic
  HTTP 409, returned no canonical state/code, and the Admin modal refetched
  only after success. The RPC already enforced row lock, expected timestamp,
  five bank checks, and duplicate-reference uniqueness.
- Resolution: stable result classification, canonical-state responses,
  idempotent repeat verify for an already verified payment, and unconditional
  UI reconciliation after any server response. Duplicate references and wrong
  order/payment state remain non-mutating conflicts.
- Verification: focused payment/Admin suite **29/29 PASS**, full suite
  **842/842 PASS**, build **127 pages PASS**.
- Remaining evidence: execute one controlled deployed payment verification and
  repeat request after owner deploys; capture request/payment/order/
  notification/log identities.

## P0-AUTH-NOTIF-001 — Repeated browser auth clients and Realtime replay risk

- Severity: **MAJOR / ADMIN OPERABILITY**.
- Status: **CLOSED IN CODE; DATABASE DUPLICATION DISPROVEN; RUNTIME PENDING**.
- Evidence: `createSupabaseClient()` previously created a GoTrue client on
  every call. Remote audit found zero duplicate notification event keys and
  zero duplicate `(event_id, recipient_id, channel)` rows; 2–3 rows are
  distinct legitimate recipients.
- Resolution: one HMR-safe browser client, separate request-scoped server
  client, existing channel cleanup retained, and bounded notification-ID replay
  suppression in the bell. Unread stays derived from the server count.
- Security: RLS/ACL and recipient scoping are unchanged; service-role remains
  server-only.
- Remaining evidence: after deploy, confirm zero GoTrue warnings and maximum
  one popup/unread increment per intended recipient across remount/reconnect.

## P0-ADMIN-RUNTIME-001 — Live Admin configuration and deployment alignment

- Severity: **RELEASE VERIFICATION BLOCKER**.
- Status: **OPEN — STATIC/ROLE/BUILD PASS; DEPLOYED RUNTIME UNAVAILABLE**.
- Evidence: canonical Admin routes are present in the 127-page build and the
  three-role matrix passes. `PIM V2` is intentionally consolidated into the
  Product workspace, not a lost capability. The available Vercel team exposes
  no project and the repo has no `.vercel/project.json`.
- Required next action: owner deploys or grants project visibility, then verify
  Admin load/edit/save/persistence, Console/Issues, exact production SHA/env,
  Vercel/Supabase logs, one transaction journey, and public denial.
- No route, legacy Admin version, feature flag, permission bypass, migration,
  commit, push, or deploy was added in this recovery package.

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

## PUBLIC-KAOS-002 — Owner editorial sizing, CMS ownership, and filtered-grid correction

- Severity: **MAJOR VISUAL/CONTENT OWNERSHIP**.
- Status: **SUPERSEDED BY PUBLIC-KAOS-003 — INITIAL CODE REVISION RECORDED**.
- Root causes:
  - Hero retained the previous oversized height and type scale.
  - Featured was derived from PIM products rather than CMS editorial content and had a visible card gap.
  - Campaign media used one wide linked banner instead of separate 400/1200 editorial slots.
  - Category discovery did not reuse the Homepage Shop by Category scrollbar presentation.
  - Opening the desktop filter reduced Kaos Polos catalog from three to two product columns.
- Resolution:
  - Hero dimensions changed to 60% and primary type dimensions to 80% of the previous values.
  - Featured now reads up to two Kaos Polos `cms_banners` editorial records and uses a 0 px gap.
  - Banner now uses 1:3 columns, 16:5 overall aspect ratio, 1 px gap, canonical Custom link on the left, and non-clickable right media.
  - Category rail now uses native flex overflow, snap, and `premium-scrollbar` behavior.
  - Desktop filtered catalog keeps `repeat(3, minmax(0, 1fr))`; cards resize without changing column count.
  - Initial revision added the dedicated CMS route under a no-migration assumption; schema/history alignment is superseded by PUBLIC-KAOS-003.
- Verification: TypeScript parser **PASS**; static owner-contract matrix **PASS**; full pnpm gates and runtime **NOT RUN due missing dependencies and blocked registry access**.
- Commit, push, deploy: **NOT PERFORMED**.

## PUBLIC-KAOS-003 — Owner CMS usability, mobile editorial banner, spacing, and schema alignment

- Severity: **MAJOR UX / VISUAL / CMS OPERABILITY / DATABASE COMPATIBILITY**.
- Status: **IMPLEMENTED; DATABASE MIGRATION AND POSTCHECK PASS; FULL LOCAL
  QUALITY GATE AND RUNTIME PENDING**.
- Root causes:
  - Kaos Polos admin exposed a generic CMS form and required the owner to
    understand technical record fields.
  - Mobile banner layout stacked the left and right assets vertically, so
    object-position controls could not create the intended editorial
    composition.
  - Featured slots were not explicit in admin and no published
    `featured_editorial` records existed, so the public section was absent.
  - Kaos Polos introduced its own `padding-block` rhythm, causing adjacent
    section spacing to accumulate instead of following Homepage tokens.
  - Catalog heading and toolbar repeated `Kaos Polos`; the count presentation
    was visually redundant.
  - Live `cms_banners_section_type_check` required formal source/history
    alignment for the three Kaos Polos section types.
- Resolution:
  - Replaced the owner workflow with four fixed slots: `Featured 01`,
    `Featured 02`, `Banner kiri`, and `Banner kanan`.
  - Added independent desktop/mobile 3 × 3 focal-position controls and combined
    desktop/mobile previews.
  - Locked banner layouts to desktop `25:75` and mobile `32:68`, with a 1 px
    gap and no mobile stacking.
  - Inherited `--section-space` and `--section-space-end` from Homepage and
    removed double-sided section spacing accumulation.
  - Reduced the catalog toolbar label to dynamic `{visible.length} Produk`.
  - Applied and verified migration
    `20260801045549_kaos_polos_editorial_section_types_v1`.
- Database postcheck:
  - migration history entry present;
  - `cms_banners_section_type_check` accepts all prior types plus
    `featured_editorial`, `banner_editorial_left`, and
    `banner_editorial_right`;
  - no product, pricing, inventory, SKU, order, payment, or transaction table
    changed.
- Remaining verification:
  - run owner quality gates locally;
  - verify admin and `/kaos-polos` at representative mobile/desktop widths;
  - create and publish Featured slot content through admin for visual runtime
    confirmation.
- Commit, push, deploy: **NOT PERFORMED**.

## P0-STORE-PICKUP-001 — Pay at Store pickup stages were non-canonical

- Severity: **BLOCKER — TRANSACTION/OPERATIONS**.
- Status: **CLOSED IN CODE AND DATABASE; PRODUCTION E2E PENDING**.
- Proven root cause:
  - final verification could precede customer arrival;
  - the old Admin action coupled payment verification with pickup handover;
  - Admin/customer/tracking projections could disagree and could regress a
    completed order to an active stage;
  - arrival and handover were not first-class persisted milestones.
- Resolution: additive fulfillment milestones, separated guarded RPCs,
  exactly-once transition history, canonical seven-stage projection, terminal
  monotonicity, and explicit Admin action ownership.
- Migration `20260801115245_pay_at_store_pickup_canonical_workflow_v1`:
  **APPLIED AND POSTCHECK PASS** on project `lzennundwqqtyvvcnzbg`.
- Reference evidence: `ORD-DEB-2026-0050` remains read-only, completed, paid,
  and picked up. The resolver returns terminal `completed` plus its retained
  legacy-ordering warning.
- Regression evidence: impacted **41/41 PASS**; required suites **40/40 PASS**;
  full suite **113 files / 848 tests PASS**; typecheck/lint/build **PASS**.
- Remaining gate: one fresh production Pay at Store + Store Pickup order must
  prove the exact sequence, retry idempotency, one notification per recipient,
  stable tracking after refresh, Admin persistence, zero target console/log
  errors, and post-deployment LCP evidence.

## ADMIN-RBAC-001 — Role, scope, account lifecycle, and server enforcement were fragmented

- Severity: **BLOCKER — ADMIN SECURITY / OPERATIONS**.
- Status: **IMPLEMENTED LOCALLY; OWNER ACTIVATION AND RUNTIME PENDING**.
- Proven causes: static role arrays diverged from `role_permissions`; several
  sensitive APIs duplicated actor logic; Admin route denial was client-side;
  account list/detail and lifecycle controls were incomplete; and an existing
  remote access-update RPC contained an email-specific authorization branch.
- Resolution: one canonical access snapshot, permission-driven navigation,
  middleware route enforcement, canonical API actor delegation, store-scope
  validation, account lifecycle UI/API, atomic invitation profile+audit RPC,
  session revocation, additive RLS alignment, and exact restoration of three
  missing already-applied Admin RBAC migration-history sources.
- Local migration:
  `20260802090000_admin_account_role_experience_v1.sql` — **NOT APPLIED**.
- Production accounts mutated: **NONE**.
- Verification: focused **35/35 PASS**; non-Kaos regression **877/877 PASS**;
  typecheck/lint/direct Next build **PASS**.
- Remaining gate: migration apply/postcheck and six-role runtime plus negative
  cross-store/cross-role evidence using safe test identities.

## QA-CRLF-001 — Kaos Polos source-literal test is line-ending sensitive

- Severity: **MINOR — TEST PORTABILITY; UNRELATED TO ADMIN PACKAGE**.
- Status: **OPEN / DEFERRED TO KAOS PACKAGE**.
- Evidence: `test/kaos-polos-editorial-commerce.test.ts` expects a multiline LF
  literal while unchanged `components/ProductCatalog.tsx` is CRLF on Windows.
  The behavioral fragments are present; the single assertion fails before and
  outside this package's scope.
- Impact: full `pnpm test` and therefore the scripted `pnpm build` prebuild are
  red; all other 113 test files pass and direct Next production build passes.
- No Kaos Polos test or public UI file was changed in this Admin package.

## ADMIN-UI-001 — Admin shell and Global Dashboard used inconsistent template-heavy presentation

- Severity: **MINOR — ADMIN UI / RENDERING**.
- Status: **RESOLVED IN CODE; AUTHENTICATED RUNTIME VISUAL MATRIX PENDING**.
- Root cause: the shared Admin shell retained mixed brand utility styles while
  `global-dashboard.css` installed a separate dark gradient/glow treatment,
  special sidebar skin, and hidden desktop header. Loading feedback was often
  text-only rather than structural skeleton content.
- Resolution: one canonical Admin-scoped system-font and zinc/white visual
  layer, micro-borders, 4/8 px spacing, tabular native tables, 150 ms row
  hover, muted left-border navigation, reusable skeleton feedback, and
  reduced-motion handling. No data logic, route, permission, or dependency
  changed.
- Evidence: focused final **33/33 PASS**; typecheck/lint/direct Next production
  build **PASS**; `git diff --check` **PASS**.

## QA-CRLF-002 — Phase 4–13 SQL source-literal tests are line-ending sensitive

- Severity: **MINOR — TEST PORTABILITY; UNRELATED TO ADMIN UI PACKAGE**.
- Status: **OPEN / DEFERRED TO ORDER OPERATIONS TEST MAINTENANCE**.
- Evidence: two assertions in `test/order-operations-phase4-13.test.ts` embed
  LF-only multiline literals while the unchanged migration is read as CRLF on
  Windows. The required SQL fragments are present, but exact source matching
  fails before semantic evaluation.
- Impact: together with open `QA-CRLF-001`, full `pnpm test` and scripted
  `pnpm build` prebuild remain red. Direct Next production compilation passes.
- No migration or Order Operations source was modified in the Admin UI package.

## CUSTOMER-ACCOUNT-001 — Public customer identity and order self-service were not implemented

- Severity: **BLOCKER — CUSTOMER IDENTITY / SELF-SERVICE / CHECKOUT**.
- Status: **IMPLEMENTED LOCALLY; MIGRATION, CONFIGURATION, AND RUNTIME PENDING**.
- Proven baseline:
  - the repository exposed an Admin login but no complete customer account
    implementation;
  - public customer orders depended on legacy WhatsApp-confirmation state;
  - `orders` had email/phone snapshots but no authenticated customer owner;
  - no customer-profile or saved-address authority existed.
- Resolution:
  - separate customer email/password registration and login;
  - mandatory real email-confirmation event plus protected server provisioning;
  - Admin/staff identity rejection on the customer path;
  - isolated customer browser session storage;
  - customer profile, saved addresses, own-order RLS, and exact-email historical
    order claim;
  - guest checkout retained and signed-in checkout linked to
    `orders.customer_user_id`;
  - automatic checkout activation without customer/manual WhatsApp
    verification.
- Migration:
  `20260806214500_customer_account_email_verification_v1.sql` — **LOCAL ONLY,
  NOT APPLIED**.
- Static evidence: syntax **53/53 PASS**, imports **53/53 PASS**, focused
  contract **103/103 PASS**, existing Jersey contract **18/18 PASS**, production
  compatibility **PASS read-only**.
- Blocked gate: frozen dependency installation failed with network/DNS
  `EAI_AGAIN registry.npmjs.org`; full typecheck, lint, Vitest, and build remain
  required on the Owner machine.
- Remaining release gate: migration postcheck, Confirm Email, redirect allowlist,
  SMTP, reCAPTCHA environment, RLS cross-customer negative tests, Admin/public
  separation, guest and authenticated checkout E2E, historical claim, recovery,
  responsive UI, browser console, and production logs.
- Current verdict: **NO-GO FOR PRODUCTION / NOT COMPLETE**.

## CUSTOMER-ACCOUNT-002 — Verified members inherited the guest active-order cap

- Severity: **BLOCKER — REGISTERED CUSTOMER CHECKOUT ACCESS**.
- Status: **RESOLVED IN LOCAL CODE; FORWARD MIGRATION AND RUNTIME PENDING**.
- Root cause:
  - three canonical order creators reject checkout when the normalized
    WhatsApp number already has two active unpaid orders;
  - Instant Custom inherits the same check through Ready Stock creation;
  - `customer_user_id` was supplied only to the later activation RPC, so the
    creation RPC could not distinguish a verified member from a guest.
- Targeted resolution:
  - member checkout now supplies `customer_user_id` to member-only creation
    overloads;
  - migration `20260810100000_registered_customer_order_access_v1.sql`
    validates confirmed customer Auth metadata, active profile, exact email,
    and internal-account exclusion before applying the narrow bypass;
  - the original create functions remain authoritative for stock, minimum
    quantity, pricing, SKU, Custom/Jersey validation, idempotency, and data
    creation;
  - guest checkout still uses the original signatures and the existing active-
    unpaid phone cap; the API abuse/rate-limit guard is unchanged.
- Database status: migration **LOCAL ONLY / NOT APPLIED / PENDING**; no table,
  schema, data, RLS, payment, or historical migration was changed.
- Evidence: focused **8 files / 89 tests PASS**; typecheck **PASS**; lint **0
  errors / 37 existing warnings**; direct Next build **138 pages PASS**.
- Repository scripted gate remains red only on the recorded three unrelated
  CRLF-sensitive assertions; `npm run build` stops at prebuild before Next.
- Remaining gate: safe migration apply/postcheck plus verified customer A/B/C
  checkout and Order History runtime proof, guest-cap regression, database
  smoke test, and deployment evidence.

## PERF-IMAGE-001 — Optimized raster delivery while preserving logos

- Severity: **MAJOR — PERFORMANCE / DELIVERY**.
- Status: **RESOLVED IN LOCAL CODE; CDN AND CONCURRENCY RUNTIME PENDING**.
- Root cause: public CMS hero/editorial images used native `<img>` through
  `ResponsivePicture`, bypassing Next image transforms. The app already had
  WebP configuration, but that path did not consume it.
- Resolution: responsive local/Supabase imagery now uses Next `srcSet` output;
  WebP is the canonical transformed format; public asset cache headers and
  optimizer cache were added. `Logo.tsx` and `BrandIcon.tsx` remain native and
  logo paths are explicitly excluded from `SafeImage` optimization.
- Evidence: image contract **2/2 PASS**, UI/media regression **14/14 PASS**,
  typecheck **PASS**, target lint **0 errors**, direct Next build **138 pages
  PASS**. Full scripted build remains red only on pre-existing CRLF-sensitive
  tests.
- Remaining risk: verify CDN cache hit ratio, LCP, image byte reduction, and
  thousand-user concurrency in the deployed environment before production GO.

## UXUI-UNLOCK-001 — Public storefront presentation was fragmented

- Severity: **MAJOR — PUBLIC UX/UI CONSISTENCY AND RESPONSIVE QUALITY**.
- Status: **IMPLEMENTED LOCALLY; FOCUSED VERIFICATION PASS; RUNTIME/RELEASE
  GATES PENDING**.
- Root cause: shared storefront surfaces relied on several legacy selector
  groups with inconsistent shell density, navigation emphasis, hero scale,
  product-card feedback, control sizing, and cart/checkout panel treatment.
- Resolution: added a scoped canonical storefront layer, wired the public shell
  and homepage to the canonical marker, normalized header/nav presentation,
  added product-card hover affordance, and marked cart/checkout state surfaces.
  Jersey themes remain isolated. No business, auth, order, payment, inventory,
  pricing, API, route, schema, migration, RLS, or idempotency contract changed.
- Evidence: focused UX/image **9 files / 39 tests PASS**, typecheck **PASS**,
  changed-file lint **0 errors**, and `git diff --check` **PASS**.
- Release risk: full suite still fails on two unrelated CRLF-sensitive Order
  Operations assertions; Next page-data generation was not stable in this
  environment; in-app browser access to localhost returned
  `ERR_CONNECTION_REFUSED`. No deployment or concurrency measurement was
  performed.

## UXUI-NORMALIZE-001 — Public foundation and card geometry were fragmented

- Severity: **MAJOR — SYSTEM-WIDE PUBLIC UI CONSISTENCY**.
- Status: **IMPLEMENTED LOCALLY; FOCUSED VERIFICATION PASS; FULL RUNTIME/BUILD
  GATES PENDING**.
- Root cause: shared public routes consumed mixed container gutters, 80–96px
  section rhythm, 12/16/24px grid gaps, route-local product rails, and
  inconsistent functional card radii/shadows. Loading/error boundaries were
  not all connected to the canonical public UI marker. `/jersey` also had a
  full dark root rather than local editorial dark blocks.
- Resolution: introduced scoped public foundation tokens and geometry rules;
  standardized shell/footer/card/product-grid/product-rail spacing; added
  shared grid hooks; marked public state screens; and moved the Jersey root to
  the light public canvas while preserving its explicit editorial blocks and
  configurator behavior.
- Contracts preserved: no database/schema/migration, auth, RLS, product data,
  pricing, inventory, SKU, cart, checkout, payment, order, API, route, or
  idempotency behavior changed.
- Evidence: normalization/public/image suite **10 files / 44 tests PASS**,
  typecheck **PASS**, changed-file lint **0 errors**, and diff check **PASS**.
- Remaining risk: full baseline suite/build and reachable responsive browser
  runtime remain unverified; no deployment or concurrency claim is made.

## UXUI-NORMALIZE-001 — Verification update — 2026-08-13

- Local implementation completed on `codex/public-ui-normalization-final` with
  logical checkpoints for foundation, shell/footer, controls, product cards,
  homepage, route grids, transactional surfaces, and the remaining legacy
  public product-grid migration.
- Targeted public UI tests, TypeScript, lint, direct Next build, and diff check
  pass. Full test still reports only the two baseline Order Operations source
  assertions; `pnpm build` stops in its prebuild for that same reason.
- No database, migration, dependency, lockfile, environment, business, or
  route contract changed. Runtime visual review remains unavailable.
- Disposition: **IMPLEMENTED LOCALLY; OWNER REVIEW REQUIRED; RELEASE NO-GO**.
