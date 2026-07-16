# Current Phase Handoff — Commerce Foundation V1 P0

Date: 14 July 2026
Status: **IMPLEMENTED, VERIFIED** (source + remote database foundation); application **NOT DEPLOYED**

## Guest order tracking increment — 14 July 2026

- Reused the existing checkout/order access token and `orders.public_access_token_hash`; no second order or tracking datastore was created.
- Added `/track-order`, `/track-order/[order-number]`, `/api/public/order-tracking`, and the Admin token-rotation route.
- New checkout tokens are derived server-side with HMAC from the idempotency key and a server-only secret, preserving deterministic retry without storing plaintext.
- Access requires order number plus valid unexpired token, or order number plus normalized matching WhatsApp. Order number alone is rejected.
- Public responses expose only customer-safe order/item/payment/shipping/fulfillment fields. Phone and address are masked; payment proofs, Admin notes, audit history, and other customer records are excluded.
- Failed lookups are fingerprinted without storing raw IP, limited to five failures per 15 minutes, and written to the existing append-only audit domain. Rate-limit infrastructure fails closed.
- Order Confirmation now shows and copies the secure tracking link. Existing Admin order detail can rotate the link and copy/open a manual WhatsApp template; old tokens become invalid immediately.
- Applied remote migration `guest_order_tracking_security`: 90-day expiry, backfill, expiry trigger/constraint/index, and focused audit lookup index. Anonymous/authenticated direct trigger-function execution is revoked.
- Verification: TypeScript PASS; lint PASS with 0 errors / 23 pre-existing warnings; 18 files / 115 tests PASS; production build PASS; migration preflight/remote apply/rollback smoke PASS with zero residue.
- Runtime browser smoke could not start locally because the environment's Node runtime failed at `uv_interface_addresses`. The production build generated both tracking pages and both new API routes; deployed browser verification remains required.

## 1. Arsitektur yang ditemukan

DEBRODER sudah memiliki CMS, PIM, universal product detail, root cart provider, order/order item, payment tracking, private payment proofs, quotation, Jersey Configurator, production, fulfillment, Panel Admin, roles, permissions, RLS, dan audit log. Gap utama adalah cart publik berhenti di WhatsApp dan `/checkout` belum ada. Implementasi P0 menyambungkan domain-domain tersebut tanpa membuat sistem kedua.

## 2. Bagian yang digunakan kembali

- PIM `products` → `product_variants` → `product_variant_sizes` dan price tiers.
- `/jersey/shop`, `/produk/[slug]`, `TieredProductPurchasePanel`, dan `CartProvider`.
- `orders`, `order_items`, nomor order, status/payment history, dan Admin Order Management.
- `order_payments`, `payment_submission_links`, Admin payment verification/rejection, signed URL, dan bucket `payment-proofs`.
- Existing Configurator, quotation, job order, production, QC, fulfillment, role/permission, dan audit foundations.

## 3. Bagian yang diperbaiki

- Cart/Buy Now sekarang memakai navigasi internal menuju `/checkout`.
- Cart menggabungkan variant-size yang sama, menyimpan stock availability, dan membatasi quantity client-side; server tetap menjadi otoritas.
- Payment public dibatasi ke transfer bank serta JPG/JPEG/PNG/PDF maksimal 5 MB.
- Payment link default menjadi 24 jam / tiga submission agar retry dan upload ulang tetap pada order yang sama.
- Sequence tables commerce dikunci dengan RLS dan direct client grants dicabut.

## 4. Bagian baru yang benar-benar diperlukan

- Guest checkout page/API.
- Private-token order confirmation/API.
- Commerce operations section pada detail order Admin yang sudah ada.
- `stock_reservations` dan `order_shipping_quotes` sebagai lapisan koreksi minimal pada domain existing.
- Atomic checkout, verification, quote, approval, reservation, expiry, and stock-consumption RPCs.
- Satu contract test P0 dan forward correction migrations untuk dua error runtime yang ditemukan smoke test.

## 5. File yang berubah

