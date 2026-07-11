# DEBRODER Blueprint Progress

## Current Phase

v1.1 - Bulk & Custom Ordering

## Completed

- [x] Repository checkpoint v1.0 reviewed from local docs and migration
- [x] Existing v1.0 product foundation preserved
- [x] Migration v1.1 authored
- [x] Product price tiers schema
- [x] Product minimum order schema
- [x] Custom service catalog schema
- [x] Service pricing rules schema
- [x] Private customer upload metadata schema
- [x] Saved configuration schema
- [x] Quotation draft and quotation item schema
- [x] Private Supabase Storage bucket policy for `customer-designs`
- [x] RLS policies for public read/admin manage/owner private data
- [x] Product query loads price tiers and minimum rules
- [x] Server-side cart price revalidation recalculates tiers by total product quantity
- [x] Bulk matrix UI using PIM colors and sizes
- [x] Minimum order validation in UI and quotation submit route
- [x] Custom service catalog and calculator
- [x] Partial service quantity validation and allocation
- [x] Private upload route with extension, MIME, size, sanitized filename, signed preview URL, and delete
- [x] General notes, item notes, and service notes
- [x] Quotation draft route with full snapshot
- [x] Autosave configuration under `debroder_product_configuration_v1`
- [x] Share configuration link without private upload URLs
- [x] WhatsApp payload v1.1
- [x] PIM V2 admin controls for price tiers and minimum order
- [x] PIM V2 admin controls for service catalog
- [x] Admin quotation draft list page
- [x] v1.1 unit tests added for tier, minimum order, service conflicts, partial service quantity, and WhatsApp payload
- [ ] v1.1 migration applied to remote Supabase
- [ ] Local lint/typecheck/test/build completed after dependency permission repair

## Validation Status

- Lint: BLOCKED - `node_modules\.pnpm\eslint@9.39.5\...\eslint\bin\eslint.js` cannot be opened
- Typecheck: BLOCKED - `node_modules\.pnpm\typescript@5.9.3\...\typescript\bin\tsc` cannot be opened
- Tests: BLOCKED - `node_modules\.pnpm\vitest@4.1.10_...\vitest\vitest.mjs` cannot be opened
- Build: BLOCKED - `node_modules\.pnpm\next@15.5.20_...\next\dist\bin\next` cannot be opened

## Last Successful Checkpoint

v1.1 source implementation, migration, admin/customer UI, API routes, and tests have been written. The previous v1.0 checkpoint remains the last fully validated build: `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build` passed before v1.1 changes.

## Current Blocker

`DEBRODER_Blueprint_v1.0-v1.3_FROZEN.txt` was not present in the workspace. Work continued from the attached v1.1 execution brief, the v1.0 report, the progress ledger, and the checked-in migrations.

Local validation is blocked by filesystem permissions on vendor files under `node_modules`. Confirmed attempts:

1. Added bundled Codex Node runtime to `PATH` and ran `pnpm typecheck`; failed with `EPERM` reading TypeScript `bin\tsc`.
2. Ran `pnpm install --offline`; dependency tree was already up to date and permissions did not change.
3. Ran `pnpm install --force --offline`; dependency tree still was not regenerated.
4. Ran `pnpm test`; failed with `EPERM` reading Vitest `vitest.mjs`.
5. Checked file attributes/encryption; files are not encrypted or OneDrive placeholders, but `Get-Acl` is denied.
6. Requested approval to delete/regenerate `node_modules`; the approval tool rejected the escalation because of usage-limit approval failure.

The folder `.git` exists but is empty, so git status/diff is not available in this workspace snapshot.

## Next Action

Regenerate dependencies once approval/permissions are available:

```powershell
$workspace=(Resolve-Path -LiteralPath '.').Path
$target=(Resolve-Path -LiteralPath 'node_modules').Path
if (-not $target.StartsWith($workspace, [System.StringComparison]::OrdinalIgnoreCase)) { throw "Refusing to remove outside workspace: $target" }
Remove-Item -LiteralPath $target -Recurse -Force
$env:Path='C:\Users\gknma\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;C:\Users\gknma\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\override;C:\Users\gknma\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback;' + $env:Path
pnpm install --offline
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

After validation passes, apply `supabase/migrations/20260711010000_v1_1_bulk_custom_ordering.sql` to the Supabase project and verify RLS/storage policies with real authenticated users.
