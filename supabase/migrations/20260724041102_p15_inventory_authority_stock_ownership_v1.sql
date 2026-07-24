begin;

set local lock_timeout = '10s';
set local statement_timeout = '120s';

-- P15 canonical authority:
--   SKU/variant-size x active business location
--   available = on_hand - reserved
-- Existing location balances are never overwritten. The provisional 20-unit
-- demo seed only fills missing active-SKU/location pairs.

alter table public.stock_reservations
  add column if not exists location_id uuid,
  add column if not exists restored_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'stock_reservations_location_id_fkey'
      and conrelid = 'public.stock_reservations'::regclass
  ) then
    alter table public.stock_reservations
      add constraint stock_reservations_location_id_fkey
      foreign key (location_id)
      references public.inventory_locations(id)
      on delete restrict;
  end if;
end
$$;

-- Historical pickup reservations have a proven store location. Historical
-- shipping reservations have no location evidence and remain attached to the
-- read-only legacy location instead of guessing a real store.
update public.stock_reservations reservation
set location_id = coalesce(
  (
    select preparation.location_id
    from public.pickup_preparations preparation
    where preparation.order_id = reservation.order_id
    order by preparation.created_at desc
    limit 1
  ),
  (
    select location.id
    from public.inventory_locations location
    where location.code = 'LEGACY-SYSTEM'
    limit 1
  )
)
where reservation.location_id is null;

do $$
begin
  if exists (
    select 1
    from public.stock_reservations
    where location_id is null
  ) then
    raise exception 'P15 cannot prove a location for every historical reservation';
  end if;
end
$$;

alter table public.stock_reservations
  alter column location_id set not null;

alter table public.stock_reservations
  drop constraint if exists stock_reservations_order_item_id_key;

alter table public.stock_reservations
  drop constraint if exists stock_reservations_status_check;

alter table public.stock_reservations
  add constraint stock_reservations_status_check
  check (status in ('active', 'released', 'consumed', 'restored'));

create unique index if not exists stock_reservations_active_item_location_unique
  on public.stock_reservations(order_item_id, location_id)
  where status = 'active';

create index if not exists stock_reservations_location_variant_status_idx
  on public.stock_reservations(location_id, variant_size_id, status, expires_at);

alter table public.inventory_movements
  add column if not exists reservation_id uuid,
  add column if not exists on_hand_after integer,
  add column if not exists reserved_after integer,
  add column if not exists available_after integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'inventory_movements_reservation_id_fkey'
      and conrelid = 'public.inventory_movements'::regclass
  ) then
    alter table public.inventory_movements
      add constraint inventory_movements_reservation_id_fkey
      foreign key (reservation_id)
      references public.stock_reservations(id)
      on delete restrict;
  end if;
  if not exists (
    select 1
    from pg_constraint
    where conname = 'inventory_movements_p15_snapshot_check'
      and conrelid = 'public.inventory_movements'::regclass
  ) then
    alter table public.inventory_movements
      add constraint inventory_movements_p15_snapshot_check
      check (
        (on_hand_after is null or on_hand_after >= 0)
        and (reserved_after is null or reserved_after >= 0)
        and (
          available_after is null
          or available_after = on_hand_after - reserved_after
        )
      );
  end if;
end
$$;

create index if not exists inventory_movements_reservation_idx
  on public.inventory_movements(reservation_id, created_at desc)
  where reservation_id is not null;

-- Seed only missing rows. Existing real balances, including zero and reserved
-- balances, are preserved exactly.
with inserted_balance as (
  insert into public.inventory_balances(
    location_id,
    variant_size_id,
    on_hand_quantity,
    reserved_quantity
  )
  select
    location.id,
    sellable.id,
    20,
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
  on conflict(location_id, variant_size_id) do nothing
  returning location_id, variant_size_id, on_hand_quantity,
    reserved_quantity, available_quantity
)
insert into public.inventory_movements(
  idempotency_key,
  variant_size_id,
  location_id,
  movement_type,
  quantity_delta,
  balance_after,
  on_hand_after,
  reserved_after,
  available_after,
  reason
)
select
  format(
    'p15:provisional:%s:%s',
    inserted.location_id,
    inserted.variant_size_id
  ),
  inserted.variant_size_id,
  inserted.location_id,
  'initial',
  inserted.on_hand_quantity,
  inserted.on_hand_quantity,
  inserted.on_hand_quantity,
  inserted.reserved_quantity,
  inserted.available_quantity,
  'P15 provisional demo stock; missing balance only'
from inserted_balance inserted
on conflict(idempotency_key) do nothing;

