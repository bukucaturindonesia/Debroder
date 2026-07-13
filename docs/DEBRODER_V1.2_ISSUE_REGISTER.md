# DEBRODER v1.2 Issue Register

## Open

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

### V12-018 — Official public checkout and order creation gap

- Severity: Blocker
- Status: OPEN / NO-GO
- Detail: `/jersey/shop`, universal Jersey product detail, Add to Cart, and same-cart Buy Now are implemented, but `/checkout` returns 404 and the current cart completes through WhatsApp. It does not create `orders`/`order_items` for Order Management. The repository already contains order tables, Admin Order Management, payment tracking, and a single-product `create_public_order` RPC, but no approved multi-item public cart checkout with server-side repricing, stock revalidation, idempotency, and same-order payment retry. Do not create a parallel cart or order store. This requires a separate transaction-domain authorization and database-backed E2E verification.

### V12-019 — Browser matrix for new Jersey commerce shell

- Severity: Gate
- Status: OPEN
- Detail: Typecheck, lint (0 errors), 13 Jersey tests, full 95-test suite, build, and HTTP route smoke pass. The new white `/jersey/shop` shell and Jersey universal detail styling could not be visually/console tested because no browser binary was available and the sandbox blocked Playwright Chromium download. Repeat keyboard, console, broken-image, overflow, sidebar resize, drawer, filter Back/Forward, and viewport checks at 1600/1440/1280/1024/768/430/390/360 px in a browser-enabled environment.

## Closed in Phase 12

- V12-010 — Local dependency-based quality gates were previously blocked. Dependencies were installed for verification; typecheck, lint, test, and build now run successfully.
- V12-012 — Phase 11 deployment verification was treated as completed per owner instruction that Phase 11 is finished.
- V12-015 — Phase 12 database/source uncertainty. Resolved by checking remote migration history and live notification tables/RPCs before coding; no migration was reapplied.
- V12-016 — Existing Phase 10 static contract expected `Upload Bukti QC`. Restored the label without changing Phase 10 workflow.
