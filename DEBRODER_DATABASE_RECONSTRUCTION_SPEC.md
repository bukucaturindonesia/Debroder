# DEBRODER Database Reconstruction Specification

**Mode:** Read-only forensic architecture  
**Date:** 2026-08-16  
**Repository HEAD:** `43f935b321906093df13e521f411ca3aa102799e` on `UI-MIGRATION`  
**Remote database changes:** NONE  
**Baseline migration created:** NO  

This document is an architecture and replay-order specification only. It does
not authorize a staging reset, SQL execution, migration application, fixture
creation, production access, or modification of historical migrations.

## 1. Root cause

CURRENT HEAD is a reconstructed migration directory rather than a complete,
topologically executable history.

The root cause has five evidence-supported parts:

1. **Missing historical migration:** `public.profiles`, `public.stores`, and
   `public.orders` were created in historical `supabase/schema.sql`, not by an
   active CURRENT HEAD migration.
2. **Baseline omitted from the active replay set:** the modern product
   migrations are present, but the foundational account, store, order,
   quotation, mockup, payment, fulfillment, notification, permission, audit,
   and repeat-order creators are not all present.
3. **Migration-history truncation/repository reconstruction artifact:** the
   archived/reverted remote migration set contains creators and lifecycle
   objects that are absent from the active directory. The nine `_applied.sql`
   files are markers, not executable definitions.
4. **Ordering problem:** several active migrations reference tables, columns,
   or functions that are created by later filename timestamps. For example,
   production/job-order files precede payment completion, and the fulfillment
   schema file alters tables before any active creator exists.
5. **Historical schema treated as a baseline:** `schema.sql` combines schema,
   functions, RLS, grants, storage setup, deterministic rows, and business or
   environment-specific bootstrap evidence. It cannot be replayed as the
   authoritative fresh-install migration.

The first two disposable staging migrations therefore cannot be used as proof
that CURRENT HEAD bootstraps an empty database. No current migration is being
silently skipped in this specification.

## 2. Object ownership matrix

Classification meanings:

- **LEGACY:** historical schema or manual setup evidence.
- **MODERN:** newer foundational model that was intended to replace legacy
  structure.
- **COMPATIBILITY:** transitional columns, views, triggers, or migrations
  needed by existing CURRENT HEAD readers and writers.
- **CURRENT AUTHORITY:** the single model this reconstruction assigns as the
  durable source of truth.

