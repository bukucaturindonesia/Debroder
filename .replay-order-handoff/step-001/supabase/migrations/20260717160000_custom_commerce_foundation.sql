begin;

create extension if not exists pgcrypto;

create table if not exists public.custom_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  short_description text,
  image_url text,
  image_alt text,
  entry_type text not null default 'project_builder' check (entry_type in ('project_builder','jersey_configurator')),
  target_route text,
  supports_quick_custom boolean not null default false,
  supports_full_custom boolean not null default true,
  price_display_mode text not null default 'final' check (price_display_mode in ('final','estimated','quotation')),
  minimum_order_display text not null check (btrim(minimum_order_display) <> ''),
  lead_time_display text not null check (btrim(lead_time_display) <> ''),
  source_product_category_id uuid references public.product_categories(id) on delete set null,
  seo_title text,
  seo_description text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint custom_categories_entry_target_check check (
    (entry_type = 'project_builder' and (supports_quick_custom or supports_full_custom))
    or (entry_type = 'jersey_configurator' and target_route ~ '^/[^/]')
  )
);

create table if not exists public.custom_category_products (
  id uuid primary key default gen_random_uuid(),
  custom_category_id uuid not null references public.custom_categories(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  is_default boolean not null default false,
  compatibility_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(compatibility_metadata) = 'object'),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(custom_category_id,product_id)
);

create unique index if not exists custom_category_products_one_default_idx
  on public.custom_category_products(custom_category_id) where is_default and is_active;

