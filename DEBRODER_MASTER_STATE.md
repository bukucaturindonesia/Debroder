# DEBRODER MASTER STATE

Last updated: 1 August 2026 (Asia/Makassar)

## 1. Canonical repository state

- Repository: `bukucaturindonesia/Debroder`
- Default branch: `main`
- P0 checkpoint branch: `agent/p0-governance-repo-hygiene`
- P15 working branch: `agent/p15-database-alignment`
- Application has been deployed to Vercel, but deployment is not proof of COMPLETE.

## 2. Package status

- P0 Governance & Repository Hygiene: **CHECKPOINT / REMOTE BRANCH VERIFIED**.
- P1–P14: recorded as PASS through owner continuation and package handoffs.
- P15 Inventory Authority & Database Alignment:
  - remote migration application: **PASS**
  - zero-violation postcheck: **PASS**
  - RLS/ACL/search-path verification: **PASS**
  - source synchronization: **IMPLEMENTED**
  - local gate: **PASS**
  - commit/push: **PENDING OWNER ACTION**
- Final Integration, E2E, and Go-Live Readiness: **BLOCKED** until the P15 source checkpoint is committed and pushed.

## 3. P15 database facts

- Supabase project: `lzennundwqqtyvvcnzbg`
- Latest P15 correction: `20260727073246_p15_zero_balance_matrix_completion_v1`
- Missing matrix cohort corrected: `96`
- Cohort fingerprint: `0487ad98308bf4a7265752e364c54e4d`
- Active nonlegacy total on-hand: `11384` before and after
- Active nonlegacy total reserved: `0` before and after
- Current P15 violation counters: all `0`

## 4. Current release decision

**NO-GO / NOT COMPLETE**

Existing legal, CMS route, Preview performance, remote transaction E2E, data-integrity, and Supabase advisor backlogs remain open.

## 5. Next priority

1. Review, commit, and push the P15 source checkpoint.
2. Open Final Integration, E2E & Go-Live Readiness Audit.
3. Resolve remaining release blockers before requesting owner GO/NO-GO.

## 6. Owner-authorized combined package (28 July 2026)

- Working branch: `UI-UX-001`
- Public global shell and owner SVG registry:
  **IMPLEMENTED; STATICALLY VERIFIED**
- Canonical trial pricing source and correction migration:
  **IMPLEMENTED LOCALLY; REMOTE MIGRATION PENDING**
- Protected product-image sources inventoried: `101`
- Valid/nonzero sources: `101`
- High-confidence Crewneck copies: `12`
- Ambiguous sources retained without activation: `89`
- Canonical primary prepared: `/products/crewneck/black/front.webp`
- Full local test: **PASS — 100 files / 771 tests**
- Local build: **PASS**
- Runtime browser verification: **OWNER RUNTIME VERIFICATION REQUIRED**
- Commit, push, deployment, and remote migration application:
  **NOT PERFORMED**
- Package decision: **PARTIALLY VERIFIED / NO-GO**

---

## 7. Canonical Product Data V1 execution — 29 July 2026

- Branch/HEAD preflight: `UI-UX-001` / `28780ef6c85f1ee8ddf4d959334cc9a6b7f7367b`
- Supabase project: `lzennundwqqtyvvcnzbg`
- Remote migrations applied: `canonical_trial_pricing_v1` and
  `canonical_product_data_publication_readiness_v1`
- Canonical records verified: `12` products + `3` services
- Valid physical sellables / at canonical stock `100`: `662` / `662`
- Duplicate sellable SKU/opening movement: `0` / `0`
- Public active state: `2` physical products, `0` Jersey products, `1` service
- Products/Jersey missing proven primary image: `9`
- Focused regression: **PASS — 4 files / 23 tests**
- Final typecheck: **FAIL** because an existing `ProductRow` fixture permits
  `sales_mode: undefined`
- Lint, mandatory targeted Custom test, full test, build, and runtime:
  **NOT RUN after Cycle 2 stop condition**
- Package decision: **BLOCKED WITH EVIDENCE / NO-GO**
- Commit, push, deploy: **NOT PERFORMED**

---

## 8. UX/UI Bab 3–9 continuation — 29 July 2026

- Baseline: `ee588b84d47c09de6bc3308ef1ff0b9d0b9bf9a9`
- Branch: `UI-UX-001`
- Bab 3–8 code and focused verification: **IMPLEMENTED / PASS**
- Bab 9 viewport matrix: **PASS — 8 viewports, no horizontal overflow**
- Typecheck: **PASS**
- Lint: **PASS — 0 errors, 38 warnings**
- Mandatory Custom Commerce test: **PASS — 27/27**
- Full test: **PASS — 106 files / 793 tests**
- Production build: **PASS — 126 static pages**
- Database mutation/migration: **NONE**
- Remaining blockers:
  configured Jersey checkout contract, nine owner-unproven primary images,
  active Jersey taxonomy ownership, and Preview/live runtime-performance-E2E.
- Release decision: **BLOCKED WITH EVIDENCE / NO-GO / NOT COMPLETE**
- Commit, push, deploy: **NOT PERFORMED**

---

## 9. Bab 9 targeted no-go closure — 29 July 2026

- Configured Jersey checkout contract: **IMPLEMENTED LOCALLY, NOT APPLIED**
- Server-authoritative repricing/fingerprint validation: **IMPLEMENTED**
- Immutable order-item configuration/pricing snapshot: **IMPLEMENTED LOCALLY**
- Order-before-payment and same-order payment architecture: **PROVEN IN
  SOURCE/FOCUSED TEST**
