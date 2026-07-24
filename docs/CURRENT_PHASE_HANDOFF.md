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

## 2026-07-17 — PIM Phase 5 Bulk Edit & Actions

Status: **IMPLEMENTED** at source level; **OWNER DATABASE ACTION REQUIRED**.

- Added `/admin/products/bulk-edit` inside the existing Unified Product Manager. The UI uses server pagination, explicit selection across pages, all-matching filters with exclusions, a sticky toolbar, required dry run, before/after preview, confirmation, and recent batch history.
- Product Root actions: category change outside protected Jersey output, Draft/Active/Archived lifecycle transition, and base-price adjustment. Color Variant actions: Active/Inactive and price adjustment. Sellable SKU actions: stock set/increase/decrease through canonical `stock_quantity` plus existing compatibility `stock`.
- Batch limits are 250 Product Roots, 500 Color Variants, 1,000 Sellable SKUs, and 1,000 total mutations. Percentage results that are fractional Rupiah are blocked without undocumented rounding.
- Admin Guest remains PREVIEW ONLY. Final commit accepts only Owner/Super Admin dependency roles, verifies an actor/role/expiry-bound preview, recalculates current server state, detects concurrency, and calls one service-role-only atomic/idempotent RPC.
- Added migration `20260717093000_pim_phase_5_bulk_edit_atomic.sql` for minimal batch metadata, strict action allowlist, row locks/current-state comparison, lifecycle/category/publish/price/stock validation, all-or-nothing mutation, and mandatory audit insertion.
- Migration was not applied remotely. Apply Phase 4 first if pending, then Phase 5, and run controlled rollback/idempotency/concurrency/audit/grant checks before enabling real final actions.
- Tags and variant archive are **NOT APPLICABLE** on this canonical baseline. SKU, slug, name, master data, media, permanent delete, Jersey, commerce, and existing manual PIM business flows were not changed.
- Browser verification: **STATIC AUDIT ONLY**. GitHub, Vercel, and Supabase remote remain owner-managed.

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

## 2026-07-18 — Custom Order end-to-end revision

Status: **IMPLEMENTED, STATIC AUDIT ONLY / LOCAL ENVIRONMENT BLOCKED**.

- Scope aktif: Public Custom non-Jersey, Custom checkout/order approval, payment gate, Admin Custom workspace, design version metadata, structured shipping address, final fulfillment verification, and customer tracking refresh.
- Diperiksa: governance FROZEN, Custom Hub/builder/cart/checkout/order snapshot, quotation baseline, automatic payment, Phase 7 compatibility, Job Order/production/QC/fulfillment, notification routing, and guest tracking.
- Diubah: canonical pricing semantics/double-charge prevention; builder validation/review; structured address endpoint/UI/snapshot; immutable Custom quote versions and approval proof; locked-total payment gate; 12-stage Admin focus; upload version metadata; final-verification guard; tracking polling/focus recovery.
- Belum selesai: village/postal migration runtime, browser viewport/business-flow verification, deployed Preview regression, and dependency-based local gates.
- Routes: `/custom`, Custom builder/cart/checkout confirmation, `/api/custom/reprice`, `/api/checkout`, `/api/public/indonesia-regions`, `/api/public/orders/[token]`, `/api/public/order-tracking`, `/api/customer-uploads`, Admin order detail, and fulfillment detail.
- Migration local: `20260718180000_custom_order_end_to_end_revision.sql`, followed by `20260718181000_indonesia_regions_province_regency_district_seed.sql`, `20260718182000_indonesia_regions_village_postal_seed.sql`, then `20260718182500_custom_checkout_address_snapshot_method.sql`.
- Migration remote/applied: NONE. Migration pending: YES — owner Preview only.
- TypeScript/lint/targeted tests/full tests/build: NOT RUN — dependency install failed with runner ENOENT for `/root/.local`; no retry performed under Master Override.
- Deployment: NONE. GitHub/Vercel remain owner-managed.
- Risks: SQL runtime and active-route browser behavior require owner Preview; static source does not prove remote schema compatibility.
- Next: owner copies the targeted changed-files-only package, applies pending migration(s) in order in controlled Preview, runs gates/build, and executes Custom pickup/shipping regression including preserved `ORD-DEB-2026-0013` and `PAY-DEB-2026-0011`.
- GO/NO-GO: **NO-GO FOR PRODUCTION MERGE; SOURCE READY FOR OWNER PREVIEW VERIFICATION**.

