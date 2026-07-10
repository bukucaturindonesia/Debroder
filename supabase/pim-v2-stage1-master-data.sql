-- DEBRODER PIM V2 - STAGE 1
-- Database + Master Data + Backward Compatibility
-- Safe to run multiple times. Does not delete old products or old fields.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 1) Product categories are kept for physical products only.
--    Production services are separated into public.production_services.
alter table if exists public.product_categories
  add column if not exists category_kind text not null default 'product',
  add column if not exists public_label text,
  add column if not exists admin_notes text not null default '';

alter table if exists public.product_categories drop constraint if exists product_categories_category_kind_check;
alter table if exists public.product_categories
  add constraint product_categories_category_kind_check check (category_kind in ('product', 'service'));

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

create table if not exists public.production_services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  service_type text not null default 'production_service',
  description text not null default '',
  base_price numeric not null default 0,
  pricing_mode text not null default 'fixed_price',
  unit_label text not null default '',
  required_for_product_types text[] not null default '{}',
  is_required_default boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  admin_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.production_services drop constraint if exists production_services_service_type_check;
alter table if exists public.production_services
  add constraint production_services_service_type_check check (service_type in ('production_service', 'required_service', 'addon_service'));

alter table if exists public.production_services drop constraint if exists production_services_pricing_mode_check;
alter table if exists public.production_services
  add constraint production_services_pricing_mode_check check (pricing_mode in ('fixed_price', 'meter_based', 'area_based', 'quantity_based', 'custom_quote'));

-- 2) Master colors and sizes for consistent admin input.
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

create table if not exists public.product_size_master (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  size_group text not null default 'apparel',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (size_group, slug)
);

-- 3) Product-level size guide. One product can have its own guide.
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

-- 4) Upgrade existing products safely. Old products continue to work.
alter table if exists public.products
  add column if not exists product_type text not null default 'standard_product',
  add column if not exists pricing_mode text not null default 'fixed_price',
  add column if not exists product_subcategory_id uuid references public.product_subcategories(id) on delete set null,
  add column if not exists size_guide_id uuid references public.product_size_guides(id) on delete set null,
  add column if not exists sku text,
  add column if not exists has_variants boolean not null default false,
  add column if not exists uses_configurator boolean not null default false,
  add column if not exists minimum_order_qty integer not null default 1,
  add column if not exists required_services text[] not null default '{}',
  add column if not exists config_schema jsonb not null default '{}'::jsonb,
  add column if not exists admin_notes text not null default '',
  add column if not exists public_description text;

alter table if exists public.products drop constraint if exists products_product_type_check;
alter table if exists public.products
  add constraint products_product_type_check check (product_type in ('standard_product', 'configurable_product', 'production_service'));

alter table if exists public.products drop constraint if exists products_pricing_mode_check;
alter table if exists public.products
  add constraint products_pricing_mode_check check (pricing_mode in ('fixed_price', 'variant_based', 'configurator_based', 'custom_quote'));

alter table if exists public.products drop constraint if exists products_minimum_order_qty_check;
alter table if exists public.products
  add constraint products_minimum_order_qty_check check (minimum_order_qty >= 1);

-- 5) Variant architecture for Kaos Polos, Jaket & Hoodie, and Headwear.
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_name text not null default '',
  color_name text not null default '',
  color_hex text not null default '#111111',
  sku text,
  price_adjustment numeric not null default 0,
  image_url text,
  images text[] not null default '{}',
  object_fit text not null default 'cover',
  object_position text not null default 'center center',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  admin_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.product_variants drop constraint if exists product_variants_object_fit_check;
alter table if exists public.product_variants
  add constraint product_variants_object_fit_check check (object_fit in ('cover', 'contain'));

create table if not exists public.product_variant_sizes (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  size_name text not null,
  sku text,
  stock integer not null default 0,
  price_adjustment numeric not null default 0,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (variant_id, size_name)
);

alter table if exists public.product_variant_sizes drop constraint if exists product_variant_sizes_stock_check;
alter table if exists public.product_variant_sizes
  add constraint product_variant_sizes_stock_check check (stock >= 0);

