begin;

set local lock_timeout = '10s';
set local statement_timeout = '120s';

create or replace function public.ensure_active_inventory_balance_matrix_v1(
  p_product_id uuid default null,
  p_variant_id uuid default null,
  p_variant_size_id uuid default null,
  p_location_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  inserted_count integer := 0;
begin
  with inserted as (
    insert into public.inventory_balances(
      location_id,
      variant_size_id,
      on_hand_quantity,
      reserved_quantity
    )
    select
      location.id,
      sellable.id,
      0,
      0
    from public.inventory_locations location
    cross join public.product_variant_sizes sellable
    join public.product_variants variant
      on variant.id = sellable.variant_id
    join public.products product
      on product.id = variant.product_id
    where location.active
      and location.location_type <> 'legacy'
      and product.status = 'active'
      and coalesce(product.status_aktif, true)
      and variant.status = 'active'
      and coalesce(variant.is_active, true)
      and sellable.status = 'active'
      and coalesce(sellable.is_active, true)
      and (p_product_id is null or product.id = p_product_id)
      and (p_variant_id is null or variant.id = p_variant_id)
      and (p_variant_size_id is null or sellable.id = p_variant_size_id)
      and (p_location_id is null or location.id = p_location_id)
    on conflict(location_id, variant_size_id) do nothing
    returning 1
  )
  select count(*)::integer
  into inserted_count
  from inserted;

  return inserted_count;
end
$function$;

revoke all on function public.ensure_active_inventory_balance_matrix_v1(
  uuid,
  uuid,
  uuid,
  uuid
) from public, anon, authenticated;
grant execute on function public.ensure_active_inventory_balance_matrix_v1(
  uuid,
  uuid,
  uuid,
  uuid
) to service_role;

create or replace function public.ensure_sellable_inventory_balance_matrix_trigger_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform public.ensure_active_inventory_balance_matrix_v1(
    null,
    null,
    new.id,
    null
  );
  return new;
end
$function$;

create or replace function public.ensure_variant_inventory_balance_matrix_trigger_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform public.ensure_active_inventory_balance_matrix_v1(
    null,
    new.id,
    null,
    null
  );
  return new;
end
$function$;

create or replace function public.ensure_product_inventory_balance_matrix_trigger_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform public.ensure_active_inventory_balance_matrix_v1(
    new.id,
    null,
    null,
    null
  );
  return new;
end
$function$;

create or replace function public.ensure_location_inventory_balance_matrix_trigger_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform public.ensure_active_inventory_balance_matrix_v1(
    null,
    null,
    null,
    new.id
  );
  return new;
end
$function$;

revoke all on function public.ensure_sellable_inventory_balance_matrix_trigger_v1()
  from public, anon, authenticated;
revoke all on function public.ensure_variant_inventory_balance_matrix_trigger_v1()
  from public, anon, authenticated;
revoke all on function public.ensure_product_inventory_balance_matrix_trigger_v1()
  from public, anon, authenticated;
revoke all on function public.ensure_location_inventory_balance_matrix_trigger_v1()
  from public, anon, authenticated;

do $p15_apply$
declare
  missing_count integer := 0;
  cohort_fingerprint text;
  inserted_count integer := 0;
  before_on_hand bigint := 0;
  before_reserved bigint := 0;
  after_on_hand bigint := 0;
  after_reserved bigint := 0;
  remaining_missing integer := 0;
begin
  with active_sellables as (
    select sellable.id as variant_size_id
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
    select id as location_id
    from public.inventory_locations
    where active
      and location_type <> 'legacy'
  ),
  missing as (
    select location.location_id, sellable.variant_size_id
    from active_locations location
    cross join active_sellables sellable
    left join public.inventory_balances balance
      on balance.location_id = location.location_id
     and balance.variant_size_id = sellable.variant_size_id
    where balance.location_id is null
  )
  select
    count(*)::integer,
    md5(string_agg(
      location_id::text || ':' || variant_size_id::text,
      ','
      order by location_id, variant_size_id
    ))
  into missing_count, cohort_fingerprint
  from missing;

  if missing_count <> 96
     or cohort_fingerprint is distinct from '0487ad98308bf4a7265752e364c54e4d' then
    raise exception
      'P15 zero-balance cohort drift: count %, fingerprint %',
      missing_count,
      cohort_fingerprint;
  end if;

  select
    coalesce(sum(balance.on_hand_quantity), 0),
    coalesce(sum(balance.reserved_quantity), 0)
  into before_on_hand, before_reserved
  from public.inventory_balances balance
  join public.inventory_locations location
    on location.id = balance.location_id
  where location.active
    and location.location_type <> 'legacy';

  inserted_count := public.ensure_active_inventory_balance_matrix_v1();

  if inserted_count <> missing_count then
    raise exception
      'P15 zero-balance insertion mismatch: expected %, inserted %',
      missing_count,
      inserted_count;
  end if;

  select
    coalesce(sum(balance.on_hand_quantity), 0),
    coalesce(sum(balance.reserved_quantity), 0)
  into after_on_hand, after_reserved
  from public.inventory_balances balance
  join public.inventory_locations location
    on location.id = balance.location_id
  where location.active
    and location.location_type <> 'legacy';

  if before_on_hand <> after_on_hand
     or before_reserved <> after_reserved then
    raise exception
      'P15 zero-balance completion changed inventory totals';
  end if;

  with active_sellables as (
    select sellable.id as variant_size_id
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
    select id as location_id
    from public.inventory_locations
    where active
      and location_type <> 'legacy'
  )
  select count(*)::integer
  into remaining_missing
  from active_locations location
  cross join active_sellables sellable
  left join public.inventory_balances balance
    on balance.location_id = location.location_id
   and balance.variant_size_id = sellable.variant_size_id
  where balance.location_id is null;

  if remaining_missing <> 0 then
    raise exception
      'P15 zero-balance matrix remains incomplete: %',
      remaining_missing;
  end if;

  insert into public.system_audit_log(
    entity_type,
    action,
    actor_role,
    source,
    reason,
    metadata
  )
  values(
    'inventory_authority',
    'p15_zero_balance_matrix_completed',
    'system',
    'p15_inventory',
    'Missing active SKU and active store balance rows initialized at zero without changing stock totals',
    jsonb_build_object(
      'inserted_balance_count', inserted_count,
      'cohort_fingerprint', cohort_fingerprint,
      'before_on_hand', before_on_hand,
      'after_on_hand', after_on_hand,
      'before_reserved', before_reserved,
      'after_reserved', after_reserved,
      'initial_on_hand_per_row', 0,
      'initial_reserved_per_row', 0
    )
  );
end
$p15_apply$;

drop trigger if exists ensure_sellable_inventory_balance_matrix_v1
  on public.product_variant_sizes;
create trigger ensure_sellable_inventory_balance_matrix_v1
after insert or update of variant_id, status, is_active
on public.product_variant_sizes
for each row
execute function public.ensure_sellable_inventory_balance_matrix_trigger_v1();

drop trigger if exists ensure_variant_inventory_balance_matrix_v1
  on public.product_variants;
create trigger ensure_variant_inventory_balance_matrix_v1
after insert or update of product_id, status, is_active
on public.product_variants
for each row
execute function public.ensure_variant_inventory_balance_matrix_trigger_v1();

drop trigger if exists ensure_product_inventory_balance_matrix_v1
  on public.products;
create trigger ensure_product_inventory_balance_matrix_v1
after insert or update of status, status_aktif
on public.products
for each row
execute function public.ensure_product_inventory_balance_matrix_trigger_v1();

drop trigger if exists ensure_location_inventory_balance_matrix_v1
  on public.inventory_locations;
create trigger ensure_location_inventory_balance_matrix_v1
after insert or update of active, location_type
on public.inventory_locations
for each row
execute function public.ensure_location_inventory_balance_matrix_trigger_v1();

commit;