Lihat `git status --short` untuk seluruh file tracked dan baru. Kelompok utama:

- Public flow: `app/checkout`, `app/order-confirmation`, `app/api/checkout`, `app/api/public/orders`, `app/cart`, `components/checkout`.
- Reuse/extension: `components/CartProvider.tsx`, `components/TieredProductPurchasePanel.tsx`, `components/admin/OrderDetailAdmin.tsx`, payment components/routes.
- Admin: `components/admin/CommerceOrderOperations.tsx`.
- Domain/test: `lib/commerce-checkout.ts`, `test/commerce-foundation-p0.test.ts`.
- Database: seven `20260714*commerce_foundation*` migrations.
- Governance: this handoff, master state, and issue register.

## 6. Route yang berubah

- Added: `/checkout`, `/api/checkout`, `/order-confirmation/[token]`, `/api/public/orders/[token]`, `/cart` alias.
- Extended: `/keranjang`, `/produk/[slug]` Buy Now behavior, `/payment/[token]`, `/api/public/payments/[token]`, `/admin/orders/[id]`.
- Preserved: `/jersey`, `/jersey/shop`, `/jersey/configurator`, universal product detail, existing Admin/payment/fulfillment routes.

## 7. Database/migration

Seven forward migrations are applied remotely. The primary migration is additive. Runtime smoke exposed an ambiguous PL/pgSQL variable, an unqualified pgcrypto `digest`, and a notification render null that blocked fulfillment history; each was fixed by a new forward migration rather than editing applied history. A normalization migration makes the variable correction safe across the evaluated environment. No reset/drop/data deletion occurred.

## 8. RLS dan permission

New tables have RLS and authenticated staff read policies based on `order.read`. Customer checkout, total approval, and payment submission RPCs are service-role-only behind token-validating server routes. Admin verification/quote/extension RPCs require authenticated access plus existing `order.edit` or staff-role checks. Sensitive sequence tables are not directly accessible to clients.

## 9. Cart dan checkout

Published ready-stock variant-size items flow through guest checkout without login. Customer enters name, WhatsApp, optional email/note, and only the fields required by pickup/shipping. Server recalculates price/tier and validates product, variant, SKU, quantity, and stock. Idempotency prevents duplicate orders; cart is cleared only after success and remains intact on failure.

## 10. Order dan payment

Order and item snapshots are written atomically before payment and appear in the existing Admin order table. Public order access requires a high-entropy token. Payment upload stays on the same order and only sets pending verification. Existing Admin approval/rejection/DP/settlement/adjustment/refund foundations remain active.

## 11. Stock/reservation

Pickup verification reserves 12 hours. Shipping verification does not reserve; Admin quotes shipping, customer approves total, then an atomic 24-hour reservation is created. Row locks, one reservation per order item, duplicate variant rejection, active-reservation subtraction, and expiry release prevent oversell and negative stock. Full verified payment consumes PIM stock.

## 12. Panel Admin

No new dashboard was created. Existing `/admin/orders/[id]` now exposes sender-number/code WhatsApp verification, versioned shipping quote, status/amount/reservation summary, reason-required reservation extension, Ready Stock fulfillment creation, and atomic pay-at-store pickup completion. Existing payment, job order, fulfillment, history, and repeat-order controls remain adjacent.

## 13. Test yang dijalankan

- `tsc --noEmit`: PASS.
- `eslint .`: PASS, 0 errors / 23 pre-existing warnings.
- `vitest run`: PASS, 17 files / 100 tests.
- `next build`: PASS.
- `git diff --check`: PASS.
- SQL compilation/rollback checks: PASS.
- Remote transaction smoke with rollback: PASS.
- Function ACL, RLS, bucket, cron, and no-residue queries: PASS.

## 14. Build status

**VERIFIED**. Production build generated all new public/API/Admin entry points successfully.

## 15. Fitur yang berhasil diverifikasi

