# Baseline Coverage Ledger

This ledger proves how the two migrations classified `REPLACED BY BASELINE`
are represented in the fresh-install baseline. It maps schema responsibility,
not historical SQL text. Historical files remain unchanged.

## Order handoff trigger record-safety correction

Runtime fixture bootstrap exposed a fresh-replay defect after the corrected
baseline and 118-migration replay: `orders` inserts reached
`sync_order_handoff_trigger_v2()`, whose historical CASE expression referenced
`NEW.order_id` even though `public.orders` has only `id`. The same generic
record-shape defect remained in the sibling integrity-task and cancellation
guard triggers.

The canonical order/operations authority remains `orders` plus the existing
operational task, handoff, and cancellation records. The forward migration
`20260818003941_order_handoff_trigger_record_safety.sql` preserves that
authority and resolves `order_id` through `pg_catalog.to_jsonb(NEW)` only for
tables that carry the field. The `orders` branch continues to use `NEW.id`.
No table, status authority, seed row, trigger purpose, or public execution
grant is introduced. All three SECURITY DEFINER trigger functions retain
`search_path = ''`; direct `PUBLIC`, `anon`, and `authenticated` execution is
revoked and only the existing `service_role` boundary remains.

| Runtime evidence | Historical/current source | Required by | Current implementation | Security decision | Test evidence |
|---|---|---|---|---|---|
| `42703 record "new" has no field "order_id"` during the out-of-scope order insert | `20260720010000_order_integrity_handoff_phase0_3.sql`, `20260720014603_fix_cross_table_trigger_record_resolution.sql`, and `20260720020000_order_operations_phase4_13.sql` | `orders`, `order_payments`, `fulfillments`, and `job_orders` trigger consumers | `20260818003941_order_handoff_trigger_record_safety.sql` replaces the unsafe cross-table field access while preserving the existing functions | Trigger-only execution, explicit empty search path, no anonymous/customer write path | `test/order-handoff-trigger-record-safety.test.ts`; runtime replay and fixture insert pending after clean reset |

## Customer-auth server ACL correction

Runtime fixture login reached the canonical customer session route but the
server-only Supabase client received `permission denied for table
customer_profiles`. The table's existing migration grants `SELECT` to
`authenticated` for browser RLS reads but does not grant the server role the
privileges required by `lib/customer-auth/server.ts`; the address routes have
the same server-only dependency on `customer_addresses`.

The single forward correction
`20260818020559_customer_auth_server_acl_v1.sql` grants only the required
server-role table privileges. It does not widen `PUBLIC`, `anon`, or
`authenticated`, change RLS, or create a second customer authority. The
customer-auth server remains responsible for verified identity, ownership,
and provisioning; `service_role` remains server-only.

| Runtime evidence | Historical/current source | Required by | Current implementation | Security decision | Test evidence |
|---|---|---|---|---|---|
| Customer login returned `Profil pelanggan belum tersedia`; direct server-role query returned `permission denied for table customer_profiles` | `20260806214500_customer_account_email_verification_v1.sql`; `lib/customer-auth/server.ts`; customer address routes | Verified customer session provisioning and customer address CRUD | `20260818020559_customer_auth_server_acl_v1.sql` grants `SELECT, INSERT, UPDATE` on `customer_profiles` and `SELECT, INSERT, UPDATE, DELETE` on `customer_addresses` to `service_role` | Server-only ACL; no browser-role widening; RLS and identity guard remain unchanged | `test/customer-auth-server-acl.test.ts`; staging runtime correction/replay pending |

## Customer order source-snapshot foundation correction

After the server ACL was corrected, the first verified customer login reached
the canonical order-claim RPC and failed with SQLSTATE `42703`: `orders` had no
`source_snapshot` column. The function and several current checkout/order
migrations already use that JSON snapshot to append verified-claim and
activation provenance. This is an orders-foundation column, not a second audit
or order authority.

The baseline now establishes `orders.source_snapshot jsonb not null default
'{}'::jsonb`; the existing claim and checkout functions remain the writers.
No data migration or public write path is added to the fresh baseline.

| Runtime evidence | Historical/current source | Required by | Current implementation | Security decision | Test evidence |
|---|---|---|---|---|---|
| Customer login RPC probe: `42703 column "source_snapshot" does not exist` | `20260806214500_customer_account_email_verification_v1.sql`, `20260806234500_customer_checkout_activation_integrity_v2.sql`, current order read models and checkout migrations | Verified customer order claim and checkout provenance updates | `20260816102253_debroder_fresh_database_baseline.sql` adds the canonical JSON column | Existing RPC ownership/authentication remains; no new table or anonymous capability | `test/customer-order-source-snapshot-foundation.test.ts`; clean replay and E2E revalidation pending |

## Phase 5A payment foundation coverage

The historical source `20260712060316_payment_tracking_phase_5a.sql` is
forensic evidence only. Its required callable contract is reconstructed in
the fresh baseline over the one canonical `public.order_payments` authority.
The active Phase 5B migrations remain responsible for submission links,
adjustments, activity history, and their later security controls.

