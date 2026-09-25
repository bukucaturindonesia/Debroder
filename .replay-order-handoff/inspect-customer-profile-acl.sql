select
  c.relname,
  c.relrowsecurity,
  c.relacl
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('customer_profiles', 'customer_addresses', 'orders');

select
  p.rolname,
  has_table_privilege(p.rolname, 'public.customer_profiles', 'SELECT') as can_select,
  has_table_privilege(p.rolname, 'public.customer_profiles', 'INSERT') as can_insert,
  has_table_privilege(p.rolname, 'public.customer_profiles', 'UPDATE') as can_update,
  has_table_privilege(p.rolname, 'public.customer_profiles', 'DELETE') as can_delete
from pg_catalog.pg_roles p
where p.rolname in ('anon', 'authenticated', 'service_role', 'postgres');