| Object / domain | Type | First historical creator | Current migration creator or modifier | Application dependants | Classification and authority |
|---|---|---|---|---|---|
| `auth.users` | Supabase Auth table | Supabase-managed | Supabase-managed | Auth, account, customer verification | **CURRENT AUTHORITY** for identity; never recreated by repository SQL |
| `public.profiles` | table | `supabase/schema.sql`, introduced in Git history by `deff782` | No active creator; read by role/RLS functions and admin code | Admin actor resolution, staff roles, store scope, RLS | **CURRENT AUTHORITY** for internal actor directory; baseline prerequisite |
| `public.customer_profiles` | table | Active migration `20260806214500_customer_account_email_verification_v1.sql` | `20260806234500...`, `20260810100000...` | Customer account and verified checkout | **CURRENT AUTHORITY** for customer-account extension; not a second staff profile |
| `public.customer_addresses` | table | `20260806214500...` | Later checkout/address migrations | Account, checkout, address snapshots | **CURRENT AUTHORITY** for saved customer addresses |
| `public.stores` | table | `supabase/schema.sql`, historical `deff782` lineage | No active creator; referenced by scopes, pickup, fulfillment, orders | Admin store scope, pickup, fulfillment, order APIs | **CURRENT AUTHORITY** for store scope; baseline prerequisite |
| `public.products` | table | Historical `schema.sql`; modern definition in `20260711000000` | Compatibility and PIM lifecycle migrations | Catalog, PIM, checkout, quotations | **CURRENT AUTHORITY** as unified modern product table; legacy columns compatibility-only |
| `public.product_categories` | table | Historical `schema.sql`; modern definition in `20260711000000` | PIM lifecycle and publication migrations | Catalog, PIM, CMS product selection | **CURRENT AUTHORITY** as modern category table; legacy `is_active` compatibility-only |
| `public.product_subcategories` | table | `schema.sql` | No complete active creator identified | Product/CMS historical reads | **LEGACY / DO NOT REPLAY** until a current reader and owner are approved |
| `public.product_sizes` | table | Modern `20260711000000` | PIM and product migrations | Modern product reads and imports | **MODERN**, but not the operational size-master authority |
| `public.product_size_master` | table | `schema.sql` historical PIM foundation | No active creator; compatibility and many admin APIs read/write it | Variant editor, inventory, Jersey configurator, PIM | **CURRENT AUTHORITY** for apparel size identity; baseline prerequisite |
| `public.product_variants` | table | Historical `schema.sql`; modern `20260711000000` | Compatibility and PIM lifecycle migrations | Catalog, PIM, checkout, audit | **CURRENT AUTHORITY** as unified modern variant table |
| `public.product_variant_sizes` | table | Historical `schema.sql`; modern `20260711000000` | Compatibility, PIM, inventory, checkout migrations | Sellable SKU matrix, inventory, repeat order | **CURRENT AUTHORITY** for sellable SKU/variant-size relation |
| `public.product_variant_images` | table | Historical `schema.sql`; modern `20260711000000` | Image and publication migrations | Catalog and product admin | **CURRENT AUTHORITY** for product media relation |
| `product_price_tiers`, `product_minimum_rules` | tables | Modern `20260711010000` | Compatibility, PIM, commerce migrations | Bulk/custom pricing and checkout | **CURRENT AUTHORITY** for pricing rules |
| `custom_services`, `service_pricing_rules` | tables | Modern `20260711010000` | Compatibility and custom commerce migrations | Custom order and quotation draft flows | **CURRENT AUTHORITY** for configured service pricing |
| `inventory_locations`, `inventory_balances`, `inventory_movements` | tables | Active `20260720020000_order_operations_phase4_13.sql` | P15 inventory migrations | Inventory operations and admin | **CURRENT AUTHORITY** for operational stock ledger |
| `stock_reservations` | table | `20260714090000_commerce_foundation_v1_p0.sql` | P15 inventory and order-operation migrations | Checkout, payment, cancellation, refund | **CURRENT AUTHORITY** for reservations |
| `product_variant_sizes.stock_quantity` | column | Modern `20260711000000` | P15 inventory migrations and compatibility triggers | Catalog/admin compatibility reads | **COMPATIBILITY / read model** once inventory ledger is authoritative |
| `public.orders` | table | Historical `schema.sql`, first found in Git history via `52ffe1b` | Numerous active commerce/order migrations | Checkout, account orders, admin operations, payment, fulfillment | **CURRENT AUTHORITY** for order aggregate; baseline prerequisite |
| `public.order_items` | table | Historical `schema.sql` | Active order/custom commerce migrations | Checkout, pricing, production, fulfillment | **CURRENT AUTHORITY** for order lines; baseline prerequisite |
| `public.order_status_history` | table | Historical `schema.sql` | Active order operations and cancellation migrations | Admin audit, order timeline | **CURRENT AUTHORITY** for order lifecycle history; baseline prerequisite |
| `order_payments`, payment sequences | tables | Archived `20260712060316_payment_tracking_phase_5a.sql` | Active payment, refund, and order-operation migrations | Payments, verification, refunds, production eligibility | **CURRENT AUTHORITY**; archived creator must be reconstructed |
| `payment_submission_links`, `payment_adjustments`, `payment_activity_history` | tables | Active `20260712142905...` and later | Payment verification and refund migrations | Public/admin payment flows | **CURRENT AUTHORITY** as payment extensions, not replacement for `order_payments` |
| `quotations`, `quotation_items`, `quotation_item_services` | tables | Archived `20260711233342_v1_2_phase_1_formal_quotation_foundation.sql` | Archived lifecycle/version files; no active creator | Admin quotation, quotation-to-order, snapshot RPC | **CURRENT AUTHORITY**; archived creator required before active chain |
| `quotation_status_history`, `quotation_versions` | tables | Archived phase 1 and phase 2 migrations | Archived lifecycle files | Quotation lifecycle, revisions, approval | **CURRENT AUTHORITY** |
| `quotation_drafts`, `quotation_draft_items` | tables | Modern `20260711010000` | Compatibility and custom commerce migrations | Public custom configuration intake | **CURRENT AUTHORITY** for pre-quotation drafts only; not the final quotation aggregate |
| `mockup_sets`, `mockup_parts`, `mockup_files` | tables | Archived `20260712045041_mockup_approval_foundation_phase_3a.sql` | Archived lifecycle and order conversion files | Mockup admin and approval | **CURRENT AUTHORITY**; archived creator required |
| `mockup_review_links`, approval history | tables | Archived `20260712050712_mockup_public_approval_phase_3b.sql` | Archived/public approval lifecycle files | Public token approval and admin review | **CURRENT AUTHORITY**; token scope is security boundary |
| `job_orders`, `work_items` and histories | tables | Active `20260712070529_phase7_to_phase9_production_foundation.sql` | Phase 7–9 production migrations | Production board, work item operations | **CURRENT AUTHORITY** after quotation/order prerequisites are restored |
| `qc_records` and QC histories/files | tables | Active `20260712145657_v1_2_phase_10_qc_schema_security.sql` | QC lifecycle migrations | QC admin and production completion | **CURRENT AUTHORITY** |
| `fulfillments`, fulfillment items/files/history | tables | Archived `20260712070816_phase10_qc_phase11_fulfillment.sql` | Active phase 11 extensions | Shipping, pickup, fulfillment | **CURRENT AUTHORITY**; archived creator required before active ALTERs |
| `notification_templates`, events, notifications, deliveries | tables | Archived `20260712070942_phase12_notifications.sql` | Archived notification audit set; active outbox integrations | Admin inbox, customer notifications, event hooks | **CURRENT AUTHORITY** for notification state; outbox is delivery queue, not competing source |
| `customer_notification_outbox` | table | Active `20260720020000_order_operations_phase4_13.sql` | Later notification and order-operation migrations | Customer notification enqueue/retry | **CURRENT AUTHORITY** for outbound queue only |
| `permission_definitions`, `role_permissions` | tables | Archived `20260712071034_phase13_permissions_matrix.sql` | Active role/RLS alignment and later permission grants | Admin RBAC and `has_permission` | **CURRENT AUTHORITY** for permission catalog; archived creator required |
| `public.profiles.role` and store assignments | columns/tables | Historical profile schema; later role/store migrations | Active RBAC migrations | Actor role and store scope | **COMPATIBILITY / actor attributes** consumed by canonical permission catalog |
| `system_audit_log` | table | Archived `20260712071058_phase13_append_only_audit.sql` | Active PIM/order audit extensions | Admin audit log, security review | **CURRENT AUTHORITY** for append-only system audit |
| PIM audit tables | tables | Active `20260718100000_pim_phase_7_audit_operations_history.sql` | Later PIM audit migrations | Product audit history | **CURRENT AUTHORITY** for PIM-specific audit detail, feeding system audit semantics |
| `repeat_order_history` | table | Archived `20260712071131_phase14_repeat_order.sql` | Active repeat-order application code | Repeat-order admin/customer flows | **CURRENT AUTHORITY**; archived creator required |
| refund/cancellation tables | tables | Active `20260720020000_order_operations_phase4_13.sql` | Later refund/payment migrations | Cancellation, refund, evidence, stock restoration | **CURRENT AUTHORITY** for refund workflow |
| CMS tables (`page_heroes`, `cms_banners`, `media_assets`, etc.) | tables | Historical `schema.sql` | Only partial later CMS/PIM migrations | Landing page and admin CMS | **LEGACY / separate CMS authority**; include only after current readers and ownership are confirmed |

## 3. Domain authority decisions

| Domain | One current authority | Legacy decision | Rationale |
|---|---|---|---|
| AUTH / PROFILE | `auth.users` for identity; `public.profiles` for internal actor directory; `customer_profiles` for customer extension | Keep the three boundaries, do not merge them | Auth identity is Supabase-owned; staff authorization and customer account data have different lifecycles |
| STORE | `public.stores` | Keep as authoritative and reconstruct | Pickup, order, fulfillment, and store-scope code depend on it |
| PRODUCT | Unified `public.products` plus modern category/variant tables | Migrate historical product columns into the unified table; retain compatibility columns temporarily | Avoid schema.sql and modern tables becoming two authorities |
| PIM | Modern product tables plus PIM lifecycle/audit migrations | Keep old product manager fields as compatibility-only | PIM owns name, slug, SKU, availability, and publication state |
| INVENTORY | `inventory_locations`, `inventory_balances`, `inventory_movements`, and `stock_reservations` | Keep `product_variant_sizes.stock_quantity` as compatibility/read model until deprecation | Reservation and movement integrity cannot be delegated to a denormalized stock field |
| CART / ORDER | `orders` and `order_items` | Reconstruct historical base, then apply current order migrations | `quotation_drafts` and client cart state are not order authority |
| QUOTATION | `quotations` plus items, versions, and histories | Reconstruct archived creator and keep drafts as intake only | Current admin/RPC code requires the formal quotation aggregate |
| PAYMENT | `order_payments` plus payment activity/adjustments/submission links | Reconstruct phase 5A creator; retain later extensions | Payment retry/idempotency and refund flows require one payment aggregate |
| PRODUCTION | `job_orders`, `work_items`, and histories | Keep active phase 7–9 model after prerequisites | Current production UI and transitions target these tables |
| QC | `qc_records` and QC child/history tables | Keep active QC model | QC is a production gate, not a second order status source |
| FULFILLMENT | `fulfillments` and its children/history | Reconstruct archived creator and run later phase 11 extensions | Shipping and pickup workflows reference it directly |
| NOTIFICATION | `notifications`, events, templates, deliveries; outbox as queue | Reconstruct archived base; keep outbox as integration boundary | Notification state and delivery work must not be split between competing inbox tables |
| RBAC | Permission catalog plus role assignments and store-scope predicates | Reconstruct archived permission matrix; retain profiles as actor source | Role names alone are insufficient for least-privilege authorization |
| AUDIT | Append-only `system_audit_log`, with domain-specific audit tables feeding it | Reconstruct archived base; do not use mutable business histories as audit substitute | Security and compliance require immutable audit semantics |
| REPEAT ORDER | `repeat_order_history` | Reconstruct archived creator | Current app routes and admin APIs depend on it |

