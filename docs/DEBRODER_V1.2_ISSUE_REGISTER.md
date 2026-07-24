# DEBRODER v1.2 Issue Register

## Open

### V12-028 — Apply and verify PIM Phase 5 Bulk Edit transaction

- Severity: Gate
- Status: OPEN / SOURCE IMPLEMENTED
- Detail: Bulk Edit & Actions source implements server-paginated selection, all-matching exclusions, write-free dry run, before/after preview, Admin Guest preview-only behavior, strict action/limit guards, preview expiry/current-state binding, and an additive atomic/idempotent/audited RPC migration. Migration `20260717093000_pim_phase_5_bulk_edit_atomic.sql` has not been applied remotely. Owner must apply pending Phase 4 first, review/apply Phase 5, then verify service-role-only ACL/RLS, batch rollback/no-partial-write, idempotent replay, concurrent-change rejection, Publish/variant/Jersey guards, audit history, and unchanged manual Product Manager/Variant Matrix/order/checkout/reservation behavior through a controlled Preview deployment.

### V12-027 — Apply and verify PIM Phase 4 Bulk Import transaction

- Severity: Gate
- Status: OPEN / SOURCE IMPLEMENTED
- Detail: Bulk Import XLSX/CSV source, templates, dry run, row errors, create-only Draft behavior, permission guard, and additive atomic/idempotency migration are implemented. Migration `20260716143000_pim_phase_4_bulk_import_atomic.sql` has not been applied remotely. Owner must review/apply it, then verify service-role-only ACL/RLS, all-or-nothing rollback, retry/double-submit replay, Draft output, and unchanged manual Product Manager/Variant Matrix/order/checkout/reservation behavior through a controlled Preview deployment.

### V12-025 — Deploy and browser-verify reusable category commerce layout

- Severity: QA gate
- Status: OPEN / PARTIALLY VERIFIED
- Detail: `/kaos-polos`, `/jaket-hoodie`, and `/headwear` now reuse one category commerce layout, compact filter system, linked PIM card, 4/2-column grid, 4:5 media, responsive batching, loading/error state, and closing bar. After deployment, verify all three routes at 1600/1440/1280/1024/768/430/390/360, actual filter availability, See More, console/hydration/overflow, universal detail navigation, variant selection, Add to Cart, and Guest Checkout smoke.

### V12-024 — Deploy and visually verify Kaos Polos final revision

- Severity: QA gate
- Status: OPEN / PARTIALLY VERIFIED
- Detail: `/kaos-polos` hero CTA mapping/position, compact filters, 4/2-column grid, 4:5 cards, responsive 8+4 / 4+2 batching, safe loading/error states, and closing bar are implemented. TypeScript, lint with zero errors, 118 tests, production build, and local HTTP route smoke pass. A browser executable was unavailable in this workspace; after deployment, verify the requested viewport matrix (1600/1440/1280/1024/768/430/390/360), filter/sort/reset/See More interactions, click targets, console/hydration state, horizontal overflow, and Add to Cart/Guest Checkout smoke through the unchanged universal detail flow.

### V12-023 — Deploy and browser-verify guest order tracking

- Severity: Gate
- Status: OPEN / PARTIALLY VERIFIED
- Detail: Guest tracking source, server authorization, masking, five-attempt rate limit, audit logging, Admin token rotation/WhatsApp template, 115-test suite, production build, and remote migration/ACL/rollback smoke pass. Local runtime browser smoke is blocked by the workspace Node `uv_interface_addresses` failure. After deploying the updated application, verify a valid token, expired/rotated token, matching/wrong WhatsApp, 429 behavior, mobile layout, copy link, and Admin WhatsApp template against controlled orders.

### V12-013 — Owner deployment/UI verification

- Severity: Gate
- Status: OPEN
- Detail: Phase 12 source, remote database alignment, transaction smoke test, typecheck, lint, tests, and production build verification pass. Owner still needs to verify the deployed UI using Admin, Sales Admin, and Super Admin accounts.

### V12-014 — External notification providers

- Severity: Deferred
- Status: DEFERRED BY PHASE 12 SCOPE
- Detail: Email, WhatsApp, SMS, and push templates may exist, but provider delivery remains `not_configured` until credentials and provider workers are explicitly approved.

### V12-017 — Activate Jersey CMS schema and production media