create table if not exists public.product_variant_images (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  image_url text not null,
  image_role text,
  alt_text text not null default '',
  object_fit text not null default 'cover',
  object_position text not null default 'center center',
  focal_x numeric not null default 50,
  focal_y numeric not null default 50,
  focal_zoom numeric not null default 1,
  target_ratio text not null default '4:5',
  is_cover boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.product_variant_images drop constraint if exists product_variant_images_object_fit_check;
alter table if exists public.product_variant_images
  add constraint product_variant_images_object_fit_check check (object_fit in ('cover', 'contain'));

alter table if exists public.product_variant_images drop constraint if exists product_variant_images_role_check;
alter table if exists public.product_variant_images
  add constraint product_variant_images_role_check check (image_role is null or image_role in ('front', 'back', 'detail', 'lifestyle'));

-- 6) Pricing rules foundation for future dynamic pricing.
create table if not exists public.product_pricing_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rule_key text not null unique,
  product_category_id uuid references public.product_categories(id) on delete cascade,
  product_subcategory_id uuid references public.product_subcategories(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  applies_to text not null default 'product',
  adjustment_type text not null default 'fixed_amount',
  adjustment_value numeric not null default 0,
  min_quantity integer,
  max_quantity integer,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.product_pricing_rules drop constraint if exists product_pricing_rules_applies_to_check;
alter table if exists public.product_pricing_rules
  add constraint product_pricing_rules_applies_to_check check (applies_to in ('product', 'variant', 'size', 'material', 'collar', 'addon', 'quantity', 'service'));

alter table if exists public.product_pricing_rules drop constraint if exists product_pricing_rules_adjustment_type_check;
alter table if exists public.product_pricing_rules
  add constraint product_pricing_rules_adjustment_type_check check (adjustment_type in ('fixed_amount', 'percentage', 'override_price'));

-- 7) Jersey configurator master tables are prepared now, UI comes later.
create table if not exists public.jersey_packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  base_price numeric not null default 0,
  description text not null default '',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jersey_materials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  price_adjustment numeric not null default 0,
  description text not null default '',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jersey_collar_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jersey_collars (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.jersey_collar_groups(id) on delete set null,
  name text not null,
  slug text not null unique,
  price_adjustment numeric not null default 0,
  image_url text,
  icon_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jersey_addons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  price_adjustment numeric not null default 0,
  description text not null default '',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jersey_required_services (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references public.production_services(id) on delete cascade,
  service_name text not null,
  service_slug text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (service_slug)
);

create table if not exists public.jersey_settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text not null unique,
  setting_value jsonb not null default '{}'::jsonb,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 8) Cart/order item compatibility for configured products.
alter table if exists public.order_items
  add column if not exists product_type text not null default 'standard_product',
  add column if not exists variant_id uuid references public.product_variants(id) on delete set null,
  add column if not exists variant_size_id uuid references public.product_variant_sizes(id) on delete set null,
  add column if not exists sku text,
  add column if not exists config_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists required_services jsonb not null default '[]'::jsonb,
  add column if not exists estimated_total numeric;

alter table if exists public.order_items drop constraint if exists order_items_product_type_check;
alter table if exists public.order_items
  add constraint order_items_product_type_check check (product_type in ('standard_product', 'configurable_product', 'production_service'));

-- 9) Indexes.
create index if not exists product_subcategories_category_idx on public.product_subcategories (category_id, is_active, sort_order);
create index if not exists production_services_active_idx on public.production_services (is_active, sort_order);
create index if not exists product_color_master_active_idx on public.product_color_master (is_active, sort_order);
create index if not exists product_size_master_active_idx on public.product_size_master (size_group, is_active, sort_order);
create index if not exists products_pim_v2_type_idx on public.products (product_type, pricing_mode, status_aktif, urutan);
create index if not exists products_subcategory_idx on public.products (product_subcategory_id);
create index if not exists product_variants_product_idx on public.product_variants (product_id, is_active, sort_order);
create index if not exists product_variant_sizes_variant_idx on public.product_variant_sizes (variant_id, is_active, sort_order);
create index if not exists product_variant_images_variant_idx on public.product_variant_images (variant_id, is_cover desc, sort_order);
create index if not exists product_size_guides_product_idx on public.product_size_guides (product_id, is_active);
create index if not exists jersey_packages_active_idx on public.jersey_packages (is_active, sort_order);
create index if not exists jersey_materials_active_idx on public.jersey_materials (is_active, sort_order);
create index if not exists jersey_collars_active_idx on public.jersey_collars (is_active, sort_order);
create index if not exists jersey_addons_active_idx on public.jersey_addons (is_active, sort_order);