- Database migration/data writes in this closure: **NONE**
- Nine primary-image mappings: **0/9; BLOCKED BY OWNER IDENTITY EVIDENCE**
- `jersey-custom-pilot` taxonomy: **BLOCKED; 12 canonical candidates and no
  sport discriminator**
- Typecheck after bounded correction: **PASS**
- Focused closure test: **PASS — 4/4**
- Regression run: **FAIL — 2 stale assertions; 105/107 files and 795/797 tests
  pass**
- Final lint/build/runtime gate: **NOT RUN after Pass 2 stop condition**
- Release decision: **BLOCKED WITH EVIDENCE / NO-GO / NOT COMPLETE**
- Commit, push, deploy, merge: **NOT PERFORMED**

---

## 10. Targeted Bab 9 final continuation — 29 July 2026

- Remote migrations applied and locally synchronized:
  `20260729033931_configured_jersey_checkout_v1`,
  `20260729033946_provisional_product_primary_images_v1`, and
  `20260729045016_ready_stock_fulfillment_trigger_record_fix_v1`.
- Configured Jersey exact-price checkout: **REMOTE RPC VERIFIED**.
- Order-before-payment: **PASS**; one idempotent test order is `unpaid` with
  zero payment rows.
- Duplicate configured checkout: **PASS**; retry returned the same order ID.
- Public product images: **5/5 present**; nine provisional canonical mappings
  are local, nonempty, and HTTP 200.
- Canonical configured Jersey products public-active: `2`.
- Pilot Jersey taxonomy: **BLOCKED**, with 12 candidates and no discriminator.
- Typecheck: **PASS**.
- Lint: **PASS — 0 errors / 38 warnings**.
- Custom Commerce: **PASS — 27/27**.
- Full test: **PASS — 107 files / 798 tests**.
- Build: **PASS — 126 static pages**.
- Local runtime data fetch: **BLOCKED — outbound Supabase `fetch failed`**.
- Release decision: **BLOCKED WITH EVIDENCE / NO-GO / NOT COMPLETE**.
- Commit, push, deploy, merge: **NOT PERFORMED**.

---

## 11. Public product card purchase clarity — 29 July 2026

- Shared public product-card contract: **IMPLEMENTED AND CODE-VERIFIED**.
- Canonical hierarchy: image, canonical color swatches, compact metadata,
  two-line product name, and canonical base price.
- Canonical base-price source: `products.base_price`; invalid or unavailable
  values render `Harga belum tersedia`.
- Whole-card navigation: one accessible link to `/produk/[slug]`; duplicate
  detail/action links and instructional price friction were removed.
- Jersey Shop now reuses the same shared public card.
- Focused product-card test: **PASS — 7/7**.
- Targeted public-card regression: **PASS — 9 files / 52 tests**.
- Typecheck: **PASS**.
- Lint: **PASS — 0 errors / 38 warnings**.
- Full test: **PASS — 107 files / 799 tests**.
- Production build: **PASS**; completed `.next/BUILD_ID` and route manifest
  were generated at 19:41:58.
- Runtime: **BLOCKED WITH EVIDENCE**. The existing port 3100 server first
  rendered `/kaos-polos` with `0 produk`, then returned HTTP 500 after the
  production build replaced its `.next` artifacts. No second server was
  started.
- Database/migration/route changes: **NONE**.
- Release status: **PARTIALLY RUNTIME VERIFIED / NOT COMPLETE**.
- Commit, push, deploy: **NOT PERFORMED**.

## 20. Admin Handcrafted UI & Rendering V1 — 9 August 2026

- Canonical Admin shell and Global Dashboard now use an Admin-scoped native
  system font stack, white/zinc surfaces, subtle borders, restrained hover
  elevation, tabular numerals, muted active navigation, and responsive 4/8 px
  spacing. Existing role-aware navigation, native tables/SVG, and data paths
  remain canonical.
- Reusable Admin loading feedback and access verification now render skeleton
  structures with screen-reader status text and reduced-motion support; no
  spinner, external font, chart library, table library, or dependency was
  added.
- Database/migration, routes, permissions, APIs, commerce, CMS/PIM ownership,
  and production data: **UNCHANGED**.
- Verification: focused final **33/33 PASS**; typecheck **PASS**; lint **0
  errors / 37 existing warnings**; direct Next production build **PASS — 128
  pages**; `git diff --check` **PASS**.
- Full suite remains red on three unrelated source-literal/line-ending
  assertions (two Phase 4–13 SQL, one Kaos Polos). Admin-owned tests are green.
- Status: **ADMIN UI IMPLEMENTED AND LOCALLY VERIFIED; REPOSITORY SCRIPTED
  GATE NOT FULLY GREEN; NO DEPLOYMENT OR PRODUCTION MUTATION**.

---

## 19. Admin Account & Role-Based Experience V1 — 2 August 2026

- Active scope: audit and local implementation of the canonical Admin Auth →
  profile → role → store scope → account status → effective-permission chain.
- Implemented one permission-driven AdminShell/navigation source, server route
  authorization, canonical session/status/scope enforcement, role-specific
  dashboard presentation, and the six owner-approved role contracts.
- Implemented account list/detail, filtered roster, invitation foundation,
  role/scope/status changes, reset initiation, session revocation, and
  append-only lifecycle audit. Invitation profile creation and its audit row
  are one database transaction; Auth invitation remains an explicit Owner UI
  action.
- Added local-only migration
  `20260802090000_admin_account_role_experience_v1.sql` and read-only verifier.
  Migration is **NOT APPLIED** locally or remotely. No Auth user, invitation,
  password, profile, session, or production account was mutated.