- Severity: Gate
- Status: OPEN
- Detail: The final owner-approved Jersey experience is implemented: simplified title/`Jelajahi` cards, divider-free black composition, hover/focus-only contextual underline, legacy Paket Tim removal, borderless seven-step Cara Order, and route loading/error states. Local typecheck, lint, 95-test suite, production build, internal CTA checks, and the prior editorial browser verification pass at 1600/1440/1280/1024/768/430/390/360 px. Migrations `20260713143000_commerce_jersey_experience.sql` and `20260713223000_jersey_owner_approved_experience_addendum.sql` have not been applied. After owner approval, apply both migrations in order, publish real DEBRODER desktop/mobile campaign photography and focal points through `/admin/commerce/jersey`, then repeat authenticated production QA. The supplied source archive contains local brand artwork but no Jersey campaign photography.

### V12-019 — Browser matrix for new Jersey commerce shell

- Severity: Gate
- Status: OPEN
- Detail: Typecheck, lint (0 errors), 13 Jersey tests, full 95-test suite, build, and HTTP route smoke pass. The new white `/jersey/shop` shell and Jersey universal detail styling could not be visually/console tested because no browser binary was available and the sandbox blocked Playwright Chromium download. Repeat keyboard, console, broken-image, overflow, sidebar resize, drawer, filter Back/Forward, and viewport checks at 1600/1440/1280/1024/768/430/390/360 px in a browser-enabled environment.

### V12-020 — Deploy and execute real Commerce P0 browser E2E

- Severity: Gate
- Status: OPEN / PARTIALLY VERIFIED
- Detail: Commerce P0 source, migrations, typecheck, lint, 100-test suite, production build, ACL/RLS/storage/cron checks, and remote rollback smoke are verified. Application source is not deployed and remote has no suitable published Jersey Ready Stock variant for a non-rollback test. After deployment, publish one real PIM item and run authenticated pickup, shipping quote/approval, payment upload/approval/rejection/retry, fulfillment, token isolation, console, and responsive regression checks.

### V12-021 — Pre-existing Supabase advisor hardening backlog

- Severity: Security backlog
- Status: OPEN
- Detail: Post-migration advisor still reports older repository-wide findings including the `actor_directory` security-definer view, mutable function search paths, legacy anonymous security-definer grants, and duplicate/multiple permissive policies. P0 directly locked order/payment/schema sequence tables and verified that new sensitive commerce RPCs are not executable by `anon`. Broader remediation needs a separately scoped non-destructive security pass.

### V12-022 — MASTER PROMPT DEBRODER unavailable

- Severity: Documentation
- Status: OPEN
- Detail: Repository/workspace search did not find `MASTER PROMPT DEBRODER`. Commerce work used `AGENTS.md`, available FROZEN blueprints, master state, current handoff, issue register, and official Commerce Owner Decisions V1. Add the missing official source to repository governance if it is still required for future phases.

### V12-024 — Browser matrix for public premium UI foundation

- Severity: UI verification gate
- Status: OPEN / PARTIALLY VERIFIED
- Detail: Scoped public typography, header/navigation, homepage hero/headings, and product-card presentation pass TypeScript, targeted and full lint with zero errors, 119 tests, production build, and local HTTP route smoke. The workspace has the Playwright package but no Chromium binary, so repeat visual, keyboard, console, hydration, reduced-motion, and horizontal-overflow checks at 360, 390, 430, 768, 1024, 1280, 1440, and 1600 px after deployment.

### V12-025 — Browser verification for global Collection navigation

- Severity: UI verification gate
- Status: OPEN / PARTIALLY VERIFIED
- Detail: Semantic Collection toggle, Escape/outside close behavior, dynamic PIM color facets, shareable collection filters, monochrome public interactions, protected Jersey variant, TypeScript, 124 tests, lint with zero errors, production build, and HTTP destination smoke pass. A browser binary is unavailable in this workspace; after deployment, verify pointer hover, keyboard Tab/Enter/Space/Escape, outside click, mobile accordion/touch, focus visibility, no sticky pressed state, console/hydration, and overflow at 1600/1440/1280/1024/768/430/390/360 px. Reconfirm Jersey visual parity during that browser pass.

### V12-026 — Browser verification for side cart tier transitions