-- 10) Triggers.
drop trigger if exists set_product_subcategories_updated_at on public.product_subcategories;
create trigger set_product_subcategories_updated_at before update on public.product_subcategories for each row execute function public.set_updated_at();

drop trigger if exists set_production_services_updated_at on public.production_services;
create trigger set_production_services_updated_at before update on public.production_services for each row execute function public.set_updated_at();

drop trigger if exists set_product_color_master_updated_at on public.product_color_master;
create trigger set_product_color_master_updated_at before update on public.product_color_master for each row execute function public.set_updated_at();

drop trigger if exists set_product_size_master_updated_at on public.product_size_master;
create trigger set_product_size_master_updated_at before update on public.product_size_master for each row execute function public.set_updated_at();

drop trigger if exists set_product_size_guides_updated_at on public.product_size_guides;
create trigger set_product_size_guides_updated_at before update on public.product_size_guides for each row execute function public.set_updated_at();

drop trigger if exists set_product_variants_updated_at on public.product_variants;
create trigger set_product_variants_updated_at before update on public.product_variants for each row execute function public.set_updated_at();

drop trigger if exists set_product_variant_sizes_updated_at on public.product_variant_sizes;
create trigger set_product_variant_sizes_updated_at before update on public.product_variant_sizes for each row execute function public.set_updated_at();

drop trigger if exists set_product_variant_images_updated_at on public.product_variant_images;
create trigger set_product_variant_images_updated_at before update on public.product_variant_images for each row execute function public.set_updated_at();

drop trigger if exists set_product_pricing_rules_updated_at on public.product_pricing_rules;
create trigger set_product_pricing_rules_updated_at before update on public.product_pricing_rules for each row execute function public.set_updated_at();

drop trigger if exists set_jersey_packages_updated_at on public.jersey_packages;
create trigger set_jersey_packages_updated_at before update on public.jersey_packages for each row execute function public.set_updated_at();

drop trigger if exists set_jersey_materials_updated_at on public.jersey_materials;
create trigger set_jersey_materials_updated_at before update on public.jersey_materials for each row execute function public.set_updated_at();

drop trigger if exists set_jersey_collar_groups_updated_at on public.jersey_collar_groups;
create trigger set_jersey_collar_groups_updated_at before update on public.jersey_collar_groups for each row execute function public.set_updated_at();

drop trigger if exists set_jersey_collars_updated_at on public.jersey_collars;
create trigger set_jersey_collars_updated_at before update on public.jersey_collars for each row execute function public.set_updated_at();

drop trigger if exists set_jersey_addons_updated_at on public.jersey_addons;
create trigger set_jersey_addons_updated_at before update on public.jersey_addons for each row execute function public.set_updated_at();

drop trigger if exists set_jersey_required_services_updated_at on public.jersey_required_services;
create trigger set_jersey_required_services_updated_at before update on public.jersey_required_services for each row execute function public.set_updated_at();

drop trigger if exists set_jersey_settings_updated_at on public.jersey_settings;
create trigger set_jersey_settings_updated_at before update on public.jersey_settings for each row execute function public.set_updated_at();

-- 11) RLS policies. Public can read active master data. Superadmin manages.
alter table public.product_subcategories enable row level security;
alter table public.production_services enable row level security;
alter table public.product_color_master enable row level security;
alter table public.product_size_master enable row level security;
alter table public.product_size_guides enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_variant_sizes enable row level security;
alter table public.product_variant_images enable row level security;
alter table public.product_pricing_rules enable row level security;
alter table public.jersey_packages enable row level security;
alter table public.jersey_materials enable row level security;
alter table public.jersey_collar_groups enable row level security;
alter table public.jersey_collars enable row level security;
alter table public.jersey_addons enable row level security;
alter table public.jersey_required_services enable row level security;
alter table public.jersey_settings enable row level security;

