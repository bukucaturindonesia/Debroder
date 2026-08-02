begin;

-- ADMIN ACCOUNT & ROLE-BASED EXPERIENCE V1
-- Additive/corrective only. This migration never creates Auth users, sends
-- invitations, changes passwords, or mutates the owner-approved account roster.

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
  role = any(array[
    'owner','superadmin','super_admin','admin','admin_guest',
    'head_store','store_admin','product_content_manager','order_cs_admin','finance_admin',
    'sales_admin','designer','production_admin','operator','finance','quality_control','store_staff'
  ]::text[])
);

alter table public.profiles drop constraint if exists profiles_account_status_check;
alter table public.profiles add constraint profiles_account_status_check check (
  account_status = any(array['TESTING','ACTIVE','SUSPENDED','INACTIVE','LOCKED']::text[])
);

alter table public.profiles drop constraint if exists profiles_store_scope_check;
alter table public.profiles add constraint profiles_store_scope_check check (
  (role = 'store_admin' and primary_store_id is not null and all_store_access = false)
  or (role = 'head_store' and all_store_access = true)
  or (role in ('owner','product_content_manager','order_cs_admin','finance_admin') and all_store_access = true)
  or role <> all(array['owner','head_store','store_admin','product_content_manager','order_cs_admin','finance_admin']::text[])
);

create index if not exists profiles_account_status_idx on public.profiles(account_status);
create index if not exists profiles_primary_store_id_idx on public.profiles(primary_store_id);
create index if not exists profiles_role_status_idx on public.profiles(role,account_status);
create unique index if not exists profiles_normalized_email_unique_idx
  on public.profiles(lower(btrim(email))) where email is not null and btrim(email) <> '';

insert into public.permission_definitions(permission_key,module,label,description)
values
  ('dashboard.read','dashboard','Lihat dashboard role','Membuka dashboard yang relevan untuk role dan scope akun.'),
  ('content.read','content','Lihat konten','Membaca konfigurasi CMS, media, dan halaman publik.'),
  ('content.manage','content','Kelola konten','Membuat dan mengubah konten non-sensitif melalui workflow CMS.'),
  ('content.publish','content','Publikasikan konten','Menerbitkan atau menjadwalkan konten melalui workflow canonical.'),
  ('product.read','product','Lihat produk','Membaca katalog, varian, media, dan status produk.'),
  ('product.manage','product','Kelola draft produk','Membuat serta mengubah draft, varian, dan media produk.'),
  ('product.publish','product','Publikasikan produk','Menerbitkan atau mengarsipkan produk setelah validasi.'),
  ('product.inventory.manage','product','Kelola SKU, harga, dan stok','Mengubah sellable SKU, harga, dan stok melalui workflow audited.'),
  ('product.maintenance','product','Pemeliharaan produk','Mengakses alat pemeliharaan PIM berisiko tinggi.'),
  ('job_order.read','production','Lihat Job Order','Membaca Job Order yang diizinkan.'),
  ('store.read','store','Lihat toko','Membaca direktori toko canonical.'),
  ('settings.read','system','Lihat pengaturan','Membaca pengaturan bisnis non-secret.'),
  ('settings.manage','system','Kelola pengaturan','Mengubah pengaturan bisnis melalui workflow audited.'),
  ('report.read','report','Lihat laporan','Membaca laporan sesuai domain dan scope role.'),
  ('payment.settings.read','payment','Lihat pengaturan pembayaran','Membaca metode dan konfigurasi pembayaran tanpa secret.'),
  ('payment.settings.manage','payment','Kelola pengaturan pembayaran','Mengubah konfigurasi pembayaran melalui workflow canonical.'),
  ('audit.self_read','audit','Lihat aktivitas sendiri','Membaca aktivitas akun sendiri.'),
  ('audit.payment_read','audit','Lihat audit pembayaran','Membaca audit pembayaran dan rekonsiliasi.')
