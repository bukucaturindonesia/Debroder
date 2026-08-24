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

## UXUI-NORMALIZE-002 — Public UI blocker correction package — 2026-08-13

- Severity: **MAJOR — PUBLIC UI CONSISTENCY**.
- Status: **IMPLEMENTED LOCALLY; FOCUSED GATES PASS; OWNER VISUAL REVIEW
  PENDING**.
- Root causes addressed: Jersey context navigation visually presented as a
  second branded navbar; Custom opened with an unnecessarily dark hero; About
  used a nonessential full dark content section; legal help CTA used a
  route-specific `<footer>`; Jersey catalog/forms bypassed shared control
  geometry.
- Preserved: all business, product-mode, configured-product, custom-project,
  Jersey configurator, database, migration, Supabase, RLS, auth, pricing,
  inventory, stock, SKU, cart, checkout, payment, order, API, and Server Action
  contracts.
- Evidence: focused public UI/Jersey **34/34 PASS** (extended **57/57 PASS**),
  typecheck **PASS**, lint **0 errors**, direct Next build **PASS**, diff check
  **PASS**. Full test still has only the two known Order Operations baseline
  assertions. No browser runtime or deployment evidence.

## CHECKOUT-RUNTIME-001 — Recovery probe and stale-key conflict — 2026-08-14

- Severity: **MAJOR — CHECKOUT RUNTIME RECOVERY**.
- Status: **IMPLEMENTED LOCALLY; AUTHENTICATED RUNTIME PENDING**.
- Evidence: `CheckoutClient` persisted a draft before POST and kept it after
  definitive 4xx rejection. A later changed payload could reuse that key;
  `enforce_public_checkout_abuse_guard` correctly returned
  `idempotency_payload_conflict`, and the GET recovery lookup found no order.
  The local runtime reproduced the explicit mixed-cart 409 branch. No
  duplicate-submit path was found: one form `onSubmit`, a submit lock, and one
  checkout POST caller are present.
- Fix: rejected drafts are marked and rotate on a changed payload; unknown
  failures preserve the key for safe recovery. Missing-order recovery is an
  explicit `200 {found:false}` negative result, while the client still accepts
  legacy 404 responses during rollout.
- Preserved: idempotency, duplicate-order protection, stock, pricing, SKU,
  Custom/Jersey/configured validation, auth, RLS, payment integrity, and guest
  checkout behavior. Database/migration changes: **NONE**.
- Verification: focused **21/21 PASS**, typecheck **PASS**, lint **0 errors**,
  direct build **PASS**. Full suite/build remain blocked only by the two known
  unrelated Order Operations assertions. Supabase checkout A/B/C and browser
  console verification remain pending because the local service-role key is
  unavailable.

## RELEASE-GATE-001 — Master completion verification — 2026-08-14

- Severity: **RELEASE GATE**.
- Status: **CODE/TEST/BUILD VERIFIED LOCALLY; PRODUCTION NO-GO**.
- Resolved: CRLF-sensitive Order Operations contract tests produced two false
  failures on Windows. The test reader now normalizes line endings; migration
  content and runtime behavior are unchanged.
- Evidence: full suite **122/122 files, 931/931 tests PASS**; typecheck PASS;
  lint 0 errors with 34 pre-existing warnings; production build PASS with
  138/138 pages; local production smoke routes PASS.
- Remaining gate: configure a valid Supabase service-role environment and run
  authenticated checkout/order/payment/RLS A/B/C smoke plus deployment and
  rollback verification. No data or migration mutation was performed here.

## UXUI-CONTRAST-001 — Custom capability copy — 2026-08-15

- Severity: **MINOR — PUBLIC UI READABILITY**.
- Root cause: the shared `.public-site section:not(.keep-section-bg)` cascade
  changed the target Custom section from black to the canvas white, so its
  white heading and 50%-white overline had ineffective 1:1 contrast.
- Fix: one-section `keep-section-bg` opt-out, `text-white/75` overline, and
  explicit `text-white` heading. No layout, business logic, route, or data
  contract changed.
- Verification: full **122/122 files, 932/932 tests PASS**; typecheck PASS;
  lint 0 errors with 34 existing warnings; build PASS with 138/138 pages;
  diff check PASS.
- Status: **IMPLEMENTED LOCALLY; OWNER VISUAL REVIEW RECOMMENDED**.

## THEME-001 — Public theme engine and Super Admin Tema — 2026-08-15

- Class: **MAJOR / public presentation foundation**.
- Root cause: public routes shared shell primitives and CSS tokens but had no
  canonical theme registry, runtime persistence, preview boundary, or cache
  invalidation contract; visual identity could not switch without code or a
  redeploy.
- Fix: ten preset definitions, inherited token engine, Hybrid fallback,
  existing `website_settings` persistence, scoped `data-public-theme` CSS,
  `/admin/theme` preview/apply/rollback, role checks, audit log, and
  presentation-only `public-theme` cache invalidation.
- Scope guard: no duplicate public routes/components and no product/variant,
  pricing/inventory, cart/checkout/payment/order, auth/customer, RLS, or
  configurator change. No migration was created or executed.
- Verification: focused 4/4, full 943/943 tests, typecheck, lint (0 errors),
  direct build 139/139 pages, and diff check all pass. Live authenticated E2E,
  rapid theme switching, and deployment are pending because sandbox Supabase
  is unavailable.
- Status: **IMPLEMENTED LOCALLY; RUNTIME/STAGING EVIDENCE PENDING; RELEASE
  NO-GO / NOT COMPLETE**.

## PERF-001 — Public read amplification and cache boundary — 2026-08-15

- Severity: **MAJOR — PRODUCTION PERFORMANCE / SCALE READINESS**.
- Root causes: request-local-only memoization, unbounded public product reads,
  shell variant-size read unnecessary for navigation, PDP full-catalog related
  hydration, and `getPublicContent()` no-store behavior.
- Targeted correction: tagged 60-second public caches; bounded shell,
  catalog, content, and PDP reads; category-scoped catalog queries; removed
  shell-only size query; checkout explicitly force-dynamic. No private order,
  account, payment, or transaction result is shared through these caches.
- Files: `lib/public-cache.ts`, public data-access/runtime modules,
  `app/checkout/page.tsx`, and focused performance tests. Database/migration:
  **NONE**.
- Verification: focused 9/9 PASS; full 123/123 files and 939/939 tests PASS;
  typecheck PASS; lint 0 errors / 34 existing warnings; direct Next build PASS
  137/137 pages; diff check PASS.
- Open risks: no live Supabase latency or cache-hit measurements in sandbox;
  explicit admin mutation invalidation and production load/RUM evidence remain
  pending; bounded catalog needs an owner-approved pagination follow-up if the
  product count exceeds 120.
- Status: **IMPLEMENTED LOCALLY; RUNTIME/STAGING VERIFICATION PENDING;
  RELEASE NO-GO / NOT COMPLETE**.

## UXUI-NAV-001 — Active underline and mega-menu bounding — 2026-08-15

- Severity: **MAJOR — PUBLIC NAVIGATION CONSISTENCY / LARGE-DATA SAFETY**.
- Root causes: landing CSS supplied a second active underline, while resolver
  color facets were unbounded before mega-menu mapping.
- Fix: removed only the duplicate landing `box-shadow`; resolver now returns a
  maximum of six colors per group with overflow flags, and the existing mega
  menu adds canonical `Lihat Semua Warna` links. No hidden full-color DOM is
  rendered and empty groups remain absent.
- Verification: focused navbar **14/14 PASS**; full **122/122 files,
  935/935 tests PASS**; typecheck PASS; lint 0 errors with 34 existing
  warnings; build PASS with 138/138 pages; diff check PASS; browser sanity
  passed at **390, 768, 1024, 1280, 1440, and 1920px** with no horizontal
  overflow; resolver edge cases cover **0, 1, 6, 20, 1,000, and 100,000**
  colors.
- Status: **IMPLEMENTED LOCALLY; OWNER VISUAL REVIEW RECOMMENDED**.

## MOBILE-FOUNDATION-001 — Mobile storefront shell implementation — 2026-08-15