- Severity: Commerce QA gate
- Status: OPEN / PARTIALLY VERIFIED
- Detail: The stale side-cart unit-price root cause is fixed in the existing cart provider. Deterministic tests verify 10→11, 11→12, 12→13, 13→15, 15→11, 23→24, 24→23, item subtotal, variant adjustment, and localStorage serialization; TypeScript, 136 tests, lint with zero errors, and production build pass. After deployment, click the same transitions in the side drawer and confirm the cart page, checkout summary, refresh/rehydration, and server-repriced order summary against a real PIM product. Legacy localStorage items created before the complete tier snapshot should be removed and re-added once for this verification.

## Closed in Phase 12

- V12-010 — Local dependency-based quality gates were previously blocked. Dependencies were installed for verification; typecheck, lint, test, and build now run successfully.
- V12-012 — Phase 11 deployment verification was treated as completed per owner instruction that Phase 11 is finished.
- V12-015 — Phase 12 database/source uncertainty. Resolved by checking remote migration history and live notification tables/RPCs before coding; no migration was reapplied.
- V12-016 — Existing Phase 10 static contract expected `Upload Bukti QC`. Restored the label without changing Phase 10 workflow.

## Closed in Commerce Foundation V1 P0

- V12-018 — Official public checkout/order creation gap. Resolved by reusing the root cart, PIM, existing order/order-item domain, payment domain, and Admin order detail; `/checkout`, server-side repricing/stock validation, idempotency, private order tokens, reservations, manual shipping quote, and same-order payment flow are implemented. Remote rollback smoke passed and left zero records. Operational browser E2E moved to V12-020.
- Side cart stale tier price — Resolved by persisting the complete pricing snapshot and repricing through the existing cart normalization path on quantity update, merge, and rehydration. Product-detail pricing and checkout authority were preserved.

### V12-027 — Custom Order Preview data and runtime verification

- Severity: Gate
- Status: OPEN / SOURCE IMPLEMENTED
- Detail: Custom structured shipping now has owner-supplied canonical source migrations through village/kelurahan/desa-adat and postal code. The additive migrations, hierarchy validation, immutable address snapshot, quotation/approval proof, locked-total gate, and final-verification guard remain source-audited only. Apply pending migration(s) in controlled Preview, then test pickup and shipping end-to-end without altering preserved records.

### V12-028 — Local dependency runner unavailable

- Severity: Environment gate
- Status: OPEN / ENVIRONMENT BLOCKED
- Detail: The single allowed `pnpm install --frozen-lockfile` attempt failed before dependency resolution because the runner could not create `/root/.local` (ENOENT). TypeScript, lint, targeted tests, full tests, and build were therefore not runnable locally; no retry or environment workaround was attempted under the Master Override.

### V12-029 — Indonesian region hierarchy source is complete through village and postal code

- Severity: Preview data gate
- Status: OPEN / COMPLETE REGION SOURCE IMPLEMENTED
- Detail: The owner-supplied canonical migrations represent 38 provinces, 514 regencies/cities, 7,285 districts/kecamatan, 83,762 village/kelurahan/desa-adat rows, and 10,632 distinct postal codes. Remote application and controlled Preview queries remain required before the catalog can be declared operationally verified.

### V12-030 — Active Custom checkout structured-address wiring

- Severity: Preview interaction gate
- Status: OPEN / SOURCE FIXED
- Detail: The active `/checkout` route imported the canonical CheckoutClient, but that canonical file remained legacy while structured UI was hidden in duplicate `CheckoutClientV2` behind a path alias. The structured implementation is canonical and the duplicate/alias are removed. Admin fulfillment reads the same immutable snapshot, and the additive snapshot refinement records the shipping method. Browser verification must confirm selectors, confirmation gating, pickup behavior, state preservation, mobile layout, server rejection of fake hierarchy, and snapshot output.


### V12-031 — Admin guided workflow and human-readable customer journey

- Severity: P0 usability / operational integrity
- Status: SOURCE FIXED / PREVIEW VERIFICATION REQUIRED
- Detail: Admin sebelumnya dapat melihat aksi kontradiktif atau tidak mengetahui langkah berikutnya, sementara pelanggan sudah menampilkan tahap yang lebih maju. Source terbaru memakai canonical stage pada satu guided cockpit, satu primary action, ordered journey, terminal-action suppression, Task Inbox deep-link, dan full customer journey sejak checkout. Verify every Ready Stock/Custom transition in Preview and confirm the stale action disappears after mutation.

### V12-032 — Admin responsive clipping and zoom-out dependency

