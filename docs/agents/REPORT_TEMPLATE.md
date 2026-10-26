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