create table if not exists public.custom_presets (
  id uuid primary key default gen_random_uuid(),
  custom_category_id uuid not null references public.custom_categories(id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  short_description text,
  mockup_url text,
  mockup_alt text,
  default_product_id uuid references public.products(id) on delete set null,
  configuration_defaults jsonb not null default '{}'::jsonb check (jsonb_typeof(configuration_defaults) = 'object'),
  price_display_mode text check (price_display_mode in ('final','estimated','quotation')),
  minimum_order_display text,
  lead_time_display text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(custom_category_id,slug)
);

create table if not exists public.custom_placements (
  id uuid primary key default gen_random_uuid(),
  custom_category_id uuid not null references public.custom_categories(id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  price_adjustment integer not null default 0 check (price_adjustment >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(custom_category_id,slug)
);

create table if not exists public.custom_print_sizes (
  id uuid primary key default gen_random_uuid(),
  custom_category_id uuid not null references public.custom_categories(id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  width_mm numeric check (width_mm is null or width_mm > 0),
  height_mm numeric check (height_mm is null or height_mm > 0),
  price_adjustment integer not null default 0 check (price_adjustment >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(custom_category_id,slug)
);

create table if not exists public.custom_service_compatibilities (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.custom_services(id) on delete cascade,
  custom_category_id uuid references public.custom_categories(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  placement_id uuid references public.custom_placements(id) on delete cascade,
  print_size_id uuid references public.custom_print_sizes(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint custom_service_compat_scope_check check (custom_category_id is not null or product_id is not null)
);

create unique index if not exists custom_service_compatibilities_unique_idx
  on public.custom_service_compatibilities(
    service_id,
    coalesce(custom_category_id,'00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(product_id,'00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(placement_id,'00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(print_size_id,'00000000-0000-0000-0000-000000000000'::uuid)
  );

create table if not exists public.custom_personalization_rules (
  id uuid primary key default gen_random_uuid(),
  custom_category_id uuid not null references public.custom_categories(id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  pricing_type text not null check (pricing_type in ('fixed_per_item','fixed_per_order','estimated','manual_quote')),
  unit_price integer check (unit_price is null or unit_price >= 0),
  flat_price integer check (flat_price is null or flat_price >= 0),
  estimated_min_price integer check (estimated_min_price is null or estimated_min_price >= 0),
  estimated_max_price integer check (estimated_max_price is null or estimated_max_price >= 0),
  quote_required boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(custom_category_id,slug)
);

alter table public.orders
  add column if not exists custom_project_snapshot jsonb not null default '[]'::jsonb,
  add column if not exists pricing_status text not null default 'final';

alter table public.orders drop constraint if exists orders_pricing_status_check;
alter table public.orders add constraint orders_pricing_status_check
  check (pricing_status in ('final','estimated','quotation_required'));
alter table public.orders drop constraint if exists orders_custom_project_snapshot_check;
alter table public.orders add constraint orders_custom_project_snapshot_check
  check (jsonb_typeof(custom_project_snapshot) = 'array');

alter table public.order_items
  add column if not exists custom_project_id text,
  add column if not exists custom_project_item_id text,
  add column if not exists pricing_status text not null default 'final';

alter table public.order_items drop constraint if exists order_items_pricing_status_check;
alter table public.order_items add constraint order_items_pricing_status_check
  check (pricing_status in ('final','estimated','quotation_required'));

alter table public.customer_uploads
  add column if not exists linked_order_id uuid references public.orders(id) on delete set null,
  add column if not exists linked_order_item_id uuid references public.order_items(id) on delete set null;

create index if not exists custom_categories_public_idx on public.custom_categories(status,is_active,sort_order);
create index if not exists custom_category_products_public_idx on public.custom_category_products(custom_category_id,is_active,sort_order);
create index if not exists custom_presets_public_idx on public.custom_presets(custom_category_id,status,is_active,sort_order);
create index if not exists custom_placements_public_idx on public.custom_placements(custom_category_id,is_active,sort_order);
create index if not exists custom_print_sizes_public_idx on public.custom_print_sizes(custom_category_id,is_active,sort_order);
create index if not exists custom_service_compat_public_idx on public.custom_service_compatibilities(custom_category_id,product_id,service_id) where is_active;
create index if not exists custom_personalization_public_idx on public.custom_personalization_rules(custom_category_id,is_active,sort_order);
create index if not exists order_items_custom_project_idx on public.order_items(custom_project_id,custom_project_item_id) where custom_project_id is not null;
create index if not exists customer_uploads_linked_order_idx on public.customer_uploads(linked_order_id) where linked_order_id is not null;

drop trigger if exists set_custom_categories_updated_at on public.custom_categories;
create trigger set_custom_categories_updated_at before update on public.custom_categories for each row execute function public.set_updated_at();
drop trigger if exists set_custom_category_products_updated_at on public.custom_category_products;
create trigger set_custom_category_products_updated_at before update on public.custom_category_products for each row execute function public.set_updated_at();
drop trigger if exists set_custom_presets_updated_at on public.custom_presets;
create trigger set_custom_presets_updated_at before update on public.custom_presets for each row execute function public.set_updated_at();
drop trigger if exists set_custom_placements_updated_at on public.custom_placements;
create trigger set_custom_placements_updated_at before update on public.custom_placements for each row execute function public.set_updated_at();
drop trigger if exists set_custom_print_sizes_updated_at on public.custom_print_sizes;
create trigger set_custom_print_sizes_updated_at before update on public.custom_print_sizes for each row execute function public.set_updated_at();
drop trigger if exists set_custom_service_compatibilities_updated_at on public.custom_service_compatibilities;
create trigger set_custom_service_compatibilities_updated_at before update on public.custom_service_compatibilities for each row execute function public.set_updated_at();
drop trigger if exists set_custom_personalization_rules_updated_at on public.custom_personalization_rules;
create trigger set_custom_personalization_rules_updated_at before update on public.custom_personalization_rules for each row execute function public.set_updated_at();

alter table public.custom_categories enable row level security;
alter table public.custom_category_products enable row level security;
alter table public.custom_presets enable row level security;
alter table public.custom_placements enable row level security;
alter table public.custom_print_sizes enable row level security;
alter table public.custom_service_compatibilities enable row level security;
alter table public.custom_personalization_rules enable row level security;

create policy "Public read published custom categories" on public.custom_categories for select to anon,authenticated using(status='published' and is_active);
create policy "Public read active custom product mappings" on public.custom_category_products for select to anon,authenticated using(is_active and exists(select 1 from public.custom_categories category where category.id=custom_category_id and category.status='published' and category.is_active) and exists(select 1 from public.products product where product.id=product_id and product.status='active' and product.status_aktif));
create policy "Public read published custom presets" on public.custom_presets for select to anon,authenticated using(status='published' and is_active and exists(select 1 from public.custom_categories category where category.id=custom_category_id and category.status='published' and category.is_active));
create policy "Public read active custom placements" on public.custom_placements for select to anon,authenticated using(is_active and exists(select 1 from public.custom_categories category where category.id=custom_category_id and category.status='published' and category.is_active));
create policy "Public read active custom print sizes" on public.custom_print_sizes for select to anon,authenticated using(is_active and exists(select 1 from public.custom_categories category where category.id=custom_category_id and category.status='published' and category.is_active));
create policy "Public read active custom compatibility" on public.custom_service_compatibilities for select to anon,authenticated using(
  is_active
  and exists(select 1 from public.custom_services service where service.id=service_id and service.status='active')
  and (custom_category_id is null or exists(select 1 from public.custom_categories category where category.id=custom_category_id and category.status='published' and category.is_active))
  and (product_id is null or exists(select 1 from public.products product where product.id=product_id and product.status='active' and product.status_aktif))
);
create policy "Public read active personalization" on public.custom_personalization_rules for select to anon,authenticated using(is_active and exists(select 1 from public.custom_categories category where category.id=custom_category_id and category.status='published' and category.is_active));

create policy "Staff manage custom categories" on public.custom_categories for all to authenticated using(public.has_staff_role(array['owner','super_admin','sales_admin'])) with check(public.has_staff_role(array['owner','super_admin','sales_admin']));
create policy "Staff manage custom product mappings" on public.custom_category_products for all to authenticated using(public.has_staff_role(array['owner','super_admin','sales_admin'])) with check(public.has_staff_role(array['owner','super_admin','sales_admin']));
create policy "Staff manage custom presets" on public.custom_presets for all to authenticated using(public.has_staff_role(array['owner','super_admin','sales_admin'])) with check(public.has_staff_role(array['owner','super_admin','sales_admin']));
create policy "Staff manage custom placements" on public.custom_placements for all to authenticated using(public.has_staff_role(array['owner','super_admin','sales_admin'])) with check(public.has_staff_role(array['owner','super_admin','sales_admin']));
create policy "Staff manage custom print sizes" on public.custom_print_sizes for all to authenticated using(public.has_staff_role(array['owner','super_admin','sales_admin'])) with check(public.has_staff_role(array['owner','super_admin','sales_admin']));
create policy "Staff manage custom compatibility" on public.custom_service_compatibilities for all to authenticated using(public.has_staff_role(array['owner','super_admin','sales_admin'])) with check(public.has_staff_role(array['owner','super_admin','sales_admin']));
create policy "Staff manage personalization" on public.custom_personalization_rules for all to authenticated using(public.has_staff_role(array['owner','super_admin','sales_admin'])) with check(public.has_staff_role(array['owner','super_admin','sales_admin']));

revoke all on public.custom_categories,public.custom_category_products,public.custom_presets,public.custom_placements,public.custom_print_sizes,public.custom_service_compatibilities,public.custom_personalization_rules from public,anon,authenticated;
grant select on public.custom_categories,public.custom_category_products,public.custom_presets,public.custom_placements,public.custom_print_sizes,public.custom_service_compatibilities,public.custom_personalization_rules to anon,authenticated;
grant insert,update,delete on public.custom_categories,public.custom_category_products,public.custom_presets,public.custom_placements,public.custom_print_sizes,public.custom_service_compatibilities,public.custom_personalization_rules to authenticated;
grant all on public.custom_categories,public.custom_category_products,public.custom_presets,public.custom_placements,public.custom_print_sizes,public.custom_service_compatibilities,public.custom_personalization_rules to service_role;

create or replace function public.create_public_custom_checkout_order(
  p_idempotency_key text,
  p_access_token_hash text,
  p_whatsapp_confirmation_hash text,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_delivery_method text,
  p_shipping_address text,
  p_pickup_location_id uuid,
  p_payment_method text,
  p_customer_notes text,
  p_items jsonb,
  p_custom_projects jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_order public.orders;
  new_order_id uuid := gen_random_uuid();
  new_order_number text;
  normalized_phone text := regexp_replace(coalesce(p_customer_phone,''),'[^0-9]','','g');
  ready_item jsonb;
  project_value jsonb;
  project_item jsonb;
  allocation jsonb;
  upload_value jsonb;
  pricing_line jsonb;
  product_row record;
  tier_row record;
  ready_quantity integer;
  product_total_quantity integer;
  active_reserved integer;
  unit_price_value bigint;
  item_subtotal bigint;
  subtotal_value bigint := 0;
  ready_subtotal bigint := 0;
  custom_final_total bigint := 0;
  order_item_id uuid;
  active_unpaid integer;
  project_id_value text;
  project_item_id_value text;
  project_price_status text;
  order_price_status text := 'final';
  custom_snapshot jsonb := '[]'::jsonb;
begin
  if p_idempotency_key !~ '^[a-zA-Z0-9_-]{16,100}$' then raise exception 'Kunci checkout tidak valid'; end if;
  if p_access_token_hash !~ '^[0-9a-f]{64}$' or p_whatsapp_confirmation_hash !~ '^[0-9a-f]{64}$' then raise exception 'Token checkout tidak valid'; end if;
  select * into existing_order from public.orders where public_idempotency_key=p_idempotency_key;
  if found then return jsonb_build_object('order_id',existing_order.id,'order_number',existing_order.order_number,'status',existing_order.status); end if;

  if length(btrim(coalesce(p_customer_name,'')))<2 then raise exception 'Nama pelanggan tidak valid'; end if;
  if length(normalized_phone)<9 or length(normalized_phone)>15 then raise exception 'Nomor WhatsApp tidak valid'; end if;
  if nullif(btrim(coalesce(p_customer_email,'')),'') is not null and p_customer_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'Email tidak valid'; end if;
  if p_delivery_method not in ('pickup','shipping') then raise exception 'Metode fulfillment tidak valid'; end if;
  if p_delivery_method='shipping' and length(btrim(coalesce(p_shipping_address,'')))<10 then raise exception 'Alamat pengiriman wajib diisi lengkap'; end if;
  if p_delivery_method='pickup' and (p_pickup_location_id is null or not exists(select 1 from public.stores where id=p_pickup_location_id and status_aktif=true and coalesce(status,'published') in ('published','active'))) then raise exception 'Lokasi pickup tidak aktif'; end if;
  if p_payment_method not in ('bank_transfer','pay_at_store') or (p_delivery_method='shipping' and p_payment_method<>'bank_transfer') then raise exception 'Metode pembayaran tidak valid'; end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)>50 then raise exception 'Isi keranjang tidak valid'; end if;
  if jsonb_typeof(p_custom_projects)<>'array' or jsonb_array_length(p_custom_projects)<1 or jsonb_array_length(p_custom_projects)>5 then raise exception 'Custom Project tidak valid'; end if;
  if jsonb_array_length(p_items)=0 and jsonb_array_length(p_custom_projects)=0 then raise exception 'Isi keranjang tidak valid'; end if;
  if exists(select 1 from jsonb_array_elements(p_items) entry group by entry->>'variant_size_id' having count(*)>1) then raise exception 'Varian yang sama harus digabung dalam satu item'; end if;
  if exists(select 1 from jsonb_array_elements(p_custom_projects) entry group by entry->>'id' having count(*)>1) then raise exception 'Custom Project duplikat'; end if;

  select count(*) into active_unpaid from public.orders
  where regexp_replace(customer_phone,'[^0-9]','','g')=normalized_phone and archived_at is null
    and status not in ('completed','cancelled','expired','selesai','dibatalkan')
    and payment_status not in ('paid','terverifikasi','refunded');
  if active_unpaid>=2 then raise exception 'Maksimal dua pesanan belum dibayar per nomor WhatsApp'; end if;

  new_order_number := public.next_order_number();
  insert into public.orders(
    id,order_number,customer_name,customer_phone,customer_email,status,total_amount,subtotal_amount,
    customer_notes,delivery_method,shipping_address,payment_status,payment_requirement_type,
    payment_required_percentage,payment_method,pickup_location_id,public_idempotency_key,
    public_access_token_hash,whatsapp_confirmation_hash,whatsapp_confirmation_expires_at,
    checkout_source,source_snapshot,custom_project_snapshot,pricing_status
  ) values (
    new_order_id,new_order_number,btrim(p_customer_name),normalized_phone,nullif(btrim(coalesce(p_customer_email,'')),''),
    'pending_confirmation',0,0,left(btrim(coalesce(p_customer_notes,'')),2000),p_delivery_method,
    case when p_delivery_method='shipping' then btrim(p_shipping_address) else '' end,
    'unpaid','full',100,p_payment_method,p_pickup_location_id,p_idempotency_key,p_access_token_hash,
    p_whatsapp_confirmation_hash,now()+interval '60 minutes','public_checkout',
    jsonb_build_object('channel','web','checkout_version','custom_commerce_v1'),p_custom_projects,'final'
  );

  for ready_item in select value from jsonb_array_elements(p_items)
  loop
    if coalesce(ready_item->>'variant_size_id','') !~ '^[0-9a-fA-F-]{36}$' then raise exception 'Varian produk tidak valid'; end if;
    ready_quantity := (ready_item->>'quantity')::integer;
    if ready_quantity<1 or ready_quantity>100 then raise exception 'Quantity tidak valid'; end if;

    select p.id product_id,coalesce(nullif(p.name,''),p.nama) product_name,p.product_type,p.pricing_mode,
      coalesce(p.base_price,p.price,p.harga,0)::bigint base_price,pv.id variant_id,
      coalesce(nullif(pv.name,''),nullif(pv.color_name,''),pv.variant_name) variant_name,
      coalesce(nullif(pv.hex_code,''),pv.color_hex) color_hex,coalesce(pv.price_adjustment,0)::bigint variant_adjustment,
      pvs.id variant_size_id,pvs.size_name,pvs.sku,coalesce(pvs.stock_quantity,pvs.stock,0)::integer physical_stock,
      coalesce(pvs.price_adjustment,0)::bigint size_adjustment
    into product_row
    from public.product_variant_sizes pvs join public.product_variants pv on pv.id=pvs.variant_id join public.products p on p.id=pv.product_id
    where pvs.id=(ready_item->>'variant_size_id')::uuid and p.status='active' and p.status_aktif=true
      and pv.status='active' and pv.is_active=true and pvs.status='active' and pvs.is_active=true for update of pvs;
    if not found then raise exception 'Produk atau varian tidak lagi aktif'; end if;
    if product_row.pricing_mode in ('custom_quote','configurator_based') then raise exception 'Item custom harus melalui configurator'; end if;

    select coalesce(sum((entry->>'quantity')::integer),0)::integer into product_total_quantity
    from jsonb_array_elements(p_items) entry
    join public.product_variant_sizes grouped_size on grouped_size.id=(entry->>'variant_size_id')::uuid
    join public.product_variants grouped_variant on grouped_variant.id=grouped_size.variant_id
    where grouped_variant.product_id=product_row.product_id;
    select ppt.unit_price,ppt.quote_required into tier_row from public.product_price_tiers ppt
    where ppt.product_id=product_row.product_id and ppt.status='active' and product_total_quantity>=ppt.min_quantity
      and (ppt.max_quantity is null or product_total_quantity<=ppt.max_quantity) order by ppt.min_quantity desc limit 1;
    if found and tier_row.quote_required then raise exception 'Jumlah item memerlukan quotation'; end if;
    unit_price_value:=coalesce(tier_row.unit_price::bigint,product_row.base_price)+product_row.variant_adjustment+product_row.size_adjustment;
    if unit_price_value<0 then raise exception 'Harga produk tidak valid'; end if;
    select coalesce(sum(quantity),0)::integer into active_reserved from public.stock_reservations
      where variant_size_id=product_row.variant_size_id and status='active' and expires_at>now();
    if product_row.physical_stock-active_reserved<ready_quantity then raise exception 'Stok % tidak mencukupi',product_row.sku; end if;

    item_subtotal:=unit_price_value*ready_quantity;
    ready_subtotal:=ready_subtotal+item_subtotal;
    order_item_id:=gen_random_uuid();
    insert into public.order_items(id,order_id,product_id,product_name,product_type,variant_id,variant_size_id,variant_name,color,size,sku,quantity,unit_price,subtotal,notes,config_snapshot,pricing_status)
    values(order_item_id,new_order_id,product_row.product_id,product_row.product_name,coalesce(product_row.product_type,'standard_product'),product_row.variant_id,product_row.variant_size_id,
      product_row.variant_name,product_row.variant_name,product_row.size_name,product_row.sku,ready_quantity,unit_price_value,item_subtotal,
      left(coalesce(ready_item->>'note',''),1000),jsonb_build_object('product_name',product_row.product_name,'variant_name',product_row.variant_name,'size',product_row.size_name,'sku',product_row.sku,'unit_price',unit_price_value,'color_hex',product_row.color_hex),'final');
  end loop;

  for project_value in select value from jsonb_array_elements(p_custom_projects)
  loop
    project_id_value:=project_value->>'id';
    project_price_status:=project_value#>>'{pricing,status}';
    if project_id_value !~ '^[a-zA-Z0-9_-]{8,100}$' or project_price_status not in ('final','estimated','quotation_required') then raise exception 'Custom Project tidak valid'; end if;
    if jsonb_typeof(project_value->'items')<>'array' or jsonb_array_length(project_value->'items')<1 or jsonb_array_length(project_value->'items')>12 then raise exception 'Product Group tidak valid'; end if;
    if jsonb_typeof(project_value#>'{pricing,issues}')<>'array' or jsonb_array_length(project_value#>'{pricing,issues}')>0 then raise exception 'Custom Project memerlukan koreksi'; end if;
    if project_price_status='quotation_required' then order_price_status:='quotation_required';
    elsif project_price_status='estimated' and order_price_status='final' then order_price_status:='estimated'; end if;
    if project_price_status='final' then
      if jsonb_typeof(project_value#>'{pricing,finalTotal}')<>'number' then raise exception 'Harga Custom Project tidak valid'; end if;
      custom_final_total:=custom_final_total+(project_value#>>'{pricing,finalTotal}')::bigint;
    end if;
    custom_snapshot:=custom_snapshot||jsonb_build_array(project_value);

    for project_item in select value from jsonb_array_elements(project_value->'items')
    loop
      project_item_id_value:=project_item->>'id';
      if project_item_id_value !~ '^[a-zA-Z0-9_-]{8,100}$' or coalesce(project_item->>'productId','') !~ '^[0-9a-fA-F-]{36}$' then raise exception 'Product Group tidak valid'; end if;
      if jsonb_typeof(project_item->'allocations')<>'array' or jsonb_array_length(project_item->'allocations')<1 or jsonb_array_length(project_item->'allocations')>60 then raise exception 'Allocation tidak valid'; end if;
      for allocation in select value from jsonb_array_elements(project_item->'allocations')
      loop
        if coalesce(allocation->>'variantSizeId','') !~ '^[0-9a-fA-F-]{36}$' or coalesce(allocation->>'variantId','') !~ '^[0-9a-fA-F-]{36}$' then raise exception 'Allocation varian tidak valid'; end if;
        ready_quantity:=(allocation->>'quantity')::integer;
        if ready_quantity<1 or ready_quantity>1000 then raise exception 'Quantity custom tidak valid'; end if;
        select p.id product_id,coalesce(nullif(p.name,''),p.nama) product_name,p.product_type,pv.id variant_id,
          coalesce(nullif(pv.name,''),nullif(pv.color_name,''),pv.variant_name) variant_name,
          coalesce(nullif(pv.hex_code,''),pv.color_hex) color_hex,pvs.id variant_size_id,pvs.size_name,pvs.sku
        into product_row from public.product_variant_sizes pvs join public.product_variants pv on pv.id=pvs.variant_id join public.products p on p.id=pv.product_id
        where p.id=(project_item->>'productId')::uuid and pv.id=(allocation->>'variantId')::uuid and pvs.id=(allocation->>'variantSizeId')::uuid
          and p.status='active' and p.status_aktif=true and pv.status='active' and pv.is_active=true and pvs.status='active' and pvs.is_active=true;
        if not found or product_row.sku<>allocation->>'sku' then raise exception 'Produk custom atau SKU tidak lagi aktif'; end if;
        select value into pricing_line from jsonb_array_elements(project_value#>'{pricing,lines}')
          where value->>'key'='product:'||project_item_id_value||':'||(allocation->>'id') limit 1;
        if pricing_line is null or jsonb_typeof(pricing_line->'unitPrice')<>'number' then raise exception 'Pricing allocation tidak valid'; end if;
        unit_price_value:=(pricing_line->>'unitPrice')::bigint;
        item_subtotal:=unit_price_value*ready_quantity;
        order_item_id:=gen_random_uuid();
        insert into public.order_items(id,order_id,product_id,product_name,product_type,variant_id,variant_size_id,variant_name,color,size,sku,quantity,unit_price,subtotal,notes,config_snapshot,required_services,estimated_total,pricing_status,custom_project_id,custom_project_item_id)
        values(order_item_id,new_order_id,product_row.product_id,product_row.product_name,'configurable_product',product_row.variant_id,null,
          product_row.variant_name,product_row.variant_name,product_row.size_name,product_row.sku,ready_quantity,unit_price_value,item_subtotal,
          left(coalesce(project_item->>'note',''),1000),
          jsonb_build_object('configuration_version',project_value->'version','project_id',project_id_value,'project_item_id',project_item_id_value,
            'category',jsonb_build_object('id',project_item->'categoryId','name',project_item->'categoryName','slug',project_item->'categorySlug'),
            'product',jsonb_build_object('id',project_item->'productId','name',product_row.product_name,'slug',project_item->'productSlug'),
            'allocation',allocation,'design_packages',project_item->'designPackages','personalization',project_item->'personalization',
            'uploads',project_item->'uploads','lead_time',project_item->'leadTime','project_pricing',project_value->'pricing'),
          coalesce(project_item->'designPackages','[]'::jsonb),case when project_price_status='estimated' then item_subtotal else null end,
          project_price_status,project_id_value,project_item_id_value);
      end loop;

      for upload_value in select value from jsonb_array_elements(coalesce(project_item->'uploads','[]'::jsonb))
      loop
        update public.customer_uploads set status='linked',linked_order_id=new_order_id,updated_at=now()
        where id=(upload_value->>'id')::uuid and session_token=project_value->>'sessionToken'
          and storage_path=upload_value->>'storage_path' and status in ('uploaded','linked');
        if not found then raise exception 'Referensi upload tidak valid'; end if;
      end loop;
    end loop;
  end loop;

  subtotal_value:=ready_subtotal+custom_final_total;
  update public.orders set status=case when order_price_status='final' then 'pending_confirmation' else 'under_review' end,
    subtotal_amount=subtotal_value,total_amount=subtotal_value,
    payment_required_amount=case when order_price_status='final' then subtotal_value else 0 end,
    payment_balance=case when order_price_status='final' then subtotal_value else 0 end,
    pricing_status=order_price_status,custom_project_snapshot=custom_snapshot,updated_at=now()
  where id=new_order_id;

  insert into public.order_status_history(order_id,from_status,to_status,note)
  values(new_order_id,null,case when order_price_status='final' then 'pending_confirmation' else 'under_review' end,
    case when order_price_status='final' then 'Pesanan mixed/custom dibuat melalui guest checkout.' else 'Custom Project menunggu review harga atau approval.' end);
  insert into public.system_audit_log(entity_type,entity_id,action,actor_role,source,request_id,new_value)
  values('order',new_order_id,'public_custom_checkout_created','customer','custom_commerce',p_idempotency_key,
    jsonb_build_object('order_number',new_order_number,'ready_subtotal',ready_subtotal,'custom_final_total',custom_final_total,'pricing_status',order_price_status));
  return jsonb_build_object('order_id',new_order_id,'order_number',new_order_number,'status',case when order_price_status='final' then 'pending_confirmation' else 'under_review' end);
end;
$$;

revoke all on function public.create_public_custom_checkout_order(text,text,text,text,text,text,text,text,uuid,text,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.create_public_custom_checkout_order(text,text,text,text,text,text,text,text,uuid,text,text,jsonb,jsonb) to service_role;

commit;
