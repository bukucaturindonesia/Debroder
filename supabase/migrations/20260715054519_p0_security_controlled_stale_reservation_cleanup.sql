create temporary table stage3_cleanup_targets on commit drop as
select
  sr.id as reservation_id,
  sr.order_id,
  sr.variant_size_id,
  to_jsonb(sr) as reservation_before,
  pvs.stock as physical_stock_before,
  pvs.stock_quantity as physical_stock_quantity_before,
  md5(to_jsonb(o)::text) as order_row_hash_before,
  md5(coalesce((
    select jsonb_agg(to_jsonb(p) order by p.id)::text
    from public.order_payments p
    where p.order_id = sr.order_id
  ), '[]')) as payment_rows_hash_before,
  md5(coalesce((
    select jsonb_agg(to_jsonb(f) order by f.id)::text
    from public.fulfillments f
    where f.order_id = sr.order_id
  ), '[]')) as fulfillment_rows_hash_before
from public.stock_reservations sr
join public.orders o on o.id = sr.order_id
join public.product_variant_sizes pvs on pvs.id = sr.variant_size_id
where sr.status = 'active'
  and sr.expires_at <= now()
  and sr.consumed_at is null
  and sr.released_at is null
  and o.archived_at is not null;

do $$
declare
  target_count integer;
  changed_count integer;
  audit_count integer;
begin
  select count(*) into target_count
  from stage3_cleanup_targets;

  if target_count <> 2 then
    raise exception 'Stage 3 precondition failed: expected exactly 2 eligible stale reservations, found %', target_count;
  end if;

  perform 1
  from public.stock_reservations sr
  join stage3_cleanup_targets t on t.reservation_id = sr.id
  join public.orders o on o.id = sr.order_id
  for update of sr, o;

  update public.stock_reservations sr
  set status = 'released',
      released_at = now(),
      updated_at = now()
  from stage3_cleanup_targets t
  where sr.id = t.reservation_id
    and sr.status = 'active'
    and sr.expires_at <= now()
    and sr.consumed_at is null
    and sr.released_at is null
    and exists (
      select 1
      from public.orders o
      where o.id = sr.order_id
        and o.archived_at is not null
    );

  get diagnostics changed_count = row_count;
  if changed_count <> 2 then
    raise exception 'Stage 3 cleanup failed: expected exactly 2 changed reservations, changed %', changed_count;
  end if;

  insert into public.system_audit_log(
    entity_type,
    entity_id,
    action,
    old_value,
    new_value,
    actor_id,
    actor_role,
    source,
    reason,
    metadata
  )
  select
    'stock_reservation',
    sr.id,
    'stale_reservation_released',
    t.reservation_before,
    to_jsonb(sr),
    null,
    'system',
    'p0_security_stage_3',
    'p0_archived_order_expired_reservation_cleanup',
    jsonb_build_object(
      'order_id', sr.order_id,
      'variant_size_id', sr.variant_size_id,
      'quantity', sr.quantity,
      'previous_status', 'active',
      'new_status', 'released',
      'physical_stock_before', t.physical_stock_before,
      'physical_stock_quantity_before', t.physical_stock_quantity_before,
      'order_row_hash_before', t.order_row_hash_before,
      'payment_rows_hash_before', t.payment_rows_hash_before,
      'fulfillment_rows_hash_before', t.fulfillment_rows_hash_before
    )
  from public.stock_reservations sr
  join stage3_cleanup_targets t on t.reservation_id = sr.id;

  get diagnostics audit_count = row_count;
  if audit_count <> 2 then
    raise exception 'Stage 3 cleanup failed: expected exactly 2 audit events, inserted %', audit_count;
  end if;

  if exists (
    select 1
    from public.stock_reservations sr
    join stage3_cleanup_targets t on t.reservation_id = sr.id
    where sr.status <> 'released'
       or sr.released_at is null
       or sr.consumed_at is not null
  ) then
    raise exception 'Stage 3 cleanup failed: canonical released state not reached';
  end if;

  if exists (
    select 1
    from stage3_cleanup_targets t
    join public.product_variant_sizes pvs on pvs.id = t.variant_size_id
    where pvs.stock is distinct from t.physical_stock_before
       or pvs.stock_quantity is distinct from t.physical_stock_quantity_before
  ) then
    raise exception 'Stage 3 cleanup failed: physical stock changed';
  end if;

  if exists (
    select 1
    from stage3_cleanup_targets t
    join public.orders o on o.id = t.order_id
    where md5(to_jsonb(o)::text) is distinct from t.order_row_hash_before
  ) then
    raise exception 'Stage 3 cleanup failed: order row changed';
  end if;

  if exists (
    select 1
    from stage3_cleanup_targets t
    where md5(coalesce((
      select jsonb_agg(to_jsonb(p) order by p.id)::text
      from public.order_payments p
      where p.order_id = t.order_id
    ), '[]')) is distinct from t.payment_rows_hash_before
  ) then
    raise exception 'Stage 3 cleanup failed: payment rows changed';
  end if;

  if exists (
    select 1
    from stage3_cleanup_targets t
    where md5(coalesce((
      select jsonb_agg(to_jsonb(f) order by f.id)::text
      from public.fulfillments f
      where f.order_id = t.order_id
    ), '[]')) is distinct from t.fulfillment_rows_hash_before
  ) then
    raise exception 'Stage 3 cleanup failed: fulfillment rows changed';
  end if;
end
$$;