- Idempotent multi-item order foundation and server price/stock validation.
- Manual WhatsApp one-time code verification and attempt/expiry controls.
- Pickup 12-hour reservation and pay-at-store state.
- Shipping quote → customer approval → 24-hour reservation.
- Oversell rejection, non-negative stock, expiry, and release.
- Ready Stock fulfillment without fake production Work Items, paid-before-handover guard, and atomic pay-at-store pickup completion.
- Private proof bucket settings, size/MIME limit, server-only sensitive RPCs, and RLS on new/sequence tables.
- No smoke data remained after rollback.

## 16. Fitur yang hanya implemented

- Responsive browser interaction of the new checkout/order-confirmation/Admin forms.
- Real customer payment upload against a production order.
- Real Admin approval/rejection and pickup completion through browser.
- End-to-end flow using a real remotely published Jersey Ready Stock item.

These are implemented but need deployed application/browser credentials and real operational data.

## 17. Blocker

- Application deployment was not requested/performed.
- Remote has no suitable published Jersey Ready Stock variant for a non-rollback production E2E order.
- `MASTER PROMPT DEBRODER` was not found in the supplied repository/workspace.

No blocker prevented source implementation or rollback-based database verification.

## 18. Risiko tersisa

- Operational manual WhatsApp verification depends on Admin discipline when matching sender number and code; no WhatsApp API/provider was invented.
- No automated notification/provider was added; existing provider configuration remains separate.
- Supabase advisor retains older repository-wide security/performance findings not introduced by P0. New commerce RPC ACLs were explicitly verified.
- Real UI/browser regression and production media/product setup remain deployment gates.

## 19. Langkah berikutnya

1. Deploy the application branch containing these source changes.
2. Publish one real Jersey Ready Stock product/variant/SKU/stock through existing PIM.
3. Run authenticated browser E2E for pickup, shipping, payment approval/rejection/retry, fulfillment, and customer token isolation.
4. Monitor the five-minute expiry cron and Admin audit log during the first controlled orders.
5. Address older advisor findings in a separately scoped security hardening pass; do not mix them with v1.3.

## 20. Status akhir

**IMPLEMENTED, VERIFIED** for the reusable P0 commerce foundation and remote transactional smoke.
**PARTIALLY VERIFIED** for the full operational browser journey.
**NOT DEPLOYED** for application code.
Phase 15 / v1.3 remains **NOT STARTED**.

---

## 2026-07-16 — PIM Phase 4 Bulk Import Excel/CSV

Status: **IMPLEMENTED** at source level; **OWNER DATABASE ACTION REQUIRED**.

- Added `/admin/products/bulk-import` inside the existing Unified Product Manager plus authenticated downloads for official XLSX/CSV templates and current Category, Color, and Size references.
- Accepted input is `.xlsx` or UTF-8 CSV, capped centrally at 5 MiB, 2,000 rows, and 250 product roots. Formula, merged cells, macros/active content, invalid MIME/extension, unsafe headers, invalid numbers, duplicates, inconsistent roots, and invalid/inactive master references block import.
- Dry run performs no write and returns summary, paginated preview, row-level error codes, fixes, and a downloadable CSV error report. Admin Guest is explicitly PREVIEW ONLY.
- Final import is create-only and Draft-only. It reuploads/revalidates the same file, verifies actor-bound expiry/checksum/payload claims, and calls one additive service-role-only transaction RPC with advisory-lock idempotency.
- Canonical writes remain in `products`, `product_variants`, and `product_variant_sizes`; stock writes `stock_quantity` and the existing compatibility projection `stock`. No order, checkout, reservation, inventory ledger, Jersey, Public UI, CMS, or manual PIM flow changed.
- Added dependency `exceljs@4.4.0` for server-side XLSX parsing/generation. The single dependency command populated the package metadata but exited under the local ignored-build policy for existing `esbuild`, `sharp`, and `unrs-resolver`; it was not retried.
- Added migration `20260716143000_pim_phase_4_bulk_import_atomic.sql`. It creates minimal batch/idempotency metadata and the atomic RPC, enables RLS, revokes PUBLIC/anon/authenticated access, and grants table/RPC access only to `service_role`.
- The migration was not applied remotely. Owner must review/apply it before final-import testing. Transaction rollback, real grants/RLS, and production idempotency remain **REMOTE DATABASE VERIFICATION REQUIRED**.
- Browser status: **STATIC AUDIT ONLY**. Phase 5, bulk edit, export, scheduled import, and API integration were not started.

