# Current Phase Handoff

## Current requested scope — Jersey Experience

**Status: IMPLEMENTED, PARTIALLY VERIFIED**

Implemented locally:

- final owner-approved `/jersey` sequence: contextual header, Hero, Carousel 01, centered editorial copy, Split 01, Carousel 02, Wide Banner, Split 02, Custom CTA, Cara Order, and Closing Campaign;
- scoped near-black editorial theme with neon green accents and a dark footer, without changing the shared DEBRODER theme on other routes;
- simplified image-led editorial cards containing only one title and the `Jelajahi` CTA pill;
- shared global header that is fully visible on desktop first load and scrolls out naturally, plus a single sticky Jersey identity/contextual bar;
- hover/focus-only contextual underline with no permanent active underline or contextual border;
- legacy Paket Tim removed from public composition, fallback, navigation, and approved anchors without deleting shared CMS data;
- borderless seven-step Cara Order grid and divider-free dark Jersey footer;
- reserved-ratio route loading state and recoverable route error state;
- PIM-backed `/jersey/shop` commerce shell with a white/black contextual navbar and no stacked global navbar;
- URL-backed search, subcategory, color, size, availability, price, and sort state derived only from actual PIM data;
- compact sticky Show/Hide Filters + Sort By toolbar, 240 px desktop sidebar, focus-managed mobile drawer with Escape/focus trap, and Reset/Terapkan actions;
- three product cards per row on desktop in both sidebar states, two cards on mobile, stable 4:5 media, fine-pointer second-image hover, and proportional grid resizing;
- PIM product status, price, color count, canonical `/produk/[slug]` links, Load More, and loading/empty/retry states;
- universal Jersey product detail styling on `/produk/[slug]`, with custom-only products sent to the official Configurator and Ready Stock products retaining variant/size/quantity/Add to Cart plus same-cart Buy Now;
- official `/jersey/configurator` integration using the existing configurator;
- strict CTA route/anchor validation and canonical `/produk/[slug]` product detail flow;
- two responsive native-scroll carousel groups with 3.2 visible cards on desktop, 2.2 on tablet, and about 1.27 on mobile, plus accessible arrows and disabled states;
- existing CMS extension for Jersey hero and campaign presentation content;
- `/admin/commerce/jersey` workflow editor with draft, publish, schedule, archive, restore, campaign grouping, anchor, heading, overlay, and theme fields;
- additive migrations `20260713143000_commerce_jersey_experience.sql` and `20260713223000_jersey_owner_approved_experience_addendum.sql`.

Verification completed:

- TypeScript: PASS;
- lint: PASS with 0 errors and 23 existing warnings outside this implementation;
- targeted Jersey tests: PASS, 13 tests;
- full suite: PASS, 16 files / 95 tests;
- production build: PASS;
- HTTP route smoke: PASS for `/jersey`, `/jersey/shop`, a filtered/sorted shop URL, `/produk/custom-jersey`, `/jersey/configurator`, `/keranjang`, and the fallback product image;
- browser at 1600, 1440, 1280, 1024, 768, 430, 390, and 360 px: PASS for the final ten-section sequence, no page overflow, black theme continuity, zero section/footer borders, sticky nav, carousel ratios/arrow states, seven order steps, loaded image integrity, console errors, and page errors;
- underline initial/hover/move/focus behavior: PASS; no permanent Home underline;
- Paket Tim removal: PASS for public DOM, navigation, fallback copy, and anchor;
- global/contextual header scroll behavior: PASS at desktop; mobile contextual menu renders as a two-row identity plus native horizontal menu;
- rendered internal CTA and approved anchor check: PASS; no broken route found;
- browser regression smoke for `/`, `/jersey/shop`, `/jersey/configurator`, and `/kaos-polos`: PASS;
- click flow: PASS through shop, canonical product detail, and Configurator.

Verification limits found in this run:

- browser runner was unavailable; Playwright existed but Chromium was absent and its download was blocked, so the new shop/detail UI has not been visually or console-verified at the required viewport matrix;
- `/checkout` returns 404;
- public cart checkout remains WhatsApp-based and does not create an official order, although an existing single-product `create_public_order` RPC and Order Management tables/UI are present elsewhere in the repository;
- end-to-end checkout → order → payment → Admin verification is therefore NO-GO, not passed;
- no database migration or remote mutation was run.

Pending deployment gates:

- neither Jersey migration has been run and remote schema/data were not changed;
- authenticated production CMS workflow was not exercised because the supplied source has no environment credentials;
- loading and error components passed source contract, typecheck, and build verification; a deliberate production runtime fault was not injected;
- real DEBRODER Jersey campaign photography must be selected and published in CMS; the source archive only provides local brand artwork for safe fallback rendering;
- owner should repeat responsive visual QA with final production media and focal points after CMS publication;
- deployment and authenticated CMS publication remain outside this local implementation checkpoint.
- implement or approve one official server-side cart checkout using the existing order tables/RPC domain, including multi-item repricing, stock validation, idempotency, payment-on-the-same-order, and Admin visibility; do not create a second order system;
- repeat browser QA for `/jersey/shop` and Jersey `/produk/[slug]` at 1600/1440/1280/1024/768/430/390/360 px once a browser-enabled environment is available.

## Checkpoint

**Phase 14 — Repeat Order v1.2: COMPLETE, TECHNICALLY VERIFIED, READY TO DEPLOY**

- Phase 12 Notification Management: COMPLETE AND DEPLOYED; no Phase 14 changes.
- Phase 13 Role & Audit: COMPLETE AND DEPLOYED; role/audit integration retained.
- Phase 15: NOT STARTED.

## Completed in Phase 14

- TypeScript types and server validation
- repeat-order query/service layer
- authenticated API routes
- role and permission enforcement
- eligible source-order selection
- current price-tier, variant, size, and stock checks
- safe item/service/design-reference copy
- confirmation dialog and idempotent creation
- repeat-order workspace
- order-detail and customer-history integration
- quotation-origin integration
- append-only history and audit visibility
- loading, empty, success, retry, and error states
- Phase 14 contract tests and full regression suite

## Database handoff

Existing remote migration retained and not replayed:

- `20260712071131 phase14_repeat_order`

No Phase 14 migration was created locally or applied in this run.

Remote database checks:

- RPC `create_repeat_order_quotation`: available
- source relation and history foreign keys: PASS
- unique idempotency constraints/indexes: PASS
- RLS/history append-only trigger: PASS
- role permission compatibility: PASS
- transactional double-call smoke test: PASS and ROLLBACK
- smoke records remaining: 0

## Official flow note

The remote foundation creates a new draft quotation linked to the source order. Product prices and stock are revalidated, services remain pending when required, and the quotation then uses the existing approval/conversion lifecycle to become a new official order. The old order is never modified, and WhatsApp is not the main transaction flow.

## Quality gates

- `npm run typecheck`: PASS
- `npm run lint`: PASS — 0 errors, 24 pre-existing warnings
- Phase 14 tests: PASS — 9 tests
- Full tests: PASS — 14 files, 82 tests
- Production build: PASS — 83 generated entries/routes
- `git diff --check`: PASS

Sandbox build note: Google Fonts were mocked temporarily because external Google Fonts DNS was unavailable. Standalone typecheck and lint passed first. Temporary build-only Next settings were restored and are not part of production source.

## Verification entry points

- `/admin/repeat-orders`
- `/admin/orders/[id]`
- `/admin/orders/quotations/[id]`
- `/admin/audit-log`
- `/admin/notifications`

## Hard stop

**Phase 15: NOT STARTED.**

Do not replay `phase14_repeat_order`, reset the database, alter Phase 12 notification foundations, or start Phase 15 without a new explicit owner instruction.
