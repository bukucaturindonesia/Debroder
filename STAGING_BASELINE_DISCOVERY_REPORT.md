# DEBRODER — STAGING BASELINE DISCOVERY

## 1. Root cause

CURRENT HEAD cannot bootstrap an empty database because:

- No active migration creates `public.profiles`, `public.stores`, or `public.orders`.
- Those tables exist only in the historical `supabase/schema.sql`.
- `schema.sql` was used as a manual historical baseline, but is not a migration.
- The active migration chain contains a split between modern product tables and legacy DEBRODER tables.
- Migration history was later truncated/reconstructed: local and historical remote migration sets do not match.

Classification:

- Missing historical migration
- Baseline migration not included in active replay set
- Manual historical schema
- Migration history truncation/reconstruction artifact
- Schema.sql historically treated as baseline
- Ordering problem
- Parallel incompatible product foundations

The staging evidence confirms the problem: only the first two migrations are recorded, with 15 modern tables present. `profiles`, `stores`, `orders`, and `product_size_master` are absent.

## 2. Historical creation locations

- `public.profiles`: [`supabase/schema.sql:13`](<C:/Users/gknma/OneDrive/文档/GitHub/debroder.next/Debroder/supabase/schema.sql:13>)  
  First Git introduction: `deff782`, 2026-07-01.

- `public.stores`: [`supabase/schema.sql:128`](<C:/Users/gknma/OneDrive/文档/GitHub/debroder.next/Debroder/supabase/schema.sql:128>)  
  First Git introduction: `deff782`, 2026-07-01.

- `public.orders`: [`supabase/schema.sql:418`](<C:/Users/gknma/OneDrive/文档/GitHub/debroder.next/Debroder/supabase/schema.sql:418>)  
  First Git introduction detected by history search: `52ffe1b`, 2026-07-05.

No other repository SQL file creates these three tables.

## 3. Candidate baseline artifacts

| Artifact | Repository/history status | Contents and security | Baseline verdict |
|---|---|---|---|
| `supabase/schema.sql` | Tracked; historically revised repeatedly | Creates profiles, stores, orders, order items, CMS/PIM tables, functions, triggers, RLS, policies, grants, storage buckets, and hardcoded master/content data. No auth-user creation trigger. | Historical evidence only. Not schema-only. Unsafe to replay. |
| `supabase/seed.sql` | Tracked | Data-only inserts for products, stores, CMS, services, and settings. No schema, RLS, grants, or auth functions. | Seed data, not baseline. Conflicts with missing tables and current product shape. |
| `pim-v2-stage1-master-data.sql` | Tracked | Creates/alter PIM tables, RLS, policies, and inserts master data. No profiles, stores, or orders. | Later PIM setup, not baseline. Depends on prior schema. |
| `pim-category-architecture.sql` / `pim-manager-final-setup.sql` | Tracked duplicate content | Category/product alterations and hardcoded inserts. No foundational auth/order schema. | Later data/setup script, not baseline. |
| Product seed/delta files | Tracked: `product-draft-products.sql`, `seed-jaket-hoodie-10-products.sql`, `product-gallery-4-photo-system.sql` | Product data and later product alterations. | Not baseline; conflicts or depends on product tables. |
| CMS/media/fix scripts | Tracked: `cms-draft-publish-workflow.sql`, `admin-managed-site-media.sql`, `fix-*.sql`, `sync-jersey-categories-to-admin.sql` | Later CMS/media changes, policies, grants, functions, and data updates. Some reference `stores`; none create it. | Not baseline. |
| `make-superadmin.sql` | Tracked manual bootstrap | Inserts a specific Auth user into `public.profiles`. No table creation. | Manual role bootstrap, not baseline; contains environment-specific identity data. |
| Numeric migrations | Tracked current set; Wave 0C file is currently untracked | Repository-controlled incremental schema, functions, RLS, and grants. None creates profiles, stores, or orders. | Necessary incremental input, but not a complete baseline. |
| `_applied.sql` files | Tracked legacy markers | Comments only; no executable SQL, schema, functions, RLS, or grants. | Historical evidence only; not replayable. |
| Verify/read-only SQL | Tracked under `install`, `sql`, and `verify` | Inspection scripts only. The emergency rollback script is destructive. | Not baseline. Must not be replayed. |
| Archived `supabase remote` Git history | Historical/reverted Git commit | Contains incremental remote migration artifacts, but no migration creating profiles, stores, or orders. | Evidence of history drift, not an authoritative baseline. |
| Supabase dump | None found | No `.dump`, `.backup`, or generated dump artifact exists in the repository. | Not available. |

`schema.sql` contains no `CREATE TYPE` statements. The current product and quotation enum types are owned by the first two incremental migrations.

