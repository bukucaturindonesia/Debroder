# Public storefront restoration audit — 2026-10-04

Donor: bee4bc4e7feb847394bd2e0c37816943d70e3185 (feat: complete wave 2 storefront finalization).
Current HEAD: b4b258d62240aab06717d1e8da439a5d6cece996, branch release/debroder-id-v1.
Local safety reference: codex/safety-before-storefront-20261004 at the current HEAD.
Pre-existing dirty state: CURRENT_PHASE_HANDOFF.md and owner-visual-review screenshot artifacts. Handoff backup retained in .debroder-backups/storefront-20261004/.

## Selective restoration

- app/page.tsx: exact Wave 2 homepage, shared PublicShellFrame, CMS sections, hero, trust strip, campaigns, category discovery, stores, ordering help, about, canonical product rails when published data exists.
- app/produk/[slug]/page.tsx: donor canonical product resolver; removed brochure static product override and release disable switch.
- app/tentang/page.tsx: canonical storefront shell restored.
- app/sitemap.ts and lib/public-routes.ts: donor canonical commerce routes and published-product sitemap generation restored.
- middleware.ts: removed only later five-page public allowlist; Admin middleware equals donor because the only later changes in this file were public gating.
- CustomerAuthProvider: removed only brochure route bypass; all customer authentication logic retained.
- app/produk/page.tsx: redirects to canonical /koleksi instead of duplicating catalog truth.
- app/layout.tsx: retained current local Geist font, updated brand metadata and Preview noindex. These are compatible with donor architecture.
- app/globals.css: canonical first 3304 lines already match donor. Additional brochure-scoped rules remain for secondary information routes and do not style the storefront.
- PublicPage, header, mobile, PublicProductCard, ProductCatalog, CollectionCommerceExperience, CategoryCommercePage, CategoryCommerceCatalog, CartProvider: unchanged from donor; no replacement necessary.
- Brochure modules and /layanan, /kontak remain as secondary information pages; no longer own homepage, catalog or PDP. src/config/site.ts is still a lib/site.ts dependency, so it was retained. Static brochure products remain empty and are not a PIM source.
- Updated former brochure takeover tests to the restored storefront contracts. Retained newer local-font assertions and Preview noindex test.

## Preserved authority

No Admin, API, W3 workspace, inventory, pricing, payment, order, migration or database source was reverted. PIM publication and missing-product behavior remain canonical. No sample product was created. The former five-URL/no-commerce release restriction is superseded by the owner's complete-storefront instruction; donor consultation links are restored as supporting communication.

## Local visual evidence

Final browser suite passed one complete matrix scenario: /, /koleksi, /kaos-polos, /cart, /account at 390, 768, 1440, 1920. HTTP 200, shared navigation visible, no brochure shell, no horizontal overflow, no broken loaded images, no console/page errors. Menu open/Escape-close and bottom-nav collection/login navigation passed. Guest account redirects to login and cart to its canonical basket surface. Twenty screenshots are retained under .debroder-backups/storefront-20261004/screenshots/.

The local runtime has no active PIM/Auth configuration. Catalog therefore exercises the existing empty state; CMS images use existing brand fallbacks. Featured/Trending/Fresh Drop implementation is restored but product-backed sections require real published content. No valid canonical product was available, so a populated PDP and product-card interaction remain NOT VERIFIED. Authenticated account and checkout/payment submission remain NOT RUN. No fabricated fixtures or Supabase mutations were used.

Initial exploratory browser capture was interrupted by an account redirect; final browser suite handled the redirect and passed. Initial dev logs included a cached staging image request rejected with EACCES; final browser matrix had zero console/image errors. This is local visual evidence, not production or staging acceptance.

Typecheck passed. Lint passed with 0 errors/36 existing warnings. Full Vitest ran with 1062 passed/5 failed: three previously recorded migration/replay newline assertions plus two obsolete Google-font assertions. Both font assertions were corrected to the preserved local font and their 11-test targeted rerun passed. Full suite was not repeated. Three migration/replay failures remain open. See handoff for final build result.

No push, deployment, Vercel env, DNS, domain attachment, Supabase data mutation or production DB action. Owner visual review is the next gate.
