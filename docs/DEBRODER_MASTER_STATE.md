# DEBRODER Master State

Last updated: 14 July 2026

## Official implementation checkpoint

- Phase 11 — Shipping / Pickup & Fulfillment: COMPLETE
- Phase 12 — Notification Management v1.2: COMPLETE AND DEPLOYED
- Phase 13 — Role & Audit v1.2: COMPLETE AND DEPLOYED
- Phase 14 — Repeat Order v1.2: COMPLETE, TECHNICALLY VERIFIED, READY TO DEPLOY
- Commerce Jersey Experience: IMPLEMENTED, PARTIALLY VERIFIED
- Phase 15: NOT STARTED

## Database state

- Supabase project: `DEBRODER APPAREL`
- Phase 14 foundation migration already present remotely:
  - `20260712071131 phase14_repeat_order`
- The migration was not reopened, edited, recreated, or reapplied.
- No database reset, data deletion, table/function/trigger/RLS deletion, or migration-history cleanup occurred.
- No new Phase 14 migration was necessary.
- Jersey CMS extension migration is present locally and has **not** been applied:
  - `20260713143000_commerce_jersey_experience.sql`
- Owner-approved Jersey experience addendum migration is also present locally and has **not** been applied:
  - `20260713223000_jersey_owner_approved_experience_addendum.sql`
- No database reset, destructive SQL, or migration command was run for the Jersey work.

## Commerce Jersey experience state

- `/jersey` is an editorial mini landing and no longer embeds the full product catalog.
- The final owner-approved `/jersey` order is implemented: contextual header, Hero, Carousel 01, centered editorial copy, Split 01, Carousel 02, Wide Banner, Split 02, Custom CTA, Cara Order, and Closing Campaign.
- The page is scoped to a near-black editorial theme with white/off-white hierarchy and neon green accents; campaign media remains image-first and product data remains outside CMS.
- Image-led carousel, split, and wide editorial cards render only the campaign title and a consistent `Jelajahi` CTA pill; CMS subtitles and eyebrow copy remain stored but are intentionally not rendered inside cards.
- Global navbar remains shared and scrolls out naturally. The single Jersey identity/contextual bar is sticky, one row on desktop, and two-row/native-horizontal-scroll on mobile.
- The legacy Paket Tim public section, navigation item, fallback item, and dead anchor are removed from the public experience; any existing CMS record remains safely stored but is filtered from public rendering.
- Contextual and section dividers are removed. Menu underline appears only on hover or keyboard focus, while the current route remains identified by glow, weight, and `aria-current`.
- Cara Order retains seven lifecycle steps in a borderless responsive 4/2/1-column grid. Route-level loading reserves final media ratios and the Jersey error boundary provides retry and catalog recovery actions.
- `/jersey/shop` is the PIM-backed catalog transition and product cards retain canonical `/produk/[slug]` detail routes.
- `/jersey/shop` now uses a dedicated white/black Jersey commerce shell without stacking the shared global navbar. Its URL-backed PIM filters, compact sticky toolbar, desktop sidebar, mobile focus-managed drawer, three-column desktop grid, two-column mobile grid, 4:5 product media, empty/loading/error states, and Load More behavior are implemented.
- Jersey product detail remains on universal `/produk/[slug]`. Jersey records receive the same monochrome commerce navigation and styling; custom-only products route to `/jersey/configurator`, while Ready Stock products retain the existing variant/size/quantity cart panel and now expose Buy Now through the same cart state.
- Product hover media is limited to fine-pointer devices and only activates when a PIM second image exists.
- `/jersey/configurator` is the official Custom CTA target and reuses the existing `JerseyConfigurator` domain logic.
- CMS presentation data extends the existing `page_heroes` and `cms_banners` sources; no parallel Jersey product store was introduced.
- Admin entry point `/admin/commerce/jersey` supports draft, publish, schedule, archive, restore, desktop/mobile media, copy, CTA, focal positioning, visibility, grouping, section headings, overlay strength, and sort order.
- CTA targets are restricted to known public Jersey, canonical product, help, WhatsApp support, and approved page anchors; invalid managed CTA targets are not rendered as active links.
- The supplied archive contains brand artwork but no local Jersey campaign photography. Until the pending migration is applied and real DEBRODER media is published through CMS, public fallback presentation uses existing brand assets.

