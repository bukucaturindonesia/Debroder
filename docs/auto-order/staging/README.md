# Staging readiness packet

Read-only audit checkpoint: **27 October 2026**. Existing application wave remains in draft PR64. No database mutation, migration application, deployment or environment change is authorized or performed by this packet.

- [Audit findings](STAGING_AUDIT_20261027.md)
- [Configuration requirements](CONFIGURATION_REQUIREMENTS.md)
- [Change and approval plan](STAGING_CHANGE_PLAN.md)
- [Metadata-only SQL preparation](READ_ONLY_PREFLIGHT.sql)
- [Observed nonsecret snapshot](readiness.snapshot.json)
- [Offline assessment](readiness.result.json)

## Local commands

```text
node tools/staging-readiness.mjs docs/auto-order/staging/readiness.snapshot.json
node --test test/staging-readiness.test.mjs
node --test test/staging-read-only-preflight.test.mjs
```

The actual snapshot correctly returns exit1/BLOCKED. This is an expected readiness decision, not a failed unit test. Invalid input returns exit2; complete declarations return exit0/READY_FOR_REVIEW. Output always says `metadata_preflight_only` and `runtimeVerified:false`. It does not turn declared facts into executed provider/database/UAT proof.

Unknown configuration remains null/false. `canonicalSchemaReady` means all requirements for the selected fast-lane target, including its missing extension—not that existing legacy canonical tables are absent. Counts do not classify customer data. Do not set flags true merely to make the command exit0.

The SQL test uses an isolated in-memory metadata fixture to validate the SELECT script. It is not a full canonical schema rehearsal or a remote migration. Raw rows, keys and environment files are not part of this packet.

The current host has no `docker`, `psql`, `pg_dump` or Supabase CLI available through PATH. A genuine local PostgreSQL/Supabase full-schema rehearsal is therefore not available in this execution environment. PGlite metadata/previous stubbed tests do not replace that gate.

Previously accepted application/test/CSS hashes remain unchanged. The prior 56 tests, six component-browser cases and build were not repeated for documentation and Node-only tooling. DTF, homepage, global CSS, existing migrations and provider configuration are untouched.

## Executed local evidence
[LOCAL_VERIFICATION.json](LOCAL_VERIFICATION.json) records exact source hashes and exits. Twenty evaluator/CLI tests passed; the separate SELECT-script PGlite fixture test passed in READ ONLY and left fixture rowcounts/catalog unchanged. Syntax and scoped lint passed. The 20-test suite was not repeated for the new SQL fixture test. Source was reviewed and exact-copy hashes verified before integration.

Initial integration transfer failed because this baseline lacked a tools directory; the CLI did not produce a valid assessment. After creating that new directory and verifying copied bytes, the actual snapshot produced structured BLOCKED/exit1 as expected. This setup failure is not misreported as a readiness result. The SQL preparation has been executed locally, not against the remote staging database as a file or migration.
