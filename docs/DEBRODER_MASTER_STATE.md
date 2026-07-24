# DEBRODER Master State

Last updated: 14 July 2026

## Official implementation checkpoint

- Commerce Foundation V1 — Jersey Ready Stock P0: **IMPLEMENTED, VERIFIED** at source/database foundation level.
- Guest order tracking without customer login: **IMPLEMENTED, VERIFIED** at source/unit/database level; deployed browser verification remains pending.
- Application deployment containing the new routes/components: **NOT DEPLOYED** in this checkpoint.
- Existing Phase 12–14, CMS, PIM, Jersey Configurator, quotation, production, fulfillment, role, permission, and audit foundations remain preserved.
- Phase 15 / v1.3: **NOT STARTED**.

## Commerce architecture in use

- Products, categories, variants, SKU, size, price tiers, and physical stock continue to use the existing PIM tables.
- Public product detail remains universal at `/produk/[slug]`; no Jersey detail route or product store was duplicated.
- Public cart continues to use the root `CartProvider` and storage key `debroder-cart-v3`.
- Guest checkout writes to the existing `orders` and `order_items` domain; the existing Admin `/admin/orders` and `/admin/orders/[id]` read the same records.
- Payment continues to use `order_payments`, `payment_submission_links`, the private `payment-proofs` bucket, and the existing Admin verification/rejection UI.
- Fulfillment, job order, production, quotation, Configurator, role/permission, and audit implementations were reused rather than rebuilt.
- `stock_reservations` is an additive reservation layer over `product_variant_sizes`; physical inventory remains in the PIM.

## Route state

- `/jersey`, `/jersey/shop`, `/jersey/configurator`, and `/produk/[slug]`: retained.
- `/keranjang`: retained and now proceeds to internal `/checkout`.
- `/cart`: safe alias redirect to `/keranjang`.
- `/checkout`: guest ready-stock checkout implemented.
- `/api/checkout`: server-only checkout/order creation implemented.
- `/order-confirmation/[token]`: private-token order confirmation/tracking implemented.
- `/api/public/orders/[token]`: safe order read and total approval implemented.
- `/track-order`: guest lookup using order number plus matching WhatsApp.
- `/track-order/[order-number]`: guest detail using order number plus valid tracking token, with WhatsApp fallback.
- `/api/public/order-tracking`: server-side authorization, safe projection, masking, rate limiting, and suspicious-access audit.
- `/api/admin/orders/[id]/tracking-link`: permission-protected tracking-token rotation and manual WhatsApp template.
- `/payment/[token]` and `/api/public/payments/[token]`: existing payment route retained and tightened to V1 transfer rules.
- `/admin/orders/[id]`: extended with commerce operations; no second Admin order dashboard was created.

## Database state

- Supabase project: `DEBRODER APPAREL` (`lzennundwqqtyvvcnzbg`).
- Applied forward migrations:
  - `commerce_foundation_v1_p0`
  - `commerce_foundation_v1_p0_checkout_variable_correction`
  - `commerce_foundation_v1_p0_checkout_variable_normalization`
  - `commerce_foundation_v1_p0_whatsapp_digest_schema`
  - `commerce_foundation_v1_p0_sequence_rls_lock`
  - `commerce_foundation_v1_p0_ready_stock_fulfillment_bridge`
  - `commerce_foundation_v1_p0_notification_render_resilience`
- The foundation adds order checkout/token/WhatsApp/fulfillment fields, `stock_reservations`, `order_shipping_quotes`, atomic RPCs, storage restrictions, and the five-minute expiry cron.
- Applied `guest_order_tracking_security`: reuses `orders.public_access_token_hash`, adds a 90-day token expiry, rotation trigger, expiry index, and focused audit-rate-limit index. Existing four tokenized orders were backfilled; zero tokenized orders remain without expiry.
- RLS is enabled on the new tables. Anonymous/authenticated clients cannot execute checkout, total approval, or public payment submission RPCs directly; these run only through server routes using the service role.
- Admin commerce RPCs remain authenticated and enforce existing permission/role checks internally.
- Payment proofs remain private, signed-URL based, restricted to JPG/JPEG/PNG/PDF, and limited to 5 MB.
- Legacy order/payment/schema sequence tables were locked with RLS and direct anonymous/authenticated grants revoked.
- No reset, drop, production-data deletion, or destructive migration was performed.
- Existing Jersey CMS migrations `20260713143000` and `20260713223000` remain local/not applied; this commerce work did not replay them.

## Transaction and stock behavior

