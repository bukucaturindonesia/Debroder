-- READ-ONLY verification for DEBRODER ADMIN-RBAC-01 direct-role package.
-- Safe before or after bootstrap. This file performs no mutation.

select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name in (
    'display_name','account_status','primary_store_id','all_store_access',
    'active_session_id','session_version','last_login_at','password_changed_at',
    'activated_at','suspended_at','inactive_at','locked_at','lifecycle_reason'
  )
order by ordinal_position;

select
  conname,
  pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.profiles'::regclass
  and conname in (
    'profiles_role_check','profiles_account_status_check','profiles_store_scope_check'
  )
order by conname;

select
  p.oid::regprocedure::text as function_signature,
  prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'current_request_session_id','is_current_admin_session','is_account_enabled',
    'current_actor_role','current_actor_store_id','current_actor_has_all_store_access',
    'is_admin_guest','is_superadmin','is_owner_or_superadmin','has_permission',
    'has_staff_role','can_access_store','can_access_inventory_location',
    'can_access_order','register_admin_session_v1','assert_admin_session_v1',
    'update_admin_account_access_v1','complete_admin_password_change_v1'
  )
order by function_signature;

select
  role,
  count(*) filter (where granted) as granted_permissions,
  count(*) filter (where not granted) as denied_permissions
from public.role_permissions
where role in (
  'head_store','store_admin','product_content_manager','order_cs_admin','finance_admin'
)
group by role
order by role;

select
  lower(u.email) as email,
  p.role,
  p.account_status,
  p.primary_store_id,
  s.nama_store as primary_store,
  p.all_store_access,
  p.active_session_id,
  p.session_version
from auth.users u
left join public.profiles p on p.id = u.id
left join public.stores s on s.id = p.primary_store_id
where lower(u.email) in (
  'owner@debroder.com',
  'head-store@debroder.com',
  'store-admin-landak@debroder.com',
  'store-admin-tello@debroder.com',
  'store-admin-parepare@debroder.com',
  'product-content-manager@debroder.com',
  'order-cs-admin@debroder.com',
  'finance-admin@debroder.com',
  'fahmi@debroder.com',
  'admin@guest.id'
)
order by lower(u.email);

select
  count(*) filter (where lower(u.email) in (
    'owner@debroder.com',
    'head-store@debroder.com',
    'store-admin-landak@debroder.com',
    'store-admin-tello@debroder.com',
    'store-admin-parepare@debroder.com',
    'product-content-manager@debroder.com',
    'order-cs-admin@debroder.com',
    'finance-admin@debroder.com'
  )) as target_auth_accounts,
  count(*) filter (where lower(u.email) = 'fahmi@debroder.com' and p.role = 'superadmin') as fahmi_superadmin_intact,
  count(*) filter (where lower(u.email) = 'admin@guest.id') as legacy_guest_still_exists
from auth.users u
left join public.profiles p on p.id = u.id;

-- Retirement impact for admin@guest.id. Do not delete while dependent data remains
-- unless Owner approves the data-retention treatment separately.
with guest as (
  select id from auth.users where lower(email) = 'admin@guest.id'
)
select 'notifications.recipient_id' as reference, count(*)::bigint as row_count
from public.notifications n, guest g where n.recipient_id = g.id
union all
select 'system_audit_log.actor_id', count(*)::bigint
from public.system_audit_log a, guest g where a.actor_id = g.id
union all
select 'profiles.id', count(*)::bigint
from public.profiles p, guest g where p.id = g.id;

select
  tablename,
  policyname,
  permissive,
  cmd
from pg_policies
where schemaname = 'public'
  and policyname like 'rbac %'
order by tablename, policyname;