on conflict(permission_key) do update
set module = excluded.module,
    label = excluded.label,
    description = excluded.description;

-- Ensure a closed matrix exists before applying the owner-approved grants.
insert into public.role_permissions(role,permission_key,granted,updated_by,updated_at)
select role_name.role, definition.permission_key, false, null, now()
from (values
  ('owner'),('head_store'),('store_admin'),('product_content_manager'),('order_cs_admin'),('finance_admin')
) as role_name(role)
cross join public.permission_definitions definition
on conflict(role,permission_key) do nothing;

update public.role_permissions
set granted = false, updated_by = null, updated_at = now()
where role in ('head_store','store_admin','product_content_manager','order_cs_admin','finance_admin');

update public.role_permissions set granted = true, updated_at = now()
where role = 'head_store' and permission_key = any(array[
  'dashboard.read','notification.read','order.read','order.edit','order.task.read','order.task.manage',
  'quotation.read','operations.read','operations.manage','operations.health.read',
  'inventory.location.read','inventory.location.manage','production.view','production.transition',
  'job_order.read','job_order.create','job_order.edit','job_order.release','job_order.status',
  'work_item.create','work_item.update','work_item.assign','work_item.status','work_item.dependency',
  'qc.view','qc.create','qc.update','qc.inspect','qc.approve','qc.rework',
  'shipping.view','shipping.create','shipping.update','shipping.complete',
  'refund.read','customer.outbox.read','customer.outbox.manage','report.read','store.read'
]::text[]);

update public.role_permissions set granted = true, updated_at = now()
where role = 'store_admin' and permission_key = any(array[
  'dashboard.read','notification.read','order.read','order.edit','order.task.read','order.task.manage',
  'operations.read','operations.manage','inventory.location.read','inventory.location.manage',
  'shipping.view','shipping.create','shipping.update','shipping.complete','refund.read','audit.self_read'
]::text[]);

update public.role_permissions set granted = true, updated_at = now()
where role = 'product_content_manager' and permission_key = any(array[
  'dashboard.read','notification.read','notification.manage','content.read','content.manage','content.publish',
  'product.read','product.manage','store.read'
]::text[]);

update public.role_permissions set granted = true, updated_at = now()
where role = 'order_cs_admin' and permission_key = any(array[
  'dashboard.read','notification.read','notification.manage','order.read','order.edit',
  'order.task.read','order.task.manage','quotation.read','quotation.write',
  'mockup.read','mockup.write','mockup.send','mockup.archive',
  'job_order.read','job_order.create','job_order.edit','job_order.release','job_order.status',
  'work_item.create','work_item.update','work_item.assign','work_item.status','work_item.dependency',
  'production.view','production.transition','qc.view','qc.create','qc.update','qc.inspect','qc.rework',
  'shipping.view','shipping.create','shipping.update','customer.outbox.read','customer.outbox.manage',
  'refund.read','payment.read'
]::text[]);

update public.role_permissions set granted = true, updated_at = now()
where role = 'finance_admin' and permission_key = any(array[
  'dashboard.read','notification.read','order.read','operations.read',
  'payment.read','payment.create','payment.verify','payment.reject','payment.adjust','payment.archive',
  'payment.settings.read','payment.settings.manage','refund.read','refund.manage','report.read','audit.payment_read'
]::text[]);

-- Owner receives every non-destructive capability. Permanent deletion remains
-- explicitly denied in accordance with the frozen Owner contract.
insert into public.role_permissions(role,permission_key,granted,updated_by,updated_at)
select 'owner', definition.permission_key, definition.permission_key <> 'permanent_delete', null, now()
from public.permission_definitions definition
on conflict(role,permission_key) do update
set granted = excluded.granted, updated_by = null, updated_at = now();