drop policy if exists "Public can read active product subcategories" on public.product_subcategories;
create policy "Public can read active product subcategories" on public.product_subcategories for select using (is_active = true);
drop policy if exists "Superadmin can manage product subcategories" on public.product_subcategories;
create policy "Superadmin can manage product subcategories" on public.product_subcategories for all using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "Public can read active production services" on public.production_services;
create policy "Public can read active production services" on public.production_services for select using (is_active = true);
drop policy if exists "Superadmin can manage production services" on public.production_services;
create policy "Superadmin can manage production services" on public.production_services for all using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "Public can read active color master" on public.product_color_master;
create policy "Public can read active color master" on public.product_color_master for select using (is_active = true);
drop policy if exists "Superadmin can manage color master" on public.product_color_master;
create policy "Superadmin can manage color master" on public.product_color_master for all using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "Public can read active size master" on public.product_size_master;
create policy "Public can read active size master" on public.product_size_master for select using (is_active = true);
drop policy if exists "Superadmin can manage size master" on public.product_size_master;
create policy "Superadmin can manage size master" on public.product_size_master for all using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "Public can read active size guides" on public.product_size_guides;
create policy "Public can read active size guides" on public.product_size_guides for select using (is_active = true);
drop policy if exists "Superadmin can manage size guides" on public.product_size_guides;
create policy "Superadmin can manage size guides" on public.product_size_guides for all using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "Public can read active product variants" on public.product_variants;
create policy "Public can read active product variants" on public.product_variants for select using (is_active = true);
drop policy if exists "Superadmin can manage product variants" on public.product_variants;
create policy "Superadmin can manage product variants" on public.product_variants for all using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "Public can read active variant sizes" on public.product_variant_sizes;
create policy "Public can read active variant sizes" on public.product_variant_sizes for select using (is_active = true);
drop policy if exists "Superadmin can manage variant sizes" on public.product_variant_sizes;
create policy "Superadmin can manage variant sizes" on public.product_variant_sizes for all using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "Public can read variant images" on public.product_variant_images;
create policy "Public can read variant images" on public.product_variant_images for select using (true);
drop policy if exists "Superadmin can manage variant images" on public.product_variant_images;
create policy "Superadmin can manage variant images" on public.product_variant_images for all using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "Public can read active pricing rules" on public.product_pricing_rules;
create policy "Public can read active pricing rules" on public.product_pricing_rules for select using (is_active = true);
drop policy if exists "Superadmin can manage pricing rules" on public.product_pricing_rules;
create policy "Superadmin can manage pricing rules" on public.product_pricing_rules for all using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "Public can read active jersey packages" on public.jersey_packages;
create policy "Public can read active jersey packages" on public.jersey_packages for select using (is_active = true);
drop policy if exists "Superadmin can manage jersey packages" on public.jersey_packages;
create policy "Superadmin can manage jersey packages" on public.jersey_packages for all using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "Public can read active jersey materials" on public.jersey_materials;
create policy "Public can read active jersey materials" on public.jersey_materials for select using (is_active = true);
drop policy if exists "Superadmin can manage jersey materials" on public.jersey_materials;
create policy "Superadmin can manage jersey materials" on public.jersey_materials for all using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "Public can read active jersey collar groups" on public.jersey_collar_groups;
create policy "Public can read active jersey collar groups" on public.jersey_collar_groups for select using (is_active = true);
drop policy if exists "Superadmin can manage jersey collar groups" on public.jersey_collar_groups;
create policy "Superadmin can manage jersey collar groups" on public.jersey_collar_groups for all using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "Public can read active jersey collars" on public.jersey_collars;
create policy "Public can read active jersey collars" on public.jersey_collars for select using (is_active = true);
drop policy if exists "Superadmin can manage jersey collars" on public.jersey_collars;
create policy "Superadmin can manage jersey collars" on public.jersey_collars for all using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "Public can read active jersey addons" on public.jersey_addons;
create policy "Public can read active jersey addons" on public.jersey_addons for select using (is_active = true);
drop policy if exists "Superadmin can manage jersey addons" on public.jersey_addons;
create policy "Superadmin can manage jersey addons" on public.jersey_addons for all using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "Public can read active jersey required services" on public.jersey_required_services;
create policy "Public can read active jersey required services" on public.jersey_required_services for select using (is_active = true);
drop policy if exists "Superadmin can manage jersey required services" on public.jersey_required_services;
create policy "Superadmin can manage jersey required services" on public.jersey_required_services for all using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "Public can read jersey settings" on public.jersey_settings;
create policy "Public can read jersey settings" on public.jersey_settings for select using (true);
drop policy if exists "Superadmin can manage jersey settings" on public.jersey_settings;
create policy "Superadmin can manage jersey settings" on public.jersey_settings for all using (public.is_superadmin()) with check (public.is_superadmin());

