# DEBRODER UX/UI Bab 3–9 Issue Register

## UXUI-001 — Public Jersey terminology

- Status: `CLOSED`
- Evidence: technical Configurator/quotation copy removed from public surfaces.

## UXUI-002 — Configured Jersey cannot complete checkout

- Severity: `BLOCKER`
- Status: `BLOCKED_WITH_EVIDENCE`
- Evidence: server pricing now uses canonical `configurator_based` product price,
  but `CheckoutClient` blocks configured items and `/api/checkout` has no
  configured-product transaction contract.
- Required next action: owner-approved checkout/API/database contract.

## UXUI-003 — Canonical primary-image identity incomplete

- Severity: `MAJOR`
- Status: `BLOCKED_WITH_EVIDENCE`
- Evidence: nine product/Jersey records lack proven primary images; 89 ambiguous
  owner assets remain unactivated.

## UXUI-004 — Active Jersey taxonomy incomplete

- Severity: `MAJOR`
- Status: `BLOCKED_WITH_EVIDENCE`
- Evidence: active `jersey-custom-pilot` has `subcategory_id = null`.

## UXUI-005 — Stale public fallback path

- Status: `CLOSED`
- Evidence: PNG/ICO references corrected from missing `/brand/debroder/*` to
  Git-tracked `/debroder/*`.

## UXUI-006 — Runtime/Preview evidence incomplete

- Severity: `MAJOR`
- Status: `BLOCKED_WITH_EVIDENCE`
- Evidence: eight viewport checks have no overflow and representative routes
  render metadata; the isolated browser denied Supabase media requests,
  `/koleksi` navigation aborted once, keyboard automation timed out, and real
  Preview performance/transaction E2E was not available.

## UXUI-007 — Analytics architecture absent

- Status: `BLOCKED_WITH_EVIDENCE`
- Evidence: no existing analytics provider/event layer was found. No new vendor
  or tracking contract was invented in this stabilization scope.

## UXUI-008 — Stale P11 pricing assertion

- Status: `CLOSED`
- Evidence: assertion updated from obsolete `custom_quote` to canonical
  `configurator_based`; focused test PASS 4/4 and full suite PASS 793/793.

## UXUI-009 — Configured checkout closure stopped at Pass 2

- Status: `BLOCKED_WITH_EVIDENCE`
- Evidence: additive checkout/API/RPC source is implemented locally and focused
  closure tests pass 4/4, but two stale contract/copy assertions fail in the
  regression suite. Migration was not remotely applied.
- Remaining data evidence: all nine requested product images remain unproven;
  pilot Jersey has no sport discriminator for a safe canonical subcategory.

## UXUI-010 — Targeted final continuation

- Configured checkout, provisional product images, and stale regressions:
  `CLOSED`.
- Remote configured checkout proof: one unpaid order, one configured item,
  immutable snapshots, zero payment, and idempotent retry to the same order.
- Existing fulfillment trigger record-field bug: `CLOSED` by migration
  `20260729045016`.
- Pilot Jersey taxonomy: `BLOCKED_WITH_EVIDENCE`; no sport discriminator among
  12 active canonical candidates.
- Local runtime E2E: `BLOCKED_WITH_EVIDENCE`; all local assets are HTTP 200,
  but the existing server cannot reach Supabase and returns the documented
  unavailable states for `/koleksi` and PDP.