- Severity: **MAJOR — MOBILE PUBLIC EXPERIENCE**.
- Scope: compact mobile header, shared bottom navigation, mobile homepage
  search entry, responsive hero/rails, safe-area and drawer spacing, and
  blocked-checkout control semantics.
- Scope guard: no new commerce route, duplicate state provider, demo data,
  PIM source, auth system, database object, or migration was introduced.
  Existing `/produk/[slug]`, cart, checkout, order, payment, account, and
  catalog paths remain authoritative.
- Files: `app/globals.css`, `app/page.tsx`, `components/PublicPage.tsx`,
  `components/header/SiteHeaderClient.tsx`, `components/mobile/MobileBottomNav.tsx`,
  `components/CartProvider.tsx`, and mobile/public contract tests.
- Verification: typecheck PASS; lint 0 errors / 34 existing warnings; full
  **125/125 files and 946/946 tests PASS**; `pnpm build` exit 0 with 139
  generated routes; diff check PASS. Local static generation emitted fetch
  `EACCES` warnings but completed.
- Status: **IMPLEMENTED LOCALLY; RUNTIME/STAGING VERIFICATION PENDING**.

## MOBILE-WISHLIST-001 — Existing wishlist persistence is not activated — 2026-08-15

- Severity: **MAJOR — MANDATE ACCEPTANCE GAP**.
- Evidence: `/wishlist` exists, but the current page explicitly reports that
  wishlist storage is not activated; no existing provider/database contract
  was found that can safely be reused for a real mobile wishlist.
- Decision: mobile navigation links to the existing honest route, but no fake
  local state, duplicate backend, or unapproved schema was added.
- Required next step: owner-approved implementation or activation of the
  existing wishlist backend/provider, followed by authenticated persistence,
  cross-device, RLS, and mobile regression tests.
- Status: **OPEN / NOT VERIFIED**.

## MOBILE-RUNTIME-001 — Mobile browser and authenticated commerce evidence — 2026-08-15

- Severity: **RELEASE GATE**.
- Missing evidence: browser visual/console checks at 320–430px and 768px,
  safe-area and keyboard/focus checks, authenticated cart/checkout/order/
  payment/RLS E2E, Supabase runtime, deployment, and owner visual approval.
- Local browser automation was not callable because `agent-browser` is not
  installed/available in this environment.
- Local code gates are green, but deployment is not proof of COMPLETE and no
  production release is authorized by this handoff.
- Status: **NO-GO / OPEN**.

## WAVE-0A-RUNTIME-001 — Current-head authenticated runtime evidence — 2026-08-15

- Severity: **BLOCKER / P0**.
- Finding: local typecheck, lint, unit/contract tests, and production build are
  green, but current-head authenticated customer transaction, payment replay,
  RLS A/B, admin RBAC, and store-scope behavior have not been proven against a
  live Supabase runtime.
- Evidence: `WAVE_0A_CURRENT_HEAD_EVIDENCE.md`; Playwright harness exists and
  fails closed when `E2E_ALLOW_MUTATIONS=1` and fixture variables are absent.
- Recommendation: **ADOPT NOW** — run the suite only against an isolated
  staging/test runtime with two verified customers and role/store fixtures.
- Status: **OPEN / NO-GO**.

## WAVE-0A-MIGRATION-001 — Remote migration state unavailable — 2026-08-15

- Severity: **BLOCKER / P0**.
- Finding: local migration files are present, but remote applied/pending state
  could not be safely determined because Supabase CLI and `psql` are absent.
- Recommendation: **ADOPT NOW** — capture migration status from the approved
  environment without editing or replaying applied migrations.
- Status: **OPEN / NOT VERIFIED**.

## WAVE-0A-BUILD-001 — Static generation network warning — 2026-08-15

- Severity: **MAJOR / P1**.
- Finding: direct Next build exits 0 and generates 139 routes, but emits
  `fetch failed` / `EACCES` during static generation in this environment.
- Recommendation: **ADOPT NOW** — reproduce in staging/deployment smoke before
  treating the build as production-safe.
- Status: **OPEN / ENVIRONMENT CLASSIFICATION PENDING**.

## WAVE-0B-SECURITY-001 — Anonymous quotation snapshot RPC exposure — 2026-08-15

- Severity: **BLOCKER / P0**.
- Evidence: remote `public.build_quotation_snapshot(uuid)` is a `SECURITY
  DEFINER` function with `search_path=public`, is executable by `anon`, and
  returns `to_jsonb(q)` quotation data without an authorization or permission
  predicate. No local caller was found.
- Required action: revoke anonymous execution and replace with an explicitly
  authorized path in isolated staging/test, then verify direct RPC denial and
  authorized operational access before production.
- Status: **OPEN / NO-GO**.

## WAVE-0B-MIGRATION-001 — Remote/local migration history unreconciled — 2026-08-15

- Severity: **BLOCKER / P0**.
- Evidence: the read-only Supabase connector reports 173 applied records;
  repository inventory contains 132 files. Exact timestamp comparison yields
  80 matches, 43 local-only keys, and 93 remote-only keys. The difference may
  be historical renaming or squashing, but SQL parity is not proven.
- Required action: reconcile the approved repository against the target
  project using read-only migration/schema evidence; do not replay or reset
  historical migrations.
- Status: **OPEN / NOT VERIFIED**.

## WAVE-0B-RUNTIME-001 — Safe staging identity and authenticated fixtures absent — 2026-08-15

- Severity: **BLOCKER / P0**.
- Evidence: all required E2E target, customer, admin, order, variant, pickup,
  and payment-proof variables are missing. The destructive suite fails closed
  at `BLOCKED — SAFE STAGING IDENTITY NOT ESTABLISHED`.
- Required action: provide an isolated staging/test identity and disposable
  fixtures, then execute the Wave 0B suite without production data.
- Status: **OPEN / NO-GO**.

## WAVE-0B-DEPLOY-001 — Current-head deployment and rollback evidence unavailable — 2026-08-15

- Severity: **BLOCKER / P0**.
- Evidence: public read-only routes respond, but the Vercel connector exposes no
  accessible DEBRODER project, immutable deployment commit, build log, or
  rollback version. No `.vercel/project.json` exists locally.
- Required action: make the approved deployment project and rollback target
  available for read-only evidence capture.
- Status: **OPEN / NO-GO**.

## WAVE-0B-BUILD-001 — Static-generation network warnings remain unclassified — 2026-08-15

- Severity: **MAJOR / P1**.
- Evidence: `pnpm build` exits 0 and generates 139 routes, but logs local
  `fetch failed` / `EACCES` during static generation.
- Required action: reproduce on the approved staging/deployment runtime and
  classify whether the warning is environment-only or release-impacting.
- Status: **OPEN / ENVIRONMENT CLASSIFICATION PENDING**.

## WAVE-0C-SECURITY-001 — Local remediation prepared for anonymous quotation snapshot — 2026-08-15

- Severity: **BLOCKER / P0**.
- Root cause confirmed: `public.build_quotation_snapshot(uuid)` is a
  `SECURITY DEFINER` function with `PUBLIC`/`anon` execution and no
  authorization predicate; quotation IDs are not authorization.
- Reproduction: anonymous role returned a non-null snapshot for an existing
  quotation ID; an arbitrary nonexistent ID returned null. No quotation
  contents or identifier were recorded in the report.
- Corrective artifact:
  `supabase/migrations/20260815212358_wave_0c_quotation_snapshot_security.sql`.
  It requires `quotation.read`, sets an empty `search_path`, revokes
  `PUBLIC`/`anon`/`service_role`, and retains authenticated execution for the
  existing staff/admin permission contract.
- Regression coverage: `test/wave-0c-security.test.ts` covers anonymous,
  arbitrary ID, customer A/B, store A/B, authorized admin/superadmin,
  service-role boundary, and function safety as a static migration contract.
- Status: **LOCAL REMEDIATION READY / REMOTE APPLY AND POST-FIX RUNTIME
  VERIFICATION OPEN / NO-GO**.

## WAVE-0C-MIGRATION-001 — Migration history reconciliation evidence — 2026-08-15