- Restored the three missing, already-applied Admin RBAC history sources under
  their remote version numbers (`20260725070355`, `20260725073814`, and
  `20260725074004`). Their blob hashes exactly match the historical source;
  they were not edited or re-executed.
- Supabase project: `lzennundwqqtyvvcnzbg`. Remote history currently ends at
  `20260801204856_pay_at_store_cash_evidence_alignment_v1`; the new package
  migration is pending Owner activation.
- Verification: focused account/role tests **35/35 PASS**; impacted compatibility
  tests **PASS**; all non-Kaos test files **113/113, 877/877 PASS**; typecheck
  **PASS**; lint **PASS with 0 errors / 37 existing warnings**; direct Next.js
  production build **PASS — 128 pages**.
- Full `pnpm test` remains red only on one unchanged Kaos Polos assertion whose
  multiline literal is LF-only while the Windows working copy is CRLF. No Kaos
  or public UI file was modified under this package.
- Runtime role/account matrix is **NOT RUN** because the migration has not been
  applied and the production accounts must not be mutated. Exact target Auth
  roster re-query was also unavailable at finalization because the Supabase
  connector reached its usage limit; earlier read-only profile evidence found
  all eight target profiles.
- Package state: **IMPLEMENTED AND LOCALLY VERIFIED; OWNER MIGRATION/ACTIVATION
  AND DEPLOYED RUNTIME REQUIRED; PROJECT REMAINS NOT COMPLETE**.
- Commit, push, deploy: **NOT PERFORMED**.

## 14. Kaos Polos editorial commerce category — 30 July 2026

- Canonical route and taxonomy remain `/kaos-polos` and **Kaos Polos**.
- Dedicated page composition: **IMPLEMENTED** without changing shared category
  behavior for Jaket & Hoodie or Headwear.
- Catalog contract: desktop **3 columns**; open desktop filter **sidebar + 2
  columns**; mobile **2 columns**; first-row editorial media spans two desktop
  columns and becomes full-width after the first two mobile products.
- Product Card remains the canonical shared full-card link with **no permanent
  purchase CTA** and a reserved 4:5 media frame.
- Hero/editorial media reads existing CMS records; products, variants,
  images, exact-color availability, stock, price, and routes remain canonical
  PIM data. No sample product or campaign record was created.
- Typecheck: **PASS**.
- Lint: **PASS — 0 errors / 38 existing warnings**.
- Focused and full regression: **PASS — 112 files / 832 tests**.
- Production build: **PASS — 126 routes generated**.
- Browser runtime: **EXPLICITLY DEFERRED** because the owner has prohibited
  additional local runtime launcher attempts after the recorded Windows
  launcher blocker.
- Database/migration/commit/push/deploy: **NONE / NOT PERFORMED**.
- Release status: **IMPLEMENTED AND CODE-VERIFIED WITH EXPLICIT RUNTIME AND
  CMS/PIM CONTENT PREREQUISITE DEFERRALS; PROJECT REMAINS NOT COMPLETE**.

---

## 14. Product Card and PDP final runtime closure — 30 July 2026

- Public Product Card full-card semantic link, catalog URL history, and
  universal PDP route: **IMPLEMENTED AND VERIFIED**.
- Runtime found one desktop sticky containment defect: the `items-start` grid
  left `data-pdp-media` only as tall as the gallery, so CSS sticky had no
  travel range.
- Minimum correction: `data-pdp-media` now uses `lg:self-stretch`; no product,
  pricing, stock, cart, checkout, order, payment, or database contract changed.
- Desktop runtime: header bottom `72px`, sticky top `88px`, and gallery stops
  exactly at the media containing-block bottom before later sections.
- Catalog runtime: 18 semantic product links, 0 broken completed images, and
  no horizontal overflow at 320, 375, 390, 430, 768, 1024, 1280, 1440, and
  1536px.
- Catalog `status` and `sort` URL state and browser Back/Forward restoration:
  **VERIFIED**.
- Cotton Combed PDP: 15 colors, collapsed 10-color state retaining the selected
  Navy option, fixed apparel size grid with unavailable sizes disabled,
  canonical SKU/stock/server price, Add to Cart, and Buy Now checkout handoff:
  **VERIFIED**.
- Jersey hybrid PDP Custom CTA to the canonical Jersey Configurator:
  **VERIFIED**.
- Focused sticky/PDP regression: **12/12 PASS**.
- Final typecheck: **PASS**.
- Final lint: **PASS — 0 errors / 38 existing warnings**.
- Final Custom Commerce test: **27/27 PASS**.
- Final full suite: **110 files / 824 tests PASS**.
- Production build: **PASS — 126 routes**.
- Browser console errors: **0**. Runtime stderr recorded bounded
  `TimeoutError` entries during rapid navigation/back-forward checks; no HTTP,
  page, pricing, cart, or navigation failure was observed.
- Database/migration/deployment: **NONE**.
- Release status: **IMPLEMENTED AND LOCALLY VERIFIED; PROJECT NOT COMPLETE**.
- Commit, push, deploy: **NOT PERFORMED**.

---

## 14. Public Multi-Page Experience V2 and corporate/legal draft — 30 July 2026

- Canonical routes remain unchanged: `/koleksi`, `/kaos-polos`,
  `/jaket-hoodie`, `/headwear`, `/jersey`, `/custom`, `/legal/terms`,
  `/legal/privacy`, and `/tentang`.
