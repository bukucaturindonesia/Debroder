# DEBRODER v1.2 Issue Register

| ID | Severity | Phase | Issue | Status | Note |
|---|---:|---|---|---|---|
| V12-014 | Medium | 7–8 | Release to production depends on Work Items. | CLOSED IN PHASE 8 | Job Order release is gated by active Work Items being ready. |
| V12-015 | Medium | 8–9 | Local quality gates were previously unavailable. | MOSTLY CLOSED | Typecheck passed, lint passed with 0 errors, and 44/44 tests passed. Full build compilation passed; final page-data/build confirmation remains for Vercel. |
| V12-016 | Medium | 8 | Phase 8 UI required owner verification after deploy. | OWNER CONFIRMED | User supplied the repository after Phase 8 and stated the state was safe. |
| V12-017 | Medium | 9 | Production execution statuses were deferred from Phase 8. | CLOSED IN PHASE 9 | Start, hold, resume, cancel, progress, and `awaiting_qc` handoff are implemented. |
| V12-018 | Medium | 9 | Full sandbox build did not complete page-data collection. | OPEN UNTIL VERCEL | Compilation, type validation, and lint stage passed. The sandbox cannot reliably complete runtime/external page-data work. |
| V12-019 | Medium | 9 | Phase 9 production controls require owner browser verification. | OPEN | Verify dashboard, start, hold, resume, cancel reason, progress, and QC handoff on desktop/mobile. |
| V12-020 | Planned | 10 | QC decision and Work Item/Job Order completion are intentionally unavailable. | DEFERRED TO PHASE 10 | This is the required boundary, not a Phase 9 defect. |
