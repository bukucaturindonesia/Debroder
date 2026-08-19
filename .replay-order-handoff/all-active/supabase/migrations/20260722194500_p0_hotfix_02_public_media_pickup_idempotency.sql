begin;

-- DEBRODER P0-HOTFIX-02
-- 1. Project canonical variant Front images to the legacy product root used by
--    homepage CMS cards.
-- 2. Prevent completed pickup orders from being reopened.
-- 3. Make pickup handover idempotent without consuming stock twice.
-- 4. Repair ORD-DEB-2026-0040 status only when complete consume evidence exists.
-- No delete, no stock rewrite during the repair block, and no RLS expansion.

-- ---------------------------------------------------------------------------
-- Canonical public product-card image projection
-- ---------------------------------------------------------------------------
create or replace function public.sync_product_root_card_image_v1(p_product_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_url text;
begin
  select pvi.image_url
  into selected_url
  from public.product_variants pv
  join public.product_variant_images pvi on pvi.variant_id = pv.id
  where pv.product_id = p_product_id
    and coalesce(pv.is_active, true) = true
    and coalesce(pv.status::text, 'active') <> 'inactive'
    and nullif(btrim(coalesce(pvi.image_url, '')), '') is not null
    and (pvi.image_role::text = 'front' or pvi.is_cover is true)
  order by
    coalesce(pv.is_default, false) desc,
    coalesce(pv.sort_order, 0),
    case when pvi.image_role::text = 'front' then 0 else 1 end,
    coalesce(pvi.sort_order, 0),
    pvi.id
  limit 1;

  if selected_url is not null then
    update public.products
    set image_url = selected_url,
        gambar_url = selected_url,
        updated_at = now()
    where id = p_product_id
      and (
        image_url is distinct from selected_url
        or gambar_url is distinct from selected_url
      );
  end if;

  return selected_url;
end
$$;

revoke all on function public.sync_product_root_card_image_v1(uuid) from public, anon, authenticated;
grant execute on function public.sync_product_root_card_image_v1(uuid) to service_role;

create or replace function public.sync_product_root_card_image_from_image_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_variant_id uuid;
  target_product_id uuid;
begin
  if tg_op = 'DELETE' then
    target_variant_id := old.variant_id;
  else
    target_variant_id := new.variant_id;
  end if;

  select product_id into target_product_id
  from public.product_variants
  where id = target_variant_id;

  if target_product_id is not null then
    perform public.sync_product_root_card_image_v1(target_product_id);
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end
$$;

revoke all on function public.sync_product_root_card_image_from_image_v1() from public, anon, authenticated;
grant execute on function public.sync_product_root_card_image_from_image_v1() to service_role;

drop trigger if exists sync_product_root_card_image_from_image_v1 on public.product_variant_images;
create trigger sync_product_root_card_image_from_image_v1
after insert or update or delete
on public.product_variant_images
for each row execute function public.sync_product_root_card_image_from_image_v1();

create or replace function public.sync_product_root_card_image_from_variant_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.sync_product_root_card_image_v1(new.product_id);
  return new;
end
$$;

revoke all on function public.sync_product_root_card_image_from_variant_v1() from public, anon, authenticated;
grant execute on function public.sync_product_root_card_image_from_variant_v1() to service_role;

drop trigger if exists sync_product_root_card_image_from_variant_v1 on public.product_variants;
create trigger sync_product_root_card_image_from_variant_v1
after update of is_default, status, is_active, sort_order
on public.product_variants
for each row execute function public.sync_product_root_card_image_from_variant_v1();

do $$
declare
  product_row record;
begin
  for product_row in
    select distinct pv.product_id
    from public.product_variants pv
    join public.product_variant_images pvi on pvi.variant_id = pv.id
    where nullif(btrim(coalesce(pvi.image_url, '')), '') is not null
      and (pvi.image_role::text = 'front' or pvi.is_cover is true)
  loop
    perform public.sync_product_root_card_image_v1(product_row.product_id);
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- Pickup terminal guards and idempotent handover
-- ---------------------------------------------------------------------------
create or replace function public.reserve_pickup_stock_v1(p_preparation_id uuid)
returns public.pickup_preparations
language plpgsql
security definer
set search_path = ''
as $$
declare
  prep public.pickup_preparations;
  order_value public.orders;
  line record;
  bal public.inventory_balances;
  all_reserved boolean := true;
begin
  select * into prep
  from public.pickup_preparations
  where id = p_preparation_id
  for update;
  if not found then raise exception 'Persiapan pickup tidak ditemukan'; end if;

  select * into order_value
  from public.orders
  where id = prep.order_id
  for update;
  if not found then raise exception 'Pesanan pickup tidak ditemukan'; end if;

  if order_value.status in ('completed', 'selesai') or prep.status = 'handed_over' then
    raise exception 'Pesanan sudah selesai dan pickup tidak dapat dibuka kembali';
  end if;
  if order_value.status in ('cancelled', 'dibatalkan', 'expired') or prep.status = 'cancelled' then
    raise exception 'Pesanan terminal tidak dapat diproses sebagai pickup';
  end if;
  if prep.status in ('ready_for_pickup', 'no_show', 'in_transfer') then
    return prep;
  end if;

  for line in
    select *
    from public.pickup_preparation_items
    where preparation_id = p_preparation_id
    order by variant_size_id
    for update
  loop
    if line.reserved_quantity >= line.required_quantity then continue; end if;

    insert into public.inventory_balances(location_id, variant_size_id, on_hand_quantity, reserved_quantity)
    values(prep.location_id, line.variant_size_id, 0, 0)
    on conflict do nothing;

    select * into bal
    from public.inventory_balances
    where location_id = prep.location_id
      and variant_size_id = line.variant_size_id
    for update;

    if bal.available_quantity >= line.required_quantity - line.reserved_quantity then
      update public.inventory_balances
      set reserved_quantity = reserved_quantity + (line.required_quantity - line.reserved_quantity),
          updated_at = now(),
          updated_by = auth.uid()
      where location_id = prep.location_id
        and variant_size_id = line.variant_size_id
      returning * into bal;

      insert into public.inventory_movements(
        idempotency_key, variant_size_id, location_id, order_id,
        movement_type, quantity_delta, balance_after, reason, created_by
      ) values (
        format('pickup:%s:reserve:%s', prep.id, line.variant_size_id),
        line.variant_size_id, prep.location_id, prep.order_id,
        'reserve', -(line.required_quantity - line.reserved_quantity),
        bal.available_quantity, 'Reservasi untuk pickup', auth.uid()
      ) on conflict(idempotency_key) do nothing;

      update public.pickup_preparation_items
      set reserved_quantity = required_quantity
      where id = line.id;
    else
      all_reserved := false;
    end if;
  end loop;

  update public.pickup_preparations
  set status = case when all_reserved then 'checking' else 'transfer_required' end,
      updated_at = now(),
      updated_by = auth.uid()
  where id = p_preparation_id
    and status not in ('ready_for_pickup', 'no_show', 'handed_over', 'cancelled', 'in_transfer')
  returning * into prep;

  return prep;
end
$$;

revoke all on function public.reserve_pickup_stock_v1(uuid) from public, anon, authenticated;
grant execute on function public.reserve_pickup_stock_v1(uuid) to service_role;

create or replace function public.initialize_pickup_preparation_v1(p_order_id uuid)
returns public.pickup_preparations
language plpgsql
security definer
set search_path = ''
as $$
declare
  order_value public.orders;
  location_value public.inventory_locations;
  prep public.pickup_preparations;
  fulfillment_value uuid;
begin
  if not public.has_permission('inventory.location.manage') then
    raise exception 'Tidak berwenang menyiapkan pickup';
  end if;

  select * into order_value
  from public.orders
  where id = p_order_id and archived_at is null
  for update;
  if not found or order_value.delivery_method <> 'pickup' or order_value.pickup_location_id is null then
    raise exception 'Pesanan bukan pickup yang valid';
  end if;
  if order_value.status in ('completed', 'selesai') then
    raise exception 'Pesanan sudah selesai dan pickup tidak dapat dibuka kembali';
  end if;
  if order_value.status in ('cancelled', 'dibatalkan', 'expired') then
    raise exception 'Pesanan terminal tidak dapat diproses sebagai pickup';
  end if;

  select * into location_value
  from public.inventory_locations
  where store_id = order_value.pickup_location_id
    and active = true
    and is_pickup_enabled = true;
  if not found then raise exception 'Lokasi pickup belum terhubung ke stok lokasi'; end if;

  select id into fulfillment_value
  from public.fulfillments
  where order_id = p_order_id
    and archived_at is null
    and method = 'pickup'
    and status <> 'cancelled'
  order by created_at desc
  limit 1;

  select * into prep
  from public.pickup_preparations
  where order_id = p_order_id
  for update;

  if found then
    if prep.status = 'handed_over' then
      raise exception 'Serah terima pickup sudah selesai dan tidak dapat dibuka kembali';
    end if;
    if prep.status = 'cancelled' then
      raise exception 'Persiapan pickup tidak dapat diproses pada status cancelled';
    end if;
    if prep.status in ('ready_for_pickup', 'no_show', 'in_transfer') then
      return prep;
    end if;

    update public.pickup_preparations
    set location_id = location_value.id,
        fulfillment_id = coalesce(fulfillment_value, fulfillment_id),
        updated_at = now(),
        updated_by = auth.uid()
    where id = prep.id
    returning * into prep;
  else
    insert into public.pickup_preparations(
      order_id, location_id, fulfillment_id, status, updated_by
    ) values (
      p_order_id, location_value.id, fulfillment_value, 'requested', auth.uid()
    ) returning * into prep;
  end if;

  insert into public.pickup_preparation_items(
    preparation_id, order_item_id, variant_size_id, required_quantity
  )
  select prep.id, oi.id, oi.variant_size_id, oi.quantity
  from public.order_items oi
  where oi.order_id = p_order_id
    and oi.archived_at is null
    and oi.variant_size_id is not null
  on conflict(preparation_id, order_item_id) do update
  set required_quantity = excluded.required_quantity;

  prep := public.reserve_pickup_stock_v1(prep.id);
  perform public.sync_order_handoff_v2(p_order_id, null);
  return prep;
end
$$;

revoke all on function public.initialize_pickup_preparation_v1(uuid) from public, anon;
grant execute on function public.initialize_pickup_preparation_v1(uuid) to authenticated, service_role;

create or replace function public.mark_pickup_ready_v1(
  p_preparation_id uuid,
  p_deadline_hours integer default 72
)
returns public.pickup_preparations
language plpgsql
security definer
set search_path = ''
as $$
declare
  prep public.pickup_preparations;
  order_value public.orders;
  fulfillment_value public.fulfillments;
begin
  if not public.has_permission('inventory.location.manage') then
    raise exception 'Tidak berwenang menetapkan pickup siap';
  end if;
  if p_deadline_hours < 12 or p_deadline_hours > 168 then
    raise exception 'Batas pickup harus 12 sampai 168 jam';
  end if;

  select * into prep
  from public.pickup_preparations
  where id = p_preparation_id
  for update;
  if not found then raise exception 'Persiapan pickup tidak ditemukan'; end if;

  select * into order_value
  from public.orders
  where id = prep.order_id
  for update;
  if not found then raise exception 'Pesanan pickup tidak ditemukan'; end if;

  select * into fulfillment_value
  from public.fulfillments
  where id = prep.fulfillment_id
  for update;
  if not found then raise exception 'Fulfillment pickup tidak ditemukan'; end if;

  if order_value.status in ('completed', 'selesai')
     or prep.status = 'handed_over'
     or fulfillment_value.status in ('picked_up', 'delivered') then
    raise exception 'Pesanan sudah selesai dan pickup tidak dapat dibuka kembali';
  end if;
  if order_value.status in ('cancelled', 'dibatalkan', 'expired')
     or prep.status = 'cancelled' then
    raise exception 'Pesanan terminal tidak dapat diproses sebagai pickup';
  end if;
  if prep.status = 'ready_for_pickup' then return prep; end if;
  if prep.status <> 'checking' then
    raise exception 'Persiapan pickup tidak dapat diproses pada status ini';
  end if;
  if exists(
    select 1
    from public.pickup_preparation_items
    where preparation_id = prep.id
      and reserved_quantity < required_quantity
  ) then
    raise exception 'Stok fisik di lokasi pickup belum lengkap';
  end if;
  if fulfillment_value.final_verified_at is null then
    raise exception 'Pengecekan akhir fulfillment wajib selesai';
  end if;

  update public.pickup_preparations
  set status = 'ready_for_pickup',
      ready_at = now(),
      pickup_deadline = now() + make_interval(hours => p_deadline_hours),
      reminder_at = now() + make_interval(hours => greatest(p_deadline_hours - 24, 1)),
      reminder_sent_at = null,
      updated_at = now(),
      updated_by = auth.uid()
  where id = prep.id
  returning * into prep;

  update public.fulfillments
  set status = 'ready_for_pickup',
      ready_at = coalesce(ready_at, now()),
      updated_at = now(),
      updated_by = auth.uid()
  where id = fulfillment_value.id
    and status not in ('picked_up', 'delivered');

  perform public.sync_order_handoff_v2(prep.order_id, null);
  return prep;
end
$$;

revoke all on function public.mark_pickup_ready_v1(uuid, integer) from public, anon;
grant execute on function public.mark_pickup_ready_v1(uuid, integer) to authenticated, service_role;

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
  prep public.pickup_preparations;
  order_value public.orders;
  fulfillment_value public.fulfillments;
  line record;
  bal public.inventory_balances;
  payment_id uuid;
  old_status text;
  movement_key text;
  required_line_count integer := 0;
  consumed_line_count integer := 0;
begin
  if not public.has_permission('shipping.complete')
     and not public.has_permission('operations.manage') then
    raise exception 'Tidak berwenang menyelesaikan pickup';
  end if;

  select * into prep
  from public.pickup_preparations
  where id = p_preparation_id
  for update;
  if not found then raise exception 'Persiapan pickup tidak ditemukan'; end if;

  select * into order_value
  from public.orders
  where id = prep.order_id
  for update;
  if not found then raise exception 'Pesanan pickup tidak ditemukan'; end if;
  old_status := order_value.status;

  select * into fulfillment_value
  from public.fulfillments
  where id = prep.fulfillment_id
  for update;
  if not found then raise exception 'Fulfillment pickup tidak ditemukan'; end if;

  select count(*)::integer
  into required_line_count
  from public.pickup_preparation_items
  where preparation_id = prep.id;

  select count(*)::integer
  into consumed_line_count
  from public.pickup_preparation_items item
  where item.preparation_id = prep.id
    and exists(
      select 1
      from public.inventory_movements movement
      where movement.idempotency_key = format(
        'pickup:%s:consume:%s', prep.id, item.variant_size_id
      )
        and movement.order_id = order_value.id
        and movement.movement_type = 'consume'
    );

  -- Idempotent terminal reconciliation: never consume stock again.
  if prep.status = 'handed_over'
     or order_value.status in ('completed', 'selesai')
     or fulfillment_value.status = 'picked_up' then
    if required_line_count > 0 and consumed_line_count < required_line_count then
      raise exception 'Pesanan terminal belum memiliki bukti konsumsi stok pickup lengkap';
    end if;

    update public.pickup_preparations
    set status = 'handed_over',
        updated_at = now(),
        updated_by = auth.uid()
    where id = prep.id and status <> 'handed_over';

    update public.fulfillments
    set status = 'picked_up',
        picked_up_at = coalesce(picked_up_at, now()),
        updated_at = now(),
        updated_by = auth.uid(),
        notes = concat_ws(E'\n', notes, nullif(btrim(p_note), ''))
    where id = fulfillment_value.id and status <> 'picked_up';

    update public.orders
    set status = 'completed',
        updated_at = now(),
        updated_by = auth.uid()
    where id = order_value.id
      and status not in ('completed', 'selesai')
    returning * into order_value;

    if order_value.id is null then
      select * into order_value from public.orders where id = prep.order_id;
    end if;

    perform public.sync_order_handoff_v2(order_value.id, null);
    return order_value;
  end if;

  if prep.status not in ('ready_for_pickup', 'no_show') then
    raise exception 'Pickup belum siap diserahkan';
  end if;

  if order_value.payment_method = 'pay_at_store'
     and not exists(
       select 1
       from public.order_payments
       where order_id = order_value.id
         and archived_at is null
         and (status = 'verified' or review_outcome = 'verified')
     ) then
    insert into public.order_payments(
      order_id, amount, reported_amount, paid_at, method, channel_name,
      reference_number, status, submission_source, review_outcome,
      check_funds_received, check_destination_account, check_amount,
      check_transaction_time, check_reference_unique, verified_amount,
      verified_destination_account, verified_transaction_at, verified_reference,
      verified_at, verified_by, reviewed_at, reviewed_by, admin_notes,
      created_by, updated_by
    ) values (
      order_value.id, order_value.total_amount::bigint, order_value.total_amount::bigint,
      now(), 'cash', 'Toko',
      format('CASH-%s-%s', order_value.order_number, to_char(now(), 'YYYYMMDDHH24MISS')),
      'verified', 'admin', 'verified', true, true, true, true, true,
      order_value.total_amount::bigint, 'Kas Toko', now(),
      format('CASH-%s', order_value.order_number), now(), auth.uid(), now(), auth.uid(),
      coalesce(nullif(btrim(p_note), ''), 'Pembayaran tunai diterima saat pickup'),
      auth.uid(), auth.uid()
    ) returning id into payment_id;

    perform public.refresh_order_payment_summary(order_value.id);
    select * into order_value from public.orders where id = order_value.id for update;
  end if;

  if not order_value.payment_production_eligible then
    raise exception 'Pembayaran belum memenuhi syarat';
  end if;

  for line in
    select *
    from public.pickup_preparation_items
    where preparation_id = prep.id
    order by variant_size_id
    for update
  loop
    movement_key := format('pickup:%s:consume:%s', prep.id, line.variant_size_id);

    if exists(
      select 1 from public.inventory_movements
      where idempotency_key = movement_key
    ) then
      continue;
    end if;

    select * into bal
    from public.inventory_balances
    where location_id = prep.location_id
      and variant_size_id = line.variant_size_id
    for update;

    if not found
       or bal.reserved_quantity < line.required_quantity
       or bal.on_hand_quantity < line.required_quantity then
      raise exception 'Saldo stok pickup tidak konsisten';
    end if;

    update public.inventory_balances
    set on_hand_quantity = on_hand_quantity - line.required_quantity,
        reserved_quantity = reserved_quantity - line.required_quantity,
        updated_at = now(),
        updated_by = auth.uid()
    where location_id = prep.location_id
      and variant_size_id = line.variant_size_id
    returning * into bal;

    insert into public.inventory_movements(
      idempotency_key, variant_size_id, location_id, order_id,
      movement_type, quantity_delta, balance_after, reason, created_by
    ) values (
      movement_key, line.variant_size_id, prep.location_id, order_value.id,
      'consume', -line.required_quantity, bal.on_hand_quantity,
      'Barang diserahkan kepada pelanggan', auth.uid()
    );
  end loop;

  if exists(
    select 1
    from public.stock_reservations
    where order_id = order_value.id and status = 'active'
  ) then
    perform set_config('debroder.skip_inventory_legacy_sync', '1', true);
    perform public.consume_paid_order_stock(order_value.id);
  end if;

  update public.pickup_preparations
  set status = 'handed_over',
      updated_at = now(),
      updated_by = auth.uid()
  where id = prep.id;

  update public.fulfillments
  set status = 'picked_up',
      picked_up_at = coalesce(picked_up_at, now()),
      updated_at = now(),
      updated_by = auth.uid(),
      notes = concat_ws(E'\n', notes, nullif(btrim(p_note), ''))
  where id = fulfillment_value.id;

  update public.orders
  set status = 'completed',
      updated_at = now(),
      updated_by = auth.uid()
  where id = order_value.id
  returning * into order_value;

  if old_status not in ('completed', 'selesai') then
    insert into public.order_status_history(
      order_id, from_status, to_status, note, changed_by
    ) values (
      order_value.id, old_status, 'completed',
      coalesce(nullif(btrim(p_note), ''), 'Pickup selesai'), auth.uid()
    );
  end if;

  perform public.sync_order_handoff_v2(order_value.id, null);
  return order_value;
end
$$;

revoke all on function public.complete_pickup_handover_v1(uuid, text) from public, anon;
grant execute on function public.complete_pickup_handover_v1(uuid, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- One-time narrow reconciliation for the reported completed pickup.
-- This updates statuses only when every preparation line already has a consume
-- movement. Inventory balances, catalog stock, and movement rows are untouched.
-- ---------------------------------------------------------------------------
do $$
declare
  target record;
  required_count integer;
  consumed_count integer;
begin
  for target in
    select o.id as order_id, pp.id as preparation_id, pp.fulfillment_id
    from public.orders o
    join public.pickup_preparations pp on pp.order_id = o.id
    where o.order_number = 'ORD-DEB-2026-0040'
      and o.status in ('completed', 'selesai')
      and pp.status <> 'handed_over'
    for update of o, pp
  loop
    select count(*)::integer into required_count
    from public.pickup_preparation_items
    where preparation_id = target.preparation_id;

    select count(*)::integer into consumed_count
    from public.pickup_preparation_items item
    where item.preparation_id = target.preparation_id
      and exists(
        select 1
        from public.inventory_movements movement
        where movement.idempotency_key = format(
          'pickup:%s:consume:%s', target.preparation_id, item.variant_size_id
        )
          and movement.order_id = target.order_id
          and movement.movement_type = 'consume'
      );

    if required_count > 0 and consumed_count = required_count then
      update public.pickup_preparations
      set status = 'handed_over', updated_at = now()
      where id = target.preparation_id;

      update public.fulfillments
      set status = 'picked_up',
          picked_up_at = coalesce(picked_up_at, now()),
          updated_at = now()
      where id = target.fulfillment_id;

      insert into public.system_audit_log(
        entity_type, entity_id, action, actor_role, source, new_value, metadata
      ) values (
        'order', target.order_id, 'pickup_terminal_reconciled', 'system',
        'p0_hotfix_02',
        jsonb_build_object(
          'pickup_preparation_status', 'handed_over',
          'fulfillment_status', 'picked_up',
          'order_status', 'completed'
        ),
        jsonb_build_object(
          'stock_changed', false,
          'movement_created', false,
          'required_lines', required_count,
          'consumed_lines', consumed_count
        )
      );

      perform public.sync_order_handoff_v2(target.order_id, null);
    end if;
  end loop;
end
$$;

commit;