- Server validates active product, active variant/size, SKU, quantity, current PIM price/tier, and available stock.
- Client price is never accepted as the order price.
- One idempotency key resolves to one order; duplicate variant lines are rejected/merged.
- WhatsApp confirmation uses a hashed one-time code, maximum five attempts, 60-minute expiry, and Admin sender-number matching.
- Unverified orders do not reserve stock.
- Pickup reserves stock for 12 hours after verification; `pay_at_store` is available only for pickup.
- Shipping proceeds through `awaiting_shipping_quote` and versioned Admin shipping quote, then reserves for 24 hours only after customer total approval.
- Availability is physical stock minus active unexpired reservations. Row locks and atomic reservation writes prevent oversell/negative stock.
- Expiry cron releases reservations and writes status/audit history.
- Verified full payment consumes the existing reservation and physical PIM stock atomically.

## Payment behavior

- V1 customer link accepts bank transfer only.
- Upload alone produces `pending_verification`, never `paid`.
- Existing Admin approval, rejection reason, retry/upload ulang, partial payment/DP, settlement, overpayment accounting, adjustment, and Super Admin refund controls remain in use.
- New customer payment links default to 24 hours and three submissions to allow safe retry/upload ulang on the same order.
- Ready Stock creates records in the existing `fulfillments`/`fulfillment_items` domain without fake production Work Items. Shipping and handover are blocked until paid; pickup pay-at-store records/verifies payment and transitions to `picked_up` atomically.

## Quality state

- TypeScript: **PASS**.
- Lint: **PASS**, 0 errors / 23 pre-existing warnings outside this P0 implementation.
- Tests: **PASS**, 18 files / 115 tests, including valid/wrong/expired token, matching/wrong WhatsApp, missing/other order, and rate-limit contracts.
- Production build: **PASS**, including `/checkout`, `/api/checkout`, `/order-confirmation/[token]`, and `/api/public/orders/[token]`.
- Migration compilation: **PASS**.
- Remote transactional smoke: **PASS AND ROLLBACK** for idempotency, pickup verification/reservation, shipping quote/approval/reservation, oversell rejection, expiry, release, and non-negative stock.
- Ready Stock fulfillment/payment smoke: **PASS AND ROLLBACK** for direct order-item fulfillment, pickup lifecycle, atomic pay-at-store completion, single stock consumption, and completion status.
- Smoke records remaining: 0 orders, 0 items, 0 reservations, 0 quotes, 0 smoke products, 0 commerce smoke audit rows.
- RLS/function grants/private bucket/cron checks: **PASS**.
- Guest tracking migration preflight, remote apply, expiry trigger, audit insert, ACL, and rollback/no-residue smoke: **PASS**.

## Verification boundary and remaining gates

- The database foundation is remotely applied and verified; the application bundle is not deployed from this workspace.
- No real production order or payment was created. Remote currently has no Jersey Ready Stock product suitable for a non-rollback customer E2E test.
- Authenticated browser/UI verification with actual Owner/Admin accounts remains required after application deployment and a real Jersey product is published.
- Supabase advisors still report older repository-wide findings (for example `actor_directory` security-definer view, mutable search paths, legacy anonymous security-definer grants, and duplicate/permissive policies). The new commerce RPC grants were checked separately and are not anonymous.
- `MASTER PROMPT DEBRODER` was not present in the repository/workspace search. Work used the available FROZEN blueprints, governance, state/handoff/issue files, and official Owner Decisions V1.

## Frozen boundary

The FROZEN commerce/landing blueprints and official Owner Decisions remain authoritative. No blueprint was edited, no parallel commerce system was introduced, and v1.3/Phase 15 was not started.

## Kaos Polos visual state — 2026-07-14

- `/kaos-polos` final visual revision is **IMPLEMENTED, PARTIALLY VERIFIED**.
- Existing CMS hero and PIM product source remain authoritative. Universal `/produk/[slug]` and all Commerce Foundation flows remain unchanged.
- Source now provides compact filters, responsive 4/2-column grid, 4:5 product media, uniform linked cards, 8/4 initial batching by breakpoint, one-row See More increments, loading/error states, and the global closing CTA pattern.
- TypeScript, lint (0 errors), 118 tests, production build, and HTTP route smoke pass. Browser viewport/console verification remains the deployment QA gate.

## Reusable category commerce state — 2026-07-14