- Desktop mega dropdown now derives its fixed top position from the measured
  public header height. Runtime at 1440px proved header bottom `72px`,
  dropdown top `72px`, gap `0px`, margin top `0px`, padding top `0px`, and
  transform `none`.
- Category commerce now uses the locked 420/340/280 hero heights, at most
  seven discovery colors, 3–4 latest products, a 4/3/2 catalog grid, and
  12-product load batches.
- `/koleksi` now composes category discovery, curated products, latest
  products, and the complete catalog from canonical PIM products. Sections
  that lack enough canonical data hide instead of fabricating content.
- `/custom` now implements the distinct Custom T-Shirt and Jersey Custom
  experience while preserving the official Custom builder and Jersey
  Configurator. Runtime currently returns the canonical empty state because
  no Custom category is published by the source.
- `/tentang` now presents CMS-owned corporate story, published trust items,
  store information, testimonials, and canonical collection/custom exits.
- `/legal/terms` and `/legal/privacy` now render accessible versioned drafts
  from the owner-provided legal working document. Both remain `noindex`,
  explicitly state that they are not legally approved, and preserve every
  unverified identity, contact, SLA, QC, and retention value as unresolved.
- Focused tests: **PASS — 5 files / 30 tests**.
- Typecheck: **PASS**.
- Lint: **PASS — 0 errors / 38 existing warnings**.
- Full test: **PASS — 109 files / 819 tests**.
- Production build: **PASS — 126 routes**.
- Runtime: all nine in-scope routes returned **HTTP 200**; desktop and mobile
  checks found no Next.js error overlay, horizontal overflow, or broken
  completed image.
- Database, migration, product data, pricing, stock, checkout, order,
  payment, numbering, RLS, and ACL changes: **NONE**.
- Release status: **IMPLEMENTED AND CODE/RUNTIME VERIFIED; LEGAL PUBLICATION
  REMAINS NO-GO UNTIL OWNER AND QUALIFIED COUNSEL APPROVAL; PROJECT NOT
  COMPLETE**.
- Commit, push, deploy: **NOT PERFORMED**.

---

## 14. Cotton Combed tier pricing canonical closure — 29 July 2026

- Root cause: applied migration `20260729013734_canonical_product_data_publication_readiness_v1.sql`
  directly changed canonical physical products to `tier_scope = 'none'`;
  the tier-sync trigger did not run because no tier row changed.
- Affected data: exactly `cotton-combed-24s` (`DBR-CC24`) had active tiers
  while retaining `tier_scope = 'none'`.
- Correction: migration
  `20260729141510_cotton_combed_tier_pricing_canonical_closure_v1.sql`
  changed only that product's scope from `none` to `product`.
- Existing active tiers and IDs were preserved: 1–11 at Rp45.000, 12–23 at
  Rp42.000, and 24+ at Rp40.000; duplicate active tiers remain zero.
- Order and order-item counts plus historical pricing fingerprints were
  unchanged.
- Boundary quantities 1, 11, 12, 13, 23, and 24: **SERVER, PDP, AND CART
  VERIFIED**.
- Typecheck: **PASS**.
- Lint: **PASS — 0 errors / 38 existing warnings**.
- Full test: **PASS — 108 files / 813 tests**.
- Production build: **PASS — 126 pages**.
- Release status: **TARGETED PRICING DEFECT CLOSED AND VERIFIED; PROJECT
  REMAINS NOT COMPLETE**.
- Commit, push, deploy: **NOT PERFORMED**.

---

## 13. Product Card and PDP runtime closure — 29 July 2026

- Previous HTTP 500 root cause: **PROVEN GENERATED-RUNTIME FAILURE**.
  A long-running `next dev` process remained active while `.next` was replaced;
  the resulting production output referenced missing server chunks
  `5873.js`, `5611.js`, and `vendor-chunks/@supabase.js`.
- Source-code defect: **NOT FOUND**.
- `.next` was removed only after the missing-chunk stack trace was captured.
- One direct production rebuild: **PASS — 126 pages**.
- Runtime BUILD_ID: `C0zkDeBcm2GJcJ8siBKqH`.
- Fresh controlled production routes `/`, `/kaos-polos`, `/koleksi`,
  `/produk/crewneck`, and `/produk/jersey-custom-pilot`: **HTTP 200**.
- Product Card live data: **VERIFIED** on `/kaos-polos` (1 product) and
  `/koleksi` (5 products).
- Canonical Ready Stock PDP used: `cotton-combed-24s`.
- Color/size/SKU/stock/pricing/cart runtime: **VERIFIED** for Benhur, M,
  `DBR-CC24-BENHUR-M`, stock 100, exact unit price Rp45.000, and one cart
  insertion.
- Desktop/mobile composition, gallery, safe sticky behavior, accordion,
  stale-pricing protection, and no pricing-request loop: **VERIFIED**.
- Zero-stock size state: **DEFERRED — inspected canonical variants expose
  stock 100 for every supported size**.
- UGC/complementary/similar recommendations: **HIDDEN** because no canonical
  relationship data was returned.
- Browser 200% native zoom: **NOT PROVEN by the available browser control**;
  640px equivalent reflow passed without horizontal overflow.
- Source/test/database/migration changes: **NONE**.
- Release status: **RUNTIME BLOCKER CLOSED; PARTIALLY VERIFIED WITH EXPLICIT
  DATA/ZOOM DEFERRALS; NOT COMPLETE**.
- Commit, push, deploy: **NOT PERFORMED**.

---

## 12. PDP final experience — 29 July 2026

