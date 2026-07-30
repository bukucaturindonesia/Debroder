begin;

create temporary table canonical_trial_product_prices (
  product_key text primary key,
  slug text not null unique,
  sku text not null unique,
  locked_price numeric not null check (locked_price > 0),
  create_if_missing boolean not null default false
) on commit drop;

insert into canonical_trial_product_prices (
  product_key,
  slug,
  sku,
  locked_price,
  create_if_missing
)
values
  ('kaos_cotton_combed_24s', 'cotton-combed-24s', 'DBR-CC24', 45000, false),
  ('kaos_polos_nsa', '3600-soft-tee', 'DBR-3600', 45000, false),
  ('polo_shirt_polos', '8100-polo', 'DBR-8100', 60000, false),
  ('kaos_polos_anak_cotton_combed', '72y00-youth', 'DBR-72Y00', 37000, false),
  ('hoodie_fleece', 'pullover-hooded', 'DBR-PULLOVER', 140000, false),
  ('crewneck_fleece', 'crewneck', 'DBR-CREWNECK', 100000, false),
  ('bomber_jacket_custom', 'bomber-jacket', 'DBR-BOMBER', 205000, false),
  ('windbreaker_custom', 'windbreaker', 'DBR-WINDBREAKER', 185000, false),
  ('zip_hoodie_custom', 'zip-hooded', 'DBR-ZIPHOOD', 150000, false),
  ('topi_custom', '6089-premium-classic-snapback', 'DBD-HDWR', 30000, false),
  ('jersey_futsal_custom', 'jersey-futsal-custom', 'DBR-JRS-FUTSAL', 100000, true),
  ('jersey_sepak_bola_custom', 'jersey-sepak-bola-custom', 'DBR-JRS-FOOTBALL', 130000, true);

do $$
declare
  existing_locked_count integer;
  jersey_category_count integer;
  conflicting_identity_count integer;
begin
  select count(*)
  into existing_locked_count
  from canonical_trial_product_prices locked
  join public.products product
    on product.slug = locked.slug
   and upper(btrim(product.sku)) = locked.sku
  where not locked.create_if_missing;

  if existing_locked_count <> 10 then
    raise exception
      'CANONICAL_TRIAL_PRICING_ABORT_PRODUCT_MAPPING: expected 10 existing product identities, received %',
      existing_locked_count;
  end if;

  select count(*)
  into jersey_category_count
  from public.product_categories
  where slug = 'jersey';

  if jersey_category_count <> 1 then
    raise exception
      'CANONICAL_TRIAL_PRICING_ABORT_JERSEY_CATEGORY: expected one jersey category, received %',
      jersey_category_count;
  end if;

  select count(*)
  into conflicting_identity_count
  from canonical_trial_product_prices locked
  join public.products product
    on product.slug = locked.slug
    or upper(btrim(product.sku)) = locked.sku
  where locked.create_if_missing
    and not (
      product.slug = locked.slug
      and upper(btrim(product.sku)) = locked.sku
    );

  if conflicting_identity_count <> 0 then
    raise exception
      'CANONICAL_TRIAL_PRICING_ABORT_JERSEY_IDENTITY_CONFLICT: % conflicting product identities',
      conflicting_identity_count;
  end if;
end
$$;

insert into public.products (
  nama,
  name,
  kategori,
  subcategory,
  deskripsi,
  description,
  slug,
  sku,
  product_category_id,
  product_type,
  pricing_mode,
  sales_mode,
  tier_scope,
  uses_configurator,
  base_price,
  price,
  harga,
  price_label,
  link_url,
  config_schema,
  status,
  status_aktif,
  stock,
  admin_notes
)
select
  case locked.product_key
    when 'jersey_futsal_custom' then 'Jersey Futsal Custom'
    else 'Jersey Sepak Bola Custom'
  end,
  case locked.product_key
    when 'jersey_futsal_custom' then 'Jersey Futsal Custom'
    else 'Jersey Sepak Bola Custom'
  end,
  'Jersey',
  case locked.product_key
    when 'jersey_futsal_custom' then 'Futsal'
    else 'Sepak Bola'
  end,
  'Draft canonical trial base-price record for the Jersey Configurator.',
  'Draft canonical trial base-price record for the Jersey Configurator.',
  locked.slug,
  locked.sku,
  category.id,
  'configurable_product',
  'custom_quote',
  'custom',
  'none',
  true,
  locked.locked_price,
  locked.locked_price,
  locked.locked_price,
  'Harga dasar',
  '/jersey/configurator?product=' || locked.slug,
  jsonb_build_object('entry_type', 'jersey_configurator'),
  'draft',
  false,
  0,
  'OWNER OVERRIDE 2026-07-28: locked canonical trial base price. Draft only; publication still requires normal PIM review.'
