# Agent04 — auto-order QA scenario matrix

Checkpoint2026-10-26; branch codex/auto-order-qa-v1-20261026; baseline fullHEAD8ccb7fefc91d70226ae3f82331761155b34326d0. Baseline docs/checkout/UX_QA_EVIDENCE.md records159files/1117tests,15mock/local browser cases and145-page build. These are HISTORICAL EVIDENCE, NOT RERUN and not real provider/staging acceptance. Source paths below identify evidence boundaries, not new PASS.

|#|Required scenario|Evidence already available|Current release acceptance / missing proof|
|---|---|---|---|
|1|Guest checkout succeeds|Historical mocked real-UI fast checkout at7widths and SQL fixture create/retry|Provider/full-schemaUAT BLOCKED; historical local evidence only|
|2|Online payment succeeds|Historical provider mock and fast SQL settlement ledger fixture|Real MidtransSandbox BLOCKED; canonical summary/fulfillment trigger integration NOT RUN|
|3|Payment pending|Provider mapping and mocked status boundary in baseline|Current local provider/notification subset PASS; real provider pending NOT RUN|
|4|Payment fails/expires|Baseline provider-state/SQL attempt tests|Real provider failure/expiry and canonical stock release NOT RUN|
|5|Duplicate webhook|Baseline fast-checkout-database fixture settles once|Real callbacks/full-schema tasks NOT RUN; stubbedlegacyfunctions do not prove fullworkflow|
|6|Out-of-order callback|Authenticated status fetch and non-regressing SQL state source/mock tests|Current request/response order-binding regression PASS locally; real asynchronous callback ordering NOT RUN|
|7|Sold-out checkout rejected|Source stock checks; fixture may stub stock authority|Actual canonical stock/reservation integration BLOCKED|
|8|Two customers compete for last stock|Canonical locks source reviewed by Agent03|Concurrent full-schema sessions NOT RUN; no oversell claim|
|9|Pickup with online payment|Fast input supports pickup and server validates configured branch; SQL source|Activated pickup/provider UAT NOT RUN|
|10|Cash pay-at-store|Existing canonical payment authority/evidence source|Fast lane lacks pay-at-store choice; actual cashier/cross-store workflow NOT RUN|
|11|Integrated QRIS at store|Midtrans gateway path candidate exists|ProviderSandbox/key/callback unavailable; no screenshot/manual-proof substitute|
|12|Unpaid pickup denied|Existing fulfillment transition guard source tests|Actual cashier/fulfillment complete schema runtime NOT RUN|
|13|Pickup code cannot be reused|Agent03 source audit did not find one-time pickup-code feature|NOT IMPLEMENTED / design and isolated contract required|
|14|Unapproved custom design cannot start production|Canonical Custom/JobOrder requirements source|Full design/payment/production integration NOT RUN|
|15|Expired reservation released|Canonical expire_public_commerce_orders/cron source|Target scheduler/actual stock release NOT RUN|
|16|Staff cannot access other branch orders|Historical dashboardpermission helper tests; server/RLS source|New UI uses existing scoped readmodel; live RLS/RPC cross-store denial NOT RUN|
|17|Retries do not duplicate tasks|Canonical sync_order_operational_task_v1 task_keyupsert source|Full payment→summary→task trigger integration NOT RUN|
|18|Responsive checkout and dashboard|Historical checkout mocked UI7widths; new dashboard helper/SSR tests PASS|New componentfixturebrowser6cases PASS; actualoperatorUATpending; no human timing or0clickbenchmark|

## Test boundaries
New tests may prove classification/new-order safety, markup escaping and disabled links locally. They cannot prove payment validity, inventory safety or backend authority merely because an area is labelled SiapDikerjakan. No counts are summed across overlapping source queues. Missing query data must remain visibly degraded and never treated as proof of no work.

No provider requests, credentials, live payments, customer data, remote SQL, migration, deployment or production changes authorized/executed by this QA task. Preserve prior artifacts. Release remains NO-GO until complete unresolved critical gates pass. Final executed commands/results and source hashes will be recorded separately after Director-authorized exact source transfers.

## New executed subset — 2026-10-26
55tests across5files PASS exit0: notification6,providers25,priorityhelper/SSR7,globaldashboard9,permissionhelper8. A separate actual-componentSSR fixture test PASS1exit0 (total56 across6distinctfiles); six componentbrowser cases PASSexit0 normal/empty at360/390/1440. Existing1117baseline tests and15checkoutbrowser cases were NOT RERUN. Typecheck PASSexit0; scopedlint and fixturetestlint PASSexit0. Final pnpm exec next build EXECUTED AND PASSED exit0 from the ownedprocess; noprebuild/full1117rerun.

Cases3–6 now have new local mockedprovider boundary coverage including forgedsignature, authenticatedstatus, wrongmerchant/outage and mismatchedprovider-order rejection; this is not actualSandboxacceptance. Case16 includes local permission-helper regression8tests, not liveRLS. Case18 gains three-area actualcomponent/actualCSS browserfixture6cases; authenticatedadminUAT, operatorroles, completeappshell and Nextfontloader/typography are NOTVERIFIED. Fixture font fallback is serif because Nextfont variable is absent; it is a harness limitation, no appsource bug claimed. New UI groups canonicalqueue summaries, not per-order taskcards or a verified zero-click engine. No data/count total or statusauthority was invented.