| Historical source | Required by | Current implementation | Canonical authority | Security decision | Test evidence |
|---|---|---|---|---|---|
| `payment_number_sequences` and `next_payment_number()` in `20260712060316_payment_tracking_phase_5a.sql` | Payment numbering defaults and Phase 5B ACL preflight | Baseline table and `public.next_payment_number()` | Baseline numbering helper | `SECURITY DEFINER`, `search_path = ''`; no public/anon/authenticated execution before later server ACL | `test/payment-foundation-baseline.test.ts` numbering contract |
| `order_payments` table, core columns, FK, checks, indexes, updated-at trigger | All payment RPCs and current payment UI | Baseline `public.order_payments` | `public.order_payments` | RLS enabled; baseline table grants closed to public/anon/authenticated; later migrations add narrow policies and server grants | `test/payment-foundation-baseline.test.ts` table/integrity contract |
| `refresh_order_payment_summary(uuid)` | Verify/reject/archive/restore/delete operations and later payment completion | Baseline canonical summary RPC, later replaced additively by Phase 5B/current lifecycle | Current order/payment aggregate | `SECURITY DEFINER`, `search_path = ''`, authenticated permission gate, no public/anon execution | Existing baseline and Phase 5B tests |
| `create_order_payment(...)` | Phase 5B ACL lock and admin payment creation | Baseline canonical create RPC | `public.order_payments` | `payment.create` authorization, amount/method validation, no public/anon execution | Existing baseline and security reachability tests |
| `update_order_payment_draft(uuid,bigint,timestamptz,text,text,text,text,text)` | `20260712143745_v1_2_phase_5b_payment_audit_lock.sql`; `PaymentTrackingManager` | Baseline secure compatibility RPC over the canonical row | `public.order_payments` draft/pending state | `payment.create`, store-scope check, amount/method/date validation, only draft/pending and active rows; no public/anon execution | `test/payment-foundation-baseline.test.ts` exact signature and immutable-state contract |
| `verify_order_payment(uuid,text)` | Phase 5B ACL lock, later fulfillment/pickup references, historical admin verification | Baseline prerequisite, later replaced by the current review implementation | Current payment verification lifecycle | `payment.verify`, active order and store-scope checks, only pending active rows; no public/anon execution | `test/payment-foundation-baseline.test.ts` function/security contract; later payment tests |
| `reject_order_payment(uuid,text)` | Phase 5B ACL lock and historical compatibility | Baseline secure compatibility RPC | Current payment review lifecycle | `payment.reject`, required reason, store-scope check, only pending active rows; no public/anon execution | `test/payment-foundation-baseline.test.ts` function/security contract |
| `archive_order_payment(uuid,text)` / `restore_order_payment(uuid)` | Phase 5B ACL lock and admin archive UI | Baseline secure compatibility RPCs | `public.order_payments.archived_at` | `payment.archive`, store-scope check, state-specific transitions only; no public/anon execution | `test/payment-foundation-baseline.test.ts` function/security contract |
| `permanently_delete_order_payment(uuid)` | Phase 5B ACL lock and admin archive UI | Baseline secure compatibility RPC | `public.order_payments` archived row | Super-admin-only, archived-first, store-scope check, summary refresh; no public/anon execution | `test/payment-foundation-baseline.test.ts` permanent-delete guard |
| Historical `payment-proofs` bucket and storage policies | Historical Phase 5A proof upload; active Phase 5B storage migration | Not copied into baseline; active `20260712142905_v1_2_phase_5b_payment_completion.sql` remains the executable owner | Current private storage workflow | No historical broad grants/policies replayed; storage remains incremental and private | `test/payment-phase5b-migration.test.ts` storage/security contract |

## Legacy public payment-proof target

Forensic evidence confirms that `public.submit_public_payment_proof(uuid,
text,text,text)` is a historical RPC, not a CURRENT HEAD payment API. Its
exact historical parameters were `p_order_id`, `p_order_number`,
`p_customer_phone`, and `p_payment_proof_path`; it returned `boolean` and
updated the legacy `orders.payment_proof_path`, Indonesian
`orders.payment_status`, and `orders.payment_submitted_at` fields. The old
definition used order-number/phone matching as authorization and granted
`anon` and `authenticated` execution. That contract cannot be replayed into
the reconciled architecture without restoring an unsafe public mutation and a
second proof authority.

The CURRENT HEAD public payment flow is the token-hash/link boundary in the
server-only `/api/public/payments/[token]` route, which uploads to the private
`payment-proofs` bucket and calls `submit_customer_order_payment_v2`. The
canonical state remains `public.order_payments`; no legacy proof function is
created in the baseline.

| Historical source | Current contract | Authority | Baseline/replay location | Security decision | Callers/test evidence |
|---|---|---|---|---|---|
| `supabase/schema.sql` and historical commits `fe8a697`, `8251f0d`, `6ba0dee`, `8c1108f` | Obsolete compatibility target only; exact signature retained as forensic evidence, not as an executable creator | `public.order_payments` plus tokenized `submit_customer_order_payment_v2` | No baseline creator. Phase 5B audit cleanup is conditional on `to_regprocedure(...)` so fresh replay does not require the obsolete target | Do not recreate the old body, `search_path = public`, or anonymous/authenticated grants; no arbitrary order ID/phone/path mutation | `test/public-payment-proof-foundation.test.ts`; current route has no legacy RPC call |

## Phase 5B security-target inventory

| Target | Exists before `20260712143745` | Legitimate CURRENT HEAD contract | Coverage/source | Decision |
|---|---:|---:|---|---|
| `create_order_payment(uuid,bigint,timestamptz,text,text,text,text,text,text,text,text,text,bigint)` | YES | YES | Baseline | Revoke/grant as written |
| `update_order_payment_draft(uuid,bigint,timestamptz,text,text,text,text,text)` | YES | YES | Baseline | Revoke/grant as written |
| `verify_order_payment(uuid,text)` | YES | YES | Baseline; later lifecycle replaces semantics additively | Revoke/grant as written |
| `reject_order_payment(uuid,text)` | YES | YES | Baseline | Revoke/grant as written |
| `archive_order_payment(uuid,text)` | YES | YES | Baseline | Revoke/grant as written |
| `restore_order_payment(uuid)` | YES | YES | Baseline | Revoke/grant as written |
| `permanently_delete_order_payment(uuid)` | YES | YES | Baseline | Revoke/grant as written |
| `next_payment_number()` | YES | YES | Baseline | Revoke as written |
| `refresh_order_payment_summary(uuid)` | YES | YES | Baseline and Phase 5B replacement | Revoke as written |
| `submit_public_payment_proof(uuid,text,text,text)` | NO | NO; historical only | `supabase/schema.sql` evidence; no active creator | Conditional legacy ACL cleanup; do not create a stub or unsafe wrapper |
| `payment_actor_role(uuid)` | YES | YES | `20260712142905_v1_2_phase_5b_payment_completion.sql` | Available to the audit trigger |
| `payment_actor_has_role(uuid,text[])` | YES | YES | `20260712142905_v1_2_phase_5b_payment_completion.sql` | Available to permanent-delete authorization |
| `permanently_delete_payment_submission_link(uuid,uuid)` | N/A | YES | Created by the audit migration itself | Service-role-only creator |
| `capture_order_payment_activity()` | N/A | YES | Created by the audit migration itself | SECURITY DEFINER trigger with empty search path |