- Universal PDP route `/produk/[slug]`: **IMPLEMENTED AND CODE-VERIFIED**.
- Final primary hierarchy: canonical gallery, product identity and base price,
  canonical color/size controls, quantity, server-authoritative tier pricing,
  exact subtotal, and one Add to Cart action.
- Canonical media/variant integrity: **IMPLEMENTED**; unsupported colors,
  sizes, stock, and unrelated fallback media are not fabricated.
- Responsive gallery, bounded lightbox navigation, safe desktop sticky panel,
  disclosure content, and same-category product recommendations:
  **IMPLEMENTED**.
- Dipakai Pelanggan and Lengkapi Penampilan: **HIDDEN** because no canonical
  UGC or complementary-product relationship source exists.
- Focused PDP test: **PASS — 7/7**.
- Related regression: **PASS after one bounded stale-assertion correction**.
- Typecheck: **PASS**.
- Lint: **PASS — 0 errors / 38 warnings**.
- Full test: **PASS — 108 files / 806 tests**.
- Production build: **PASS — 126 static pages**.
- Runtime: **BLOCKED WITH EVIDENCE**. Existing port 3100 returns HTTP 500 for
  `/produk/crewneck`; `/produk/jersey-custom-pilot` returns HTTP 200 only for
  `Produk belum tersedia`. No second server was started.
- Database/migration/route creation: **NONE**.
- Release status: **IMPLEMENTED; CODE AND BUILD VERIFIED; OWNER RUNTIME
  VERIFICATION REQUIRED; NOT COMPLETE**.
- Commit, push, deploy: **NOT PERFORMED**.

---

## 15. Kaos Polos owner editorial revision — 31 July 2026

- Hero height reduced by 40%; hero typography scale reduced by 20%.
- Featured source changed from PIM products to two CMS editorial records; gap locked to 0 px.
- Editorial banner locked to a 1600 × 500 reference frame with 400 × 500 left media, 1200 × 500 right media, and 1 px gap.
- Left banner media routes to canonical Custom Kaos Polos; right banner media is non-clickable and keeps CTA ownership in the caption.
- “Pilih Kategori” now follows the Homepage Shop by Category native carousel and scrollbar behavior.
- Desktop catalog remains three product columns when the filter sidebar is open; product media remains 4:5.
- Dedicated CMS route `/admin/commerce/kaos-polos` added using shared `cms_banners`. The initial no-migration assumption was superseded by the 1 August 2026 compatibility migration recorded below.
- Static contract and TS/TSX parser verification: **PASS**.
- Full pnpm quality gate and browser runtime: **PENDING OWNER/LOCAL ENVIRONMENT** because dependencies were not included and registry access is unavailable.
- Package decision: **IMPLEMENTED AND STATICALLY VERIFIED / NOT COMPLETE**.

---

## 16. Kaos Polos Owner CMS Hotfix — 1 August 2026

**Canonical owner decisions — FINAL for this package:**

- Admin editing must be slot-based: `Featured 01`, `Featured 02`,
  `Banner kiri`, and `Banner kanan`.
- Owner-facing forms must not require manual entry of database-oriented fields
  such as `experience_key`, `section_type`, `section_key`, internal name, or
  sort order.
- Desktop banner composition is `25:75`; mobile banner composition is `32:68`;
  both use a 1 px gap.
- Mobile banner media must remain horizontal/editorial and must not stack.
- Desktop and mobile focal positions are independently CMS-owned through a
  visual 3 × 3 control.
- Kaos Polos section spacing inherits the same canonical Homepage tokens and
  top-only rhythm; section padding may not accumulate between adjacent blocks.
- Public catalog heading appears once. Product count is always derived from
  current data/filter state as `{visible.length} Produk`.
- Featured is CMS-owned, capped at two published public items, and is hidden
  when no published item exists rather than fabricated.

**Database evidence:**

- Migration `20260801045549_kaos_polos_editorial_section_types_v1`:
  **APPLIED AND VERIFIED** on Supabase project `lzennundwqqtyvvcnzbg`.
- Repository migration source uses the exact applied version.
- `cms_banners_section_type_check` preserves prior values and additionally
  accepts `featured_editorial`, `banner_editorial_left`, and
  `banner_editorial_right`.
- Product, pricing, stock, SKU, cart, checkout, order, payment, and transaction
  behavior is unchanged.

**Release state:**

- Implementation and database alignment: **PASS**.
- Full local quality gate and runtime visual verification: **PENDING**.
- Commit, push, deploy: **NOT PERFORMED**.
- Project remains **NO-GO / NOT COMPLETE** until remaining package and global
  release gates are satisfied.

---

## 17. P0 transaction and Admin operational recovery — 1 August 2026

- Active scope: payment-verification conflict recovery, browser Supabase
  singleton, payment form semantics, notification display dedupe, and static
  Admin capability/security regression. No visual redesign or Kaos Polos work
  was performed.
- Payment verification now returns stable result codes and canonical payment
  state. A repeated `verify` for an already verified payment is an idempotent
  HTTP 200; stale, duplicate-reference, already-reviewed, missing-pending, and
  inactive-order conflicts remain explicit and non-mutating.
- Admin payment UI prevents concurrent submit, parses the response, refetches
  canonical state after every server response, closes stale/completed review
  state safely, and preserves review input on retryable validation conflicts.
- Browser auth now uses one HMR-safe client per browser context; server access
  remains request-scoped, non-persistent, and separate. No service-role client
  was added to browser code.
- Remote notification audit found zero duplicate event idempotency keys and
  zero duplicate `(event_id, recipient_id, channel)` rows. The observed 2–3
  rows per event are distinct legitimate recipients. UI Realtime inserts now
  have a bounded per-ID replay guard; unread remains server-count-derived.