## Region seed refinement — 2026-07-18

- Added canonical idempotent migration `20260718181000_indonesia_regions_province_regency_district_seed.sql` from the owner-supplied region archive.
- Static coverage audit: 38 provinces, 514 regencies/cities, 7,285 districts/kecamatan, 0 duplicate codes, 0 malformed codes, and 0 orphan parent references.
- Apply order in controlled Preview: `20260718180000_custom_order_end_to_end_revision.sql`, then `20260718181000_indonesia_regions_province_regency_district_seed.sql`.
- Added `20260718182000_indonesia_regions_village_postal_seed.sql`: 83,762 village/kelurahan/desa-adat rows and 10,632 distinct five-digit postal codes, with no duplicate, malformed, blank-name, or orphan-parent row found by static audit.
- Full safe order: `20260718180000_custom_order_end_to_end_revision.sql`, `20260718181000_indonesia_regions_province_regency_district_seed.sql`, `20260718182000_indonesia_regions_village_postal_seed.sql`, then `20260718182500_custom_checkout_address_snapshot_method.sql`.
- Remote status was not inspected or changed by Codex. Full Custom shipping must not be declared browser-verified yet.
- Dependency-based gates remain NOT RUN due the previously recorded environment failure; the install command was not retried.

## Custom Checkout structured-address targeted hotfix — 2026-07-18

- Active route: `/checkout`; active import: `components/checkout/CheckoutClient.tsx`.
- Root cause: canonical checkout remained legacy while structured UI existed in duplicate `CheckoutClientV2.tsx` behind a `tsconfig` alias.
- Fix: canonical component owns structured Custom shipping; duplicate and alias removed. Pickup remains address-free and fulfillment switching preserves structured state.
- Server validation, parent-child checks, postal membership, formatted address, and immutable snapshot continue through the Custom checkout RPC. The refinement migration records the explicit shipping method.
- Admin fulfillment reads and displays the immutable snapshot used by the order.
- Browser, remote SQL runtime, TypeScript, lint, tests, and production build are not claimed verified in this environment.


---

## 2026-07-20 — Human-Centered Order Experience P0

Status: **SOURCE IMPLEMENTED / STATICALLY VERIFIED / PREVIEW REQUIRED**.

- Phase 0–13 tidak diulang. Mesin order, payment, production, QC, fulfillment, cancellation/refund, task, SLA, outbox, dan reconciliation tetap dipertahankan.
- Detail order Admin sekarang memiliki satu cockpit `AdminGuidedOrderFlow`: tahap aktif, penanggung jawab, hambatan, satu tindakan utama, tahap berikutnya, dan seluruh urutan proses terlihat tanpa membuka beberapa workspace paralel.
- Pelanggan melihat perjalanan lengkap sejak checkout pada confirmation, payment, dan tracking. Cancelled/expired menampilkan tahap terminal dan seluruh tahap sesudahnya sebagai `Tidak Dilanjutkan`.
- Fulfillment memakai satu tindakan normal per status. Exception tetap tersedia secara eksplisit sebagai kontrol sekunder. Nomor internal diberi label `Nomor Pengiriman DEBRODER`; resi kurir tetap data resmi kurir.
- Task Inbox menggunakan `Kerjakan Sekarang` dan deep-link ke workflow/action yang benar. Payment modal merespons perubahan hash setelah mount.
- Admin responsive safety diperluas: content/grid `min-width:0`, wrapping, responsive header actions, media/form bounds, serta local table scrolling sampai 1279 px agar halaman tidak memerlukan zoom-out.
- Migration `20260720030000_human_centered_order_experience_p0.sql` membuat Ready Stock fulfillment/internal number otomatis dan idempotent, menolak Custom, terminal order, dan pembatalan aktif, serta melakukan safe backfill melalui helper yang sama.
- Schema production diperiksa read-only; migration belum diterapkan. Full dependency typecheck/lint/Vitest/build, PostgreSQL compilation, migration Preview, dan browser E2E tetap menjadi gate owner.

---

## 2026-07-24 — P5 Client Boundary Isolation

