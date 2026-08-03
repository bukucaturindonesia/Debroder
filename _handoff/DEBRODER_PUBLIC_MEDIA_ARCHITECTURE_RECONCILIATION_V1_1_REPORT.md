# DEBRODER — PUBLIC MEDIA ARCHITECTURE RECONCILIATION V1.1

## FINAL IMPLEMENTATION REPORT

**Execution date:** 3 August 2026  
**Source:** immutable repository snapshot supplied by owner  
**Working copy:** separate copy; original snapshot was not modified  
**Package discipline:** targeted change, changed files only, no dependency edit, no commit, no push, no deploy

---

# A. EXECUTIVE VERDICT

```text
BLOCKED WITH EVIDENCE
```

The targeted implementation is complete at source-code level and passed the available static inspections. The package cannot be declared fully PASS because the supplied snapshot has no `.git` directory, no `node_modules`, and no available `pnpm` executable. Database staging and runnable Next.js runtime were also unavailable.

This report deliberately does **not** claim quality gate PASS, database verification, or runtime verification.

---

# B. CLEAN BASELINE

| Evidence | Result |
|---|---|
| Git metadata | Not available; snapshot has no `.git` directory |
| Branch | Not determinable |
| Original protection | Original snapshot retained unchanged; implementation used a separate working copy |
| `node_modules` | Not present |
| `pnpm` / `pnpm.cmd` | Not available |
| Declared package manager | `pnpm@10.12.4` |
| Dependency install | Not attempted again, per owner instruction |
| `package.json` | Unchanged — `8fd2cb4ae8c7d1d57cd849b7eba853ce408aca4556c7d4bc06db4e855e67a5f5` |
| `pnpm-lock.yaml` | Unchanged — `3a74fa13e68180881e4bab9774ac37ebb82b9ad53c2cbfd34f45f2eb2f520590` |
| Changed files | **57** |
| Whitespace errors | **0** |

Because Git metadata is absent, clean-baseline proof uses SHA-256 comparison between the immutable original snapshot and the working copy.

---

# C. ROOT CAUSE

1. Public media resolution previously accepted only a media value and a generic fallback, without an explicit slot contract.
2. Social assets (`social-preview.png` and `open-graph-logo.png`) were reused as product, hero, category, service, store, About, and campaign fallbacks.
3. Responsive components frequently reused the desktop image or desktop fallback for mobile despite a different required ratio.
4. Homepage plain-category content was reconstructed from Featured/category content rather than reading its existing independent `homepage_section_items` configuration.
5. Custom hero used category/pathway content instead of the existing `page_heroes` model.
6. About homepage and `/tentang` shared one media binding despite requiring 4:3 and 4:5 respectively.
7. Service detail visual had no independent 4:3 field and therefore relied on page hero media.
8. Admin guidance, crop ratios, client validation, server validation, and frontend ratios were not driven by one registry.
9. Image upload paths still trusted browser-side checks in several product/media flows.
10. Jersey admin retained one universal portrait fallback even for wide campaign sections.

---

# D. MEDIA SLOT MAP

| Public area | Desktop contract | Mobile contract | Final source | Final missing behavior |
|---|---:|---:|---|---|
| Product primary/catalog | 4:5 | 4:5 | Product/variant media | Product slot fallback; new publish validation still requires primary media |
| Product gallery | 4:5 | 4:5 | Variant gallery | Hide missing gallery item |
| Category cards | 4:5 | 4:5 | Category or explicit homepage item | Category slot fallback |
| Trending | 4:5 | 4:5 | Independent homepage items | Hide item when required media is unavailable |
| Homepage hero | 16:7 | 4:5 | `hero_banners.image_url` / `mobile_image_url` | Separate desktop/mobile fallback |
| Featured | 5:4 | 4:5 | Existing homepage item desktop/mobile fields | Hide item or use matching slot fallback |
| Homepage campaign | 16:7 | 4:5 | CMS campaign desktop/mobile fields | Separate campaign fallbacks |
| Instagram banner | 12:5 | 4:5 | `instagram_banners` | Dedicated Instagram fallbacks |
| Page hero | 12:5 | 4:5 | `page_heroes` | Separate page hero fallbacks |
| Service detail | 4:3 | 4:3 | New nullable `page_heroes.detail_*` fields | Dedicated service-detail fallback |
| Store | 4:3 | 4:3 | Store media | Store fallback |
| About homepage | 4:3 | 4:3 | Existing `trust_about_content.image_url` | About landscape fallback |
| About page | 4:5 | 4:5 | New nullable `trust_about_content.about_page_*` fields | About portrait fallback |
| Custom hero | 12:5 | 4:5 | Existing `page_heroes` row with `page_key = 'custom'` | Dedicated Custom desktop/mobile fallbacks |
| Custom pathway/inspiration | 4:5 | 4:5 | Existing category/config models | Portrait slot fallbacks only |
| Custom preset | 4:3 | 4:3 | Existing preset media | Custom preset fallback |
| Open Graph | 1.91:1 | 1.91:1 | Social metadata only | Open Graph asset only |