-- Compatibility roles keep their existing grants and receive only the new
-- presentation permissions needed by their established screens.
insert into public.role_permissions(role,permission_key,granted,updated_by,updated_at)
select role_name.role, permission_key, true, null, now()
from (values ('superadmin'),('super_admin'),('admin')) as role_name(role)
cross join (values
  ('dashboard.read'),('content.read'),('product.read'),('store.read'),('settings.read'),('report.read'),('payment.settings.read')
) as permission(permission_key)
on conflict(role,permission_key) do update set granted = excluded.granted, updated_at = now();

create or replace function public.admin_access_context_v1()
returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'user_id', profile_row.id,
    'role', profile_row.role,
    'account_status', profile_row.account_status,
    'primary_store_id', profile_row.primary_store_id,
    'all_store_access', profile_row.all_store_access,
    'session_valid', public.is_current_admin_session(),
    'scope_complete', case
      when profile_row.role = 'store_admin' then
        not profile_row.all_store_access
        and profile_row.primary_store_id is not null
        and exists(select 1 from public.stores store_row where store_row.id = profile_row.primary_store_id and store_row.status_aktif)
      when profile_row.role = 'head_store' then
        profile_row.all_store_access
        and (profile_row.primary_store_id is null or exists(select 1 from public.stores store_row where store_row.id = profile_row.primary_store_id and store_row.status_aktif))
      when profile_row.role in ('owner','product_content_manager','order_cs_admin','finance_admin') then profile_row.all_store_access
      else true
    end,
    'permissions', coalesce((
      select jsonb_agg(permission.permission_key order by permission.permission_key)
      from public.role_permissions permission
      where permission.role = case when profile_row.role = 'super_admin' then 'superadmin' else profile_row.role end
        and permission.granted
    ), '[]'::jsonb)
  )
  from public.profiles profile_row
  where profile_row.id = auth.uid()
$$;

create or replace function public.initialize_admin_invitation_profile_v1(
  p_profile_id uuid,
  p_email text,
  p_display_name text,
  p_role text,
  p_primary_store_id uuid,
  p_all_store_access boolean,
  p_reason text
)
returns public.profiles
language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid := auth.uid();
  actor_role text := public.current_actor_role();
  result_row public.profiles;
begin
  if actor_id is null or actor_role not in ('owner','superadmin','super_admin')
     or not public.has_permission('access_control.manage') then
    raise exception 'Akses pembuatan undangan ditolak' using errcode = '42501';
  end if;
  if p_role not in ('head_store','store_admin','product_content_manager','order_cs_admin','finance_admin') then
    raise exception 'Role operasional tidak valid' using errcode = '22023';
  end if;
  if length(btrim(coalesce(p_display_name,''))) < 2 then
    raise exception 'Nama Admin tidak valid' using errcode = '22023';
  end if;
  if length(btrim(coalesce(p_reason,''))) < 8 then
    raise exception 'Alasan undangan minimal 8 karakter' using errcode = '22023';
  end if;
  if p_role = 'store_admin' and (p_primary_store_id is null or p_all_store_access) then
    raise exception 'Store Admin wajib memiliki tepat satu toko' using errcode = '22023';
  end if;
  if p_role <> 'store_admin' and not p_all_store_access then
    raise exception 'Role pusat wajib memiliki scope global' using errcode = '22023';
  end if;
  if p_primary_store_id is not null and not exists(
    select 1 from public.stores store_row where store_row.id = p_primary_store_id and store_row.status_aktif
  ) then
    raise exception 'Toko scope tidak aktif atau tidak ditemukan' using errcode = '22023';
  end if;
  if not exists(
    select 1 from auth.users auth_user
    where auth_user.id = p_profile_id and lower(auth_user.email) = lower(btrim(p_email))
  ) then
    raise exception 'Identitas Auth undangan tidak cocok' using errcode = '22023';
  end if;

  insert into public.profiles(
    id,email,display_name,role,account_status,primary_store_id,all_store_access,lifecycle_reason
  ) values (
    p_profile_id,lower(btrim(p_email)),btrim(p_display_name),p_role,'TESTING',
    p_primary_store_id,p_all_store_access,btrim(p_reason)
  )
  returning * into result_row;

  insert into public.system_audit_log(
    entity_type,entity_id,action,new_value,actor_id,actor_role,source,reason,metadata
  ) values (
    'admin_profile',p_profile_id,'ADMIN_INVITATION_CREATED',
    jsonb_build_object('role',p_role,'account_status','TESTING','primary_store_id',p_primary_store_id,'all_store_access',p_all_store_access),
    actor_id,actor_role,'admin-account-v1',btrim(p_reason),
    jsonb_build_object('profile_and_audit_atomic',true,'secret_values_logged',false)
  );

  return result_row;