Status: **COMPLETE — ALL REQUIRED LOCAL GATES PASS**.

- Branch/base: `Batch-1-—-Fondasi-dan-Performa-Halaman` at `7e12e59` before the uncommitted P5 diff.
- Root cause: cart context was mounted in `app/layout.tsx`, so every route inherited client state; the full search modal/index lived inside the primary header client component; public and service-role Supabase factories shared client-importable modules; server data modules lacked one consistently enforced import boundary.
- Resolution: scope the unchanged cart provider to storefront compositions, introduce a server header wrapper plus lazy search island, split `server-env`/Supabase admin modules from public modules, add `server-only` guards, and add P5 import-boundary regressions.
- Build evidence: the cart chunk is present only on storefront route manifests and absent from Admin, `/payment/[token]`, and `/order-confirmation/[token]`; the search modal is emitted as its own 4,214-byte lazy chunk.
- Routes and behavior: no route, pricing formula, cart persistence, checkout, payment, order, or business-policy change.
- Gates: `pnpm typecheck` PASS; `pnpm lint` PASS (0 errors, 35 pre-existing warnings); `pnpm test` PASS (74 files / 579 tests); `pnpm build` PASS (110/110 pages).
- Migration/database: none created, applied, or required. Supabase remote was not mutated.
- Git/deployment: changes remain uncommitted; no push, merge, deploy, or P6 work was performed.
- Next action: owner review of the P5 diff only. Stop after P5.

---

## 2026-07-24 — P7A Pricing Parity

Status: **PASS WITH TWO EXPLICIT P7B BLOCKERS**.

- Scope aktif: executable Ready Stock/Custom pricing parity only. P6 and P7B
  were not started.
- Diperiksa: frozen governance and package plan; product/tier/minimum ownership;
  cart/PDP/revalidation/Custom/checkout price paths; local migrations; live
  PostgreSQL function definitions and canonical product/tier cohorts.
- Diubah: one pure Ready Stock policy resolver with canonical error codes;
  product commerce-mode mapping; fail-closed transaction catalog reads;
  sellable variant-size adjustment authority; TypeScript and read-only SQL
  parity fixtures; regression tests and P7A report.
- Resolved: size-master double adjustment, ignored `tier_scope`, numeric price
  on quotation tier, and sample fallback in transaction revalidation.
- Blocked for P7B: live checkout SQL still accepts up to 10,000 units per line
  with no 500-total guard, and does not evaluate Ready Stock
  `minimum_quantity`/`quotation_quantity`.
- Routes changed: no route shape or UI; behavior correction applies to
  `/api/cart/revalidate` and existing `/api/quotation-drafts` data loading.
- Migration local/remote/applied/pending: none for P7A. Supabase was queried
  read-only; no remote mutation occurred.
- Parity: TypeScript P7A 17/17 PASS; related suite 63/63 PASS; remote read-only
  SQL fixture 10 vectors / 0 mismatch PASS.
- Gates: typecheck PASS; lint PASS (0 errors / 34 pre-existing warnings); full
  tests PASS (75 files / 596 tests); build PASS (110/110 pages).
- Deployment: none. Commit/push/merge: none.
- Detail and complete mismatch inputs/outputs:
  `docs/P7A_PRICING_PARITY_REPORT.md`.
- Next: owner reviews P7A evidence. P7B blockers remain explicit; this task
  stops here and does not begin P6 or P7B.
- GO/NO-GO: **P7A GO UNDER ITS EXIT CRITERIA; P7B DATABASE ENFORCEMENT REMAINS
  BLOCKED/PENDING**.

---

## 2026-07-24 — P6 Cart v5

Status: **PASS** by owner `lanjut` confirmation.

- Repository/branch/base verified: `DEBRODER`,
  `Batch-1-—-Fondasi-dan-Performa-Halaman`,
  `d98bd6307dfefe3f46e042bd172991de123237ee`; working tree was clean before P6.
- P7A evidence verified PASS before source changes. Its pricing formula,
  historical snapshots, and two explicit P7B SQL blockers remain unchanged.
- Ownership proven: `components/CartProvider.tsx` owns active add/persist/restore/
  update/cart display; `/api/cart/revalidate` owns Ready Stock refresh;
  `components/checkout/CheckoutClient.tsx` and `/api/checkout` own checkout
  command and server-authoritative final validation.