- Every native input, select, textarea, checkbox, and file input in the owned
  Admin payment workspaces has an ID, name, associated label, and applicable
  browser semantics; this contract is AST-tested.
- Admin routes and role-aware navigation remain intact. `PIM V2` stays
  intentionally consolidated behind the canonical Product workspace; no
  deprecated Admin version or broad permission bypass was restored.
- Database/schema changes: **NONE**. Existing recovery migration
  `20260730122821_transaction_notification_admin_recovery_v1` and latest known
  migration `20260801045549_kaos_polos_editorial_section_types_v1` are present
  in remote history for project `lzennundwqqtyvvcnzbg`; package migrations
  pending: **NONE**.
- Verification: focused P0 **29/29 PASS**; custom-commerce **27/27 PASS**;
  typecheck **PASS**; lint **0 errors / 38 pre-existing warnings**; full suite
  **112 files / 842 tests PASS**; production build **PASS — 127 pages**;
  `git diff --check` **PASS after governance append**.
- Local/GitHub alignment: local HEAD and `origin/UI-UX-001` both
  `07557dc62fd07a239998c8974738c2888d42443f` before this uncommitted package.
- Vercel alignment/runtime: **NOT VERIFIED**. The available Vercel team
  returned no projects and the repository has no `.vercel/project.json`; no
  production SHA/log was fabricated and no deployment was performed.
- Release status: **IMPLEMENTED AND CODE/BUILD VERIFIED; RUNTIME AND CONTROLLED
  LIVE TRANSACTION MATRIX DEFERRED; PROJECT REMAINS NO-GO / NOT COMPLETE**.
- Commit, push, deploy: **NOT PERFORMED**.

---

## 18. P0 Pay at Store + Store Pickup canonical workflow — 1 August 2026

- Active scope is limited to the canonical sequence: Pesanan Masuk →
  Persiapan/Produksi → Siap Diambil → customer arrival → Verifikasi Akhir &
  Harga → Pembayaran di Toko → Serah Terima/Pickup → Selesai.
- Root cause was a split authority between fulfillment, payment, and UI
  projection: Pay at Store could record final verification before arrival,
  payment and handover were coupled, and a completed order could project back
  to a non-terminal stage.
- The recovery adds explicit arrival and handover milestones, four
  role-checked RPCs, invariant guards, exactly-once history events, and one
  canonical stage resolver shared by Admin, customer order, and guest tracking
  read models. Completed/picked-up remains terminal even when legacy integrity
  warnings exist.
- Supabase project `lzennundwqqtyvvcnzbg`: migration
  `20260801115245_pay_at_store_pickup_canonical_workflow_v1` is **APPLIED AND
  VERIFIED**. Four milestone columns, five resolver/workflow RPCs, the progress
  guard trigger, and authenticated/service-role-only workflow ACL are present.
- Duplicate local migration
  `20260801044500_kaos_polos_editorial_section_types_v1.sql` was removed; the
  applied canonical source `20260801045549_kaos_polos_editorial_section_types_v1.sql`
  remains unchanged.
- Read-only reference `ORD-DEB-2026-0050` remains `completed` and terminal;
  its pre-recovery ordering anomaly is retained as a warning and was not
  mutated.
- Verification: focused/impacted **41/41 PASS**; required payment,
  notification, and custom-commerce regressions **40/40 PASS**; full suite
  **113 files / 848 tests PASS**; typecheck **PASS**; lint **0 errors / 38
  pre-existing warnings**; production build **PASS — 127 pages**.
- Deployment, production transaction E2E, notification UI replay, Admin
  persistence, tracking, LCP, and production logs: **PENDING** until the code
  commit is merged and the Current Vercel deployment is verified.
- Package state before production runtime: **IMPLEMENTED; DATABASE MIGRATED;
  LOCAL QUALITY GATES PASS; NOT YET OWNER QUALITY-GATE COMPLETE**.

---

## 19. Customer Account & Email Verification V1 — 6 August 2026

- Customer account implementation is based on Jersey baseline commit
  `45b1743` on branch `codex/customer-account-email-verification-v1`; the
  multi-product Jersey configurator remains preserved.
- Public navigation now exposes only customer `Masuk` / `Akun Saya`. Admin
  login remains an internal route and no Admin link is published in the
  customer account flow.
- Customer registration uses email/password with mandatory email confirmation,
  protected server provisioning metadata, reCAPTCHA, generic duplicate/recovery
  responses, and a customer-specific browser session namespace.
- Internal Admin/staff identities remain in `profiles`; customer identities use
  new `customer_profiles` and `customer_addresses`. An internal identity is
  explicitly rejected from the customer path.
- Guest checkout remains available. A verified signed-in customer is linked to
  `orders.customer_user_id`; historical unclaimed orders are attached only by
  exact verified normalized email. WhatsApp/phone are not identity authority.
- Customer-facing and Admin manual WhatsApp confirmation actions were removed
  from the active checkout path. Existing legacy columns and enum keys are
  retained only for compatibility while checkout activation occurs
  automatically through the new guarded function.
- Local additive migration:
  `20260806214500_customer_account_email_verification_v1.sql` — **PENDING,
  NOT APPLIED**.
- Static verification: TypeScript syntax **53/53 PASS**, local import
  resolution **53/53 PASS**, customer contract **103/103 PASS**, Jersey contract
  **18/18 PASS**, and production compatibility SQL **PASS read-only**.
