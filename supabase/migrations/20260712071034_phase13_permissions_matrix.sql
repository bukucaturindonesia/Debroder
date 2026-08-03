create table if not exists public.permission_definitions (
  permission_key text primary key,
  module text not null,
  label text not null,
  description text not null default '',
  created_at timestamptz not null default now()
);
create table if not exists public.role_permissions (
  role text not null,
  permission_key text not null references public.permission_definitions(permission_key) on delete cascade,
  granted boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key(role,permission_key)
);
insert into public.permission_definitions(permission_key,module,label) values
 ('quotation.read','quotation','Lihat quotation'),('quotation.write','quotation','Kelola quotation'),('quotation.approve','quotation','Setujui quotation'),('quotation.archive','quotation','Arsipkan quotation'),
 ('mockup.read','mockup','Lihat mockup'),('mockup.write','mockup','Kelola mockup'),('mockup.send','mockup','Kirim mockup'),('mockup.approve','mockup','Setujui mockup'),('mockup.archive','mockup','Arsipkan mockup'),
 ('order.read','order','Lihat pesanan'),('order.edit','order','Edit pesanan'),('order.archive','order','Arsipkan pesanan'),
 ('payment.create','payment','Catat pembayaran'),('payment.verify','payment','Verifikasi pembayaran'),('payment.reject','payment','Tolak pembayaran'),('payment.adjust','payment','Koreksi pembayaran'),('payment.archive','payment','Arsipkan pembayaran'),
 ('job_order.create','production','Buat Job Order'),('job_order.release','production','Rilis Job Order'),('job_order.edit','production','Edit Job Order'),('job_order.archive','production','Arsipkan Job Order'),
 ('work_item.create','production','Buat Work Item'),('work_item.assign','production','Tugaskan Work Item'),('work_item.update','production','Perbarui Work Item'),('work_item.archive','production','Arsipkan Work Item'),
 ('production.transition','production','Ubah status produksi'),
 ('qc.inspect','qc','Lakukan QC'),('qc.approve','qc','Sahkan QC'),('qc.rework','qc','Kirim ke perbaikan'),('qc.archive','qc','Arsipkan QC'),
 ('shipping.create','fulfillment','Buat pengiriman/pickup'),('shipping.update','fulfillment','Perbarui pengiriman/pickup'),('shipping.complete','fulfillment','Selesaikan pengiriman/pickup'),('shipping.archive','fulfillment','Arsipkan pengiriman/pickup'),
 ('notification.manage','notification','Kelola notifikasi'),('audit.read','audit','Lihat audit'),('permanent_delete','system','Hapus permanen')
on conflict(permission_key) do nothing;
insert into public.role_permissions(role,permission_key,granted)
select r.role,p.permission_key,true from (values ('superadmin'),('super_admin')) r(role) cross join public.permission_definitions p
on conflict(role,permission_key) do update set granted=excluded.granted;
insert into public.role_permissions(role,permission_key,granted)
select 'owner',permission_key,true from public.permission_definitions where permission_key<>'permanent_delete'
on conflict(role,permission_key) do update set granted=excluded.granted;
insert into public.role_permissions(role,permission_key,granted)
select 'admin',permission_key,true from public.permission_definitions where permission_key not in ('permanent_delete','audit.read')
on conflict(role,permission_key) do update set granted=excluded.granted;
insert into public.role_permissions(role,permission_key,granted)
select 'sales_admin',permission_key,true from public.permission_definitions
where permission_key in ('quotation.read','quotation.write','quotation.archive','mockup.read','order.read','payment.create','payment.archive')
on conflict(role,permission_key) do update set granted=excluded.granted;
create or replace function public.current_actor_role()
returns text language sql stable security definer set search_path=public as $$ select role from public.profiles where id=auth.uid() $$;
create or replace function public.has_permission(p_permission_key text)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.role_permissions rp join public.profiles p on p.role=rp.role
 where p.id=auth.uid() and rp.permission_key=p_permission_key and rp.granted)
$$;
create or replace view public.actor_directory as
select p.id,p.email,p.role,coalesce(nullif(p.email,''),p.id::text) as display_name from public.profiles p;
alter table public.permission_definitions enable row level security;
alter table public.role_permissions enable row level security;
drop policy if exists "staff read permission definitions" on public.permission_definitions;
create policy "staff read permission definitions" on public.permission_definitions for select to authenticated using(public.has_staff_role(array['owner','superadmin','super_admin','admin']));
drop policy if exists "staff read role permissions" on public.role_permissions;
create policy "staff read role permissions" on public.role_permissions for select to authenticated using(public.has_staff_role(array['owner','superadmin','super_admin','admin']));
grant select on public.permission_definitions,public.role_permissions,public.actor_directory to authenticated;
grant execute on function public.has_permission(text) to authenticated;;