- Severity: P0 usability
- Status: SOURCE FIXED / BROWSER MATRIX REQUIRED
- Detail: Beberapa halaman Admin memotong teks/kolom pada desktop dan mobile sampai browser harus di-zoom out. Global Admin shell, header action composition, min-width/wrapping, media/form constraints, and local table scrolling are revised. Verify at 360, 390, 430, 768, 1024, 1280, 1440, and 1600 px with long order numbers, customer names, task titles, and payment descriptions.

### V12-033 — Ready Stock internal fulfillment number requires automatic handoff

- Severity: P0 workflow
- Status: SOURCE IMPLEMENTED / DATABASE PREVIEW REQUIRED
- Detail: Admin should never create a DEBRODER internal shipment document manually. Migration `20260720030000_human_centered_order_experience_p0.sql` creates it automatically and idempotently when Ready Stock prerequisites are met, excludes Custom/terminal/active-cancellation orders, and preserves courier AWB as a separate field. Apply after Phase 4–13 in Preview and verify idempotency, permissions, backfill, cancellation blocking, and no Custom false positives before production.

## Closed in P5 Client Boundary Isolation

- Global cart-provider leakage — **CLOSED**. `CartProvider` is no longer mounted by the root layout and is limited to storefront compositions. Production manifest inspection confirms its chunk is absent from Admin, payment-token, and order-confirmation routes.
- Header search eager loading — **CLOSED**. The optional search modal and static search index are emitted as a separate lazy client chunk.
- Service-role/client import ambiguity — **CLOSED**. Public and admin Supabase factories and environment readers are separated, sensitive modules use `server-only`, and regression tests reject forbidden client value imports and secret-key names.
- P5 verification — **CLOSED**. Typecheck, lint, 579 tests, and production build pass; no database migration or remote mutation was needed.

## P7A Pricing Parity

### V12-034 — Ready Stock SQL limit parity

- Severity: Transaction integrity gate
- Status: **CLOSED IN P7B**
- Detail: OD-07 and TypeScript enforce 50 lines, 100 units per line, and 500
  units total. The former live gap was closed by additive migration
  `20260723193533_p7b_policy_database_alignment_v1.sql`; an immediate database
  trigger now enforces all three limits without editing the previously applied
  checkout migration.

### V12-035 — Ready Stock minimum/quotation SQL parity

- Severity: Pricing integrity gate
- Status: **CLOSED IN P7B**
- Detail: A deferred transaction policy trigger now reads active
  `product_minimum_rules` and blocks quantities below `minimum_quantity` or at
  and above `quotation_quantity`. Live data still has zero active rules; no
  product or historical order row was mutated.

## Closed in P7A Pricing Parity

- Size-adjustment authority mismatch — **CLOSED**. Transaction pricing now uses
  only the sellable variant-size adjustment, matching canonical SQL.
- Ready Stock `tier_scope` mismatch — **CLOSED**. Revalidation loads and applies
  the canonical scope.
- Quotation-tier numeric fallback — **CLOSED**. Revalidation returns
  `quotation_required` with no unit price.
- Transaction sample fallback — **CLOSED**. Revalidation and quotation-draft
  data loading fail closed when canonical Supabase data is unavailable.
- P7A verification — **CLOSED**. TypeScript parity 17/17, related suite 63/63,
  remote read-only SQL fixture 10/10 with zero mismatch, typecheck, lint
  (0 errors), full 596-test suite, and production build pass. No database
  mutation or migration was performed.

## P6 Cart v5

### V12-036 — P6 owner full-gate verification

- Severity: Package gate
- Status: **CLOSED — OWNER GATE PASS**
- Detail: Canonical Cart v5, deterministic legacy migration, discriminated
  lines, limits, stale/retry revalidation behavior, and fail-closed one-mode
  checkout passed the owner full gate. Commit `684144b` is present locally and
  on the tracked remote branch.

## Closed in P6 Cart v5

- Plain-array cart persistence — **CLOSED IN SOURCE**. Active persistence now
  writes an explicit v5 envelope while retaining deterministic readers for
  legacy keys.
- Unsafe legacy conversion — **CLOSED IN SOURCE**. Missing transaction-critical
  identity/snapshot data is preserved as `legacy_unsupported`, never guessed.
- Client-only cart validity — **CLOSED IN SOURCE**. Ready Stock revalidation is
  server-authoritative; stale display remains visible, retry is explicit, and
  checkout fails closed.
