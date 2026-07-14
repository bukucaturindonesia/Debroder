# DEBRODER v1.2 Issue Register

## Open

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

## Closed in Phase 12

- V12-010 — Local dependency-based quality gates were previously blocked. Dependencies were installed for verification; typecheck, lint, test, and build now run successfully.
- V12-012 — Phase 11 deployment verification was treated as completed per owner instruction that Phase 11 is finished.
- V12-015 — Phase 12 database/source uncertainty. Resolved by checking remote migration history and live notification tables/RPCs before coding; no migration was reapplied.
- V12-016 — Existing Phase 10 static contract expected `Upload Bukti QC`. Restored the label without changing Phase 10 workflow.

## Closed in Commerce Foundation V1 P0

- V12-018 — Official public checkout/order creation gap. Resolved by reusing the root cart, PIM, existing order/order-item domain, payment domain, and Admin order detail; `/checkout`, server-side repricing/stock validation, idempotency, private order tokens, reservations, manual shipping quote, and same-order payment flow are implemented. Remote rollback smoke passed and left zero records. Operational browser E2E moved to V12-020.
