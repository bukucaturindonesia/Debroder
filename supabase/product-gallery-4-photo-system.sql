-- DEBRODER product gallery: four fixed roles per product color/variant.
-- Safe to run after the PIM V2 tables already exist.
-- This migration does not delete existing images.

begin;

alter table if exists public.product_variant_images
  add column if not exists image_role text;

alter table if exists public.product_variant_images
  drop constraint if exists product_variant_images_role_check;

alter table if exists public.product_variant_images
  add constraint product_variant_images_role_check
  check (image_role is null or image_role in ('front', 'back', 'detail', 'lifestyle'));

-- Give the first four legacy images deterministic roles without deleting extras.
with ranked as (
  select
    id,
    row_number() over (
      partition by variant_id
      order by is_cover desc, sort_order asc, created_at asc, id asc
    ) as position
  from public.product_variant_images
  where image_role is null
)
update public.product_variant_images as image
set image_role = case ranked.position
  when 1 then 'front'
  when 2 then 'back'
  when 3 then 'detail'
  when 4 then 'lifestyle'
  else null
end
from ranked
where image.id = ranked.id
  and ranked.position <= 4;

-- If this migration is re-run after manual edits, keep only one row for each role.
with duplicated_roles as (
  select
    id,
    row_number() over (
      partition by variant_id, image_role
      order by is_cover desc, sort_order asc, created_at asc, id asc
    ) as duplicate_position
  from public.product_variant_images
  where image_role is not null
)
update public.product_variant_images as image
set image_role = null,
    is_cover = false
from duplicated_roles
where image.id = duplicated_roles.id
  and duplicated_roles.duplicate_position > 1;

update public.product_variant_images
set
  sort_order = case image_role
    when 'front' then 0
    when 'back' then 1
    when 'detail' then 2
    when 'lifestyle' then 3
    else sort_order
  end,
  is_cover = (image_role = 'front')
where image_role is not null;

-- Legacy rows outside the structured four slots remain stored, but cannot be cover.
update public.product_variant_images
set is_cover = false
where image_role is null;

create unique index if not exists product_variant_images_one_role_per_variant_idx
  on public.product_variant_images (variant_id, image_role)
  where image_role is not null;

create unique index if not exists product_variant_images_one_cover_per_variant_idx
  on public.product_variant_images (variant_id)
  where is_cover = true;

create or replace function public.enforce_product_variant_gallery_limit()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  existing_count integer;
begin
  if new.image_role is not null then
    new.sort_order := case new.image_role
      when 'front' then 0
      when 'back' then 1
      when 'detail' then 2
      when 'lifestyle' then 3
      else new.sort_order
    end;
    new.is_cover := new.image_role = 'front';
    new.target_ratio := '4:5';
  end if;

  if tg_op = 'INSERT' then
    select count(*) into existing_count
    from public.product_variant_images
    where variant_id = new.variant_id
      and image_role is not null;

    if existing_count >= 4 then
      raise exception 'A product variant can have a maximum of four active gallery images.';
    end if;
  elsif tg_op = 'UPDATE' and new.variant_id is distinct from old.variant_id then
    select count(*) into existing_count
    from public.product_variant_images
    where variant_id = new.variant_id
      and id <> new.id
      and image_role is not null;

    if existing_count >= 4 then
      raise exception 'A product variant can have a maximum of four active gallery images.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_product_variant_gallery_limit_trigger
  on public.product_variant_images;

create trigger enforce_product_variant_gallery_limit_trigger
before insert or update on public.product_variant_images
for each row execute function public.enforce_product_variant_gallery_limit();

commit;