No legacy object is physically removed by this specification.

## 4. Legacy-to-modern product mapping

| Legacy field/table | Legacy meaning | Modern equivalent | CURRENT HEAD readers/writers | Compatibility requirement | Fresh baseline | Final authority / eventual disposition |
|---|---|---|---|---|---|---|
| `products.nama` | Indonesian product name | `products.name` | Compatibility migration, legacy readers, product APIs | Must exist while legacy trigger/readers remain | YES, as compatibility column | `name` authoritative; `nama` compatibility-only, later deprecate |
| `products.status_aktif` | Boolean active flag | `products.status` (`draft`, `active`, `archived`) | Compatibility/PIM triggers and old admin code | Required for old predicates and backfill | YES, compatibility column | `status` authoritative; `status_aktif` derived compatibility flag |
| `products.price`, `products.harga` | Historical price names | `products.base_price` and later pricing tables | Compatibility trigger and old product paths | Required during migration bridge | YES, compatibility columns if current readers remain | `base_price`/pricing tables authoritative; old names deprecate |
| `products.deskripsi` | Historical description | `products.description` | Compatibility trigger | Required for legacy writes | YES, compatibility column | `description` authoritative; `deskripsi` deprecate |
| `product_variants.variant_name` | Legacy variant label | `product_variants.name` | Compatibility trigger, PIM exports, admin reads | Required for old variant writes | YES, compatibility column | `name` authoritative; `variant_name` deprecate |
| `product_variants.color_name` | Legacy color label | `product_variants.name` plus optional color metadata | Compatibility trigger and frontend/admin readers | Required until all callers use modern name | YES, compatibility column | `name` authoritative; `color_name` compatibility-only |
| `product_variants.color_hex` | Legacy color hex | `product_variants.hex_code` | Compatibility trigger and legacy product data | Required for old writes | YES, compatibility column | `hex_code` authoritative; `color_hex` deprecate |
| `product_variants.is_active` | Legacy active flag | `product_variants.status` | Compatibility/PIM policies | Required for old filters and triggers | YES, compatibility column | `status` authoritative; `is_active` derived |
| `product_variant_sizes.size_name` | Denormalized size label | `size_id` → `product_size_master.id` | Admin/PIM, compatibility trigger, product reads | Required until all callers use `size_id` | YES, compatibility/read column | `size_id` and size master authoritative; `size_name` derived/deprecate |
| `product_variant_sizes.stock` | Legacy stock quantity | Inventory ledger and `stock_quantity` read model | Admin, PIM, inventory compatibility paths | Required for current writes and export | YES, compatibility/read column | Inventory ledger authoritative; `stock` deprecate |
| `product_variant_sizes.is_active` | Legacy sellable flag | `product_variant_sizes.status` | Compatibility/PIM/public filters | Required for current predicates | YES, compatibility column | `status` authoritative; `is_active` derived |
| `product_size_master` | Historical canonical apparel size dictionary | `product_sizes` is the modern generic size table | Jersey, variant editor, inventory, PIM, compatibility FK | Required because current code explicitly reads/writes it | YES | `product_size_master` remains apparel-size authority; `product_sizes` must not silently replace it |
| `product_sizes` | Modern generic product size rows | No direct legacy equivalent | Modern foundation and product code | Required by modern migration unless unified by later design | YES | Keep for modern generic sizes; owner must approve whether apparel rows are projected from master |

The modern product status representation must remain enum-compatible because
`20260717093000_pim_phase_5_bulk_edit_atomic.sql` explicitly casts incoming
statuses to `public.product_status` and `public.variant_status`. The current
product compatibility migration cannot run unchanged against that model: it
expects legacy columns that the modern migration does not create and assigns
text expressions to enum-backed status columns. The future baseline or a
replacement compatibility artifact must preserve enum authority while keeping
legacy fields as text/boolean compatibility projections.

## 5. Status reconciliation

The table below records the intended canonical model. Existing code and
historical migrations still contain aliases; this is a design map, not a code
change.

| Domain | Legacy state(s) | Current state(s) observed | Database type | Application type | Migration owner / decision |
|---|---|---|---|---|---|
| Product | `status_aktif=true/false` | `draft`, `active`, `archived` | `public.product_status` enum | string union / text | `20260711000000` plus PIM; enum is authoritative, boolean is derived |
| Variant | `is_active`, legacy active/inactive | `active`, `inactive`, `out_of_stock` | `public.variant_status` enum | string union / text | `20260711000000` plus PIM; enum is authoritative |
| Size | `is_active` | `active`, `inactive` | `public.size_status` enum where modern model is used; boolean on size master | text/boolean | Modern size status is authoritative for modern rows; master boolean remains compatibility until unified |
| Order | `baru`, `menunggu_pembayaran`, `sudah_dibayar`, `masuk_produksi`, `proses_produksi`, `quality_check`, `siap_diambil`, `siap_dikirim`, `selesai`, `dibatalkan` | `awaiting_payment`, `processing`, `under_review`, `awaiting_customer_approval`, `confirmed`, `in_production`, `ready_for_pickup`, `shipped`, `completed`, `cancelled`, plus `expired` | text with explicit CHECK constraints | string literals in RPCs and TypeScript | Commerce foundation and later order migrations; canonical English values must be selected and legacy values mapped, not mixed indefinitely |
| Payment | `belum_bayar`, `menunggu_verifikasi`, `terverifikasi`, `ditolak` | `unpaid`, `pending_verification`, `partially_paid`, `paid`, `rejected`, `expired`, `refunded` | text CHECK plus `order_payments.status` | string literals | Phase 5A/5B and commerce foundation; canonical payment vocabulary is English, historical values are compatibility aliases |
| Quotation | draft/review/quoted historical variants | `draft`, `submitted`, `reviewing`, `quoted`, `expired`, `cancelled` | `public.quotation_status` enum | string enum-like values | Bulk ordering and archived formal quotation foundation; one enum must be retained and lifecycle transitions must use it |
| Production | `masuk_produksi`, `proses_produksi` | `draft`, `ready`, `released`, `in_progress`, `on_hold`, `completed`, `cancelled` | text CHECK | string literals | Phase 7–9 production migrations; job/work statuses are authoritative, order status is a projection |
| QC | `quality_check` | record status `draft`, `in_review`, `completed`, `archived`; result lifecycle `pending` and completion values | text CHECK | string literals | Phase 10 QC migrations; QC record/result authority, not order status |
| Fulfillment | `siap_diambil`, `siap_dikirim`, `selesai` | `preparing`, `packing`, `ready_to_ship`, `shipped`, `in_transit`, `ready_for_pickup`, `delivered`, `picked_up`, `problem`, `cancelled` | text CHECK | string literals | Phase 11 and commerce bridge; fulfillment status authoritative for delivery, order status derived |
| Refund | `ditolak` or payment rejection aliases | cancellation request `pending`, `approved`, `approved_refund_required`, `rejected`, `completed`, `cancelled`; refund case lifecycle | text CHECK | string literals | Order operations phase 4–13; refund tables authoritative, payment/order statuses are projections |

