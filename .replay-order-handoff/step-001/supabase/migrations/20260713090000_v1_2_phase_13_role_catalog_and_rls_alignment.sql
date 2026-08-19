begin;

-- Phase 13 correction only. The original Phase 13 foundations
-- (permission_definitions, role_permissions, system_audit_log, has_permission,
-- audit_row_change, and append-only audit protection) are already applied.

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
      'sales_admin'::text,
      'designer'::text,
      'production_admin'::text,
      'operator'::text,
      'finance'::text,
      'quality_control'::text,
      'store_staff'::text
    ])
  );

insert into public.permission_definitions(permission_key,module,label,description)
values
  ('access_control.read','system','Lihat role & permission','Melihat profil staf dan matriks permission resmi.'),
  ('access_control.manage','system','Kelola role pengguna','Mengubah role pengguna melalui alur terkontrol dan tercatat audit.'),
  ('payment.read','payment','Lihat pembayaran','Melihat pembayaran, koreksi, link pembayaran, dan riwayatnya.'),
  ('shipping.view','fulfillment','Lihat pengiriman/pickup','Melihat data pengiriman, pickup, file, item, revisi, dan riwayat.'),
  ('notification.read','notification','Lihat notifikasi','Membaca inbox dan event notifikasi untuk akun sendiri.')
on conflict (permission_key) do update
set module=excluded.module,
    label=excluded.label,
    description=excluded.description;

-- Existing Phase 1-12 grants are preserved. This block only adds Phase 13
-- access-control/read permissions and the official specialist role matrix.
insert into public.role_permissions(role,permission_key,granted,updated_by,updated_at)
values
  ('owner','access_control.read',true,null,now()),
  ('owner','payment.read',true,null,now()),
  ('owner','shipping.view',true,null,now()),
  ('owner','notification.read',true,null,now()),
  ('superadmin','access_control.read',true,null,now()),
  ('superadmin','access_control.manage',true,null,now()),
  ('superadmin','payment.read',true,null,now()),
  ('superadmin','shipping.view',true,null,now()),
  ('superadmin','notification.read',true,null,now()),
  ('super_admin','access_control.read',true,null,now()),
  ('super_admin','access_control.manage',true,null,now()),
  ('super_admin','payment.read',true,null,now()),
  ('super_admin','shipping.view',true,null,now()),
  ('super_admin','notification.read',true,null,now()),
  ('admin','payment.read',true,null,now()),
  ('admin','shipping.view',true,null,now()),
  ('admin','notification.read',true,null,now()),
  ('sales_admin','payment.read',true,null,now()),
  ('sales_admin','notification.read',true,null,now()),

  ('designer','order.read',true,null,now()),
  ('designer','quotation.read',true,null,now()),
  ('designer','mockup.read',true,null,now()),
  ('designer','mockup.write',true,null,now()),
  ('designer','mockup.send',true,null,now()),
  ('designer','mockup.archive',true,null,now()),
  ('designer','notification.read',true,null,now()),

  ('production_admin','order.read',true,null,now()),
  ('production_admin','job_order.create',true,null,now()),
  ('production_admin','job_order.edit',true,null,now()),
  ('production_admin','job_order.release',true,null,now()),
  ('production_admin','job_order.status',true,null,now()),
  ('production_admin','job_order.archive',true,null,now()),
  ('production_admin','work_item.create',true,null,now()),
  ('production_admin','work_item.update',true,null,now()),
  ('production_admin','work_item.assign',true,null,now()),
  ('production_admin','work_item.status',true,null,now()),
  ('production_admin','work_item.dependency',true,null,now()),
  ('production_admin','work_item.archive',true,null,now()),
  ('production_admin','production.view',true,null,now()),
  ('production_admin','production.transition',true,null,now()),
  ('production_admin','qc.view',true,null,now()),
  ('production_admin','shipping.view',true,null,now()),
  ('production_admin','notification.read',true,null,now()),

  ('operator','production.view',true,null,now()),
  ('operator','work_item.status',true,null,now()),
  ('operator','notification.read',true,null,now()),

  ('finance','order.read',true,null,now()),
  ('finance','quotation.read',true,null,now()),
  ('finance','payment.read',true,null,now()),
  ('finance','payment.create',true,null,now()),
  ('finance','payment.verify',true,null,now()),
  ('finance','payment.reject',true,null,now()),
  ('finance','payment.adjust',true,null,now()),
  ('finance','payment.archive',true,null,now()),
  ('finance','notification.read',true,null,now()),

  ('quality_control','order.read',true,null,now()),
  ('quality_control','production.view',true,null,now()),
  ('quality_control','qc.view',true,null,now()),
  ('quality_control','qc.create',true,null,now()),
  ('quality_control','qc.update',true,null,now()),
  ('quality_control','qc.inspect',true,null,now()),
  ('quality_control','qc.approve',true,null,now()),
  ('quality_control','qc.rework',true,null,now()),
  ('quality_control','qc.archive',true,null,now()),
  ('quality_control','notification.read',true,null,now()),

  ('store_staff','order.read',true,null,now()),
  ('store_staff','shipping.view',true,null,now()),
  ('store_staff','shipping.create',true,null,now()),
  ('store_staff','shipping.update',true,null,now()),
  ('store_staff','shipping.complete',true,null,now()),
  ('store_staff','shipping.archive',true,null,now()),
  ('store_staff','notification.read',true,null,now())