- Root cause: the active provider still wrote a plain `debroder-cart-v4` array,
  inferred line modes heuristically, and did not consume the existing
  `cart-line.v5` contract/revalidation path. Checkout limits existed at its
  parser boundary but not at every cart mutation/restore/revalidation boundary.
- Resolution: versioned Cart v5 envelope, all four discriminated lines,
  deterministic legacy migration/quarantine, explicit limits, server
  revalidation with stale snapshot + retry, and one-mode/fail-closed checkout.
  Legacy storage keys are read but not deleted.
- Routes preserved: `/keranjang`, `/checkout`, `/api/cart/revalidate`, and
  `/api/checkout`. No broad visual redesign or pricing/inventory authority
  change.
- Verification: owner-confirmed full typecheck, lint, test, build, diff, commit,
  push, and Preview gate PASS.
- Migration/database: none required, created, applied, or pending for P6. The
  proven SQL limit/minimum gaps stay owned by P7B.
- Git/deployment: commit `684144b` is present on the tracked remote branch and
  Preview passed. No merge or production deployment was authorized.

---

## 2026-07-24 — P7B Policy & Database Alignment

Status: **PASS** by owner `lanjut` confirmation.

- Owner command `lanjut` confirmed P6 full gate/commit/push/Preview PASS.
  Baseline HEAD: `684144b433126057e00e8dbab8021d2d503fbf71`.
- Live audit reconfirmed P7A-B01/P7A-B02: Ready Stock SQL lacked the 100-unit
  line/500-unit aggregate limits and did not evaluate active
  `product_minimum_rules`. Active rules remain zero.
- Added and remotely applied
  `20260723193533_p7b_policy_database_alignment_v1.sql`.
- The database now rejects Ready Stock over 50 lines, over 100 units per line,
  or over 500 total units; evaluates active product minimum and quotation
  thresholds against aggregate product quantity; and rejects mixed checkout
  modes through a deferred transaction policy trigger.
- Finalized public Ready Stock pricing snapshots, unit price, subtotal, and
  pricing status are immutable. Existing finalizer/formula, historical rows,
  inventory authority, UI, and RLS policies were not changed.
- Remote verification: migration history present; three P7B triggers active;
  policy trigger deferrable/initially deferred; all three security-definer
  functions use empty search path and are executable only by `service_role`;
  one audit marker present; no P7B advisor finding.
- Local verification: typecheck PASS; touched-file lint PASS; targeted suite
  PASS (6 files / 42 tests). Full owner gate remains pending.
- Production-row mutation smoke was not performed after the safety layer
  rejected it; verification stayed read-only after migration application.
- No commit, push, merge, UI change, inventory mutation, or P8A work.

---

## 2026-07-24 — P8A Size Adjustment Policy Preview

Status: **PASS**.

- Owner command `lanjut` confirmed P7B full gate, commit, push, and Preview
  PASS. Baseline HEAD `0b47bb4b6ffbe7e8c867dd3ab8a32d9a2c6f6525` matched
  the tracked remote branch and the working tree was clean.
- Authority proven from source and live schema: transaction pricing uses
  `product_variant_sizes.price_adjustment`; canonical
  `product_size_master` identifies size and has no price column.
- Added a deterministic pure preview and read-only SQL artifact for S–XL
  `Rp0`, 2XL `+Rp10.000`, 3XL `+Rp20.000`, and 4XL `+Rp30.000`.
- Remote preview result: 1,173 SKU total; 860 aligned; 287 pending owner
  approval (190 2XL, 76 3XL, 21 4XL); 25 XS out of policy; one `Mix Size`
  blocked due to missing `size_id`; zero normalized duplicates; zero proven
  explicit override.
- Active/draft split among affected rows: 45 active and 242 draft. All 287
  before adjustments are Rp0. No product row, historical order, snapshot,
  inventory, RLS, or database schema was changed.
- Files: `lib/size-adjustment-policy-preview.ts`,
  `supabase/sql/04_p8a_size_adjustment_preview_read_only.sql`,
  `test/p8a-size-adjustment-policy-preview.test.ts`, and
  `docs/P8A_SIZE_ADJUSTMENT_POLICY_PREVIEW.md`.
