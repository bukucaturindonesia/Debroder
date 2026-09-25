begin;

-- DEBRODER fresh-database baseline.
--
-- This migration is schema and security primitives only. It deliberately
-- contains no customers, Auth identities, orders, payments, quotations,
-- sellable products, inventory quantities, CMS content, storage objects, or
-- environment-specific identifiers.

-- Supabase installs pgcrypto in the non-exposed extensions schema.  Keep the
-- extension location explicit and qualify extension-owned calls below; the
-- baseline must not depend on a session search_path containing `extensions`.
create extension if not exists pgcrypto with schema extensions;
create extension if not exists btree_gist;

do $$
begin
  if not exists (
    select 1 from pg_type
    where typnamespace = 'public'::regnamespace and typname = 'product_status'
  ) then
    create type public.product_status as enum ('draft', 'active', 'archived');
  end if;
  if not exists (
    select 1 from pg_type
    where typnamespace = 'public'::regnamespace and typname = 'variant_status'
  ) then
    create type public.variant_status as enum ('active', 'inactive', 'out_of_stock');
  end if;
  if not exists (
    select 1 from pg_type
    where typnamespace = 'public'::regnamespace and typname = 'size_status'
  ) then
    create type public.size_status as enum ('active', 'inactive');
  end if;
  if not exists (
    select 1 from pg_type
    where typnamespace = 'public'::regnamespace and typname = 'variant_image_role'
  ) then
    create type public.variant_image_role as enum ('front', 'back', 'detail', 'lifestyle');
  end if;
  if not exists (
    select 1 from pg_type
    where typnamespace = 'public'::regnamespace and typname = 'custom_service_status'
  ) then
    create type public.custom_service_status as enum ('active', 'inactive', 'archived');
  end if;
  if not exists (
    select 1 from pg_type
    where typnamespace = 'public'::regnamespace and typname = 'service_pricing_type'
  ) then
    create type public.service_pricing_type as enum (
      'fixed_per_item', 'fixed_per_order', 'tiered', 'estimated', 'manual_quote'
    );
  end if;
  if not exists (
    select 1 from pg_type
    where typnamespace = 'public'::regnamespace and typname = 'quotation_status'
  ) then
    create type public.quotation_status as enum (
      'draft', 'submitted', 'reviewing', 'quoted', 'expired', 'cancelled'
    );
  end if;
  if not exists (
    select 1 from pg_type
    where typnamespace = 'public'::regnamespace and typname = 'upload_status'
  ) then
    create type public.upload_status as enum ('uploaded', 'linked', 'deleted');
  end if;
end;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Supabase Auth remains the identity authority. This table is the internal
-- actor directory; profile provisioning remains an explicit trusted
-- application/server operation. No auth.users trigger is created here.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  role text not null default 'viewer',
  account_status text not null default 'ACTIVE',
  primary_store_id uuid,
  all_store_access boolean not null default true,
  active_session_id uuid,
  session_version bigint not null default 0,
  last_login_at timestamptz,
  password_changed_at timestamptz,
  activated_at timestamptz,
  suspended_at timestamptz,
  inactive_at timestamptz,
  locked_at timestamptz,
  lifecycle_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_baseline_check check (
    role = any (array[
      'viewer','owner','superadmin','super_admin','admin','admin_guest',
      'head_store','store_admin','product_content_manager','order_cs_admin',
      'finance_admin','sales_admin','designer','production_admin','operator',
      'finance','quality_control','store_staff'
    ]::text[])
  ),
  constraint profiles_account_status_baseline_check check (
    account_status = any (array['TESTING','ACTIVE','SUSPENDED','INACTIVE','LOCKED']::text[])
  )
);

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  name text,
  slug text,
  nama_store text not null,
  layanan_utama text not null default '',
  alamat text not null default '',
  whatsapp text not null default '',
  whatsapp_link text not null default '',
  maps_link text not null default '',
  image_url text,
  image_alt text,
  urutan integer not null default 0,
  status_aktif boolean not null default true,
  -- CMS workflow authority for store visibility; status_aktif remains the
  -- legacy active-row compatibility gate used by public/store-scope reads.
  status text not null default 'published' check (status in ('draft','scheduled','published','archived')),
  publish_at timestamptz,
  published_at timestamptz,
  archived_at timestamptz,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stores_slug_unique unique (slug)
);

alter table public.profiles
  drop constraint if exists profiles_primary_store_fk;
alter table public.profiles
  add constraint profiles_primary_store_fk
  foreign key (primary_store_id) references public.stores(id) on delete restrict;

create index if not exists profiles_role_status_idx
  on public.profiles(role, account_status);
create index if not exists profiles_primary_store_id_idx
  on public.profiles(primary_store_id);
create index if not exists stores_status_order_idx
  on public.stores(status_aktif, urutan);

create or replace function public.current_actor_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when auth.uid() is null then null
    when profile_row.account_status not in ('TESTING', 'ACTIVE') then null
    else profile_row.role
  end
  from public.profiles profile_row
  where profile_row.id = auth.uid();
$$;

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_actor_role() in ('owner', 'superadmin', 'super_admin'), false);
$$;

create or replace function public.is_admin_guest()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_actor_role() = 'admin_guest', false);
$$;

create or replace function public.has_staff_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    public.current_actor_role() <> 'admin_guest'
    and public.current_actor_role() = any (coalesce(allowed_roles, array[]::text[])),
    false
  );
$$;

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
  primary key (role, permission_key)
);

-- Repository schema-version bookkeeping is metadata only.  It intentionally
-- contains no historical business rows; compatibility migrations may record
-- their own completion marker here.
create table if not exists public.debroder_schema_versions (
  version_key text primary key,
  description text not null,
  applied_at timestamptz not null default now()
);

-- These are system permission definitions, not business/customer seed data.
-- Role assignments remain empty until an approved trusted provisioning path
-- creates them.
insert into public.permission_definitions(permission_key, module, label)
values
  ('access_control.read','access','Read access control'),
  ('access_control.manage','access','Manage access control'),
  ('content.read','content','Read content'),
  ('content.manage','content','Manage content'),
  ('product.read','product','Read products'),
  ('product.manage','product','Manage products'),
  ('product.inventory.manage','product','Manage product inventory'),
  ('store.read','store','Read stores'),
  ('quotation.read','quotation','Read quotations'),
  ('quotation.write','quotation','Write quotations'),
  ('quotation.approve','quotation','Approve quotations'),
  ('quotation.archive','quotation','Archive quotations'),
  ('mockup.read','mockup','Read mockups'),
  ('mockup.write','mockup','Write mockups'),
  ('mockup.send','mockup','Send mockups'),
  ('mockup.approve','mockup','Approve mockups'),
  ('mockup.archive','mockup','Archive mockups'),
  ('order.read','order','Read orders'),
  ('order.edit','order','Edit orders'),
  ('order.archive','order','Archive orders'),
  ('order.cancel','order','Cancel orders'),
  ('payment.create','payment','Create payments'),
  ('payment.read','payment','Read payments'),
  ('payment.verify','payment','Verify payments'),
  ('payment.reject','payment','Reject payments'),
  ('payment.adjust','payment','Adjust payments'),
  ('payment.archive','payment','Archive payments'),
  ('job_order.create','production','Create job orders'),
  ('job_order.release','production','Release job orders'),
  ('job_order.edit','production','Edit job orders'),
  ('job_order.status','production','Change job-order status'),
  ('job_order.archive','production','Archive job orders'),
  ('work_item.create','production','Create work items'),
  ('work_item.assign','production','Assign work items'),
  ('work_item.update','production','Update work items'),
  ('work_item.status','production','Change work-item status'),
  ('work_item.archive','production','Archive work items'),
  ('production.view','production','Read production'),
  ('production.transition','production','Transition production'),
  ('qc.view','qc','Read QC'),
  ('qc.create','qc','Create QC'),
  ('qc.inspect','qc','Inspect QC'),
  ('qc.update','qc','Update QC'),
  ('qc.approve','qc','Approve QC'),
  ('qc.archive','qc','Archive QC'),
  ('shipping.view','fulfillment','Read fulfillment'),
  ('shipping.create','fulfillment','Create fulfillment'),
  ('shipping.update','fulfillment','Update fulfillment'),
  ('shipping.complete','fulfillment','Complete fulfillment'),
  ('shipping.archive','fulfillment','Archive fulfillment'),
  ('inventory.location.manage','inventory','Manage inventory locations'),
  ('operations.manage','operations','Manage operations'),
  ('operations.health.read','operations','Read operations health'),
  ('operations.health.manage','operations','Manage operations health'),
  ('notification.read','notification','Read notifications'),
  ('notification.manage','notification','Manage notifications'),
  ('audit.read','audit','Read audit'),
  ('refund.read','refund','Read refunds'),
  ('refund.manage','refund','Manage refunds'),
  ('permanent_delete','system','Permanently delete archived records')
on conflict (permission_key) do nothing;

