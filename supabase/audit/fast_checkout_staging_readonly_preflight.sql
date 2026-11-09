-- Debroder Fast Checkout staging audit (READ ONLY).
-- This is NOT a migration. Never paste it into migration execution pipelines.
-- Query only information_schema, pg_catalog and supabase_migrations.
-- Staging project: ykfjgnrigcsapblbxnxb. Production must not be targeted.
with required_tables(name) as (
  values ('products'),('product_variants'),('product_variant_sizes'),
         ('product_price_tiers'),('orders'),('order_payments'),
         ('stock_reservations'),('order_shipping_quotes'),
         ('system_audit_log'),('profiles')
), required_functions(name,args) as (
  values
    ('create_public_checkout_order','text,text,text,text,text,text,text,text,uuid,text,text,jsonb'),
    ('activate_public_checkout_order_v2','uuid,uuid,text'),
    ('reserve_public_order_stock','uuid,interval,uuid'),
    ('refresh_order_payment_summary','uuid'),
    ('is_verified_registered_customer_checkout_v1','uuid,text'),
    ('guard_verified_payment_evidence_v1','')
), required_columns(table_name,column_name) as (
  values ('products','id'),('products','base_price'),('products','status'),
         ('products','status_aktif'),('product_variants','status'),
         ('product_variants','is_active'),('product_variant_sizes','status'),
         ('product_variant_sizes','is_active'),('product_price_tiers','unit_price'),
         ('product_price_tiers','quote_required'),('orders','final_total_approved_at'),
         ('orders','public_idempotency_key'),('orders','payment_effective_total'),
         ('orders','source_snapshot'),('order_payments','submission_source'),
         ('order_payments','verified_reference'),('stock_reservations','status'),
         ('stock_reservations','expires_at'),('order_shipping_quotes','approved_at'),
         ('system_audit_log','actor_role'),('profiles','all_store_access')
)
select
  (select count(*) from supabase_migrations.schema_migrations) as migration_count,
  (select count(*) from supabase_migrations.schema_migrations where version='20261026045918') as fast_candidate_applied_count,
  (select array_agg(name order by name) from required_tables r
    where to_regclass('public.'||r.name) is null) as missing_tables,
  (select array_agg(table_name||'.'||column_name order by table_name,column_name)
    from required_columns r where not exists
      (select 1 from information_schema.columns c
       where c.table_schema='public' and c.table_name=r.table_name
         and c.column_name=r.column_name)) as missing_columns,
  (select array_agg(name||'('||args||')' order by name)
    from required_functions r
    where to_regprocedure('public.'||r.name||'('||r.args||')') is null) as missing_functions,
  (select count(*) from pg_trigger t
    join pg_class c on c.oid=t.tgrelid
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname in ('orders','order_payments','stock_reservations')
      and not t.tgisinternal) as critical_trigger_count,
  (select md5(pg_get_functiondef(to_regprocedure('public.guard_verified_payment_evidence_v1()')))) as manual_payment_guard_md5,
  (select array_agg(column_name order by column_name)
    from information_schema.columns
    where table_schema='public' and table_name='products' and column_name in
    ('shipping_weight_grams','shipping_length_cm','shipping_width_cm','shipping_height_cm')) as existing_fast_shipping_columns;
