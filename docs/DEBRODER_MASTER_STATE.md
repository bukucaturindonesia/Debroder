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
