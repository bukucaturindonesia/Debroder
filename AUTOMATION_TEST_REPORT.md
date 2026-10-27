# Automation test report —2026-10-26

Historical latest-main evidence: docs/checkout/UX_QA_EVIDENCE.md reports159files/1117tests, fullbuild145pages,15mockbrowser PASS. These were not rerun or converted to current-target evidence. Prior separate D1.2 PR60 evidence63tests/6directcart browser does not certify this new-main candidate.

## Required18scenario coverage before release

|#|Scenario|Current acceptance gate|
|---|---|---|
|1|Guest checkout|Historical mocked localUI pass; new candidate smoke/providerUAT pending.|
|2|Online success|Mock source/SQL tests available; actualMidtranssandbox BLOCKED.|
|3|Pending|Existing provider mapping/stale-state tests; full-target acceptance pending.|
|4|Failed/expired|Existing provider mapping/expiry source; target expiry execution NOTRUN.|
|5|Duplicate webhook|Existing fixture tests; full-trigger integration NOTRUN.|
|6|Out-of-order callback|Existing protected ledger transitions; actual-provider/full-target NOTRUN.|
|7|Out-of-stock|Canonical source+fixture; installed final stock authority NOTVERIFIED.|
|8|Two buyers/laststock|True concurrent target sessions NOTRUN.|
|9|Pickup+online|Fast branch exists; activated pickup realUAT NOTRUN.|
|10|Pickup+cash|Legacy source available, fastlane missing; scoped cashier runtime NOTRUN.|
|11|Pickup+QRIS|Provider integrationUAT NOTRUN; never accept screenshot.|
|12|Unpaid pickup denied|Canonical source guards, target-role runtime NOTRUN.|
|13|Pickupcode reused denied|Single-use code contract not implemented/found: BLOCKED.|
|14|Custom unapproved design held|Existing canonical guard source; complete trigger integration NOTRUN.|
|15|Expired reservation released|Existing expiry source/scheduler; installed scheduler and runtime NOTRUN.|
|16|Wrong-store employee denied|Target authorization/RLS execution NOTRUN; sensitive findings local.|
|17|Retry no duplicate tasks|Canonical task_key upsert source; integrated-trigger runtime NOTRUN.|
|18|Responsive checkout/dashboard|Historical mockedcheckout widths pass; newdashboard checks pending; operator test NOTRUN.|

New wave regressions, exact command/exit/hash and artifacts will be added after execution. No row becomesPASS based only on this plan or an AI source review. No live payment/order written.

## Executed wave1 checks to date
Sourcebaseline8ccb7fefc91d70226ae3f82331761155b34326d0 plus reviewed hashes inAUTO_ORDER_SOURCE_TRANSFER.json.
- Agent05 baseline actual-handler RED:4passed/2failed, exit1. After orderbinding correction, notification+provider31tests PASS exit0. Own lintPASS; own typecheckFAILED2 due unavailableofflinePGlite tarball. No source/test removed to silence environment error.
- Agent04 network-frozen no-script dependency restoration exit0 after offline miss; package/lock unchanged. Combined5testfiles55tests PASS exit0,0failed/0pending (Vitest describe-group count13 is not13files). Includes7newhelper/SSR,31payment and17existingimpacted dashboard/permission cases.
- Combinedtypecheck PASS exit0. Scopedlint/build/browser results pending finalexecution; do not infer them from typecheck.
- Eightfullschema/provider/runtime gates remain independent; no realcustomer/order/payment transaction created. Historical1117suite/15browser not rerun.

## Final local acceptance —2026-10-26
Four sourcefiles and three testfiles (notification,priority,fixture) plus compiledfixtureCSS match FINAL_VERIFICATION.json SHA256 exactly. QAownedprocess confirms buildexit0, not inferred from logfile. Combined56tests/6files PASS;6componentfixturebrowser PASS360/390/1440; typecheck/scopedlint/fixturelint/buildexit0. Build retains35existingwarnings; scopedlint0warnings. Sourcepayload4files unchanged after acceptedtests; no full1117test rerun.

Director visually reviewed360and1440normal screenshots; automated6cases cover normal/empty widths360/390/1440. Actualcomponent+compiledCSS/data synthetic; Nextfontloader/adminshell absent (seriffallback), so typography/realoperatorAuth/UAT NOTVERIFIED. Mainremote remains8ccb7fefc91d70226ae3f82331761155b34326d0 at finalconflictcheck; openPR54/60/61 remain separate, DTFunpublishedworkunknown. No excludedpaths touched.

Evidence: qa-artifacts/auto-order-20261026/FINAL_VERIFICATION.json, targeted-tests.json, fixture-test.json, dashboard-browser-results.json, build-output.txt; reproducibility commands in docs/auto-order/AGENT_04_QA_EXECUTION.md. New fixturetest reads retainedCSS and writes syntheticHTML; publishedCSS/HTML and browser script support reproduction. TraceZIPs remain preserved in isolatedQAworktree and are not included in this publicpacket. The report's older next-step finishbuild sentence is superseded by confirmed exit0.

Local wave1 is READY FOR INTEGRATION REVIEW; complete mission/release remainsNO-GO. No liveSandbox/DB/stockconcurrency/roleRLS/one-timepickup/fastcash/notificationUAT executed. Human tasktime/adminclickcount/exceptionrate NOTMEASURED. No remote migration or deployment. Next: review this exactsource then resolve18scenario matrix through separately authorized nameddisposableenvironment; no automaticmerge/mainpush/productionrelease.

## STAGING AUDIT —2026-10-27
Read-only audit completed; healthyseparateproject debroder-staging found. Nonemptydata provenanceUNKNOWN, notcertifieddisposable. RLS124/124public and8/8Storage catalogflags; runtime ownershipNOTRUN. Candidate20261026045918notapplied,4fasttables/7RPCs/requiredcolumnsabsent; drift4remote-only/12local-only NOTapprovedapplylist. Actualapp/Sandbox/webhookmetadataBLOCKED byVercel404. Safeofflinepreflight +21newlocaltestsPASS; actualsnapshotBLOCKEDexit1correctly. No DB/migration/config/deployment changes; applicationhashesunchanged, old56/6tests/buildnotrerun. LocalPostgres/SupabaseCLI/Dockerunavailable; fullschemaUATnotcomplete. Audit/config/changeplan/evidence in docs/auto-order/staging/. ReleaseNO-GO. Ownerdata/accessandlatermutationapprovalrequired; no secrets requested or printed.