- Severity: **BLOCKER / P0 RELEASE CONTROL**.
- Evidence: remote applied history is 173 records; local baseline is 132
  files; exact timestamp comparison is 80 matches, 43 local-only, and 93
  remote-only. Local numeric prefixes are unique, but there is no
  `supabase/config.toml` and historical `_applied.sql`/standalone SQL artifacts
  prevent a one-to-one replay claim.
- Artifact: `supabase/MIGRATION_RECONCILIATION_WAVE_0C.md`.
- Decision: preserve current history and use forward-only corrections; do not
  delete, rename, squash, reset, or mark applied.
- Status: **DIAGNOSED / DOCUMENTED / REMOTE PARITY AND SAFE APPLY OPEN**.

## WAVE-0C-STAGING-001 — Fail-closed staging identity contract — 2026-08-15

- Severity: **BLOCKER / P0 RELEASE CONTROL**.
- Evidence: `e2e/support/env.ts` now requires explicit non-production target
  identity, matching expected Supabase ref, fixture namespace confirmation,
  deterministic fixture prefix, all required credentials/fixtures, and
  mutation opt-in. A production-targeted Wave 0A run stopped before browser or
  mutation execution with `BLOCKED — SAFE STAGING IDENTITY NOT ESTABLISHED`.
- Status: **IMPLEMENTED LOCALLY / SAFE STAGING INPUTS MISSING / OPEN**.

## WAVE-0C-BUILD-001 — Build warning classification — 2026-08-15

- Severity: **MAJOR / P1**.
- Evidence: current build exits 0, compiles successfully, and generates 139
  routes, but static generation logs `fetch failed` with `EACCES` in the local
  restricted environment. Lint remains 0 errors / 34 warnings.
- Decision: classify as an environment/network warning for local verification,
  not as proof of deployment safety.
- Status: **OPEN / STAGING OR DEPLOYMENT REPRODUCTION REQUIRED**.

## WAVE-0B-RESUME-001 — Safe staging variables absent — 2026-08-15

- Severity: **BLOCKER / P0 RELEASE CONTROL**.
- Evidence: all 25 exact variables required by the Wave 0C guard are missing
  from the effective process environment. The names/status matrix is recorded
  in section 27 of `WAVE_0B_RUNTIME_RELEASE_EVIDENCE.md`; values were never
  printed.
- The current authenticated Playwright suite stopped before browser activity
  with `BLOCKED — SAFE STAGING IDENTITY NOT ESTABLISHED`.
- No remote migration, quotation security migration, fixture, checkout,
  payment, deployment, or rollback action was attempted.
- Required action: provide the exact process-level staging contract and rerun
  the guard. Do not use production data.
- Status: **OPEN / NO-GO / WAVE 0B INCOMPLETE**.

## WAVE-0B-BOOTSTRAP-002 — CURRENT HEAD staging baseline reconstruction gap — 2026-08-16

- Severity: **BLOCKER / P0 RELEASE CONTROL**.
- The safe staging guard passed and Supabase attestation selected only
  `debroder-staging` (`ykfjgnrigcsapblbxnxb`), not production.
- Staging migration history was empty. The first two repository migrations
  applied successfully, but
  `20260711154031_v1_0_product_foundation_compatibility.sql` failed with
  PostgreSQL `42P01` because `public.profiles` does not exist.
- `public.profiles` is defined in historical `supabase/schema.sql` evidence,
  while no CURRENT HEAD migration creates it. The historical evidence is
  explicitly excluded from replay by the Wave 0C reconciliation record. No
  assumed baseline table or migration was created.
- The Wave 0C quotation RPC migration was not applied; the RPC is absent on
  staging. `public.stores` and `public.orders` are also absent, so supplied
  pickup/order IDs cannot yet be validated against real rows. No replacement
  IDs were created.
- Impact: remaining migrations, RPC security verification, admin/customer
  fixtures, role/store scope proof, purchasability/inventory proof, and
  authenticated E2E remain blocked. Production and reference repositories
  were untouched.
- Required action: owner-approved repository-controlled baseline/reconstruction
  path for a fresh staging project, followed by no-replay reconciliation of the
  two already applied staging migrations and continuation from the failed
  migration.
- Status: **OPEN / NO-GO / WAVE 0B STAGING BOOTSTRAP INCOMPLETE**.

## WAVE-0B-BOOTSTRAP-001 — Staging identity and bootstrap configuration absent — 2026-08-16

- Severity: **BLOCKER / P0 RELEASE CONTROL**.
- The resumed controlled staging bootstrap found all 25 exact Wave 0C
  guard/fixture names missing from the effective process environment. The
  application Supabase runtime names were also missing; no secret values were
  printed.
- The Wave 0C fail-closed guard rejected staging identity before any remote
  migration, fixture, or E2E action. Production was not accessed or modified.
- Required action: provide the exact process-level staging contract and staging
  application Supabase runtime values, then rerun the guard. Do not use
  production data.
- Status: **OPEN / NO-GO / WAVE 0B INCOMPLETE**.

## WAVE-0B-BASELINE-001 — Fresh-database baseline cannot yet be authored honestly — 2026-08-16

- Severity: **BLOCKER / P0 RELEASE CONTROL**.
- Scope: repository-only baseline implementation; no remote database or
  migration was changed.
- Evidence: `profiles`, `stores`, and `orders` are historical-schema objects,
  not active CURRENT HEAD migration creators. Later active migrations also
  require archived/reverted quotation, mockup, payment, fulfillment,
  notification, permission, audit, and repeat-order foundations. Independent
  static review found active migrations that reference order/payment columns
  before later migrations add them.
- Root-cause classification: **missing historical migrations; baseline not
  included in the active replay set; migration-history truncation/repository
  reconstruction artifact; and ordering problem**. `schema.sql` is mixed
  historical schema/bootstrap/data evidence and is not an executable baseline.
- Decision: do not create a partial baseline, invent a migration timestamp, or
  claim a deterministic fresh replay. No new migration or baseline test was
  added.
- Required action: owner approval for recovery and review of the complete
  archived foundation set, followed by a repository-controlled baseline and
  explicit manifest that resolves all dependencies before any staging reset or
  migration apply.
- Status: **OPEN / NO-GO / DESIGN BLOCKERS REMAIN**.

## WAVE-0B-BASELINE-002 — Authoritative reconstruction requires architecture approval — 2026-08-16

- Severity: **BLOCKER / P0 RELEASE CONTROL**.
- Artifact: `DEBRODER_DATABASE_RECONSTRUCTION_SPEC.md`.
- Evidence: the repository now has an explicit ownership matrix, domain
  authority map, legacy-modern product map, status reconciliation, dependency
  graph, logical-vs-filename ordering analysis, remote-only object inventory,
  baseline boundary, and migration manifest covering every migration file.
- The manifest replaces the incompatible product foundation/compatibility
  table creators conceptually, but no baseline SQL exists and no historical
  file was changed. Archived quotation, mockup, payment, fulfillment,
  notification, permission, audit, and repeat-order creators still require
  deliberate recovery and security review.
- Required owner decisions: canonical order status vocabulary, profile
  provisioning path, product-size authority, archived foundation recovery,
  migration identity/tooling, and later disposable staging reset.
- Status: **OPEN / ARCHITECTURE REVIEW REQUIRED / NO-GO**.

## WAVE-0B-BASELINE-003 — Approved baseline implemented; disposable replay pending — 2026-08-16

- Severity: **BLOCKER / P0 RELEASE CONTROL until disposable replay**.
- The owner-approved reconstruction has been implemented locally in
  `supabase/migrations/20260816102253_debroder_fresh_database_baseline.sql`.
- The fresh replay manifest classifies all 133 pre-existing migration files;
  the two incompatible product foundations are retained unchanged and
  classified `REPLACED BY BASELINE` for fresh replay only.
- Static coverage proves foundational tables, columns, enums, indexes,
  constraints, triggers, functions, RLS, policies, and grants are represented
  or deliberately mapped in the baseline coverage ledger. No business,
  customer, Auth, or fixture data is included.
- Evidence: focused baseline/Wave 0C tests 22/22 PASS; full Vitest 128 files /
  967 tests PASS; typecheck PASS; lint 0 errors / 34 existing warnings;
  `git diff --check` PASS.
