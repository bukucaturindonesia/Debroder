begin;

create extension if not exists pgcrypto;

create table if not exists public.debroder_schema_versions (
  version_key text primary key,
  description text not null,
  applied_at timestamptz not null default now()
);

create or replace function public.has_staff_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select lower(role) = any (
        select lower(value) from unnest(allowed_roles) as value
      )
      from public.profiles
      where id = auth.uid()
    ),
    false
  );
$$;

alter table public.products
  add column if not exists name text,
  add column if not exists status text;

update public.products
set name = coalesce(nullif(name, ''), nama),
    status = coalesce(nullif(status, ''), case when status_aktif then 'active' else 'archived' end);

alter table public.product_categories
  add column if not exists status text;

update public.product_categories
set status = coalesce(nullif(status, ''), case when is_active then 'active' else 'inactive' end);

alter table public.product_variants
  add column if not exists name text,
  add column if not exists slug text,
  add column if not exists hex_code text,
  add column if not exists is_default boolean not null default false,
  add column if not exists status text;

update public.product_variants
set name = coalesce(nullif(name, ''), nullif(color_name, ''), variant_name),
    slug = coalesce(
      nullif(slug, ''),
      trim(both '-' from regexp_replace(lower(coalesce(nullif(color_name,''), nullif(variant_name,''), id::text)), '[^a-z0-9]+', '-', 'g'))
    ),
    hex_code = coalesce(nullif(hex_code, ''), color_hex, '#111111'),
    status = coalesce(nullif(status, ''), case when is_active then 'active' else 'inactive' end);

with ranked as (
  select id, row_number() over (partition by product_id order by sort_order, created_at, id) as rn
  from public.product_variants
)
update public.product_variants v
set is_default = (ranked.rn = 1)
from ranked
where ranked.id = v.id;

alter table public.product_variant_sizes
  add column if not exists size_id uuid,
  add column if not exists stock_quantity integer,
  add column if not exists status text;

update public.product_variant_sizes pvs
set size_id = psm.id
from public.product_size_master psm
where pvs.size_id is null
  and lower(psm.name) = lower(pvs.size_name);

update public.product_variant_sizes
set stock_quantity = coalesce(stock_quantity, stock),
    status = coalesce(nullif(status, ''), case when is_active then 'active' else 'inactive' end);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'product_variant_sizes_size_id_fkey'
  ) then
    alter table public.product_variant_sizes
      add constraint product_variant_sizes_size_id_fkey
      foreign key (size_id) references public.product_size_master(id) on update cascade;
  end if;
end $$;

create or replace function public.sync_products_v1_compat()
returns trigger
language plpgsql
as $$
begin
  new.name := coalesce(nullif(new.name, ''), new.nama);
  new.nama := coalesce(nullif(new.nama, ''), new.name);
  new.description := coalesce(new.description, new.deskripsi);
  new.deskripsi := coalesce(new.deskripsi, new.description, '');
  new.status := coalesce(nullif(new.status, ''), case when new.status_aktif then 'active' else 'archived' end);
  new.status_aktif := (new.status = 'active');
  new.base_price := coalesce(new.base_price, new.price, new.harga, 0);
  new.price := coalesce(new.price, new.base_price);
  new.harga := coalesce(new.harga, new.base_price);
  return new;
end;
$$;

drop trigger if exists sync_products_v1_compat_trigger on public.products;
create trigger sync_products_v1_compat_trigger
before insert or update on public.products
for each row execute function public.sync_products_v1_compat();

create or replace function public.sync_product_categories_v1_compat()
returns trigger
language plpgsql
as $$
begin
  new.status := coalesce(nullif(new.status, ''), case when new.is_active then 'active' else 'inactive' end);
  new.is_active := (new.status = 'active');
  return new;
end;
$$;

drop trigger if exists sync_product_categories_v1_compat_trigger on public.product_categories;
create trigger sync_product_categories_v1_compat_trigger
before insert or update on public.product_categories
for each row execute function public.sync_product_categories_v1_compat();

create or replace function public.sync_product_variants_v1_compat()
returns trigger
language plpgsql
as $$
begin
  new.name := coalesce(nullif(new.name, ''), nullif(new.color_name, ''), new.variant_name);
  new.variant_name := coalesce(nullif(new.variant_name, ''), new.name);
  new.color_name := coalesce(nullif(new.color_name, ''), new.name);
  new.slug := coalesce(
    nullif(new.slug, ''),
    trim(both '-' from regexp_replace(lower(coalesce(new.name, new.color_name, new.id::text)), '[^a-z0-9]+', '-', 'g'))
  );
  new.hex_code := coalesce(nullif(new.hex_code, ''), new.color_hex, '#111111');
  new.color_hex := coalesce(nullif(new.color_hex, ''), new.hex_code, '#111111');
  new.status := coalesce(nullif(new.status, ''), case when new.is_active then 'active' else 'inactive' end);
  new.is_active := (new.status = 'active');
  return new;
end;
$$;

drop trigger if exists sync_product_variants_v1_compat_trigger on public.product_variants;
create trigger sync_product_variants_v1_compat_trigger
before insert or update on public.product_variants
for each row execute function public.sync_product_variants_v1_compat();

create or replace function public.sync_product_variant_sizes_v1_compat()
returns trigger
language plpgsql
as $$
declare
  resolved_size public.product_size_master%rowtype;
begin
  if new.size_id is null and nullif(new.size_name, '') is not null then
    select * into resolved_size
    from public.product_size_master
    where lower(name) = lower(new.size_name)
    order by sort_order
    limit 1;
    new.size_id := resolved_size.id;
  elsif new.size_id is not null and nullif(new.size_name, '') is null then
    select * into resolved_size
    from public.product_size_master
    where id = new.size_id;
    new.size_name := resolved_size.name;
  end if;

  new.stock_quantity := coalesce(new.stock_quantity, new.stock, 0);
  new.stock := coalesce(new.stock, new.stock_quantity, 0);
  new.status := coalesce(nullif(new.status, ''), case when new.is_active then 'active' else 'inactive' end);
  new.is_active := (new.status = 'active');
  return new;
end;
$$;

drop trigger if exists sync_product_variant_sizes_v1_compat_trigger on public.product_variant_sizes;
create trigger sync_product_variant_sizes_v1_compat_trigger
before insert or update on public.product_variant_sizes
for each row execute function public.sync_product_variant_sizes_v1_compat();

create unique index if not exists products_slug_unique_idx on public.products(slug);
create unique index if not exists product_variants_sku_unique_idx on public.product_variants(sku);
create unique index if not exists product_variant_sizes_sku_unique_idx on public.product_variant_sizes(sku);
create unique index if not exists product_variants_product_slug_unique_idx on public.product_variants(product_id, slug);
create unique index if not exists product_variants_one_default_per_product_idx on public.product_variants(product_id) where is_default;

update public.product_variant_images
set image_role = case
  when is_cover then 'front'
  when sort_order = 0 then 'front'
  when sort_order = 1 then 'back'
  when sort_order = 2 then 'detail'
  else 'lifestyle'
end
where image_role is null or image_role not in ('front','back','detail','lifestyle');

create unique index if not exists product_variant_images_variant_role_unique_idx
  on public.product_variant_images(variant_id, image_role);

insert into public.debroder_schema_versions(version_key, description)
values ('v1.0_product_foundation_compat', 'Legacy product schema exposed to v1.0 runtime')
on conflict(version_key) do update
set description = excluded.description,
    applied_at = now();

commit;
