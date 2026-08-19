select
  (select count(*) from supabase_migrations.schema_migrations) as migration_count,
  (select max(version) from supabase_migrations.schema_migrations) as last_migration,
  (select count(*) from auth.users) as auth_users,
  (select count(*)
   from pg_catalog.pg_class c
   join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relkind = 'r'
     and not c.relrowsecurity) as unrls_public_tables,
  has_table_privilege('service_role', 'public.customer_profiles', 'SELECT') as service_profiles_select,
  has_table_privilege('service_role', 'public.customer_profiles', 'INSERT') as service_profiles_insert,
  has_table_privilege('service_role', 'public.customer_profiles', 'UPDATE') as service_profiles_update,
  has_table_privilege('service_role', 'public.customer_addresses', 'SELECT') as service_addresses_select,
  has_table_privilege('service_role', 'public.customer_addresses', 'INSERT') as service_addresses_insert,
  has_table_privilege('service_role', 'public.customer_addresses', 'UPDATE') as service_addresses_update,
  has_table_privilege('service_role', 'public.customer_addresses', 'DELETE') as service_addresses_delete,
  has_table_privilege('anon', 'public.customer_profiles', 'INSERT') as anon_profiles_insert,
  has_table_privilege('anon', 'public.customer_profiles', 'UPDATE') as anon_profiles_update,
  has_table_privilege('authenticated', 'public.customer_profiles', 'INSERT') as authenticated_profiles_insert,
  has_table_privilege('authenticated', 'public.customer_profiles', 'UPDATE') as authenticated_profiles_update,
  (to_regprocedure('public.submit_public_payment_proof(uuid,text,text,text)') is null) as retired_payment_rpc_absent,
  (to_regprocedure('public.create_public_order(text,text,text,uuid,text,text,text,integer,text,text,text,text)') is null) as retired_order_rpc_absent,
  (select count(*) = 0 from storage.buckets where id = 'order-uploads') as legacy_bucket_absent,
  (to_regprocedure('public.audit_row_change()') is not null) as audit_function_present,
  has_function_privilege('anon', 'public.audit_row_change()', 'EXECUTE') as anon_audit_execute,
  has_function_privilege('authenticated', 'public.audit_row_change()', 'EXECUTE') as authenticated_audit_execute,
  has_function_privilege('service_role', 'public.audit_row_change()', 'EXECUTE') as service_audit_execute,
  has_function_privilege('anon', 'public.build_quotation_snapshot(uuid)', 'EXECUTE') as anon_quotation_execute,
  has_function_privilege('authenticated', 'public.build_quotation_snapshot(uuid)', 'EXECUTE') as authenticated_quotation_execute,
  has_function_privilege('service_role', 'public.build_quotation_snapshot(uuid)', 'EXECUTE') as service_quotation_execute;
