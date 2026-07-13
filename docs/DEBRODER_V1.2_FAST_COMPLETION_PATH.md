# DEBRODER v1.2 — Fast Completion Path

The fastest safe path is sequential, one deployable package per phase, without repeating global audits.

1. **Phase 7 Foundation** — synchronize live SQL source, add Job Order routes, create/detail/edit/archive lifecycle, and stop safely at `Siap Dirilis`.
2. **Phase 7 Completion** — verify with one eligible order, close browser/build issues, then lock the phase.
3. **Phase 8 Work Item** — generate from order items/services, manual item, assignment, dependency, lifecycle, archive.
4. **Phase 9 Production Status** — open release/start/hold/resume/complete only after Work Items work.
5. **Phase 10 QC** — checklist templates, attempts, proof files, pass/fail/rework blockers.
6. **Phase 11 Shipping/Pickup** — fulfillment records, passed-quantity limits, proof of handover.
7. **Phase 12 Notification** — in-app events first; external providers stay disabled until credentials exist.
8. **Phase 13 Role & Audit** — one final security consolidation over all v1.2 modules.
9. **Phase 14 Repeat Order** — copy to a new quotation draft, never reuse approval/payment/production history.
10. **Final v1.2 Audit** — full end-to-end scenarios and owner checklist.

Efficiency rules:

- reuse the current execution state and issue register;
- never repeat the Phase 1–6 audit unless a regression appears;
- do not apply migrations already present remotely;
- use one atomic ZIP and one commit per phase;
- run focused checks while building, full quality gate once before each push;
- fix only blockers, security risks, data-integrity risks, and blueprint violations;
- do not expose a downstream action before its dependency is operational.
