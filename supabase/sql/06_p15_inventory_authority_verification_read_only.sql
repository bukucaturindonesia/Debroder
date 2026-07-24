-- P15 read-only verification. Every result must be zero/true as labelled.

select count(*) as invalid_balance_count
from public.inventory_balances
where on_hand_quantity < 0
   or reserved_quantity < 0
   or reserved_quantity > on_hand_quantity
   or available_quantity <> on_hand_quantity - reserved_quantity;

with active_sellables as (
  select sellable.id
  from public.product_variant_sizes sellable
  join public.product_variants variant on variant.id = sellable.variant_id
  join public.products product on product.id = variant.product_id
  where product.status = 'active'
    and coalesce(product.status_aktif, true)
    and variant.status = 'active'
    and coalesce(variant.is_active, true)
    and sellable.status = 'active'
    and coalesce(sellable.is_active, true)
),
active_locations as (
  select id
  from public.inventory_locations
  where active
    and location_type <> 'legacy'
)
select count(*) as missing_active_sku_location_balance_count
from active_locations location
cross join active_sellables sellable
left join public.inventory_balances balance
  on balance.location_id = location.id
 and balance.variant_size_id = sellable.id
where balance.location_id is null;

select count(*) as reservation_without_location_count
from public.stock_reservations
where location_id is null;

with active_reserved as (
  select
    location_id,
    variant_size_id,
    sum(quantity)::integer as quantity
  from public.stock_reservations
  where status = 'active'
  group by location_id, variant_size_id
)
select count(*) as reservation_balance_mismatch_count
from public.inventory_balances balance
left join active_reserved reservation
  on reservation.location_id = balance.location_id
 and reservation.variant_size_id = balance.variant_size_id
where balance.reserved_quantity <> coalesce(reservation.quantity, 0);

with location_on_hand as (
  select
    balance.variant_size_id,
    sum(balance.on_hand_quantity)::integer as quantity
  from public.inventory_balances balance
  join public.inventory_locations location on location.id = balance.location_id
  where location.active
    and location.location_type <> 'legacy'
  group by balance.variant_size_id
)
select count(*) as compatibility_projection_mismatch_count
from location_on_hand authority
join public.product_variant_sizes sellable
  on sellable.id = authority.variant_size_id
where coalesce(sellable.stock_quantity, sellable.stock, 0)
  <> authority.quantity;

select count(*) as active_custom_without_exact_mapping_reservation_count
from public.stock_reservations reservation
join public.order_items item on item.id = reservation.order_item_id
join public.product_variant_sizes sellable
  on sellable.id = reservation.variant_size_id
where reservation.status = 'active'
  and (
    item.variant_size_id is null
    or nullif(btrim(coalesce(item.sku, '')), '') is null
    or item.sku <> sellable.sku
  );

select
  relname,
  relrowsecurity as rls_enabled
from pg_class
where oid in (
  'public.inventory_balances'::regclass,
  'public.inventory_movements'::regclass,
  'public.stock_reservations'::regclass
)
order by relname;

select
  p.proname,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE')
    as authenticated_execute,
  has_function_privilege('service_role', p.oid, 'EXECUTE')
    as service_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'reserve_public_order_stock',
    'release_public_order_stock',
    'consume_paid_order_stock',
    'restore_refunded_order_stock_v1',
    'inventory_available_stock_v1'
  )
order by p.proname;
