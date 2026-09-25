# DEBRODER Wave 0C Migration Reconciliation

Date: 2026-08-15  
Mode: read-only remote inspection plus repository-side forward correction

## Source of truth

- Supabase's applied migration history is authoritative for what the remote
  project records as applied.
- `supabase/migrations/` is authoritative for new repository-controlled
  changes.
- The repository is not currently a byte-for-byte historical mirror of the
  remote migration history. Historical `_applied.sql` files, standalone SQL,
  `supabase/schema.sql`, `MIGRATION_NOTES.txt`, and `APPLY_NOTES.md` are
  evidence only; they are not safe to replay or use to rewrite applied history.

## Observed baseline

The inventory was captured before adding the Wave 0C corrective migration:

- Remote applied migrations: 173.
- Local migration files: 132.
- Exact timestamp-key matches: 80.
- Local-only timestamp keys: 43.
- Remote-only timestamp keys: 93.
- Duplicate numeric timestamp prefixes in the local directory: none.
- `supabase/config.toml`: absent.
- Legacy local files without numeric timestamps: 9, all suffixed `_applied.sql`.

Examples of remote-only records include `20260803095600_public_media_architecture_reconciliation_v1`
and `20260808131000_superadmin_product_management_permissions_v1`. An example
of a local-only timestamp file is
`20260810100000_registered_customer_order_access_v1.sql`.

The counts show migration-history identity drift, not proof that all 93 remote-
only records are missing schema changes. Names and timestamps indicate that
some history was renamed, split, aggregated, or preserved as legacy files.
Without the Supabase CLI or a safe schema dump comparison, exact function,
policy, grant, index, trigger, and extension parity cannot be asserted.

## Reconciliation matrix

| Classification | Expected | Observed/source | Risk | Correction required | Wave 0C action |
|---|---|---|---|---|---|
| MISSING_IN_REPO | Every applied remote migration has a replayable local record | 93 remote-only timestamp keys from the read-only applied-history listing | A fresh environment cannot be reconstructed from this directory alone | Preserve an immutable remote-history manifest and recover historical SQL from the deployment source before any new baseline | Documented; no history rewrite |
| MISSING_IN_REMOTE | Every numeric local migration is known to be applied or intentionally pending | 43 local-only timestamp keys at baseline; `20260810100000_registered_customer_order_access_v1.sql` is a known pending candidate | Applying an unknown file can duplicate or change live behavior | Validate each file against remote history and apply only with owner-approved migration procedure | Not applied; no remote mutation |
| DUPLICATE_HISTORY | One identity per applied migration | No duplicate numeric prefixes locally; legacy `_applied.sql` files have no remote identity | Ambiguous replay order and accidental reapplication | Keep legacy files out of replay order; do not rename/squash during stabilization | No change |
| ORDERING_CONFLICT | Repository order and remote applied order are comparable | Only 80 timestamp keys match; remote and local timelines diverge | A lexical local run may not represent remote dependency order | Reconstruct a signed historical manifest before using automated parity checks | Documented; no reorder |
| SCHEMA_DRIFT | Tables, columns, constraints, triggers, and extensions match applied intent | Not fully verifiable without a safe dump/CLI; remote table/RLS inventory was inspected read-only | Hidden drift may break a fresh staging build or alter authorization | Run a controlled schema diff against an isolated staging clone | External follow-up |
| FUNCTION_DRIFT | Security-sensitive function body, owner, `SECURITY DEFINER`, `search_path`, and ACL match intent | `public.build_quotation_snapshot(uuid)` was `SECURITY DEFINER`, `search_path=public`, and executable by `PUBLIC`/`anon`/`authenticated`; its body lacked authorization | P0 private-data exposure | Add a small forward corrective migration and verify remotely | Migration created, not applied |
| POLICY_DRIFT | RLS policy set matches the current access contract | `quotations` has staff/permission policies; no customer ownership or store scope path exists | A recommendation based on a nonexistent ownership/store model could create a new access bug | Keep Wave 0C function authorization aligned with the existing staff-only contract | Corrective function predicate added |
| GRANT_DRIFT | Anonymous/public roles cannot execute private quotation APIs | Live ACL exposed the snapshot to `PUBLIC`, `anon`, and `authenticated` | Anonymous quotation disclosure | Revoke broad execution and grant only authenticated staff path | Migration created, not applied |
| INDEX_DRIFT | Required indexes are present and intentional | Not fully verifiable from migration identity alone | Performance or uniqueness regressions may remain hidden | Include indexes in the future isolated schema diff | External follow-up |
| MANUAL_CHANGE | All remote changes are represented by controlled migrations | Standalone SQL and historical apply notes exist; remote manual execution was not proven | Untracked state can recur | Record provenance for every remote-only item before reconciliation | Documented as unverified |
| HISTORICAL_ONLY | Legacy evidence is never replayed as a new migration | 9 nonnumeric `_applied.sql` files plus standalone SQL artifacts | Duplicate DDL or data mutation | Keep as evidence; use new corrective migrations | Preserved |
| NO_DRIFT | Identity checks pass where evidence is complete | Local numeric-prefix uniqueness passed; no broad schema-parity claim is possible | False confidence if treated as full parity | Limit the claim to the checked property | Recorded narrowly |

## Wave 0C correction boundary

Created `20260815212358_wave_0c_quotation_snapshot_security.sql`. It does not
delete, rename, squash, reset, mark applied, or recreate the schema. It has not
been executed against the remote project because no safe staging identity was
available and the production project must not be mutated during this phase.

The Supabase CLI is not installed in the current environment. The migration
filename was created manually with the current timestamp after confirming that
the numeric prefix is unique and later than existing local migrations. Remote
application and post-application catalog checks remain an external action.
