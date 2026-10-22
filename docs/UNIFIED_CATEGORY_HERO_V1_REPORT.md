# Unified Category Hero v1 — local verification

Date: 2026-10-05, Asia/Makassar. Branch: codex/unified-category-hero-v1.
Source commits: aec2380 (navigation), 67e9e37 (hero). Exact final HEAD and continuation state: CURRENT_PHASE_HANDOFF.md.
Status: IMPLEMENTED / LOCALLY VERIFIED for geometry; PARTIALLY VERIFIED for final artwork and populated commerce. NOT COMPLETE, NOT DEPLOYED, no owner GO.

## Previous issues and changes

- Split copy/image headers had different positions and dimensions. Jersey secondary navigation preceded its hero; Custom had no image hero.
- One server component, components/public/CategoryHero.tsx, now renders image-only artwork for all seven routes. Existing ResponsivePicture provides source selection, eager loading, optimizer/WebP support, and CMS fit/focal settings. No overlay CTA, visible heading, breadcrumb, gradient, or logo is added. Kaos retains its existing H1 in the following content section; the other six use a hidden H1 inside the hero.
- Reused approved Kaos CSS without changing its heights: desktop clamp(350px,30vw,420px), mobile clamp(240px,64vw,320px), breakpoint 767px. Shared following-content spacing is clamp(24px,2.5vw,40px).
- Removed CommercePageIntro and the above-hero JerseyChrome on /jersey. Preserved Jersey shop/configurator links below hero. Koleksi quick links are Kaos, Jaket, Headwear, Jersey. Headwear/Jaket type links remain product-backed.
- Screenshot review caught inherited section padding inside Jaket/Headwear heroes; excluded data-category-hero from that legacy rule and added actual image rectangle assertions.
- Custom uses a focused, cached, published/active page_heroes read and an existing Admin page-key option. No schema or database mutation.

## Locked navigation

Koleksi → Kaos Polos → Sablon DTF → Jersey → Custom → Jaket & Hoodie → Headwear.
Jersey links to /jersey. Desktop header, mobile drawer, and footer use the same source. Nested route active state remains under its category. Mobile Koleksi has a direct route link and separate submenu button.

## Verification actually executed

| Check | Result |
| --- | --- |
| pnpm typecheck/lint/test/build | BLOCKED before scripts by OneDrive node_modules realpath EPERM. No dependency reinstall attempted. |
| Direct installed TypeScript CLI | EXECUTED AND PASSED; final Next build also checked types. |
| Direct ESLint | EXECUTED AND PASSED, 0 errors / 35 existing warnings. Temporary baseline-script lint errors were removed with the completed scratch script. Final E2E file lint passed. |
| Full Vitest | Initial run: 154 files passed, 1 failed; 1068/1069 tests passed. Failure correctly rejected a full-content read in Custom. |
| Correction verification | Replaced full-content read with focused hero reader; affected 9-test architecture suite passed. New CMS reader suite 4/4 passed after fixing its test clock. Focused navigation/public-page/hero run 19/19 passed. Previously passed suites were not repeated, per owner instruction. No final full-suite rerun claim. |
| Production build | EXECUTED AND PASSED, 142/142 pages. Initial nullable CMS prop failure was corrected; final build includes the CSS padding fix. |
| Browser geometry | EXECUTED AND PASSED, 56 combinations (7 routes × 1600/1440/1280/1024/768/430/390/360). Actual image rect and hero container match, as do top/width/height/radius/fit/position/following gap. HTTP 200, no horizontal overflow, no console/page errors. |
| Kaos visual regression | Hero screenshot pixels identical at all 8 widths against captured pre-change baseline. Matched warm image cache to baseline to avoid optimizer-resolution false differences. |
| Browser interactions | Drawer order, direct Koleksi navigation, Jersey active state passed. Dedicated mobile/desktop source selection passed at 390/767/768/1440 using isolated browser media fixtures and production picture markup. No CMS data was changed. |
| Diff | git diff --check passed; ProductCatalog, catalog model/data-access, schema/migrations, package and lockfile unchanged. |

Browser retries corrected test selectors (hidden streaming markup/footer column), waited for the existing DTF reveal animation, and matched the baseline image-cache condition. Final geometry run: 8/8 tests passed. Earlier drawer/source tests: 2/2 passed and not rerun.

## Screenshots

[Desktop comparison](C:/Users/gknma/.codex/visualizations/2026/10/05/01a109f4-c1ad-7662-833a-556e797e8b43/unified-category-hero-v1/comparison-1440.png) · [Mobile comparison](C:/Users/gknma/.codex/visualizations/2026/10/05/01a109f4-c1ad-7662-833a-556e797e8b43/unified-category-hero-v1/comparison-390.png)

