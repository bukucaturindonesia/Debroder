set local lock_timeout = '10s';
set local statement_timeout = '90s';

create or replace function public.consume_paid_order_stock(
  p_order_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
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
    if not exists (
      select 1
      from public.order_items item
      where item.order_id = p_order_id
        and item.archived_at is null
        and public.inventory_order_item_is_mapped_v1(item.id)
    ) then
      return 0;
    end if;

    if not exists (
      select 1
      from public.order_items item
      where item.order_id = p_order_id
        and item.archived_at is null
        and public.inventory_order_item_is_mapped_v1(item.id)
        and coalesce((
          select sum(reservation.quantity)
          from public.stock_reservations reservation
          where reservation.order_item_id = item.id
            and reservation.status = 'consumed'
        ), 0) <> item.quantity
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
$function$;

revoke all on function public.consume_paid_order_stock(uuid)
  from public, anon, authenticated;
grant execute on function public.consume_paid_order_stock(uuid)
  to service_role;

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
  'p15_consume_idempotency_corrected',
  'system',
  'p15_inventory',
  'Consume idempotency now validates exact consumed coverage per mapped order item',
  jsonb_build_object(
    'correction', 'ignore unrelated released/restored reservation history',
    'coverage_rule', 'consumed quantity must equal mapped order item quantity'
  )
);