The required follow-up design decision is the canonical order vocabulary.
Current code already accepts both Indonesian historical values and newer
English values. The fresh architecture must choose one canonical set and put
all compatibility mapping in one boundary rather than allowing every RPC to
accept both indefinitely.

## 6. Migration dependency graph

### Logical graph

```text
Supabase-managed auth.users
        |
        v
extensions: pgcrypto, btree_gist
        |
        +--> profiles --> permission catalog / actor authorization
        |                  |
        |                  +--> store scope --> stores
        |
        +--> unified product/category/variant foundation
        |       |
        |       +--> product_size_master + product_sizes reconciliation
        |       +--> PIM product lifecycle and pricing
        |       +--> inventory locations/balances/movements/reservations
        |
        +--> orders --> order_items --> order_status_history
                    |
                    +--> formal quotations --> quotation items/services
                    |        --> quotation versions/status history
                    |        --> mockup sets/parts/files/approval links
                    |
                    +--> order conversion/order_item_services
                             --> order_payments/payment sequences
                             --> payment activity/adjustments/submission links
                             --> job_orders/work_items
                                     --> QC
                                     --> fulfillments/pickup/shipping
                                             --> notification events/deliveries
                    |
                    +--> cancellation/refund/stock restoration

permission catalog + actor/store scope
        --> RLS/policies/grants on every exposed domain
        --> SECURITY DEFINER authorization boundaries

append-only audit foundation
        --> PIM/order/payment/notification/fulfillment audit extensions

repeat_order_history
        --> repeat-order APIs and admin flows

Wave 0C quotation snapshot security
        --> existing formal quotation snapshot RPC only after quotation base
```

### Actual dependency failures found

| Dependent migration | Requires | Creator or required position | Conflict |
|---|---|---|---|
| `20260711154031_v1_0_product_foundation_compatibility.sql` | `profiles`, legacy product columns, `product_size_master` | No active creator; historical `schema.sql` only | Fails immediately on fresh CURRENT HEAD; also conflicts with enum-backed modern status columns |
| `20260712070529_phase7_to_phase9_production_foundation.sql` | `orders`, `quotations`, `mockup_sets`, `order_item_services`, order/payment columns, authorization | Historical base plus archived quotation/mockup/order-conversion/payment files | Current position is before the missing creators and before later payment columns |
| `20260712095523_v1_2_phase_7_job_order_foundation_and_security.sql` | order production/payment columns, quotation/mockup relationships, job base | Later payment/order migrations currently have later filenames | Current filename position is too early |
| `20260712142905_v1_2_phase_5b_payment_completion.sql` | `orders`, `order_payments`, payment sequences and payment functions | Archived phase 5A must precede it | Current active set lacks phase 5A creator |
| `20260712143745_v1_2_phase_5b_payment_audit_lock.sql` | payment functions and tables | Phase 5A/5B definitions | Current active set revokes/grants absent functions |
| `20260712154540_v1_2_phase_11_fulfillment_schema_and_audit.sql` | `fulfillments`, `fulfillment_status_history` | Archived phase 10/11 creator | Begins with `ALTER TABLE` against absent tables |
| `20260712155210_v1_2_phase_11_fulfillment_table_grants.sql` | fulfillment table family | Archived creator plus phase 11 schema | Grant target tables do not exist in a fresh active-only replay |
| `20260713090000_v1_2_phase_13_role_catalog_and_rls_alignment.sql` | permission catalog and actor authorization | Archived permissions migration or baseline | Functions/policies call permission logic that is not created by active early chain |
| later order-operation migrations | order, payment, fulfillment, inventory, notification and permission objects | Earlier logical foundation | Filename order alone does not prove dependencies are satisfied |
| Wave 0C migration | formal quotation snapshot RPC | Formal quotation foundation | Cannot be reached while quotation creator/RPC is absent |

The dependency graph was derived from SQL `CREATE`, `ALTER`, function body,
policy, grant, and foreign-key references plus current application table/RPC
calls. It is not based solely on filename names.

## 7. Logical order versus current filename order

### Required logical order

1. Supabase-managed `auth.users` and repository-required extensions.
2. Unified baseline: profiles, stores, RBAC prerequisites, product/category/
   variant/size foundations, compatibility columns, base orders/order items/
   status history, and missing formal quotation/order/payment/fulfillment/
   notification/audit/repeat-order creators.
3. Modern bulk/custom foundation.
4. Compatibility and PIM bridges, with the product compatibility migration
   replaced by an enum-safe implementation accounted for by the baseline.
5. Document-numbering rules and allocators.
6. Formal quotation lifecycle, versions, mockup approval, order conversion,
   and payment tracking/completion.
7. Production job orders, work items, and status transitions.
8. QC foundation and lifecycle.
9. Fulfillment foundation and lifecycle.
10. Permission catalog/RBAC alignment before permission-dependent functions,
    followed by audit foundations and domain audit extensions.
11. Commerce, inventory, PIM, custom-commerce, customer-account, refund,
    pickup, notification, and later CURRENT HEAD corrections in dependency
    order.
12. Wave 0C quotation snapshot security migration.

### Current filename order conflicts

- The active directory starts modern product and bulk migrations before the
  missing historical account/store/order roots.
- The active production foundation appears before the archived formal quotation,
  mockup, order-conversion, and payment foundations it references.
- The active job-order security migration at `20260712095523` appears before
  payment/order columns added at `20260712142905` and related later files.
- The active fulfillment schema migration begins with `ALTER TABLE` before an
  active creator for `fulfillments` or `fulfillment_status_history` exists.
- Permission-dependent functions and policies can appear before the permission
  catalog unless the catalog is part of the baseline.
- The nine `_applied.sql` files sit in the active directory but contain only
  historical markers and cannot satisfy any dependency.

Filename timestamp order is therefore not the executable order.

## 8. Historical remote-only object inventory

These objects were found in archived/reverted migration evidence at commit
`6ba0dee` and are not equivalent to active creators in the current directory.