end
$$;

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
  actor_id uuid := auth.uid();
  actor_role text := public.current_actor_role();
  target_row public.profiles;
  result_row public.profiles;
begin
  if actor_id is null or actor_role not in ('owner','superadmin','super_admin')
     or not public.has_permission('access_control.manage') then
    raise exception 'Akses pengelolaan akun ditolak' using errcode = '42501';
  end if;
  if p_role not in ('head_store','store_admin','product_content_manager','order_cs_admin','finance_admin') then
    raise exception 'Role operasional tidak valid' using errcode = '22023';
  end if;
  if p_account_status not in ('TESTING','ACTIVE','SUSPENDED','INACTIVE','LOCKED') then
    raise exception 'Status akun tidak valid' using errcode = '22023';
  end if;
  if length(btrim(coalesce(p_reason,''))) < 8 then
    raise exception 'Alasan perubahan minimal 8 karakter' using errcode = '22023';
  end if;

  select * into target_row from public.profiles where id = p_profile_id for update;
  if not found then raise exception 'Profil tidak ditemukan' using errcode = 'P0002'; end if;
  if target_row.role in ('owner','superadmin','super_admin') then
    raise exception 'Akun Owner atau Super Admin dilindungi' using errcode = '42501';
  end if;
  if actor_id = p_profile_id and (
    target_row.role is distinct from p_role
    or target_row.account_status is distinct from p_account_status
    or target_row.primary_store_id is distinct from p_primary_store_id
    or target_row.all_store_access is distinct from p_all_store_access
  ) then
    raise exception 'Akun sendiri tidak dapat mengubah role, status, atau scope' using errcode = '42501';
  end if;
  if p_role = 'store_admin' and (p_primary_store_id is null or p_all_store_access) then
    raise exception 'Store Admin wajib memiliki tepat satu toko' using errcode = '22023';
  end if;
  if p_role <> 'store_admin' and not p_all_store_access then
    raise exception 'Role pusat wajib memiliki scope global' using errcode = '22023';
  end if;
  if p_primary_store_id is not null and not exists(
    select 1 from public.stores store_row where store_row.id = p_primary_store_id and store_row.status_aktif
  ) then
    raise exception 'Toko scope tidak aktif atau tidak ditemukan' using errcode = '22023';
  end if;

  update public.profiles
  set role = p_role,
      account_status = p_account_status,
      primary_store_id = p_primary_store_id,
      all_store_access = p_all_store_access,
      activated_at = case when p_account_status = 'ACTIVE' and account_status <> 'ACTIVE' then now() else activated_at end,
      suspended_at = case when p_account_status = 'SUSPENDED' then now() else null end,
      inactive_at = case when p_account_status = 'INACTIVE' then now() else null end,
      locked_at = case when p_account_status = 'LOCKED' then now() else null end,
      lifecycle_reason = btrim(p_reason),
      active_session_id = null,
      session_version = session_version + 1,
      updated_at = now()
  where id = p_profile_id
  returning * into result_row;

  delete from auth.sessions where user_id = p_profile_id;
  update auth.refresh_tokens set revoked = true, updated_at = now()
  where user_id = p_profile_id::text and revoked = false;

  insert into public.system_audit_log(
    entity_type,entity_id,action,old_value,new_value,actor_id,actor_role,source,reason,metadata
  ) values (
    'admin_profile',p_profile_id,'ADMIN_ACCOUNT_ACCESS_UPDATED',
    jsonb_build_object('role',target_row.role,'account_status',target_row.account_status,'primary_store_id',target_row.primary_store_id,'all_store_access',target_row.all_store_access),
    jsonb_build_object('role',result_row.role,'account_status',result_row.account_status,'primary_store_id',result_row.primary_store_id,'all_store_access',result_row.all_store_access),
    actor_id,actor_role,'admin-account-v1',btrim(p_reason),jsonb_build_object('sessions_revoked',true,'email_authorization_used',false)
  );
  return result_row;