create or replace function public.sync_product_stock_from_inventory_v1(
  p_variant_size_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  aggregate_on_hand integer := 0;
  previous_skip text;
begin
  select coalesce(sum(balance.on_hand_quantity), 0)::integer
  into aggregate_on_hand
  from public.inventory_balances balance
  join public.inventory_locations location
    on location.id = balance.location_id
  where balance.variant_size_id = p_variant_size_id
    and location.active
    and location.location_type <> 'legacy';

  previous_skip := current_setting(
    'debroder.skip_inventory_legacy_sync',
    true
  );
  perform set_config('debroder.skip_inventory_legacy_sync', '1', true);

  update public.product_variant_sizes
  set stock = aggregate_on_hand,
      stock_quantity = aggregate_on_hand,
      updated_at = now()
  where id = p_variant_size_id
    and (
      coalesce(stock, 0) <> aggregate_on_hand
      or coalesce(stock_quantity, 0) <> aggregate_on_hand
    );

  perform set_config(
    'debroder.skip_inventory_legacy_sync',
    coalesce(previous_skip, ''),
    true
  );
  return aggregate_on_hand;
end
$$;

revoke all on function public.sync_product_stock_from_inventory_v1(uuid)
  from public, anon, authenticated;
grant execute on function public.sync_product_stock_from_inventory_v1(uuid)
  to service_role;

create or replace function public.sync_product_stock_from_inventory_trigger_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform public.sync_product_stock_from_inventory_v1(
      old.variant_size_id
    );
    return old;
  end if;
  perform public.sync_product_stock_from_inventory_v1(
    new.variant_size_id
  );
  return new;
end
$$;

revoke all on function public.sync_product_stock_from_inventory_trigger_v1()
  from public, anon, authenticated;
grant execute on function public.sync_product_stock_from_inventory_trigger_v1()
  to service_role;

drop trigger if exists sync_product_stock_from_inventory_v1
  on public.inventory_balances;
create trigger sync_product_stock_from_inventory_v1
after insert or delete or update of on_hand_quantity
on public.inventory_balances
for each row
execute function public.sync_product_stock_from_inventory_trigger_v1();

do $$
declare
  sellable record;
begin
  for sellable in
    select distinct balance.variant_size_id
    from public.inventory_balances balance
    join public.inventory_locations location
      on location.id = balance.location_id
    where location.active
      and location.location_type <> 'legacy'
    order by balance.variant_size_id
  loop
    perform public.sync_product_stock_from_inventory_v1(
      sellable.variant_size_id
    );
  end loop;
end
$$;

create or replace function public.inventory_available_stock_v1(
  p_variant_size_id uuid,
  p_location_id uuid default null
)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(balance.on_hand_quantity - balance.reserved_quantity), 0)::integer
  from public.inventory_balances balance
  join public.inventory_locations location
    on location.id = balance.location_id
  where balance.variant_size_id = p_variant_size_id
    and location.active
    and location.location_type <> 'legacy'
    and (p_location_id is null or balance.location_id = p_location_id)
$$;