- Local disposable replay is blocked by unavailable Docker, `psql`,
  `pg_isready`, and local Supabase config. No remote SQL was run; staging was
  not reset; production and reference repositories were untouched.
- Required next action: owner approval for disposable PostgreSQL/Supabase
  replay tooling, then a clean staging reset/replay approval after the local
  replay passes. Authenticated E2E remains prohibited.
- Status: **IMPLEMENTED LOCALLY / READY FOR DISPOSABLE REPLAY / OPEN / NO-GO
  FOR REMOTE APPLY**.

## WAVE-0B-REPLAY-001 — Fresh replay payment foundation gap — 2026-08-16

- Severity: **BLOCKER / P0 RELEASE CONTROL**.
- Target: disposable staging project `ykfjgnrigcsapblbxnxb` only.
- Evidence: post-failure attestation was `STAGING_STATE = EMPTY`; the
  repository-controlled baseline applied and passed verification; 20
  topologically ordered incremental migrations applied successfully.
- First failing migration:
  `20260712143745_v1_2_phase_5b_payment_audit_lock.sql`.
- Exact error: PostgreSQL `42883` because
  `public.update_order_payment_draft(uuid,bigint,timestamptz,text,text,text,text,text)`
  does not exist.
- Root cause: the active migration references a legacy Phase 5A payment
  function family that has no active creator, while the new baseline provides
  only the modern payment API. The missing creator must be reconstructed and
  security-reviewed in the repository baseline before fresh replay can be
  considered reproducible.
- Staging mutation: **YES**, baseline plus 20 migrations; failed migration
  was transactional and not recorded. Production mutation: **NO**.
- Fixtures, Wave 0C, authenticated E2E, deployment, and rollback:
  **NOT RUN / NOT PERFORMED**.
- Required action: update and verify the repository baseline/coverage ledger,
  then reset only disposable staging and replay from empty after owner
  approval. Do not patch staging or continue from this partial replay.
- Status: **OPEN / NO-GO / REPOSITORY CORRECTION REQUIRED**.

## WAVE-0B-REPLAY-010 — `audit_row_change()` foundation recovery — 2026-08-17 11:33:32 +08:00

- Severity: **BLOCKER / P0 RELEASE CONTROL until runtime replay**.
- Root cause recovered: the reverted historical append-only audit migration
  `20260712071058_phase13_append_only_audit.sql` created the shared
  `public.audit_row_change()` trigger function, but that migration is absent
  from the active fresh replay. Phase 11 consumed the missing function before
  Phase 13's documented pre-applied foundation.
- Repository correction: the approved fresh baseline now creates the function
  after `public.system_audit_log` and its append-only guard. The function
  preserves historical trigger semantics, records OLD/NEW JSONB snapshots,
  uses explicit `SECURITY DEFINER SET search_path = ''`, and is trigger-only
  with direct execution revoked for `PUBLIC`, `anon`, `authenticated`, and
  `service_role`.
- Canonical authority: one `public.system_audit_log`; no shadow audit table,
  public write path, anonymous write path, or authorization use of audit
  logging. Active Phase 11 and Phase 13 consumers are covered statically.
- Evidence: focused 8 suites / 53 tests **PASS**; full Vitest 132 files /
  993 tests **PASS**; typecheck **PASS**; lint **PASS, 0 errors / 34
  warnings**; build **PASS**; `git diff --check` **PASS**.
- Staging and production: **NOT CONTACTED / NO MUTATION**. Runtime closure is
  pending a separately authorized clean replay.
- Status: **CORRECTED LOCALLY / OPEN UNTIL RUNTIME REPLAY**.

## WAVE-0B-REPLAY-002 — Resume attestation confirms payment gap — 2026-08-16

- Severity: **BLOCKER / P0 RELEASE CONTROL**.
- Read-only attestation confirms staging project identity and
  **BASELINE_PRESENT with partial replay**: 21 migration records remain
  applied through payment completion.
- Baseline integrity/security checks pass and business/fixture counts remain
  zero. The six legacy payment function signatures required by
  `20260712143745_v1_2_phase_5b_payment_audit_lock.sql` remain absent.
- No reset, replay continuation, fixture, Wave 0C, authenticated E2E, or
  production action occurred in this resume attempt.
- Required action remains: correct and verify the repository baseline payment
  compatibility coverage, then reset only disposable staging and replay from
  empty after owner approval.
- Status: **OPEN / NO-GO / REPOSITORY CORRECTION REQUIRED**.

## PAYMENT-FOUNDATION-003 — Phase 5A payment compatibility correction — 2026-08-16

- Severity: **BLOCKER / P0 RELEASE CONTROL**.
- The repository baseline now reconstructs the historical Phase 5A payment
  function family required by `20260712143745_v1_2_phase_5b_payment_audit_lock.sql`.
- The implementation is over the canonical `public.order_payments` table and
  preserves amount checks, draft/pending-only edits, store scope, archived-
  first deletion, permission checks, safe SECURITY DEFINER paths, and closed
  public/anonymous execution.
- Static replay/coverage/security tests and the full local quality gates pass.
- Remote replay has **NOT** been retried. The existing disposable staging
  database remains at the previously recorded partial replay checkpoint and
  still requires a clean owner-authorized reset/replay to prove runtime SQL.
- Status: **IMPLEMENTED LOCALLY / STAGING REPLAY PENDING / NO-GO UNTIL
  CLEAN REPLAY VERIFICATION**.

## WAVE-0B-REPLAY-003 — Second historical payment foundation gap — 2026-08-16

- Severity: **BLOCKER / P0 RELEASE CONTROL**.
- Target: disposable staging project `ykfjgnrigcsapblbxnxb` only.
- Evidence: clean staging reset was attested empty; the corrected baseline
  passed; 20 topologically ordered incremental migrations passed; the
  previously missing `update_order_payment_draft` family was verified at
  runtime.
- First new failing migration:
  `20260712143745_v1_2_phase_5b_payment_audit_lock.sql`.
- Exact PostgreSQL error: **42883**, function
  `public.submit_public_payment_proof(uuid,text,text,text)` does not exist.
  The failure occurs at the migration's revoke statement and the migration is
  not recorded because the transaction rolled back.
- Root cause: the active Phase 5B security migration references an additional
  historical Phase 5A payment function not yet represented in the approved
  baseline. This is incomplete baseline coverage, not a staging data issue.
- Staging mutation: **YES**, reset plus baseline and 20 successful migrations;
  staging is preserved at the failure point. Production mutation: **NO**.
- Fixtures, Wave 0C, authenticated E2E, deployment, and rollback:
  **NOT RUN / NOT PERFORMED**.
- Required action: repository-only recovery of the legitimate
  `submit_public_payment_proof` contract, with security/authority review and
  static coverage tests, followed by a fresh owner-authorized staging replay.
- Status: **OPEN / NO-GO / REPOSITORY CORRECTION REQUIRED**.

## PAYMENT-FOUNDATION-004 — Obsolete public proof target corrected — 2026-08-16

- Severity: **BLOCKER / P0 RELEASE CONTROL until clean replay**.
- Forensic evidence from `supabase/schema.sql`, historical commits, the
  current public payment route, and the active payment migrations classifies
  `submit_public_payment_proof(uuid,text,text,text)` as an obsolete
  historical API. It has no CURRENT HEAD caller; the active flow is token/link
  authorized and calls `submit_customer_order_payment_v2` server-side.
- Recreating the historical boolean function would restore legacy
  `orders.payment_proof_path` mutation, order-number/phone authorization, and
  a second proof authority. That would violate the approved canonical
  `public.order_payments` architecture and fail-closed payment security.
- Repository correction: the Phase 5B audit migration now conditionally
  revokes the retired target only when it exists in a preserved historical
  database. Fresh replay does not require a fake function. The complete
  target inventory and security decision are recorded in
  `DEBRODER_BASELINE_COVERAGE_LEDGER.md`.