- Full typecheck/lint/Vitest/build are pending because dependency installation
  was blocked by `EAI_AGAIN registry.npmjs.org` in the execution environment.
- Release status: **IMPLEMENTED LOCALLY; DATABASE/AUTH CONFIGURATION/RUNTIME
  AND FULL QUALITY GATES PENDING; NO-GO / NOT COMPLETE**.
- Commit, push, deploy: **NOT PERFORMED**.

---

## 21. Registered Customer Order Access — 10 August 2026

- Root cause: the three canonical order creators with the legacy guest
  anti-abuse rule count active unpaid orders by normalized WhatsApp number and
  reject the next checkout at two. A verified member was linked through
  `orders.customer_user_id` only after creation, so the account identity could
  not exempt member checkout from that guest restriction.
- Targeted correction: the checkout API now passes `customer_user_id` only for
  a verified signed-in customer. Forward migration
  `20260810100000_registered_customer_order_access_v1.sql` adds service-role-
  only member overloads, validates the real confirmed customer account and
  exact email, and bypasses only the legacy phone-count cap in that verified
  transaction context.
- Guest checkout and the existing per-phone guest cap are unchanged. Existing
  abuse/rate limiting, idempotency, stock, pricing, SKU, Custom/Jersey
  validation, activation, payment, and order-history linking remain intact.
- Database tables/schema/data: **UNCHANGED**. Local forward migration:
  **CREATED; NOT APPLIED LOCALLY OR REMOTELY; PENDING OWNER REVIEW**.
- Focused verification: **8 files / 89 tests PASS**. Standalone typecheck:
  **PASS**. Lint through prebuild: **0 errors / 37 existing warnings**. Direct
  Next production build: **PASS — 138 pages**.
- Scripted `npm run build`: **FAIL at prebuild** because the known unrelated
  CRLF-sensitive assertions remain: two Order Operations assertions and one
  Kaos Polos assertion. No task-owned test failed.
- Migration execution/database smoke/runtime multi-order E2E/deployment:
  **NOT RUN**. Package status: **IMPLEMENTED LOCALLY AND CODE-VERIFIED;
  MIGRATION/RUNTIME PENDING; NO-GO FOR PRODUCTION; NOT COMPLETE**.

## 22. Image Delivery Optimization — 12 August 2026

- `next.config.ts` now delivers raster image transforms as WebP, caches public
  image paths for one day with stale-while-revalidate, and keeps Supabase
  remote image support.
- `ResponsivePicture` and `SafeImage` use Next responsive transforms for local
  and Supabase imagery. `Logo.tsx` and `BrandIcon.tsx` remain native logo/SVG
  delivery and are explicitly excluded from conversion.
- External CMS hosts remain native-image fallbacks until allowlisted. No route,
  schema, transaction, or security behavior changed.
- Verification: image contract **2/2 PASS**, UI/media regression **14/14
  PASS**, typecheck **PASS**, target lint **0 errors**, direct Next build
  **PASS — 138 pages**. Scripted build remains blocked by three unrelated
  CRLF-sensitive tests before Next compilation.
- Status: **IMPLEMENTED LOCALLY; BUILD VERIFIED; NOT DEPLOYED; NOT COMPLETE**.

## 23. Owner-Unlocked UX/UI Rebuild — 13 August 2026

- Scope: canonical storefront presentation layer across the public shell,
  navigation, hero typography, product-card affordance, cart, checkout,
  responsive spacing, focus states, empty states, and panel surfaces.
- Root cause: public commerce screens had presentation rules distributed across
  legacy selectors, so hierarchy, control sizing, navigation emphasis, and
  responsive behavior were inconsistent even though the underlying commerce
  contracts were already present.
- Targeted fix: added a scoped canonical storefront layer and connected the
  homepage, `PublicShell`, cart, checkout, and product-card surfaces to it.
  Jersey-specific themes remain excluded. Product, pricing, inventory,
  customer identity, order, payment, route, API, RLS, and idempotency behavior
  were not changed.
- Database/migration: **NONE**. Guest checkout and registered-customer order
  access behavior remain unchanged by this UX package.
- Verification: focused UX/image suite **9 files / 39 tests PASS**;
  TypeScript **PASS**; changed-file ESLint **PASS (0 errors)**;
  `git diff --check` **PASS**. Full `pnpm test` still has two unrelated
  CRLF-sensitive Order Operations source-literal assertions. Direct Next build
  compiled and passed type/lint validation but did not complete page-data
  generation consistently (`/_not-found` and `/account/addresses` missing on
  one run; a clean rerun timed out).
- Runtime: dev server compiled locally, but the in-app browser could not reach
  localhost and returned `ERR_CONNECTION_REFUSED`; responsive browser/runtime
  evidence is therefore **NOT VERIFIED**.
- Status: **IMPLEMENTED LOCALLY; FOCUSED GATES PASS; FULL TEST/BUILD/RUNTIME
  GATES INCOMPLETE; NOT DEPLOYED; NO-GO / NOT COMPLETE**.

## 24. Public UI Foundation Normalization V1 — 13 August 2026

- Scope: system-wide public shell geometry, container gutters, section rhythm,
  product/editorial/campaign grid gaps, product image/body spacing, functional
  card radius/shadow, footer spacing, and loading/error state markers.
- Root cause: the public layer had a shared shell but still mixed 80–96px
  section rhythm, 12/16/24px grid gaps, route-local card geometry, and state
  screens outside the canonical UI marker.