on conflict (role,permission_key) do update
set granted=excluded.granted,
    updated_at=now();

-- Keep both supported Super Admin spellings complete without changing any
-- permission already granted to other Phase 1-12 roles.
insert into public.role_permissions(role,permission_key,granted,updated_by,updated_at)
select role_name,definition.permission_key,true,null,now()
from (values ('superadmin'::text),('super_admin'::text)) as roles(role_name)
cross join public.permission_definitions definition
on conflict (role,permission_key) do update
set granted=true,
    updated_at=now();

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

  actor_role_value:=public.current_actor_role();
  if actor_role_value not in ('superadmin','super_admin') then
    raise exception 'Hanya Super Admin yang dapat mengubah role pengguna';
  end if;

  if p_role not in (
    'owner','superadmin','super_admin','admin','sales_admin','designer',
    'production_admin','operator','finance','quality_control','store_staff'
  ) then
    raise exception 'Role tidak valid';
  end if;

  select * into target_row
  from public.profiles
  where id=p_profile_id
  for update;
  if not found then raise exception 'Profil tidak ditemukan'; end if;

  if p_profile_id=auth.uid() and p_role not in ('superadmin','super_admin') then
    raise exception 'Super Admin tidak dapat menurunkan role akun sendiri';
  end if;

  if target_row.role in ('superadmin','super_admin')
     and p_role not in ('superadmin','super_admin') then
    select count(*) into super_admin_count
    from public.profiles
    where role in ('superadmin','super_admin');
    if super_admin_count<=1 then
      raise exception 'Role Super Admin terakhir tidak boleh diturunkan';
    end if;
  end if;

  update public.profiles
  set role=p_role,updated_at=now()
  where id=p_profile_id
  returning * into result_row;

  return result_row;
end
$$;

revoke all on function public.update_profile_role(uuid,text) from public,anon;
grant execute on function public.update_profile_role(uuid,text) to authenticated,service_role;

create or replace function public.audit_role_permission_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_json jsonb;
  new_json jsonb;
  action_value text;
  role_value text;
  permission_value text;
begin
  if tg_op='INSERT' then
    new_json:=to_jsonb(new);
    action_value:='created';
    role_value:=new.role;
    permission_value:=new.permission_key;
  elsif tg_op='UPDATE' then
    old_json:=to_jsonb(old);
    new_json:=to_jsonb(new);
    action_value:='updated';
    role_value:=new.role;
    permission_value:=new.permission_key;
  else
    old_json:=to_jsonb(old);
    action_value:='deleted';
    role_value:=old.role;
    permission_value:=old.permission_key;
  end if;

  insert into public.system_audit_log(
    entity_type,entity_id,action,old_value,new_value,actor_id,actor_role,
    source,metadata
  ) values (
    'role_permissions',null,action_value,old_json,new_json,auth.uid(),
    public.current_actor_role(),'trigger',
    jsonb_build_object('role',role_value,'permission_key',permission_value)
  );

  if tg_op='DELETE' then return old; end if;
  return new;