The `20260712143745` migration therefore has no missing legitimate
Phase 5A/5B prerequisite after the conditional legacy cleanup. The later
`20260721090000_p0_security_critical_legacy_containment_c1.sql` now has its
own explicit fresh-install/legacy-upgrade boundary. It does not require the
retired RPCs or `order-uploads` objects on a fresh install, but it preserves
hash, ACL, policy-shape, and bucket-privacy checks when historical objects are
present. Unexpected identity or partial containment state fails closed.

## LEGACY_CONTAINMENT_OBJECT_MATRIX

This matrix covers every historical object assumed by C1. It is a security
containment migration, not a creator for any of these retired objects.

| Object/signature | Fresh baseline expected | Legacy upgrade may contain | Containment action | Absent-state behavior | Unexpected-state behavior |
|---|---:|---:|---|---|---|
| `public.create_public_order(text,text,text,uuid,text,text,text,integer,text,text,text,text)` | NO | YES | Verify the historical SHA-256, trusted owner, and accepted ACL state; revoke `PUBLIC`/`anon`/`authenticated`, retain `service_role` | Valid; no dynamic revoke is attempted | Fail closed on hash drift, untrusted owner, partial ACL, or missing service-role execution |
| `public.submit_public_payment_proof(uuid,text,text,text)` | NO | YES | Verify the historical SHA-256, trusted owner, and accepted ACL state; revoke `PUBLIC`/`anon`/`authenticated`, retain `service_role` | Valid; no function is recreated | Fail closed on hash drift, untrusted owner, partial ACL, or missing service-role execution |
| `storage.objects` policy `Customers can upload order files` | NO | YES | Validate the exact historical anonymous INSERT predicate, then drop only that named policy | Valid; no drop is attempted | Fail closed on duplicate count or predicate/role/command drift |
| `storage.buckets` row `order-uploads` | NO | YES | Preserve the bucket row but require it to be private; C1 does not delete buckets | Valid; no bucket is fabricated | Fail closed if the bucket exists and is public |
| `pgcrypto` extension and `digest(text,text)` | YES | YES | Required preflight primitive for anti-drift hashing | Invalid; canonical baseline must supply it | Fail closed if extension/function is absent |

Historical function definitions retain their forensic `search_path = public`
configuration because C1 is explicitly containment-only and does not replace
function bodies. The historical `schema.sql` ACL grants `anon` and
`authenticated` and does not grant `service_role`; C1 accepts that exact
pre-containment pair, then explicitly grants `service_role` while revoking the
untrusted roles. After successful containment, neither untrusted `PUBLIC`,
`anon`, nor `authenticated` can execute them; `service_role` remains the only
permitted execution boundary. No historical broad grant is restored.

| Historical source object | Kind | Baseline coverage | Security/compatibility decision |
|---|---|---|---|
| `pgcrypto` | extension | `create extension if not exists pgcrypto` | Required for UUIDs and token generation. |
| `product_status` | enum | Same enum values: `draft`, `active`, `archived` | Modern enum is canonical; no text assignment is used. |
| `variant_status` | enum | Same enum values: `active`, `inactive`, `out_of_stock` | Modern enum is canonical. |
| `size_status` | enum | Same enum values: `active`, `inactive` | Generic size status remains distinct from apparel master identity. |
| `variant_image_role` | enum | Same enum values: `front`, `back`, `detail`, `lifestyle` | Image role remains enum-backed. |
| `product_categories` | table | Baseline table with modern fields and legacy `is_active` projection | Modern `status` is authoritative. |
| `products` | table | Baseline table with modern fields plus `nama`, `kategori`, `deskripsi`, `price`, `harga`, `status_aktif` | `name`, `base_price`, `description`, and enum `status` are authoritative. |
| `product_sizes` | table | Baseline generic size table | No baseline rows; fixtures/reference data are separate. |
| `product_size_master` | table | Baseline apparel size authority | One-way nullable `product_size_id` projection to generic sizes. |
| `product_variants` | table | Baseline table with modern fields plus `variant_name`, `color_name`, `color_hex`, `is_active` | Modern name/slug/hex/status are authoritative. |
| `product_variant_images` | table | Baseline image relation including `is_cover` compatibility flag | Modern enum image role is authoritative. |
| `product_variant_sizes` | table | Baseline relation with `size_id`, `size_name`, `stock_quantity`, `stock`, `is_active` | Apparel master `size_id` and inventory ledger/read model are authoritative. |
| `debroder_schema_versions` | table | Baseline metadata table `public.debroder_schema_versions` | Metadata only; no historical rows are copied. |
| `product_variants_one_default_per_product_idx` | index | Baseline partial unique index | Same uniqueness invariant. |
| `products_category_status_idx` | index | Baseline index | Supports public/PIM status filtering. |
| `product_variants_product_sort_idx` | index | Baseline index | Supports deterministic variant ordering. |
| `product_variant_images_variant_sort_idx` | index | Baseline index | Supports image ordering. |
| `product_variant_sizes_variant_status_idx` | index | Baseline index | Supports sellable-size filtering. |
| `products_slug_unique_idx` | index | Covered by the baseline `products.slug` unique table constraint | The equivalent uniqueness invariant is retained without a duplicate physical index. |
| `product_variants_sku_unique_idx` | index | Baseline partial unique index | Allows no SKU for draft-only rows while preventing duplicate real SKUs. |
| `product_variant_sizes_sku_unique_idx` | index | Baseline unique index | Preserves sellable SKU identity. |
| `product_variants_product_slug_unique_idx` | index | Covered by the baseline `unique (product_id, slug)` table constraint | The equivalent uniqueness invariant is retained without a duplicate physical index. |
| `product_variant_images_variant_role_unique_idx` | index | Covered by the baseline `unique (variant_id, image_role)` table constraint | The equivalent uniqueness invariant is retained without a duplicate physical index. |
| product foreign keys/checks/unique constraints | constraints | Declared in baseline table definitions | All point to baseline authorities; no historical data backfill is performed. |
| `set_updated_at()` | function | Baseline safe trigger function | Non-definer trigger helper; no caller grant. |
| `has_staff_role(text[])` | function | Baseline SECURITY DEFINER implementation | Explicit empty search path, authenticated actor lookup, no anonymous grant. |
| `sync_products_v1_compat()` | function | Semantics supplied by `sync_product_compatibility_baseline()`; exact historical name is allowed to be recreated by the later PIM compatibility migration | Prevents a second trigger authority and preserves enum safety. |
| `sync_product_categories_v1_compat()` | function | Semantics supplied by `sync_product_category_compatibility_baseline()` | Direction is modern status → legacy flag. |
| `sync_product_variants_v1_compat()` | function | Semantics supplied by `sync_product_variant_compatibility_baseline()` | Modern name/slug/hex/status → legacy projections. |
| `sync_product_variant_sizes_v1_compat()` | function | Semantics supplied by `sync_product_variant_size_compatibility_baseline()` | Master size and inventory compatibility are one-directional at the boundary. |
| product compatibility triggers | triggers | `sync_products_baseline`, `sync_product_categories_baseline`, `sync_product_variants_baseline`, `sync_product_variant_sizes_baseline` | One trigger per table avoids duplicate historical/modern write loops. |
| `set_*_updated_at` triggers | triggers | Baseline updated-at triggers for every modern product table and profile/store | Non-business system behavior preserved. |
| product table RLS enablement | RLS | Baseline enables RLS on all product/size tables | No table is API-open by default. |
| public active catalog policies | policies | Baseline recreates active-only public read policies using modern enum/status fields | Public reads never use legacy flags as authority. |
| staff product policies | policies | Baseline recreates authenticated staff manage policies through `has_staff_role` | No anonymous writes; later PIM policies may narrow further. |
| product table grants | grants | Baseline grants active catalog select to `anon, authenticated`, staff DML to `authenticated` | RLS remains the enforcement boundary; service role is server-only. |
| size seed rows in `20260711000000` | data | Deliberately not copied | Baseline contains zero business/catalog rows; staging fixtures/reference data are separate. |
| `custom_services` seed rows in `20260711154141` | data | Not part of baseline; later compatibility migration remains classified `COMPATIBILITY` | Deterministic service catalog is not silently moved into the foundation. |