end
$$;

create or replace function public.revoke_admin_sessions_v1(p_profile_id uuid,p_reason text)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid := auth.uid();
  actor_role text := public.current_actor_role();
  target_role text;
begin
  if actor_id is null or actor_role not in ('owner','superadmin','super_admin')
     or not public.has_permission('access_control.manage') then
    raise exception 'Akses pencabutan sesi ditolak' using errcode = '42501';
  end if;
  if p_profile_id = actor_id then raise exception 'Sesi sendiri tidak dapat dicabut dari halaman akun' using errcode = '42501'; end if;
  if length(btrim(coalesce(p_reason,''))) < 8 then raise exception 'Alasan minimal 8 karakter' using errcode = '22023'; end if;
  select role into target_role from public.profiles where id = p_profile_id for update;
  if not found then raise exception 'Profil tidak ditemukan' using errcode = 'P0002'; end if;
  if target_role = 'owner' then raise exception 'Sesi Owner dilindungi' using errcode = '42501'; end if;

  update public.profiles set active_session_id = null, session_version = session_version + 1, updated_at = now() where id = p_profile_id;
  delete from auth.sessions where user_id = p_profile_id;
  update auth.refresh_tokens set revoked = true, updated_at = now() where user_id = p_profile_id::text and revoked = false;
  insert into public.system_audit_log(entity_type,entity_id,action,actor_id,actor_role,source,reason,metadata)
  values('admin_profile',p_profile_id,'ADMIN_SESSIONS_REVOKED',actor_id,actor_role,'admin-account-v1',btrim(p_reason),jsonb_build_object('sessions_revoked',true));
  return true;
end
$$;

create or replace function public.scoped_staff_notification_recipients_v1(p_roles text[],p_store_id uuid default null)
returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(profile_row.id order by profile_row.id),array[]::uuid[])
  from public.profiles profile_row
  where profile_row.role = any(p_roles)
    and profile_row.account_status in ('TESTING','ACTIVE')
    and (
      profile_row.role <> 'store_admin'
      or (p_store_id is not null and not profile_row.all_store_access and profile_row.primary_store_id = p_store_id)
    )
$$;

create or replace function public.staff_notification_recipients()
returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(profile_row.id order by profile_row.id),array[]::uuid[])
  from public.profiles profile_row
  where profile_row.role in (
    'owner','superadmin','super_admin','sales_admin','admin','designer','production_admin',
    'operator','finance','quality_control','store_staff','head_store',
    'product_content_manager','order_cs_admin','finance_admin'
  )
    and profile_row.account_status in ('TESTING','ACTIVE')
$$;

create or replace function public.staff_notification_recipients(p_roles text[])
returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(profile_row.id order by profile_row.id),array[]::uuid[])
  from public.profiles profile_row
  where profile_row.role = any(p_roles)
    and profile_row.role <> 'store_admin'
    and profile_row.account_status in ('TESTING','ACTIVE')
$$;