from canonical_trial_product_prices locked
cross join public.product_categories category
where locked.create_if_missing
  and category.slug = 'jersey'
  and not exists (
    select 1
    from public.products existing
    where existing.slug = locked.slug
      and upper(btrim(existing.sku)) = locked.sku
  );

do $$
declare
  mapped_count integer;
begin
  select count(*)
  into mapped_count
  from canonical_trial_product_prices locked
  join public.products product
    on product.slug = locked.slug
   and upper(btrim(product.sku)) = locked.sku;

  if mapped_count <> 12 then
    raise exception
      'CANONICAL_TRIAL_PRICING_ABORT_PRODUCT_COUNT: expected 12 canonical products, received %',
      mapped_count;
  end if;
end
$$;

update public.products product
set
  base_price = locked.locked_price,
  price = locked.locked_price,
  harga = locked.locked_price,
  updated_at = now()
from canonical_trial_product_prices locked
where product.slug = locked.slug
  and upper(btrim(product.sku)) = locked.sku
  and (
    product.base_price is distinct from locked.locked_price
    or product.price is distinct from locked.locked_price
    or product.harga is distinct from locked.locked_price
  );

update public.products
set
  image_url = '/products/crewneck/black/front.webp',
  gambar_url = '/products/crewneck/black/front.webp',
  image_alt = 'Crewneck hitam DEBRODER',
  object_fit = 'contain',
  object_position = 'center center',
  updated_at = now()
where slug = 'crewneck'
  and upper(btrim(sku)) = 'DBR-CREWNECK'
  and (
    image_url is distinct from '/products/crewneck/black/front.webp'
    or gambar_url is distinct from '/products/crewneck/black/front.webp'
    or image_alt is distinct from 'Crewneck hitam DEBRODER'
    or object_fit is distinct from 'contain'
    or object_position is distinct from 'center center'
  );

do $$
declare
  kaos_category_count integer;
  size_design_count integer;
begin
  select count(*)
  into kaos_category_count
  from public.custom_categories
  where slug = 'kaos-polos';

  if kaos_category_count <> 1 then
    raise exception
      'CANONICAL_TRIAL_PRICING_ABORT_CUSTOM_CATEGORY: expected one kaos-polos Custom category, received %',
      kaos_category_count;
  end if;

  select count(*)
  into size_design_count
  from public.custom_print_sizes size_design
  join public.custom_categories category
    on category.id = size_design.custom_category_id
  where category.slug = 'kaos-polos'
    and size_design.slug in ('a4', 'a3');

  if size_design_count <> 2 then
    raise exception
      'CANONICAL_TRIAL_PRICING_ABORT_SIZE_DESAIN: expected A4 and A3, received % records',
      size_design_count;
  end if;
end
$$;

update public.custom_categories
set
  price_display_mode = 'final',
  updated_at = now()
where slug = 'kaos-polos'
  and price_display_mode is distinct from 'final';

do $$
declare
  canonical_service_count integer;
begin
  select count(*)
  into canonical_service_count
  from public.custom_services
  where slug = 'sablon-dtf';

  if canonical_service_count <> 1 then
    raise exception
      'CANONICAL_TRIAL_PRICING_ABORT_CUSTOM_SERVICE: expected one sablon-dtf service, received %',
      canonical_service_count;
  end if;
end
$$;

update public.custom_services
set
  pricing_type = 'fixed_per_item',
  base_price = 20000,
  estimated_min_price = null,
  estimated_max_price = null,
  requires_review = false,
  updated_at = now()
where slug = 'sablon-dtf'
  and (
    pricing_type is distinct from 'fixed_per_item'
    or base_price is distinct from 20000
    or estimated_min_price is not null
    or estimated_max_price is not null
    or requires_review
  );

update public.custom_placements placement
set
  price_adjustment = 0,
  updated_at = now()
from public.custom_categories category
where category.id = placement.custom_category_id
  and category.slug = 'kaos-polos'
  and placement.price_adjustment is distinct from 0;

update public.custom_print_sizes size_design
set
  price_adjustment = case size_design.slug
    when 'a4' then 20000
    when 'a3' then 25000
  end,
  updated_at = now()
