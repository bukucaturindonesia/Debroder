# DEBRODER V1.2 ACTIVE ISSUE REGISTER

Last updated: 26 July 2026 (Asia/Makassar)

This root file contains current release blockers and P0 closure evidence. Historical findings remain available through Git history and archived reports under `docs/history/` or `docs/`.

## P0-001 — Conflicting active governance documents

- Severity: BLOCKER
- Status: **CLOSED — VERIFIED**
- Resolution: one canonical set of root status files is active.
- Former `docs/` status documents are archived under `docs/history/`.
- Compatibility pointer files under `docs/` explicitly redirect readers to root authority.

## P0-002 — Local/platform artifacts tracked by Git

- Severity: HIGH
- Status: **CLOSED — VERIFIED**
- Affected paths: `.vercel/`, `.debroder-backups/`, `PUBLIC_EXPERIENCE_BATCH4B_SOURCE.zip`.
- Resolution: removed from Git tracking and protected by permanent `.gitignore` rules.

## P0-003 — P15 database application and verification

- Severity: BLOCKER / PACKAGE GATE
- Status: **OPEN — NOT PROVEN**
- Source and migration exist, but remote migration application, zero-violation postchecks, RLS/function ACL checks, and database advisors must be proven before P15 PASS.

## P0-004 — Official legal content unavailable

- Severity: MAJOR CONTENT DEPENDENCY
- Status: **OPEN — OWNER LEGAL CONTENT REQUIRED**
- Terms, privacy, returns, shipping, payment policy, effective dates, and legal versions require approved owner content.

## P0-005 — Homepage CMS link `/kaos-polo` returns 404

- Severity: HIGH
- Status: **OPEN — OWNER CMS CORRECTION REQUIRED**
- Correct the canonical CMS target or approve the intended route, then rerun integration checks.

## P0-006 — Public performance not proven on Preview

- Severity: MAJOR
- Status: **OPEN — PREVIEW VERIFICATION REQUIRED**
- Local development evidence previously recorded slow LCP. Preview measurements and an approved correction are required before GO.

## P0-007 — Real remote Instant Custom transaction not proven

- Severity: HIGH E2E RISK
- Status: **OPEN — REMOTE E2E REQUIRED**
- Source, tests, and local flow passed, but a real remote order and downstream operational execution remain unproven.

## P0-008 — Unlinked `Mix Size` SKU

- Severity: DATA INTEGRITY
- Status: **OPEN — EXCLUDED FROM AUTOMATIC SIZE POLICY**
- One draft SKU lacks canonical `size_id`; do not guess or mutate it without proven mapping or owner decision.

## Release decision

**NO-GO / NOT COMPLETE** until all BLOCKER items are closed and all required security checks, database verification, Preview/browser E2E, deployment verification, and owner approval are proven.