- Targeted verification: 15/15 tests PASS; TypeScript PASS; touched-file lint
  PASS; exact read-only SQL artifact executed against Supabase and returned
  the counts above.
- Migration local/remote/applied/pending: none. Database mutation: none.
  Routes/UI/deployment: none.
- Next: owner runs full gate and approves/rejects the exact P8A row set.
  P8B remains closed until that approval.

Full owner gate subsequently run by Codex at owner request: typecheck PASS;
lint PASS with 0 errors / 34 existing warnings; tests PASS 78 files / 626
tests; production build PASS 110/110 pages; git diff/status/stat/diff PASS.
Owner instruction `Lanjut` approved the exact 287-row P8A cohort and opened
P8B.

---

## 2026-07-24 — P8B Size Adjustment Data Mutation

Status: **PASS** by owner gate confirmation.

- Preflight reconfirmed exact P8A fingerprint
  `c8de001d6a246fe4465873326b7ad634`: 287 rows, all before Rp0,
  190/76/21 by 2XL/3XL/4XL, 45/242 active/draft, and zero proven override.
- Additive data migration
  `20260724011535_p8b_size_adjustment_data_mutation_v1.sql` aborts on any
  count, fingerprint, before-value, status, duplicate, SKU, or override drift.
- Exact migration preview executed inside a rollback transaction and left 287
  candidates / zero P8B audit rows afterward.
- Migration applied to `DEBRODER APPAREL`; 287 sellable SKU adjustments were
  updated atomically and 287 before/after audit rows were written in one
  batch.
- Postcheck: 1,147 policy-managed SKU, zero mismatch; audit fingerprint exact;
  final counts S/M/L/XL 215 each, 2XL 190, 3XL 76, 4XL 21.
- Exclusions preserved: 25 XS remained outside policy; one unlinked `Mix Size`
  remains Rp0 and blocked from automatic mutation.
- Historical orders/pricing snapshots, products, color variants, inventory,
  UI, routes, pricing formula, permanent schema, and RLS were not changed.
- Local verification: typecheck PASS; touched lint PASS; targeted P7A/P8A/P8B
  suite PASS, 3 files / 37 tests.
- Remote migration history contains version `20260724011535`; security and
  performance advisors contain zero P8B-specific finding.
- Files: migration, read-only verification SQL, P8B regression test, P8B
  report, and governance handoff/state/issue updates only.
- Owner confirmed full gates, safe diff review, commit `1d4db25`, remote push,
  and Vercel Preview Ready without error.

---

## 2026-07-24 — P9 Generic Configured Product

Status: **IMPLEMENTED IN SOURCE — AWAITING OWNER GATE VERIFICATION**.

- Baseline verified clean and synchronized at
  `1d4db25756d865837b3250b4217a71880b0b8719`.
- Ownership audit proved `products.config_schema` is the existing canonical
  definition slot. Product identity, display name, availability,
  `minimum_order_qty`, commerce mode, and source version remain canonical
  product-column authority.
- Live data: one draft specialized configurable product, zero active generic
  definition, zero saved configurations, 14 historical configured order
  items, and 53 non-empty historical `order_items.config_snapshot` rows.
- Added generic definition projection, full option/selection/compatibility/
  allocation/service/upload validation, deterministic canonical input,
  SHA-256 fingerprinting, amount-free pricing input, pricing-authority result
  verification, and deeply frozen immutable snapshot creation.
- Server runtime fails closed for missing catalog/config schema, inactive or
  wrong commerce mode, version drift, invalid selection, missing pricing
  authority, thrown authority, and mismatched pricing output.
- Cart v5 now requires a valid server input fingerprint and matching pricing
  snapshot (or explicit quotation-required snapshot) before a configured line
  can be checkout-eligible. Existing configured checkout remains intentionally
  inactive until P10.
- Specialized product fields/branches are prohibited by regression test in
  the generic core. P10 consumer work was not started.
- Database/migration: none required, created, applied, or pending. Existing
  schema is sufficient; backfill or mutation would be speculative. No
  historical order/snapshot row was changed.
- Routes/UI/pricing formula/inventory/RLS: unchanged.
- Verification: typecheck PASS; targeted suite PASS (3 files / 23 tests);
  touched-file lint PASS; `git diff --check` PASS.
