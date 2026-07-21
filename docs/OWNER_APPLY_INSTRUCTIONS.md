# DEBRODER C1 — Owner Apply Instructions

These instructions describe a future owner-controlled apply. This package has not been executed.

## Phase 1 — Source dependency first

1. Start from source commit `e411c421bb9d719df71b00ce4cdf8fc76bc566e8`.
2. Verify the B1 package SHA-256:
   `03b221916d875fa2c55c7dd839d0029e59ddd7aba5d08a2a80673c30d9280db5`.
3. Apply only the nine changed files in the B1 changed-files-only package.
4. Confirm no line-ending mass changes or unrelated files.
5. Run all available source gates:
   - exact TypeScript;
   - lint;
   - targeted tests;
   - full tests;
   - production build.
6. Verify runtime authorization and confirm no active source call remains for:
   - `create_public_order`;
   - `submit_public_payment_proof`;
   - anonymous upload to `order-uploads`.
7. Do not proceed when the deployed application still uses the legacy path.

## Phase 2 — Backup and pre-check

1. Confirm the exact Supabase project.
2. Complete `BACKUP_RESTORE_CHECKLIST.md`.
3. Run `sql/01_precheck_c1_read_only.sql`.
4. Save all results and notices.
5. Confirm every stop condition is false.

## Phase 3 — Apply C1 only

1. Review that the only migration file is:
   `supabase/migrations/20260721090000_p0_security_critical_legacy_containment_c1.sql`.
2. Apply through the owner-approved Supabase migration workflow.
3. Do not paste or combine C2/C3/C4 statements.
4. Do not edit previous migration files or migration history.
5. Stop immediately on any preflight exception. The transaction must roll back.

## Phase 4 — Immediate post-check

1. Run `sql/02_postcheck_c1_read_only.sql`.
2. Confirm both legacy RPCs deny `anon` and `authenticated`.
3. Confirm `service_role` remains allowed temporarily.
4. Confirm anonymous INSERT policy count is zero.
5. Confirm superadmin read/delete policies remain.
6. Confirm the bucket remains private and all object metadata remains.
7. Verify canonical checkout and canonical payment behavior.
8. Verify authorized admin access to existing uploaded order files.

## Phase 5 — Incident handling

Prefer these actions in order:

1. Disable or redirect a remaining legacy source dependency.
2. Fix the server-mediated canonical path.
3. Roll back the deployment when appropriate.
4. Use `sql/03_emergency_rollback_c1.sql` only after explicit owner approval.

Emergency rollback restores known insecure access and is not an acceptable permanent state.

## Prohibited actions

- No C2, C3, or C4 ACL changes.
- No creation of missing PIM RPCs.
- No function body modification.
- No object or history deletion.
- No direct migration-history editing.
- No commerce, UI, content, or performance changes in the same apply.