- Evidence: public-proof static contract suite **4/4 PASS**; focused payment,
  baseline, manifest, and Wave 0C suite **36/36 PASS**; full Vitest **130
  files / 978 tests PASS**; typecheck PASS; lint 0 errors / 34 warnings;
  `git diff --check` PASS.
- Database mutation: **NO**. Staging was not contacted or reset in this
  repository-only task. Production mutation: **NO**. Fixtures and E2E:
  **NOT RUN**.
- Remaining blocker: the later C1 migration still contains a separate
  historical hash/ACL preflight for this retired target. It requires a later
  repository-only manifest/security reconciliation and is not silently
  skipped here.
- Status: **IMPLEMENTED LOCALLY / OPEN / NO-GO UNTIL CLEAN STAGING REPLAY**.

## WAVE-0B-REPLAY-004 — Retired public payment RPC containment reconciled — 2026-08-16 20:46:58 +08:00

- Severity: **BLOCKER / P0 RELEASE CONTROL until runtime replay**.
- Root cause: `20260721090000_p0_security_critical_legacy_containment_c1.sql`
  unconditionally required two historical RPCs and the legacy
  `order-uploads` storage surface, although the approved fresh baseline
  intentionally omits them.
- Correction: C1 now has explicit fresh/legacy dual-mode behavior. Absent
  retired objects are valid on fresh installs. Existing legacy RPCs must match
  their frozen SHA-256, trusted owner, and accepted ACL state before
  containment; the historical anon/authenticated ACL may lack service-role
  execution, which C1 grants after validation; unexpected hash, owner, ACL,
  policy shape, or public bucket state fails closed.
- Security result: no retired function was recreated, no anonymous/public
  payment mutation was restored, and the canonical payment authority remains
  `public.order_payments` with the current server-side submission flow.
- Evidence: new static containment suite **5/5 PASS**; focused suite **33/33
  PASS**; full Vitest **131 files / 983 tests PASS**; typecheck **PASS**; lint
  **0 errors / 34 warnings**; `git diff --check` **PASS**.
- Database state: staging and production were not contacted or mutated;
  runtime SQL remains unverified. Fixtures, authenticated E2E, deployment, and
  rollback remain **NOT RUN**.
- Status: **IMPLEMENTED LOCALLY / READY FOR OWNER-AUTHORIZED CLEAN STAGING
  REPLAY / NO-GO UNTIL RUNTIME REPLAY**.

## WAVE-0B-REPLAY-005 — Corrected baseline pgcrypto qualification failure — 2026-08-16 21:19:53 +08:00

- Severity: **BLOCKER / P0 RELEASE CONTROL**.
- Target: disposable staging `debroder-staging` /
  `ykfjgnrigcsapblbxnxb` only.
- Evidence: owner-authorized reset passed and empty-state proof passed. The
  lossless baseline application failed at statement 93 while creating
  `public.saved_configurations.share_token`:
  `42883: function gen_random_bytes(integer) does not exist`.
- Root cause classification: **BASELINE**. Supabase exposes the installed
  `pgcrypto` function as `extensions.gen_random_bytes(integer)`, while this
  baseline expression calls `gen_random_bytes(24)` without a schema-qualified
  reference or a safe search-path guarantee.
- Transaction state: **ROLLED BACK**. Migration history remains empty; no
  application schema or business/Auth data remains after failure attestation.
- No payment, Phase 5B, C1, Wave 0C, fixture, E2E, or production action ran.
- Required action: repository-only correction of the baseline pgcrypto
  function qualification/search-path contract, static verification, then a
  newly authorized clean staging replay. Do not patch or continue staging.
- Status: **OPEN / NO-GO / REPOSITORY CORRECTION REQUIRED**.

## WAVE-0B-REPLAY-006 — Pgcrypto baseline qualification corrected — 2026-08-16 21:31:42 +08:00

- Severity: **BLOCKER / P0 RELEASE CONTROL until runtime replay**.
- Root cause confirmed: Supabase's installed `pgcrypto` functions are in the
  `extensions` schema, while the baseline used unqualified extension calls.
- Correction: baseline extension declaration is explicit and all baseline
  `gen_random_bytes`/`digest` calls are qualified. The two immediate
  executable bulk-ordering migrations were corrected for the same byte-
  generator dependency. No public wrapper or broad search-path workaround was
  added.
- Regression evidence: focused baseline/payment/C1/Wave 0C suite **39/39
  PASS**; full Vitest **131 files / 985 tests PASS**; typecheck **PASS**;
  lint **0 errors / 34 warnings**; `git diff --check` **PASS**.
- Database state: staging **NOT CONTACTED** in this task; production **NO
  MUTATION**. Runtime SQL remains unverified after correction.
- Status: **CORRECTED LOCALLY / READY FOR OWNER-AUTHORIZED CLEAN STAGING
  REPLAY**.

## WAVE-0B-REPLAY-007 — Fulfillment deletion-audit baseline collision — 2026-08-16 22:18:51 +08:00

- Severity: **BLOCKER / P0 RELEASE CONTROL**.
- Runtime evidence: corrected baseline and 29 incremental migrations passed in
  disposable staging. Migration
  `20260712154540_v1_2_phase_11_fulfillment_schema_and_audit.sql` failed at
  statement 10 with SQLSTATE `42703`: `column "order_id" does not exist` while
  creating `fulfillment_deletion_audit_order_idx`.
- Root cause: the baseline already creates
  `public.fulfillment_deletion_audit` without `order_id`; the Phase 11
  migration's `CREATE TABLE IF NOT EXISTS` therefore skips its fuller table
  definition and the subsequent index references a missing column.
- Rollback/history: transaction rolled back; the failed migration is not
  recorded and its index is absent. Staging remains at baseline plus 29
  successful incremental migrations, with no business/Auth fixture rows.
- Required next action: repository-only reconciliation of the baseline and
  Phase 11 ownership/column contract. Do not patch, reset, or continue staging
  until reviewed.
- Status: **OPEN / NO-GO / REPOSITORY CORRECTION REQUIRED**.

## WAVE-0B-REPLAY-008 — Phase 11 fulfillment audit foundation corrected — 2026-08-16 22:40:59 +08:00

- Severity: **BLOCKER / P0 RELEASE CONTROL until runtime replay**.
- Repository root cause corrected: the fresh baseline now establishes the
  complete `fulfillment_deletion_audit` shape expected by Phase 11, including
  `fulfillment_number`, non-null `order_id`, the historical reason default,
  `deleted_at` default, and `fulfillment_deletion_audit_order_idx`.
- Same-migration preflight also corrected the baseline
  `fulfillment_revisions.reason` non-empty check so the Phase 11 no-op table
  creator cannot silently omit that constraint.
- Ownership: one fulfillment authority; baseline foundation with Phase 11
  lifecycle/security extensions. No duplicate table, shadow state, public
  write path, or source-row FK that would destroy deletion audit history.
- Evidence: focused fulfillment/baseline **22/22 PASS**; full Vitest **131
  files / 988 tests PASS**; typecheck **PASS**; lint **0 errors / 34
  warnings**; `git diff --check` **PASS**.
- Staging and production: **NOT CONTACTED / NO MUTATION**. Runtime Phase 11
  remains unverified; the prior staging checkpoint is preserved at baseline
  plus 29 successful migrations.
- Required next action: owner-authorized clean staging replay of the corrected
  baseline and manifest, stopping at the first new SQL failure.
- Status: **CORRECTED LOCALLY / NO-GO UNTIL RUNTIME REPLAY**.

## WAVE-0B-REPLAY-009 — Phase 11 fulfillment security audit function missing — 2026-08-17 11:14:59 +08:00

- Severity: **BLOCKER / P0 RELEASE CONTROL**.
- Target: owner-authorized disposable staging `debroder-staging` /
  `ykfjgnrigcsapblbxnxb` only. Production was not contacted.
- Runtime evidence: clean reset and empty-state proof passed; corrected
  baseline passed; 35 migration records (baseline plus 34 incremental)
  executed and were recorded. The corrected Phase 11 schema migration and
  `fulfillment_deletion_audit.order_id` contract passed at runtime.
- First new failure:
  `20260712155146_v1_2_phase_11_fulfillment_security.sql`, SQLSTATE 42883,
  while creating `audit_fulfillments_changes`: `function
  public.audit_row_change() does not exist`.
