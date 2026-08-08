# DEBRODER — JERSEY CONFIGURED COMMERCE CONTINUATION V2 HANDOFF

Status: ACTIVE HANDOFF
Target branch: `codex/jersey-configured-commerce-continuation-v2`

## Objective
Continue Jersey configured-commerce work from the current safe baseline.

Do NOT:
- reactivate legacy Jersey products;
- mix Customer Account work into this branch;
- patch production product authority with ad-hoc SQL;
- weaken tests or bypass server authorization;
- create a parallel Jersey pricing/checkout authority.

## Verified baseline
Latest targeted permission fix already committed/pushed:
- commit: `25601c8`
- message: `fix: align superadmin product management permissions`

Production migration already applied and verified:
- `20260808131000_superadmin_product_management_permissions_v1`

Verified Product Manager grants for `superadmin` / `super_admin`:
- `product.read`
- `product.manage`
- `product.inventory.manage`
- `product.publish`
- `product.maintenance`

Role `admin` was NOT elevated.

## Legacy Jersey policy
All legacy Jersey products remain archived/inactive and MUST stay OFF.

## New canonical pilot
Production Draft:
- ID: `b770ea29-2fee-4ab0-85e9-ec07994a4846`
- Name: `Jersey Futsal Custom V2`
- Slug: `jersey-futsal-custom-v2`
- SKU: `JRS-FUTSAL-CUSTOM-V2`
- Category: `Jersey`
- Base price: `130000`
- Minimum order quantity: `6`
- Lifecycle: `draft`
- `status_aktif`: `false`

Observed production authority state:
```text
product_type      = standard_product
pricing_mode      = fixed_price
sales_mode        = ready_stock
uses_configurator = false
config_schema     = {}
```

Therefore this Draft is NOT yet a canonical Jersey configurator product.

## Canonical target before Publish
```text
product_type      = configurable_product
pricing_mode      = configurator_based
minimum_order_qty = 6
sales_mode        = custom
uses_configurator = true
config_schema     = {"entry_type":"jersey_configurator"}
status            = draft
status_aktif      = false
```

## NEXT PACKAGE — Jersey Configuration Admin Checkpoint V1

Audit current authoritative code before editing, especially:
- `components/admin/products/workspace/ProductWorkspaceShell.tsx`
- `components/admin/products/workspace/ProductInformationForm.tsx`
- `app/api/admin/products/[id]/information/route.ts`
- `lib/product-manager.ts`
- `lib/jersey-configured-product/domain.ts`
- `lib/jersey-configured-product/data-access.ts`
- `lib/jersey-configured-product/request.ts`
- `app/jersey/configurator/page.tsx`
- `components/JerseyConfigurator.tsx`
- `test/p10-jersey-configured-product.test.ts`
- Product Workspace tests
- generic configured-product / checkout tests

Implement the smallest canonical Admin checkpoint for Jersey authority fields.

Required behavior:
1. Respect Product Manager role/permission checks.
2. Preserve server-side authorization.
3. Draft-safe mutation only unless existing lifecycle contract explicitly allows more.
4. Persist authoritative values server-side.
5. Validate canonical combinations.
6. Use existing audit logging conventions.
7. Avoid browser-only state.
8. Avoid direct production SQL patches.
9. Never reactivate archived legacy Jersey products.
10. Never Publish the pilot as part of this package.

Authority scope:
- `product_type`
- `pricing_mode`
- `sales_mode`
- `uses_configurator`
- `config_schema.entry_type`
- `minimum_order_qty` only where needed

UX should use business language, not raw DB vocabulary.

Do not recreate or bypass:
- configured-product server resolver
- Jersey server pricing
- configured checkout contract
- Product Manager lifecycle/permissions
- RLS / ACL
- audit architecture

No hardcoded single-Jersey fallback.

## After authority checkpoint
Continue:
1. Paket
2. Bahan
3. Grup/model kerah
4. Ukuran
5. Add-on
6. Layanan wajib
7. Server-authoritative pricing
8. Media
9. Review/readiness
10. Publish
11. E2E configurator → configured product → cart → checkout → order persistence
12. Add a second Jersey product only after the first pilot passes E2E.

## Quality gate
```powershell
pnpm.cmd vitest run test/p10-jersey-configured-product.test.ts
pnpm.cmd typecheck
pnpm.cmd lint
pnpm.cmd test
pnpm.cmd build
git diff --check
```

Add focused tests for the new Admin Jersey checkpoint and directly affected contracts.

## Changed-files-only discipline
Do not commit temporary logs, helper scripts, downloaded ZIPs, or migration troubleshooting artifacts.

Before commit, report:
- root cause;
- files changed;
- why each changed;
- focused tests;
- full quality gate;
- whether a DB migration is genuinely required.

## Definition of done
- pilot can be configured canonically from Admin;
- server/database values match canonical Jersey target;
- pilot remains Draft/inactive;
- legacy Jersey remains untouched;
- focused + full quality gates pass;
- no security, checkout, pricing, or lifecycle guard is weakened.
