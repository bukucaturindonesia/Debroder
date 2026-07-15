begin;

-- DEBRODER Admin 3 Roles
-- Canonical Super Admin remains exactly `superadmin`.
-- Existing legacy role values remain accepted for compatibility, but new role
-- assignments are limited to superadmin, admin, and admin_guest.

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check check (
    role = any (array[
      'viewer'::text,
      'owner'::text,
      'superadmin'::text,
      'super_admin'::text,
      'admin'::text,
      'admin_guest'::text,
      'sales_admin'::text,
      'designer'::text,
      'production_admin'::text,
      'operator'::text,
      'finance'::text,
      'quality_control'::text,
      'store_staff'::text
    ])
  );

-- Admin Guest never receives a mutation or sensitive-read permission. Upsert
-- every current permission as false so later permission checks fail closed.
insert into public.role_permissions(role, permission_key, granted, updated_by, updated_at)
select 'admin_guest', definition.permission_key, false, null, now()
from public.permission_definitions definition
on conflict (role, permission_key) do update
set granted = false,
    updated_by = null,
    updated_at = now();

create or replace function public.is_admin_guest()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles profile_row
    where profile_row.id = auth.uid()
      and profile_row.role = 'admin_guest'
  )
$$;

revoke all on function public.is_admin_guest() from public, anon;
grant execute on function public.is_admin_guest() to authenticated, service_role;

-- Permission checks use the trusted profiles table. Admin Guest is denied even
-- if a permission row is accidentally changed later.
create or replace function public.has_permission(p_permission_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when public.is_admin_guest() then false
    else coalesce((
      select permission.granted
      from public.role_permissions permission
      join public.profiles profile_row
        on profile_row.id = auth.uid()
       and profile_row.role = permission.role
      where permission.permission_key = p_permission_key
      limit 1
    ), false)
  end
$$;

revoke all on function public.has_permission(text) from public, anon;
grant execute on function public.has_permission(text) to authenticated, service_role;

-- Role-array checks also fail closed for Admin Guest. This protects existing
-- mutation RPCs that authorize through has_staff_role instead of permissions.
create or replace function public.has_staff_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select profile_row.role <> 'admin_guest'
       and profile_row.role = any(allowed_roles)
    from public.profiles profile_row
    where profile_row.id = auth.uid()
  ), false)
$$;

revoke all on function public.has_staff_role(text[]) from public, anon;
grant execute on function public.has_staff_role(text[]) to authenticated, service_role;

-- Role management keeps existing profiles intact. New assignments are limited
-- to the three owner-approved canonical roles.
create or replace function public.update_profile_role(
  p_profile_id uuid,
  p_role text
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_role_value text;
  target_row public.profiles;
  result_row public.profiles;
  super_admin_count integer;
begin
  if not public.has_permission('access_control.manage') then
    raise exception 'Tidak berwenang mengubah role pengguna';
  end if;

  actor_role_value := public.current_actor_role();
  if actor_role_value <> 'superadmin' then
    raise exception 'Hanya Super Admin canonical yang dapat mengubah role pengguna';
  end if;

  if p_role not in ('superadmin', 'admin', 'admin_guest') then
    raise exception 'Role tidak valid';
  end if;

  select * into target_row
  from public.profiles
  where id = p_profile_id
  for update;
  if not found then raise exception 'Profil tidak ditemukan'; end if;

  if p_profile_id = auth.uid() and p_role <> 'superadmin' then
    raise exception 'Super Admin tidak dapat menurunkan role akun sendiri';
  end if;

  if target_row.role in ('superadmin', 'super_admin')
     and p_role <> 'superadmin' then
    select count(*) into super_admin_count
    from public.profiles
    where role in ('superadmin', 'super_admin');
    if super_admin_count <= 1 then
      raise exception 'Role Super Admin terakhir tidak boleh diturunkan';
    end if;
  end if;

  update public.profiles
  set role = p_role,
      updated_at = now()
  where id = p_profile_id
  returning * into result_row;

  return result_row;
end
$$;

revoke all on function public.update_profile_role(uuid, text) from public, anon;
grant execute on function public.update_profile_role(uuid, text) to authenticated, service_role;

-- Defense in depth for direct Data API writes. Existing permissive policies
-- continue to work for other roles; Admin Guest must also pass these restrictive
-- policies and therefore cannot INSERT, UPDATE, or DELETE any RLS-enabled table.
do $$
declare
  table_row record;
begin
  for table_row in
    select namespace.nspname as schema_name, class.relname as table_name
    from pg_class class
    join pg_namespace namespace on namespace.oid = class.relnamespace
    where namespace.nspname = 'public'
      and class.relkind in ('r', 'p')
      and class.relrowsecurity
  loop
    if not exists (
      select 1 from pg_policies
      where schemaname = table_row.schema_name
        and tablename = table_row.table_name
        and policyname = 'admin guest deny insert'
    ) then
      execute format(
        'create policy %I on %I.%I as restrictive for insert to authenticated with check (not public.is_admin_guest())',
        'admin guest deny insert', table_row.schema_name, table_row.table_name
      );
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = table_row.schema_name
        and tablename = table_row.table_name
        and policyname = 'admin guest deny update'
    ) then
      execute format(
        'create policy %I on %I.%I as restrictive for update to authenticated using (not public.is_admin_guest()) with check (not public.is_admin_guest())',
        'admin guest deny update', table_row.schema_name, table_row.table_name
      );
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = table_row.schema_name
        and tablename = table_row.table_name
        and policyname = 'admin guest deny delete'
    ) then
      execute format(
        'create policy %I on %I.%I as restrictive for delete to authenticated using (not public.is_admin_guest())',
        'admin guest deny delete', table_row.schema_name, table_row.table_name
      );
    end if;
  end loop;
end
$$;

-- Storage: public website imagery can still render through public URLs, while
-- authenticated Admin Guest sessions cannot read private buckets or mutate any
-- object.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'admin guest private storage deny'
  ) then
    create policy "admin guest private storage deny"
      on storage.objects as restrictive
      for select to authenticated
      using (not public.is_admin_guest() or bucket_id = 'website-images');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'admin guest storage insert deny'
  ) then
    create policy "admin guest storage insert deny"
      on storage.objects as restrictive
      for insert to authenticated
      with check (not public.is_admin_guest());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'admin guest storage update deny'
  ) then
    create policy "admin guest storage update deny"
      on storage.objects as restrictive
      for update to authenticated
      using (not public.is_admin_guest())
      with check (not public.is_admin_guest());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'admin guest storage delete deny'
  ) then
    create policy "admin guest storage delete deny"
      on storage.objects as restrictive
      for delete to authenticated
      using (not public.is_admin_guest());
  end if;
end
$$;

commit;