from public.custom_categories category
where category.id = size_design.custom_category_id
  and category.slug = 'kaos-polos'
  and size_design.slug in ('a4', 'a3')
  and size_design.price_adjustment is distinct from case size_design.slug
    when 'a4' then 20000
    when 'a3' then 25000
  end;

update public.services
set
  harga_mulai = case slug
    when 'sablon-dtf-a4' then 20000
    when 'sablon-dtf-a3' then 25000
  end,
  updated_at = now()
where slug in ('sablon-dtf-a4', 'sablon-dtf-a3')
  and harga_mulai is distinct from case slug
    when 'sablon-dtf-a4' then 20000
    when 'sablon-dtf-a3' then 25000
  end;

insert into public.services (
  nama,
  slug,
  category_key,
  deskripsi,
  detail_body,
  harga_mulai,
  urutan,
  status_aktif
)
select
  'Sablon DTF Meteran',
  'sablon-dtf-meteran',
  'sablon-dtf',
  'Layanan cetak DTF meteran untuk kebutuhan produksi.',
  'Harga canonical trial dihitung per meter.',
  30000,
  4,
  true
where not exists (
  select 1
  from public.services
  where slug = 'sablon-dtf-meteran'
);

update public.services
set
  harga_mulai = 30000,
  updated_at = now()
where slug = 'sablon-dtf-meteran'
  and harga_mulai is distinct from 30000;

do $$
declare
  product_mismatch_count integer;
  product_image_mismatch_count integer;
  position_mismatch_count integer;
  size_mismatch_count integer;
  meteran_count integer;
begin
  select count(*)
  into product_mismatch_count
  from canonical_trial_product_prices locked
  left join public.products product
    on product.slug = locked.slug
   and upper(btrim(product.sku)) = locked.sku
  where product.id is null
    or product.base_price is distinct from locked.locked_price
    or product.price is distinct from locked.locked_price
    or product.harga is distinct from locked.locked_price;

  select count(*)
  into product_image_mismatch_count
  from public.products
  where slug = 'crewneck'
    and upper(btrim(sku)) = 'DBR-CREWNECK'
    and (
      image_url is distinct from '/products/crewneck/black/front.webp'
      or gambar_url is distinct from '/products/crewneck/black/front.webp'
      or image_alt is distinct from 'Crewneck hitam DEBRODER'
      or object_fit is distinct from 'contain'
      or object_position is distinct from 'center center'
    );

  select count(*)
  into position_mismatch_count
  from public.custom_placements placement
  join public.custom_categories category
    on category.id = placement.custom_category_id
  where category.slug = 'kaos-polos'
    and placement.price_adjustment is distinct from 0;

  select count(*)
  into size_mismatch_count
  from public.custom_print_sizes size_design
  join public.custom_categories category
    on category.id = size_design.custom_category_id
  where category.slug = 'kaos-polos'
    and (
      (size_design.slug = 'a4' and size_design.price_adjustment is distinct from 20000)
      or (size_design.slug = 'a3' and size_design.price_adjustment is distinct from 25000)
    );

  select count(*)
  into meteran_count
  from public.services
  where slug = 'sablon-dtf-meteran'
    and harga_mulai = 30000;

  if product_mismatch_count <> 0
     or product_image_mismatch_count <> 0
     or position_mismatch_count <> 0
     or size_mismatch_count <> 0
     or meteran_count <> 1 then
    raise exception
      'CANONICAL_TRIAL_PRICING_ABORT_POSTCHECK: products %, product image %, positions %, sizes %, meteran %',
      product_mismatch_count,
      product_image_mismatch_count,
      position_mismatch_count,
      size_mismatch_count,
      meteran_count;
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
values (
  'commerce_pricing',
  'canonical_trial_pricing_v1_applied',
  'owner',
  'migration',
  'Owner-authorized locked canonical trial product, Size Desain, Posisi Desain, and DTF Meteran prices.',
  jsonb_build_object(
    'product_price_count', 12,
    'size_design_prices', jsonb_build_object('a4', 20000, 'a3', 25000),
    'meteran_price', 30000,
    'custom_service_pricing_type', 'fixed_per_item',
    'position_adjustment', 0,
    'activated_primary_product_image', '/products/crewneck/black/front.webp',
    'ambiguous_product_images_activated', 0,
    'rls_changed', false,
    'historical_orders_changed', false
  )
);

commit;