create or replace function public.has_permission(p_permission_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when public.is_admin_guest() then false
    when public.is_superadmin() then true
    else coalesce((
      select rp.granted
      from public.role_permissions rp
      join public.profiles profile_row
        on profile_row.id = auth.uid()
       and profile_row.role = rp.role
      where rp.permission_key = p_permission_key
        and profile_row.account_status in ('TESTING', 'ACTIVE')
      limit 1
    ), false)
  end;
$$;

create or replace function public.normalize_order_status(p_status text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case lower(btrim(coalesce(p_status, '')))
    when 'baru' then 'under_review'
    when 'new' then 'under_review'
    when 'menunggu_pembayaran' then 'awaiting_payment'
    when 'sudah_dibayar' then 'processing'
    when 'masuk_produksi' then 'in_production'
    when 'proses_produksi' then 'in_production'
    when 'production' then 'in_production'
    when 'ready_for_production' then 'ready_for_production'
    when 'quality_check' then 'quality_control'
    when 'quality_control' then 'quality_control'
    when 'siap_diambil' then 'ready_for_pickup'
    when 'siap_dikirim' then 'ready_to_ship'
    when 'selesai' then 'completed'
    when 'dibatalkan' then 'cancelled'
    when '' then 'under_review'
    else lower(btrim(p_status))
  end;
$$;

create or replace function public.normalize_order_status_trigger()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.status := public.normalize_order_status(new.status);
  return new;
end;
$$;

create or replace function public.is_current_admin_session()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_actor_role() is not null, false);
$$;

create or replace function public.current_actor_store_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select primary_store_id
  from public.profiles
  where id = auth.uid()
    and public.is_current_admin_session();
$$;

create or replace function public.current_actor_has_all_store_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(all_store_access, false)
  from public.profiles
  where id = auth.uid()
    and public.is_current_admin_session();
$$;

create or replace function public.can_access_store(p_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_store_id is not null
    and (
      public.current_actor_has_all_store_access()
      or p_store_id = public.current_actor_store_id()
    );
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.current_actor_role() from public, anon;
revoke all on function public.is_superadmin() from public, anon;
revoke all on function public.is_admin_guest() from public, anon;
revoke all on function public.has_staff_role(text[]) from public, anon;
revoke all on function public.has_permission(text) from public, anon;
revoke all on function public.normalize_order_status(text) from public, anon, authenticated;
revoke all on function public.normalize_order_status_trigger() from public, anon, authenticated;
revoke all on function public.is_current_admin_session() from public, anon;
revoke all on function public.current_actor_store_id() from public, anon;
revoke all on function public.current_actor_has_all_store_access() from public, anon;
revoke all on function public.can_access_store(uuid) from public, anon;
grant execute on function public.current_actor_role(), public.is_superadmin(),
  public.is_admin_guest(), public.has_staff_role(text[]), public.has_permission(text),
  public.is_current_admin_session(), public.current_actor_store_id(),
  public.current_actor_has_all_store_access(), public.can_access_store(uuid)
  to authenticated, service_role;

-- Generic modern size authority. Apparel identity remains in
-- product_size_master; product_size_master.product_size_id is a one-way,
-- owner-controlled projection link and is never reverse-synchronized.
-- Color master is the canonical PIM color identity authority. It is a
-- schema-only foundation here; color rows are staging fixtures or later
-- controlled master-data operations, never baseline seed data.
create table if not exists public.product_color_master (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  color_hex text not null,
  color_group text not null default 'basic',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_sizes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sort_order integer not null default 0,
  status public.size_status not null default 'active',
  price_adjustment bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_size_master (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  size_group text not null default 'apparel',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  product_size_id uuid references public.product_sizes(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_size_master_active_idx
  on public.product_size_master(size_group, is_active, sort_order);
create index if not exists product_color_master_active_idx
  on public.product_color_master(is_active, sort_order);
create index if not exists product_sizes_status_sort_idx
  on public.product_sizes(status, sort_order);

create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  status text not null default 'active' check (status in ('active','inactive')),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.product_categories(id) on delete cascade,
  name text not null,
  slug text not null,
  description text not null default '',
  public_label text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  admin_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, slug)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  product_category_id uuid references public.product_categories(id) on update cascade,
  product_subcategory_id uuid references public.product_subcategories(id) on delete set null,
  base_price bigint not null default 0 check (base_price >= 0),
  description text,
  status public.product_status not null default 'draft',
  product_type text not null default 'standard_product',
  pricing_mode text not null default 'fixed_price',
  size_guide_id uuid,
  has_variants boolean not null default false,
  uses_configurator boolean not null default false,
  minimum_order_qty integer not null default 1,
  required_services text[] not null default '{}',
  config_schema jsonb not null default '{}'::jsonb,
  admin_notes text not null default '',
  public_description text,
  sku text,
  -- Explicit compatibility projection fields. Modern fields above remain the
  -- authority; these fields are not an independent product model.
  nama text,
  kategori text,
  deskripsi text,
  price bigint,
  harga bigint,
  status_aktif boolean not null default false,
  short_detail text,
  badge text not null default '',
  gambar_url text,
  image_url text,
  image_alt text,
  collection_tags text[] not null default '{}',
  intent_tags text[] not null default '{}',
  color_tags text[] not null default '{}',
  size_tags text[] not null default '{}',
  material_tags text[] not null default '{}',
  brand text,
  subcategory text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products
  add constraint products_product_type_check
  check (product_type in ('standard_product', 'configurable_product', 'production_service'));
alter table public.products
  add constraint products_pricing_mode_check
  check (pricing_mode in ('fixed_price', 'variant_based', 'configurator_based', 'custom_quote'));
alter table public.products
  add constraint products_minimum_order_qty_check
  check (minimum_order_qty >= 1);

create table if not exists public.product_size_guides (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  product_category_id uuid references public.product_categories(id) on delete set null,
  product_subcategory_id uuid references public.product_subcategories(id) on delete set null,
  title text not null default 'Panduan Ukuran',
  description text not null default '',
  rows jsonb not null default '[]'::jsonb,
  notes text[] not null default '{}',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products
  add constraint products_size_guide_id_fkey
  foreign key (size_guide_id) references public.product_size_guides(id) on delete set null;

create index if not exists product_subcategories_category_idx
  on public.product_subcategories(category_id, is_active, sort_order);
create index if not exists product_size_guides_product_idx
  on public.product_size_guides(product_id, is_active);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade on update cascade,
  name text not null,
  slug text not null,
  hex_code text not null default '#111111' check (hex_code ~ '^#[0-9A-Fa-f]{6}$'),
  sku text,
  sort_order integer not null default 0,
  is_default boolean not null default false,
  status public.variant_status not null default 'active',
  price_adjustment bigint not null default 0,
  variant_name text,
  color_name text,
  color_hex text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, slug)
);

create table if not exists public.product_variant_images (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete cascade on update cascade,
  image_url text not null,
  image_role public.variant_image_role not null default 'front',
  is_cover boolean not null default false,
  sort_order integer not null default 0,
  alt_text text,
  created_at timestamptz not null default now(),
  unique (variant_id, image_role)
);

create table if not exists public.product_variant_sizes (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete cascade on update cascade,
  size_id uuid references public.product_size_master(id) on update cascade,
  sku text not null,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  price_adjustment bigint not null default 0,
  status public.variant_status not null default 'active',
  size_name text,
  stock integer not null default 0 check (stock >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (variant_id, size_id)
);

create unique index if not exists product_variants_sku_unique_idx
  on public.product_variants(sku) where sku is not null;
create unique index if not exists product_variant_sizes_sku_unique_idx
  on public.product_variant_sizes(sku);
create unique index if not exists product_variants_one_default_per_product_idx
  on public.product_variants(product_id) where is_default;
create index if not exists products_category_status_idx
  on public.products(product_category_id, status);
create index if not exists product_variants_product_sort_idx
  on public.product_variants(product_id, sort_order);
create index if not exists product_variant_images_variant_sort_idx
  on public.product_variant_images(variant_id, sort_order);
create index if not exists product_variant_sizes_variant_status_idx
  on public.product_variant_sizes(variant_id, status);

create or replace function public.sync_product_compatibility_baseline()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.name := coalesce(nullif(new.name, ''), nullif(new.nama, ''), 'unnamed-product');
  new.nama := coalesce(nullif(new.nama, ''), new.name);
  new.description := coalesce(new.description, new.deskripsi);
  new.deskripsi := coalesce(new.deskripsi, new.description, '');
  new.base_price := greatest(coalesce(new.base_price, new.price, new.harga, 0), 0);
  new.price := coalesce(new.price, new.base_price);
  new.harga := coalesce(new.harga, new.base_price);
  if new.status = 'draft'::public.product_status and coalesce(new.status_aktif, false) then
    new.status := 'active'::public.product_status;
  end if;
  new.status_aktif := (new.status = 'active'::public.product_status);
  return new;
end;
$$;

create or replace function public.sync_product_category_compatibility_baseline()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'inactive' and new.is_active then
    new.status := 'active';
  end if;
  new.is_active := (new.status = 'active');
  return new;
end;
$$;

create or replace function public.sync_product_variant_compatibility_baseline()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.name := coalesce(nullif(new.name, ''), nullif(new.variant_name, ''), nullif(new.color_name, ''), 'unnamed-variant');
  new.variant_name := coalesce(nullif(new.variant_name, ''), new.name);
  new.color_name := coalesce(nullif(new.color_name, ''), new.name);
  new.slug := coalesce(nullif(new.slug, ''), trim(both '-' from regexp_replace(lower(new.name), '[^a-z0-9]+', '-', 'g')));
  new.hex_code := coalesce(nullif(new.hex_code, ''), nullif(new.color_hex, ''), '#111111');
  new.color_hex := coalesce(nullif(new.color_hex, ''), new.hex_code);
  if new.status = 'inactive'::public.variant_status and coalesce(new.is_active, false) then
    new.status := 'active'::public.variant_status;
  end if;
  new.is_active := (new.status = 'active'::public.variant_status);
  return new;
end;
$$;

create or replace function public.sync_product_variant_size_compatibility_baseline()
returns trigger
language plpgsql
set search_path = ''
as $$
declare resolved_size public.product_size_master;
begin
  if new.size_id is null and nullif(new.size_name, '') is not null then
    select * into resolved_size
    from public.product_size_master
    where lower(name) = lower(new.size_name)
    order by sort_order, id
    limit 1;
    if found then new.size_id := resolved_size.id; end if;
  elsif new.size_id is not null and nullif(new.size_name, '') is null then
    select * into resolved_size from public.product_size_master where id = new.size_id;
    if found then new.size_name := resolved_size.name; end if;
  end if;
  new.stock_quantity := greatest(coalesce(new.stock_quantity, new.stock, 0), 0);
  new.stock := new.stock_quantity;
  if new.status = 'inactive'::public.variant_status and coalesce(new.is_active, false) then
    new.status := 'active'::public.variant_status;
  end if;
  new.is_active := (new.status = 'active'::public.variant_status);
  return new;
end;
$$;

drop trigger if exists sync_products_baseline on public.products;
create trigger sync_products_baseline
before insert or update on public.products
for each row execute function public.sync_product_compatibility_baseline();
drop trigger if exists sync_product_categories_baseline on public.product_categories;
create trigger sync_product_categories_baseline
before insert or update on public.product_categories
for each row execute function public.sync_product_category_compatibility_baseline();
drop trigger if exists sync_product_variants_baseline on public.product_variants;
create trigger sync_product_variants_baseline
before insert or update on public.product_variants
for each row execute function public.sync_product_variant_compatibility_baseline();
drop trigger if exists sync_product_variant_sizes_baseline on public.product_variant_sizes;
create trigger sync_product_variant_sizes_baseline
before insert or update on public.product_variant_sizes
for each row execute function public.sync_product_variant_size_compatibility_baseline();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
drop trigger if exists set_stores_updated_at on public.stores;
create trigger set_stores_updated_at before update on public.stores
for each row execute function public.set_updated_at();
drop trigger if exists set_product_sizes_updated_at on public.product_sizes;
create trigger set_product_sizes_updated_at before update on public.product_sizes
for each row execute function public.set_updated_at();
drop trigger if exists set_product_color_master_updated_at on public.product_color_master;
create trigger set_product_color_master_updated_at before update on public.product_color_master
for each row execute function public.set_updated_at();
drop trigger if exists set_product_subcategories_updated_at on public.product_subcategories;
create trigger set_product_subcategories_updated_at before update on public.product_subcategories
for each row execute function public.set_updated_at();
drop trigger if exists set_product_size_master_updated_at on public.product_size_master;
create trigger set_product_size_master_updated_at before update on public.product_size_master
for each row execute function public.set_updated_at();
drop trigger if exists set_product_size_guides_updated_at on public.product_size_guides;
create trigger set_product_size_guides_updated_at before update on public.product_size_guides
for each row execute function public.set_updated_at();
drop trigger if exists set_product_categories_updated_at on public.product_categories;
create trigger set_product_categories_updated_at before update on public.product_categories
for each row execute function public.set_updated_at();
drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at before update on public.products
for each row execute function public.set_updated_at();
drop trigger if exists set_product_variants_updated_at on public.product_variants;
create trigger set_product_variants_updated_at before update on public.product_variants
for each row execute function public.set_updated_at();
drop trigger if exists set_product_variant_sizes_updated_at on public.product_variant_sizes;
create trigger set_product_variant_sizes_updated_at before update on public.product_variant_sizes
for each row execute function public.set_updated_at();
revoke all on function public.sync_product_compatibility_baseline() from public, anon, authenticated;
revoke all on function public.sync_product_category_compatibility_baseline() from public, anon, authenticated;
revoke all on function public.sync_product_variant_compatibility_baseline() from public, anon, authenticated;
revoke all on function public.sync_product_variant_size_compatibility_baseline() from public, anon, authenticated;

-- CMS foundations required by the first executable commerce-experience
-- migration. These are schema-only foundations: no editorial rows,
-- environment URLs, media objects, or business content are seeded here.
-- The historical CMS tables remain one shared content authority; PIM and
-- transaction data stay in their canonical domains.
create table if not exists public.page_heroes (
  id uuid primary key default gen_random_uuid(),
  page_key text not null unique,
  label text not null,
  title text not null,
  subtitle text not null,
  image_url text not null default '/images/debroder/hero/page-hero.jpg',
  image_alt text,
  mobile_image_url text,
  object_position text not null default 'center center',
  mobile_object_position text not null default 'center center',
  object_fit text not null default 'cover' check (object_fit in ('cover', 'contain')),
  focal_x numeric,
  focal_y numeric,
  primary_cta_label text not null default '',
  primary_cta_url text not null default '',
  secondary_cta_label text not null default '',
  secondary_cta_url text not null default '',
  status_aktif boolean not null default true,
  status text not null default 'draft',
  publish_at timestamptz,
  published_at timestamptz,
  archived_at timestamptz,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint page_heroes_status_check check (status in ('draft', 'scheduled', 'published', 'archived')),
  constraint page_heroes_scheduled_publish_at_check check (status <> 'scheduled' or publish_at is not null)
);

create table if not exists public.cms_banners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  media_type text not null default 'image' check (media_type in ('image', 'video')),
  desktop_media_url text not null,
  mobile_media_url text,
  poster_url text,
  eyebrow text not null default '',
  title text not null,
  subtitle text not null default '',
  cta_label text not null default '',
  cta_url text not null default '',
  text_position text not null default 'left' check (text_position in ('left', 'center', 'right')),
  experience_key text not null default 'landing' check (experience_key ~ '^[a-z0-9-]+$'),
  section_type text not null default 'wide_campaign' check (section_type in (
    'wide_campaign',
    'split_campaign',
    'poster_carousel',
    'centered_editorial_copy',
    'custom_cta',
    'team_package_campaign',
    'order_steps',
    'closing_campaign'
  )),
  section_key text not null default '',
  section_group text not null default '',
  section_heading text not null default '',
  section_description text not null default '',
  anchor_id text not null default '',
  overlay_strength numeric not null default 0.42 check (overlay_strength between 0 and 1),
  theme_variant text not null default 'dark',
  secondary_cta_label text not null default '',
  secondary_cta_url text not null default '',
  image_alt text not null default '',
  object_position text not null default 'center center',
  mobile_object_position text not null default 'center center',
  focal_x numeric,
  focal_y numeric,
  focal_zoom numeric not null default 1,
  mobile_focal_x numeric,
  mobile_focal_y numeric,
  mobile_focal_zoom numeric not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  status text not null default 'draft',
  publish_at timestamptz,
  published_at timestamptz,
  archived_at timestamptz,
  updated_by uuid references auth.users(id) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cms_banners_status_check check (status in ('draft', 'scheduled', 'published', 'archived')),
  constraint cms_banners_scheduled_publish_at_check check (status <> 'scheduled' or publish_at is not null)
);

create index if not exists page_heroes_status_publish_idx
  on public.page_heroes(status, publish_at, page_key);
create index if not exists cms_banners_order_idx
  on public.cms_banners(is_active, sort_order);
create index if not exists cms_banners_status_publish_idx
  on public.cms_banners(status, publish_at, is_active, sort_order);

drop trigger if exists set_page_heroes_updated_at on public.page_heroes;
create trigger set_page_heroes_updated_at before update on public.page_heroes
for each row execute function public.set_updated_at();
drop trigger if exists set_cms_banners_updated_at on public.cms_banners;
create trigger set_cms_banners_updated_at before update on public.cms_banners
for each row execute function public.set_updated_at();

-- Bulk/custom prerequisites. These tables are schema-only here so the
-- incremental bulk migration can add its lifecycle, policies, and approved
-- deterministic service catalog without competing table definitions.
create table if not exists public.product_price_tiers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade on update cascade,
  min_quantity integer not null check (min_quantity > 0),
  max_quantity integer check (max_quantity is null or max_quantity >= min_quantity),
  unit_price bigint check (unit_price is null or unit_price >= 0),
  quote_required boolean not null default false,
  status text not null default 'active' check (status in ('active','inactive','archived')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_minimum_rules (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade on update cascade,
  minimum_quantity integer not null default 1 check (minimum_quantity > 0),
  minimum_for_tier_quantity integer check (minimum_for_tier_quantity is null or minimum_for_tier_quantity > 0),
  quotation_quantity integer check (quotation_quantity is null or quotation_quantity > 0),
  status text not null default 'active' check (status in ('active','inactive','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id)
);

create table if not exists public.custom_services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  status public.custom_service_status not null default 'active',
  pricing_type public.service_pricing_type not null default 'fixed_per_item',
  base_price bigint not null default 0 check (base_price >= 0),
  estimated_min_price bigint check (estimated_min_price is null or estimated_min_price >= 0),
  estimated_max_price bigint check (estimated_max_price is null or estimated_max_price >= 0),
  minimum_quantity integer not null default 1 check (minimum_quantity > 0),
  maximum_quantity integer check (maximum_quantity is null or maximum_quantity > 0),
  requires_review boolean not null default false,
  requires_upload boolean not null default false,
  requires_notes boolean not null default false,
  allowed_file_types text[] not null default array['png','jpg','jpeg','pdf','svg','ai','eps','zip'],
  is_stackable boolean not null default true,
  exclusive_group text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_pricing_rules (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.custom_services(id) on delete cascade,
  min_quantity integer not null default 1 check (min_quantity > 0),
  max_quantity integer check (max_quantity is null or max_quantity >= min_quantity),
  unit_price bigint check (unit_price is null or unit_price >= 0),
  flat_price bigint check (flat_price is null or flat_price >= 0),
  quote_required boolean not null default false,
  status text not null default 'active' check (status in ('active','inactive','archived')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_uploads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  session_token text not null,
  bucket_id text not null default 'customer-designs',
  storage_path text not null unique,
  original_filename text not null,
  sanitized_filename text not null,
  mime_type text not null,
  extension text not null,
  size_bytes bigint not null check (size_bytes > 0),
  status public.upload_status not null default 'uploaded',
  linked_configuration_id uuid,
  linked_item_key text,
  linked_service_id uuid references public.custom_services(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saved_configurations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null on update cascade,
  owner_id uuid references auth.users(id) on delete set null,
  session_token text not null,
  share_token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  share_expires_at timestamptz,
  is_shareable boolean not null default true,
  version integer not null default 1,
  status text not null default 'draft' check (status in ('draft','submitted','archived')),
  configuration_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.configuration_item_services (
  id uuid primary key default gen_random_uuid(),
  saved_configuration_id uuid references public.saved_configurations(id) on delete cascade,
  item_key text not null,
  service_id uuid not null references public.custom_services(id) on update cascade,
  quantity integer not null check (quantity > 0),
  option_values jsonb not null default '{}'::jsonb,
  fixed_price bigint check (fixed_price is null or fixed_price >= 0),
  estimated_price bigint check (estimated_price is null or estimated_price >= 0),
  status text not null default 'active' check (status in ('active','inactive','requires_review')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quotation_drafts (
  id uuid primary key default gen_random_uuid(),
  quotation_number text not null unique default ('DBQ-' || upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 10))),
  product_id uuid references public.products(id) on delete set null on update cascade,
  owner_id uuid references auth.users(id) on delete set null,
  session_token text not null,
  contact_name text,
  contact_whatsapp text,
  contact_email text,
  general_note text,
  status public.quotation_status not null default 'draft',
  total_quantity integer not null default 0 check (total_quantity >= 0),
  final_total bigint not null default 0 check (final_total >= 0),
  estimated_total bigint not null default 0 check (estimated_total >= 0),
  requires_review boolean not null default false,
  configuration_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quotation_draft_items (
  id uuid primary key default gen_random_uuid(),
  quotation_draft_id uuid not null references public.quotation_drafts(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null on update cascade,
  product_variant_id uuid references public.product_variants(id) on delete set null on update cascade,
  product_variant_size_id uuid references public.product_variant_sizes(id) on delete set null on update cascade,
  snapshot jsonb not null,
  quantity integer not null check (quantity > 0),
  unit_price bigint,
  tier_snapshot jsonb,
  service_snapshot jsonb not null default '[]'::jsonb,
  file_snapshot jsonb not null default '[]'::jsonb,
  item_note text,
  final_total bigint not null default 0 check (final_total >= 0),
  estimated_total bigint not null default 0 check (estimated_total >= 0),
  requires_review boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists product_price_tiers_product_status_idx
  on public.product_price_tiers(product_id, status, min_quantity);
create index if not exists product_minimum_rules_product_status_idx
  on public.product_minimum_rules(product_id, status);
create index if not exists custom_services_status_sort_idx
  on public.custom_services(status, sort_order);
create index if not exists service_pricing_rules_service_status_idx
  on public.service_pricing_rules(service_id, status, min_quantity);
create index if not exists customer_uploads_owner_idx
  on public.customer_uploads(owner_id, session_token, status);
create index if not exists saved_configurations_share_idx
  on public.saved_configurations(share_token, is_shareable, share_expires_at);
create index if not exists quotation_drafts_session_status_idx
  on public.quotation_drafts(session_token, status, created_at desc);

create table if not exists public.quotation_number_sequences (
  year integer primary key,
  last_value integer not null default 0 check (last_value >= 0),
  updated_at timestamptz not null default now()
);

create or replace function public.next_quotation_number()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_year integer := extract(year from timezone('Asia/Makassar', now()))::integer;
  next_value integer;
begin
  insert into public.quotation_number_sequences(year, last_value)
  values (current_year, 1)
  on conflict (year) do update
    set last_value = public.quotation_number_sequences.last_value + 1,
        updated_at = now()
  returning last_value into next_value;
  return format('QTN-DEB-%s-%s', current_year, lpad(next_value::text, 4, '0'));
end;
$$;

revoke all on function public.next_quotation_number() from public, anon, authenticated;
grant execute on function public.next_quotation_number() to service_role;

create table if not exists public.quotations (
  id uuid primary key default gen_random_uuid(),
  quotation_number text not null unique default public.next_quotation_number(),
  source_draft_id uuid references public.quotation_drafts(id) on update cascade on delete set null,
  customer_id uuid,
  customer_name text not null,
  company_name text,
  customer_email text,
  customer_phone text not null,
  billing_address text,
  shipping_address text,
  po_number text,
  status text not null default 'draft' check (status in (
    'draft','submitted','under_review','reviewing','pricing','sent','quoted',
    'revision_requested','approved','rejected','expired','cancelled','converted_to_order'
  )),
  currency text not null default 'IDR' check (currency = 'IDR'),
  valid_until timestamptz,
  public_notes text,
  internal_notes text,
  product_subtotal bigint not null default 0,
  service_subtotal bigint not null default 0,
  additional_cost bigint not null default 0,
  discount_total bigint not null default 0,
  confirmed_total bigint,
  estimated_total bigint,
  has_pending_pricing boolean not null default false,
  current_version integer not null default 1,
  latest_version_id uuid,
  sent_version_id uuid,
  approved_version_id uuid,
  repeated_from_order_id uuid,
  repeat_reason text,
  repeat_idempotency_key text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  submitted_at timestamptz,
  sent_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  expired_at timestamptz,
  converted_at timestamptz,
  archived_at timestamptz,
  archived_by uuid references auth.users(id) on delete set null,
  archive_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quotations_money_nonnegative check (
    product_subtotal >= 0 and service_subtotal >= 0 and additional_cost >= 0 and discount_total >= 0
    and (confirmed_total is null or confirmed_total >= 0)
    and (estimated_total is null or estimated_total >= 0)
  ),
  constraint quotations_customer_name_not_blank check (btrim(customer_name) <> ''),
  constraint quotations_customer_phone_not_blank check (btrim(customer_phone) <> '')
);

create table if not exists public.quotation_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(id) on update cascade on delete cascade,
  product_id uuid references public.products(id) on update cascade on delete set null,
  product_variant_id uuid references public.product_variants(id) on update cascade on delete set null,
  product_variant_size_id uuid references public.product_variant_sizes(id) on update cascade on delete set null,
  product_name_snapshot text not null,
  product_slug_snapshot text,
  variant_name_snapshot text,
  color_name_snapshot text,
  color_hex_snapshot text,
  size_name_snapshot text,
  sku_snapshot text,
  quantity integer not null check (quantity > 0),
  base_price_snapshot bigint,
  tier_price_snapshot bigint,
  variant_adjustment_snapshot bigint not null default 0,
  size_adjustment_snapshot bigint not null default 0,
  unit_price bigint,
  pricing_status text not null default 'pending' check (pricing_status in ('confirmed','estimated','pending')),
  subtotal bigint,
  customer_notes text,
  production_notes text,
  sort_order integer not null default 0,
  archived_at timestamptz,
  archived_by uuid references auth.users(id) on delete set null,
  archive_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quotation_item_services (
  id uuid primary key default gen_random_uuid(),
  quotation_item_id uuid not null references public.quotation_items(id) on update cascade on delete cascade,
  custom_service_id uuid references public.custom_services(id) on update cascade on delete set null,
  service_name_snapshot text not null,
  quantity integer not null check (quantity > 0),
  position text,
  pricing_status text not null default 'pending' check (pricing_status in ('confirmed','estimated','pending')),
  unit_price bigint,
  flat_price bigint,
  subtotal bigint,
  notes text,
  sort_order integer not null default 0,
  archived_at timestamptz,
  archived_by uuid references auth.users(id) on delete set null,
  archive_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quotation_status_history (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(id) on update cascade on delete cascade,
  from_status text,
  to_status text not null,
  note text,
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.quotation_versions (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(id) on update cascade on delete cascade,
  version_number integer not null check (version_number > 0),
  version_status text not null default 'draft' check (version_status in ('draft','sent','revision_requested','approved','rejected','expired','superseded')),
  snapshot jsonb not null,
  change_note text,
  created_by uuid references public.profiles(id) on update cascade on delete set null,
  sent_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (quotation_id, version_number)
);

alter table public.quotations
  add constraint quotations_latest_version_id_fkey
  foreign key (latest_version_id) references public.quotation_versions(id) on update cascade on delete set null;
alter table public.quotations
  add constraint quotations_sent_version_id_fkey
  foreign key (sent_version_id) references public.quotation_versions(id) on update cascade on delete set null;
alter table public.quotations
  add constraint quotations_approved_version_id_fkey
  foreign key (approved_version_id) references public.quotation_versions(id) on update cascade on delete set null;

create index if not exists quotations_status_idx on public.quotations(status);
create index if not exists quotations_created_at_idx on public.quotations(created_at desc);
create index if not exists quotation_items_quotation_id_idx on public.quotation_items(quotation_id, sort_order);
create index if not exists quotation_items_product_id_idx on public.quotation_items(product_id);
create index if not exists quotation_item_services_item_id_idx on public.quotation_item_services(quotation_item_id, sort_order);
create index if not exists quotation_status_history_quotation_id_idx on public.quotation_status_history(quotation_id, created_at desc);
create index if not exists quotation_versions_quotation_idx on public.quotation_versions(quotation_id, version_number desc);
create unique index if not exists quotations_repeat_idempotency_idx
  on public.quotations(repeat_idempotency_key) where repeat_idempotency_key is not null;

create trigger quotations_set_updated_at before update on public.quotations
for each row execute function public.set_updated_at();
create trigger quotation_items_set_updated_at before update on public.quotation_items
for each row execute function public.set_updated_at();
create trigger quotation_item_services_set_updated_at before update on public.quotation_item_services
for each row execute function public.set_updated_at();

create or replace function public.build_quotation_snapshot(p_quotation_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when not public.has_permission('quotation.read') then null
    else jsonb_build_object(
      'quotation', to_jsonb(q) - 'latest_version_id' - 'sent_version_id' - 'approved_version_id',
      'items', coalesce((
        select jsonb_agg(
          (to_jsonb(qi) - 'archived_by' - 'archive_reason') ||
          jsonb_build_object(
            'services', coalesce((
              select jsonb_agg(to_jsonb(qis) - 'archived_by' - 'archive_reason' order by qis.sort_order, qis.created_at)
              from public.quotation_item_services qis
              where qis.quotation_item_id = qi.id and qis.archived_at is null
            ), '[]'::jsonb)
          ) order by qi.sort_order, qi.created_at
        )
        from public.quotation_items qi
        where qi.quotation_id = q.id and qi.archived_at is null
      ), '[]'::jsonb)
    )
  end
  from public.quotations q
  where q.id = p_quotation_id and q.archived_at is null;
$$;

revoke all on function public.build_quotation_snapshot(uuid) from public, anon, authenticated, service_role;

-- Mockup and token-bound approval foundations. Public callers receive only
-- token-scoped RPC results; the underlying tables are never granted to anon.
create table if not exists public.mockup_sets (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(id) on delete cascade,
  title text not null default 'Mockup Desain',
  status text not null default 'draft' check (status in ('draft','preparing','ready_for_review','awaiting_customer','revision_requested','approved')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  archived_at timestamptz,
  archived_by uuid references auth.users(id) on delete set null,
  archive_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mockup_parts (
  id uuid primary key default gen_random_uuid(),
  mockup_set_id uuid not null references public.mockup_sets(id) on delete cascade,
  quotation_item_id uuid references public.quotation_items(id) on delete set null,
  name text not null,
  position text,
  is_required boolean not null default true,
  status text not null default 'draft' check (status in ('draft','preparing','ready_for_review','awaiting_customer','revision_requested','approved')),
  admin_notes text,
  customer_notes text,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  archived_at timestamptz,
  archived_by uuid references auth.users(id) on delete set null,
  archive_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mockup_files (
  id uuid primary key default gen_random_uuid(),
  mockup_part_id uuid not null references public.mockup_parts(id) on delete cascade,
  version_number integer not null,
  bucket_id text not null default 'customer-designs',
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  notes text,
  is_current boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (mockup_part_id, version_number),
  unique (bucket_id, storage_path)
);

create table if not exists public.mockup_approval_history (
  id uuid primary key default gen_random_uuid(),
  mockup_set_id uuid not null references public.mockup_sets(id) on delete cascade,
  mockup_part_id uuid references public.mockup_parts(id) on delete cascade,
  action text not null,
  from_status text,
  to_status text,
  note text,
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.mockup_review_links (
  id uuid primary key default gen_random_uuid(),
  mockup_set_id uuid not null references public.mockup_sets(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  last_opened_at timestamptz,
  unique (mockup_set_id, token_hash)
);

create index if not exists mockup_sets_quotation_idx on public.mockup_sets(quotation_id);
create index if not exists mockup_parts_set_idx on public.mockup_parts(mockup_set_id);
create index if not exists mockup_files_part_idx on public.mockup_files(mockup_part_id, version_number desc);
create unique index if not exists mockup_files_one_current_idx
  on public.mockup_files(mockup_part_id) where is_current;
create index if not exists mockup_review_links_active_idx
  on public.mockup_review_links(mockup_set_id, expires_at) where revoked_at is null;

create or replace function public.ensure_mockup_set_approved_quotation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare q_status text; q_archived timestamptz;
begin
  select status, archived_at into q_status, q_archived
  from public.quotations where id = new.quotation_id;
  if q_status is null then raise exception 'Quotation not found'; end if;
  if q_archived is not null then raise exception 'Archived quotation cannot receive mockup'; end if;
  if q_status <> 'approved' then raise exception 'Quotation must be approved before creating mockup'; end if;
  if not public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']) then
    raise exception 'Not authorized to create mockup';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_mockup_set_requires_approved_quotation on public.mockup_sets;
create trigger trg_mockup_set_requires_approved_quotation
before insert on public.mockup_sets
for each row execute function public.ensure_mockup_set_approved_quotation();

create or replace function public.create_mockup_review_link(
  p_mockup_set_id uuid,
  p_expires_in_days integer default 7
)
returns table(token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare raw_token text; expiry timestamptz; current_status text;
begin
  if not public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']) then
    raise exception 'Not authorized to create mockup review link';
  end if;
  if p_expires_in_days < 1 or p_expires_in_days > 30 then
    raise exception 'Review link expiry must be between 1 and 30 days';
  end if;
  select status into current_status from public.mockup_sets
  where id = p_mockup_set_id and archived_at is null for update;
  if current_status is null then raise exception 'Active mockup not found'; end if;
  if current_status <> 'ready_for_review' then raise exception 'Mockup must be ready for review before sending'; end if;
  raw_token := encode(extensions.gen_random_bytes(32), 'hex');
  expiry := now() + make_interval(days => p_expires_in_days);
  update public.mockup_review_links set revoked_at = now()
  where mockup_set_id = p_mockup_set_id and revoked_at is null;
  insert into public.mockup_review_links(mockup_set_id, token_hash, expires_at, created_by)
  values(p_mockup_set_id, encode(extensions.digest(raw_token, 'sha256'), 'hex'), expiry, auth.uid());
  update public.mockup_sets set status = 'awaiting_customer', updated_by = auth.uid()
  where id = p_mockup_set_id;
  return query select raw_token, expiry;
end;
$$;

create or replace function public.get_public_mockup_review(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare link_row public.mockup_review_links; set_row public.mockup_sets; q public.quotations;
begin
  select * into link_row from public.mockup_review_links
  where token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
    and revoked_at is null and expires_at > now();
  if not found then raise exception 'Review link is invalid or expired'; end if;
  update public.mockup_review_links set last_opened_at = now() where id = link_row.id;
  select * into set_row from public.mockup_sets where id = link_row.mockup_set_id and archived_at is null;
  if not found then raise exception 'Mockup not found'; end if;
  select * into q from public.quotations where id = set_row.quotation_id and archived_at is null;
  if not found then raise exception 'Quotation not found'; end if;
  return jsonb_build_object(
    'mockup_set', jsonb_build_object('id', set_row.id, 'title', set_row.title, 'status', set_row.status, 'notes', set_row.notes, 'expires_at', link_row.expires_at),
    'quotation', jsonb_build_object('quotation_number', q.quotation_number, 'customer_name', q.customer_name, 'company_name', q.company_name),
    'parts', coalesce((select jsonb_agg(to_jsonb(mp) order by mp.sort_order, mp.created_at) from public.mockup_parts mp where mp.mockup_set_id = set_row.id and mp.archived_at is null), '[]'::jsonb)
  );
end;
$$;

create or replace function public.submit_mockup_part_decision(
  p_token text,
  p_mockup_part_id uuid,
  p_decision text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  link_row public.mockup_review_links;
  part_row public.mockup_parts;
  set_status text;
  all_required_approved boolean;
begin
  if p_decision not in ('approved', 'revision_requested') then
    raise exception 'Invalid mockup decision';
  end if;

  if p_decision = 'revision_requested'
     and nullif(btrim(coalesce(p_note, '')), '') is null then
    raise exception 'Revision note is required';
  end if;

  select * into link_row
  from public.mockup_review_links
  where token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
    and revoked_at is null
    and expires_at > now();

  if not found then
    raise exception 'Review link is invalid or expired';
  end if;

  select mp.* into part_row
  from public.mockup_parts mp
  where mp.id = p_mockup_part_id
    and mp.mockup_set_id = link_row.mockup_set_id
    and mp.archived_at is null
  for update;

  if not found then
    raise exception 'Mockup part not found';
  end if;

  if part_row.status not in ('awaiting_customer', 'revision_requested') then
    raise exception 'Mockup part is not awaiting customer decision';
  end if;

  update public.mockup_parts
  set status = p_decision,
      customer_notes = nullif(btrim(coalesce(p_note, '')), ''),
      updated_at = now()
  where id = part_row.id;

  insert into public.mockup_approval_history(
    mockup_set_id, mockup_part_id, action, from_status, to_status, note, changed_by
  )
  values(
    link_row.mockup_set_id,
    part_row.id,
    'customer_decision',
    part_row.status,
    p_decision,
    nullif(btrim(coalesce(p_note, '')), ''),
    null
  );

  select not exists(
    select 1
    from public.mockup_parts
    where mockup_set_id = link_row.mockup_set_id
      and archived_at is null
      and is_required
      and status <> 'approved'
  ) into all_required_approved;

  if p_decision = 'revision_requested' then
    set_status := 'revision_requested';
  elsif all_required_approved then
    set_status := 'approved';
  else
    set_status := 'awaiting_customer';
  end if;

  update public.mockup_sets
  set status = set_status,
      updated_at = now()
  where id = link_row.mockup_set_id;

  if set_status = 'approved' then
    update public.mockup_review_links
    set revoked_at = now()
    where id = link_row.id;

    insert into public.mockup_approval_history(
      mockup_set_id, action, from_status, to_status, note, changed_by
    )
    values(
      link_row.mockup_set_id,
      'all_required_parts_approved',
      'awaiting_customer',
      'approved',
      'Semua bagian wajib disetujui pelanggan',
      null
    );
  end if;

  return jsonb_build_object(
    'part_id', part_row.id,
    'part_status', p_decision,
    'mockup_status', set_status,
    'all_required_approved', all_required_approved
  );
end;
$$;

revoke all on function public.ensure_mockup_set_approved_quotation() from public, anon, authenticated;
revoke all on function public.create_mockup_review_link(uuid, integer) from public, anon;
revoke all on function public.get_public_mockup_review(text) from public, authenticated;
revoke all on function public.submit_mockup_part_decision(text, uuid, text, text) from public, authenticated;
grant execute on function public.create_mockup_review_link(uuid, integer) to authenticated;
grant execute on function public.get_public_mockup_review(text) to anon, authenticated;
grant execute on function public.submit_mockup_part_decision(text, uuid, text, text) to anon, authenticated;

-- Canonical order aggregate. Historical Indonesian writes are normalized by
-- one trigger boundary before constraints and downstream readers see them.
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  public_idempotency_key text,
  public_access_token_hash text,
  customer_user_id uuid references auth.users(id) on delete set null,
  customer_id uuid,
  customer_name text not null,
  company_name text,
  customer_phone text not null,
  customer_email text,
  billing_address text,
  shipping_address text,
  status text not null default 'under_review',
  total_amount bigint not null default 0 check (total_amount >= 0),
  subtotal_amount bigint not null default 0 check (subtotal_amount >= 0),
  shipping_cost bigint,
  shipping_courier text,
  shipping_service text,
  shipping_estimate text,
  shipping_quoted_at timestamptz,
  discount_amount bigint not null default 0,
  tax_amount bigint not null default 0,
  admin_notes text not null default '',
  customer_notes text not null default '',
  delivery_method text not null default 'pickup' check (delivery_method in ('pickup','shipping','delivery')),
  fulfillment_method text not null default 'shipping' check (fulfillment_method in ('pickup','shipping','delivery')),
  checkout_source text not null default 'admin' check (checkout_source in ('admin','quotation','public_checkout','repeat_order')),
  payment_method text not null default 'bank_transfer' check (payment_method in ('bank_transfer','pay_at_store','cash','qris','ewallet','other')),
  currency text not null default 'IDR' check (currency = 'IDR'),
  payment_status text not null default 'unpaid',
  payment_proof_path text,
  payment_submitted_at timestamptz,
  payment_total_verified bigint not null default 0,
  payment_balance bigint not null default 0,
  payment_percentage numeric(5,2) not null default 0,
  payment_requirement_met boolean not null default false,
  payment_requirement_type text not null default 'full',
  payment_required_percentage numeric(5,2) not null default 100,
  payment_required_amount bigint,
  payment_requirement_override_reason text,
  payment_requirement_overridden_by uuid references auth.users(id) on delete set null,
  payment_requirement_overridden_at timestamptz,
  payment_effective_total bigint not null default 0,
  payment_production_eligible boolean not null default false,
  quotation_id uuid references public.quotations(id) on delete set null,
  approved_mockup_set_id uuid references public.mockup_sets(id) on delete set null,
  custom_quote_status text,
  custom_quote_version integer,
  custom_quote_locked_at timestamptz,
  custom_quote_locked_total bigint,
  custom_project_snapshot jsonb not null default '[]'::jsonb,
  source_snapshot jsonb not null default '{}'::jsonb,
  pricing_status text not null default 'final',
  pickup_location_id uuid references public.stores(id) on delete set null,
  reservation_expires_at timestamptz,
  whatsapp_confirmation_hash text,
  whatsapp_confirmation_expires_at timestamptz,
  whatsapp_confirmed_at timestamptz,
  whatsapp_confirmed_by uuid references auth.users(id) on delete set null,
  whatsapp_confirmation_attempts integer not null default 0,
  final_total_approved_at timestamptz,
  idempotency_key text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  archived_at timestamptz,
  archived_by uuid references auth.users(id) on delete set null,
  archive_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_payment_requirement_baseline_check check (
    payment_requirement_type in ('full','percentage','fixed','deposit')
    and payment_required_percentage between 0 and 100
    and (payment_required_amount is null or payment_required_amount >= 0)
  ),
  constraint orders_payment_status_baseline_check check (
    payment_status in ('unpaid','pending_verification','partially_paid','paid','rejected','expired','refunded')
  ),
  constraint orders_status_baseline_check check (
    status in ('under_review','awaiting_payment','processing','awaiting_customer_approval',
      'awaiting_shipping_quote','confirmed','ready_for_production','in_production',
      'quality_control','ready_for_pickup','ready_to_ship','shipped','picked_up',
      'completed','cancelled','expired','pending_confirmation','new')
  )
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  variant_size_id uuid references public.product_variant_sizes(id) on delete set null,
  product_name text not null,
  product_type text not null default 'standard_product',
  variant_name text not null default '',
  sku text,
  quantity integer not null default 1 check (quantity > 0),
  unit_price bigint not null default 0,
  subtotal bigint not null default 0,
  color text not null default '',
  size text not null default '',
  notes text not null default '',
  config_snapshot jsonb not null default '{}'::jsonb,
  required_services jsonb not null default '[]'::jsonb,
  estimated_total numeric,
  snapshot jsonb not null default '{}'::jsonb,
  archived_at timestamptz,
  archived_by uuid references auth.users(id) on delete set null,
  archive_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_items_product_type_baseline_check check (
    product_type in ('standard_product', 'configurable_product', 'production_service')
  ),
  constraint order_items_config_snapshot_object_check check (
    jsonb_typeof(config_snapshot) = 'object'
  ),
  constraint order_items_required_services_array_check check (
    jsonb_typeof(required_services) = 'array'
  )
);

create table if not exists public.order_item_services (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  custom_service_id uuid references public.custom_services(id) on delete set null,
  service_name text not null,
  quantity integer not null default 1 check (quantity > 0),
  position text,
  notes text,
  unit_price bigint not null default 0,
  subtotal bigint not null default 0,
  snapshot jsonb not null default '{}'::jsonb,
  archived_at timestamptz,
  archived_by uuid references auth.users(id) on delete set null,
  archive_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  from_status text,
  to_status text not null,
  note text not null default '',
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint order_status_history_canonical_check check (
    to_status in ('under_review','awaiting_payment','processing','awaiting_customer_approval',
      'awaiting_shipping_quote','confirmed','ready_for_production','in_production',
      'quality_control','ready_for_pickup','ready_to_ship','shipped','picked_up',
      'completed','cancelled','expired','pending_confirmation','new')
  )
);

create or replace function public.normalize_payment_status(p_status text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case lower(btrim(coalesce(p_status, '')))
    when 'belum_bayar' then 'unpaid'
    when 'menunggu_verifikasi' then 'pending_verification'
    when 'terverifikasi' then 'paid'
    when 'verified' then 'paid'
    when 'ditolak' then 'rejected'
    when '' then 'unpaid'
    else lower(btrim(p_status))
  end;
$$;

create or replace function public.normalize_order_write_baseline()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.status := public.normalize_order_status(new.status);
  new.payment_status := public.normalize_payment_status(new.payment_status);
  return new;
end;
$$;

create or replace function public.normalize_order_history_write_baseline()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.from_status := case when new.from_status is null then null else public.normalize_order_status(new.from_status) end;
  new.to_status := public.normalize_order_status(new.to_status);
  return new;
end;
$$;

drop trigger if exists normalize_order_write_baseline on public.orders;
create trigger normalize_order_write_baseline before insert or update on public.orders
for each row execute function public.normalize_order_write_baseline();
drop trigger if exists normalize_order_history_write_baseline on public.order_status_history;
create trigger normalize_order_history_write_baseline before insert or update on public.order_status_history
for each row execute function public.normalize_order_history_write_baseline();

create index if not exists orders_public_idempotency_unique
  on public.orders(public_idempotency_key) where public_idempotency_key is not null;
create unique index if not exists orders_public_access_token_unique
  on public.orders(public_access_token_hash) where public_access_token_hash is not null;
create index if not exists orders_customer_user_created_idx
  on public.orders(customer_user_id, created_at desc) where customer_user_id is not null and archived_at is null;
create index if not exists orders_status_created_idx on public.orders(status, created_at desc);
create index if not exists order_items_order_idx on public.order_items(order_id, created_at);
create index if not exists order_item_services_item_idx on public.order_item_services(order_item_id, created_at);
create index if not exists order_status_history_order_idx on public.order_status_history(order_id, created_at desc);

create trigger orders_set_updated_at before update on public.orders
for each row execute function public.set_updated_at();
create trigger order_items_set_updated_at before update on public.order_items
for each row execute function public.set_updated_at();
create trigger order_item_services_set_updated_at before update on public.order_item_services
for each row execute function public.set_updated_at();

revoke all on function public.normalize_payment_status(text) from public, anon, authenticated;
revoke all on function public.normalize_order_write_baseline() from public, anon, authenticated;
revoke all on function public.normalize_order_history_write_baseline() from public, anon, authenticated;

alter table public.quotations
  add constraint quotations_repeated_from_order_fk
  foreign key (repeated_from_order_id) references public.orders(id) on delete set null;

-- Payment foundation. This is the authoritative payment aggregate; later
-- phase 5B and commerce migrations add completion, adjustment, and public
-- submission semantics.
create table if not exists public.payment_number_sequences (
  year integer primary key,
  last_number integer not null default 0,
  updated_at timestamptz not null default now()
);

create or replace function public.next_payment_number()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare y integer := extract(year from timezone('Asia/Makassar', now()))::integer; n integer;
begin
  insert into public.payment_number_sequences(year, last_number)
  values(y, 1)
  on conflict(year) do update
    set last_number = public.payment_number_sequences.last_number + 1,
        updated_at = now()
  returning last_number into n;
  return format('PAY-DEB-%s-%s', y, lpad(n::text, 4, '0'));
end;
$$;

create table if not exists public.order_payments (
  id uuid primary key default gen_random_uuid(),
  payment_number text not null unique default public.next_payment_number(),
  order_id uuid not null references public.orders(id) on delete cascade,
  amount bigint not null check (amount > 0),
  paid_at timestamptz not null default now(),
  method text not null check (method in ('bank_transfer','cash','qris','ewallet','other')),
  channel_name text,
  reference_number text,
  status text not null default 'pending' check (status in ('draft','pending','verified','rejected','refunded')),
  customer_notes text,
  admin_notes text,
  proof_bucket text,
  proof_path text,
  proof_file_name text,
  proof_mime_type text,
  proof_size_bytes bigint,
  submitted_at timestamptz,
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  rejected_at timestamptz,
  rejected_by uuid references auth.users(id) on delete set null,
  rejection_reason text,
  archived_at timestamptz,
  archived_by uuid references auth.users(id) on delete set null,
  archive_reason text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists order_payments_order_id_idx on public.order_payments(order_id);
create index if not exists order_payments_status_idx on public.order_payments(status);
create index if not exists order_payments_archived_at_idx on public.order_payments(archived_at);
create trigger order_payments_set_updated_at before update on public.order_payments
for each row execute function public.set_updated_at();

create or replace function public.refresh_order_payment_summary(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare result_row public.orders; total_verified bigint;
begin
  if auth.uid() is not null and not public.has_permission('payment.verify') then
    raise exception 'Not authorized';
  end if;
  select coalesce(sum(amount), 0)::bigint into total_verified
  from public.order_payments
  where order_id = p_order_id and status = 'verified' and archived_at is null;
  update public.orders
  set payment_total_verified = total_verified,
      payment_balance = greatest(total_amount - total_verified, 0),
      payment_percentage = case when total_amount > 0 then least(100, round((total_verified::numeric / total_amount::numeric) * 100, 2)) else 0 end,
      payment_requirement_met = total_verified >= coalesce(payment_required_amount, total_amount),
      payment_effective_total = total_verified,
      payment_production_eligible = total_verified >= coalesce(payment_required_amount, total_amount),
      payment_status = case when total_verified <= 0 then 'unpaid' when total_verified < total_amount then 'partially_paid' else 'paid' end,
      updated_at = now()
  where id = p_order_id
  returning * into result_row;
  if not found then raise exception 'Order not found'; end if;
  return result_row;
end;
$$;

create or replace function public.create_order_payment(
  p_order_id uuid,
  p_amount bigint,
  p_paid_at timestamptz,
  p_method text,
  p_channel_name text default null,
  p_reference_number text default null,
  p_customer_notes text default null,
  p_admin_notes text default null,
  p_proof_bucket text default null,
  p_proof_path text default null,
  p_proof_file_name text default null,
  p_proof_mime_type text default null,
  p_proof_size_bytes bigint default null
)
returns public.order_payments
language plpgsql
security definer
set search_path = ''
as $$
declare result_row public.order_payments;
begin
  if not public.has_permission('payment.create') then raise exception 'Not authorized'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Amount must be greater than zero'; end if;
  if p_method not in ('bank_transfer','cash','qris','ewallet','other') then raise exception 'Invalid payment method'; end if;
  insert into public.order_payments(order_id, amount, paid_at, method, channel_name, reference_number,
    status, customer_notes, admin_notes, proof_bucket, proof_path, proof_file_name,
    proof_mime_type, proof_size_bytes, submitted_at, created_by, updated_by)
  values(p_order_id, p_amount, coalesce(p_paid_at, now()), p_method,
    nullif(btrim(coalesce(p_channel_name, '')), ''), nullif(btrim(coalesce(p_reference_number, '')), ''),
    'pending', nullif(btrim(coalesce(p_customer_notes, '')), ''), nullif(btrim(coalesce(p_admin_notes, '')), ''),
    p_proof_bucket, p_proof_path, p_proof_file_name, p_proof_mime_type, p_proof_size_bytes,
    now(), auth.uid(), auth.uid())
  returning * into result_row;
  update public.orders set payment_status = 'pending_verification', payment_submitted_at = now() where id = p_order_id;
  return result_row;
end;
$$;

revoke all on function public.next_payment_number() from public, anon, authenticated;
revoke all on function public.refresh_order_payment_summary(uuid) from public, anon;
revoke all on function public.create_order_payment(uuid,bigint,timestamptz,text,text,text,text,text,text,text,text,text,bigint) from public, anon;
grant execute on function public.refresh_order_payment_summary(uuid), public.create_order_payment(uuid,bigint,timestamptz,text,text,text,text,text,text,text,text,text,bigint) to authenticated;

-- Production table prerequisites. The active production migration remains in
-- the replay for its functions and lifecycle controls; its CREATE TABLE IF
-- NOT EXISTS blocks become no-ops against these verified roots.
create table if not exists public.job_orders (
  id uuid primary key default gen_random_uuid(),
  job_order_number text unique,
  order_id uuid not null references public.orders(id) on delete restrict,
  quotation_id uuid references public.quotations(id) on delete restrict,
  approved_mockup_set_id uuid references public.mockup_sets(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft','ready','released','in_progress','on_hold','completed','cancelled')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  target_date date,
  internal_notes text,
  production_notes text,
  order_snapshot jsonb not null default '{}'::jsonb,
  mockup_snapshot jsonb not null default '{}'::jsonb,
  payment_snapshot jsonb not null default '{}'::jsonb,
  released_by uuid references auth.users(id) on delete set null,
  released_at timestamptz,
  started_at timestamptz,
  paused_at timestamptz,
  resumed_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  progress_percentage numeric(5,2) not null default 0 check (progress_percentage between 0 and 100),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  archived_by uuid references auth.users(id) on delete set null,
  archive_reason text
);

create table if not exists public.job_order_status_history (
  id uuid primary key default gen_random_uuid(),
  job_order_id uuid not null references public.job_orders(id) on delete cascade,
  from_status text,
  to_status text not null,
  note text,
  reason text,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.job_order_revisions (
  id uuid primary key default gen_random_uuid(),
  job_order_id uuid not null references public.job_orders(id) on delete restrict,
  revision_number integer not null,
  reason text not null,
  previous_snapshot jsonb not null,
  new_snapshot jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(job_order_id, revision_number)
);

create table if not exists public.work_items (
  id uuid primary key default gen_random_uuid(),
  work_item_number text unique,
  job_order_id uuid not null references public.job_orders(id) on delete restrict,
  source_order_item_id uuid references public.order_items(id) on delete restrict,
  source_order_item_service_id uuid references public.order_item_services(id) on delete restrict,
  source_mockup_part_id uuid references public.mockup_parts(id) on delete restrict,
  title text not null,
  description text,
  quantity integer not null default 1 check (quantity > 0),
  unit text not null default 'pcs',
  assigned_to uuid references auth.users(id) on delete set null,
  target_date date,
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  status text not null default 'draft' check (status in ('draft','ready','in_progress','on_hold','awaiting_qc','rework','completed','cancelled')),
  instruction_snapshot jsonb not null default '{}'::jsonb,
  approved_design_snapshot jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  paused_at timestamptz,
  resumed_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  archived_by uuid references auth.users(id) on delete set null,
  archive_reason text
);

create table if not exists public.work_item_dependencies (
  work_item_id uuid not null references public.work_items(id) on delete cascade,
  depends_on_work_item_id uuid not null references public.work_items(id) on delete restrict,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (work_item_id, depends_on_work_item_id),
  check (work_item_id <> depends_on_work_item_id)
);

create table if not exists public.work_item_assignment_history (
  id uuid primary key default gen_random_uuid(),
  work_item_id uuid not null references public.work_items(id) on delete cascade,
  from_user_id uuid references auth.users(id) on delete set null,
  to_user_id uuid references auth.users(id) on delete set null,
  reason text,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);

create table if not exists public.work_item_status_history (
  id uuid primary key default gen_random_uuid(),
  work_item_id uuid not null references public.work_items(id) on delete cascade,
  from_status text,
  to_status text not null,
  note text,
  reason text,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists job_orders_order_idx on public.job_orders(order_id);
create index if not exists job_orders_status_idx on public.job_orders(status, target_date);
create index if not exists job_order_history_idx on public.job_order_status_history(job_order_id, changed_at desc);
create index if not exists work_items_job_idx on public.work_items(job_order_id, status);
create index if not exists work_items_assigned_idx on public.work_items(assigned_to, status);
create index if not exists work_item_history_idx on public.work_item_status_history(work_item_id, changed_at desc);

create table if not exists public.order_store_assignments (
  order_id uuid primary key references public.orders(id) on delete cascade,
  receiving_store_id uuid references public.stores(id) on delete restrict,
  production_store_id uuid references public.stores(id) on delete restrict,
  pickup_store_id uuid references public.stores(id) on delete restrict,
  reason text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  check (receiving_store_id is not null or production_store_id is not null or pickup_store_id is not null)
);

create or replace function public.can_access_order(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.current_actor_has_all_store_access()
    or exists (
      select 1 from public.order_store_assignments assignment
      where assignment.order_id = p_order_id
        and public.current_actor_store_id() in (
          assignment.receiving_store_id,
          assignment.production_store_id,
          assignment.pickup_store_id
        )
    )
    or exists (
      select 1 from public.orders order_row
      where order_row.id = p_order_id
        and (order_row.pickup_location_id = public.current_actor_store_id()
          or order_row.customer_user_id = auth.uid())
    );
$$;

revoke all on function public.can_access_order(uuid) from public, anon;
grant execute on function public.can_access_order(uuid) to authenticated, service_role;

-- Phase 5A payment lifecycle compatibility.  The historical Phase 5A
-- migration (20260712060316_payment_tracking_phase_5a.sql) is not in the
-- executable replay set, but Phase 5B and later ACL migrations still require
-- these exact signatures.  These functions operate on the single canonical
-- public.order_payments aggregate; they do not create a shadow payment table
-- or a second lifecycle.
create or replace function public.update_order_payment_draft(
  p_payment_id uuid,
  p_amount bigint,
  p_paid_at timestamptz,
  p_method text,
  p_channel_name text default null,
  p_reference_number text default null,
  p_customer_notes text default null,
  p_admin_notes text default null
)
returns public.order_payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  result_payment public.order_payments;
  order_id_value uuid;
begin
  if not public.has_permission('payment.create') then
    raise exception 'Not authorized to edit payment draft';
  end if;
  if p_payment_id is null then
    raise exception 'Payment id is required';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;
  if p_paid_at is null then
    raise exception 'Payment date is required';
  end if;
  if p_method is null or p_method not in ('bank_transfer','cash','qris','ewallet','other') then
    raise exception 'Invalid payment method';
  end if;

  select payment.order_id into order_id_value
  from public.order_payments payment
  where payment.id = p_payment_id
  for update;
  if not found then
    raise exception 'Payment not found';
  end if;
  if not public.can_access_order(order_id_value) then
    raise exception 'Payment is outside the current store scope';
  end if;

  update public.order_payments
  set amount = p_amount,
      paid_at = p_paid_at,
      method = p_method,
      channel_name = nullif(btrim(coalesce(p_channel_name, '')), ''),
      reference_number = nullif(btrim(coalesce(p_reference_number, '')), ''),
      customer_notes = nullif(btrim(coalesce(p_customer_notes, '')), ''),
      admin_notes = nullif(btrim(coalesce(p_admin_notes, '')), ''),
      updated_by = auth.uid(),
      updated_at = now()
  where id = p_payment_id
    and status in ('draft', 'pending')
    and archived_at is null
  returning * into result_payment;

  if not found then
    raise exception 'Only draft or pending payment can be edited';
  end if;
  return result_payment;
end;
$$;

create or replace function public.verify_order_payment(
  p_payment_id uuid,
  p_admin_notes text default null
)
returns public.order_payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  result_payment public.order_payments;
  order_id_value uuid;
  order_row public.orders;
begin
  if not public.has_permission('payment.verify') then
    raise exception 'Not authorized to verify';
  end if;

  select payment.order_id into order_id_value
  from public.order_payments payment
  where payment.id = p_payment_id
  for update;
  if not found then
    raise exception 'Pending payment not found';
  end if;

  select * into order_row
  from public.orders
  where id = order_id_value
  for update;
  if not found then
    raise exception 'Order not found';
  end if;
  if order_row.archived_at is not null or order_row.status in ('cancelled', 'expired') then
    raise exception 'Payment cannot be verified for cancelled, expired, or archived order';
  end if;
  if not public.can_access_order(order_id_value) then
    raise exception 'Payment is outside the current store scope';
  end if;

  update public.order_payments
  set status = 'verified',
      admin_notes = coalesce(nullif(btrim(coalesce(p_admin_notes, '')), ''), admin_notes),
      verified_at = now(),
      verified_by = auth.uid(),
      updated_by = auth.uid(),
      updated_at = now()
  where id = p_payment_id
    and status = 'pending'
    and archived_at is null
  returning * into result_payment;

  if not found then
    raise exception 'Pending payment not found';
  end if;
  perform public.refresh_order_payment_summary(result_payment.order_id);
  return result_payment;
end;
$$;

create or replace function public.reject_order_payment(
  p_payment_id uuid,
  p_reason text
)
returns public.order_payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  result_payment public.order_payments;
  order_id_value uuid;
begin
  if not public.has_permission('payment.reject') then
    raise exception 'Not authorized to reject';
  end if;
  if nullif(btrim(coalesce(p_reason, '')), '') is null then
    raise exception 'Rejection reason is required';
  end if;

  select payment.order_id into order_id_value
  from public.order_payments payment
  where payment.id = p_payment_id
  for update;
  if not found then
    raise exception 'Pending payment not found';
  end if;
  if not public.can_access_order(order_id_value) then
    raise exception 'Payment is outside the current store scope';
  end if;

  update public.order_payments
  set status = 'rejected',
      rejection_reason = btrim(p_reason),
      rejected_at = now(),
      rejected_by = auth.uid(),
      updated_by = auth.uid(),
      updated_at = now()
  where id = p_payment_id
    and status = 'pending'
    and archived_at is null
  returning * into result_payment;

  if not found then
    raise exception 'Pending payment not found';
  end if;
  perform public.refresh_order_payment_summary(result_payment.order_id);
  return result_payment;
end;
$$;

create or replace function public.archive_order_payment(
  p_payment_id uuid,
  p_reason text default null
)
returns public.order_payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  result_payment public.order_payments;
  order_id_value uuid;
begin
  if not public.has_permission('payment.archive') then
    raise exception 'Not authorized to archive payment';
  end if;

  select payment.order_id into order_id_value
  from public.order_payments payment
  where payment.id = p_payment_id
  for update;
  if not found then
    raise exception 'Payment not found';
  end if;
  if not public.can_access_order(order_id_value) then
    raise exception 'Payment is outside the current store scope';
  end if;

  update public.order_payments
  set archived_at = now(),
      archived_by = auth.uid(),
      archive_reason = nullif(btrim(coalesce(p_reason, '')), ''),
      updated_by = auth.uid(),
      updated_at = now()
  where id = p_payment_id
    and archived_at is null
  returning * into result_payment;

  if not found then
    raise exception 'Payment not found or already archived';
  end if;
  perform public.refresh_order_payment_summary(result_payment.order_id);
  return result_payment;
end;
$$;

create or replace function public.restore_order_payment(p_payment_id uuid)
returns public.order_payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  result_payment public.order_payments;
  order_id_value uuid;
begin
  if not public.has_permission('payment.archive') then
    raise exception 'Not authorized to restore payment';
  end if;

  select payment.order_id into order_id_value
  from public.order_payments payment
  where payment.id = p_payment_id
  for update;
  if not found then
    raise exception 'Archived payment not found';
  end if;
  if not public.can_access_order(order_id_value) then
    raise exception 'Payment is outside the current store scope';
  end if;

  update public.order_payments
  set archived_at = null,
      archived_by = null,
      archive_reason = null,
      updated_by = auth.uid(),
      updated_at = now()
  where id = p_payment_id
    and archived_at is not null
  returning * into result_payment;

  if not found then
    raise exception 'Archived payment not found';
  end if;
  perform public.refresh_order_payment_summary(result_payment.order_id);
  return result_payment;
end;
$$;

create or replace function public.permanently_delete_order_payment(p_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  order_id_value uuid;
begin
  if not public.is_superadmin() then
    raise exception 'Only Super Admin can permanently delete payment';
  end if;

  select payment.order_id into order_id_value
  from public.order_payments payment
  where payment.id = p_payment_id
    and payment.archived_at is not null
  for update;
  if not found then
    raise exception 'Payment must be archived first';
  end if;
  if not public.can_access_order(order_id_value) then
    raise exception 'Payment is outside the current store scope';
  end if;

  delete from public.order_payments
  where id = p_payment_id
    and archived_at is not null;
  perform public.refresh_order_payment_summary(order_id_value);
end;
$$;

-- Default function ACLs are closed before authenticated execution is granted.
-- Phase 5B and later security migrations may further narrow or extend the
-- trusted server boundary, but anonymous/public payment mutation is never
-- restored by this baseline.
revoke all on function public.update_order_payment_draft(uuid,bigint,timestamptz,text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.verify_order_payment(uuid,text) from public, anon, authenticated;
revoke all on function public.reject_order_payment(uuid,text) from public, anon, authenticated;
revoke all on function public.archive_order_payment(uuid,text) from public, anon, authenticated;
revoke all on function public.restore_order_payment(uuid) from public, anon, authenticated;
revoke all on function public.permanently_delete_order_payment(uuid) from public, anon, authenticated;
grant execute on function public.update_order_payment_draft(uuid,bigint,timestamptz,text,text,text,text,text) to authenticated;
grant execute on function public.verify_order_payment(uuid,text) to authenticated;
grant execute on function public.reject_order_payment(uuid,text) to authenticated;
grant execute on function public.archive_order_payment(uuid,text) to authenticated;
grant execute on function public.restore_order_payment(uuid) to authenticated;
grant execute on function public.permanently_delete_order_payment(uuid) to authenticated;

-- Fulfillment foundation. It is deliberately storage-neutral: no bucket or
-- object is created by the baseline. Later storage migrations add private
-- buckets and policies only when the workflow is ready.
create table if not exists public.fulfillments (
  id uuid primary key default gen_random_uuid(),
  fulfillment_number text unique,
  order_id uuid not null references public.orders(id) on delete restrict,
  job_order_id uuid references public.job_orders(id) on delete restrict,
  method text not null check (method in ('shipping','pickup')),
  status text not null default 'preparing' check (status in ('preparing','packing','ready_to_ship','shipped','in_transit','delivered','ready_for_pickup','picked_up','problem','cancelled')),
  receiver_name text,
  receiver_phone text,
  destination text,
  courier text,
  tracking_number text,
  package_count integer not null default 1 check (package_count > 0),
  scheduled_at timestamptz,
  packing_at timestamptz,
  ready_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  picked_up_at timestamptz,
  problem_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  archived_by uuid references auth.users(id) on delete set null,
  archive_reason text
);

create table if not exists public.fulfillment_items (
  id uuid primary key default gen_random_uuid(),
  fulfillment_id uuid not null references public.fulfillments(id) on delete cascade,
  work_item_id uuid references public.work_items(id) on delete restrict,
  order_item_id uuid references public.order_items(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.fulfillment_files (
  id uuid primary key default gen_random_uuid(),
  fulfillment_id uuid not null references public.fulfillments(id) on delete cascade,
  file_type text not null check (file_type in ('handover','signature','photo','document')),
  bucket text not null default 'fulfillment-proofs' check (bucket = 'fulfillment-proofs'),
  path text not null unique,
  file_name text not null,
  mime_type text not null check (mime_type in ('image/png','image/jpeg','image/webp','application/pdf')),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  uploaded_by uuid references auth.users(id) on delete set null,
  uploaded_at timestamptz not null default now()
);

create table if not exists public.fulfillment_status_history (
  id uuid primary key default gen_random_uuid(),
  fulfillment_id uuid not null references public.fulfillments(id) on delete cascade,
  from_status text,
  to_status text not null,
  note text,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);

create table if not exists public.fulfillment_revisions (
  id uuid primary key default gen_random_uuid(),
  fulfillment_id uuid not null references public.fulfillments(id) on delete restrict,
  revision_number integer not null,
  reason text not null check (btrim(reason) <> ''),
  previous_snapshot jsonb not null,
  new_snapshot jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(fulfillment_id, revision_number)
);

-- Phase 11 remains the lifecycle/security extension owner. The baseline
-- carries the complete pre-existing shape because CREATE TABLE IF NOT EXISTS
-- in that migration must be safe when this foundation already exists.
create table if not exists public.fulfillment_deletion_audit (
  id uuid primary key default gen_random_uuid(),
  fulfillment_id uuid not null,
  fulfillment_number text,
  order_id uuid not null,
  snapshot jsonb not null,
  deleted_by uuid references auth.users(id) on delete set null,
  deleted_at timestamptz not null default now(),
  reason text not null default 'Hapus permanen dari Gudang Arsip'
);
create index if not exists fulfillment_deletion_audit_order_idx
  on public.fulfillment_deletion_audit(order_id, deleted_at desc);

create index if not exists fulfillments_order_idx on public.fulfillments(order_id, created_at desc);
create index if not exists fulfillments_status_idx on public.fulfillments(status, created_at desc);
create index if not exists fulfillment_history_idx on public.fulfillment_status_history(fulfillment_id, changed_at desc);
create trigger fulfillments_set_updated_at before update on public.fulfillments
for each row execute function public.set_updated_at();

-- Notification state is separate from the outbound queue created later by
-- order operations. No templates or recipient rows are seeded here.
create table if not exists public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  event_code text not null,
  channel text not null check (channel in ('in_app','email','whatsapp','sms','push')),
  title_template text not null,
  body_template text not null,
  active boolean not null default true,
  provider_configured boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  archived_by uuid references auth.users(id) on delete set null,
  archive_reason text,
  unique(event_code, channel)
);

create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  event_code text not null,
  entity_type text not null,
  entity_id uuid not null,
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text not null unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.notification_events(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  channel text not null default 'in_app' check (channel in ('in_app','email','whatsapp','sms','push')),
  title text not null,
  body text not null,
  related_path text,
  status text not null default 'queued' check (status in ('queued','sent','failed','read','archived','not_configured')),
  sent_at timestamptz,
  read_at timestamptz,
  archived_at timestamptz,
  archived_by uuid references auth.users(id) on delete set null,
  error_message text,
  created_at timestamptz not null default now(),
  unique(event_id, recipient_id, channel)
);

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  attempt_number integer not null default 1 check (attempt_number > 0),
  provider text,
  provider_message_id text,
  status text not null check (status in ('queued','sent','failed','not_configured')),
  error_message text,
  attempted_at timestamptz not null default now(),
  unique(notification_id, attempt_number)
);

create index if not exists notification_events_entity_idx on public.notification_events(entity_type, entity_id, created_at desc);
create index if not exists notifications_recipient_idx on public.notifications(recipient_id, status, created_at desc);

create or replace function public.render_notification_template(p_template text, p_payload jsonb)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare result text := p_template; item record;
begin
  for item in select key, value from jsonb_each_text(coalesce(p_payload, '{}'::jsonb)) loop
    result := replace(result, '{{' || item.key || '}}', item.value);
  end loop;
  return result;
end;
$$;

create or replace function public.emit_notification_event(
  p_event_code text, p_entity_type text, p_entity_id uuid, p_payload jsonb,
  p_idempotency_key text, p_recipient_ids uuid[], p_related_path text default null
)
returns public.notification_events
language plpgsql
security definer
set search_path = ''
as $$
declare event_row public.notification_events; recipient uuid; template_row public.notification_templates;
begin
  if auth.uid() is not null and not public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']) then
    raise exception 'Not authorized';
  end if;
  select * into event_row from public.notification_events where idempotency_key = p_idempotency_key;
  if found then return event_row; end if;
  insert into public.notification_events(event_code, entity_type, entity_id, payload, idempotency_key, created_by)
  values(p_event_code, p_entity_type, p_entity_id, coalesce(p_payload, '{}'::jsonb), p_idempotency_key, auth.uid())
  returning * into event_row;
  for recipient in select distinct unnest(coalesce(p_recipient_ids, array[]::uuid[])) loop
    for template_row in select * from public.notification_templates
      where event_code = p_event_code and active and archived_at is null loop
      insert into public.notifications(event_id, recipient_id, channel, title, body, related_path, status, sent_at)
      values(event_row.id, recipient, template_row.channel,
        public.render_notification_template(template_row.title_template, p_payload),
        public.render_notification_template(template_row.body_template, p_payload),
        p_related_path,
        case when template_row.channel = 'in_app' then 'sent' when template_row.provider_configured then 'queued' else 'not_configured' end,
        case when template_row.channel = 'in_app' then now() else null end)
      on conflict(event_id, recipient_id, channel) do nothing;
    end loop;
  end loop;
  return event_row;
end;
$$;

create table if not exists public.system_audit_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid,
  action text not null,
  old_value jsonb,
  new_value jsonb,
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text,
  source text not null default 'database',
  reason text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists system_audit_log_entity_idx on public.system_audit_log(entity_type, entity_id, created_at desc);
create index if not exists system_audit_log_actor_idx on public.system_audit_log(actor_id, created_at desc);
create index if not exists system_audit_log_action_idx on public.system_audit_log(action, created_at desc);

create or replace function public.write_audit_log(
  p_entity_type text, p_entity_id uuid, p_action text, p_old_value jsonb, p_new_value jsonb,
  p_reason text default null, p_source text default 'database', p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.system_audit_log
language plpgsql
security definer
set search_path = ''
as $$
declare result_row public.system_audit_log;
begin
  if coalesce(btrim(p_entity_type), '') = '' or coalesce(btrim(p_action), '') = '' then
    raise exception 'Audit entity and action required';
  end if;
  if auth.uid() is not null and not public.has_permission('audit.read') and not public.has_permission('audit.write') then
    raise exception 'Not authorized to write audit log';
  end if;
  insert into public.system_audit_log(entity_type, entity_id, action, old_value, new_value, actor_id, actor_role, source, reason, request_id, metadata)
  values(p_entity_type, p_entity_id, p_action, p_old_value, p_new_value, auth.uid(), public.current_actor_role(),
    coalesce(nullif(p_source, ''), 'database'), nullif(btrim(coalesce(p_reason, '')), ''),
    nullif(btrim(coalesce(p_request_id, '')), ''), coalesce(p_metadata, '{}'::jsonb))
  returning * into result_row;
  return result_row;
end;
$$;

create or replace function public.prevent_audit_change()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Audit log is append-only';
end;
$$;

drop trigger if exists prevent_system_audit_change on public.system_audit_log;
create trigger prevent_system_audit_change before update or delete on public.system_audit_log
for each row execute function public.prevent_audit_change();

-- Audit trigger foundation recovered from the reverted Phase 13 append-only
-- audit migration.  system_audit_log remains the single audit authority;
-- this function is trigger-only and records row lifecycle changes without
-- exposing a direct customer/API mutation surface.
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_id uuid;
  action_name text;
  old_json jsonb;
  new_json jsonb;
begin
  if tg_op = 'INSERT' then
    new_json := to_jsonb(new);
    row_id := (new_json ->> 'id')::uuid;
    action_name := 'created';
  elsif tg_op = 'UPDATE' then
    old_json := to_jsonb(old);
    new_json := to_jsonb(new);
    row_id := (new_json ->> 'id')::uuid;
    if new_json ->> 'archived_at' is not null and old_json ->> 'archived_at' is null then
      action_name := 'archived';
    elsif new_json ->> 'archived_at' is null and old_json ->> 'archived_at' is not null then
      action_name := 'restored';
    else
      action_name := 'updated';
    end if;
  else
    old_json := to_jsonb(old);
    row_id := (old_json ->> 'id')::uuid;
    action_name := 'deleted';
  end if;

  insert into public.system_audit_log(
    entity_type,
    entity_id,
    action,
    old_value,
    new_value,
    actor_id,
    actor_role,
    source
  )
  values(
    tg_table_name,
    row_id,
    action_name,
    old_json,
    new_json,
    auth.uid(),
    public.current_actor_role(),
    'trigger'
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- PostgreSQL grants EXECUTE on new functions to PUBLIC by default.  The
-- function is intentionally callable only by trigger execution under its
-- definer context; no API role may invoke it directly.
revoke all on function public.audit_row_change() from public, anon, authenticated, service_role;

-- Inventory matrix foundation recovered from the historical P15 completion
-- migration. The fresh baseline owns the reusable zero-balance function and
-- insert/update triggers; the historical exact-cohort data mutation remains
-- excluded from fresh replay because the baseline contains no business rows.
create or replace function public.ensure_active_inventory_balance_matrix_v1(
  p_product_id uuid default null,
  p_variant_id uuid default null,
  p_variant_size_id uuid default null,
  p_location_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  inserted_count integer := 0;
begin
  with inserted as (
    insert into public.inventory_balances(
      location_id,
      variant_size_id,
      on_hand_quantity,
      reserved_quantity
    )
    select
      location.id,
      sellable.id,
      0,
      0
    from public.inventory_locations location
    cross join public.product_variant_sizes sellable
    join public.product_variants variant
      on variant.id = sellable.variant_id
    join public.products product
      on product.id = variant.product_id
    where location.active
      and location.location_type <> 'legacy'
      and product.status = 'active'
      and coalesce(product.status_aktif, true)
      and variant.status = 'active'
      and coalesce(variant.is_active, true)
      and sellable.status = 'active'
      and coalesce(sellable.is_active, true)
      and (p_product_id is null or product.id = p_product_id)
      and (p_variant_id is null or variant.id = p_variant_id)
      and (p_variant_size_id is null or sellable.id = p_variant_size_id)
      and (p_location_id is null or location.id = p_location_id)
    on conflict(location_id, variant_size_id) do nothing
    returning 1
  )
  select count(*)::integer
  into inserted_count
  from inserted;

  return inserted_count;
end
$function$;

revoke all on function public.ensure_active_inventory_balance_matrix_v1(uuid, uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.ensure_active_inventory_balance_matrix_v1(uuid, uuid, uuid, uuid)
  to service_role;

create or replace function public.ensure_sellable_inventory_balance_matrix_trigger_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform public.ensure_active_inventory_balance_matrix_v1(null, null, new.id, null);
  return new;
end
$function$;

create or replace function public.ensure_variant_inventory_balance_matrix_trigger_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform public.ensure_active_inventory_balance_matrix_v1(null, new.id, null, null);
  return new;
end
$function$;

create or replace function public.ensure_product_inventory_balance_matrix_trigger_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform public.ensure_active_inventory_balance_matrix_v1(new.id, null, null, null);
  return new;
end
$function$;

create or replace function public.ensure_location_inventory_balance_matrix_trigger_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform public.ensure_active_inventory_balance_matrix_v1(null, null, null, new.id);
  return new;
end
$function$;

revoke all on function public.ensure_sellable_inventory_balance_matrix_trigger_v1()
  from public, anon, authenticated;
revoke all on function public.ensure_variant_inventory_balance_matrix_trigger_v1()
  from public, anon, authenticated;
revoke all on function public.ensure_product_inventory_balance_matrix_trigger_v1()
  from public, anon, authenticated;
revoke all on function public.ensure_location_inventory_balance_matrix_trigger_v1()
  from public, anon, authenticated;

create table if not exists public.repeat_order_history (
  id uuid primary key default gen_random_uuid(),
  source_order_id uuid not null references public.orders(id) on delete restrict,
  source_quotation_id uuid references public.quotations(id) on delete set null,
  new_quotation_id uuid not null references public.quotations(id) on delete restrict,
  repeat_reason text,
  source_snapshot jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  idempotency_key text not null unique
);

create index if not exists repeat_order_history_source_idx on public.repeat_order_history(source_order_id, created_at desc);

-- Security boundary: every baseline table is RLS-protected before any
-- incremental migration adds a narrowly scoped read/write policy.  The
-- baseline intentionally has no business-data policies and no customer
-- rows.  This makes an incomplete replay fail closed instead of exposing
-- an intermediate schema through the API.
alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.permission_definitions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.debroder_schema_versions enable row level security;
alter table public.product_sizes enable row level security;
alter table public.product_color_master enable row level security;
alter table public.product_size_master enable row level security;
alter table public.product_categories enable row level security;
alter table public.product_subcategories enable row level security;
alter table public.product_size_guides enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_variant_images enable row level security;
alter table public.product_variant_sizes enable row level security;
alter table public.page_heroes enable row level security;
alter table public.cms_banners enable row level security;
alter table public.product_price_tiers enable row level security;
alter table public.product_minimum_rules enable row level security;
alter table public.custom_services enable row level security;
alter table public.service_pricing_rules enable row level security;
alter table public.customer_uploads enable row level security;
alter table public.saved_configurations enable row level security;
alter table public.configuration_item_services enable row level security;
alter table public.quotation_drafts enable row level security;
alter table public.quotation_draft_items enable row level security;
alter table public.quotation_number_sequences enable row level security;
alter table public.quotations enable row level security;
alter table public.quotation_items enable row level security;
alter table public.quotation_item_services enable row level security;
alter table public.quotation_status_history enable row level security;
alter table public.quotation_versions enable row level security;
alter table public.mockup_sets enable row level security;
alter table public.mockup_parts enable row level security;
alter table public.mockup_files enable row level security;
alter table public.mockup_approval_history enable row level security;
alter table public.mockup_review_links enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_item_services enable row level security;
alter table public.order_status_history enable row level security;
alter table public.payment_number_sequences enable row level security;
alter table public.order_payments enable row level security;
alter table public.job_orders enable row level security;
alter table public.job_order_status_history enable row level security;
alter table public.job_order_revisions enable row level security;
alter table public.work_items enable row level security;
alter table public.work_item_dependencies enable row level security;
alter table public.work_item_assignment_history enable row level security;
alter table public.work_item_status_history enable row level security;
alter table public.order_store_assignments enable row level security;
alter table public.fulfillments enable row level security;
alter table public.fulfillment_items enable row level security;
alter table public.fulfillment_files enable row level security;
alter table public.fulfillment_status_history enable row level security;
alter table public.fulfillment_revisions enable row level security;
alter table public.fulfillment_deletion_audit enable row level security;
alter table public.notification_templates enable row level security;
alter table public.notification_events enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.system_audit_log enable row level security;
alter table public.repeat_order_history enable row level security;

-- No API role receives table privileges from the baseline.  Later
-- repository migrations grant access only after the corresponding domain
-- policies and authorization predicates exist.  service_role is the
-- server-only escape hatch and still remains subject to application-level
-- authorization in SECURITY DEFINER functions.
revoke all on table
  public.profiles,
  public.stores,
  public.permission_definitions,
  public.role_permissions,
  public.debroder_schema_versions,
  public.product_sizes,
  public.product_color_master,
  public.product_size_master,
  public.product_categories,
  public.product_subcategories,
  public.product_size_guides,
  public.products,
  public.product_variants,
  public.product_variant_images,
  public.product_variant_sizes,
  public.page_heroes,
  public.cms_banners,
  public.product_price_tiers,
  public.product_minimum_rules,
  public.custom_services,
  public.service_pricing_rules,
  public.customer_uploads,
  public.saved_configurations,
  public.configuration_item_services,
  public.quotation_drafts,
  public.quotation_draft_items,
  public.quotation_number_sequences,
  public.quotations,
  public.quotation_items,
  public.quotation_item_services,
  public.quotation_status_history,
  public.quotation_versions,
  public.mockup_sets,
  public.mockup_parts,
  public.mockup_files,
  public.mockup_approval_history,
  public.mockup_review_links,
  public.orders,
  public.order_items,
  public.order_item_services,
  public.order_status_history,
  public.payment_number_sequences,
  public.order_payments,
  public.job_orders,
  public.job_order_status_history,
  public.job_order_revisions,
  public.work_items,
  public.work_item_dependencies,
  public.work_item_assignment_history,
  public.work_item_status_history,
  public.order_store_assignments,
  public.fulfillments,
  public.fulfillment_items,
  public.fulfillment_files,
  public.fulfillment_status_history,
  public.fulfillment_revisions,
  public.fulfillment_deletion_audit,
  public.notification_templates,
  public.notification_events,
  public.notifications,
  public.notification_deliveries,
  public.system_audit_log,
  public.repeat_order_history
from public, anon, authenticated;

grant all on table
  public.profiles,
  public.stores,
  public.permission_definitions,
  public.role_permissions,
  public.debroder_schema_versions,
  public.product_sizes,
  public.product_color_master,
  public.product_size_master,
  public.product_categories,
  public.product_subcategories,
  public.product_size_guides,
  public.products,
  public.product_variants,
  public.product_variant_images,
  public.product_variant_sizes,
  public.page_heroes,
  public.cms_banners,
  public.product_price_tiers,
  public.product_minimum_rules,
  public.custom_services,
  public.service_pricing_rules,
  public.customer_uploads,
  public.saved_configurations,
  public.configuration_item_services,
  public.quotation_drafts,
  public.quotation_draft_items,
  public.quotation_number_sequences,
  public.quotations,
  public.quotation_items,
  public.quotation_item_services,
  public.quotation_status_history,
  public.quotation_versions,
  public.mockup_sets,
  public.mockup_parts,
  public.mockup_files,
  public.mockup_approval_history,
  public.mockup_review_links,
  public.orders,
  public.order_items,
  public.order_item_services,
  public.order_status_history,
  public.payment_number_sequences,
  public.order_payments,
  public.job_orders,
  public.job_order_status_history,
  public.job_order_revisions,
  public.work_items,
  public.work_item_dependencies,
  public.work_item_assignment_history,
  public.work_item_status_history,
  public.order_store_assignments,
  public.fulfillments,
  public.fulfillment_items,
  public.fulfillment_files,
  public.fulfillment_status_history,
  public.fulfillment_revisions,
  public.fulfillment_deletion_audit,
  public.notification_templates,
  public.notification_events,
  public.notifications,
  public.notification_deliveries,
  public.system_audit_log,
  public.repeat_order_history
to service_role;

-- The replaced modern product migration's public catalog contract is carried
-- forward with the modern fields as the predicate authority.  These are the
-- only baseline API policies; every other domain remains deny-by-default
-- until its incremental security migration runs.
drop policy if exists "Public can read active categories" on public.product_categories;
create policy "Public can read active categories"
on public.product_categories for select to anon, authenticated
using (status = 'active');

drop policy if exists "Public can read active stores" on public.stores;
create policy "Public can read active stores"
on public.stores for select to anon, authenticated
using (status_aktif = true);

drop policy if exists "Public can read active products" on public.products;
create policy "Public can read active products"
on public.products for select to anon, authenticated
using (status = 'active');

drop policy if exists "Public can read active sizes" on public.product_sizes;
create policy "Public can read active sizes"
on public.product_sizes for select to anon, authenticated
using (status = 'active');

drop policy if exists "Public can read active apparel sizes" on public.product_size_master;
create policy "Public can read active apparel sizes"
on public.product_size_master for select to anon, authenticated
using (is_active = true);

drop policy if exists "Public can read active color master" on public.product_color_master;
create policy "Public can read active color master"
on public.product_color_master for select to anon, authenticated
using (is_active = true);

drop policy if exists "Public can read active subcategories" on public.product_subcategories;
create policy "Public can read active subcategories"
on public.product_subcategories for select to anon, authenticated
using (is_active = true);

drop policy if exists "Public can read active size guides" on public.product_size_guides;
create policy "Public can read active size guides"
on public.product_size_guides for select to anon, authenticated
using (is_active = true);

drop policy if exists "Public can read active variants" on public.product_variants;
create policy "Public can read active variants"
on public.product_variants for select to anon, authenticated
using (
  status = 'active'
  and exists (
    select 1 from public.products p
    where p.id = product_variants.product_id and p.status = 'active'
  )
);

drop policy if exists "Public can read active variant images" on public.product_variant_images;
create policy "Public can read active variant images"
on public.product_variant_images for select to anon, authenticated
using (
  exists (
    select 1
    from public.product_variants v
    join public.products p on p.id = v.product_id
    where v.id = product_variant_images.variant_id
      and v.status = 'active'
      and p.status = 'active'
  )
);

drop policy if exists "Public can read active variant sizes" on public.product_variant_sizes;
create policy "Public can read active variant sizes"
on public.product_variant_sizes for select to anon, authenticated
using (
  status = 'active'
  and exists (
    select 1
    from public.product_variants v
    join public.products p on p.id = v.product_id
    where v.id = product_variant_sizes.variant_id
      and v.status = 'active'
      and p.status = 'active'
  )
);

drop policy if exists "Staff can manage categories" on public.product_categories;
create policy "Staff can manage categories"
on public.product_categories for all to authenticated
using (public.has_staff_role(array['owner','super_admin','sales_admin']))
with check (public.has_staff_role(array['owner','super_admin','sales_admin']));

drop policy if exists "Staff can manage products" on public.products;
create policy "Staff can manage products"
on public.products for all to authenticated
using (public.has_staff_role(array['owner','super_admin','sales_admin']))
with check (public.has_staff_role(array['owner','super_admin','sales_admin']));

drop policy if exists "Staff can manage sizes" on public.product_sizes;
create policy "Staff can manage sizes"
on public.product_sizes for all to authenticated
using (public.has_staff_role(array['owner','super_admin','sales_admin']))
with check (public.has_staff_role(array['owner','super_admin','sales_admin']));

drop policy if exists "Staff can manage color master" on public.product_color_master;
create policy "Staff can manage color master"
on public.product_color_master for all to authenticated
using (public.has_staff_role(array['owner','super_admin','sales_admin']))
with check (public.has_staff_role(array['owner','super_admin','sales_admin']));

drop policy if exists "Staff can manage subcategories" on public.product_subcategories;
create policy "Staff can manage subcategories"
on public.product_subcategories for all to authenticated
using (public.has_staff_role(array['owner','super_admin','sales_admin']))
with check (public.has_staff_role(array['owner','super_admin','sales_admin']));

drop policy if exists "Staff can manage size guides" on public.product_size_guides;
create policy "Staff can manage size guides"
on public.product_size_guides for all to authenticated
using (public.has_staff_role(array['owner','super_admin','sales_admin']))
with check (public.has_staff_role(array['owner','super_admin','sales_admin']));

drop policy if exists "Staff can manage variants" on public.product_variants;
create policy "Staff can manage variants"
on public.product_variants for all to authenticated
using (public.has_staff_role(array['owner','super_admin','sales_admin']))
with check (public.has_staff_role(array['owner','super_admin','sales_admin']));

drop policy if exists "Staff can manage variant images" on public.product_variant_images;
create policy "Staff can manage variant images"
on public.product_variant_images for all to authenticated
using (public.has_staff_role(array['owner','super_admin','sales_admin']))
with check (public.has_staff_role(array['owner','super_admin','sales_admin']));

drop policy if exists "Staff can manage variant sizes" on public.product_variant_sizes;
create policy "Staff can manage variant sizes"
on public.product_variant_sizes for all to authenticated
using (public.has_staff_role(array['owner','super_admin','sales_admin']))
with check (public.has_staff_role(array['owner','super_admin','sales_admin']));

grant select on public.product_categories, public.products, public.product_sizes,
  public.product_size_master, public.product_color_master, public.product_subcategories, public.product_size_guides,
  public.product_variants, public.product_variant_images, public.product_variant_sizes
to anon, authenticated;
grant select on public.stores to anon, authenticated;
grant insert, update, delete on public.product_categories, public.products,
  public.product_sizes, public.product_color_master, public.product_subcategories,
  public.product_size_guides, public.product_variants, public.product_variant_images,
  public.product_variant_sizes to authenticated;

-- CMS read access is public only for explicitly published/active content;
-- authenticated management still requires the canonical content permission.
drop policy if exists "Public can read published page heroes" on public.page_heroes;
create policy "Public can read published page heroes"
on public.page_heroes for select to anon, authenticated
using (status_aktif and status = 'published');

drop policy if exists "Staff can manage page heroes" on public.page_heroes;
create policy "Staff can manage page heroes"
on public.page_heroes for all to authenticated
using (public.has_permission('content.manage'))
with check (public.has_permission('content.manage'));

drop policy if exists "Public can read published CMS banners" on public.cms_banners;
create policy "Public can read published CMS banners"
on public.cms_banners for select to anon, authenticated
using (is_active and status = 'published');

drop policy if exists "Staff can manage CMS banners" on public.cms_banners;
create policy "Staff can manage CMS banners"
on public.cms_banners for all to authenticated
using (public.has_permission('content.manage'))
with check (public.has_permission('content.manage'));

grant select on public.page_heroes, public.cms_banners to anon, authenticated;
grant insert, update, delete on public.page_heroes, public.cms_banners to authenticated;

-- PostgreSQL grants EXECUTE on newly created functions to PUBLIC by default.
-- Revoke that default for baseline helpers, then expose only the server-side
-- event/audit boundary.  Wave 0C separately restores authenticated staff
-- execution for the quotation snapshot RPC after its permission check.
revoke all on function public.render_notification_template(text, jsonb) from public, anon, authenticated, service_role;
revoke all on function public.emit_notification_event(text, text, uuid, jsonb, text, uuid[], text) from public, anon, authenticated, service_role;
revoke all on function public.write_audit_log(text, uuid, text, jsonb, jsonb, text, text, text, jsonb) from public, anon, authenticated, service_role;
revoke all on function public.prevent_audit_change() from public, anon, authenticated, service_role;
grant execute on function public.emit_notification_event(text, text, uuid, jsonb, text, uuid[], text),
  public.write_audit_log(text, uuid, text, jsonb, jsonb, text, text, text, jsonb)
to service_role;

-- Profile provisioning contract: auth.users is the identity authority and
-- this baseline deliberately creates no auth.users trigger.  Trusted
-- application/server code must create or synchronize public.profiles;
-- customer_profiles remains a later customer-account extension.

commit;