## Wave 0B CMS foundation recovery — `cms_banners` replay blocker

| Historical source | Runtime failure | Current contract / authority | Repository implementation | Security decision | Regression evidence |
|---|---|---|---|---|---|
| `supabase/schema.sql` from commit `52ffe1b`, extended by `20260713143000_commerce_jersey_experience.sql`, `20260713223000_jersey_owner_approved_experience_addendum.sql`, and the current CMS readers/workflow | Clean staging stopped at `20260713143000_commerce_jersey_experience.sql`, SQLSTATE `42P01`, because the migration's unguarded `cms_banners` index target did not exist. The same migration later performs an unguarded `UPDATE public.page_heroes`, so only adding `cms_banners` would leave the same foundation collision unresolved. | **BASELINE CMS FOUNDATION.** `page_heroes` and `cms_banners` remain the shared CMS content authority. They are not PIM, transaction, or fixture authorities. The modern CMS workflow fields are represented without editorial rows. | The fresh baseline now provides both complete table shapes required by the first CMS consumer, current workflow status/timestamp columns, historical visual fields, deterministic indexes, and updated-at triggers. The existing Jersey migrations remain incremental additive/constraint extensions. | Both tables are RLS-enabled. Public/anon/authenticated reads are limited to active published content; authenticated writes require `content.manage`; service-role access remains server-only. No CMS content, media URL, storage object, or business row is seeded. | `test/baseline-reconstruction.test.ts` asserts both tables, key columns, indexes, policies, grants, and baseline RLS coverage. Runtime replay after this correction remains **NOT RUN**. |

The baseline does not replay `supabase/schema.sql` or the standalone
`supabase/cms-draft-publish-workflow.sql`. Their compatible schema and current
security boundary are reconstructed as repository-controlled baseline objects;
standalone workflow objects remain a separate preflight concern if CURRENT HEAD
runtime proves they are required.

## Wave 0B fresh-replay exclusion — stale reservation operational cleanup

`20260715054519_p0_security_controlled_stale_reservation_cleanup.sql` is not a
schema foundation. It selects exactly two expired active reservations belonging
to archived orders, requires those rows to exist, mutates them, and writes
before/after audit evidence. Runtime fresh replay proved the precondition failed
on the empty database with SQLSTATE `P0001` and zero reservations. The file is
therefore classified `HISTORICAL ONLY` in the replay manifest; it remains
unchanged as operational/upgrade evidence and is never satisfied by invented
seed data. Fresh-install reservation integrity remains owned by the active
reservation schema and lifecycle migrations.

## Coverage categories

- **Tables:** all seven modern product tables plus the schema-version metadata
  table exist in the baseline; historical `profiles`, `stores`, and order/
  domain tables are also created there as separate approved foundations.
- **Columns:** every compatibility column added by the replaced product
  compatibility migration is declared in the baseline table definitions.
- **Enums:** all four modern enums are declared before their table users.
- **Indexes:** every index from both replaced migrations is present by name or
  by an equivalent table constraint plus the explicit compatibility index.
- **Constraints/FKs:** product/category/variant/image/size constraints and
  the apparel-master FK are declared in baseline order.
- **Triggers/functions:** baseline uses one directional compatibility trigger
  family; exact legacy trigger names are not duplicated. The later PIM
  migration may provide those names as a compatibility alias without creating
  another authority.
- **RLS/policies/grants:** RLS is enabled before public policies; active-only
  catalog reads and authenticated staff DML are recreated; all other baseline
  tables remain fail-closed until their domain migration.

## Prohibited data proof

The baseline has no inserts into products, product sizes, variants, orders,
payments, quotations, customers, profiles, stores, CMS tables, or storage.
Its only insert is the deterministic permission catalog, which is a required
system authorization primitive rather than business/customer data.

## Wave 0B pgcrypto qualification correction

