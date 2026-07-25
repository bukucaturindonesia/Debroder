begin;

-- DEBRODER ADMIN-RBAC-01 — direct-role implementation.
-- Source-only package: this file is NOT applied automatically.
-- New operational accounts use profiles.role directly; no role alias/canonical shadow field.
-- Existing legacy roles remain valid for regression compatibility.
-- fahmi@debroder.com is never updated by this migration.

alter table public.profiles
  add column if not exists display_name text,
  add column if not exists account_status text not null default 'ACTIVE',
  add column if not exists primary_store_id uuid references public.stores(id) on delete restrict,
  add column if not exists all_store_access boolean not null default true,
  add column if not exists active_session_id uuid,
  add column if not exists session_version bigint not null default 0,
  add column if not exists last_login_at timestamptz,
  add column if not exists password_changed_at timestamptz,
  add column if not exists activated_at timestamptz,
  add column if not exists suspended_at timestamptz,
  add column if not exists inactive_at timestamptz,
  add column if not exists locked_at timestamptz,
  add column if not exists lifecycle_reason text;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (
  role = any (array[
    'owner','superadmin','super_admin','admin','admin_guest',
    'head_store','store_admin','product_content_manager','order_cs_admin','finance_admin',
    'sales_admin','designer','production_admin','operator','finance','quality_control','store_staff'
  ]::text[])
);

alter table public.profiles drop constraint if exists profiles_account_status_check;
alter table public.profiles add constraint profiles_account_status_check check (
  account_status = any (array['TESTING','ACTIVE','SUSPENDED','INACTIVE','LOCKED']::text[])
);

alter table public.profiles drop constraint if exists profiles_store_scope_check;
alter table public.profiles add constraint profiles_store_scope_check check (
  (role = 'store_admin' and primary_store_id is not null and all_store_access = false)
  or (role = 'head_store' and primary_store_id is not null and all_store_access = true)
  or role <> all (array['store_admin','head_store']::text[])
);

create index if not exists profiles_account_status_idx
  on public.profiles(account_status);
create index if not exists profiles_primary_store_id_idx
  on public.profiles(primary_store_id);
create index if not exists profiles_role_status_idx
  on public.profiles(role, account_status);

-- Explicit order-to-store ownership for scoped operational access.
create table if not exists public.order_store_assignments (
  order_id uuid primary key references public.orders(id) on delete cascade,
  receiving_store_id uuid references public.stores(id) on delete restrict,
  production_store_id uuid references public.stores(id) on delete restrict,
  pickup_store_id uuid references public.stores(id) on delete restrict,
  reason text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  check (
    receiving_store_id is not null
    or production_store_id is not null
    or pickup_store_id is not null
  )
);
alter table public.order_store_assignments enable row level security;

insert into public.order_store_assignments(order_id, pickup_store_id, reason, updated_at)
select order_row.id, location_row.store_id, 'Backfill dari orders.pickup_location_id', now()
from public.orders order_row
join public.inventory_locations location_row
  on location_row.id = order_row.pickup_location_id
where location_row.store_id is not null
on conflict (order_id) do update
set pickup_store_id = coalesce(
      public.order_store_assignments.pickup_store_id,
      excluded.pickup_store_id
    ),
    updated_at = now();

insert into public.order_store_assignments(order_id, pickup_store_id, reason, updated_at)
select
  reservation.order_id,
  (array_agg(location_row.store_id order by location_row.store_id))[1],
  'Backfill dari stock reservation',
  now()
from public.stock_reservations reservation
join public.inventory_locations location_row
  on location_row.id = reservation.location_id
where reservation.order_id is not null
  and location_row.store_id is not null
group by reservation.order_id
on conflict (order_id) do update
set pickup_store_id = coalesce(
      public.order_store_assignments.pickup_store_id,
      excluded.pickup_store_id
    ),
    updated_at = now();

