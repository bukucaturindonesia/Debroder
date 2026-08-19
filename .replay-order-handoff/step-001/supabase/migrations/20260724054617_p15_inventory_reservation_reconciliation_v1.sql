set local lock_timeout = '10s';
set local statement_timeout = '60s';

do $p15_reconcile$
declare
  row_value record;
  reconciled_count integer := 0;
  delta_value integer;
begin
  for row_value in
    with active_reserved as (
      select location_id, variant_size_id, sum(quantity)::integer as quantity
      from public.stock_reservations
      where status = 'active'
      group by location_id, variant_size_id
    )
    select
      balance.location_id,
      balance.variant_size_id,
      balance.on_hand_quantity,
      balance.reserved_quantity as old_reserved,
      coalesce(reservation.quantity, 0) as actual_reserved
    from public.inventory_balances balance
    left join active_reserved reservation
      on reservation.location_id = balance.location_id
     and reservation.variant_size_id = balance.variant_size_id
    where balance.reserved_quantity <> coalesce(reservation.quantity, 0)
    order by balance.location_id, balance.variant_size_id
    for update of balance
  loop
    if row_value.actual_reserved < 0
       or row_value.actual_reserved > row_value.on_hand_quantity then
      raise exception 'P15 reconciliation would create invalid inventory balance';
    end if;

    delta_value := row_value.old_reserved - row_value.actual_reserved;

    update public.inventory_balances
    set reserved_quantity = row_value.actual_reserved,
        updated_at = now()
    where location_id = row_value.location_id
      and variant_size_id = row_value.variant_size_id;

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
    values(
      format(
        'p15:reservation-reconcile:%s:%s',
        row_value.location_id,
        row_value.variant_size_id
      ),
      row_value.variant_size_id,
      row_value.location_id,
      case when delta_value > 0 then 'release' else 'reserve' end,
      delta_value,
      row_value.on_hand_quantity - row_value.actual_reserved,
      row_value.on_hand_quantity,
      row_value.actual_reserved,
      row_value.on_hand_quantity - row_value.actual_reserved,
      'P15 reconciliation of pre-existing reservation projection drift'
    )
    on conflict(idempotency_key) do nothing;

    reconciled_count := reconciled_count + 1;
  end loop;

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
    'p15_reservation_projection_reconciled',
    'system',
    'p15_inventory',
    'Pre-existing reserved balance drift reconciled to active reservations',
    jsonb_build_object('reconciled_balance_count', reconciled_count)
  );
end
$p15_reconcile$;
