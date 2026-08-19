-- PIM Phase 1: canonical product lifecycle and public product contract.
-- Data preserving: no product, variant, sellable SKU, image, order, or quotation rows are changed.

begin;

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

-- Keep legacy fields as compatibility projections while canonical writers use
-- status/base_price. Old writers are still projected back into the canonical fields.
create or replace function public.sync_products_v1_compat()
returns trigger
language plpgsql
set search_path = 'public'
as $$
begin
  new.name := coalesce(nullif(new.name, ''), new.nama);
  new.nama := coalesce(nullif(new.nama, ''), new.name);
  new.description := coalesce(new.description, new.deskripsi);
  new.deskripsi := coalesce(new.deskripsi, new.description, '');

  if tg_op = 'UPDATE'
     and new.status is not distinct from old.status
     and new.status_aktif is distinct from old.status_aktif then
    new.status := case when new.status_aktif then 'active' else 'archived' end;
  else
    new.status := coalesce(
      nullif(new.status, ''),
      case when coalesce(new.status_aktif, false) then 'active' else 'draft' end
    );
  end if;
  new.status_aktif := (new.status = 'active');

  if tg_op = 'UPDATE'
     and new.base_price is not distinct from old.base_price
     and (new.price is distinct from old.price or new.harga is distinct from old.harga) then
    new.base_price := coalesce(new.price, new.harga, 0);
  else
    new.base_price := coalesce(new.base_price, new.price, new.harga, 0);
  end if;
  new.price := new.base_price;
  new.harga := new.base_price;
  return new;
end;
$$;

drop trigger if exists sync_products_v1_compat_trigger on public.products;
create trigger sync_products_v1_compat_trigger
before insert or update on public.products
for each row execute function public.sync_products_v1_compat();

-- Storefront reads only canonical Active rows.
drop policy if exists "Public can read active products" on public.products;
create policy "Public can read active products"
on public.products for select
to anon, authenticated
using (status = 'active');

drop policy if exists "Public can read active product variants" on public.product_variants;
create policy "Public can read active product variants"
on public.product_variants for select
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
on public.product_variant_sizes for select
to anon, authenticated
using (
  status = 'active'
  and exists (
    select 1
    from public.product_variants pv
    join public.products p on p.id = pv.product_id
    where pv.id = product_variant_sizes.variant_id
      and pv.status = 'active'
      and p.status = 'active'
  )
);

drop policy if exists "Public can read variant images" on public.product_variant_images;
create policy "Public can read variant images"
on public.product_variant_images for select
to anon, authenticated
using (
  exists (
    select 1
    from public.product_variants pv
    join public.products p on p.id = pv.product_id
    where pv.id = product_variant_images.variant_id
      and pv.status = 'active'
      and p.status = 'active'
  )
);

commit;