---

## 2026-07-14 — Kaos Polos final visual revision

Status: **IMPLEMENTED, PARTIALLY VERIFIED**.

- Scope was isolated to `/kaos-polos`: existing PIM query, universal `/produk/[slug]`, product media/focal points, and Commerce Foundation were reused without database or transaction changes.
- CMS desktop/mobile hero media, focal settings, copy, and primary/secondary CTA are rendered again; the caption/action group is positioned slightly lower without changing hero proportions.
- The Kaos catalog uses a compact five-control filter bar, stable 4-column desktop / 2-column tablet-mobile grid, fixed 4:5 media, uniform card hierarchy, one accessible `next/link` card target, actual PIM badges/status signals, and no hardcoded product examples.
- Display batching is 8 + 4 on desktop and 4 + 2 below 1024 px. Filter/sort/breakpoint changes reset batching; duplicate product identities are suppressed; additional rows use 4:5 skeletons.
- Route-level loading/error states and a closing Custom Order bar to `/sablon-dtf` were added.
- Verification: `git diff --check` PASS; TypeScript PASS; targeted catalog tests 3/3 PASS; full tests 19 files / 118 tests PASS; ESLint PASS with 0 errors and 22 existing warnings; production build PASS; local HTTP smoke returned 200 and universal product links. Automated visual browser matrix was unavailable because no browser binary/`agent-browser` executable exists in the workspace.
- No cart, checkout, order, payment, stock, reservation, fulfillment, RLS, migration, or database code was changed for this revision.

## 2026-07-14 — Reuse category commerce layout

Status: **IMPLEMENTED, PARTIALLY VERIFIED**.

- `/kaos-polos`, `/jaket-hoodie`, and `/headwear` now share `CategoryCommercePage`, `CategoryCommerceCatalog`, `ProductCatalog` category mode, and the same loading/error components.
- Each route retains its own CMS hero key, copy, CTA, focal media, PIM category mapping, type taxonomy, and closing message. Type options are rendered only when actual category products match the configured taxonomy.
- All three routes use the same compact filters, 4-column desktop / 2-column tablet-mobile grid, 4:5 media, card hierarchy, universal `/produk/[slug]` link, 8+4 / 4+2 batching, skeleton, empty state, and closing-bar structure.
- The prior standalone `KaosCatalog` implementation was replaced only after the reusable component was connected; no category-specific cart, checkout, product query, detail route, or transaction code was added.
- No database, migration, RLS, cart, checkout, order, payment, stock, reservation, fulfillment, shipping, or pickup code changed in this reuse pass.
- Verification: TypeScript PASS; targeted lint PASS; full lint 0 errors / 22 existing warnings; full tests 19 files / 119 tests PASS; production build PASS with identical 985 B route bundles for all three categories; local HTTP smoke returned 200 for all three routes. The local fallback catalog has Kaos products but no Jaket/Headwear products, so those two correctly rendered the safe empty state and real variant/cart browser smoke remains a deployed-PIM verification gate.

## 2026-07-14 — Public premium UI foundation audit

Status: **IMPLEMENTED, PARTIALLY VERIFIED**.

- Scope was limited to public global typography, header/navigation, homepage hero, homepage section headings, and product-card typography/presentation.
- Existing CMS/PIM ownership, section order, product data, product images/focal points, routes, checkout, order, payment, tracking, Admin behavior, Supabase, and database logic were preserved.
- The hero has a controlled viewport height, restrained responsive type scale, primary/secondary CTA hierarchy, client-side internal links, reduced-motion handling, inactive-slide focus isolation, and 44 px carousel controls.
- The header has clearer desktop density, grouped mobile shopping/help navigation, guest tracking discovery, duplicate Jersey search removal, and preserved search/cart priority on small screens.
- Homepage headings and product cards now use one scoped type hierarchy; each homepage product card is one accessible detail link with clearer product name, metadata, and price rhythm.
- Verification: `git diff --check` PASS; TypeScript PASS; targeted lint PASS; full lint 0 errors / 22 existing warnings outside this scope; full tests 19 files / 119 tests PASS; production build PASS; local HTTP smoke returned 200 for `/`, `/kaos-polos`, `/track-order`, and `/checkout`.
- Browser viewport, runtime console, hydration, and visual overflow inspection remain **PARTIALLY VERIFIED** because the Playwright package is present but its Chromium binary is not available in this workspace.

