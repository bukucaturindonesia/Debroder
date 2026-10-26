# Fast Checkout QA evidence

26 October 2026. **MOCK PASS / LOCAL RUNTIME PASS; real provider SANDBOX BLOCKED.**

## Executed gates

| Gate | Current result | Evidence |
|---|---|---|
| Full Vitest | EXECUTED AND PASSED: 159 files / 1117 tests | fast-full-tests.json |
| TypeScript | EXECUTED AND PASSED, exit 0 | fast-typecheck-output.txt (empty on success) |
| ESLint | EXECUTED AND PASSED: 0 errors / 35 existing warnings | fast-lint.json |
| Complete npm build chain | EXECUTED AND PASSED through `npx --yes pnpm@10.12.4 exec npm run build`; prebuild verify + Next build, 145/145 pages | fast-package-build-output.txt |
| Browser | EXECUTED AND PASSED: 15 tests (9 Fast + 6 legacy regression), 0 skipped/flaky/failing | fast-browser-all-results.json |
| Actual Midtrans Sandbox | BLOCKED — keys/dashboard/public callback host unavailable | No provider request made |
| Actual RajaOngkir | BLOCKED — account key/origin not configured | No cost API request made |
| Full-schema staging migration/UAT | BLOCKED — candidate not applied and migration drift unresolved | Candidate DO NOT RUN |

The final complete package build was rerun after the empty-state fix and includes the current 1117-test regression. The final standalone result is also saved above. Formatting/selector changes do not establish new provider evidence.

Browser widths **320, 360, 390, 430, 768, 1024, 1440**. Each happy-path test uses browser-only fixture cart and intercepted provider/API responses on the real local production UI. It fills recipient/address, searches/selects destination, selects a real-shaped courier quote, checks total, focus and overflow, triggers two immediate submit clicks, asserts one order request, invokes fake Snap success, verifies server-unpaid remains unpaid, reloads, and resumes the same saved order. Additional tests cover shipping HTTP 503 retaining address/cart across reload with payment disabled, and real anonymous Admin-settings mutation denial (401).

Seven screenshots are in `evidence/checkout-<width>.png`. Representatives 320/390/1440 were visually inspected; other widths had automated checks. Happy-path page and console errors were zero. Native phone keyboard/screen reader/specific device popup behavior, real logged-in prefill, activated pickup, and provider widgets were **NOT RUN**. No human 60–90-second task-time experiment was performed; automated duration is not that benchmark.

## Failure → diagnosis → correction → evidence

1. Initial typecheck rejected guessed cart price/image props. Existing CartProvider contract was inspected; canonical cartItemSubtotal/imageUrl/SafeImage API reused. Typecheck passed without weakening settings.
2. First local SQL run failed because fixture legacy stubs used unqualified table names under the production functions' empty search_path. Qualified fixture names, then SQL tests passed. Actual legacy functions remain outside this fixture's proof.
3. Full regression caught missing candidate classification in replay manifest. Added DO NOT RUN entry without changing any old migration; full suite passed.
4. Isolated Git clone originally placed under backup directory was unintentionally scanned by lint (9 errors/70 warnings). Moved the clone outside source tree; no lint suppression/global safe.directory weakening. Final lint returned 0 errors/35 original warnings. Git owner-context commands were used for the owner-created clone.
5. Browser assertions first failed on Rupiah whitespace, a Next route-announcer alert collision, and label matching of controlled textarea contents. Corrected assertions to semantic role/value selectors; no data-preservation requirement removed. `fast-browser-before-selector-fix.json` retains the failed 8/9 iteration; focused negative probe and final 9/9 passed.
6. Empty-cart regression with the fast switch enabled exposed an unnecessary config request returning 503 without staging configuration. The request is now deferred until a cart or recoverable session exists. This was an application fix; the legacy route matrix was rerun on the rebuilt app and all 15 combined browser tests passed.
7. Screenshot capture was moved to page top so fixed header is represented correctly; source header behavior was not changed.

Behavioral tests supplement existing source-string checks. Evaluation was performed by one AI and is not independent review. Mock SQL legacy boundaries and mocked UI provider responses are explicitly separated from provider/database acceptance.
