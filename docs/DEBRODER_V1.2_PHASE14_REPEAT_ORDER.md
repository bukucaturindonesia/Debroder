# DEBRODER v1.2 Phase 14 — Repeat Order

Status: **COMPLETE, TECHNICALLY VERIFIED, READY TO DEPLOY**  
Date: 13 July 2026

## Official scope

Phase 14 implements the frozen v1.2 Repeat Order flow. The source order is never overwritten. Product, variant, size, quantity, service, position, notes, and design references are carried into a new formal transaction, while current price and stock are checked again.

The pre-existing remote migration `20260712071131 phase14_repeat_order` is the database source of truth. It was inspected through the live schema and migration history only. It was not reopened as a local migration, edited, recreated, or replayed.

## Official transaction flow

1. Authorized staff selects an active source order with status `siap_diambil`, `siap_dikirim`, or `selesai`.
2. The application loads the source items, services, customer history, previous repeat history, current product/variant/size state, active price tiers, and available stock.
3. The user reviews differences and supplies a repeat reason.
4. A stable idempotency key is generated and reused for the confirmation attempt.
5. The existing database RPC `create_repeat_order_quotation(...)` atomically creates a new draft quotation, item/service snapshots, source relation, repeat history, and audit log.
6. Product lines that can be priced from active product rules are updated to current prices. Services, unavailable combinations, and manual-price tiers remain pending.
7. The new quotation continues through the existing quotation approval and order-conversion lifecycle. WhatsApp is not the primary transaction path.

The remote foundation intentionally creates a new **formal quotation draft** rather than cloning an already-approved order directly. This preserves the frozen requirement to recheck price, stock, services, and design approval before the repeat becomes a new official order.

## Access control

Creation requires all of the following:

- authenticated admin session;
- `order.read` permission;
- `quotation.write` permission;
- role in `owner`, `superadmin`, `super_admin`, `admin`, or `sales_admin`.

Other roles may retain their existing order-read access and customer history according to Phase 13, but the Repeat Order preview/create endpoints reject them with HTTP 403. Navigation only exposes the Repeat Order workspace to the official creation roles.

## Price and stock rules

- Old prices are displayed as historical reference only.
- Active product base price, active product tier, variant adjustment, and size adjustment are recomputed.
- Current stock is compared against the old quantity.
- Inactive/missing product combinations are marked unavailable or manual review.
- Service pricing is copied as pending because service readiness and production files require review.
- The source order is never silently changed.

## Design and service safety

Service name, quantity, position, and notes are copied into the new quotation as pending. Existing approved mockups/files remain attached to the source order/quotation and are referenced through the source relationship; private files are not duplicated into a new public location. A new approval lifecycle is still required.

## Idempotency, history, and audit

- Client prevents concurrent submission while the request is working.
- The same idempotency key is reused for retry/double-click protection.
- Database uniqueness exists on `repeat_order_history.idempotency_key` and `quotations.repeat_idempotency_key`.
- Repeated RPC calls with the same key return the same quotation.
- `repeat_order_history` is append-only.
- `system_audit_log` receives `repeat_order_created` with source and new quotation snapshots.
- `quotations.repeated_from_order_id` and the history table preserve the source relationship.

## Application surfaces

- `/admin/repeat-orders`
  - eligible source selection;
  - search;
  - previous repeat count;
  - empty/loading/error states;
  - history list.
- Order detail
  - Repeat Order confirmation dialog;
  - customer order history;
  - source-order relationship history.
- Quotation detail
  - Repeat Order origin banner;
  - reason;
  - link back to the source order.

## Database verification

Remote checks confirmed:

- migration `20260712071131 phase14_repeat_order` exists once;
- existing RPC and grants are available;
- source/new quotation foreign keys are active;
- idempotency unique constraints and indexes are active;
- history RLS and append-only trigger are active;
- authorized-role permission matrix is compatible with the API guard.

A transactional smoke test created a temporary completed order, called the RPC twice with one idempotency key, verified one quotation, one history row, one copied item, and an unchanged source order, then rolled back. Follow-up counts confirmed zero smoke records remained.

## Quality gates

- `npm run typecheck`: PASS
- `npm run lint`: PASS, 0 errors; 24 pre-existing warnings outside Phase 14
- `npx vitest run test/repeat-order-phase14.test.ts`: PASS, 9 tests
- `npm test`: PASS, 14 files / 82 tests
- `npm run build`: PASS, 83 static-generation entries and all Phase 14 routes generated
- `git diff --check`: PASS

The sandbox could not resolve Google Fonts. Build verification used a temporary Next font response mock, temporary single-CPU build setting, and temporary skipping of duplicate in-build type/lint checks after standalone typecheck and lint had already passed. Production source configuration was restored afterward.

## Regression boundary

- Phase 12 notification files and database foundations were not changed.
- Phase 13 role/audit behavior remains active.
- The uploaded deployed archive omitted six Phase 13 access-control/audit route files required by its own Phase 13 test. Those exact verified checkpoint files were restored without changing their behavior.
- No Phase 15 code, schema, or documentation was started.