---

# E. MEDIA REGISTRY

Canonical registry: `lib/public-media.ts`

The registry now controls:

- canonical ratio and numeric ratio;
- recommended and minimum dimensions;
- allowed MIME types;
- recommended and technical file size;
- slot-specific fallback;
- missing-media behavior;
- focal-point support;
- responsive pair;
- responsive compatibility permission.

Canonical ratios present:

```text
4:5
16:7
12:5
5:4
4:3
1.91:1
```

Resolver order:

```text
1. Valid slot media
2. Responsive counterpart only when the contract explicitly allows it
3. Legacy media only when the source and target ratios are compatible
4. Slot-specific fallback
5. Hidden/block-publish behavior
```

Unconfigured external URLs, `/public/...`, traversal paths, empty values, and social assets in non-Open-Graph slots are rejected.

---

# F. FILES CHANGED

### Canonical registry, resolver, defaults
- `lib/public-media.ts`
- `lib/site-media.ts`
- `lib/fallback-data.ts`

### Server validation and product media
- `app/api/admin/media/upload/route.ts`
- `app/api/admin/media/settings/route.ts`
- `lib/product-media-upload.ts`
- `lib/product-media-server.ts`

### Admin CMS/PIM
- `components/admin/AdminDashboard.tsx`
- `components/admin/FocalPointEditor.tsx`
- `components/admin/HomepageSectionsAdmin.tsx`
- `components/admin/JerseyExperienceAdmin.tsx`
- `components/admin/MediaLibrary.tsx`
- `components/admin/PimManagerAdmin.tsx`
- `components/admin/SiteMediaSettingsAdmin.tsx`
- `components/admin/VariantGalleryManager.tsx`

### Public frontend and responsive rendering
- `app/custom/page.tsx`
- `app/page.tsx`
- `app/tentang/page.tsx`
- `components/CampaignBanners.tsx`
- `components/CartProvider.tsx`
- `components/custom/CustomHub.tsx`
- `components/custom/CustomProjectBuilder.tsx`
- `components/HeroSlider.tsx`
- `components/jersey/JerseyExperience.tsx`
- `components/JerseyCatalog.tsx`
- `components/PublicInstagramBanner.tsx`
- `components/PublicPage.tsx`
- `components/ResponsivePicture.tsx`
- `components/ServiceCatalog.tsx`

### Public data and types
- `lib/public-data.ts`
- `lib/jersey-experience.ts`
- `lib/types.ts`

### Database/schema
- `supabase/admin-managed-site-media.sql`
- `supabase/migrations/20260803095600_public_media_architecture_reconciliation_v1.sql`
- `supabase/schema.sql`
- `supabase/sync-jersey-categories-to-admin.sql`

### Fallback assets
- `public/debroder/fallback/fallback-about-landscape-4x3.svg`
- `public/debroder/fallback/fallback-about-portrait-4x5.svg`
- `public/debroder/fallback/fallback-campaign-desktop-16x7.svg`
- `public/debroder/fallback/fallback-campaign-mobile-4x5.svg`
- `public/debroder/fallback/fallback-category-4x5.svg`
- `public/debroder/fallback/fallback-custom-hero-desktop-12x5.svg`
- `public/debroder/fallback/fallback-custom-hero-mobile-4x5.svg`
- `public/debroder/fallback/fallback-custom-preset-4x3.svg`
- `public/debroder/fallback/fallback-editorial-4x5.svg`
- `public/debroder/fallback/fallback-featured-desktop-5x4.svg`
- `public/debroder/fallback/fallback-homepage-hero-desktop-16x7.svg`
- `public/debroder/fallback/fallback-homepage-hero-mobile-4x5.svg`
- `public/debroder/fallback/fallback-instagram-banner-desktop-12x5.svg`
- `public/debroder/fallback/fallback-instagram-banner-mobile-4x5.svg`
- `public/debroder/fallback/fallback-page-hero-desktop-12x5.svg`
- `public/debroder/fallback/fallback-page-hero-mobile-4x5.svg`
- `public/debroder/fallback/fallback-product-4x5.svg`
- `public/debroder/fallback/fallback-service-detail-4x3.svg`
- `public/debroder/fallback/fallback-store-4x3.svg`