create or replace function public.current_request_session_id()
returns uuid
language sql stable security definer set search_path = '' as $$
  select case
    when coalesce(auth.jwt() ->> 'session_id', '') ~*
      '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    then (auth.jwt() ->> 'session_id')::uuid
    else null
  end
$$;

create or replace function public.is_current_admin_session()
returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((
    select profile_row.account_status in ('TESTING','ACTIVE')
       and profile_row.active_session_id is not null
       and profile_row.active_session_id = public.current_request_session_id()
    from public.profiles profile_row
    where profile_row.id = auth.uid()
  ), false)
$$;

create or replace function public.is_account_enabled()
returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((
    select profile_row.account_status in ('TESTING','ACTIVE')
    from public.profiles profile_row
    where profile_row.id = auth.uid()
  ), false)
$$;

create or replace function public.current_actor_role()
returns text
language sql stable security definer set search_path = '' as $$
  select case
    when public.is_current_admin_session() then profile_row.role
    else null
  end
  from public.profiles profile_row
  where profile_row.id = auth.uid()
$$;

create or replace function public.current_actor_store_id()
returns uuid
language sql stable security definer set search_path = '' as $$
  select case
    when public.is_current_admin_session() then profile_row.primary_store_id
    else null
  end
  from public.profiles profile_row
  where profile_row.id = auth.uid()
$$;

create or replace function public.current_actor_has_all_store_access()
returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((
    select public.is_current_admin_session()
       and profile_row.all_store_access
    from public.profiles profile_row
    where profile_row.id = auth.uid()
  ), false)
$$;

create or replace function public.is_admin_guest()
returns boolean
language sql stable security definer set search_path = '' as $$
  select public.current_actor_role() = 'admin_guest'
$$;

create or replace function public.is_superadmin()
returns boolean
language sql stable security definer set search_path = '' as $$
  select public.current_actor_role() in ('superadmin','super_admin')
$$;

create or replace function public.is_owner_or_superadmin()
returns boolean
language sql stable security definer set search_path = '' as $$
  select public.current_actor_role() in ('owner','superadmin','super_admin')
$$;

create or replace function public.has_permission(p_permission_key text)
returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((
    select profile_row.role <> 'admin_guest'
       and public.is_current_admin_session()
       and permission.granted
    from public.profiles profile_row
    join public.role_permissions permission
      on permission.role = case
        when profile_row.role = 'super_admin' then 'superadmin'
        else profile_row.role
      end
     and permission.permission_key = p_permission_key
    where profile_row.id = auth.uid()
    limit 1
  ), false)
$$;

create or replace function public.has_staff_role(allowed_roles text[])
returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((
    select profile_row.role <> 'admin_guest'
       and public.is_current_admin_session()
       and profile_row.role = any(allowed_roles)
    from public.profiles profile_row
    where profile_row.id = auth.uid()
  ), false)
$$;