end
$$;

-- Audit role assignments and permission matrix changes. Existing audit history
-- remains untouched and system_audit_log stays append-only.
do $$
begin
  if not exists (select 1 from pg_trigger where tgrelid='public.profiles'::regclass and tgname='audit_profiles_role_changes' and not tgisinternal) then
    create trigger audit_profiles_role_changes
    after update of role on public.profiles
    for each row
    when (old.role is distinct from new.role)
    execute function public.audit_row_change();
  end if;
  if not exists (select 1 from pg_trigger where tgrelid='public.role_permissions'::regclass and tgname='audit_role_permissions_changes' and not tgisinternal) then
    create trigger audit_role_permissions_changes
    after insert or update or delete on public.role_permissions
    for each row execute function public.audit_role_permission_change();
  end if;
end
$$;

-- Cover the v1.2 changes named explicitly by the frozen blueprint: quantities,
-- prices, approvals/status parents, and production/QC/fulfillment file changes.
do $$
declare
  target_table text;
  trigger_name text;
begin
  foreach target_table in array array[
    'quotation_items','quotation_item_services','order_items','order_item_services',
    'mockup_files','mockup_parts','qc_files','fulfillment_files'
  ] loop
    trigger_name:='audit_'||target_table||'_changes';
    if not exists (
      select 1 from pg_trigger
      where tgrelid=('public.'||target_table)::regclass
        and tgname=trigger_name
        and not tgisinternal
    ) then
      execute format(
        'create trigger %I after insert or update or delete on public.%I for each row execute function public.audit_row_change()',
        trigger_name,target_table
      );
    end if;
  end loop;
end
$$;

create index if not exists system_audit_log_created_at_idx
  on public.system_audit_log(created_at desc);

-- New role-aware read policies are additive. No Phase 1-12 policy is removed.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='permission_definitions' and policyname='phase13 access readers permission definitions') then
    create policy "phase13 access readers permission definitions" on public.permission_definitions
      for select to authenticated using (public.has_permission('access_control.read'));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='role_permissions' and policyname='phase13 access readers role permissions') then
    create policy "phase13 access readers role permissions" on public.role_permissions
      for select to authenticated using (public.has_permission('access_control.read'));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='phase13 operational directory read') then
    create policy "phase13 operational directory read" on public.profiles
      for select to authenticated using (
        public.has_permission('access_control.read') or
        public.has_permission('work_item.assign') or
        public.has_permission('qc.inspect') or
        public.has_permission('shipping.update') or
        public.has_permission('mockup.read') or
        public.has_permission('payment.read')
      );
  end if;
end
$$;

-- Read policies for official specialist roles.
do $$
declare
  target_table text;
begin
  foreach target_table in array array['orders','order_items','order_item_services','order_status_history'] loop
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=target_table and policyname='phase13 permission order read') then
      execute format('create policy %I on public.%I for select to authenticated using (public.has_permission(''order.read''))','phase13 permission order read',target_table);
    end if;
  end loop;

  foreach target_table in array array['quotations','quotation_items','quotation_item_services','quotation_versions','quotation_status_history'] loop
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=target_table and policyname='phase13 permission quotation read') then
      execute format('create policy %I on public.%I for select to authenticated using (public.has_permission(''quotation.read''))','phase13 permission quotation read',target_table);
    end if;
  end loop;

  foreach target_table in array array['mockup_sets','mockup_parts','mockup_files','mockup_review_links','mockup_approval_history'] loop
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=target_table and policyname='phase13 permission mockup read') then
      execute format('create policy %I on public.%I for select to authenticated using (public.has_permission(''mockup.read''))','phase13 permission mockup read',target_table);
    end if;
  end loop;

  foreach target_table in array array['order_payments','payment_adjustments','payment_submission_links','payment_activity_history'] loop
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=target_table and policyname='phase13 permission payment read') then
      execute format('create policy %I on public.%I for select to authenticated using (public.has_permission(''payment.read''))','phase13 permission payment read',target_table);
    end if;
  end loop;

  foreach target_table in array array['fulfillments','fulfillment_items','fulfillment_files','fulfillment_revisions','fulfillment_status_history','fulfillment_deletion_audit'] loop
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=target_table and policyname='phase13 permission shipping view') then
      execute format('create policy %I on public.%I for select to authenticated using (public.has_permission(''shipping.view''))','phase13 permission shipping view',target_table);
    end if;
  end loop;