- Rollback/history: the failing migration transaction rolled back and was not
  recorded; the trigger is absent. Staging remains preserved at the failure
  checkpoint with no fixture/Auth/business rows.
- Likely root cause: the Phase 11 security migration assumes a canonical audit
  trigger function that is not supplied by the fresh baseline or any applied
  prefix. The next repository-only task must recover ownership, security
  semantics, and static coverage before replay resumes.
- C1, Wave 0C, CURRENT HEAD verification, fixtures, and authenticated E2E:
  **NOT REACHED / NOT RUN**. Production mutation: **NO**.
- Status: **OPEN / NO-GO / REPOSITORY CORRECTION REQUIRED**.

## WAVE-0B-REPLAY-010 — Phase 11 fulfillment RPC grant signature mismatch — 2026-08-17 12:26:38 +08:00

- Severity: **BLOCKER / P0 RELEASE CONTROL**.
- Runtime target: disposable staging `debroder-staging` /
  `ykfjgnrigcsapblbxnxb`; production was not contacted.
- Clean reset and empty-state proof passed. The corrected baseline and 36
  incremental manifest migrations executed and were recorded, including the
  Phase 11 security migration and `audit_fulfillments_changes` trigger.
- First new failure:
  `20260712155229_v1_2_phase_11_fulfillment_rpc_grants.sql`, SQLSTATE
  `42883`, first statement target
  `public.create_fulfillment(uuid,text,text,text,text,text,integer,timestamptz,
  text,jsonb)`.
- Root cause: `20260712154619_v1_2_phase_11_fulfillment_create_and_update.sql`
  creates only the canonical 11-argument function, adding trailing
  `p_idempotency_key text`; the next migration's legacy 10-argument revoke
  target does not exist. The failed transaction rolled back and the
  migration is not recorded.
- Required next action: repository-only forensic correction of the Phase 11
  RPC-grants contract. Do not patch staging, skip the migration, or continue
  replay. C1, Wave 0C, CURRENT HEAD, fixtures, and E2E remain not reached.
- Status: **OPEN / NO-GO / REPOSITORY CORRECTION REQUIRED**.

## WAVE-0-MASTER-CLOSURE-012 — Final runtime and release evidence — 2026-08-19

- Severity: **CLOSED WITH EXECUTED EVIDENCE**.
- Clean disposable staging reconstruction passed from empty through the
  corrected baseline, 125 incremental migrations, C1, and Wave 0C. Final
  history contains 126 records and no failed migration.
- Required staging fixtures and five deterministic Auth identities were
  created in the approved namespace. Customer A/B isolation, full/admin
  guest/scoped-admin RBAC, store scope, Ready Stock checkout, order
  creation, payment submission/replay, inventory integrity, fulfillment
  transition, and notification event/outbox generation passed at runtime.
- The payment review route defect (authenticated direct read of protected
  `order_payments`) was corrected to use the already-authorized
  `adminClient` for readback while preserving the protected review RPC for
  mutation. Initial review and idempotent replay passed at runtime.
- Final security checks passed: no retired public payment/order RPC,
  anonymous payment mutation, legacy upload policy/bucket, quotation
  snapshot exposure, audit direct execution, or unsafe SECURITY DEFINER
  search path was found.
- Full Vitest, typecheck, lint, production build, and diff check passed.
  Existing 34 lint warnings remain non-blocking. No production contact,
  deployment, or production data copy occurred.
- Notification delivery worker and provider webhook execution are not
  configured in the current Wave 0 runtime; only event/outbox generation is
  closed with evidence.
- Owner decision required: **NONE** for Wave 0 scope. Wave 1 remains
  prohibited until separately authorized.
- Status: **CLOSED — WAVE 0 COMPLETE — READY FOR WAVE 1**.

## WAVE-1-COMMERCE-001 — Generic quotation-to-order conversion contract — 2026-08-19

- Severity: **BLOCKER / OWNER BUSINESS RULE**.
- Status: **OPEN — OWNER DECISION REQUIRED**.
- Current evidence: `components/admin/OrderConversionManager.tsx` calls
  `convert_quotation_to_order(uuid)`, but the function is absent from the
  approved staging database. W1 restored the four existing quotation and
  Repeat Order RPCs without inventing this conversion rule.
- The generic `quotations` record does not carry explicit delivery method,
  pickup store, or payment method/requirement inputs. Inferring or defaulting
  these values would change transaction semantics and could create an invalid
  order/fulfillment path.
- Required owner decision: define the exact conversion inputs/validation for
  pickup versus shipping, pickup store/shipping address, payment method and
  payment requirement, and the canonical order/item snapshot fields.
- Safe next action after approval: add one forward migration and regression /
  concurrency coverage, apply only to staging, then rerun authenticated E2E.

## WAVE-1-COMMERCE-001 — Owner decision implemented; runtime proof remains open — 2026-08-19 22:26:04 +08:00

- Severity: **BLOCKER / RUNTIME VERIFICATION**.
- Owner decision: **RESOLVED**. The conversion contract now uses one native
  explicit-input mutation path; quotation remains provenance evidence and the
  resulting order is transaction authority.
- Corrective artifacts:
  `supabase/migrations/20260819141452_wave_1_quotation_order_conversion.sql`,
  `supabase/migrations/20260819141725_wave_1_quotation_order_conversion_contract_correction.sql`,
  and `components/admin/OrderConversionManager.tsx`.
- Staging evidence: both migrations applied to
  `debroder-staging` / `ykfjgnrigcsapblbxnxb`; function signature, SECURITY
  DEFINER empty search path, ACL, uniqueness indexes, and unchanged W0/W1
  aggregate counts were postchecked. The draft quotation negative call failed
  closed as required.
- Runtime gap: staging has zero `quotation_versions` and no approved mockup
  conversion fixture, and no safe authenticated `E2E_*` identity is available.
  Happy path, pickup/shipping success, replay/conflicting replay,
  concurrency, duplicate item/history, and payment/inventory/fulfillment
  side-effect checks are **BLOCKED / NOT RUN**. No fixture was created.
- Status: **OPEN — RUNTIME VERIFICATION BLOCKED**. This is no longer an owner
  decision blocker. Wave 2 remains prohibited.
- Safe next action: provide the approved safe staging identity and permitted
  quotation/version/mockup fixture, then run the remaining W1 runtime contract
  matrix from the current migration checkpoint without reset or production
  contact.

## WAVE-1-COMMERCE-001 — Staging transaction matrix passed; browser E2E remains open — 2026-08-19 22:56:45 +08:00

- Severity: **BLOCKER / RUNTIME VERIFICATION**.
- Status: **OPEN — AUTHENTICATED BROWSER EVIDENCE REQUIRED**.
- Disposable staging now proves pickup, shipping, same-key replay,
  conflicting replay rejection, concurrent first conversion, and all required
  negative input/authorization/store-scope cases. The postcheck shows one
  order per successful W1 quotation and zero duplicate quotation or
  idempotency keys.
- Two live defects were reproduced and fixed with isolated forward migrations:
  service snapshot keys were aligned to the existing trigger contract, and the
  trigger was aligned to the actual canonical `order_item_services` columns.
  No historical migration was edited and no shadow service columns were added.
- No W1 payment, stock reservation, inventory movement, or fulfillment side
  effect was created. Existing aggregate counts remained unchanged for those
  categories.
- Remaining gap: database claim/session checks are not browser-authenticated
  Playwright evidence. Safe `E2E_*` credentials/base URL were unavailable and
  no credential was guessed. Production remains untouched.
- Exact next action: provide an authorized safe staging browser identity and
  base URL, run the Playwright W1 matrix from the current staging checkpoint,
  and close this issue only from executed browser evidence. Do not reset,
  reapply migrations, delete fixtures, contact production, or start Wave 2.

## WAVE-1-COMMERCE-001 — Browser E2E environment remains unavailable — 2026-08-19 23:09:06 +08:00