| Runtime evidence | Root cause | Corrected repository contract | Regression evidence |
|---|---|---|---|
| Fresh staging baseline failed at statement 93 with SQLSTATE `42883`: `gen_random_bytes(integer)` was absent from `public`; `extensions.gen_random_bytes(integer)` was present. The transaction rolled back and staging remained empty. | `pgcrypto` is Supabase-managed in the non-exposed `extensions` schema, while the baseline used unqualified extension calls and could not rely on the session `search_path`. | The baseline declares `pgcrypto` with `schema extensions` and explicitly uses `extensions.gen_random_bytes` and `extensions.digest`. The immediate executable bulk-ordering migrations use the same qualified byte generator. `gen_random_uuid()` remains unchanged because the prior baseline runtime resolved those calls before the proven failure; no unverified qualification, public wrapper, or search-path widening was added. | `test/baseline-reconstruction.test.ts` verifies extension placement, all baseline extension-owned calls, absence of unqualified `gen_random_bytes`/`digest`/other pgcrypto calls, absence of a public wrapper, and the immediate replay migration contract. Existing WhatsApp and order-handoff digest correction migrations remain the explicit coverage boundary for their later function bodies. |

## Wave 0B Phase 11 fulfillment deletion-audit foundation correction

| Historical source | Runtime failure | Current contract / authority | Repository implementation | Security and audit decision | Regression evidence |
|---|---|---|---|---|---|
| `20260712154540_v1_2_phase_11_fulfillment_schema_and_audit.sql` in commits `9262ded`, `6ba0dee`, and the reverted remote-history commit `8c1108f` | Fresh staging had already created `public.fulfillment_deletion_audit` from the baseline without `order_id`. Phase 11's `CREATE TABLE IF NOT EXISTS` skipped its complete definition, then `fulfillment_deletion_audit_order_idx` failed with SQLSTATE `42703`. The transaction rolled back and the migration was not recorded. | **BASELINE FOUNDATION WITH PHASE 11 EXTENSIONS.** The baseline establishes the complete audit table shape so Phase 11 can safely see it pre-existing; Phase 11 remains the owner of lifecycle numbering completion, the audit index (idempotently), immutable trigger, permanent-delete function, RLS/policies, and grants. There is one table and no competing fulfillment authority. | Baseline now includes `fulfillment_number`, non-null `order_id`, `deleted_at` default, the historical reason default, the Phase 11 order/time index, and the Phase 11 `fulfillment_revisions.reason` non-empty check. `DEBRODER_FRESH_DATABASE_REPLAY_MANIFEST.md` order/classification is unchanged. | `order_id` is an immutable audit snapshot identity with type `uuid not null` and intentionally no FK to `orders` or `fulfillments`: the deletion function records the row and then deletes the source fulfillment, so a restrictive FK would destroy the intended append-only audit lifecycle. `deleted_by` retains the historical `auth.users` `ON DELETE SET NULL` FK. Phase 11 later denies public/anon/table mutation and permits authenticated staff read through its authorization policy; the immutable trigger blocks update/delete except its controlled deletion context. | `test/fulfillment-phase11.test.ts` provides static contract evidence for the complete pre-existing shape, required order index, no source-row FK, deletion-before-source-delete behavior, append-only trigger, and staff-only table access. Runtime Phase 11 PASS is **NOT CLAIMED**; the next authorized replay must prove it. |

### Phase 11 pre-existing-object compatibility matrix

| Baseline object | Phase 11 expectation | Result |
|---|---|---|
| `public.fulfillments` | Adds idempotency/timestamp/archive fields already present in baseline; later sets `fulfillment_number` not null | Compatible; no missing Phase 11 column |
| `public.fulfillment_items` | Adds work-item index over existing `work_item_id` | Compatible |
| `public.fulfillment_files` | Used by lifecycle and permanent-delete functions | Compatible |
| `public.fulfillment_status_history` | Adds `reason` and non-null `metadata` default | Compatible; baseline already carries both |
| `public.fulfillment_revisions` | Same table plus non-empty `reason` check and revision index | Corrected; baseline now carries the check, Phase 11 still owns its idempotent index |
| `public.fulfillment_deletion_audit` | Requires `fulfillment_number`, `order_id`, reason default, and order/time index | Corrected; baseline now carries the complete pre-existing shape and Phase 11 owns lifecycle/security extensions |

## Wave 0B Phase 11 audit-row-change foundation recovery

| Historical source | Runtime failure | Canonical owner and contract | Replay topology | Security decision | Regression evidence |
|---|---|---|---|---|---|
| Reverted remote-history migration `20260712071058_phase13_append_only_audit.sql` from commit `6ba0dee` (removed by `8c1108f`); active Phase 13 migration `20260713090000_v1_2_phase_13_role_catalog_and_rls_alignment.sql` documents the foundation as already applied | Fresh replay reached `20260712155146_v1_2_phase_11_fulfillment_security.sql` after 34 incremental migrations and failed with SQLSTATE `42883` because `public.audit_row_change()` was absent. The migration rolled back and was not recorded. | **BASELINE FOUNDATION PREREQUISITE.** `public.system_audit_log` is the single audit authority. `public.audit_row_change()` is a trigger-only `RETURNS trigger`, `LANGUAGE plpgsql`, `SECURITY DEFINER`, `VOLATILE` (the PostgreSQL default), `set search_path = ''` function. It records `created`, `updated`, `archived`, `restored`, and `deleted` events using `TG_TABLE_NAME`, row `id`, OLD/NEW JSONB snapshots, `auth.uid()`, `public.current_actor_role()`, and source `trigger`; it returns `OLD` for DELETE and `NEW` otherwise. | The function is created in the fresh baseline after `system_audit_log` and its append-only trigger, before Phase 11. No manifest reorder or historical migration rewrite is required. Active consumers are Phase 11 `fulfillments` and Phase 13 `profiles`, `quotation_items`, `quotation_item_services`, `order_items`, `order_item_services`, `mockup_files`, `mockup_parts`, `qc_files`, and `fulfillment_files`. | The historical `set search_path = public` was re-derived as `set search_path = ''`; all repository objects are explicitly qualified. The function has no direct `PUBLIC`, `anon`, `authenticated`, or `service_role` EXECUTE grant and is callable only through trigger execution. `system_audit_log` remains append-only through `prevent_audit_change`; no customer/anonymous insert/update/delete path is added. | `test/audit-row-change-foundation.test.ts` statically proves the function contract, destination ordering, lifecycle branches, current consumer set, trigger-only ACL, append-only destination, and manifest availability. Runtime Phase 11 closure remains **NOT CLAIMED** until the next owner-authorized replay. |