-- Product/content direct reads and CMS mutations use the same database
-- permission source as APIs and navigation. Existing public published reads remain.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'homepage_sections','homepage_section_items','landing_sections','cms_banners','media_assets',
    'custom_categories','custom_category_products','custom_personalization_rules','custom_placements',
    'custom_presets','custom_print_sizes','custom_service_compatibilities','custom_services'
  ] loop
    if to_regclass('public.' || table_name) is not null then
      execute format('drop policy if exists %I on public.%I','admin content read v1',table_name);
      execute format('create policy %I on public.%I for select to authenticated using (public.has_permission(''content.read''))','admin content read v1',table_name);
      execute format('drop policy if exists %I on public.%I','admin content manage v1',table_name);
      execute format('create policy %I on public.%I for all to authenticated using (public.has_permission(''content.manage'')) with check (public.has_permission(''content.manage''))','admin content manage v1',table_name);
    end if;
  end loop;

  foreach table_name in array array[
    'products','product_categories','product_subcategories','product_variants','product_variant_images'
  ] loop
    if to_regclass('public.' || table_name) is not null then
      execute format('drop policy if exists %I on public.%I','admin product read v1',table_name);
      execute format('create policy %I on public.%I for select to authenticated using (public.has_permission(''product.read''))','admin product read v1',table_name);
      execute format('drop policy if exists %I on public.%I','admin product manage v1',table_name);
      execute format('create policy %I on public.%I for all to authenticated using (public.has_permission(''product.manage'')) with check (public.has_permission(''product.manage''))','admin product manage v1',table_name);
    end if;
  end loop;

  if to_regclass('public.product_variant_sizes') is not null then
    execute 'drop policy if exists "admin product sellable read v1" on public.product_variant_sizes';
    execute 'create policy "admin product sellable read v1" on public.product_variant_sizes for select to authenticated using (public.has_permission(''product.read''))';
    execute 'drop policy if exists "admin product inventory manage v1" on public.product_variant_sizes';
    execute 'create policy "admin product inventory manage v1" on public.product_variant_sizes for all to authenticated using (public.has_permission(''product.inventory.manage'')) with check (public.has_permission(''product.inventory.manage''))';
  end if;
end
$$;

drop policy if exists "admin canonical store directory read v1" on public.stores;
create policy "admin canonical store directory read v1" on public.stores for select to authenticated
using (public.has_permission('store.read') or public.can_access_store(id));

-- Normal Admin channels may only read rows addressed to their Auth identity.
-- Realtime therefore inherits recipient isolation from RLS.
drop policy if exists "recipient read notifications" on public.notifications;
create policy "recipient read notifications" on public.notifications for select to authenticated
using (recipient_id = auth.uid() and public.has_permission('notification.read'));

revoke all on function public.admin_access_context_v1() from public,anon;
revoke all on function public.initialize_admin_invitation_profile_v1(uuid,text,text,text,uuid,boolean,text) from public,anon;
revoke all on function public.update_admin_account_access_v1(uuid,text,text,uuid,boolean,text) from public,anon;
revoke all on function public.revoke_admin_sessions_v1(uuid,text) from public,anon;
revoke all on function public.scoped_staff_notification_recipients_v1(text[],uuid) from public,anon;
revoke all on function public.staff_notification_recipients() from public,anon;
revoke all on function public.staff_notification_recipients(text[]) from public,anon;
grant execute on function public.admin_access_context_v1() to authenticated,service_role;
grant execute on function public.initialize_admin_invitation_profile_v1(uuid,text,text,text,uuid,boolean,text) to authenticated,service_role;
grant execute on function public.update_admin_account_access_v1(uuid,text,text,uuid,boolean,text) to authenticated,service_role;
grant execute on function public.revoke_admin_sessions_v1(uuid,text) to authenticated,service_role;
grant execute on function public.scoped_staff_notification_recipients_v1(text[],uuid) to authenticated,service_role;
grant execute on function public.staff_notification_recipients() to authenticated,service_role;
grant execute on function public.staff_notification_recipients(text[]) to authenticated,service_role;

commit;
