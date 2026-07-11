begin;

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'product_status') then
    create type public.product_status as enum ('draft', 'active', 'archived');
  end if;

  if not exists (select 1 from pg_type where typname = 'variant_status') then
    create type public.variant_status as enum ('active', 'inactive', 'out_of_stock');
  end if;

  if not exists (select 1 from pg_type where typname = 'size_status') then
    create type public.size_status as enum ('active', 'inactive');
  end if;

  if not exists (select 1 from pg_type where typname = 'variant_image_role') then
    create type public.variant_image_role as enum ('front', 'back', 'detail', 'lifestyle');
  end if;
end $$;

create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  product_category_id uuid not null references public.product_categories(id) on update cascade,
  base_price integer not null check (base_price >= 0),
  description text,
  status public.product_status not null default 'draft',
  sku text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_sizes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sort_order integer not null default 0,
  status public.size_status not null default 'active',
  price_adjustment integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade on update cascade,
  name text not null,
  slug text not null,
  hex_code text not null check (hex_code ~ '^#[0-9A-Fa-f]{6}$'),
  sku text not null unique,
  sort_order integer not null default 0,
  is_default boolean not null default false,
  status public.variant_status not null default 'active',
  price_adjustment integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, slug)
);

create table if not exists public.product_variant_images (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete cascade on update cascade,
  image_url text not null,
  image_role public.variant_image_role not null,
  sort_order integer not null default 0,
  alt_text text,
  created_at timestamptz not null default now(),
  unique (variant_id, image_role)
);

create table if not exists public.product_variant_sizes (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete cascade on update cascade,
  size_id uuid not null references public.product_sizes(id) on update cascade,
  sku text not null unique,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  price_adjustment integer not null default 0,
  status public.variant_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (variant_id, size_id)
);

create unique index if not exists product_variants_one_default_per_product_idx
  on public.product_variants(product_id)
  where is_default;

create index if not exists products_category_status_idx
  on public.products(product_category_id, status);

create index if not exists product_variants_product_sort_idx
  on public.product_variants(product_id, sort_order);

create index if not exists product_variant_images_variant_sort_idx
  on public.product_variant_images(variant_id, sort_order);

create index if not exists product_variant_sizes_variant_status_idx
  on public.product_variant_sizes(variant_id, status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_product_categories_updated_at on public.product_categories;
create trigger set_product_categories_updated_at
before update on public.product_categories
for each row execute function public.set_updated_at();

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists set_product_sizes_updated_at on public.product_sizes;
create trigger set_product_sizes_updated_at
before update on public.product_sizes
for each row execute function public.set_updated_at();

drop trigger if exists set_product_variants_updated_at on public.product_variants;
create trigger set_product_variants_updated_at
before update on public.product_variants
for each row execute function public.set_updated_at();

drop trigger if exists set_product_variant_sizes_updated_at on public.product_variant_sizes;
create trigger set_product_variant_sizes_updated_at
before update on public.product_variant_sizes
for each row execute function public.set_updated_at();

create or replace function public.has_staff_role(allowed_roles text[])
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = any(allowed_roles), false);
$$;

alter table public.product_categories enable row level security;
alter table public.products enable row level security;
alter table public.product_sizes enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_variant_images enable row level security;
alter table public.product_variant_sizes enable row level security;

drop policy if exists "Public can read active categories" on public.product_categories;
create policy "Public can read active categories"
on public.product_categories
for select
to anon, authenticated
using (status = 'active');

drop policy if exists "Public can read active products" on public.products;
create policy "Public can read active products"
on public.products
for select
to anon, authenticated
using (status = 'active');

drop policy if exists "Public can read active sizes" on public.product_sizes;
create policy "Public can read active sizes"
on public.product_sizes
for select
to anon, authenticated
using (status = 'active');

drop policy if exists "Public can read active variants" on public.product_variants;
create policy "Public can read active variants"
on public.product_variants
for select
to anon, authenticated
using (
  status = 'active'
  and exists (
    select 1 from public.products p
    where p.id = product_variants.product_id
      and p.status = 'active'
  )
);

drop policy if exists "Public can read active variant images" on public.product_variant_images;
create policy "Public can read active variant images"
on public.product_variant_images
for select
to anon, authenticated
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
on public.product_variant_sizes
for select
to anon, authenticated
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
on public.product_categories
for all
to authenticated
using (public.has_staff_role(array['owner','super_admin','sales_admin']))
with check (public.has_staff_role(array['owner','super_admin','sales_admin']));

drop policy if exists "Staff can manage products" on public.products;
create policy "Staff can manage products"
on public.products
for all
to authenticated
using (public.has_staff_role(array['owner','super_admin','sales_admin']))
with check (public.has_staff_role(array['owner','super_admin','sales_admin']));

drop policy if exists "Staff can manage sizes" on public.product_sizes;
create policy "Staff can manage sizes"
on public.product_sizes
for all
to authenticated
using (public.has_staff_role(array['owner','super_admin','sales_admin']))
with check (public.has_staff_role(array['owner','super_admin','sales_admin']));

drop policy if exists "Staff can manage variants" on public.product_variants;
create policy "Staff can manage variants"
on public.product_variants
for all
to authenticated
using (public.has_staff_role(array['owner','super_admin','sales_admin']))
with check (public.has_staff_role(array['owner','super_admin','sales_admin']));

drop policy if exists "Staff can manage variant images" on public.product_variant_images;
create policy "Staff can manage variant images"
on public.product_variant_images
for all
to authenticated
using (public.has_staff_role(array['owner','super_admin','sales_admin']))
with check (public.has_staff_role(array['owner','super_admin','sales_admin']));

drop policy if exists "Staff can manage variant sizes" on public.product_variant_sizes;
create policy "Staff can manage variant sizes"
on public.product_variant_sizes
for all
to authenticated
using (public.has_staff_role(array['owner','super_admin','sales_admin']))
with check (public.has_staff_role(array['owner','super_admin','sales_admin']));

grant select on public.product_categories to anon, authenticated;
grant select on public.products to anon, authenticated;
grant select on public.product_sizes to anon, authenticated;
grant select on public.product_variants to anon, authenticated;
grant select on public.product_variant_images to anon, authenticated;
grant select on public.product_variant_sizes to anon, authenticated;

grant insert, update, delete on public.product_categories to authenticated;
grant insert, update, delete on public.products to authenticated;
grant insert, update, delete on public.product_sizes to authenticated;
grant insert, update, delete on public.product_variants to authenticated;
grant insert, update, delete on public.product_variant_images to authenticated;
grant insert, update, delete on public.product_variant_sizes to authenticated;

insert into public.product_sizes (name, slug, sort_order, status, price_adjustment)
values
  ('S', 's', 10, 'active', 0),
  ('M', 'm', 20, 'active', 0),
  ('L', 'l', 30, 'active', 0),
  ('XL', 'xl', 40, 'active', 0),
  ('XXL', 'xxl', 50, 'active', 3000),
  ('3XL', '3xl', 60, 'active', 5000),
  ('All Size', 'all-size', 70, 'active', 0)
on conflict (slug) do update
set name = excluded.name,
    sort_order = excluded.sort_order,
    status = excluded.status,
    price_adjustment = excluded.price_adjustment;

commit;

