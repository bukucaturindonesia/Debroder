-- VERIFY — SUPERADMIN PRODUCT MANAGEMENT PERMISSIONS V1
-- Read-only verification.

do $$
declare
  missing_count integer;
  admin_mutation_count integer;
begin
  select count(*) into missing_count
  from (values
    ('superadmin', 'product.read'),
    ('superadmin', 'product.manage'),
    ('superadmin', 'product.inventory.manage'),
    ('superadmin', 'product.publish'),
    ('superadmin', 'product.maintenance'),
    ('super_admin', 'product.read'),
    ('super_admin', 'product.manage'),
    ('super_admin', 'product.inventory.manage'),
    ('super_admin', 'product.publish'),
    ('super_admin', 'product.maintenance')
  ) as expected(role, permission_key)
  where not exists (
    select 1 from public.role_permissions rp
    where rp.role = expected.role
      and rp.permission_key = expected.permission_key
      and rp.granted = true
  );

  if missing_count <> 0 then
    raise exception 'VERIFY FAILED: % expected superadmin product grants are missing', missing_count;
  end if;

  select count(*) into admin_mutation_count
  from public.role_permissions rp
  where rp.role = 'admin'
    and rp.permission_key in (
      'product.manage',
      'product.inventory.manage',
      'product.publish',
      'product.maintenance'
    )
    and rp.granted = true;

  if admin_mutation_count <> 0 then
    raise exception 'VERIFY FAILED: admin received unexpected product mutation permissions';
  end if;
end
$$;

select role, permission_key, granted
from public.role_permissions
where role in ('superadmin', 'super_admin')
  and permission_key in (
    'product.read',
    'product.manage',
    'product.inventory.manage',
    'product.publish',
    'product.maintenance'
  )
order by role, permission_key;
