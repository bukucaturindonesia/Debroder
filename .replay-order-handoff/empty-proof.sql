select
  (select count(*) from supabase_migrations.schema_migrations) as migration_count,
  (select count(*) from auth.users) as auth_users,
  (select count(*)
   from pg_catalog.pg_class c
   join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relkind = 'r'
     and c.relname in ('profiles','stores','products','customer_profiles','orders','order_payments')) as application_tables,
  to_regclass('public.customer_profiles') as customer_profiles_table,
  to_regclass('public.order_payments') as order_payments_table;