### AUDIT_ROW_CHANGE_CONSUMER_MATRIX

| Migration | Table(s) | Trigger / operation | Expected availability |
|---|---|---|---|
| `20260712155146_v1_2_phase_11_fulfillment_security.sql` | `public.fulfillments` | `audit_fulfillments_changes`, AFTER INSERT/UPDATE/DELETE | Baseline, before Phase 11 |
| `20260713090000_v1_2_phase_13_role_catalog_and_rls_alignment.sql` | `public.profiles` | `audit_profiles_role_changes`, AFTER UPDATE OF role | Baseline, before Phase 13 |
| `20260713090000_v1_2_phase_13_role_catalog_and_rls_alignment.sql` | `public.quotation_items`, `public.quotation_item_services`, `public.order_items`, `public.order_item_services`, `public.mockup_files`, `public.mockup_parts`, `public.qc_files`, `public.fulfillment_files` | Dynamic `audit_<table>_changes`, AFTER INSERT/UPDATE/DELETE | Baseline, before Phase 13 |

The historical append-only migration also attached this function to
`job_orders`, `work_items`, `qc_records`, `fulfillments`, and
`notification_templates`, but that migration is reverted and those trigger
creators are not part of the approved fresh replay. The baseline restores the
shared function, not archived trigger definitions or a second audit authority.

## Wave 0 Master closure — payment-adjustment archive contract recovery

| Historical/current source | Runtime evidence | Canonical authority | Repository correction | Security/integrity decision | Regression evidence |
|---|---|---|---|---|---|
| `20260712142905_v1_2_phase_5b_payment_completion.sql` creates `public.payment_adjustments`; `20260719140000_payment_verification_and_fulfillment.sql` and the current `review_order_payment` path read `archived_at` when refreshing the order payment summary | After the corrected replay, authenticated full-admin payment review failed with SQLSTATE `42703`: `column "archived_at" does not exist`. The payment update rolled back; the pending payment remained unchanged. Staging logs recorded the same failure on repeated review attempts. | `public.order_payments` remains the sole payment authority. `public.payment_adjustments` remains the Phase 5B append-only adjustment history; `archived_at` is an additive lifecycle field, not a second state authority. | New forward migration `20260819095347_wave_0_payment_adjustments_archive_contract.sql` adds nullable `archived_at` with `IF NOT EXISTS` and an `(order_id,status,archived_at)` summary index. Historical Phase 5B and later migrations remain unchanged. | The correction is schema-only: existing RLS, policies, grants, append-only trigger, actor checks, payment amount checks, and verified-payment protections remain unchanged. No public/anonymous payment mutation or new RPC is introduced. | `test/payment-adjustments-archive-contract.test.ts` proves the Phase 5B table omission, the CURRENT HEAD read contract, the additive correction, preserved ACL boundary, and manifest reachability. Runtime review re-test remains pending until clean replay #5. |

## Wave 0B PIM color-master foundation recovery

| Historical source | Runtime failure | Canonical owner / contract | Repository implementation | Security decision | Regression evidence |
|---|---|---|---|---|---|
| `supabase/schema.sql` and `supabase/pim-v2-stage1-master-data.sql`, consumed by current PIM routes and `20260716143000_pim_phase_4_bulk_import_atomic.sql` | Clean replay stopped at the Phase 4 bulk-import migration with SQLSTATE `42P01`: `public.product_color_master` did not exist when the function body declared `public.product_color_master%rowtype`. The migration rolled back and was not recorded. | **BASELINE PIM MASTER-DATA FOUNDATION.** `public.product_color_master` is the canonical color identity table used to validate PIM imports and resolve public/admin variant color data. It is not a product, inventory, or fixture authority. | The fresh baseline now creates the schema-only table with the historical/current columns, unique slug, active/sort index, updated-at trigger, RLS, published active read policy, and staff role-gated management policy. No color rows are seeded. | Anonymous/authenticated reads are limited to active master rows. Authenticated writes require the existing staff-role predicate; no anonymous write or direct service-role leakage is added. | `test/baseline-reconstruction.test.ts` asserts the table contract, index, trigger, policies, and baseline RLS coverage. Runtime replay after this correction is **NOT RUN**; the preserved staging checkpoint is baseline + 63 successful migrations. |

The table is reconstructed in the baseline because the first executable PIM
bulk-import function requires its composite row type before any incremental
PIM migration can proceed. The historical standalone master-data SQL remains
forensic/seed evidence and is not replayed; its color inserts are deliberately
excluded from the fresh baseline.

## Wave 0B canonical product-commerce field foundation recovery

| Historical source | Runtime failure | Canonical owner / contract | Repository implementation | Security decision | Regression evidence |
|---|---|---|---|---|---|
| `supabase/pim-v2-stage1-master-data.sql` / `supabase/schema.sql`, current product reads, and later commerce migrations | Clean replay reached `20260723035324_batch_4_canonical_commerce_foundation_v1.sql` after 88 successful incremental migrations and failed with SQLSTATE `42703` because the baseline `public.products` table had no `pricing_mode`; the same migration also depends on `uses_configurator`. | **BASELINE MODERN PRODUCT AUTHORITY.** `products.product_type`, `pricing_mode`, `uses_configurator`, `minimum_order_qty`, and related PIM links are canonical modern product fields. Legacy price/status/name projections remain compatibility-only. `sales_mode` and `tier_scope` remain owned by the following canonical commerce migration. | Baseline now reconstructs schema-only `product_subcategories`, `product_size_guides`, product commerce/PIM fields, checks, and FK links before the later canonical commerce migration. No category, product, or size-guide rows are seeded. | Product tables remain RLS-enabled. Public reads are active-only; authenticated product/subcategory/size-guide management remains staff-role gated. No anonymous write capability is added. | `test/baseline-reconstruction.test.ts` asserts the tables, fields, checks, RLS coverage, and grants. Runtime replay after this correction is **NOT RUN**; preserved staging checkpoint has 89 migration records total (baseline plus 88 incremental), and the failed target is not recorded. |

The correction is deliberately limited to foundations that later CURRENT HEAD
SQL and application readers demonstrably require. `sales_mode` and `tier_scope`
are not duplicated in the baseline because `20260723035324...` is their
canonical creator.

## Wave 0B P8B historical data-mutation containment