## Phase 14 state

- Authorized roles: Owner, Super Admin aliases, Admin, and Sales Admin.
- Backend also requires `order.read` and `quotation.write`.
- Eligible source statuses: `siap_diambil`, `siap_dikirim`, `selesai`.
- Source order remains immutable during Repeat Order.
- New draft quotation stores `repeated_from_order_id`, reason, and idempotency key.
- Products are repriced using active product/tier/variant/size rules when possible.
- Stock is rechecked and differences are shown before confirmation.
- Service pricing and manual combinations remain pending.
- Design files remain private and are referenced through the source relationship; a new approval lifecycle is required.
- Repeat history is append-only and audit is written to `system_audit_log`.
- Double calls with the same idempotency key resolve to one quotation.

## Integration state

- Repeat Order workspace added to role-aware admin navigation.
- Order detail contains Repeat Order confirmation and customer history.
- Quotation detail shows its source order and repeat reason.
- Phase 12 notification test remains green.
- Phase 13 role/audit test remains green after its phase-boundary assertion was updated for the now-authorized Phase 14 route.
- Six missing Phase 13 route files from the uploaded deploy archive were restored from the verified Phase 13 checkpoint to prevent regression.

## Quality state — Jersey checkpoint

- Typecheck: PASS
- Lint: PASS, 0 errors / 23 warnings outside the Jersey implementation
- Phase 14 tests: PASS, 9 tests
- Jersey tests: PASS, 13 tests
- Full tests: PASS, 16 files / 95 tests
- Build: PASS, 86 generated pages; Jersey public/admin routes included
- Prior `/jersey` editorial browser checkpoint remains recorded as PASS at 1600, 1440, 1280, 1024, 768, 430, 390, and 360 px. The new `/jersey/shop` and Jersey `/produk/[slug]` commerce UI was **not browser-verified in this run** because no browser binary was available and the sandbox blocked the Playwright Chromium download.
- HTTP runtime smoke: PASS (200) for `/jersey`, `/jersey/shop`, URL-filtered `/jersey/shop`, `/produk/custom-jersey`, `/jersey/configurator`, `/keranjang`, and the official fallback image.
- Checkout route: FAIL/GATE; `/checkout` returns 404. The current public cart still sends checkout to WhatsApp and does not invoke the existing `create_public_order` RPC.
- Transaction E2E to Order Management and Payment Management: NO-GO in this checkpoint. No live database credentials were available, and the existing public transaction flow does not satisfy server-side multi-item checkout/order creation.
- Contextual interaction: PASS; current Home has no permanent underline, hover moves the underline between menu items, and keyboard focus exposes the same underline
- Carousel ratio: PASS at approximately 3.29–3.33 cards on desktop, 2.27 at tablet, and 1.30–1.31 on mobile
- Legacy Paket Tim check: PASS; no menu item, public section, fallback copy, or `#paket-tim` anchor remains
- Header behavior: PASS; utility/navbar/promo are visible at desktop first load, the shared global header scrolls out naturally, and the contextual Jersey bar alone remains sticky
- Jersey editorial, shop, product-detail, Configurator, cart, and image route smoke: PASS. The blueprint-target `/checkout` remains an explicitly registered broken transaction route.
- Regression browser smoke: PASS for `/`, `/jersey/shop`, `/jersey/configurator`, and `/kaos-polos`
- Commerce route flow: PASS through `/jersey` → `/jersey/shop` → `/produk/custom-jersey` and Custom CTA → `/jersey/configurator`; checkout/order/Admin continuation remains NO-GO.
- Database transactional smoke test: PASS and ROLLBACK
- Smoke records remaining: 0

## Repository instruction note

No project-level `AGENTS.md` was present in the supplied source. No instruction file was fabricated.

## Frozen boundary

The Frozen Commerce Experience and Landing Page boundaries remain unchanged; the owner-approved experience addendum was applied only to `/jersey`. No blueprint file was changed. Phase 12/13 foundations, product detail, order, payment, checkout, and Panel Admin transaction domains were not rebuilt. Phase 15 must not begin without explicit owner approval.