- Severity: **BLOCKER / RUNTIME VERIFICATION**.
- Status: **OPEN — AUTHENTICATED BROWSER EVIDENCE REQUIRED**.
- The owner-local Playwright harness was inspected. It discovers 7 existing
  public/Wave 0A tests, but no W1 browser spec is present; the required W1
  matrix was **BLOCKED / NOT RUN**.
- `e2e/support/env.ts` confirms the safe staging guard cannot be established:
  all required `E2E_*` values are missing. No credentials were printed or
  guessed, and production `.env.local` was not used.
- Read-only staging postcheck remains consistent with the prior runtime proof;
  no database or staging mutation occurred in this attempt.
- Exact next action: provide authorized non-production browser E2E values and
  run only the missing W1 matrix, then close this issue from actual browser
  evidence. Do not reapply migrations, recreate fixtures, reset staging,
  contact production, or start Wave 2.

## WAVE-1-COMMERCE-001 — Dedicated W1 Playwright harness added; runtime remains blocked — 2026-08-19 23:45:29 +08:00

- Severity: **BLOCKER / RUNTIME VERIFICATION**.
- Status: **OPEN — AUTHENTICATED BROWSER EVIDENCE REQUIRED**.
- `e2e/wave-1.spec.ts` now exists with 8 focused tests covering Full Admin,
  explicit conversion fields, pickup, shipping, same replay, conflicting
  replay, canonical order/read-model isolation, unauthenticated access, and
  Admin Guest denial. It uses the current harness and does not recreate
  fixtures or add credentials.
- Playwright discovery **EXECUTED AND PASSED** with 15 tests. The targeted W1
  run **EXECUTED AND BLOCKED** at the existing safe-staging guard with
  `BLOCKED — SAFE STAGING IDENTITY NOT ESTABLISHED`; 1 test reached the guard
  and 7 did not run. Browser console and visible-order evidence remain
  **NOT RUN**.
- TypeScript, focused W1 static regression (11 tests), and `git diff --check`
  **EXECUTED AND PASSED**. No database, staging, production, migration,
  deployment, or fixture mutation occurred.
- Exact next action: provide the authorized non-production `E2E_*` contract,
  run only `e2e/wave-1.spec.ts` against retained staging, execute the relevant
  read-only postcheck, and close this issue only from browser evidence. Do not
  reset, reapply, recreate, contact production, or start Wave 2.

## WAVE-1-COMMERCE-002 — Authenticated browser activation needs staging server configuration — 2026-08-20 00:36:54 +08:00

- Severity: **BLOCKER / OWNER DECISION REQUIRED**.
- Status: **OPEN — SAFE STAGING RUNTIME CONFIGURATION REQUIRED**.
- The retained staging Auth/session contract passed directly for Full Admin:
  Auth 200, session registration `true`, `session_valid=true`, complete
  scope, ACTIVE status, and `superadmin` role.
- The latest Playwright run against a staging-configured temporary local
  runtime collected 8 tests; 1 executed and failed during Full Admin login
  navigation, and 7 did not run. The app reached staging Auth but
  `/api/admin/session` returned `503 ADMIN_SERVICE_UNAVAILABLE` because
  the route requires a server-side staging service-role key.
- No approved staging application URL or safe staging service-role source was
  available. No production or other-ref credential was used. One initial
  stale-cache diagnostic attempted the production Auth URL before detection;
  no response/status was observed and no production mutation is known. No
  source, migration, fixture, or commerce behavior was changed to bypass this
  dependency.
- Read-only staging postcheck passed: 3 canonical W1 orders, one per retained
  quotation, 3 distinct idempotency keys, 3 order items, 3 service snapshots,
  and zero W1-linked payment, stock-reservation, inventory-movement,
  fulfillment, or job-order side effects.
- Exact owner decision / next action: provide an approved staging app URL with
  server-side configuration or a secure non-printed staging service-role
  source for one temporary local process. Then rerun only
  `e2e/wave-1.spec.ts`, capture browser and console evidence, repeat the
  read-only postcheck, and close this issue only from executed evidence. Do
  not use production credentials, commit secrets, reapply migrations, recreate
  fixtures, reset staging, or start Wave 2.

### WAVE-1-COMMERCE-002 FOLLOW-UP — STAGING SERVER CONFIGURATION RECOVERY — 2026-08-20 00:51:20 +08:00

- Status remains **OPEN — SAFE STAGING RUNTIME CONFIGURATION REQUIRED**.
- Process, user, and machine environment scopes contain no required W1 E2E
  values and no Supabase server-role configuration. The only repository-local
  service-role field is in `.env.bootstrap.local`, whose Supabase URL is
  unresolved/non-canonical; it was not used because staging binding cannot be
  proven. Production `.env.local` was not used.
- No secret was printed, copied into tracked content, committed, or guessed.
  No runtime or Playwright rerun occurred because the mandatory staging
  server configuration is absent. No database, migration, fixture, staging,
  production, or business-data mutation occurred in this checkpoint.
- Exact blocker: **STAGING SERVICE ROLE CONFIGURATION REQUIRED**.
- Exact next action: obtain secure, non-printed configuration bound solely to
  `ykfjgnrigcsapblbxnxb`; then activate exactly one runtime, verify
  `/api/admin/session` is not `ADMIN_SERVICE_UNAVAILABLE`, run only the W1
  Playwright spec, run the read-only postcheck, clean up, and close this issue
  only from executed browser evidence. Do not use production/other-ref
  credentials or start Wave 2.

### WAVE-1-COMMERCE-002 FOLLOW-UP — CONFIGURATION PRESENT BUT INVALID — 2026-08-20 09:06:33 +08:00

- Status remains **OPEN — SAFE STAGING RUNTIME CONFIGURATION REQUIRED**.
- `.env.e2e.staging.local` is present, ignored, and points to the approved
  staging ref. Its anon and service-role fields are present but
  **PLACEHOLDER_LIKE**. Read-only staging Auth admin and settings probes both
  returned HTTP `401`.
- The controlled activation stopped before password rotation and before
  starting Next. Playwright was **NOT RUN**. No SQL, migration, fixture,
  reset, staging business-data, or production mutation occurred.
- Exact blocker: **STAGING SERVICE ROLE CONFIGURATION REQUIRED**.
- Exact next action: provide valid non-printed credentials bound solely to
  `ykfjgnrigcsapblbxnxb`; validate them, then run exactly one runtime, the
  existing W1 Playwright spec, and the read-only postcheck. Do not use
  production/other-ref credentials or start Wave 2.

### WAVE-1-COMMERCE-002 FOLLOW-UP — SUPPLIED CREDENTIALS REJECTED — 2026-08-20 09:21:50 +08:00

- Status remains **OPEN — SAFE STAGING RUNTIME CONFIGURATION REQUIRED**.
- The ignored local file resolves to the approved staging ref and is not
  tracked. The publishable field is a short nonstandard 16-character value;
  the field named `SUPABASE_SERVICE_ROLE_KEY` is a publishable-key format.
  Read-only Auth settings, Auth admin, and REST probes all returned HTTP
  `401`.
- Runtime, `/api/admin/session`, password rotation, Playwright, SQL,
  migration, fixture, reset, and staging business-data mutation were **NOT
  RUN**. Production contact was **NO** in this attempt.
- Exact blocker: **STAGING SERVICE ROLE CONFIGURATION REQUIRED**.
- Exact next action: provide valid staging publishable/anon and genuine
  staging server-side service-role/secret credentials, then revalidate before
  starting the single runtime. Do not use production/other-ref credentials or
  start Wave 2.

### WAVE-1-COMMERCE-002 FOLLOW-UP — SERVER-SIDE CREDENTIAL STILL REJECTED — 2026-08-20 14:09:18 +08:00

- Status remains **OPEN — SAFE STAGING RUNTIME CONFIGURATION REQUIRED**.
- Staging URL identity passed; the env file remains ignored/untracked and no
  exact secret appears in tracked repository content.
- Publishable/anon credential: **HTTP 200 / USABLE**. Server-side
  secret/service-role credential: **HTTP 401 / NOT USABLE**.
- Stop rule applied: no runtime, `/api/admin/session`, Full Admin session,
  Playwright, postcheck, SQL, migration, fixture, reset, Auth password, or
  staging business-data mutation ran. Production contact: **NO**.
