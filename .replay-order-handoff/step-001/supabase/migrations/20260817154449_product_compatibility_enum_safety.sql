begin;

-- CURRENT HEAD correction: product_status is an enum.  The historical
-- compatibility body used nullif(enum, '') which forces PostgreSQL to cast
-- the empty string to product_status before nullif can evaluate it.  That
-- makes every canonical product INSERT fail on a fresh database.  Preserve
-- the compatibility projection without comparing an enum to text.
create or replace function public.sync_products_v1_compat()
returns trigger
language plpgsql
set search_path = ''
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
  elsif new.status is null then
    new.status := case when coalesce(new.status_aktif, false) then 'active' else 'draft' end;
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

revoke all on function public.sync_products_v1_compat() from public, anon, authenticated, service_role;

commit;
