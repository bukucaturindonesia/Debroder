# Vercel build diagnosis — 2026-10-04

Owner log identifies branch release/debroder-id-v1, deployed SHA 3abb46d, pnpm 10.12.4 and Next 15.5.19. Failure occurs in prebuild -> verify -> typecheck, before compilation: e2e/brochure.spec.ts line 18 accesses complete/naturalWidth/src on HTMLElement | SVGElement.

Fix: narrow elements inside the browser callback with image instanceof HTMLImageElement and an explicit type predicate. The image check remains active; no test/typecheck exclusion or build-script bypass was added.

Local checkout separately contained five unresolved conflicts from a stale brochure stash. Original content was saved under .debroder-backups/build-error-20261004/ with .snapshot extensions. Homepage and /produk redirect match HEAD exactly after resolution. Compatible staged brochure additions and service edits were retained. Brochure Custom navigation now points to canonical /custom; optional priceFrom retained for compatibility with the existing secondary detail component. No hardcoded products restored. Git unmerged index entries cleared.

Verification:
- First attempted generic evaluateAll annotation failed; replaced with the type predicate.
- Typecheck then passed in the actual pnpm run build prebuild chain.
- Lint initially found merge markers in backup copies, not active source; renamed backup extensions. Rerun passed with 0 errors/36 warnings.
- Full tests: 1064 passed / 3 failed. Failures were existing LF-vs-CRLF literal assertions. Normalize CRLF only when those three tests read files; SQL, migrations and expected semantics unchanged. Targeted three-file rerun: 33/33 passed. Passed files not rerun.
- Production next build result is recorded in the final handoff and .debroder-backups/build-error-20261004/next-build.log.

No Vercel environment change, commit, push, redeploy, database mutation or migration execution. Vercel connector only exposes unrelated OKDEAL/zero projects; authoritative error evidence is the owner's pasted deployment log. Remote correction is not yet deployed. Separate staged work must be reviewed before selecting a commit payload.