## 2026-07-14 — Global navigation and monochrome interaction revision

Status: **IMPLEMENTED, PARTIALLY VERIFIED**.

- `Koleksi` is now a semantic button on the global non-Jersey header. It toggles one controlled mega dropdown, exposes `aria-expanded`/`aria-controls`, closes on Escape/outside interaction, and never redirects from the trigger.
- Only the global `Koleksi` trigger renders a downward chevron. Kaos Polos and Jaket & Hoodie retain their existing hover/focus mega-menu behavior without arrows; Headwear remains a direct link.
- Collection colors are derived synchronously from already-fetched active PIM products and active variants, normalized through canonical aliases, deduplicated, and reduced to small navigation facets before crossing the client boundary.
- `/koleksi` now consumes shareable `color`, `status`, `label`, and `sort` query parameters and renders matching real products using the existing universal product detail and cart components.
- Global public hover/focus/selected/CTA treatments were revised to black/white. Product swatches, content imagery, Admin status semantics, and protected Jersey green remain unchanged.
- Jersey protection uses the existing shared header with an explicit preserved-output variant. `/jersey` retains the legacy header menu geometry, green interactions, arrows, and hardcoded legacy menu content. `/jersey/shop`, Jersey contextual components, filters, Configurator, and Jersey routes were not edited.
- Cart interaction color is route-aware: it becomes monochrome globally while preserving the prior green treatment under `/jersey/*`.
- Verification: `git diff --check` PASS; TypeScript PASS; targeted navigation/commerce tests 30/30 PASS; full tests 20 files / 124 tests PASS; lint 0 errors / 22 existing warnings; production build PASS.
- HTTP smoke returned 200 for `/`, `/koleksi`, `/kaos-polos`, `/jaket-hoodie`, `/headwear`, `/keranjang`, `/checkout`, `/track-order`, one universal product detail, `/jersey`, `/jersey/shop`, and `/jersey/configurator`.
- Local PIM fallback exposed only `/koleksi?color=black`, `navy`, and `white`; each returned 200 and rendered the filtered result state. Browser interaction/viewport/console verification remains pending because no Chromium binary is available.

## 2026-07-14 — Side cart tier-price recalculation

Status: **IMPLEMENTED, PARTIALLY VERIFIED**.

- The working product-detail tier calculation and UI were preserved. Its add-to-cart snapshot now carries the active product tier table, base price, and selected variant/size adjustment required by the cart.
- The existing `CartProvider` now recalculates effective unit price, applied tier, item subtotal, and cart total whenever quantity changes, an identical variant is merged, or persisted `debroder-cart-v3` state is rehydrated.
- The cart reuses the existing canonical bulk-tier resolver; no second cart, pricing rule, product source, checkout path, schema, or migration was added.
- Cart page and checkout remain on the shared provider state. Server-side checkout repricing and validation remain authoritative and unchanged.
- Verification: TypeScript PASS; targeted tier tests 17/17 PASS; full tests 21 files / 136 tests PASS; lint 0 errors / 22 existing warnings; production build PASS. Requested transitions 10→11, 11→12, 12→13, 13→15, 15→11, 23→24, and 24→23 pass in deterministic pricing tests, including JSON/localStorage serialization.
- Browser-click verification remains pending because this workspace has no Chromium binary. Newly added cart items persist the complete tier snapshot; legacy persisted items that predate this snapshot remain unchanged until re-added, rather than being destructively rewritten from incomplete data.