-- 12) Seed product categories.
insert into public.product_categories (name, slug, description, category_kind, sort_order, show_in_collection, collection_limit, collection_sort, collection_section_order)
values
  ('Kaos Polos', 'kaos-polos', 'Produk kaos polos dan produk berbasis kaos untuk kebutuhan custom dan retail.', 'product', 10, true, 8, 'sort_order', 10),
  ('Jaket & Hoodie', 'jaket-hoodie', 'Produk jaket, hoodie, crewneck, bomber, varsity, dan zipper hoodie.', 'product', 20, true, 8, 'sort_order', 20),
  ('Jersey', 'jersey', 'Produk jersey custom berbasis configurator.', 'product', 30, true, 8, 'sort_order', 30),
  ('Headwear', 'headwear', 'Produk topi dan headwear custom.', 'product', 40, true, 8, 'sort_order', 40)
on conflict (slug) do nothing;

-- 13) Seed subcategories.
insert into public.product_subcategories (category_id, name, slug, description, sort_order)
select c.id, s.name, s.slug, s.description, s.sort_order
from public.product_categories c
join (values
  ('kaos-polos', 'Cotton Combed', 'cotton-combed', 'Kaos cotton combed untuk kebutuhan polos dan custom.', 10),
  ('kaos-polos', 'Polo Shirt', 'polo-shirt', 'Kaos polo untuk kebutuhan komunitas, kantor, dan semi-formal.', 20),
  ('kaos-polos', 'Long Sleeve', 'long-sleeve', 'Kaos lengan panjang untuk kebutuhan polos dan custom.', 30),
  ('kaos-polos', 'Heavy Cotton', 'heavy-cotton', 'Kaos bahan tebal untuk tampilan premium.', 40),
  ('kaos-polos', 'Dryfit', 'dryfit', 'Kaos dryfit untuk olahraga dan aktivitas harian.', 50),
  ('kaos-polos', 'Kaos Anak', 'kaos-anak', 'Kaos anak untuk custom dan kebutuhan seragam.', 60),
  ('jaket-hoodie', 'Hoodie', 'hoodie', 'Hoodie custom untuk komunitas dan brand.', 10),
  ('jaket-hoodie', 'Crewneck', 'crewneck', 'Crewneck custom untuk komunitas dan brand.', 20),
  ('jaket-hoodie', 'Bomber', 'bomber', 'Jaket bomber custom.', 30),
  ('jaket-hoodie', 'Varsity', 'varsity', 'Jaket varsity custom.', 40),
  ('jaket-hoodie', 'Zipper Hoodie', 'zipper-hoodie', 'Hoodie resleting custom.', 50),
  ('jersey', 'Jersey Futsal', 'jersey-futsal', 'Jersey futsal custom.', 10),
  ('jersey', 'Jersey Sepak Bola', 'jersey-sepak-bola', 'Jersey sepak bola custom.', 20),
  ('jersey', 'Jersey Baseball', 'jersey-baseball', 'Jersey baseball custom.', 30),
  ('jersey', 'Jersey Biliar', 'jersey-biliar', 'Jersey biliar custom.', 40),
  ('jersey', 'Jersey Custom', 'jersey-custom', 'Jersey custom sesuai kebutuhan tim.', 50),
  ('headwear', 'Topi Trucker', 'topi-trucker', 'Topi trucker custom.', 10),
  ('headwear', 'Topi Baseball', 'topi-baseball', 'Topi baseball custom.', 20),
  ('headwear', 'Snapback', 'snapback', 'Snapback custom.', 30),
  ('headwear', 'Bucket Hat', 'bucket-hat', 'Bucket hat custom.', 40)
) as s(category_slug, name, slug, description, sort_order) on c.slug = s.category_slug
on conflict (category_id, slug) do nothing;