| Object family | Historical source | CURRENT HEAD still depends on it? | Equivalent active creator? | Reconstruction decision | Security impact if omitted |
|---|---|---:|---:|---|---|
| `quotations`, `quotation_items`, `quotation_item_services`, `quotation_status_history` | `20260711233342_v1_2_phase_1_formal_quotation_foundation.sql` | YES | NO | Reconstruct into baseline or a recovered pre-chain migration | Quotation access, status transitions, conversion, and Wave 0C security cannot exist |
| quotation lifecycle functions | phase 1 formal quotation plus `20260712024434`, `20260712032651` | YES | NO | Reconstruct with explicit actor/store/ownership checks | Missing functions cause hard failures; insecure public resurrection must be prevented |
| `quotation_versions` | `20260712040220_quotation_versioning_phase_2.sql` | YES | NO | Reconstruct before quotation revision callers | Version integrity and quoted-total history would be absent |
| `mockup_sets`, `mockup_parts`, `mockup_files`, approval history | `20260712045041_mockup_approval_foundation_phase_3a.sql` | YES | NO | Reconstruct before job/order conversion | Mockup approval and production gating would fail |
| `mockup_review_links` and public approval RPCs | `20260712050712_mockup_public_approval_phase_3b.sql` | YES | NO | Reconstruct token-scoped public workflow | Public token access could be absent or incorrectly exposed |
| order conversion columns and `order_item_services` | `20260712053258_order_conversion_phase_4_schema.sql` plus follow-ups | YES | NO complete creator | Reconstruct as base order-conversion foundation | Order creation, service snapshots, and job-order FKs fail |
| `order_number_sequences` and conversion functions | phase 4 files | YES | NO complete creator | Reconstruct before numbering/order RPCs | Duplicate/missing order numbering and unsafe conversion |
| `order_payments`, `payment_number_sequences` | `20260712060316_payment_tracking_phase_5a.sql` | YES | NO | Reconstruct before phase 5B and refunds | Payment retry, idempotency, and refund allocation cannot be secured |
| fulfillment base tables and functions | `20260712070816_phase10_qc_phase11_fulfillment.sql` | YES | NO | Reconstruct before active phase 11 ALTER/grants | Shipping/pickup status and ownership controls fail |
| notification templates/events/notifications/deliveries | `20260712070942_phase12_notifications.sql` | YES | NO complete creator | Reconstruct before notification hooks and admin inbox | Notifications may fail or be exposed without event/actor boundaries |
| notification audit and lifecycle tables | archived `20260713022359`–`20260713024010` set | YES for current admin/audit consumers | NO complete active equivalent | Recover only after base notification model is fixed | Delete/template/audit controls could be missing |
| `permission_definitions`, `role_permissions`, permission functions | `20260712071034_phase13_permissions_matrix.sql` | YES | Partial later alignment only | Reconstruct permission catalog before permission-dependent SQL | RLS and SECURITY DEFINER authorization could fail closed or be bypassed |
| `system_audit_log` and audit functions | `20260712071058_phase13_append_only_audit.sql` | YES | Domain-specific audit only | Reconstruct append-only base | Security events would lack immutable evidence |
| `repeat_order_history` | `20260712071131_phase14_repeat_order.sql` | YES | NO | Reconstruct before repeat-order routes | Repeat-order history and ownership checks fail |

The archived files are evidence, not approved direct replay inputs. Their
security-definer bodies, grants, policies, storage operations, and system-row
inserts require review before being integrated.

## 9. Baseline boundary

The future baseline must contain only foundational objects that are required
before the first safe incremental migration can execute. Under the proposed
architecture, that boundary is:

### BASELINE

- `pgcrypto` and `btree_gist` only where required by actual baseline objects.
- `public.profiles` with role/store-scope columns required by current readers,
  without a new Auth trigger.
- `public.stores` and store-scope foreign keys.
- Permission/RBAC prerequisites required by baseline policies and functions.
- Unified modern product/category/variant/image/size structures, including
  `product_size_master`, compatibility columns, canonical enum status types,
  keys, indexes, triggers, RLS, and grants.
- Base `orders`, `order_items`, and `order_status_history` with the columns
  required by the first order/payment/production migrations.
- Formal quotation, mockup, order-conversion, payment, fulfillment,
  notification, append-only audit, and repeat-order creators that are absent
  from active CURRENT HEAD but required by the first dependent migrations.
- Only foundational functions, triggers, constraints, and security policies
  required for those objects and later migration dependencies.

### INCREMENTAL MIGRATION

- Bulk/custom pricing and draft/configuration objects from
  `20260711010000_v1_1_bulk_custom_ordering.sql`.
- Numbering allocators and histories.
- Quotation, mockup, payment, production, QC, fulfillment, notification,
  PIM, inventory, customer-account, refund, pickup, and commerce lifecycle
  refinements once their creators exist.
- Domain audit extensions and later RLS/grant hardening.
- Wave 0C quotation snapshot security migration.

### COMPATIBILITY ONLY

- Legacy product columns and synchronized triggers.
- Legacy boolean/status aliases.
- `size_name`, `stock`, and legacy variant/color fields while current app
  readers still use them.
- Compatibility migration bookkeeping in `debroder_schema_versions`.

### HISTORICAL ONLY

- The original `schema.sql` as a whole.
- Archived/reverted SQL before its objects are deliberately reconstructed.
- `_applied.sql` markers and migration reconciliation evidence.

### SEED ONLY

- Deterministic system catalogs or service definitions that are explicitly
  required by an incremental migration and are idempotent. They must not be
  mixed with baseline schema or business fixtures.

### DO NOT REPLAY

- `seed.sql`, `make-superadmin.sql`, production/business rows, real Auth
  identities, storage assets, environment IDs, manual dashboard SQL, and
  standalone legacy SQL.

## 10. Complete proposed replay manifest

This is a proposed logical manifest, not an executable command list. The
baseline filename is intentionally unset until the owner approves the design
and a migration ID is generated by the Supabase CLI. `REORDER` means the
migration remains repository-controlled but must be placed at its dependency
position. `REPLACED BY BASELINE` is not a silent skip: the baseline must carry
the complete table, type, index, trigger, RLS, policy, grant, and function
coverage listed in the source migration.

### Manifest header

```text
EMPTY SUPABASE
  -> OWNER-APPROVED BASELINE (filename not yet generated)
  -> reconciled modern/bulk/compatibility foundations
  -> recovered quotation/mockup/order-conversion/payment foundations
  -> numbering and production/QC/fulfillment foundations in topological order
  -> commerce/PIM/inventory/customer/account/refund corrections
  -> Wave 0C quotation snapshot security
  -> CURRENT HEAD
```

### Active repository migrations