- Kaos Polos, Jaket & Hoodie, and Headwear use one reusable category page/catalog/loading/error architecture.
- Category-specific differences are configuration and data only: CMS hero key/copy/CTA/focal media, PIM products, matched type options, and closing copy.
- Commerce Foundation and universal product detail remain unchanged. No new database source, checkout, or category transaction flow exists.
- TypeScript, lint with zero errors, 119 tests, production build, and 200 HTTP smoke for all three category routes pass. Status: **IMPLEMENTED, PARTIALLY VERIFIED** pending deployed browser viewport and real PIM commerce smoke verification.

## Public UI foundation state — 2026-07-14

- A human-perspective visual audit was implemented only for global public typography, header/navigation, homepage hero and headings, and product-card presentation.
- Homepage hierarchy is more product-first and restrained; navigation exposes guest tracking, mobile links are grouped, hero actions have a clear priority, and homepage product cards use a single accessible detail target.
- No content source, section order, real imagery, CMS/PIM, product data, commerce, Admin, Supabase, migration, RLS, or database behavior changed.
- TypeScript, targeted lint, full lint with zero errors, 119 tests, production build, and HTTP smoke pass. Status: **IMPLEMENTED, PARTIALLY VERIFIED** pending deployment/browser matrix, console, hydration, and visual overflow inspection.

## Global public navigation state — 2026-07-14

- Global non-Jersey navigation uses a controlled, accessible `Koleksi` menu trigger and PIM-derived navigation facets. Collection color/status/curated links appear only when corresponding active public products exist.
- Shareable `/koleksi` query destinations render matching products through the existing PIM/product detail/cart architecture; no duplicate listing or product source was introduced.
- Non-Jersey public interaction feedback is monochrome. Jersey header, contextual navigation, filters, Configurator, commerce identity, and green interaction output are explicitly preserved.
- TypeScript, lint with zero errors, 124 tests, production build, route smoke, collection filter smoke, and protected Jersey route smoke pass. Status: **IMPLEMENTED, PARTIALLY VERIFIED** pending real browser keyboard/touch/viewport/console validation.

## Side cart tier-pricing state — 2026-07-14

- Side cart quantity updates now recompute the active PIM tier, effective unit price, item subtotal, and shared cart total from the newest quantity.
- Add-to-cart persists all active tiers plus base/variant adjustment in the existing variant snapshot; add/merge, plus/minus updates, cart page, localStorage rehydration, and checkout use the same cart state.
- Product-detail tier rules/UI and authoritative server-side checkout repricing are unchanged. No database or migration change was required.
- TypeScript, 136 tests, lint with zero errors, and production build pass. Status: **IMPLEMENTED, PARTIALLY VERIFIED** pending deployed browser-click verification.

## PIM Phase 4 Bulk Import state — 2026-07-16

- PIM Phase 4 Bulk Import Excel/CSV is **IMPLEMENTED** at source level as an additive subroute of the existing Unified Product Manager.
- The canonical PIM remains `products` → `product_variants` → `product_variant_sizes`, with Category, Color Master, and Size Master references loaded from existing tables. No second product or stock source was introduced.
- Phase 4 is create-only and Draft-only. Dry run is write-free; final commit revalidates the actor, file checksum, normalized payload, active masters, slug/SKU uniqueness, price, stock, and idempotency inside one service-role-only transaction RPC.
- Admin Guest is preview-only. Final import remains limited to the existing dependency-management roles and is denied server-side for all other roles.
- Additive migration `20260716143000_pim_phase_4_bulk_import_atomic.sql` is local only and has not been applied remotely. Production atomicity is therefore **REMOTE DATABASE VERIFICATION REQUIRED** and **OWNER DATABASE ACTION REQUIRED**.
- Order, checkout, reservation, inventory ledger, Commerce Security P0, Jersey, Public UI, CMS, manual Product Manager, and Variant Matrix contracts remain frozen and unchanged.
- Browser verification is **STATIC AUDIT ONLY** until the owner applies the migration and runs the controlled Preview checklist. Phase 5 is not started.

## PIM Phase 5 Bulk Edit & Actions state — 2026-07-17