## 4. Baseline dependency graph

```text
Supabase-managed auth.users
        │
        ├── public.profiles
        │      └── role helpers, admin RBAC, profile RLS
        │
        └── auth references from orders, media, and CMS

pgcrypto
btree_gist
        │
        └── Historical public foundation in schema.sql
               ├── products
               │     ├── product_categories
               │     ├── service_categories / services
               │     ├── product_subcategories
               │     ├── product_color_master
               │     ├── product_size_master
               │     ├── product_variants
               │     ├── product_variant_sizes / images
               │     └── PIM and jersey master tables
               │
               ├── public.stores
               │
               └── public.orders
                      ├── order_items
                      └── order_status_history

CURRENT HEAD modern branch
        │
        ├── 20260711000000_v1_0_product_foundation
        └── 20260711010000_v1_1_bulk_custom_ordering
                │
                └── compatibility migrations
                    20260711154031
                    20260711154141
                         │
                         └── quotation, order, payment, production,
                             QC, fulfillment, inventory, RBAC
                                      │
                                      └── Wave 0C quotation RPC security fix
```

The critical break is that the compatibility migrations expect the historical legacy branch, while the first current migration creates a separate modern product branch.

The compatibility migration requires more than `profiles`: it also expects legacy columns such as `nama`, `status_aktif`, `variant_name`, `color_name`, `size_name`, `stock`, and the `product_size_master` table. Those are absent from the current staging schema.

## 5. Compatibility with CURRENT HEAD

Direct replay of `schema.sql` is unsafe:

- It contains mixed schema and data/bootstrap operations.
- It performs updates and deletes.
- It inserts storage buckets and master data.
- It creates legacy product structures that conflict with the modern current migration structures.
- It does not provide a clean, deterministic migration boundary.
- It has no Auth trigger to automatically create profiles.

The two already-applied staging migrations are not useful as a preserved foundation. They created only the modern branch and deterministic migration seed rows, while the next required migration depends on the missing legacy branch.

## 6. Recommended strategy

**Strategy B, executed against a clean staging database:**

Create one new repository-controlled baseline migration from the verified historical schema contract, but normalize it for CURRENT HEAD compatibility. It must include:

- required extensions;
- `profiles`, `stores`, and `orders`;
- order child tables;
- foundational CMS/PIM tables;
- `product_size_master`;
- legacy compatibility columns required by the compatibility migrations;
- reconciled product/category/variant definitions;
- foundational functions, triggers, RLS, policies, and grants;
- no business/customer seed data;
- no production-specific storage or CMS content.

Then replay the owner-approved, reconciled numeric migration manifest through CURRENT HEAD, including Wave 0C.

Do not replay `schema.sql`, `seed.sql`, standalone SQL, or `_applied.sql` markers.

## 7. Staging reset recommendation

**YES.**

The two applied migrations are disposable and do not contain real customer or business records. Preserving them would require building a baseline around a partially initialized modern schema and would increase collision risk.

A clean staging reset/recreation followed by a reproducible baseline replay is technically safer.

## 8. Exact files/migrations

Historical source evidence only:

- `supabase/schema.sql`
- Git commits `deff782` and `52ffe1b`
- Archived migration history from the reverted `supabase remote` commit

Executable files to use after owner approval:

- A new repository-controlled baseline migration — currently does not exist.
- The reconciled numeric migrations under `supabase/migrations`.
- `20260711000000_v1_0_product_foundation.sql`
- `20260711010000_v1_1_bulk_custom_ordering.sql`
- Their compatibility migrations.
- All later repository-controlled migrations required by CURRENT HEAD.
- `20260815212358_wave_0c_quotation_snapshot_security.sql`

There is currently no honest, complete executable replay manifest because historical remote migration records and the repository migration directory differ materially.

## 9. Risks

- Reconstructing the baseline from mixed `schema.sql` content could import unintended business data.
- Product schemas may remain incompatible unless legacy and modern columns are deliberately reconciled.
- Missing remote-only migrations may contain required functions, policies, grants, indexes, or triggers.
- Profiles will not be created automatically unless a separately approved Auth provisioning design is added.
- Wave 0C security remains unapplied.
- No fixtures or authenticated E2E are ready.

## 10. Exact next mutation requiring owner approval

Owner approval is required to:

1. Create the new repository-controlled baseline migration.
2. Reset or recreate only staging project `ykfjgnrigcsapblbxnxb`.
3. Apply the new baseline, then the reconciled CURRENT HEAD migration chain.

No database or file mutation was performed during this discovery. Existing worktree changes were preserved.

STAGING BASELINE DISCOVERY COMPLETE — OWNER APPROVAL REQUIRED