| Migration file(s) | Classification | Required placement or reason |
|---|---|---|
| `20260711000000_v1_0_product_foundation.sql` | REPLACED BY BASELINE | Baseline must own the unified product tables, enum types, indexes, triggers, RLS, policies, grants, and public-read/staff boundaries while adding legacy compatibility columns safely |
| `20260711010000_v1_1_bulk_custom_ordering.sql` | RUN | After baseline product, profile, and Auth prerequisites |
| `20260711154031_v1_0_product_foundation_compatibility.sql` | REPLACED BY BASELINE | As written it references absent legacy columns and applies text expressions to enum-backed status columns; its intended compatibility coverage must be integrated in an enum-safe baseline/replacement |
| `20260711154141_v1_1_bulk_custom_ordering_compatibility.sql` | COMPATIBILITY | After the bulk foundation; system service/storage rows and policies must be verified as idempotent and non-business |
| `20260712070227_phase6_document_numbering.sql` | RUN | After baseline sequences/prerequisites |
| `20260712070529_phase7_to_phase9_production_foundation.sql` | REORDER | After recovered quotation, mockup, order-conversion, payment, and base order objects |
| `20260712091640_v1_2_phase_6_numbering_history_and_alignment.sql` | RUN | After document-numbering base |
| `20260712091712_v1_2_phase_6_numbering_allocator_and_registry.sql` | RUN | After numbering history/base |
| `20260712091748_v1_2_phase_6_numbering_lifecycle_and_security.sql` | RUN | After numbering allocator |
| `20260712093500_v1_2_phase_6_permanent_delete_audit_and_sequence_cleanup.sql` | RUN | After numbering and audit prerequisites |
| `20260712095523_v1_2_phase_7_job_order_foundation_and_security.sql` | REORDER | After payment/order columns and recovered production prerequisites |
| `20260712095652_v1_2_phase_7_job_order_creation_atomic_number.sql` | RUN | After job-order base and numbering |
| `20260712100924_v1_2_phase_7_notification_dependency_ambiguity_fix.sql` | RUN | After notification base and job-order functions |
| `20260712101029_v1_2_phase_7_job_order_history_trigger_alignment.sql` | RUN | After job-order history base |
| `20260712115943_v1_2_phase_8_work_item_schema_and_audit.sql` | RUN | After work-item base |
| `20260712120223_v1_2_phase_8_work_item_creation_and_dependencies.sql` | RUN | After work-item schema and order-item-service prerequisites |
| `20260712120309_v1_2_phase_8_work_item_status_and_archive.sql` | RUN | After work-item creation |
| `20260712120353_v1_2_phase_8_work_item_security_and_delete.sql` | RUN | After work-item status/archive |
| `20260712131753_v1_2_phase_9_production_status_and_progress.sql` | RUN | After job/work status model |
| `20260712132103_v1_2_phase_9_job_order_status.sql` | RUN | After production status/progress |
| `20260712132131_v1_2_phase_9_work_item_status.sql` | RUN | After work-item status model |
| `20260712142905_v1_2_phase_5b_payment_completion.sql` | REORDER | After recovered phase 5A payment base and before production functions that consume payment eligibility |
| `20260712143745_v1_2_phase_5b_payment_audit_lock.sql` | REORDER | After payment base/completion functions exist |
| `20260712145657_v1_2_phase_10_qc_schema_security.sql` | RUN | After production/job/work objects |
| `20260712150010_v1_2_phase_10_qc_begin_only_check.sql` | RUN | After QC schema |
| `20260712150036_v1_2_phase_10_qc_create_record.sql` | RUN | After QC schema |
| `20260712150101_v1_2_phase_10_qc_update_draft.sql` | RUN | After QC create functions |
| `20260712150123_v1_2_phase_10_qc_archive_restore.sql` | RUN | After QC draft lifecycle |
| `20260712150203_v1_2_phase_10_qc_completion_integration.sql` | RUN | After production and QC lifecycle |
| `20260712150646_v1_2_phase_10_qc_remove_file.sql` | RUN | After QC files |
| `20260712150711_v1_2_phase_10_qc_permanent_delete_alignment.sql` | RUN | After QC archive/delete controls |
| `20260712154540_v1_2_phase_11_fulfillment_schema_and_audit.sql` | REORDER | After recovered fulfillment base creator |
| `20260712154619_v1_2_phase_11_fulfillment_create_and_update.sql` | RUN | After fulfillment base/schema |
| `20260712154659_v1_2_phase_11_fulfillment_status_and_sync.sql` | RUN | After fulfillment create/update |
| `20260712154952_v1_2_phase_11_fulfillment_lifecycle.sql` | RUN | After fulfillment status/sync |
| `20260712155021_v1_2_phase_11_fulfillment_delete_audit.sql` | RUN | After fulfillment lifecycle |
| `20260712155146_v1_2_phase_11_fulfillment_security.sql` | RUN | After fulfillment tables and actor/RBAC |
| `20260712155210_v1_2_phase_11_fulfillment_table_grants.sql` | RUN | After fulfillment tables |
| `20260712155229_v1_2_phase_11_fulfillment_rpc_grants.sql` | RUN | After fulfillment RPC definitions |
| `20260712155253_v1_2_phase_11_fulfillment_bucket.sql` | RUN | After storage/bucket policy decision |
| `20260712155305_v1_2_phase_11_fulfillment_storage_policy_cleanup.sql` | RUN | After fulfillment storage bucket |
| `20260712155315_v1_2_phase_11_fulfillment_storage_read.sql` | RUN | After storage policy base |
| `20260712155326_v1_2_phase_11_fulfillment_storage_upload.sql` | RUN | After storage read policy |
| `20260712155341_v1_2_phase_11_fulfillment_storage_delete.sql` | RUN | After storage upload policy |
| `20260713002645_v1_2_phase_11_archived_file_cleanup.sql` | RUN | After fulfillment archive/file objects |
| `20260713003444_v1_2_phase_11_history_trigger_alignment.sql` | RUN | After fulfillment history |
| `20260713090000_v1_2_phase_13_role_catalog_and_rls_alignment.sql` | REORDER | Permission catalog must exist before permission-dependent policies/functions; baseline may satisfy the root |
| `20260713091500_v1_2_phase_13_production_history_rls.sql` | RUN | After production history and RBAC |
| `20260713143000_commerce_jersey_experience.sql` | RUN | After product/size/store/order foundations |
| `20260713201237_payment_authenticated_actor_acl_correction.sql` | RUN | After payment objects and RBAC |
| `20260713223000_jersey_owner_approved_experience_addendum.sql` | RUN | After Jersey foundation |
| `20260714005325_guest_order_tracking_security.sql` | RUN | After orders and tracking columns |
| `20260714090000_commerce_foundation_v1_p0.sql` | RUN | After order/payment/inventory prerequisites |
| `20260714100000_commerce_foundation_v1_p0_checkout_variable_correction.sql` | RUN | After commerce foundation |
| `20260714101500_commerce_foundation_v1_p0_checkout_variable_normalization.sql` | RUN | After checkout correction |
| `20260714103000_commerce_foundation_v1_p0_whatsapp_digest_schema.sql` | RUN | After order/checkout foundation |
| `20260714104500_commerce_foundation_v1_p0_sequence_rls_lock.sql` | RUN | After commerce sequences/RLS |
| `20260714110000_commerce_foundation_v1_p0_ready_stock_fulfillment_bridge.sql` | RUN | After fulfillment, payment, and stock reservation authority |
| `20260714111500_commerce_foundation_v1_p0_notification_render_resilience.sql` | RUN | After notification base |
| `20260715050713_p0_security_acl_actor_directory.sql` | RUN | After profiles/RBAC/actor directory |
| `20260715053035_p0_security_canonical_cancellation.sql` | RUN | After order/payment/refund prerequisites |
| `20260715054519_p0_security_controlled_stale_reservation_cleanup.sql` | RUN | After stock reservations |
| `20260715060557_p0_security_checkout_abuse_protection.sql` | RUN | After order and private ledger foundations |
| `20260715104222_pim_phase_1_product_lifecycle_consolidation.sql` | RUN | After unified product foundation |
| `20260715223043_admin_three_roles_read_only.sql` | RUN | After profiles/RBAC |
| `20260716143000_pim_phase_4_bulk_import_atomic.sql` | RUN | After PIM product authority |
| `20260717093000_pim_phase_5_bulk_edit_atomic.sql` | RUN | After canonical enum product status |
| `20260717160000_custom_commerce_foundation.sql` | RUN | After product/order/quotation foundations |
| `20260717173000_custom_commerce_cms_alignment.sql` | RUN | After custom commerce tables |
| `20260717193000_pim_phase_6_export_reconciliation.sql` | RUN | After PIM tables and canonical status |
| `20260718100000_pim_phase_7_audit_operations_history.sql` | RUN | After audit foundation and PIM tables |
| `20260718113000_custom_pricing_payment_final_guard.sql` | RUN | After custom pricing/payment |
| `20260718150000_custom_admin_operational_hotfix.sql` | RUN | After payment/notification/RBAC |
| `20260718180000_custom_order_end_to_end_revision.sql` | RUN | After order, quotation, fulfillment, region prerequisites |
| `20260718181000_indonesia_regions_province_regency_district_seed.sql` | RUN | Deterministic reference data after region tables are established |
| `20260718182000_indonesia_regions_village_postal_seed.sql` | RUN | Deterministic reference data after parent region seed |
| `20260718182500_custom_checkout_address_snapshot_method.sql` | RUN | After customer/address and order foundations |
| `20260719110000_admin_order_pricing_workspace.sql` | RUN | After quotation/order pricing structures |
| `20260719140000_payment_verification_and_fulfillment.sql` | RUN | After payment and fulfillment authority |
| `20260720010000_order_integrity_handoff_phase0_3.sql` | RUN | After order/task/fulfillment/notification dependencies |
| `20260720014220_fix_ready_stock_trigger_record_field.sql` | RUN | After related order triggers |
| `20260720014603_fix_cross_table_trigger_record_resolution.sql` | RUN | After order/payment/fulfillment trigger base |
| `20260720020000_order_operations_phase4_13.sql` | RUN | After permission catalog, order/payment/fulfillment/inventory/notification roots |
| `20260720030000_human_centered_order_experience_p0.sql` | RUN | After cancellation, task, fulfillment, notification roots |
| `20260720034655_fix_order_handoff_digest_schema_qualification.sql` | RUN | After order handoff structures |
| `20260720035945_fix_pay_at_store_final_verification.sql` | RUN | After pay-at-store and fulfillment structures |
| `20260720040000_restore_order_task_authenticated_select_grants.sql` | RUN | After order task tables |
| `20260721090000_p0_security_critical_legacy_containment_c1.sql` | RUN | After canonical order/RBAC security objects |
| `20260722194500_p0_hotfix_02_public_media_pickup_idempotency.sql` | RUN | After public media and pickup foundations |
| `20260723035324_batch_4_canonical_commerce_foundation_v1.sql` | RUN | After canonical commerce roots |
| `20260723035606_batch_4_product_commerce_defaults_sync_v1.sql` | RUN | After product/PIM and commerce roots |
| `20260723061956_batch_4_a3_checkout_integrity_v1.sql` | RUN | After checkout/order authority |
| `20260723193533_p7b_policy_database_alignment_v1.sql` | RUN | After RLS/RBAC foundations |
| `20260724011535_p8b_size_adjustment_data_mutation_v1.sql` | RUN | After size/product authority |
| `20260724054241_p15_inventory_authority_stock_ownership_v1.sql` | RUN | After inventory ledger and product variant-size relation |
| `20260724054617_p15_inventory_reservation_reconciliation_v1.sql` | RUN | After inventory reservation authority |
| `20260724055608_p15_consume_idempotency_correction_v1.sql` | RUN | After inventory consumption functions |
| `20260725070355_admin_rbac_direct_roles_v1.sql` | RUN | After profiles and permission catalog |
| `20260725073814_admin_rbac_restore_anon_is_superadmin_execute.sql` | RUN | After the referenced role function exists; security review required |
| `20260725074004_admin_rbac_restore_anon_rls_predicate_execute.sql` | RUN | After RLS predicate function exists; anonymous execution must remain bounded |
| `20260726090522_global_dashboard_store_scope_restrictive_rls.sql` | RUN | After stores, profiles, and all scoped tables |
| `20260726160000_global_ready_stock_instant_custom_v1.sql` | RUN | After product/order/inventory/quotation services |
| `20260726162000_instant_custom_operations_alignment_v1.sql` | RUN | After instant-custom order authority |
| `20260726164000_public_canonical_inventory_availability_v1.sql` | RUN | After inventory ledger |
| `20260726165000_jersey_experimental_public_copy_correction_v1.sql` | RUN | After Jersey/product authority |
| `20260727073246_p15_zero_balance_matrix_completion_v1.sql` | RUN | After inventory authority |
| `20260727160000_security_function_reachability_acl_v1.sql` | RUN | After all referenced functions exist; must not grant anonymous quotation access |
| `20260728153142_canonical_trial_pricing_v1.sql` | RUN | After product/pricing authority |
| `20260729013734_canonical_product_data_publication_readiness_v1.sql` | RUN | After PIM publication authority |
| `20260729033931_configured_jersey_checkout_v1.sql` | RUN | After Jersey, product, pricing, order, and inventory roots |
| `20260729033946_provisional_product_primary_images_v1.sql` | RUN | After product image authority |
| `20260729045016_ready_stock_fulfillment_trigger_record_fix_v1.sql` | RUN | After fulfillment/order triggers |
| `20260729141510_cotton_combed_tier_pricing_canonical_closure_v1.sql` | RUN | After pricing authority |
| `20260730122821_transaction_notification_admin_recovery_v1.sql` | RUN | After notification/RBAC/audit roots |
| `20260801045549_kaos_polos_editorial_section_types_v1.sql` | RUN | After CMS/PIM ownership is available |
| `20260801115245_pay_at_store_pickup_canonical_workflow_v1.sql` | RUN | After order/payment/pickup/inventory |
| `20260801134645_pay_at_store_pickup_task_ledger_alignment_v1.sql` | RUN | After task and pickup foundations |
| `20260801200909_pay_at_store_pickup_payment_resolver_null_alignment_v1.sql` | RUN | After payment resolver |
| `20260801204856_pay_at_store_cash_evidence_alignment_v1.sql` | RUN | After payment evidence |
| `20260802090000_admin_account_role_experience_v1.sql` | RUN | After profiles/RBAC/customer account |
| `20260806214500_customer_account_email_verification_v1.sql` | RUN | After Auth/profile/customer account prerequisites |
| `20260806234500_customer_checkout_activation_integrity_v2.sql` | RUN | After customer account and order authority |
| `20260810100000_registered_customer_order_access_v1.sql` | RUN | After customer account and all order creators/functions |
| `20260815212358_wave_0c_quotation_snapshot_security.sql` | RUN | Last security correction after formal quotation snapshot RPC; retain revokes and authorization |