revoke all on function public.inventory_available_stock_v1(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.inventory_available_stock_v1(uuid, uuid)
  to service_role;

create or replace function public.inventory_order_item_is_mapped_v1(
  p_order_item_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.order_items item
    join public.product_variant_sizes sellable
      on sellable.id = item.variant_size_id
    where item.id = p_order_item_id
      and item.variant_size_id is not null
      and nullif(btrim(coalesce(item.sku, '')), '') is not null
      and item.sku = sellable.sku
  )
$$;

revoke all on function public.inventory_order_item_is_mapped_v1(uuid)
  from public, anon, authenticated;
grant execute on function public.inventory_order_item_is_mapped_v1(uuid)
  to service_role;

create or replace function public.inventory_location_available_for_order_v1(
  p_location_id uuid,
  p_variant_size_id uuid,
  p_order_id uuid default null
)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(balance.on_hand_quantity - balance.reserved_quantity, 0)
  from public.inventory_balances balance
  join public.inventory_locations location
    on location.id = balance.location_id
  where balance.location_id = p_location_id
    and balance.variant_size_id = p_variant_size_id
    and location.active
    and location.location_type <> 'legacy'
$$;

revoke all on function public.inventory_location_available_for_order_v1(
  uuid, uuid, uuid
) from public, anon, authenticated;
grant execute on function public.inventory_location_available_for_order_v1(
  uuid, uuid, uuid
) to service_role;

create or replace function public.reserve_public_order_stock(
  p_order_id uuid,
  p_duration interval,
  p_actor uuid default null
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  order_value public.orders;
  item_value record;
  balance_value record;
  updated_balance public.inventory_balances;
  reservation_value public.stock_reservations;
  expiry_value timestamptz := now() + p_duration;
  mapped_count integer := 0;
  remaining_quantity integer;
  allocated_quantity integer;
  reservation_count integer := 0;
begin
  if p_duration < interval '1 hour'
     or p_duration > interval '7 days' then
    raise exception 'Durasi reservasi tidak valid';
  end if;

  select *
  into order_value
  from public.orders
  where id = p_order_id
    and archived_at is null
  for update;

  if not found then
    raise exception 'Order tidak ditemukan';
  end if;
  if order_value.status in (
    'cancelled', 'dibatalkan', 'expired', 'completed', 'selesai'
  ) then
    raise exception 'Order terminal tidak dapat mereservasi stok';
  end if;

  if exists (
    select 1
    from public.order_items item
    where item.order_id = p_order_id
      and item.archived_at is null
      and item.variant_size_id is not null
      and not public.inventory_order_item_is_mapped_v1(item.id)
  ) then
    raise exception 'Mapping SKU inventory pada order item tidak valid';
  end if;

  select count(*)::integer
  into mapped_count
  from public.order_items item
  where item.order_id = p_order_id
    and item.archived_at is null
    and public.inventory_order_item_is_mapped_v1(item.id);

  if mapped_count = 0 then
    return expiry_value;
  end if;

  if exists (
    select 1
    from public.stock_reservations reservation
    where reservation.order_id = p_order_id
      and reservation.status = 'active'
      and reservation.expires_at <= now()
  ) then
    perform public.release_public_order_stock(
      p_order_id,
      'Reservasi kedaluwarsa sebelum alokasi ulang',
      p_actor
    );
  end if;

  if exists (
    select 1
    from public.stock_reservations reservation
    where reservation.order_id = p_order_id
      and reservation.status = 'active'
      and reservation.expires_at > now()
  ) then
    if exists (
      select 1
      from public.order_items item
      where item.order_id = p_order_id
        and item.archived_at is null
        and public.inventory_order_item_is_mapped_v1(item.id)
        and (
          select coalesce(sum(reservation.quantity), 0)
          from public.stock_reservations reservation
          where reservation.order_item_id = item.id
            and reservation.status = 'active'
            and reservation.expires_at > now()
        ) <> item.quantity
    ) then
      raise exception 'Reservasi existing tidak cocok dengan quantity order';
    end if;

    update public.stock_reservations
    set expires_at = expiry_value,
        extended_at = now(),
        updated_by = p_actor,
        updated_at = now()
    where order_id = p_order_id
      and status = 'active'
      and expires_at > now();

    update public.orders
    set reservation_expires_at = expiry_value,
        updated_at = now(),
        updated_by = p_actor
    where id = p_order_id;

    return expiry_value;
  end if;

  for item_value in
    select
      item.id,
      item.variant_size_id,
      item.sku,
      item.quantity
    from public.order_items item
    where item.order_id = p_order_id
      and item.archived_at is null
      and public.inventory_order_item_is_mapped_v1(item.id)
    order by item.variant_size_id, item.id
  loop
    remaining_quantity := item_value.quantity;

    for balance_value in
      select
        balance.location_id,
        balance.variant_size_id,
        balance.on_hand_quantity,
        balance.reserved_quantity,
        balance.available_quantity
      from public.inventory_balances balance
      join public.inventory_locations location
        on location.id = balance.location_id
      where balance.variant_size_id = item_value.variant_size_id
        and location.active
        and location.location_type in ('store', 'warehouse')
        and (
          order_value.delivery_method <> 'pickup'
          or location.store_id = order_value.pickup_location_id
        )
        and balance.available_quantity > 0
      order by balance.location_id
      for update of balance
    loop
      exit when remaining_quantity = 0;
      allocated_quantity := least(
        remaining_quantity,
        balance_value.available_quantity
      );

      insert into public.stock_reservations(
        order_id,
        order_item_id,
        variant_size_id,
        location_id,
        sku_snapshot,
        quantity,
        status,
        expires_at,
        created_by,
        updated_by
      )
      values(
        p_order_id,
        item_value.id,
        item_value.variant_size_id,
        balance_value.location_id,
        item_value.sku,
        allocated_quantity,
        'active',
        expiry_value,
        p_actor,
        p_actor
      )
      returning * into reservation_value;

      update public.inventory_balances
      set reserved_quantity = reserved_quantity + allocated_quantity,
          updated_at = now(),
          updated_by = p_actor
      where location_id = balance_value.location_id
        and variant_size_id = item_value.variant_size_id
      returning * into updated_balance;

      insert into public.inventory_movements(
        idempotency_key,
        reservation_id,
        variant_size_id,
        location_id,
        order_id,
        movement_type,
        quantity_delta,
        balance_after,
        on_hand_after,
        reserved_after,
        available_after,
        reason,
        created_by
      )
      values(
        format('stock-reservation:%s:reserve', reservation_value.id),
        reservation_value.id,
        item_value.variant_size_id,
        balance_value.location_id,
        p_order_id,
        'reserve',
        -allocated_quantity,
        updated_balance.available_quantity,
        updated_balance.on_hand_quantity,
        updated_balance.reserved_quantity,
        updated_balance.available_quantity,
        'Reservasi Ready Stock',
        p_actor
      );

      remaining_quantity := remaining_quantity - allocated_quantity;
      reservation_count := reservation_count + 1;
    end loop;

    if remaining_quantity > 0 then
      raise exception 'Stok SKU % tidak mencukupi pada lokasi authority',
        item_value.sku;
    end if;
  end loop;

  update public.orders
  set reservation_expires_at = expiry_value,
      updated_at = now(),
      updated_by = p_actor
  where id = p_order_id;

  insert into public.system_audit_log(
    entity_type,
    entity_id,
    action,
    actor_id,
    actor_role,
    source,
    new_value,
    metadata
  )
  values(
    'order',
    p_order_id,
    'stock_reserved',
    p_actor,
    case
      when p_actor is null then 'customer'
      else public.current_actor_role()
    end,
    'p15_inventory',
    jsonb_build_object('expires_at', expiry_value),
    jsonb_build_object(
      'reservation_count',
      reservation_count,
      'duration_seconds',
      extract(epoch from p_duration)
    )
  );

  return expiry_value;
end
$$;

create or replace function public.release_public_order_stock(
  p_order_id uuid,
  p_reason text,
  p_actor uuid default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  reservation_value public.stock_reservations;
  balance_value public.inventory_balances;
  released_count integer := 0;
begin
  perform 1
  from public.orders
  where id = p_order_id
  for update;

  for reservation_value in
    select *
    from public.stock_reservations
    where order_id = p_order_id
      and status = 'active'
    order by variant_size_id, location_id, id
    for update
  loop
    select *
    into balance_value
    from public.inventory_balances
    where location_id = reservation_value.location_id
      and variant_size_id = reservation_value.variant_size_id
    for update;

    if not found
       or balance_value.reserved_quantity < reservation_value.quantity then
      raise exception 'Saldo reserved inventory tidak konsisten saat release';
    end if;

    update public.inventory_balances
    set reserved_quantity = reserved_quantity - reservation_value.quantity,
        updated_at = now(),
        updated_by = p_actor
    where location_id = reservation_value.location_id
      and variant_size_id = reservation_value.variant_size_id
    returning * into balance_value;

    update public.stock_reservations
    set status = 'released',
        released_at = now(),
        extension_reason = nullif(btrim(coalesce(p_reason, '')), ''),
        updated_by = p_actor,
        updated_at = now()
    where id = reservation_value.id;

    insert into public.inventory_movements(
      idempotency_key,
      reservation_id,
      variant_size_id,
      location_id,
      order_id,
      movement_type,
      quantity_delta,
      balance_after,
      on_hand_after,
      reserved_after,
      available_after,
      reason,
      created_by
    )
    values(
      format('stock-reservation:%s:release', reservation_value.id),
      reservation_value.id,
      reservation_value.variant_size_id,
      reservation_value.location_id,
      p_order_id,
      'release',
      reservation_value.quantity,
      balance_value.available_quantity,
      balance_value.on_hand_quantity,
      balance_value.reserved_quantity,
      balance_value.available_quantity,
      coalesce(
        nullif(btrim(coalesce(p_reason, '')), ''),
        'Reservasi dilepas'
      ),
      p_actor
    )
    on conflict(idempotency_key) do nothing;

    released_count := released_count + 1;
  end loop;

  update public.orders
  set reservation_expires_at = null,
      updated_at = now(),
      updated_by = p_actor
  where id = p_order_id;

  if released_count > 0 then
    insert into public.system_audit_log(
      entity_type,
      entity_id,
      action,
      actor_id,
      actor_role,
      source,
      reason,
      new_value
    )
    values(
      'order',
      p_order_id,
      'stock_released',
      p_actor,
      case
        when p_actor is null then 'system'
        else public.current_actor_role()
      end,
      'p15_inventory',
      nullif(btrim(coalesce(p_reason, '')), ''),
      jsonb_build_object('reservation_count', released_count)
    );
  end if;

  return released_count;
end
$$;

create or replace function public.consume_paid_order_stock(
  p_order_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  order_value public.orders;
  reservation_value public.stock_reservations;
  balance_value public.inventory_balances;
  active_count integer;
  consumed_count integer := 0;
begin
  select *
  into order_value
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;
  if order_value.archived_at is not null
     or order_value.status in ('cancelled', 'dibatalkan', 'expired') then
    raise exception 'Cancelled, expired, or archived order cannot consume stock';
  end if;
  if order_value.payment_status not in ('paid', 'terverifikasi')
     and not order_value.payment_production_eligible then
    raise exception 'Paid order required before stock consumption';
  end if;

  select count(*)::integer
  into active_count
  from public.stock_reservations
  where order_id = p_order_id
    and status = 'active';

  if active_count = 0 then
    if exists (
      select 1
      from public.stock_reservations
      where order_id = p_order_id
        and status = 'consumed'
    ) and not exists (
      select 1
      from public.stock_reservations
      where order_id = p_order_id
        and status in ('released', 'restored')
    ) then
      return 0;
    end if;
    if not exists (
      select 1
      from public.order_items item
      where item.order_id = p_order_id
        and item.archived_at is null
        and public.inventory_order_item_is_mapped_v1(item.id)
    ) then
      return 0;
    end if;
    raise exception 'Valid stock reservation is required before consumption';
  end if;

  if exists (
    select 1
    from public.stock_reservations
    where order_id = p_order_id
      and status = 'active'
      and expires_at <= now()
  ) then
    raise exception 'Expired reservation cannot be consumed';
  end if;

  for reservation_value in
    select *
    from public.stock_reservations
    where order_id = p_order_id
      and status = 'active'
    order by variant_size_id, location_id, id
    for update
  loop
    select *
    into balance_value
    from public.inventory_balances
    where location_id = reservation_value.location_id
      and variant_size_id = reservation_value.variant_size_id
    for update;

    if not found
       or balance_value.reserved_quantity < reservation_value.quantity
       or balance_value.on_hand_quantity < reservation_value.quantity then
      raise exception 'Inventory balance is insufficient for consumption';
    end if;

    update public.inventory_balances
    set on_hand_quantity = on_hand_quantity - reservation_value.quantity,
        reserved_quantity = reserved_quantity - reservation_value.quantity,
        updated_at = now()
    where location_id = reservation_value.location_id
      and variant_size_id = reservation_value.variant_size_id
    returning * into balance_value;

    update public.stock_reservations
    set status = 'consumed',
        consumed_at = now(),
        updated_at = now()
    where id = reservation_value.id;

    insert into public.inventory_movements(
      idempotency_key,
      reservation_id,
      variant_size_id,
      location_id,
      order_id,
      movement_type,
      quantity_delta,
      balance_after,
      on_hand_after,
      reserved_after,
      available_after,
      reason
    )
    values(
      format('stock-reservation:%s:consume', reservation_value.id),
      reservation_value.id,
      reservation_value.variant_size_id,
      reservation_value.location_id,
      p_order_id,
      'consume',
      -reservation_value.quantity,
      balance_value.on_hand_quantity,
      balance_value.on_hand_quantity,
      balance_value.reserved_quantity,
      balance_value.available_quantity,
      'Ready Stock deducted after payment authority'
    )
    on conflict(idempotency_key) do nothing;

    consumed_count := consumed_count + 1;
  end loop;

  update public.orders
  set reservation_expires_at = null,
      updated_at = now()
  where id = p_order_id;

  if consumed_count > 0 then
    insert into public.system_audit_log(
      entity_type,
      entity_id,
      action,
      actor_role,
      source,
      new_value
    )
    values(
      'order',
      p_order_id,
      'stock_sold',
      'system',
      'p15_inventory',
      jsonb_build_object('reservation_count', consumed_count)
    );
  end if;

  return consumed_count;
end
$$;

create or replace function public.restore_refunded_order_stock_v1(
  p_order_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  reservation_value public.stock_reservations;
  balance_value public.inventory_balances;
  preparation_value public.pickup_preparations;
  restored_count integer := 0;
  released_count integer := 0;
begin
  perform 1
  from public.orders
  where id = p_order_id
  for update;

  for reservation_value in
    select *
    from public.stock_reservations
    where order_id = p_order_id
      and status = 'consumed'
    order by variant_size_id, location_id, id
    for update
  loop
    select *
    into balance_value
    from public.inventory_balances
    where location_id = reservation_value.location_id
      and variant_size_id = reservation_value.variant_size_id
    for update;

    if not found then
      raise exception 'Inventory balance is missing for stock restoration';
    end if;

    update public.inventory_balances
    set on_hand_quantity = on_hand_quantity + reservation_value.quantity,
        updated_at = now(),
        updated_by = auth.uid()
    where location_id = reservation_value.location_id
      and variant_size_id = reservation_value.variant_size_id
    returning * into balance_value;

    update public.stock_reservations
    set status = 'restored',
        restored_at = now(),
        released_at = coalesce(released_at, now()),
        extension_reason = coalesce(
          nullif(btrim(coalesce(p_reason, '')), ''),
          'Dipulihkan setelah refund'
        ),
        updated_at = now(),
        updated_by = auth.uid()
    where id = reservation_value.id;

    insert into public.inventory_movements(
      idempotency_key,
      reservation_id,
      variant_size_id,
      location_id,
      order_id,
      movement_type,
      quantity_delta,
      balance_after,
      on_hand_after,
      reserved_after,
      available_after,
      reason,
      created_by
    )
    values(
      format('stock-reservation:%s:restore', reservation_value.id),
      reservation_value.id,
      reservation_value.variant_size_id,
      reservation_value.location_id,
      p_order_id,
      'restore',
      reservation_value.quantity,
      balance_value.on_hand_quantity,
      balance_value.on_hand_quantity,
      balance_value.reserved_quantity,
      balance_value.available_quantity,
      coalesce(
        nullif(btrim(coalesce(p_reason, '')), ''),
        'Stok dipulihkan setelah refund'
      ),
      auth.uid()
    )
    on conflict(idempotency_key) do nothing;

    restored_count := restored_count + 1;
  end loop;

  if exists (
    select 1
    from public.stock_reservations
    where order_id = p_order_id
      and status = 'active'
  ) then
    released_count := public.release_public_order_stock(
      p_order_id,
      p_reason,
      auth.uid()
    );
  end if;

  select *
  into preparation_value
  from public.pickup_preparations
  where order_id = p_order_id
  for update;

  if found then
    update public.pickup_preparation_items
    set reserved_quantity = 0
    where preparation_id = preparation_value.id
      and reserved_quantity <> 0;

    update public.pickup_preparations
    set status = 'cancelled',
        released_at = coalesce(released_at, now()),
        updated_at = now(),
        updated_by = auth.uid()
    where id = preparation_value.id
      and status <> 'handed_over';
  end if;

  return jsonb_build_object(
    'restored_reservations',
    restored_count,
    'released_reservations',
    released_count
  );
end
$$;

create or replace function public.reserve_pickup_stock_v1(
  p_preparation_id uuid
)
returns public.pickup_preparations
language plpgsql
security definer
set search_path = ''
as $$
declare
  preparation_value public.pickup_preparations;
  order_value public.orders;
  item_value record;
  proven_quantity integer;
  all_proven boolean := true;
begin
  select *
  into preparation_value
  from public.pickup_preparations
  where id = p_preparation_id
  for update;

  if not found then
    raise exception 'Persiapan pickup tidak ditemukan';
  end if;

  select *
  into order_value
  from public.orders
  where id = preparation_value.order_id
  for update;

  if not found then
    raise exception 'Pesanan pickup tidak ditemukan';
  end if;
  if order_value.status in (
    'completed', 'selesai', 'cancelled', 'dibatalkan', 'expired'
  ) or preparation_value.status in ('handed_over', 'cancelled') then
    raise exception 'Pesanan terminal tidak dapat diproses sebagai pickup';
  end if;

  for item_value in
    select *
    from public.pickup_preparation_items
    where preparation_id = p_preparation_id
    order by variant_size_id, id
    for update
  loop
    select coalesce(sum(reservation.quantity), 0)::integer
    into proven_quantity
    from public.stock_reservations reservation
    where reservation.order_item_id = item_value.order_item_id
      and reservation.location_id = preparation_value.location_id
      and reservation.status in ('active', 'consumed');

    proven_quantity := least(proven_quantity, item_value.required_quantity);

    update public.pickup_preparation_items
    set reserved_quantity = proven_quantity
    where id = item_value.id;

    if proven_quantity < item_value.required_quantity then
      all_proven := false;
    end if;
  end loop;

  update public.pickup_preparations
  set status = case
        when all_proven then 'checking'
        else 'transfer_required'
      end,
      updated_at = now(),
      updated_by = auth.uid()
  where id = p_preparation_id
    and status not in (
      'ready_for_pickup',
      'no_show',
      'handed_over',
      'cancelled',
      'in_transfer'
    )
  returning * into preparation_value;

  return preparation_value;
end
$$;

create or replace function public.complete_pickup_handover_v1(
  p_preparation_id uuid,
  p_note text default null
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  preparation_value public.pickup_preparations;
  order_value public.orders;
  fulfillment_value public.fulfillments;
  payment_id uuid;
  old_status text;
begin
  if not public.has_permission('shipping.complete')
     and not public.has_permission('operations.manage') then
    raise exception 'Tidak berwenang menyelesaikan pickup';
  end if;

  select *
  into preparation_value
  from public.pickup_preparations
  where id = p_preparation_id
  for update;

  if not found then
    raise exception 'Persiapan pickup tidak ditemukan';
  end if;

  select *
  into order_value
  from public.orders
  where id = preparation_value.order_id
  for update;

  if not found then
    raise exception 'Pesanan pickup tidak ditemukan';
  end if;
  old_status := order_value.status;

  select *
  into fulfillment_value
  from public.fulfillments
  where id = preparation_value.fulfillment_id
  for update;

  if not found then
    raise exception 'Fulfillment pickup tidak ditemukan';
  end if;

  if preparation_value.status = 'handed_over'
     or order_value.status in ('completed', 'selesai')
     or fulfillment_value.status = 'picked_up' then
    if exists (
      select 1
      from public.stock_reservations reservation
      where reservation.order_id = order_value.id
        and reservation.status = 'active'
    ) then
      raise exception 'Pesanan terminal masih memiliki reservasi aktif';
    end if;

    update public.pickup_preparations
    set status = 'handed_over',
        updated_at = now(),
        updated_by = auth.uid()
    where id = preparation_value.id
      and status <> 'handed_over';

    update public.fulfillments
    set status = 'picked_up',
        picked_up_at = coalesce(picked_up_at, now()),
        updated_at = now(),
        updated_by = auth.uid(),
        notes = concat_ws(
          E'\n',
          notes,
          nullif(btrim(coalesce(p_note, '')), '')
        )
    where id = fulfillment_value.id
      and status <> 'picked_up';

    update public.orders
    set status = 'completed',
        updated_at = now(),
        updated_by = auth.uid()
    where id = order_value.id
      and status not in ('completed', 'selesai')
    returning * into order_value;

    if order_value.id is null then
      select *
      into order_value
      from public.orders
      where id = preparation_value.order_id;
    end if;

    perform public.sync_order_handoff_v2(order_value.id, null);
    return order_value;
  end if;

  if preparation_value.status not in ('ready_for_pickup', 'no_show') then
    raise exception 'Pickup belum siap diserahkan';
  end if;

  if order_value.payment_method = 'pay_at_store'
     and not exists (
       select 1
       from public.order_payments
       where order_id = order_value.id
         and archived_at is null
         and (
           status = 'verified'
           or review_outcome = 'verified'
         )
     ) then
    insert into public.order_payments(
      order_id,
      amount,
      reported_amount,
      paid_at,
      method,
      channel_name,
      reference_number,
      status,
      submission_source,
      review_outcome,
      check_funds_received,
      check_destination_account,
      check_amount,
      check_transaction_time,
      check_reference_unique,
      verified_amount,
      verified_destination_account,
      verified_transaction_at,
      verified_reference,
      verified_at,
      verified_by,
      reviewed_at,
      reviewed_by,
      admin_notes,
      created_by,
      updated_by
    )
    values(
      order_value.id,
      order_value.total_amount::bigint,
      order_value.total_amount::bigint,
      now(),
      'cash',
      'Toko',
      format(
        'CASH-%s-%s',
        order_value.order_number,
        to_char(now(), 'YYYYMMDDHH24MISS')
      ),
      'verified',
      'admin',
      'verified',
      true,
      true,
      true,
      true,
      true,
      order_value.total_amount::bigint,
      'Kas Toko',
      now(),
      format('CASH-%s', order_value.order_number),
      now(),
      auth.uid(),
      now(),
      auth.uid(),
      coalesce(
        nullif(btrim(coalesce(p_note, '')), ''),
        'Pembayaran tunai diterima saat pickup'
      ),
      auth.uid(),
      auth.uid()
    )
    returning id into payment_id;

    perform public.refresh_order_payment_summary(order_value.id);

    select *
    into order_value
    from public.orders
    where id = order_value.id
    for update;
  end if;

  if not coalesce(order_value.payment_production_eligible, false) then
    raise exception 'Pembayaran belum memenuhi syarat';
  end if;

  -- Payment verification may already have consumed the reservations. The
  -- operation is idempotent and never deducts a location twice.
  perform public.consume_paid_order_stock(order_value.id);

  if exists (
    select 1
    from public.stock_reservations
    where order_id = order_value.id
      and status = 'active'
  ) then
    raise exception 'Konsumsi stok pickup belum selesai';
  end if;

  update public.pickup_preparation_items
  set reserved_quantity = 0
  where preparation_id = preparation_value.id
    and reserved_quantity <> 0;

  update public.pickup_preparations
  set status = 'handed_over',
      updated_at = now(),
      updated_by = auth.uid()
  where id = preparation_value.id;

  update public.fulfillments
  set status = 'picked_up',
      picked_up_at = coalesce(picked_up_at, now()),
      updated_at = now(),
      updated_by = auth.uid(),
      notes = concat_ws(
        E'\n',
        notes,
        nullif(btrim(coalesce(p_note, '')), '')
      )
  where id = fulfillment_value.id;

  update public.orders
  set status = 'completed',
      updated_at = now(),
      updated_by = auth.uid()
  where id = order_value.id
  returning * into order_value;

  if old_status not in ('completed', 'selesai') then
    insert into public.order_status_history(
      order_id,
      from_status,
      to_status,
      note,
      changed_by
    )
    values(
      order_value.id,
      old_status,
      'completed',
      coalesce(
        nullif(btrim(coalesce(p_note, '')), ''),
        'Pickup selesai'
      ),
      auth.uid()
    );
  end if;

  perform public.sync_order_handoff_v2(order_value.id, null);
  return order_value;
end
$$;

create or replace function public.expire_public_commerce_orders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  order_value record;
  expired_count integer := 0;
begin
  for order_value in
    select order_row.id, order_row.status
    from public.orders order_row
    where order_row.archived_at is null
      and order_row.payment_status not in (
        'paid', 'terverifikasi', 'refunded'
      )
      and (
        (
          order_row.status = 'pending_confirmation'
          and order_row.whatsapp_confirmation_expires_at <= now()
        )
        or exists (
          select 1
          from public.stock_reservations reservation
          where reservation.order_id = order_row.id
            and reservation.status = 'active'
            and reservation.expires_at <= now()
        )
      )
    order by order_row.id
    for update of order_row skip locked
  loop
    perform public.release_public_order_stock(
      order_value.id,
      'Kedaluwarsa otomatis',
      null
    );

    if order_value.status in (
      'pending_confirmation', 'processing', 'awaiting_payment'
    ) then
      update public.orders
      set status = 'expired',
          payment_status = 'expired',
          updated_at = now()
      where id = order_value.id;

      insert into public.order_status_history(
        order_id,
        from_status,
        to_status,
        note
      )
      values(
        order_value.id,
        order_value.status,
        'expired',
        'Batas verifikasi atau pembayaran berakhir; reservasi dilepas.'
      );

      expired_count := expired_count + 1;
    end if;
  end loop;

  return expired_count;
end
$$;

create or replace function public.reserve_checkout_stock_on_creation_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  order_value public.orders;
begin
  if new.from_status is null
     and new.to_status = 'pending_confirmation' then
    select *
    into order_value
    from public.orders
    where id = new.order_id;

    if found
       and order_value.checkout_source = 'public_checkout'
       and exists (
         select 1
         from public.order_items item
         where item.order_id = new.order_id
           and item.archived_at is null
           and public.inventory_order_item_is_mapped_v1(item.id)
       ) then
      perform public.reserve_public_order_stock(
        new.order_id,
        interval '1 hour',
        null
      );
    end if;
  end if;
  return new;
end
$$;

revoke all on function public.reserve_checkout_stock_on_creation_v1()
  from public, anon, authenticated;
grant execute on function public.reserve_checkout_stock_on_creation_v1()
  to service_role;

drop trigger if exists reserve_checkout_stock_on_creation_v1
  on public.order_status_history;
create trigger reserve_checkout_stock_on_creation_v1
after insert on public.order_status_history
for each row
execute function public.reserve_checkout_stock_on_creation_v1();

revoke all on function public.reserve_public_order_stock(
  uuid, interval, uuid
) from public, anon, authenticated;
grant execute on function public.reserve_public_order_stock(
  uuid, interval, uuid
) to service_role;

revoke all on function public.release_public_order_stock(
  uuid, text, uuid
) from public, anon, authenticated;
grant execute on function public.release_public_order_stock(
  uuid, text, uuid
) to service_role;

revoke all on function public.consume_paid_order_stock(uuid)
  from public, anon, authenticated;
grant execute on function public.consume_paid_order_stock(uuid)
  to service_role;

revoke all on function public.restore_refunded_order_stock_v1(uuid, text)
  from public, anon, authenticated;
grant execute on function public.restore_refunded_order_stock_v1(uuid, text)
  to service_role;

revoke all on function public.reserve_pickup_stock_v1(uuid)
  from public, anon, authenticated;
grant execute on function public.reserve_pickup_stock_v1(uuid)
  to service_role;

revoke all on function public.complete_pickup_handover_v1(uuid, text)
  from public, anon;
grant execute on function public.complete_pickup_handover_v1(uuid, text)
  to authenticated, service_role;

revoke all on function public.expire_public_commerce_orders()
  from public, anon, authenticated;
grant execute on function public.expire_public_commerce_orders()
  to service_role;

alter table public.stock_reservations enable row level security;
alter table public.inventory_balances enable row level security;
alter table public.inventory_movements enable row level security;

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
  'p15_inventory_authority_applied',
  'system',
  'p15_inventory',
  'SKU/location inventory authority and transactional stock lifecycle enabled',
  jsonb_build_object(
    'available_formula', 'on_hand-reserved',
    'provisional_units', 20,
    'existing_balances_overwritten', false,
    'custom_requires_explicit_sku_mapping', true
  )
);

commit;