-- 14) Seed production services.
insert into public.production_services (name, slug, service_type, description, base_price, pricing_mode, unit_label, sort_order)
values
  ('Sablon DTF', 'sablon-dtf', 'production_service', 'Layanan sablon DTF untuk apparel custom.', 0, 'custom_quote', 'pcs/lembar/meter', 10),
  ('Bordir Komputer', 'bordir-komputer', 'production_service', 'Layanan bordir komputer untuk apparel dan headwear.', 0, 'custom_quote', 'pcs', 20),
  ('Cetak Sublim', 'cetak-sublim', 'production_service', 'Layanan cetak sublim untuk jersey dan produk polyester.', 0, 'custom_quote', 'pcs', 30),
  ('Maklon DTF', 'maklon-dtf', 'production_service', 'Layanan maklon DTF untuk produksi reseller dan brand.', 0, 'custom_quote', 'meter/lembar', 40)
on conflict (slug) do nothing;

-- 15) Seed 20+ basic colors.
insert into public.product_color_master (name, slug, color_hex, color_group, sort_order)
values
  ('Black', 'black', '#111111', 'basic', 10),
  ('White', 'white', '#F7F7F4', 'basic', 20),
  ('Sport Grey', 'sport-grey', '#BFC2C5', 'basic', 30),
  ('Charcoal', 'charcoal', '#3A3A3A', 'basic', 40),
  ('Navy', 'navy', '#1F2A44', 'basic', 50),
  ('Royal Blue', 'royal-blue', '#1D4ED8', 'basic', 60),
  ('Sky Blue', 'sky-blue', '#8EC5E8', 'basic', 70),
  ('Forest Green', 'forest-green', '#063D24', 'basic', 80),
  ('Army Green', 'army-green', '#4B5320', 'basic', 90),
  ('Mint Green', 'mint-green', '#A7E8C4', 'basic', 100),
  ('Red', 'red', '#DC2626', 'basic', 110),
  ('Maroon', 'maroon', '#6F1D1B', 'basic', 120),
  ('Orange', 'orange', '#F97316', 'basic', 130),
  ('Yellow', 'yellow', '#FACC15', 'basic', 140),
  ('Mustard', 'mustard', '#D97706', 'basic', 150),
  ('Cream', 'cream', '#EADFCB', 'basic', 160),
  ('Beige', 'beige', '#D6C4A5', 'basic', 170),
  ('Brown', 'brown', '#7C4A32', 'basic', 180),
  ('Purple', 'purple', '#6D28D9', 'basic', 190),
  ('Pink', 'pink', '#E7A7C8', 'basic', 200),
  ('Turquoise', 'turquoise', '#40E0D0', 'basic', 210),
  ('Silver', 'silver', '#D1D5DB', 'basic', 220)
on conflict (slug) do nothing;

-- 16) Seed sizes.
insert into public.product_size_master (name, slug, size_group, sort_order)
values
  ('XS', 'xs', 'apparel', 10),
  ('S', 's', 'apparel', 20),
  ('M', 'm', 'apparel', 30),
  ('L', 'l', 'apparel', 40),
  ('XL', 'xl', 'apparel', 50),
  ('2XL', '2xl', 'apparel', 60),
  ('3XL', '3xl', 'apparel', 70),
  ('4XL', '4xl', 'apparel', 80),
  ('All Size', 'all-size', 'headwear', 10),
  ('S/M', 's-m', 'headwear', 20),
  ('L/XL', 'l-xl', 'headwear', 30)
on conflict (size_group, slug) do nothing;

-- 17) Seed jersey configurator master data.
insert into public.jersey_packages (name, slug, base_price, sort_order)
values
  ('Atasan Fullprint', 'atasan-fullprint', 100000, 10),
  ('Setelan Halfprint', 'setelan-halfprint', 120000, 20),
  ('Setelan Fullprint', 'setelan-fullprint', 130000, 30)
on conflict (slug) do nothing;

insert into public.jersey_materials (name, slug, price_adjustment, sort_order)
values
  ('Milano', 'milano', 0, 10),
  ('Brazil', 'brazil', 0, 20),
  ('Benzema', 'benzema', 0, 30),
  ('Drop Needle', 'drop-needle', 0, 40),
  ('Emboss Topo', 'emboss-topo', 15000, 50),
  ('Emboss Straw', 'emboss-straw', 15000, 60),
  ('Emboss Mixart', 'emboss-mixart', 15000, 70),
  ('Emboss Monochrome', 'emboss-monochrome', 15000, 80)
