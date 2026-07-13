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

## Closed in Phase 12

- V12-010 — Local dependency-based quality gates were previously blocked. Dependencies were installed for verification; typecheck, lint, test, and build now run successfully.
- V12-012 — Phase 11 deployment verification was treated as completed per owner instruction that Phase 11 is finished.
- V12-015 — Phase 12 database/source uncertainty. Resolved by checking remote migration history and live notification tables/RPCs before coding; no migration was reapplied.
- V12-016 — Existing Phase 10 static contract expected `Upload Bukti QC`. Restored the label without changing Phase 10 workflow.
