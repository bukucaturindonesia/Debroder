# Director Phase 02 - Agent 02

Status: WAITING FOR ACKNOWLEDGEMENT. Release NO-GO / NOT COMPLETE.
Baseline SHA: 726c69267a400730e894881d8ae8a44b32921b76; shared uncommitted changes excluded.


Scope: Lanjutkan laporan Commerce yang sudah ada; rekonsiliasi kontrak checkout source dengan bukti Agent 03. Jangan ulang audit lengkap.

Acceptance: Matriks route/API/RPC dan staging/production; retry dan order-before-payment; gap runtime dinyatakan jelas; usulan koreksi minimal untuk review Director.

Boundary: Commerce source only; no migration/policy/assets/environment changes.

Use REPORT_TEMPLATE.md. Link Issue and PR, full commit SHA, evidence and status. Do not edit until your own worktree is accessible and Director baseline/handoff is received. Do not repeat completed audits.


## Dependencies
Agent 03 contracts/environment; Agent 04 QA.

## Activation protocol
Acknowledge this Issue with scope, worktree path, branch and full HEAD. Read latest Director handoff. Worktree safety remains unverified: no edits until access/isolation confirmed. Publish dated checkpoint/blocker reports here. Director updates central dashboard on owner request; no automatic chat synchronization is assumed. Code changes require a linked PR and review. No merge/deployment, database mutation, reset/clean or dummy deletion. Do not post credentials, personal data or sensitive security details in this public Issue.

# Agent report template

- Date/time/timezone:
- Agent / Issue URL / PR URL (NONE if absent):
- Worktree absolute path / branch / full HEAD SHA:
- Base SHA / dirty files / evidence includes uncommitted changes YES/NO:
- Scope and acceptance criteria:
- Completed / not completed:
- Files changed / evidence paths (redact private data):
- Tests: command, environment, timestamp, exit code, counts, result:
- Typecheck / lint / build / E2E:
- Database/migrations attempted/applied/pending; first failure:
- Database / staging / production mutations YES/NO:
- Deployment/source/artifact SHA mapping (or NOT RUN):
- Critical bugs / security findings (restricted details stay private):
- Blockers / warnings / owner approval needed:
- Next action / exact safe resume:
- GO / NO-GO recommendation:
- Own-worktree HANDOFF UPDATED YES/NO:

Allowed evidence status: EXECUTED AND PASSED; EXECUTED AND FAILED; BLOCKED; NOT RUN; NOT APPLICABLE. Historical results must include original date/SHA. Never claim PASS based on another checkout or mocks for real database behavior.

Report in the agent's single Issue once write access is restored. Until then send the dated report to owner/Director. Code changes require a linked PR; no merge without Director review and owner authorization. Only Director edits the central dashboard. Each agent writes its own worktree handoff; Director integrates evidence sequentially.

