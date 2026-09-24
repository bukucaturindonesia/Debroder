-- W3 Product Publish: staging exposed a missing superadmin RBAC grant.
-- The canonical has_permission() function reads role_permissions. Review
-- reported ready, but the authenticated Full Admin publish request returned
-- 403 because this exact role/permission row was absent. No other role,
-- function, policy, or commerce authority is changed here.

begin;

insert into public.role_permissions (role, permission_key, granted, updated_by, updated_at)
values ('superadmin', 'product.publish', true, null, now())
on conflict (role, permission_key) do update
set granted = true,
    updated_at = now()
where public.role_permissions.granted is distinct from true;

commit;

-- Recovery: if rollback is explicitly required, restore the prior absent
-- superadmin/product.publish row only after confirming no published Product
-- now depends on this grant. Do not roll back this authority automatically.