- PIM Phase 5 Bulk Edit & Actions is **IMPLEMENTED** at source level as an additive subroute of the existing Unified Product Manager.
- Server-paginated Product Root, Color Variant, and Sellable SKU targets support explicit selection across pages and all-matching selection with exclusions. Limits are 250/500/1,000 targets respectively.
- Dry run is write-free and returns server-authoritative summary plus before/after rows. Final commit is restricted to Owner/Super Admin, binds actor/role/current-state to an expiring preview, revalidates the complete batch, and invokes one idempotent transaction RPC.
- Supported mutations are category/status/base-price for Product Root, status/price-adjustment for Color Variant, and `stock_quantity`/existing `stock` compatibility projection for Sellable SKU. Fractional percentage results, negative values, invalid Publish dependencies, unsafe variant deactivation, stale data, and Jersey category/output changes block the batch.
- SKU, slug, name, product key, master color/size, media, and permanent delete are not actions. Tags and variant archive are **NOT APPLICABLE** because the frozen canonical baseline provides neither a tag source nor variant archive lifecycle.
- Additive migration `20260717093000_pim_phase_5_bulk_edit_atomic.sql` is local only and has not been applied remotely. Production transaction, RLS/grant, rollback, idempotency, concurrency, and audit behavior remain **REMOTE DATABASE VERIFICATION REQUIRED** and **OWNER DATABASE ACTION REQUIRED**.
- Jersey, Public UI, CMS, order, checkout, payment, reservation, inventory ledger, production, fulfillment, Phase 1–4 manual flows, SKU, and slug contracts remain frozen and unchanged. Browser status is **STATIC AUDIT ONLY** pending owner Preview verification.

## Custom Order end-to-end revision — 2026-07-18

- Custom Hub keeps its CMS/PIM ownership and protected Jersey routing. The non-Jersey builder now uses canonical pricing components and prevents a method fee from duplicating print-size pricing.
- Custom shipping has an additive structured Indonesian address contract and immutable order snapshot. Owner-supplied canonical seed migrations now cover province, regency/city, district, village/kelurahan/desa adat, and postal-code data; remote runtime and Preview shipping verification remain required.
- Custom order review, immutable quotation versions, customer approval evidence, locked totals, automatic-payment gating, design versions, 12-stage Admin focus, final fulfillment verification, and restrained tracking refresh are implemented at source level.
- Local migration `20260718180000_custom_order_end_to_end_revision.sql` is pending owner application. No remote database, GitHub, Vercel, Jersey, PIM, or frozen Phase 7 action was performed.
- Status: **IMPLEMENTED, STATIC AUDIT ONLY / LOCAL ENVIRONMENT BLOCKED** because dependency installation failed before source gates could run.

### Region seed refinement — 2026-07-18

- Owner-supplied `kode-wilayah-indonesia-2025-dengan-kecamatan.zip` was structurally audited and converted into canonical migration `20260718181000_indonesia_regions_province_regency_district_seed.sql`.
- Coverage is 38 provinces, 514 regencies/cities (416 kabupaten and 98 kota), and 7,285 districts/kecamatan, with no duplicate code, malformed code, blank name, or orphan parent found by static audit.
- The migration upserts only into `public.indonesia_regions`, preserves existing RLS/grants, performs no deletion/deactivation, and must run after `20260718180000_custom_order_end_to_end_revision.sql`.
- Village/kelurahan/desa-adat and postal-code data is supplied separately by `20260718182000_indonesia_regions_village_postal_seed.sql`. It adds 83,762 canonical village-level rows and 10,632 distinct five-digit postal codes without changing the existing security boundary.
- No remote database, GitHub, Vercel, Jersey, PIM, or frozen Phase 7 action was performed.

### Custom Checkout structured-address hotfix — 2026-07-18

- Active route is `/checkout` through `app/checkout/page.tsx`.
- Root cause: canonical `components/checkout/CheckoutClient.tsx` remained legacy while structured address lived in duplicate `CheckoutClientV2.tsx` behind a `tsconfig` path override.
- Structured Custom shipping is consolidated into the canonical component; the duplicate and alias are removed.
- Pickup keeps contact data and does not require a shipping address. Switching fulfillment does not clear structured address state.
- Server hierarchy/postal validation and immutable `order_address_snapshots` remain canonical; `20260718182500_custom_checkout_address_snapshot_method.sql` adds the explicit shipping-method marker.
- Admin fulfillment reads and displays the same immutable snapshot.
- Status: **IMPLEMENTED / STATIC AUDIT ONLY; BROWSER AND REMOTE DATABASE VERIFICATION REQUIRED**.

## P5 Client Boundary Isolation state — 2026-07-24

