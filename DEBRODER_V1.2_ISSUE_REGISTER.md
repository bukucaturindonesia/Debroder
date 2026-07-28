# DEBRODER V1.2 ACTIVE ISSUE REGISTER

Last updated: 28 July 2026 (Asia/Makassar)

## P0-001 — Conflicting active governance documents

- Severity: BLOCKER
- Status: **CLOSED — VERIFIED**

## P0-002 — Local/platform artifacts tracked by Git

- Severity: HIGH
- Status: **CLOSED — VERIFIED**

## P0-003 — P15 database application and verification

- Severity: BLOCKER / PACKAGE GATE
- Status: **CLOSED — DATABASE AND LOCAL SOURCE VERIFIED; COMMIT/PUSH PENDING**
- Migration `20260727073246_p15_zero_balance_matrix_completion_v1` is remotely applied.
- All six P15 integrity counters are zero.
- Source sync and local gates must pass before P15 CHECKPOINT.

## P15-001 — Duplicate local primary P15 migration

- Severity: HIGH MIGRATION SAFETY
- Status: **CLOSED — VERIFIED**
- The unapplied duplicate `20260724041102...` is removed.
- Applied canonical primary `20260724054241...` is retained.

## P15-002 — Existing Supabase advisor backlog

- Severity: MAJOR SECURITY/PERFORMANCE
- Status: **OPEN — FINAL INTEGRATION**
- Existing findings include mutable search paths outside P15, broad privileged function exposure, RLS tables without policies, public storage buckets, leaked-password protection disabled, unindexed foreign keys, duplicate/permissive policies, and duplicate indexes.
- P15 introduced no new package-specific advisor finding.
- The backlog must be triaged before GO.

## P0-004 — Official legal content unavailable

- Severity: MAJOR CONTENT DEPENDENCY
- Status: **OPEN — OWNER LEGAL CONTENT REQUIRED**

## P0-005 — Homepage CMS link `/kaos-polo` returns 404

- Severity: HIGH
- Status: **OPEN — OWNER CMS CORRECTION REQUIRED**

## P0-006 — Public performance not proven on Preview

- Severity: MAJOR
- Status: **OPEN — PREVIEW VERIFICATION REQUIRED**

## P0-007 — Real remote Instant Custom transaction not proven

- Severity: HIGH E2E RISK
- Status: **OPEN — REMOTE E2E REQUIRED**

## P0-008 — Unlinked `Mix Size` SKU

- Severity: DATA INTEGRITY
- Status: **OPEN — EXCLUDED FROM AUTOMATIC SIZE POLICY**

## UI-UX-001 — Public global shell and icon asset recovery

- Severity: MAJOR UX CONSISTENCY
- Status: **IMPLEMENTED; STATICALLY VERIFIED; RUNTIME VERIFICATION REQUIRED**
- Shared shell and owner-icon paths pass regression and build gates.
- Browser runtime did not start because of a duplicate Windows environment key.

## PRICE-001 — Canonical trial pricing migration pending

- Severity: MAJOR COMMERCE DATA ALIGNMENT
- Status: **IMPLEMENTED LOCALLY; REMOTE APPLICATION PENDING**
- Local policy, migration tests, and build pass.
- `20260728153142_canonical_trial_pricing_v1.sql` is not remotely applied.

## MEDIA-001 — Ambiguous owner product-image mapping

- Severity: MAJOR PIM CONTENT RISK
- Status: **OPEN — OWNER/PIM IDENTITY REVIEW REQUIRED**
- `89` valid images remain staging-only because their evidence does not uniquely
  identify a canonical PIM product.
- No ambiguous image was mapped or activated.
- `12` Crewneck assets were copied hash-identically; only black/front is
  prepared as primary in the pending migration.

## Release decision

**NO-GO / NOT COMPLETE**

## PRODUCT-001 — Canonical product publication and runtime gate

- Severity: **BLOCKER**
- Status: **OPEN — DATABASE EXECUTED; PUBLICATION/RUNTIME INCOMPLETE**
- Remote canonical identity/price/content migrations are applied.
- `12` product records and `3` service records match canonical names/prices.
- All `662` valid physical sellables have aggregate active nonlegacy stock
  exactly `100`; duplicate SKU and opening movements are zero.
- Only `2` physical products and `0` Jersey products are public-active.
- Nine product/Jersey records lack a proven primary image.
- Per-product runtime matrix is not verified.

## PRODUCT-002 — ProductRow sales-mode fixture mismatch

- Severity: **BUILD BLOCKER**
- Status: **OPEN — CYCLE LIMIT REACHED**
- `pnpm.cmd typecheck` fails at
  `test/page-owned-category-pdp-isolation.test.ts:10`.
- The fixture permits `sales_mode: undefined`, while canonical `ProductRow`
  requires `ready_stock | custom | both | null`.
- No Cycle 3 correction was made.

## PRICE-001 update — 29 July 2026

- Status: **CLOSED — REMOTE APPLICATION VERIFIED**
- `canonical_trial_pricing_v1` is present in remote migration history.