- Deployment/commit/push/merge: none for P9.
- Next: owner runs full typecheck/lint/test/build/diff gate. P10 remains closed
  until owner confirms P9 PASS.

---

## 2026-07-24 — P12 Admin Orders Ownership

Status: **IMPLEMENTED IN SOURCE — AWAITING OWNER GATE VERIFICATION**.

- Owner confirmed P11 gate clean/PASS. P12 baseline HEAD
  `571dffc2050d5d992c6f5196ddd5004189a25d74` was clean on the expected branch.
- Root cause: Admin Order pages were Server Components, but list/detail client
  components independently queried transaction tables and resolved the active
  stage from browser-owned, multi-request state.
- Added `lib/admin-orders` contracts, pure projection, `server-only` data
  access, and page use cases. List/detail APIs require `order.read`; mutation
  commands require `order.edit`.
- Read projections use the server-side actor JWT client, not service role, so
  granular `payment.read`, `shipping.view`, `production.view`, and `qc.view`
  RLS remains authoritative.
- Detail is loaded as one whitelisted nested graph covering order, item
  snapshots, latest payment, job/QC, fulfillment, courier tracking, and
  pricing/source snapshots. The browser only renders the typed result.
- Full-detail delivery edit, cancel, and archive now cross the server command
  boundary before invoking existing canonical RPCs.
- Historical snapshots are read-only. Live historical item status
  `confirmed` remains explicit; unknown order pricing state or invalid monetary
  values fail closed.
- Live Supabase audit found 44 orders, 53 items, 22 payments, 17 fulfillments,
  0 job orders, and 0 QC records; all scoped tables have RLS and the required
  child relationships are unambiguous.
- Database/migration local/remote/applied/pending: none. No row, schema,
  function, trigger, RLS, pricing, inventory, cart, or checkout mutation.
- Verification run: typecheck PASS; touched-file lint PASS; 8 targeted files /
  69 tests PASS; direct Next production build PASS, 110/110 pages;
  `git diff --check` PASS. Build reports only pre-existing repository warnings.
- Deployment/commit/push/merge: none.
- Next: owner full gate and diff review. P13 remains closed until owner confirms
  P12 PASS.

---

## 2026-07-24 — P13 Customer Order Read Model & Polling

Status: **IMPLEMENTED IN SOURCE — AWAITING OWNER GATE VERIFICATION**.

- Owner confirmed P12 gate clean/PASS. P13 baseline HEAD
  `b3f7b3c6f5b692e79c66b92386f536b0e1ad85de` was clean on the expected branch.
- Root cause: confirmation and guest tracking clients owned duplicate response
  shapes and perpetual polling, while their APIs assembled customer status
  through separate transaction reads.
- Added shared typed contracts, pure server projection, `server-only` data
  access, page-owned use cases, client API boundary, polling policy, reusable
  polling hook, and explicit error/stale feedback.
- One whitelisted order graph supplies item snapshots, latest payment,
  fulfillment/tracking, shipping/custom quotes, pickup, cancellation/refund,
  job, and QC state. The client receives only the page-specific safe projection.
- Guest token/hash and WhatsApp verification remain authoritative. Sensitive
  hashes, raw phone/address values, proof paths, admin notes, and raw database
  rows do not cross the client boundary.
- Polling uses a 30-second active interval, bounded exponential backoff,
  recursive timeout without overlap, AbortController cleanup, terminal stop,
  hidden/offline pause, and focus/visibility/online resume.
- Failed refresh retains the last snapshot with an explicit stale warning and
  retry; first-load authorization, expiry, not-found, rate-limit, and
  unavailable states remain explicit.
- Live schema/data audit found 44 orders, 53 items, 22 payments, 17
  fulfillments, 18 shipping quotes, 10 stock reservations, 3 pickup
  preparations, and no custom quote/job/QC/cancellation/refund rows. RLS,
  direct foreign keys, token indexes, and existing fields are sufficient.
- Database/migration local/remote/applied/pending: none. A migration would be
  speculative; no schema, RLS, function, data, or historical snapshot changed.
- Verification run: typecheck PASS; touched-file lint PASS; 6 targeted files /
  53 tests PASS. Owner full typecheck/lint/test/build/diff gate remains required.
- Deployment/commit/push/merge: none. P14 remains closed until owner confirms
  P13 PASS.