### Tests and static verification
- `test/public-media-architecture.test.ts`
- `scripts/verify-public-media-architecture.mjs`

Complete path list and SHA-256 manifest are included in:

- `_handoff/CHANGED_FILES.txt`
- `_handoff/CHANGED_FILES_SHA256.txt`
- `_handoff/PATCH.diff`

---

# G. DATABASE AND MIGRATION EVIDENCE

## Existing schema inspected

### `public.page_heroes`

Existing fields already included:

```text
page_key
image_url
mobile_image_url
object_position
mobile_object_position
focal metadata
CTA metadata
```

Therefore **Custom hero needs no new table or Custom-specific column**. It uses the existing model through `page_key = 'custom'`.

Existing fields did **not** include an independent 4:3 service-detail binding. Code requiring this binding:

- `components/PublicPage.tsx`
- `lib/public-data.ts`
- `components/admin/AdminDashboard.tsx`

### `public.trust_about_content`

Existing media fields were:

```text
image_url
mobile_image_url
```

Those fields already represent the homepage About media. No separate 4:5 About-page binding or mobile crop metadata existed. Code requiring the independent binding:

- `app/tentang/page.tsx`
- `lib/public-data.ts`
- `components/admin/AdminDashboard.tsx`

### `public.homepage_section_items`

Existing fields already included:

```text
custom_image_url
custom_mobile_image_url
custom_image_alt
custom_object_fit
custom_object_position
```

Therefore plain-category media requires **no migration** and now reads these existing independent fields.

## Migration decision

```text
Migration required: YES
Migration created: YES
Migration applied: NO
Database verification: NOT VERIFIED
```

Migration:

`supabase/migrations/20260803095600_public_media_architecture_reconciliation_v1.sql`

It adds only:

- nullable/service-detail media and crop fields to `page_heroes`;
- nullable/About-page portrait media and separate desktop/mobile crop fields to `trust_about_content`.

It does not insert a Custom row, seed fake media, delete data, drop a table, or drop a column.

Verification queries are included as SQL comments but were not run because no safe development/staging database connection was available.

---

# H. FALLBACK RECONCILIATION

| Old behavior | New behavior |
|---|---|
| Social preview used across public slots | Social media is accepted only by `openGraph` |
| One product/logo fallback reused everywhere | Product, category, editorial, store, About, hero, campaign, detail, and Custom have separate fallbacks |
| Desktop fallback reused on mobile | Desktop/mobile fallbacks are passed separately |
| Page hero reused as service detail | Independent nullable detail binding plus 4:3 fallback |
| About homepage reused on `/tentang` | Independent landscape and portrait bindings |
| Category used as Custom hero | Existing `page_heroes` model is used for Custom hero |
| Featured/categories rebuilt plain-category | Existing custom homepage items are used explicitly |
| Jersey wide sections could receive portrait fallback | Jersey fallback now follows section type and ratio in public resolver and admin |

Nineteen dedicated local fallback SVGs were added. Their declared width, height, and viewBox were statically validated.

---

# I. ADMIN–FRONTEND CONTRACT

- **Product:** 4:5; recommendation 2000 × 2500 px; WebP/sRGB guidance; server-authoritative validation.
- **Category/editorial:** 4:5.
- **Homepage hero:** 16:7 desktop and 4:5 mobile.
- **Featured:** 5:4 desktop and 4:5 mobile.
- **Campaign:** 16:7 desktop and 4:5 mobile.
- **Instagram banner:** 12:5 desktop and 4:5 mobile.
- **Page hero:** 12:5 desktop and 4:5 mobile.
- **Service detail:** 4:3.
- **About homepage:** 4:3.
- **About page:** 4:5 with separate mobile crop metadata.
- **Store:** 4:3.
- **Custom hero:** existing page-hero model, 12:5 desktop and 4:5 mobile.
- **Custom preset:** 4:3.
- **Open Graph:** 1.91:1 and metadata-only.

Crop editor supports all canonical ratios and normalizes the legacy `4:5-mobile` value to canonical `4:5` without discarding existing focal data.

---

# J. SECURITY VERIFICATION

Implemented:

- Zod validation on admin media endpoints;
- `requirePhase13Actor(request, "content.manage")` authorization;
- server slot allowlist;
- byte-level PNG/JPEG/WebP format and dimension inspection;
- technical file-size enforcement;
- ratio and minimum-dimension enforcement;
- generated Storage paths;
- storage-path traversal rejection;
- replacement asset ownership/folder checks;
- unconfigured external host rejection;
- no arbitrary `/public/...` path;
- no social asset in non-Open-Graph slots;
- no service-role key added to the client;
- no RLS, bucket visibility, or dependency changes.

Static security checks passed, but runtime authorization and actual Supabase Storage behavior were not executed in this sandbox.

---

# K. TEST AND VERIFICATION RESULTS

## Focused tests written but not executed

File:

`test/public-media-architecture.test.ts`

It covers resolver behavior, fallback separation, ratios, path safety, upload contracts, product publish validation, About/Custom/plain-category/service independence, admin-server upload routing, Jersey slot behavior, schema transition, and non-destructive migration rules.

Vitest was not executable because dependencies are absent.

## Available static verification

| Check | Actual result |
|---|---:|
| Architecture verifier | **75/75 PASS** |
| Evidence hash | `9b27b58cdb40751879b10faced20141c34332e6705ddb5349292f7a38f743f54` |
| TypeScript/TSX files parsed | **707** |
| Syntax parse errors | **0** |
| Broken local imports | **0** |
| Focused assertion gaps | **0** |
| Resolver behavior execution | **9/9 PASS** |
| Changed files | **57** |
| Whitespace errors | **0** |
| Fallback SVGs validated | **19/19** |
| Dependency manifests modified | **NO** |

## Official quality gate

| Command | Status | Evidence |
|---|---|---|
| `pnpm.cmd vitest run <focused-media-test>` | NOT EXECUTED | `pnpm.cmd` and dependencies unavailable |
| `pnpm.cmd typecheck` | NOT VERIFIED | dependencies unavailable |
| `pnpm.cmd lint` | NOT EXECUTED | dependencies unavailable |
| `pnpm.cmd vitest run test/custom-commerce.test.ts` | NOT EXECUTED | dependencies unavailable |
| `pnpm.cmd test` | NOT EXECUTED | dependencies unavailable |
| `pnpm.cmd build` | NOT EXECUTED | dependencies unavailable |
| `git diff --check` | NOT EXECUTED | no `.git`; file-by-file whitespace inspection returned zero errors |

A global `tsc --noEmit` attempt exited `2` because project modules and type declarations cannot be resolved without `node_modules`. It produced 19865 cascading diagnostics, including 692 missing-module diagnostics and 16396 JSX cascade diagnostics. This is recorded as an environment limitation, not a typecheck PASS or an implementation FAIL.

---

# L. RUNTIME EVIDENCE

```text
RUNTIME NOT VERIFIED
```

The Next.js application could not be started because dependencies are absent. Therefore no claim is made for:

- browser rendering;
- network 404 verification;
- console/hydration verification;
- viewport screenshots;
- actual crop appearance;
- actual Supabase upload/replacement behavior.

Runtime verification must be performed in a full repository environment at desktop, laptop, tablet, and mobile sizes before owner approval.

---

# M. REMAINING LIMITATIONS

## Code

No known static blocker remains within the changed scope. Full project type/lint/test/build verification is still required.

## Database

Migration created but not applied or verified.

## Environment

No Git metadata, package manager executable, installed dependencies, connected staging database, or runnable Next.js runtime.

## Production data

Production media rows and actual published records were not changed or inspected directly.

## Owner assets

Dedicated fallbacks are structural placeholders only. Final photography still needs to be produced and assigned by slot.

## Runtime

Not verified.

---

# N. FINAL STATUS

```text
IMPLEMENTATION COMPLETED: YES
TESTS WRITTEN: YES
TESTS EXECUTED: NO
STATIC INSPECTION: PASS
QUALITY GATE: NOT VERIFIED
MIGRATION CREATED: YES
MIGRATION APPLIED: NO
DATABASE: NOT VERIFIED
RUNTIME: NOT VERIFIED
SECURITY CONTRACT PRESERVED: STATICALLY VERIFIED ONLY
COMMIT: NOT PERFORMED
PUSH: NOT PERFORMED
DEPLOY: NOT PERFORMED
READY FOR OWNER REVIEW: NO
```

The next execution environment must restore dependencies from the unchanged lockfile, apply the migration only to an authorized development/staging database, run the focused tests and full owner quality gate, then perform runtime verification. No production database operation is authorized by this package.