- Cart limit/mode drift — **CLOSED IN SOURCE**. Shared 50/100/500 constants and
  one checkout mode are enforced in cart mutations, restore/revalidation, and
  checkout parsing. Database enforcement is now closed by V12-034/V12-035.

## P7B Policy & Database Alignment

### V12-037 — P7B owner full-gate verification

- Severity: Package gate
- Status: **CLOSED — OWNER GATE PASS**
- Detail: Migration
  `20260723193533_p7b_policy_database_alignment_v1.sql` is applied remotely;
  three triggers, ACL, empty search paths, migration history, and audit marker
  are verified. Typecheck, touched-file lint, and 42 targeted tests pass.
  Owner `lanjut` confirms the full typecheck/lint/test/build/diff,
  commit/push, and Preview gate passed.

## Closed in P7B Policy & Database Alignment

- V12-034 limit parity — **CLOSED**. Database triggers enforce 50 lines,
  100 units per Ready Stock line, and 500 total units.
- V12-035 minimum/quotation parity — **CLOSED**. A deferred database policy
  trigger evaluates active minimum and quotation thresholds per aggregate
  product quantity.
- Checkout mode — **CLOSED**. Ready Stock and Custom cannot commit in one
  public checkout transaction.
- Historical pricing snapshot mutation — **CLOSED**. Finalized public Ready
  Stock pricing snapshots and amounts are guarded as immutable.

## P8A Size Adjustment Policy Preview

### V12-038 — P8A owner full-gate and row approval

- Severity: Package gate
- Status: **CLOSED — OWNER GATE AND ROW APPROVAL PASS**
- Detail: Deterministic TypeScript and read-only Supabase preview agree on
  1,173 SKU: 860 aligned, 287 pending change, 25 out of policy, one blocked,
  zero normalized duplicate, and zero proven override. Targeted tests,
  TypeScript, lint, exact remote preview, 626-test full suite, production
  build, and git gates pass. Owner `Lanjut` approved the exact 287-row
  fingerprint for P8B.

### V12-039 — Unlinked Mix Size SKU

- Severity: Data integrity / explicit P8A exclusion
- Status: **OPEN — BLOCKED FROM P8B**
- Detail: One draft `Mix Size` sellable SKU has `size_id = NULL`. Its
  transaction adjustment remains Rp0, but it cannot be mapped safely to the
  S–4XL policy and is excluded from automatic mutation. Repair or an explicit
  owner decision requires a separately proven canonical size relationship;
  P8A does not guess it.

## Closed in P8A Size Adjustment Policy Preview

- Size authority ambiguity — **CLOSED**. Live schema proves
  `product_variant_sizes.price_adjustment` is transaction authority and
  `product_size_master` has no price column.
- Duplicate risk — **CLOSED FOR CURRENT DATA**. Exact and normalized
  variant-size/SKU checks return zero duplicate rows.
- Override classification — **CLOSED FOR CURRENT DATA**. No matching price
  audit event with a non-empty reason exists; override status is NOT PROVEN,
  never inferred from a mismatch.
- P8A mutation risk — **CLOSED**. The SQL artifact contains no DML/DDL and the
  remote verification performed no product mutation or migration.

## P8B Size Adjustment Data Mutation

### V12-040 — P8B owner full-gate verification

- Severity: Package gate
- Status: **OPEN — SOURCE AND REMOTE MUTATION VERIFIED**
- Detail: Migration `20260724011535_p8b_size_adjustment_data_mutation_v1.sql`
  applied the exact approved 287-row cohort. Postcheck proves 1,147 managed
  SKU with zero mismatch, 287 audit rows in one batch, and the approved
  fingerprint. Typecheck, touched lint, and 37 targeted tests pass. Owner full
  typecheck/lint/test/build/diff gate remains required before P8B PASS.

## Closed in P8B Size Adjustment Data Mutation

- Approved cohort drift — **CLOSED**. Migration aborts on changed count,
  fingerprint, before value, status split, normalized duplicate, missing SKU,
  or new override evidence.
- Partial mutation/audit — **CLOSED**. Audit and update occur in one
  transaction and each must affect exactly 287 rows.
- Policy-managed mismatch — **CLOSED**. Remote postcheck returns zero mismatch
  across 1,147 managed SKU.
- P8A exclusions — **PRESERVED**. XS remains outside policy and unlinked
  `Mix Size` remains Rp0/blocked; V12-039 stays open for separate canonical
  data resolution.