- Exact blocker: **STAGING SERVICE ROLE CONFIGURATION REQUIRED**.
- Exact next action: provide a valid server-side staging credential, rerun the
  non-secret validation, and continue only after HTTP 200. Do not use
  production/other-ref credentials or start Wave 2.

**HANDOFF UPDATED: YES — `CURRENT_PHASE_HANDOFF.md`**

## WAVE 2 COMMITTED/PUSHED CHECKPOINT — 2026-08-24 13:20:53 +08:00

- W2 package commit `bee4bc4e7feb847394bd2e0c37816943d70e3185` was pushed to
  `origin/UI-MIGRATION` with the requested message.
- Close-checkpoint review found no unrelated file, secret-bearing tracked
  file, env tracking violation, diff-check failure, or implementation defect.
- No W0/W1/W2 tests were rerun. Existing PASS evidence remains authoritative.
- Current terminal status: **WAVE 2 COMMITTED AND PUSHED — READY FOR WAVE 3**.
- Wave 3 is not started.

**HANDOFF UPDATED: YES — `CURRENT_PHASE_HANDOFF.md`**

## WAVE-2-STOREFRONT-001 — Public storefront fragmentation and state defects — 2026-08-24 13:09:52 +08:00

- Severity: **MAJOR / STOREFRONT QUALITY**.
- Status: **CLOSED — VERIFIED**.
- Reproduced defects: Homepage canonical sections were out of order and a
  legacy duplicate category section remained; global loading/error/not-found
  bypassed canonical recovery chrome; catalog text query was not durable in
  URL refresh/history; an unstable empty array cleared restored query state;
  structured region controls lacked complete label association and did not
  own confirmation invalidation.
- Minimal corrections: restored frozen Homepage composition with existing
  canonical sections; introduced one shared public boundary shell; added `q`
  to existing catalog route state and stabilized its default option identity;
  routed every address mutation through confirmation invalidation and added
  unique semantic control IDs/labels.
- Regression evidence: focused suites passed; full Vitest passed 152 files /
  1,054 tests; TypeScript passed; lint passed with 0 errors / 35 existing
  warnings; final staging-bound build passed with 139 static pages.
- Browser evidence: 13/14 full serial cases passed; the sole query race was
  fixed and the affected 390/1440 cases passed 2/2. All current 14 cases have
  executed PASS evidence without repeating already-passed cases. Major
  overflow, duplicate shell, broken loaded images, browser errors, and
  unexpected same-origin failures are zero in passing evidence.
- Commerce/database impact: **NONE**. W1 authority remained locked. No SQL,
  migration application, reset, fixture recreation, staging mutation,
  production mutation, or deployment occurred.
- Remaining storefront blocker: **NONE**. Terminal state:
  **WAVE 2 COMPLETE — READY FOR WAVE 3**.

## WAVE-2-RELEASE-001 — Intermediate build loaded production-ref environment — 2026-08-24 13:09:52 +08:00

- Severity: **PROCESS / ENVIRONMENT SAFETY WARNING**.
- Status: **RECORDED — NO STOREFRONT BLOCKER**.
- Evidence: after the sandboxed build failed on Google Fonts HTTPS, one
  network-enabled `next build` succeeded while Next loaded `.env.local`. A
  non-secret check resolved that file to production ref
  `lzennundwqqtyvvcnzbg`. Since static generation invokes Supabase read paths,
  production read contact is conservatively classified **YES**.
- Mutation assessment: production mutation **NO**. The static paths exercised
  by the build are public read-model paths; no checkout, order, payment,
  inventory, fixture, migration, or Admin mutation action was invoked.
- Corrective evidence: the final build loaded the ignored staging credentials
  into process environment only after validating ref
  `ykfjgnrigcsapblbxnxb`; it passed compilation, type/lint checks, page data,
  and 139 static pages. No secret value was printed or tracked.
- Safe continuation: future non-production verification must validate and
  inject the staging ref before build startup. This historical read-only
  contact cannot be undone but is not hidden and does not leave a storefront
  correctness blocker.

**HANDOFF UPDATED: YES — `CURRENT_PHASE_HANDOFF.md`**

## WAVE-1-COMMERCE-001 / 002 — Authenticated browser and staging configuration closure — 2026-08-24 00:05:28 +08:00

- Severity: **BLOCKER / RUNTIME VERIFICATION**.
- Status: **CLOSED — W1 TRANSACTION CONTRACT VERIFIED**.
- Approved staging configuration and both credential classes are usable with
  the installed Supabase SDK. The application uses
  `ykfjgnrigcsapblbxnxb`; `/api/admin/session` no longer returns
  `ADMIN_SERVICE_UNAVAILABLE`; Full Admin authentication/session activation
  passed. Production was not contacted.
- Browser evidence: all 8 W1 cases have current PASS evidence. The last full
  execution passed tests 1–7; test 8 correctly reached the Admin Guest
  read-only viewer but required an oracle correction. Only test-8 harness
  logic changed afterward, and its targeted rerun passed 1/1. The owner
  instruction not to repeat passed work was followed; no second full rerun was
  made and this selective verification fact must remain visible.
- Resolved defects: missing authenticated quotation/order-detail/Admin-shell
  SELECT grants were corrected by forward migrations `20260820063850`,
  `20260820064224`, and `20260820065821`; invalid `orders.converted_at` and
  nonexistent notification archive-field reads were removed. Existing RLS and
  DEBRODER domain authority remain intact.
- Final read-only postcheck passed: 3 canonical orders, 3 distinct quotation
  IDs, 3 distinct idempotency keys, 3 items, 3 service snapshots, zero
  duplicate quotation/idempotency groups, and zero payment/reservation/
  inventory-movement/fulfillment/Job Order side effects.
- Security: staging env remains ignored/untracked; exact tracked publishable
  and server-secret matches are zero; no secret was printed or committed.
  No reset, fixture recreation, historical migration replay, production
  contact, deployment, or destructive SQL occurred.
- Deferred non-W1 observation: Admin Guest's initial Product/PIM landing can
  request `/api/admin/products/library` and receive `403`. This belongs to
  Wave 3 Product Operational Acceptance and was not repaired or represented
  as a W1 commerce defect.
- Remaining W1 blocker: **NONE**. Wave 2 was not started in this task.
- Terminal status: **WAVE 1 COMPLETE — READY FOR WAVE 2**.

**HANDOFF UPDATED: YES — `CURRENT_PHASE_HANDOFF.md`**

**HANDOFF UPDATED: YES — `CURRENT_PHASE_HANDOFF.md`**

## CURRENT ISSUE STATE — WAVE 2 CLOSURE — 2026-08-24 13:12:26 +08:00

- The W2 storefront defect set documented above is **CLOSED — VERIFIED**.
- All 14 current browser cases have PASS evidence; full Vitest, typecheck,
  lint, staging-bound build, and final diff check pass.
- Open storefront blockers: **0**. Database, staging, and production mutation:
  **NO / NO / NO**.
- The intermediate production-ref read-only build contact remains a visible
  process warning, not a hidden PASS and not a storefront correctness blocker.
- Current terminal state: **WAVE 2 COMPLETE — READY FOR WAVE 3**.

**HANDOFF UPDATED: YES — `CURRENT_PHASE_HANDOFF.md`**

**HANDOFF UPDATED: YES — `CURRENT_PHASE_HANDOFF.md`**

**HANDOFF UPDATED: YES — `CURRENT_PHASE_HANDOFF.md`**

## FINAL COMMITTED/PUSHED CHECKPOINT — 2026-08-24 13:20:53 +08:00

- Wave 2 commit `bee4bc4e7feb847394bd2e0c37816943d70e3185` was pushed to
  `origin/UI-MIGRATION`.
- Close review found no unrelated file, secret-bearing tracked file, env
  tracking violation, or diff-check failure. Completed W2 tests were not
  rerun.
- Current terminal status: **WAVE 2 COMMITTED AND PUSHED — READY FOR WAVE 3**.
- Wave 3 is not started.

**HANDOFF UPDATED: YES — `CURRENT_PHASE_HANDOFF.md`**