- Targeted fix: added proposed canonical public tokens (1280px container,
  48/32/24/20/16px gutters, 64/56/48/40px rhythm, 20/16/12px grids,
  14/10px product image-to-body gap, restrained 2/8/4px radii), applied them
  through one scoped `.debroder-storefront` layer, and added shared grid hooks
  to catalog, collection, homepage, and product listing surfaces.
- Jersey remains a content/editorial exception, but its root now uses the
  light public canvas and canonical shell geometry; dark media/editorial blocks
  remain explicitly local. No product, pricing, inventory, auth, order,
  payment, API, route, RLS, schema, or migration behavior changed.
- Database/migration: **NONE**.
- Verification: normalization + existing public/image suite **10 files / 44
  tests PASS**; TypeScript **PASS**; changed-file ESLint **PASS (0 errors)**;
  `git diff --check` **PASS**.
- Full scripted test/build and browser runtime remain release gates from the
  previous handoff. Status: **IMPLEMENTED LOCALLY; FOCUSED GATES PASS; FULL
  RELEASE GATES INCOMPLETE; NOT DEPLOYED; NO-GO / NOT COMPLETE**.

## 2026-08-13 — Public UI normalization branch update

- Isolated implementation branch: `codex/public-ui-normalization-final`.
- Public UI normalization is implemented in local checkpoints from the clean
  `UI-konsisten` baseline; the final public product-grid consumer now uses the
  canonical `PublicProductCard` with its inquiry CTA preserved.
- Protected business, database, migration, dependency, environment, route,
  SEO, analytics, and test-hook contracts were not changed.
- Direct Next production build passes with 138/138 pages. Full repository test
  and wrapper build remain red only on the two pre-existing
  `order-operations-phase4-13` source assertions. Browser visual review is not
  available in this environment.
- State: **IMPLEMENTED LOCALLY; READY FOR OWNER VISUAL REVIEW; RELEASE
  NO-GO UNTIL BASELINE TESTS AND RUNTIME REVIEW ARE CLOSED**.

## Public UI normalization correction — 2026-08-13

- The missing product-mode architecture document is irrelevant to this UI
  package. Configured-product, Jersey configuration, custom project, commerce,
  pricing, inventory, cart, checkout, payment, order, auth, RLS, and database
  contracts remain frozen and unchanged.
- Residual public UI issues corrected: alternate-looking Jersey bars, Custom
  dark entry surface, About dark principles block, route-specific legal footer,
  and inconsistent Jersey catalog/form control geometry.
- Focused UI verification passed; direct production build passed. Full test
  remains blocked by the two known `order-operations-phase4-13` baseline
  assertions. Runtime visual review was not performed.
- Current status: **IMPLEMENTED LOCALLY; READY FOR OWNER VISUAL REVIEW;
  RELEASE NO-GO**.

## Checkout runtime recovery — 2026-08-14

- Root cause: checkout recovery persisted drafts after a definitive client
  rejection, then reused the key across a changed payload; the abuse ledger
  correctly returned `idempotency_payload_conflict`, while the recovery probe
  returned a handled no-order 404. Explicit 409 domain branches remain
  fail-closed.
- Targeted fix: recovery GET now returns `200 { found: false }` for an expected
  no-order probe; rejected drafts rotate before a new payload while unknown
  failures keep the same key. Submit locking, abuse guard, stock, pricing,
  RPC, activation, and payment/order integrity are unchanged.
- Database/migration/data changes: **NONE**. Runtime database checkout could
  not be completed locally because `.env.local` has no usable service-role key;
  the API correctly returned `503 CHECKOUT_UNAVAILABLE`.
- Focused checkout recovery: **21/21 PASS**; typecheck **PASS**; lint **0
  errors / 34 existing warnings**; direct Next build **PASS (138/138 pages)**;
  full test and wrapper build remain blocked by the two pre-existing
  `order-operations-phase4-13` assertions.
- State: **IMPLEMENTED LOCALLY; RUNTIME DATABASE VERIFICATION PENDING;
  NO-GO / NOT COMPLETE**.

## 10,000-line master completion audit — 2026-08-14

- Repository discovery, contract review, root-cause audit, regression pass, and
  production build completed without a repository rewrite or schema change.
- The two baseline Order Operations failures were proven newline-only test
  false negatives and corrected in the test reader; migration SQL was not
  changed.
- Full regression: **122 files / 931 tests PASS**. Typecheck: **PASS**. Lint:
  **0 errors / 34 existing warnings**. `pnpm build`: **PASS**; 138/138 pages
  generated. Runtime smoke: public home, catalog, cart, checkout, and account
  orders all returned HTTP 200 from the production server.
- Supabase-backed order creation remains unverified because the local service
  role credential is unavailable; checkout API correctly remains fail-closed.
- Release state: **CODE/TEST/BUILD STABLE; DATABASE E2E AND DEPLOYMENT
  VERIFICATION PENDING; NO-GO FOR PRODUCTION**.

## Custom capability copy contrast fix — 2026-08-15

- Corrected only the Custom capability section's text readability. The global
  public section-canvas rule had replaced its intended black background with
  white, producing white-on-white copy; the overline was also only 50% white.
- The section now opts out locally with `keep-section-bg`, uses `text-white/75`
  for “Satu alur transaksi”, and explicitly uses `text-white` for the heading.
  No layout, route, data, transaction, or business behavior changed.
- Verification: full **122 test files / 932 tests PASS**, typecheck PASS, lint
  PASS with 34 pre-existing warnings, and `pnpm build` PASS (138/138 pages).
- State: **IMPLEMENTED LOCALLY; OWNER VISUAL REVIEW RECOMMENDED; PRODUCTION
  RELEASE GATE UNCHANGED**.