### Historical marker files

| Files | Classification | Reason |
|---|---|---|
| `mockup_approval_foundation_phase_3a_applied.sql`, `mockup_public_approval_phase_3b_applied.sql`, `order_conversion_phase_4_applied.sql`, `order_conversion_phase_4_security_lock_applied.sql`, `payment_tracking_phase_5a_applied.sql`, `quotation_item_lifecycle_phase_1c_applied.sql`, `quotation_lifecycle_phase_1e_applied.sql`, `quotation_service_lifecycle_phase_1d_applied.sql`, `quotation_versioning_phase_2_applied.sql` | HISTORICAL ONLY | These files contain applied markers only; their archived SQL definitions must be reconstructed, not replayed as empty markers |

### Explicit non-migration artifacts

| Artifact | Classification | Reason |
|---|---|---|
| `supabase/schema.sql` | DO NOT RUN | Mixed historical schema, data/bootstrap, storage, policies, grants, and functions; conflicts with modern tables |
| `seed.sql` | DO NOT RUN | Business/reference seed data is outside a fresh schema baseline |
| `make-superadmin.sql` | DO NOT RUN | Environment-specific Auth email and profile bootstrap |
| standalone PIM/CMS/legacy SQL | HISTORICAL ONLY / DO NOT RUN | No deterministic migration identity or complete dependency contract |
| archived `supabase remote` SQL | HISTORICAL ONLY | Source evidence for deliberate reconstruction; direct replay would duplicate or reorder objects |