on conflict (slug) do nothing;

insert into public.jersey_collar_groups (name, slug, sort_order)
values
  ('Regular', 'regular', 10),
  ('Classic', 'classic', 20)
on conflict (slug) do nothing;

insert into public.jersey_collars (group_id, name, slug, price_adjustment, sort_order)
select g.id, c.name, c.slug, c.price_adjustment, c.sort_order
from public.jersey_collar_groups g
join (values
  ('regular', 'O Neck', 'o-neck', 0, 10),
  ('regular', 'V Neck', 'v-neck', 0, 20),
  ('regular', 'V Silang', 'v-silang', 0, 30),
  ('regular', 'V Silang Tumpul', 'v-silang-tumpul', 0, 40),
  ('regular', 'V Tumpul', 'v-tumpul', 0, 50),
  ('regular', 'V Narrow', 'v-narrow', 0, 60),
  ('regular', 'V Narrow Adidas', 'v-narrow-adidas', 0, 70),
  ('regular', 'V Neck Lapisan', 'v-neck-lapisan', 0, 80),
  ('classic', 'Wangki Klasik', 'wangki-klasik', 0, 10),
  ('classic', 'Wangki Adidas', 'wangki-adidas', 0, 20),
  ('classic', 'Wangki Segitiga', 'wangki-segitiga', 0, 30),
  ('classic', 'Wangki Tumpul Adidas', 'wangki-tumpul-adidas', 0, 40),
  ('classic', 'Wangki Silang Adidas', 'wangki-silang-adidas', 0, 50),
  ('classic', 'Wangki Kancing 1', 'wangki-kancing-1', 0, 60),
  ('classic', 'Wangki Kancing 2', 'wangki-kancing-2', 0, 70),
  ('classic', 'Wangki Klasik O', 'wangki-klasik-o', 0, 80)
) as c(group_slug, name, slug, price_adjustment, sort_order) on g.slug = c.group_slug
on conflict (slug) do nothing;

insert into public.jersey_addons (name, slug, price_adjustment, sort_order)
values
  ('Lengan Panjang', 'lengan-panjang', 10000, 10),
  ('RIB', 'rib', 5000, 20)
on conflict (slug) do nothing;

insert into public.jersey_required_services (service_id, service_name, service_slug, sort_order)
select id, name, slug, 10
from public.production_services
where slug = 'cetak-sublim'
on conflict (service_slug) do nothing;

insert into public.jersey_settings (setting_key, setting_value, description)
values
  ('default_minimum_order', '{"quantity":6}'::jsonb, 'Minimum order default untuk jersey configurator.'),
  ('price_formula', '{"formula":"(package_price + material_adjustment + collar_adjustment + addon_total + size_adjustment) * quantity"}'::jsonb, 'Formula harga jersey configurator.'),
  ('required_service', '{"service":"Cetak Sublim","removable":false}'::jsonb, 'Layanan wajib untuk semua produk jersey.')
on conflict (setting_key) do nothing;

-- 18) Backward compatibility defaults.
update public.products
set
  product_type = coalesce(nullif(product_type, ''), 'standard_product'),
  pricing_mode = coalesce(nullif(pricing_mode, ''), 'fixed_price'),
  minimum_order_qty = greatest(coalesce(minimum_order_qty, 1), 1),
  has_variants = coalesce(has_variants, false),
  uses_configurator = coalesce(uses_configurator, false),
  required_services = coalesce(required_services, '{}')
where true;

-- Mark existing jersey products as configurable-ready without breaking their old fixed display.
update public.products
set
  product_type = 'configurable_product',
  pricing_mode = case when pricing_mode = 'fixed_price' then 'configurator_based' else pricing_mode end,
  uses_configurator = true,
  minimum_order_qty = greatest(coalesce(minimum_order_qty, 1), 6),
  required_services = array['Cetak Sublim']
where lower(coalesce(kategori, '')) like '%jersey%'
   or lower(coalesce(subcategory, '')) like '%jersey%'
   or lower(coalesce(nama, '')) like '%jersey%';
