# Owner DTF / benefit / Jersey patches — review evidence

Baseline: owner UI commit `1d220154c604c26d9476c7af1027a984131797ce` (rangkuman), latest fetched `codex/unified-category-hero-v1` / PR54. Dedicated branch `codex/dtf-owner-patches-20261026`. Review targets that UI branch to avoid importing unrelated PR54 differences into main. Main `8ccb7fe` contains a separate Fast Checkout merge; it was not replaced or modified. Original snapshot and other worktrees preserved.

All three ZIPs extracted separately; every script was inspected and all --check preflights PASSED on pristine baseline. Shared globals.css edits were composed manually from their reviewed changes. Earlier hero package is superseded by the existing shared CategoryHero in this owner commit; it was not replayed over newer code.

Implemented: DTF standard hero; three icon benefits; native one-card mobile rails; proportional desktop service cards; Services-managed offers with honest empty state; verified-original gallery, 2/3/4 columns and 16px padding/gaps, no clickable cards/captions/UI count cap; six owner FAQ; configured WA CTA and original shared footer. Homepage benefit one-card mobile / four desktop; Jersey secondary navigation removed while Shop/Configurator/customer journey remains. Owner explicitly requested DTF WA CTA; existing system transaction routes remain unchanged.

Additional corrections from review: Services are not resurrected from sample fallback when unconfigured/empty; original-result photo URLs are not normalized to generic artwork; broken gallery photos disappear instead of showing another image; DTF items excluded from landing and Jersey campaigns; section_group persisted as empty string for general banners (remote NOT NULL). Gallery original confirmation is an editorial owner declaration, not automatic provenance proof.

## Actual verification

- Frozen dependency install PASSED, lockfile unchanged.
- Final full pnpm build chain PASSED: typecheck, lint (0 errors / 36 baseline warnings), 164 Vitest files / 1136 tests, Next 142/142 generated pages. Standalone final typecheck also passed.
- Initial unit iteration failed one legacy SQL string test because Windows CRLF differed; fixed only newline assertion, no payment SQL edit. Initial TS iteration caught nullable mobile URL and generic Playwright element typing; corrected.
- Initial browser 9/20 passed: CSS specificity defeated homepage mobile flex; DTF rail also needed reconciliation and tests needed stable streaming completion. Fixed scoped CSS, native flex rails, networkidle before layout assertions. Subsequent browser 20/20 PASSED; final expanded acceptance results in browser-acceptance.json (read exact stats, do not assume).
- Browser real local production-build runtime uses no Supabase env: empty CMS/Services is expected. Five DTF widths 360/390/430/1024/1440; FAQ keyboard Enter open/close, rail arrow scrolling, no document overflow, no broken loaded images/page errors, configured WA URL, footer. Five screenshots under screenshots/.
- Populated gallery/service geometry is explicitly synthetic DOM/CSS fixture verification (17 gallery cells and five service cards), never actual CMS acceptance. Unit integration tests exercise actual public-data separation and draft/publish adapter with mocked Supabase. No genuine customer order, WA message, admin login, media upload, or CMS write performed.
- Shared CategoryHero, Kaos source, checkout/payment code, inventory, auth and migrations have zero diff against owner baseline. Only a payment-related test newline assertion changed. git diff --check PASSED.

## Staging read-only / release blockers

Target ykfjgnrigcsapblbxnxb (debroder-staging), metadata queries only. cms_banners exists with RLS and required section_group/metadata columns (both NOT NULL), but public.services and public.apply_cms_workflow_action/get_due_cms_revisions are absent. DTF gallery rows: zero. Last migration observed 20261021041852. Full pending/applied reconciliation NOT RUN. First compound audit query failed because services is absent; subsequent catalog-safe queries succeeded.

Existing banner/storage policies include permissive authenticated NOT is_admin_guest() mutation clauses alongside content/staff policies; PostgreSQL permissive policies combine with OR. This requires role-specific audit in a disposable full schema before CMS security can be VERIFIED. No policies were weakened/removed. Authenticated publish/edit/reload/media lifecycle and RLS denial tests are BLOCKED by schema drift and lack of a designated authenticated disposable test session. No production database contact or mutation; no new/edited/applied migration. Source branch publication can trigger pre-existing CI/Preview, but no explicit deploy/merge was requested or performed.

Status: IMPLEMENTED + LOCALLY VERIFIED; remote CMS persistence/security BLOCKED; overall release NO-GO / NOT COMPLETE. Next: review draft diff against owner UI branch, reconcile staging schema and existing RLS through a separately reviewed safe forward migration, then authenticated CMS upload/publish/reload/unpublish/security UAT. Do not apply historical migrations blindly or publish reference images as real work.

Final expanded acceptance: 23/23 PASS, no skip/flaky/failure; five DTF screenshots. Local runtime only; populated CSS cells are fixtures.
