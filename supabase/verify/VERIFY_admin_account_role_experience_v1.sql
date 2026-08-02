-- Run after applying 20260802090000_admin_account_role_experience_v1.sql
-- in a safe environment. Read/assert only; it never changes account data.
do $$
declare missing_count integer;
begin
  select count(*) into missing_count
  from (values
    ('owner'),('head_store'),('store_admin'),('product_content_manager'),('order_cs_admin'),('finance_admin')
  ) role_name(role)
  where not exists(select 1 from public.profiles profile_row where profile_row.role = role_name.role)
    and role_name.role = 'owner';
  if missing_count > 0 then raise exception 'Owner profile is missing'; end if;

  if has_function_privilege('anon','public.admin_access_context_v1()','execute') then
    raise exception 'anon must not execute admin_access_context_v1';
  end if;
  if not has_function_privilege('authenticated','public.admin_access_context_v1()','execute') then
    raise exception 'authenticated must execute admin_access_context_v1';
  end if;
  if has_function_privilege('anon','public.update_admin_account_access_v1(uuid,text,text,uuid,boolean,text)','execute') then
    raise exception 'anon must not update Admin access';
  end if;
  if has_function_privilege('anon','public.revoke_admin_sessions_v1(uuid,text)','execute') then
    raise exception 'anon must not revoke Admin sessions';
  end if;

  if exists(select 1 from public.role_permissions where role = 'product_content_manager' and permission_key in ('payment.verify','refund.manage','product.publish','product.inventory.manage') and granted) then
    raise exception 'Product & Content has a forbidden sensitive capability';
  end if;
  if exists(select 1 from public.role_permissions where role = 'order_cs_admin' and permission_key in ('payment.verify','payment.adjust','refund.manage','access_control.manage') and granted) then
    raise exception 'Order & CS has a forbidden finance/system capability';
  end if;
  if exists(select 1 from public.role_permissions where role = 'finance_admin' and permission_key in ('product.manage','content.manage','production.transition','access_control.manage') and granted) then
    raise exception 'Finance has a forbidden content/operation/system capability';
  end if;
  if exists(select 1 from public.role_permissions where role = 'head_store' and permission_key in ('payment.verify','refund.manage','access_control.manage') and granted) then
    raise exception 'Head Store has a forbidden finance/system capability';
  end if;
  if exists(select 1 from public.role_permissions where role = 'store_admin' and permission_key in ('payment.verify','product.manage','content.manage','access_control.manage') and granted) then
    raise exception 'Store Admin has a forbidden global capability';
  end if;
  if exists(select 1 from public.role_permissions where role = 'owner' and permission_key = 'permanent_delete' and granted) then
    raise exception 'Owner permanent delete must remain denied';
  end if;
end
$$;

select role, count(*) filter(where granted) as granted_capabilities
from public.role_permissions
where role in ('owner','head_store','store_admin','product_content_manager','order_cs_admin','finance_admin')
group by role
order by role;

select policyname,cmd,roles
from pg_policies
where schemaname = 'public'
  and policyname in ('admin content read v1','admin content manage v1','admin product read v1','admin product manage v1','recipient read notifications')
order by tablename,policyname;