| Route | Desktop | Mobile |
| --- | --- | --- |
| /kaos-polos | [1440px](C:/Users/gknma/.codex/visualizations/2026/10/05/01a109f4-c1ad-7662-833a-556e797e8b43/unified-category-hero-v1/kaos-polos-1440.png) | [390px](C:/Users/gknma/.codex/visualizations/2026/10/05/01a109f4-c1ad-7662-833a-556e797e8b43/unified-category-hero-v1/kaos-polos-390.png) |
| /koleksi | [1440px](C:/Users/gknma/.codex/visualizations/2026/10/05/01a109f4-c1ad-7662-833a-556e797e8b43/unified-category-hero-v1/koleksi-1440.png) | [390px](C:/Users/gknma/.codex/visualizations/2026/10/05/01a109f4-c1ad-7662-833a-556e797e8b43/unified-category-hero-v1/koleksi-390.png) |
| /sablon-dtf | [1440px](C:/Users/gknma/.codex/visualizations/2026/10/05/01a109f4-c1ad-7662-833a-556e797e8b43/unified-category-hero-v1/sablon-dtf-1440.png) | [390px](C:/Users/gknma/.codex/visualizations/2026/10/05/01a109f4-c1ad-7662-833a-556e797e8b43/unified-category-hero-v1/sablon-dtf-390.png) |
| /jersey | [1440px](C:/Users/gknma/.codex/visualizations/2026/10/05/01a109f4-c1ad-7662-833a-556e797e8b43/unified-category-hero-v1/jersey-1440.png) | [390px](C:/Users/gknma/.codex/visualizations/2026/10/05/01a109f4-c1ad-7662-833a-556e797e8b43/unified-category-hero-v1/jersey-390.png) |
| /custom | [1440px](C:/Users/gknma/.codex/visualizations/2026/10/05/01a109f4-c1ad-7662-833a-556e797e8b43/unified-category-hero-v1/custom-1440.png) | [390px](C:/Users/gknma/.codex/visualizations/2026/10/05/01a109f4-c1ad-7662-833a-556e797e8b43/unified-category-hero-v1/custom-390.png) |
| /jaket-hoodie | [1440px](C:/Users/gknma/.codex/visualizations/2026/10/05/01a109f4-c1ad-7662-833a-556e797e8b43/unified-category-hero-v1/jaket-hoodie-1440.png) | [390px](C:/Users/gknma/.codex/visualizations/2026/10/05/01a109f4-c1ad-7662-833a-556e797e8b43/unified-category-hero-v1/jaket-hoodie-390.png) |
| /headwear | [1440px](C:/Users/gknma/.codex/visualizations/2026/10/05/01a109f4-c1ad-7662-833a-556e797e8b43/unified-category-hero-v1/headwear-1440.png) | [390px](C:/Users/gknma/.codex/visualizations/2026/10/05/01a109f4-c1ad-7662-833a-556e797e8b43/unified-category-hero-v1/headwear-390.png) |

Each report-WIDTH.json in the same artifact directory records measured rectangles, image source, Kaos pixel comparison, and errors. Baseline files are before-kaos-*.png and baseline.json. Screenshots/contact sheets were visually inspected.

[Local preview](http://localhost:3104/kaos-polos) — local Next production server, not a deployment.

## Deliberately unchanged

ProductCatalog source/filter/sort/URL behavior; universal /produk/[slug]; PIM product, price, SKU, stock and variants; cart, checkout, payment, order, quotation, upload and configurator flow; database, RLS, migration history; dependencies. No push or staging/production deployment.

## Remaining limits and exact next action

The local environment serves fallback square brand artwork, no PIM cards, and an empty Custom category list. The fallback logo is cropped by the approved cover behavior, including the unchanged Kaos baseline. These screenshots do not prove final owner artwork readability or populated catalog/transaction behavior.

The requested 1080×1350 mobile asset is a source format; the approved master container is not 4:5. The owner explicitly prioritized preserving Kaos geometry, so it was not changed to a portrait container. Final banner safe areas/crop acceptance remain open; changing Kaos height or fit needs an explicit owner decision. No AI image or fake product was created.

Next: owner reviews the local seven-route comparison, then supplies/publishes final desktop/mobile artwork in the existing CMS and selects a safe populated environment for remaining content/commerce checks. Continue v1.2 audit; no v1.3 or release GO.

## Changed source/test files

app/custom/page.tsx; app/globals.css; app/jersey/page.tsx; app/koleksi/page.tsx; app/sablon-dtf/page.tsx; components/CategoryCommerceCatalog.tsx; components/CategoryCommercePage.tsx; components/CollectionCommerceExperience.tsx; components/CommercePageIntro.tsx (removed); components/KaosPolosEditorialExperience.tsx; components/ServiceCatalog.tsx; components/admin/AdminDashboard.tsx; components/custom/CustomHub.tsx; components/header/SiteHeaderClient.tsx; components/jersey/JerseyExperience.tsx; components/public/CategoryHero.tsx; lib/fallback-data.ts; lib/public-data.ts; lib/public-shell/domain.ts; lib/public-category-hero.ts; lib/public-primary-navigation.ts; test/kaos-polos-editorial-commerce.test.ts; test/public-page-experience-v2.test.ts; test/public-category-hero.test.ts; e2e/unified-category-hero.spec.ts; this report. Governance checkpoint files are updated separately.