| Historical source | Runtime failure | Current contract / authority | Replay decision | Security and integrity decision | Regression evidence |
|---|---|---|---|---|---|
| `supabase/migrations/20260724011535_p8b_size_adjustment_data_mutation_v1.sql`, with the read-only P8A preview and P8B verification SQL under `supabase/sql/` | Clean staging replay reached P8B after 91 recorded migrations and failed with SQLSTATE `P0001`: `P8B_ABORT_CANDIDATE_COUNT: expected 287, received 0`. The migration transaction rolled back and the target was not recorded. | `product_variant_sizes.price_adjustment` remains the single canonical pricing authority. P8B is not a schema prerequisite; it is a one-time mutation of a historical, owner-approved 287-row business cohort with exact fingerprint and audit evidence requirements. | **HISTORICAL ONLY.** Fresh replay must not seed products, variants, SKUs, or historical audit rows to satisfy this migration. The SQL file is preserved unchanged for controlled legacy/remediation evidence. | No baseline business data is added and no alternate pricing authority is created. The fail-closed cohort, fingerprint, audit, idempotency, and post-update checks remain intact for any separately authorized historical execution. | `test/baseline-reconstruction.test.ts` classifies the migration as historical-only and excludes it from executable fresh replay; `test/p8b-size-adjustment-data-mutation.test.ts` continues to preserve the mutation contract. Runtime evidence is the failed fresh replay at the preserved staging checkpoint. |

## Wave 0B order-item custom-service snapshot foundation recovery

| Historical source | Runtime failure | Current contract / authority | Repository implementation | Security/integrity decision | Regression evidence |
|---|---|---|---|---|---|
| `supabase/schema.sql` configured-product compatibility block and current migrations `20260717160000_custom_commerce_foundation.sql`, `20260726160000_global_ready_stock_instant_custom_v1.sql`, and `20260726162000_instant_custom_operations_alignment_v1.sql` | Clean replay reached `20260726162000_instant_custom_operations_alignment_v1.sql` after the P8B exclusion and failed with SQLSTATE `42703`: `order_items.required_services` did not exist when the trigger was created. The transaction rolled back and the target was not recorded. | `public.order_items` remains the canonical order-line authority. `required_services` is a JSONB service snapshot consumed by the existing `order_item_services` production path; it is not a second service or order authority. `product_type`, `config_snapshot`, and `estimated_total` are the companion configured-order-line contract. | The baseline now supplies these schema-only columns with deterministic defaults and object/array/type checks before incremental commerce operations. Later migrations continue to own pricing/project extensions and synchronization triggers. No orders, products, services, or snapshot rows are seeded. | RLS/grants on `order_items` remain unchanged and fail-closed at baseline. The new columns do not create a direct public or anonymous mutation path; existing server/permission boundaries remain authoritative. | `test/baseline-reconstruction.test.ts` asserts the pre-existing order-item columns and checks; `test/p7b-policy-database-alignment.test.ts` and the instant-custom migration contract cover downstream snapshot use. Runtime replay after this correction is **NOT RUN**; the failure checkpoint remains at the prior applied prefix. |

## Wave 0B P15 inventory matrix foundation recovery

| Historical source | Runtime failure | Current contract / authority | Repository implementation | Security/integrity decision | Regression evidence |
|---|---|---|---|---|---|
| `supabase/migrations/20260727073246_p15_zero_balance_matrix_completion_v1.sql` and its `supabase/sql/06_p15_inventory_authority_verification_read_only.sql` verification artifact | Clean replay reached the P15 completion migration after 99 recorded migrations and failed with SQLSTATE `P0001`: `P15 zero-balance cohort drift: count 0, fingerprint <NULL>`. The transaction rolled back and the target was not recorded. | `inventory_locations`, `inventory_balances`, `inventory_movements`, and `stock_reservations` remain the inventory authority. The reusable zero-balance matrix function and trigger family are foundational operational helpers; the exact 96-row cohort mutation is historical remediation only. | The baseline now provides `ensure_active_inventory_balance_matrix_v1(uuid,uuid,uuid,uuid)` and its four security-definer trigger helpers with explicit safe search paths, service-role-only direct execution, and no data rows. The historical P15 data-mutation file remains unchanged and is classified `HISTORICAL ONLY`. | No zero-balance rows, products, SKUs, locations, or audit rows are seeded. The helper is fail-closed for direct API roles and can only create missing zero balances through trusted server/trigger paths after the incremental inventory tables exist. No second inventory authority is introduced. | `test/baseline-reconstruction.test.ts` asserts all five function names, safe search paths, and narrow ACL declarations; `test/p15-zero-balance-matrix.test.ts` preserves the historical mutation contract. Runtime P15 foundation execution is **NOT RUN** after this baseline correction; staging is preserved at the failed P15 checkpoint. |

## Wave 0B numbering-wrapper ACL preflight correction

| Historical source | Runtime failure | Current contract / authority | Repository correction | Security/integrity decision | Regression evidence |
|---|---|---|---|---|---|
| `supabase/migrations/20260712091748_v1_2_phase_6_numbering_lifecycle_and_security.sql`, `20260712143745_v1_2_phase_5b_payment_audit_lock.sql`, and `20260727160000_security_function_reachability_acl_v1.sql` | Clean replay reached the ACL migration after the corrected baseline and 94 recorded migration entries. The numbering-wrapper preflight first failed with SQLSTATE `P0001`: `SECURITY ACL V1: unexpected next_order_number baseline ACL`. After that correction, the same migration's admin preflight failed on `public.archive_order_payment(uuid,text)` because it incorrectly required a pre-existing `anon` grant. After relaxing that assertion, it failed on `public.archive_payment_adjustment(uuid,text)` because that retired signature has no CURRENT HEAD creator. Runtime ACL evidence showed no `PUBLIC`/`anon` execution and already-narrowed trusted-role grants. | `next_order_number()`, `next_payment_number()`, and `next_quotation_number()` remain SECURITY DEFINER numbering wrappers. The allowlisted admin functions remain the canonical payment/order/operations RPCs when present. The ACL migration is the canonical final boundary: numbering wrappers become `service_role`-only; present allowlisted admin functions become `authenticated`/`service_role` and deny `PUBLIC`/`anon`. | The active ACL migration now treats numbering-role state and allowlisted admin ACLs as cleanup targets: it requires exact function identity and `SECURITY DEFINER` for present functions, rejects public/anonymous numbering execution, explicitly skips absent retired signatures in all three loops, and applies/proves final ACLs for present targets. No function body, sequence, numbering rule, or application authority changed. | No anonymous/public execution is restored and no retired RPC is recreated. The correction removes impossible exact-precondition assertions and makes absent-state handling explicit; it does not grant a role before cleanup. Existing hash, numbering-invariant, trigger-snapshot, allowlist, and final ACL postflights remain. | `test/security-function-reachability.test.ts` statically proves both relaxed preflight boundaries, three absent-target guards, final ACL clauses, exact fingerprints, and no body rewrite. Runtime evidence of the corrected migration is pending continuation from the preserved staging checkpoint. |

