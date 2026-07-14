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