- P5 is **IMPLEMENTED AND LOCALLY VERIFIED**. P4 presentation, mobile-first behavior, accessibility contracts, routes, pricing, cart persistence, checkout, and business behavior remain unchanged.
- The root layout is server-only and no longer mounts cart state globally. The existing cart provider is scoped to public storefront compositions; Admin, payment-token, and order-confirmation routes do not receive its client chunk.
- The public header now has a server wrapper. Its optional search modal/search index is a separate client module loaded only when opened.
- Public Supabase access and service-role access are split. Service-role environment access, admin clients, data-access modules, and server mutation modules have explicit `server-only` boundaries.
- Regression coverage rejects service-role names and server-only value imports from client modules, and verifies cart/provider and header/lazy-search boundaries.
- Verification: typecheck PASS; lint PASS with 0 errors and 35 pre-existing warnings; tests PASS (74 files / 579 tests); production build PASS (110/110 pages).
- Database/migration status: none created, applied, or required. Deployment: none. P6 has not started.

## P7A Pricing Parity state — 2026-07-24

- P7A executable parity is **PASS WITH TWO EXPLICIT P7B BLOCKERS**.
- Ready Stock revalidation now uses canonical `sales_mode`, `pricing_mode`, and
  `tier_scope`; quotation tiers return no numeric checkout price; transaction
  paths cannot fall back to sample products.
- Product pricing uses the sellable
  `product_variant_sizes.price_adjustment`; size-master presentation data is
  not added as a second transaction adjustment.
- TypeScript P7A fixtures pass 17/17. The same read-only SQL policy fixture ran
  against PostgreSQL 17.6 with 10 vectors and zero mismatch. The full suite is
  75 files / 596 tests; typecheck, lint with zero errors, and production build
  pass.
- No migration, remote mutation, historical snapshot rewrite, route/UI change,
  commit, push, merge, or deployment was performed.
- P7B still owns additive SQL enforcement for the 100-unit line limit,
  500-unit total limit, and Ready Stock minimum/quotation thresholds. P6 and
  P7B were not started in this work.

## P6 Cart v5 state — 2026-07-24

- P6 is **PASS** by owner `lanjut` confirmation; commit `684144b` is on the
  tracked remote branch.
- Active cart persistence is now a versioned `debroder-cart-v5` envelope using
  canonical `cart-line.v5` discriminants: `ready_stock`,
  `configured_product`, `custom_project`, and `legacy_unsupported`.
- Legacy v1–v4 storage is migrated deterministically. Transaction-critical
  fields are never guessed; incomplete data is preserved as
  `legacy_unsupported`, and legacy keys are not deleted.
- Ready Stock cart-open and pre-checkout paths use server revalidation.
  Revalidation failure preserves the last display snapshot, exposes warning
  and retry, and blocks checkout until a fresh valid result exists.
- Cart mutations, restore, revalidation API, and checkout parser share the
  50-line, 100-unit-per-line, and 500-total limits. Mixed checkout modes and
  unsupported legacy lines fail closed.
- Pricing formulas, historical snapshots, inventory authority, routes, and
  existing Ready Stock/Custom checkout commands were not changed.
- Verification: owner-confirmed full gate, commit, push, and Preview PASS.
- Database/migration: none was required for P6. Former blockers V12-034 and
  V12-035 are now closed by the separate P7B migration.

## P7B Policy & Database Alignment state — 2026-07-24

- P7B is **PASS** by owner `lanjut` confirmation.
- Migration `20260723193533_p7b_policy_database_alignment_v1.sql` is applied
  to `DEBRODER APPAREL` and present in remote migration history.
- Ready Stock database enforcement now matches canonical limits: 50 lines,
  100 units per line, and 500 units total.
- Active `product_minimum_rules.minimum_quantity` and
  `quotation_quantity` are evaluated against aggregate product quantity before
  a public checkout transaction can commit.
- One checkout mode is enforced by a deferred policy trigger. Existing
  server-authoritative pricing finalization remains the pricing formula owner.
- Finalized Ready Stock pricing snapshots and amounts are immutable; existing
  historical rows were not rewritten.
- Three P7B trigger functions use `security definer`, empty search path,
  revoked public/anon/authenticated execution, and service-role-only execute.
  No RLS policy or inventory authority was changed.
- Typecheck, touched-file lint, and 42 targeted tests pass. Owner full gate is
  confirmed PASS together with commit, push, and Preview.

## P8A Size Adjustment Policy Preview state — 2026-07-24

- P8A is **PASS**.
- Canonical transaction authority is
  `product_variant_sizes.price_adjustment`; `product_size_master` is the
  identity authority and has no price field.
- The deterministic global policy is S–XL Rp0, 2XL +Rp10,000,
  3XL +Rp20,000, and 4XL +Rp30,000. XXL/XXXL/XXXXL are normalized only as
  aliases; no product, slug, or SKU is hardcoded.