## Wave 0B public mockup token decision foundation recovery

| Historical source | Runtime failure | Current contract / authority | Repository implementation | Security/integrity decision | Regression evidence |
|---|---|---|---|---|---|
| Reverted remote-history `20260712050712_mockup_public_approval_phase_3b.sql` in commit `6ba0dee`, current `PublicMockupApproval.tsx`, and ACL target `20260727160000_security_function_reachability_acl_v1.sql` | The ACL migration was reached after 94 recorded entries and failed with SQLSTATE `P0001` because `public.submit_mockup_part_decision(text,uuid,text,text)` was absent. The current UI calls this RPC; only `get_public_mockup_review` had been reconstructed in the baseline. | **BASELINE MOCKUP TOKEN FOUNDATION.** The RPC is a canonical token-scoped customer decision API over `mockup_parts`, `mockup_sets`, `mockup_review_links`, and `mockup_approval_history`; it is not a second approval authority. | The baseline now reconstructs the historical contract with explicit empty `search_path`, qualified `extensions.digest`, token-hash and expiry/revocation checks, part-to-link-set ownership, allowed state transitions, required revision-note validation, approval-history writes, all-required completion, link revocation, and the current UI return payload. | `SECURITY DEFINER` is required for anon/authenticated token callers, but direct execution is limited to explicit `anon`/`authenticated` grants after PUBLIC/authenticated defaults are revoked. No arbitrary part or mockup ID can bypass the token relationship; verified authorization is token-bound. No service-role leakage or storage write path is introduced. | `test/baseline-reconstruction.test.ts` statically proves the exact signature, token hash, ownership boundary, history write, safe search path, and narrow grants. Runtime proof is pending a clean replay after this baseline change. |

## Wave 0B order-task SLA RLS correction

| Historical source | Runtime finding | Canonical owner and contract | Repository implementation | Security decision | Regression evidence |
|---|---|---|---|---|---|
| `20260720020000_order_operations_phase4_13.sql` creates `public.order_task_sla_policies`; its service-role-only `apply_order_task_sla_v1()` trigger reads the table | Full current-head structural postcheck found `order_task_sla_policies` as the only public application table with RLS disabled. No public/anon/authenticated table grants or policy were intended, but exposed-schema RLS was absent. | The table remains the single operational SLA policy catalog. It is not a customer/order authority and is not duplicated. | New CLI-generated migration `20260817151630_order_task_sla_policies_security.sql` enables RLS, revokes direct `public`/`anon`/`authenticated` table access, and grants only trusted `service_role` access. No rows are changed or deleted. | No customer, anonymous, or authenticated direct read/write path is introduced. The existing service-role-only trigger/function boundary remains authoritative. | `test/order-task-sla-security.test.ts` statically proves the RLS, ACL, forward-only, and audit-checkpoint contract. Runtime closure requires the next clean replay. |

## Wave 0B canonical-catalog historical data containment

| Historical source | Runtime failure | Current contract / authority | Replay decision | Security/integrity decision | Regression evidence |
|---|---|---|---|---|---|
| `20260728153142_canonical_trial_pricing_v1.sql`, `20260729013734_canonical_product_data_publication_readiness_v1.sql`, `20260729033946_provisional_product_primary_images_v1.sql`, and `20260729141510_cotton_combed_tier_pricing_canonical_closure_v1.sql` | Clean replay reached `20260728153142_canonical_trial_pricing_v1.sql` after 103 recorded migration entries and failed with SQLSTATE `P0001`: `CANONICAL_TRIAL_PRICING_ABORT_PRODUCT_MAPPING: expected 10 existing product identities, received 0`. The transaction rolled back and the target was not recorded. Static preflight also shows the following three files require the same absent product/store/price-tier cohort. | The modern PIM product model remains the single product authority. These files are owner-locked catalog/media/price mutations over an existing business cohort, not schema prerequisites. Fresh replay intentionally contains no products, stores, inventory, product images, or historical price tiers. | **HISTORICAL ONLY.** The four SQL files remain unchanged for controlled legacy upgrade/remediation evidence. They are excluded from fresh executable replay; the namespace-scoped Ready Stock product and other business rows are created only after schema/security replay by the fixture bootstrap. | No product seed data, hidden historical state, or production content is introduced into the fresh database. The files retain their fail-closed identity, cohort, price, image, inventory, and audit checks when separately authorized for an environment that already contains the required cohort. | `test/baseline-reconstruction.test.ts` now asserts all four files are `HISTORICAL ONLY` and absent from the fresh executable classification. Runtime evidence is the preserved staging checkpoint at baseline plus 102 incremental migrations, with the first target rolled back. |
### Product compatibility enum safety correction

Runtime fixture bootstrap exposed a fresh-install defect after the complete
manifest replay: the historical `sync_products_v1_compat()` body evaluated
`nullif(new.status, '')` even though `products.status` is the canonical
`product_status` enum. PostgreSQL attempted to cast the empty string to the
enum and rejected every product insert with SQLSTATE `22P02`. The generated
repository migration
`20260817154449_product_compatibility_enum_safety.sql` replaces only that
compatibility projection logic, preserves modern product authority and
legacy-field synchronization, uses an explicit empty `search_path`, and
revokes direct execution for the trigger-only helper. Static regression
coverage is in `test/product-compatibility-enum-safety.test.ts`; clean
staging replay is required before this correction can be marked runtime
passed.