There are no silent skips in this manifest. Any `REPLACED BY BASELINE` entry
requires a future static coverage test proving that every object, constraint,
index, trigger, RLS state, policy, grant, and function is represented in the
baseline or an explicitly ordered replacement.

## 11. Security preservation requirements

The future baseline and replay manifest must preserve the following rules:

- Enable RLS on every exposed `public` table.
- Use `TO authenticated`/`TO anon` explicitly and combine it with ownership,
  role, or store-scope predicates.
- Do not use editable `raw_user_meta_data` for authorization. Authorization
  data belongs in protected profile/RBAC structures or trusted app metadata.
- Keep customer ownership, staff role, and store scope as separate predicates.
- Keep service-role access server-side only.
- Every `SECURITY DEFINER` function must have an explicit safe
  `search_path`, validate caller authorization, and enforce ownership/store
  scope in its body.
- Revoke default `PUBLIC` and `anon` execution wherever a function is not an
  intentional public token workflow.
- The Wave 0C `build_quotation_snapshot(uuid)` fix must remain reachable after
  formal quotation foundations and must require the quotation read contract;
  anonymous quotation-ID access must not be resurrected.
- Do not restore historical broad grants merely because an archived migration
  contained them. Grants must be re-derived from the current role matrix.
- Storage bucket policies must be included only for required workflows and
  must remain private where files contain customer designs, payments, mockups,
  fulfillment evidence, or refunds.
- Append-only audit rows must not be mutable by ordinary authenticated users.

## 12. Objects intentionally excluded

The future baseline must exclude real or environment-bound content:

- customer records and Auth identities;
- orders, payments, quotations, fixtures, and production records;
- production products, prices, SKU rows, inventory quantities, and store
  content;
- CMS marketing content and media assets;
- specific Super Admin identities or emails;
- storage objects and production paths;
- environment-specific UUIDs and pickup/order IDs;
- `schema.sql` and `seed.sql` replay;
- dashboard/manual SQL and undocumented remote state.

Deterministic system catalogs may be introduced only by reviewed,
repository-controlled incremental migrations and must be clearly separated
from baseline schema.

## 13. Remaining ambiguities

1. The canonical English order-status vocabulary is not yet selected; code
   currently accepts historical Indonesian and newer English values.
2. The exact intended profile-provisioning path is not documented as a single
   repository contract. No Auth trigger should be added until the owner
   decides whether application provisioning or an explicit server workflow is
   authoritative.
3. `product_size_master` and `product_sizes` both exist in current readers.
   This specification assigns apparel size identity to `product_size_master`,
   but a future projection/synchronization policy still needs approval.
4. The archived remote migration set contains security-definer functions,
   storage operations, system rows, and grants that require function-by-function
   review before reconstruction.
5. The current repository has no `supabase/config.toml` and no installed
   Supabase CLI. A migration ID must be generated by the approved tool; it
   must not be fabricated.
6. The current active directory contains 124 numeric/Wave 0C SQL files plus
   nine marker files, while archived remote history has additional objects and
   different ordering. A final manifest must be validated in a disposable
   local PostgreSQL/Supabase environment before staging.

## 14. Design decisions requiring owner approval

Owner approval is required for:

1. Treating the future baseline as the authority for the unified product
   foundation and replacing the two incompatible product foundation/
   compatibility migrations as executable table creators.
2. Recovering archived quotation, mockup, order-conversion, payment,
   fulfillment, notification, permission, audit, and repeat-order foundations
   into repository-controlled SQL.
3. Selecting one canonical order-status vocabulary and its compatibility map.
4. Confirming application/server profile provisioning without inventing an
   Auth trigger.
5. Confirming `product_size_master` as apparel-size authority and defining any
   modern `product_sizes` projection.
6. Installing or making available the Supabase CLI/tooling needed to generate
   the baseline migration identity and validate the complete replay.
7. After review, resetting/recreating disposable staging before applying the
   final manifest. No staging mutation is authorized by this document.

## 15. Exact next repository mutation after approval

After the owner approves the decisions above, the next repository mutation is:

```text
supabase migration new debroder_fresh_database_baseline
```

The generated filename must be retained exactly. The baseline SQL may then be
written only after the archived object coverage, enum/compatibility design,
RLS/grant matrix, and static collision tests are complete. Historical
migrations, `schema.sql`, and `seed.sql` must remain unchanged.

No baseline migration was created during this forensic task. No remote
database, staging project, production system, fixture set, or authenticated
E2E flow was touched.

DATABASE RECONSTRUCTION SPEC COMPLETE — READY FOR ARCHITECTURE REVIEW
