-- PIM Phase 1: canonical lifecycle and compatibility projections.
-- Data-preserving DDL only. Existing product/variant/image rows are not rewritten.

do $$
begin
  if exists (
    select 1 from public.products
    where status is null or status not in ('draft', 'active', 'archived')
  ) then
    raise exception 'PIM Phase 1 preflight failed: products.status contains unsupported lifecycle values.';
  end if;

  if exists (
    select 1 from public.products
    where base_price is not null and base_price < 0
  ) then
    raise exception 'PIM Phase 1 preflight failed: products.base_price contains a negative value.';
  end if;
end
$$;

alter table public.products
  alter column status set default 'draft',
  alter column status set not null;

alter table public.products
  drop constraint if exists products_status_lifecycle_check;

alter table public.products
  add constraint products_status_lifecycle_check
  check (status in ('draft', 'active', 'archived'));

alter table public.products
  drop constraint if exists products_base_price_nonnegative_check;

alter table public.products
  add constraint products_base_price_nonnegative_check
  check (base_price is null or base_price >= 0);

create or replace function public.sync_products_v1_compat()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.name := coalesce(nullif(new.name, ''), nullif(new.nama, ''));
    new.status := coalesce(
      nullif(new.status, ''),
      case when coalesce(new.status_aktif, false) then 'active' else 'draft' end
    );
    new.base_price := coalesce(new.base_price, new.price, new.harga);
  else
    if new.name is not distinct from old.name and new.nama is distinct from old.nama then
      new.name := nullif(new.nama, '');
    end if;

    if new.status is not distinct from old.status and new.status_aktif is distinct from old.status_aktif then
      new.status := case when new.status_aktif then 'active' else 'draft' end;
    end if;

    if new.base_price is not distinct from old.base_price then
      if new.price is distinct from old.price then
        new.base_price := new.price;
      elsif new.harga is distinct from old.harga then
        new.base_price := new.harga;
      end if;
    end if;
  end if;

  new.name := coalesce(nullif(new.name, ''), nullif(new.nama, ''));
  new.nama := coalesce(nullif(new.name, ''), nullif(new.nama, ''), 'Produk');
  new.name := new.nama;

  new.description := coalesce(new.description, new.deskripsi);
  new.deskripsi := coalesce(new.description, new.deskripsi, '');
  new.description := new.deskripsi;

  new.status := coalesce(nullif(new.status, ''), 'draft');
  if new.status not in ('draft', 'active', 'archived') then
    raise exception 'Unsupported product lifecycle status: %', new.status;
  end if;
  new.status_aktif := (new.status = 'active');

  new.base_price := coalesce(new.base_price, new.price, new.harga);
  new.price := new.base_price;
  new.harga := new.base_price;
  return new;
end;
$$;

create or replace function public.sync_product_variants_v1_compat()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.name := coalesce(nullif(new.name, ''), nullif(new.color_name, ''), nullif(new.variant_name, ''));
    new.hex_code := coalesce(nullif(new.hex_code, ''), nullif(new.color_hex, ''), '#111111');
    new.status := coalesce(
      nullif(new.status, ''),
      case when coalesce(new.is_active, true) then 'active' else 'inactive' end
    );
  else
    if new.name is not distinct from old.name then
      if new.color_name is distinct from old.color_name then
        new.name := nullif(new.color_name, '');
      elsif new.variant_name is distinct from old.variant_name then
        new.name := nullif(new.variant_name, '');
      end if;
    end if;

    if new.hex_code is not distinct from old.hex_code and new.color_hex is distinct from old.color_hex then
      new.hex_code := nullif(new.color_hex, '');
    end if;

    if new.status is not distinct from old.status and new.is_active is distinct from old.is_active then
      new.status := case when new.is_active then 'active' else 'inactive' end;
    end if;
  end if;

  new.name := coalesce(nullif(new.name, ''), nullif(new.color_name, ''), nullif(new.variant_name, ''), 'Varian');
  new.variant_name := new.name;
  new.color_name := new.name;
  new.slug := coalesce(
    nullif(new.slug, ''),
    trim(both '-' from regexp_replace(lower(new.name), '[^a-z0-9]+', '-', 'g'))
  );
  new.hex_code := coalesce(nullif(new.hex_code, ''), nullif(new.color_hex, ''), '#111111');
  new.color_hex := new.hex_code;
  new.status := coalesce(nullif(new.status, ''), 'active');
  new.is_active := (new.status = 'active');
  return new;
end;
$$;

create or replace function public.sync_product_variant_sizes_v1_compat()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  resolved_size public.product_size_master%rowtype;
begin
  if new.size_id is not null then
    select * into resolved_size
    from public.product_size_master
    where id = new.size_id;

    if resolved_size.id is null then
      raise exception 'Invalid product size master reference: %', new.size_id;
    end if;
    new.size_name := resolved_size.name;
  elsif nullif(new.size_name, '') is not null then
    select * into resolved_size
    from public.product_size_master
    where lower(name) = lower(new.size_name)
    order by sort_order
    limit 1;
    new.size_id := resolved_size.id;
  end if;

  if tg_op = 'INSERT' then
    new.stock_quantity := coalesce(new.stock_quantity, new.stock, 0);
    new.status := coalesce(
      nullif(new.status, ''),
      case when coalesce(new.is_active, true) then 'active' else 'inactive' end
    );
  else
    if new.stock_quantity is not distinct from old.stock_quantity and new.stock is distinct from old.stock then
      new.stock_quantity := new.stock;
    end if;
    if new.status is not distinct from old.status and new.is_active is distinct from old.is_active then
      new.status := case when new.is_active then 'active' else 'inactive' end;
    end if;
  end if;

  new.stock_quantity := coalesce(new.stock_quantity, 0);
  new.stock := new.stock_quantity;
  new.status := coalesce(nullif(new.status, ''), 'active');
  new.is_active := (new.status = 'active');
  return new;
end;
$$;

drop policy if exists "Public can read active products" on public.products;
create policy "Public can read active products"
on public.products
for select
to anon, authenticated
using (status = 'active');

drop policy if exists "Public can read active product variants" on public.product_variants;
create policy "Public can read active product variants"
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

drop policy if exists "Public can read variant images" on public.product_variant_images;
create policy "Public can read variant images"
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
);;