- Exact live read-only preview: 1,173 SKU; 860 aligned; 287 pending change;
  25 XS out of policy; one missing size-master link blocked; zero normalized
  duplicate; zero proven explicit override.
- All 287 affected rows currently have Rp0 adjustment: 190 2XL, 76 3XL, and
  21 4XL. Of these, 45 belong to active products and 242 to draft products.
- Typecheck, touched-file lint, 15 targeted tests, and exact remote read-only
  preview pass. Full owner gate also passes: 78 files / 626 tests, lint with
  zero errors, production build 110/110, and clean git gate.

## P8B Size Adjustment Data Mutation state — 2026-07-24

- P8B is **PASS** by owner gate confirmation.
- Owner `Lanjut` approved the exact P8A 287-row fingerprint
  `c8de001d6a246fe4465873326b7ad634`.
- Migration `20260724011535_p8b_size_adjustment_data_mutation_v1.sql` is
  applied remotely after an exact rollback preview.
- Final canonical adjustments are Rp0 for S–XL, Rp10,000 for 190 2XL SKU,
  Rp20,000 for 76 3XL SKU, and Rp30,000 for 21 4XL SKU.
- Postcheck proves 1,147 managed SKU with zero mismatch and 287 audit rows in
  one batch with the approved fingerprint.
- 25 XS and one unlinked `Mix Size` were not mutated. Historical order and
  pricing snapshots, inventory, product/color pricing, UI, routes, pricing
  formula, permanent schema, and RLS remain unchanged.
- Typecheck, touched lint, and 37 targeted tests pass; no P8B-specific advisor
  finding exists. Owner confirmed full gates, diff review, commit `1d4db25`,
  push, and Vercel Preview Ready.

## P9 Generic Configured Product state — 2026-07-24

- P9 is **IMPLEMENTED IN SOURCE — AWAITING OWNER GATE VERIFICATION**.
- Generic configured-product authority now projects from the existing
  `products.config_schema` slot while product identity, active status,
  commerce mode, minimum quantity, and source version remain owned by
  canonical product columns.
- Definition and draft validation cover all five option input types,
  compatibility rules, allocation totals/dimensions, services, uploads,
  quantity limits, definition versions, and duplicate/unknown identifiers.
- Server-only runtime creates amount-free pricing input, deterministic SHA-256
  fingerprints, validates pricing-authority output, and captures immutable
  priced or quotation-required snapshots.
- Cart v5 rejects configured lines lacking server fingerprint or matching
  pricing/quotation evidence. Existing configured checkout remains inactive;
  the first specialized consumer is reserved for P10.
- Live audit found one draft specialized product, zero active generic
  definition, zero saved configuration rows, 14 historical configured order
  items, and 53 non-empty historical config snapshots. No existing row was
  modified.
- No database migration, backfill, schema/RLS change, route/UI change, pricing
  formula change, inventory change, commit, push, merge, or deployment was
  performed.
- Typecheck, touched lint, targeted P9/Cart/contract tests, and diff check pass.

## P12 Admin Orders Ownership state — 2026-07-24

- P11 is **PASS** according to the owner gate; baseline P12 HEAD was
  `571dffc2050d5d992c6f5196ddd5004189a25d74` on the expected branch with a
  clean working tree.
- P12 is **IMPLEMENTED IN SOURCE — AWAITING OWNER GATE VERIFICATION**.
- Admin Orders list and detail now read through authenticated server APIs,
  page-owned use cases, `server-only` data access, and explicit typed read
  models instead of direct browser table queries.
- One detail graph projects the order, historical item/source/pricing
  snapshots, latest payment, job order, QC, fulfillment, and tracking data;
  canonical active-stage resolution now runs on the server projection.
- Delivery edit, transactional cancellation, and archive commands require
  `order.edit` on the server. Read APIs require `order.read`, use the actor JWT
  client, preserve granular domain RLS, and return only whitelisted fields.
- Live audit: 44 orders, 53 items, 22 payments, 17 fulfillments, 0 job orders,
  and 0 QC records. All involved tables have RLS. Canonical child relations
  each have one unambiguous foreign key.
- No migration, schema/RLS change, database mutation, historical rewrite,
  pricing formula change, inventory change, commit, push, or deployment was
  performed.
- Verification: typecheck PASS; touched lint PASS; targeted suite PASS
  (8 files / 69 tests); production build PASS (110/110 pages);
  `git diff --check` PASS. Existing repository lint warnings remain unchanged.
