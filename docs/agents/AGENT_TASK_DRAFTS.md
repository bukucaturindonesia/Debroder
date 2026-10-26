# Agent task drafts — Director Phase 02

PUBLISHED via GitHub CLI: Agent 02 #55, Agent 03 #56, Agent 04 #57, Agent 05 #58, Agent 06 #59. URLs and verification are in PROJECT_STATUS.md. Connector 403 was bypassed by owner-authorized CLI authentication; reuse these Issues, do not duplicate. No agent acknowledgement received.

## Agent 02 — Commerce reconciliation

Scope: Lanjutkan laporan Commerce yang sudah ada; rekonsiliasi kontrak checkout source dengan bukti Agent 03. Jangan ulang audit lengkap.

Acceptance: Matriks route/API/RPC dan staging/production; retry dan order-before-payment; gap runtime dinyatakan jelas; usulan koreksi minimal untuk review Director.

Boundary: Commerce source only; no migration/policy/assets/environment changes.

Use REPORT_TEMPLATE.md. Link Issue and PR, full commit SHA, evidence and status. Do not edit until your own worktree is accessible and Director baseline/handoff is received. Do not repeat completed audits.

## Agent 03 — Database and security evidence

Scope: Lanjutkan rekonsiliasi schema/migration, Auth dan RLS dengan target environment yang disepakati; audit awal tidak diulang.

Acceptance: Matriks applied/pending berbasis bukti; kesetaraan definisi lock lokal/staging; matriks Auth/RLS acceptance dan blockers; recovery plan sebelum koreksi.

Boundary: Database/security only; no UI; no remote mutation or migration apply without owner approval. Sensitive security details stay in restricted evidence, not public comments.

Use REPORT_TEMPLATE.md. Link Issue and PR, full commit SHA, evidence and status. Do not edit until your own worktree is accessible and Director baseline/handoff is received. Do not repeat completed audits.

## Agent 04 — QA report and E2E attribution

Scope: Prioritas pertama: serahkan laporan QA dan atribusi perubahan e2e/public-readonly.spec.ts, e2e/wave-2-storefront.spec.ts serta artefak tes pada shared checkout.

Acceptance: Identitas pembuat/perubahan atau UNKNOWN; daftar artefak tracked yang terhapus tanpa menghapus/memulihkannya otomatis; command/exit/count/SHA untuk hasil tes; gate lokal dan browser dibedakan.

Boundary: QA files only, isolated workspace; preserve existing E2E and artifacts; no remote transactions or shared output overwrite.

Use REPORT_TEMPLATE.md. Link Issue and PR, full commit SHA, evidence and status. Do not edit until your own worktree is accessible and Director baseline/handoff is received. Do not repeat completed audits.

## Agent 05 — CI Preview and source SHA evidence

Scope: Prioritas pertama: laporan read-only CI/Preview serta kecocokan source SHA, build artifact dan environment.

Acceptance: URL/run/deployment ID, branch/source/artifact SHA, hasil checks dan waktu; mismatch/BLOCKED jujur; readiness dan rollback requirements.

Boundary: DevOps configuration evidence only initially; no deployment, env changes, secrets, merge or push without authorization.

Use REPORT_TEMPLATE.md. Link Issue and PR, full commit SHA, evidence and status. Do not edit until your own worktree is accessible and Director baseline/handoff is received. Do not repeat completed audits.

## Agent 06 — Asset provenance and production readiness

Scope: Lanjutkan inventory 242 aset yang sudah dilaporkan; verifikasi provenance, hak penggunaan, mapping dan kebutuhan master sebelum produksi.

Acceptance: Manifest provenance/license/identity/ratio/path/hash dan ketidakpastian; 89 mapping ambigu diselesaikan dengan owner/PIM atau tetap BLOCKED; brief produksi spesifik untuk approval.

Boundary: Assets/visual manifests only; no generation, optimization, CMS/PIM publish or code integration in this task.

Use REPORT_TEMPLATE.md. Link Issue and PR, full commit SHA, evidence and status. Do not edit until your own worktree is accessible and Director baseline/handoff is received. Do not repeat completed audits.


