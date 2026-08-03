begin;

create temporary table provisional_product_primary_images (
  slug text primary key,
  image_url text not null,
  image_alt text not null,
  activate_configured_jersey boolean not null default false
) on commit drop;

insert into provisional_product_primary_images (
  slug,
  image_url,
  image_alt,
  activate_configured_jersey
)
values
  ('3600-soft-tee', '/products/3600-soft-tee/primary.webp', 'Kaos Polos NSA warna hitam', false),
  ('72y00-youth', '/products/72y00-youth/primary.webp', 'Kaos Polos Anak warna sport grey', false),
  ('8100-polo', '/products/8100-polo/primary.webp', 'Polo Shirt Polos warna hitam', false),
  ('bomber-jacket', '/products/bomber-jacket/primary.webp', 'Bomber Jacket Custom warna black camo', false),
  ('pullover-hooded', '/products/pullover-hooded/primary.webp', 'Hoodie Fleece warna hitam', false),
  ('windbreaker', '/products/windbreaker/primary.webp', 'Windbreaker Custom warna navy', false),
  ('zip-hooded', '/products/zip-hooded/primary.webp', 'Zip Hoodie Custom warna sport grey', false),
  ('jersey-futsal-custom', '/products/jersey-futsal-custom/primary.jpeg', 'Jersey Futsal Custom DEBRODER', true),
  ('jersey-sepak-bola-custom', '/products/jersey-sepak-bola-custom/primary.jpeg', 'Jersey Sepak Bola Custom DEBRODER', true);

do $$
declare
  mapped_count integer;
  configured_jersey_count integer;
begin
  select count(*)
  into mapped_count
  from provisional_product_primary_images mapping
  join public.products product on product.slug = mapping.slug;

  if mapped_count <> 9 then
    raise exception
      'PROVISIONAL_PRODUCT_IMAGES_ABORT_MAPPING: expected 9 products, received %',
      mapped_count;
  end if;

  select count(*)
  into configured_jersey_count
  from provisional_product_primary_images mapping
  join public.products product on product.slug = mapping.slug
  where mapping.activate_configured_jersey
    and product.product_type = 'configurable_product'
    and product.pricing_mode = 'configurator_based'
    and product.sales_mode in ('custom', 'both')
    and product.uses_configurator
    and product.config_schema @> '{"entry_type":"jersey_configurator"}'::jsonb;

  if configured_jersey_count <> 2 then
    raise exception
      'PROVISIONAL_PRODUCT_IMAGES_ABORT_JERSEY: expected 2 canonical configured Jersey products, received %',
      configured_jersey_count;
  end if;
end
$$;

update public.products product
set
  image_url = mapping.image_url,
  gambar_url = mapping.image_url,
  image_alt = mapping.image_alt,
  object_fit = 'contain',
  object_position = 'center center',
  updated_at = now()
from provisional_product_primary_images mapping
where product.slug = mapping.slug
  and nullif(btrim(coalesce(product.image_url, '')), '') is null
  and nullif(
    btrim(
      case
        when product.gambar_url = '/images/debroder-hero.png' then ''
        else coalesce(product.gambar_url, '')
      end
    ),
    ''
  ) is null;

update public.products product
set
  status = 'active',
  status_aktif = true,
  updated_at = now()
from provisional_product_primary_images mapping
where product.slug = mapping.slug
  and mapping.activate_configured_jersey
  and product.product_type = 'configurable_product'
  and product.pricing_mode = 'configurator_based'
  and product.sales_mode in ('custom', 'both')
  and product.uses_configurator
  and product.config_schema @> '{"entry_type":"jersey_configurator"}'::jsonb
  and nullif(btrim(coalesce(product.image_url, product.gambar_url, '')), '') is not null
  and (
    product.status is distinct from 'active'
    or not product.status_aktif
  );

do $$
declare
  missing_image_count integer;
  configured_jersey_active_count integer;
begin
  select count(*)
  into missing_image_count
  from provisional_product_primary_images mapping
  join public.products product on product.slug = mapping.slug
  where nullif(btrim(coalesce(product.image_url, product.gambar_url, '')), '') is null
    or coalesce(product.image_url, product.gambar_url, '') like '/public/%';

  select count(*)
  into configured_jersey_active_count
  from provisional_product_primary_images mapping
  join public.products product on product.slug = mapping.slug
  where mapping.activate_configured_jersey
    and product.status = 'active'
    and product.status_aktif
    and nullif(btrim(coalesce(product.image_url, product.gambar_url, '')), '') is not null;

  if missing_image_count <> 0 or configured_jersey_active_count <> 2 then
    raise exception
      'PROVISIONAL_PRODUCT_IMAGES_ABORT_POSTCHECK: missing images %, active Jersey %',
      missing_image_count,
      configured_jersey_active_count;
  end if;
end
$$;

insert into public.system_audit_log (
  entity_type,
  action,
  actor_role,
  source,
  reason,
  metadata
)
select
  'product_media',
  'provisional_product_primary_images_v1_applied',
  'owner',
  'migration',
  'Owner-authorized temporary product image mapping for trial/staging and minimum configured Jersey publication.',
  jsonb_build_object(
    'expected_images', 9,
    'assigned_images', 9,
    'provisional_images', 9,
    'web_sourced_images', 0,
    'configured_jersey_activated', 2,
    'owner_source_files_changed', false,
    'historical_orders_changed', false,
    'rls_changed', false
  )
where not exists (
  select 1
  from public.system_audit_log
  where action = 'provisional_product_primary_images_v1_applied'
);

commit;