end
$$;

-- Designer writes remain constrained to mockup records only.
do $$
declare target_table text;
begin
  foreach target_table in array array['mockup_sets','mockup_parts','mockup_files','mockup_review_links'] loop
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=target_table and policyname='phase13 permission mockup write') then
      execute format(
        'create policy %I on public.%I for all to authenticated using (public.has_permission(''mockup.write'')) with check (public.has_permission(''mockup.write''))',
        'phase13 permission mockup write',target_table
      );
    end if;
  end loop;
end
$$;

-- Production Admin sees all operational production data. Operators see only
-- their assigned Work Items and the directly-related Job Order/history.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='work_items' and policyname='phase13 production work item read') then
    create policy "phase13 production work item read" on public.work_items
      for select to authenticated using (
        public.has_permission('production.view') and
        (public.current_actor_role()<>'operator' or assigned_to=auth.uid())
      );
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='job_orders' and policyname='phase13 production job order read') then
    create policy "phase13 production job order read" on public.job_orders
      for select to authenticated using (
        public.has_permission('production.view') and
        (
          public.current_actor_role()<>'operator' or exists(
            select 1 from public.work_items work_item
            where work_item.job_order_id=job_orders.id
              and work_item.assigned_to=auth.uid()
          )
        )
      );
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='work_item_status_history' and policyname='phase13 production work history read') then
    create policy "phase13 production work history read" on public.work_item_status_history
      for select to authenticated using (
        public.has_permission('production.view') and exists(
          select 1 from public.work_items work_item
          where work_item.id=work_item_status_history.work_item_id
            and (public.current_actor_role()<>'operator' or work_item.assigned_to=auth.uid())
        )
      );
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='job_order_status_history' and policyname='phase13 production job history read') then
    create policy "phase13 production job history read" on public.job_order_status_history
      for select to authenticated using (
        public.has_permission('production.view') and exists(
          select 1 from public.work_items work_item
          where work_item.job_order_id=job_order_status_history.job_order_id
            and (public.current_actor_role()<>'operator' or work_item.assigned_to=auth.uid())
        )
      );
  end if;
end
$$;

-- Guard security-definer transition RPCs: operators may never mutate another
-- operator's assignment, even when they know its UUID.
create or replace function public.guard_operator_work_item_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.current_actor_role()='operator' and old.assigned_to is distinct from auth.uid() then
    raise exception 'Operator hanya dapat memperbarui Work Item yang ditugaskan kepadanya';
  end if;
  return new;
end
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgrelid='public.work_items'::regclass and tgname='guard_operator_work_item_update' and not tgisinternal) then
    create trigger guard_operator_work_item_update
    before update on public.work_items
    for each row execute function public.guard_operator_work_item_update();
  end if;
end
$$;

-- Phase 12 notification delivery stays unchanged; this only expands staff
-- recipients so the official Phase 13 roles can receive their in-app events.
create or replace function public.staff_notification_recipients()
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(profile_row.id),array[]::uuid[])
  from public.profiles profile_row
  where profile_row.role in (
    'owner','superadmin','super_admin','sales_admin','admin','designer',
    'production_admin','operator','finance','quality_control','store_staff'
  )
$$;

create or replace function public.staff_notification_recipients(p_roles text[])
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(profile_row.id),array[]::uuid[])
  from public.profiles profile_row
  where profile_row.role=any(p_roles)
$$;

-- Ensure authenticated users can reach the read surfaces; RLS remains the
-- authorization boundary. Mutations continue through existing secured RPCs.
grant select on public.permission_definitions,public.role_permissions,public.system_audit_log to authenticated;
grant select on public.profiles to authenticated;

commit;

-- Rollback note:
-- This migration is additive except for expanding profiles_role_check and the
-- staff_notification_recipients role catalog. A rollback should restore the
-- prior role check/functions, remove only policies/triggers bearing the
-- "phase13"/"audit_*_changes" names created here, and leave all audit rows and
-- user data intact.