create or replace function public.can_access_store(p_store_id uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select case
    when p_store_id is null then false
    when public.current_actor_has_all_store_access() then true
    else p_store_id = public.current_actor_store_id()
  end
$$;

create or replace function public.can_access_inventory_location(p_location_id uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select public.current_actor_has_all_store_access()
    or exists (
      select 1
      from public.inventory_locations location_row
      where location_row.id = p_location_id
        and location_row.store_id = public.current_actor_store_id()
    )
$$;

create or replace function public.can_access_order(p_order_id uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select public.current_actor_has_all_store_access()
    or exists (
      select 1
      from public.order_store_assignments assignment
      where assignment.order_id = p_order_id
        and public.current_actor_store_id() in (
          assignment.receiving_store_id,
          assignment.production_store_id,
          assignment.pickup_store_id
        )
    )
    or exists (
      select 1
      from public.orders order_row
      join public.inventory_locations location_row
        on location_row.id = order_row.pickup_location_id
      where order_row.id = p_order_id
        and location_row.store_id = public.current_actor_store_id()
    )
    or exists (
      select 1
      from public.stock_reservations reservation
      join public.inventory_locations location_row
        on location_row.id = reservation.location_id
      where reservation.order_id = p_order_id
        and location_row.store_id = public.current_actor_store_id()
    )
    or exists (
      select 1
      from public.pickup_preparations preparation
      join public.inventory_locations location_row
        on location_row.id = preparation.location_id
      where preparation.order_id = p_order_id
        and location_row.store_id = public.current_actor_store_id()
    )
$$;

create or replace function public.register_admin_session_v1(p_session_id uuid)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid := auth.uid();
  actor_status text;
begin
  if actor_id is null then
    raise exception 'Sesi admin diperlukan';
  end if;

  select profile_row.account_status
  into actor_status
  from public.profiles profile_row
  where profile_row.id = actor_id
  for update;

  if not found then raise exception 'Profil admin tidak ditemukan'; end if;
  if actor_status not in ('TESTING','ACTIVE') then
    raise exception 'Status akun tidak mengizinkan login';
  end if;
  if not exists (
    select 1
    from auth.sessions auth_session
    where auth_session.id = p_session_id
      and auth_session.user_id = actor_id
  ) then
    raise exception 'Session ID tidak sesuai dengan pengguna';
  end if;

  update public.profiles
  set active_session_id = p_session_id,
      session_version = session_version + 1,
      last_login_at = now(),
      updated_at = now()
  where id = actor_id;

  update auth.refresh_tokens
  set revoked = true,
      updated_at = now()
  where user_id = actor_id::text
    and session_id is distinct from p_session_id
    and revoked = false;

  delete from auth.sessions
  where user_id = actor_id
    and id <> p_session_id;

  return true;
end
$$;

create or replace function public.assert_admin_session_v1(p_session_id uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((
    select profile_row.account_status in ('TESTING','ACTIVE')
       and profile_row.active_session_id = p_session_id
       and p_session_id = public.current_request_session_id()
    from public.profiles profile_row
    where profile_row.id = auth.uid()
  ), false)
$$;

-- Permission rows for direct operational roles. Unknown permission keys remain absent,
-- therefore deny-by-default continues to apply.
insert into public.role_permissions(role, permission_key, granted, updated_by, updated_at)
select role_name.role, definition.permission_key, false, null, now()
from (
  values
    ('head_store'),
    ('store_admin'),
    ('product_content_manager'),
    ('order_cs_admin'),
    ('finance_admin')
) as role_name(role)
cross join public.permission_definitions definition
on conflict (role, permission_key) do update
set granted = false,
    updated_by = null,
    updated_at = now();

update public.role_permissions
set granted = true, updated_at = now()
where role = 'head_store'
  and permission_key = any(array[
    'order.read','order.edit','order.task.read','order.task.manage',
    'quotation.read','quotation.write','quotation.approve',
    'operations.read','operations.manage',
    'inventory.location.read','inventory.location.manage',
    'production.view',
    'shipping.view','shipping.create','shipping.update','shipping.complete',
    'notification.read','customer.outbox.read','customer.outbox.manage','refund.read'
  ]::text[]);

update public.role_permissions
set granted = true, updated_at = now()
where role = 'store_admin'
  and permission_key = any(array[
    'order.read','order.edit','order.task.read','order.task.manage',
    'operations.read','operations.manage',
    'inventory.location.read','inventory.location.manage',
    'shipping.view','shipping.create','shipping.update','shipping.complete',
    'notification.read','refund.read'
  ]::text[]);

update public.role_permissions
set granted = true, updated_at = now()
where role = 'product_content_manager'
  and permission_key = any(array['notification.read']::text[]);

update public.role_permissions
set granted = true, updated_at = now()
where role = 'order_cs_admin'
  and permission_key = any(array[
    'order.read','order.edit','order.task.read','order.task.manage',
    'quotation.read','quotation.write',
    'operations.read','operations.manage','production.view',
    'mockup.read','mockup.write','mockup.send',
    'shipping.view','shipping.create','shipping.update',
    'notification.read','notification.manage',
    'customer.outbox.read','customer.outbox.manage',
    'refund.read','payment.read'
  ]::text[]);

update public.role_permissions
set granted = true, updated_at = now()
where role = 'finance_admin'
  and permission_key = any(array[
    'order.read','operations.read',
    'payment.read','payment.create','payment.verify','payment.reject','payment.adjust','payment.archive',
    'refund.read','refund.manage','notification.read'
  ]::text[]);

insert into public.role_permissions(role, permission_key, granted, updated_by, updated_at)
values
  ('owner','access_control.read',true,null,now()),
  ('owner','access_control.manage',true,null,now()),
  ('owner','audit.read',true,null,now()),
  ('superadmin','access_control.read',true,null,now()),
  ('superadmin','access_control.manage',true,null,now()),
  ('superadmin','audit.read',true,null,now())
on conflict (role, permission_key) do update
set granted = excluded.granted,
    updated_at = now();

create or replace function public.update_admin_account_access_v1(
  p_profile_id uuid,
  p_role text,
  p_account_status text,
  p_primary_store_id uuid,
  p_all_store_access boolean,
  p_reason text
)
returns public.profiles
language plpgsql security definer set search_path = '' as $$
declare
  actor_role text := public.current_actor_role();
  target_row public.profiles;
  result_row public.profiles;
  pettarani_store_id uuid;
  target_email text;
begin
  if actor_role not in ('owner','superadmin','super_admin') then
    raise exception 'Hanya Owner atau Super Admin yang dapat mengelola akun';
  end if;
  if not public.has_permission('access_control.manage') then
    raise exception 'Permission pengelolaan akun tidak tersedia';
  end if;
  if p_role not in (
    'head_store','store_admin','product_content_manager','order_cs_admin','finance_admin'
  ) then
    raise exception 'Role operasional tidak valid';
  end if;
  if p_account_status not in ('TESTING','ACTIVE','SUSPENDED','INACTIVE','LOCKED') then
    raise exception 'Status akun tidak valid';
  end if;
  if length(trim(coalesce(p_reason,''))) < 8 then
    raise exception 'Alasan perubahan minimal 8 karakter';
  end if;

  select profile_row.*
  into target_row
  from public.profiles profile_row
  where profile_row.id = p_profile_id
  for update;

  if not found then raise exception 'Profil tidak ditemukan'; end if;
  target_email := lower(coalesce(target_row.email,''));
  if target_email = 'fahmi@debroder.com'
     or target_row.role in ('owner','superadmin','super_admin') then
    raise exception 'Akun Owner/Super Admin dilindungi';
  end if;

  select store_row.id
  into pettarani_store_id
  from public.stores store_row
  where upper(regexp_replace(trim(store_row.nama_store), '^STORE[[:space:]]+', '')) = 'PETTARANI'
    and store_row.status_aktif = true
  limit 1;

  if p_role = 'store_admin' then
    if p_primary_store_id is null or p_all_store_access then
      raise exception 'Store Admin wajib memiliki tepat satu store';
    end if;
  elsif p_role = 'head_store' then
    if pettarani_store_id is null
       or p_primary_store_id is distinct from pettarani_store_id
       or not p_all_store_access then
      raise exception 'Head Store wajib memakai Pettarani dan scope seluruh store';
    end if;
  elsif p_role in ('product_content_manager','order_cs_admin','finance_admin') then
    if not p_all_store_access then
      raise exception 'Role pusat wajib memakai scope seluruh store';
    end if;
  end if;

  update public.profiles
  set role = p_role,
      account_status = p_account_status,
      primary_store_id = p_primary_store_id,
      all_store_access = p_all_store_access,
      activated_at = case
        when p_account_status = 'ACTIVE' and account_status <> 'ACTIVE' then now()
        else activated_at
      end,
      suspended_at = case when p_account_status = 'SUSPENDED' then now() else null end,
      inactive_at = case when p_account_status = 'INACTIVE' then now() else null end,
      locked_at = case when p_account_status = 'LOCKED' then now() else null end,
      lifecycle_reason = trim(p_reason),
      active_session_id = null,
      session_version = session_version + 1,
      updated_at = now()
  where id = p_profile_id
  returning * into result_row;

  delete from auth.sessions where user_id = p_profile_id;
  update auth.refresh_tokens
  set revoked = true, updated_at = now()
  where user_id = p_profile_id::text and revoked = false;

  insert into public.system_audit_log(
    entity_type, entity_id, action, old_value, new_value,
    actor_id, actor_role, source, reason, metadata
  ) values (
    'admin_profile', p_profile_id, 'ADMIN_ACCOUNT_ACCESS_UPDATED',
    jsonb_build_object(
      'role', target_row.role,
      'account_status', target_row.account_status,
      'primary_store_id', target_row.primary_store_id,
      'all_store_access', target_row.all_store_access
    ),
    jsonb_build_object(
      'role', result_row.role,
      'account_status', result_row.account_status,
      'primary_store_id', result_row.primary_store_id,
      'all_store_access', result_row.all_store_access
    ),
    auth.uid(), actor_role, 'admin-rbac', trim(p_reason),
    jsonb_build_object('checkpoint','ADMIN-RBAC-01','sessions_revoked',true)
  );

  return result_row;
end
$$;

create or replace function public.complete_admin_password_change_v1()
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid := auth.uid();
  actor_role text := public.current_actor_role();
begin
  if actor_id is null or actor_role is null then
    raise exception 'Sesi admin aktif diperlukan';
  end if;

  update public.profiles
  set password_changed_at = now(),
      active_session_id = null,
      session_version = session_version + 1,
      updated_at = now()
  where id = actor_id;

  insert into public.system_audit_log(
    entity_type, entity_id, action, new_value,
    actor_id, actor_role, source, reason, metadata
  ) values (
    'admin_profile', actor_id, 'ADMIN_PASSWORD_CHANGED',
    jsonb_build_object('password_changed_at',now()),
    actor_id, actor_role, 'admin-auth',
    'Pengguna mengganti kata sandi akun',
    jsonb_build_object('checkpoint','ADMIN-RBAC-01','password_value_logged',false)
  );

  delete from auth.sessions where user_id = actor_id;
  update auth.refresh_tokens
  set revoked = true, updated_at = now()
  where user_id = actor_id::text and revoked = false;

  return true;
end
$$;

-- Direct roles receive explicit permissive read policies; store boundaries are
-- enforced by restrictive policies below. Existing legacy policies stay untouched.
drop policy if exists "rbac direct role assignment read" on public.order_store_assignments;
create policy "rbac direct role assignment read"
on public.order_store_assignments for select to authenticated
using (
  public.has_permission('order.read')
  and public.can_access_order(order_id)
);

-- Store Admin is fail-closed across scoped entities even if another permissive
-- policy exists. Other roles continue through their existing permission policies.
drop policy if exists "rbac store scope inventory locations" on public.inventory_locations;
create policy "rbac store scope inventory locations"
on public.inventory_locations as restrictive for all to authenticated
using (public.current_actor_role() <> 'store_admin' or public.can_access_store(store_id))
with check (public.current_actor_role() <> 'store_admin' or public.can_access_store(store_id));

drop policy if exists "rbac store scope inventory balances" on public.inventory_balances;
create policy "rbac store scope inventory balances"
on public.inventory_balances as restrictive for all to authenticated
using (public.current_actor_role() <> 'store_admin' or public.can_access_inventory_location(location_id))
with check (public.current_actor_role() <> 'store_admin' or public.can_access_inventory_location(location_id));

drop policy if exists "rbac store scope inventory movements" on public.inventory_movements;
create policy "rbac store scope inventory movements"
on public.inventory_movements as restrictive for all to authenticated
using (public.current_actor_role() <> 'store_admin' or public.can_access_inventory_location(location_id))
with check (public.current_actor_role() <> 'store_admin' or public.can_access_inventory_location(location_id));

drop policy if exists "rbac store scope stock transfers" on public.stock_transfers;
create policy "rbac store scope stock transfers"
on public.stock_transfers as restrictive for all to authenticated
using (
  public.current_actor_role() <> 'store_admin'
  or public.can_access_inventory_location(from_location_id)
  or public.can_access_inventory_location(to_location_id)
)
with check (
  public.current_actor_role() <> 'store_admin'
  or public.can_access_inventory_location(from_location_id)
  or public.can_access_inventory_location(to_location_id)
);

drop policy if exists "rbac store scope orders" on public.orders;
create policy "rbac store scope orders"
on public.orders as restrictive for all to authenticated
using (public.current_actor_role() <> 'store_admin' or public.can_access_order(id))
with check (public.current_actor_role() <> 'store_admin' or public.can_access_order(id));

drop policy if exists "rbac store scope order payments" on public.order_payments;
create policy "rbac store scope order payments"
on public.order_payments as restrictive for all to authenticated
using (public.current_actor_role() <> 'store_admin' or public.can_access_order(order_id))
with check (public.current_actor_role() <> 'store_admin' or public.can_access_order(order_id));

drop policy if exists "rbac store scope order tasks" on public.order_tasks;
create policy "rbac store scope order tasks"
on public.order_tasks as restrictive for all to authenticated
using (public.current_actor_role() <> 'store_admin' or public.can_access_order(order_id))
with check (public.current_actor_role() <> 'store_admin' or public.can_access_order(order_id));

drop policy if exists "rbac store scope refunds" on public.refund_cases;
create policy "rbac store scope refunds"
on public.refund_cases as restrictive for all to authenticated
using (public.current_actor_role() <> 'store_admin' or public.can_access_order(order_id))
with check (public.current_actor_role() <> 'store_admin' or public.can_access_order(order_id));

drop policy if exists "rbac store scope fulfillments" on public.fulfillments;
create policy "rbac store scope fulfillments"
on public.fulfillments as restrictive for all to authenticated
using (public.current_actor_role() <> 'store_admin' or public.can_access_order(order_id))
with check (public.current_actor_role() <> 'store_admin' or public.can_access_order(order_id));

drop policy if exists "rbac store scope job orders" on public.job_orders;
create policy "rbac store scope job orders"
on public.job_orders as restrictive for all to authenticated
using (public.current_actor_role() <> 'store_admin' or public.can_access_order(order_id))
with check (public.current_actor_role() <> 'store_admin' or public.can_access_order(order_id));

drop policy if exists "rbac store scope work items" on public.work_items;
create policy "rbac store scope work items"
on public.work_items as restrictive for all to authenticated
using (
  public.current_actor_role() <> 'store_admin'
  or exists (
    select 1
    from public.job_orders job_order
    where job_order.id = work_items.job_order_id
      and public.can_access_order(job_order.order_id)
  )
)
with check (
  public.current_actor_role() <> 'store_admin'
  or exists (
    select 1
    from public.job_orders job_order
    where job_order.id = work_items.job_order_id
      and public.can_access_order(job_order.order_id)
  )
);

drop policy if exists "rbac store scope qc records" on public.qc_records;
create policy "rbac store scope qc records"
on public.qc_records as restrictive for all to authenticated
using (
  public.current_actor_role() <> 'store_admin'
  or exists (
    select 1
    from public.job_orders job_order
    where job_order.id = qc_records.job_order_id
      and public.can_access_order(job_order.order_id)
  )
)
with check (
  public.current_actor_role() <> 'store_admin'
  or exists (
    select 1
    from public.job_orders job_order
    where job_order.id = qc_records.job_order_id
      and public.can_access_order(job_order.order_id)
  )
);

drop policy if exists "rbac store scope pickup preparations" on public.pickup_preparations;
create policy "rbac store scope pickup preparations"
on public.pickup_preparations as restrictive for all to authenticated
using (public.current_actor_role() <> 'store_admin' or public.can_access_inventory_location(location_id))
with check (public.current_actor_role() <> 'store_admin' or public.can_access_inventory_location(location_id));

drop policy if exists "rbac store scope stock reservations" on public.stock_reservations;
create policy "rbac store scope stock reservations"
on public.stock_reservations as restrictive for all to authenticated
using (public.current_actor_role() <> 'store_admin' or public.can_access_inventory_location(location_id))
with check (public.current_actor_role() <> 'store_admin' or public.can_access_inventory_location(location_id));

drop policy if exists "rbac store scope assignments" on public.order_store_assignments;
create policy "rbac store scope assignments"
on public.order_store_assignments as restrictive for all to authenticated
using (public.current_actor_role() <> 'store_admin' or public.can_access_order(order_id))
with check (public.current_actor_role() <> 'store_admin' or public.can_access_order(order_id));

revoke all on function public.current_request_session_id() from public, anon;
revoke all on function public.is_current_admin_session() from public, anon;
revoke all on function public.is_account_enabled() from public, anon;
revoke all on function public.current_actor_role() from public, anon;
revoke all on function public.current_actor_store_id() from public, anon;
revoke all on function public.current_actor_has_all_store_access() from public, anon;
revoke all on function public.is_admin_guest() from public, anon;
revoke all on function public.is_superadmin() from public, anon;
revoke all on function public.is_owner_or_superadmin() from public, anon;
revoke all on function public.has_permission(text) from public, anon;
revoke all on function public.has_staff_role(text[]) from public, anon;
revoke all on function public.can_access_store(uuid) from public, anon;
revoke all on function public.can_access_inventory_location(uuid) from public, anon;
revoke all on function public.can_access_order(uuid) from public, anon;
revoke all on function public.register_admin_session_v1(uuid) from public, anon;
revoke all on function public.assert_admin_session_v1(uuid) from public, anon;
revoke all on function public.update_admin_account_access_v1(uuid,text,text,uuid,boolean,text) from public, anon;
revoke all on function public.complete_admin_password_change_v1() from public, anon;

grant execute on function public.current_request_session_id() to authenticated, service_role;
grant execute on function public.is_current_admin_session() to authenticated, service_role;
grant execute on function public.is_account_enabled() to authenticated, service_role;
grant execute on function public.current_actor_role() to authenticated, service_role;
grant execute on function public.current_actor_store_id() to authenticated, service_role;
grant execute on function public.current_actor_has_all_store_access() to authenticated, service_role;
grant execute on function public.is_admin_guest() to authenticated, service_role;
grant execute on function public.is_superadmin() to authenticated, service_role;
grant execute on function public.is_owner_or_superadmin() to authenticated, service_role;
grant execute on function public.has_permission(text) to authenticated, service_role;
grant execute on function public.has_staff_role(text[]) to authenticated, service_role;
grant execute on function public.can_access_store(uuid) to authenticated, service_role;
grant execute on function public.can_access_inventory_location(uuid) to authenticated, service_role;
grant execute on function public.can_access_order(uuid) to authenticated, service_role;
grant execute on function public.register_admin_session_v1(uuid) to authenticated, service_role;
grant execute on function public.assert_admin_session_v1(uuid) to authenticated, service_role;
grant execute on function public.update_admin_account_access_v1(uuid,text,text,uuid,boolean,text) to authenticated, service_role;
grant execute on function public.complete_admin_password_change_v1() to authenticated;

commit;
