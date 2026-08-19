insert into public.permission_definitions(permission_key,module,label,description)
values (
  'order.cancel',
  'order',
  'Batalkan pesanan',
  'Membatalkan pesanan secara transactional, melepaskan reservasi aktif, dan mencatat audit.'
)
on conflict (permission_key) do update
set module=excluded.module,
    label=excluded.label,
    description=excluded.description;

insert into public.role_permissions(role,permission_key,granted,updated_by,updated_at)
select role_value,'order.cancel',true,null,now()
from unnest(array['owner','superadmin','super_admin','sales_admin','admin']) role_value
on conflict(role,permission_key) do update
set granted=excluded.granted,
    updated_at=now();

create or replace function public.cancel_order_transactional(
  p_order_id uuid,
  p_reason text
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_value uuid := auth.uid();
  reason_value text := nullif(btrim(coalesce(p_reason,'')), '');
  order_before public.orders;
  order_after public.orders;
  released_count integer := 0;
begin
  if actor_value is null then
    raise exception 'Authenticated actor required';
  end if;
  if not public.has_permission('order.cancel') then
    raise exception 'Not authorized to cancel order';
  end if;
  if reason_value is null then
    raise exception 'Cancellation reason is required';
  end if;

  select * into order_before
  from public.orders
  where id=p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  -- Idempotent: a repeated cancellation returns the same terminal row and
  -- does not release stock or create duplicate history/audit records.
  if order_before.status in ('cancelled','dibatalkan') then
    return order_before;
  end if;

  if order_before.archived_at is not null then
    raise exception 'Archived order cannot be cancelled';
  end if;

  if order_before.status in ('completed','selesai','picked_up','expired') then
    raise exception 'Completed or terminal order cannot be cancelled';
  end if;

  if exists (
    select 1
    from public.fulfillments f
    where f.order_id=p_order_id
      and f.archived_at is null
      and f.status <> 'cancelled'
  ) then
    raise exception 'Active or fulfilled handover must be resolved before cancellation';
  end if;

  if coalesce(order_before.payment_effective_total,0) > 0
     or order_before.payment_status in ('paid','terverifikasi','partially_paid','refunded')
     or exists (
       select 1 from public.order_payments p
       where p.order_id=p_order_id
         and p.archived_at is null
         and p.status in ('verified','refunded')
     ) then
    raise exception 'Paid order requires refund or reversal flow';
  end if;

  released_count := public.release_public_order_stock(
    p_order_id,
    reason_value,
    actor_value
  );

  update public.orders
  set status='cancelled',
      updated_by=actor_value,
      updated_at=now()
  where id=p_order_id
  returning * into order_after;

  insert into public.order_status_history(
    order_id,from_status,to_status,note,changed_by
  ) values (
    p_order_id,order_before.status,'cancelled',reason_value,actor_value
  );

  insert into public.system_audit_log(
    entity_type,entity_id,action,old_value,new_value,
    actor_id,actor_role,source,reason,metadata
  ) values (
    'order',p_order_id,'order_cancelled',to_jsonb(order_before),to_jsonb(order_after),
    actor_value,public.current_actor_role(),'p0_security_stage_2',reason_value,
    jsonb_build_object('released_reservation_count',released_count)
  );

  return order_after;
end;
$$;

revoke all on function public.cancel_order_transactional(uuid,text)
  from public,anon,authenticated;
grant execute on function public.cancel_order_transactional(uuid,text)
  to authenticated;

create or replace function public.archive_order(
  p_order_id uuid,
  p_reason text default null
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  result_order public.orders;
begin
  if not public.has_permission('order.archive') then
    raise exception 'Not authorized';
  end if;

  select * into result_order
  from public.orders
  where id=p_order_id
  for update;

  if not found or result_order.archived_at is not null then
    raise exception 'Order not found or already archived';
  end if;

  if result_order.status not in (
    'cancelled','dibatalkan','completed','selesai','expired','picked_up'
  ) then
    raise exception 'Cancel or complete the order before archiving';
  end if;

  if exists (
    select 1 from public.stock_reservations sr
    where sr.order_id=p_order_id and sr.status='active'
  ) then
    raise exception 'Active stock reservation must be released before archiving';
  end if;

  if exists (
    select 1 from public.order_payments p
    where p.order_id=p_order_id
      and p.archived_at is null
      and p.status='pending'
  ) then
    raise exception 'Pending payment must be resolved before archiving';
  end if;

  if exists (
    select 1 from public.fulfillments f
    where f.order_id=p_order_id
      and f.archived_at is null
      and f.status not in ('cancelled','delivered','picked_up')
  ) then
    raise exception 'Active fulfillment must be resolved before archiving';
  end if;

  update public.orders
  set archived_at=now(),
      archived_by=auth.uid(),
      archive_reason=nullif(btrim(coalesce(p_reason,'')),''),
      updated_by=auth.uid(),
      updated_at=now()
  where id=p_order_id
  returning * into result_order;

  return result_order;
end;
$$;

revoke all on function public.archive_order(uuid,text)
  from public,anon,authenticated;
grant execute on function public.archive_order(uuid,text)
  to authenticated;

create or replace function public.consume_paid_order_stock(p_order_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  order_row public.orders;
  reservation_row record;
  reservation_count integer;
  consumed_count integer := 0;
  physical_stock integer;
begin
  select * into order_row
  from public.orders
  where id=p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;
  if order_row.archived_at is not null
     or order_row.status in ('cancelled','dibatalkan','expired') then
    raise exception 'Cancelled, expired, or archived order cannot consume stock';
  end if;
  if order_row.payment_status not in ('paid','terverifikasi') then
    raise exception 'Paid order required before stock consumption';
  end if;

  select count(*) into reservation_count
  from public.stock_reservations
  where order_id=p_order_id;

  if reservation_count=0 then
    raise exception 'Stock reservation not found';
  end if;
  if exists (
    select 1 from public.stock_reservations
    where order_id=p_order_id and status='released'
  ) then
    raise exception 'Released reservation cannot be consumed';
  end if;
  if exists (
    select 1 from public.stock_reservations
    where order_id=p_order_id and status='consumed'
  ) then
    raise exception 'Consumed reservation cannot be consumed again';
  end if;
  if exists (
    select 1 from public.stock_reservations
    where order_id=p_order_id
      and (status <> 'active' or expires_at <= now())
  ) then
    raise exception 'Expired or invalid reservation cannot be consumed';
  end if;

  for reservation_row in
    select sr.id,sr.variant_size_id,sr.quantity
    from public.stock_reservations sr
    where sr.order_id=p_order_id and sr.status='active'
    order by sr.variant_size_id
    for update
  loop
    select coalesce(stock_quantity,stock,0)
    into physical_stock
    from public.product_variant_sizes
    where id=reservation_row.variant_size_id
    for update;

    if not found or physical_stock < reservation_row.quantity then
      raise exception 'Physical stock is insufficient for payment completion';
    end if;

    update public.product_variant_sizes
    set stock=physical_stock-reservation_row.quantity,
        stock_quantity=physical_stock-reservation_row.quantity,
        updated_at=now()
    where id=reservation_row.variant_size_id;

    update public.stock_reservations
    set status='consumed',
        consumed_at=now(),
        updated_at=now()
    where id=reservation_row.id;

    consumed_count := consumed_count+1;
  end loop;

  update public.orders
  set reservation_expires_at=null,
      updated_at=now()
  where id=p_order_id;

  insert into public.system_audit_log(
    entity_type,entity_id,action,actor_role,source,new_value
  ) values (
    'order',p_order_id,'stock_sold','system','commerce_foundation',
    jsonb_build_object('reservation_count',consumed_count)
  );

  return consumed_count;
end;
$$;

revoke all on function public.consume_paid_order_stock(uuid)
  from public,anon,authenticated;
grant execute on function public.consume_paid_order_stock(uuid)
  to service_role;

create or replace function public.refresh_order_payment_summary(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  result_order public.orders;
  verified_total bigint;
  adjustment_total bigint;
  effective_total bigint;
  required_total bigint;
  has_pending boolean;
  has_rejected boolean;
begin
  select coalesce(sum(amount),0)::bigint into verified_total
  from public.order_payments
  where order_id=p_order_id and status='verified' and archived_at is null;

  select coalesce(sum(effect_amount),0)::bigint into adjustment_total
  from public.payment_adjustments
  where order_id=p_order_id and status='approved' and archived_at is null;

  select exists(
    select 1 from public.order_payments
    where order_id=p_order_id and status='pending' and archived_at is null
  ) into has_pending;

  select exists(
    select 1 from public.order_payments
    where order_id=p_order_id and status='rejected' and archived_at is null
  ) into has_rejected;

  effective_total := greatest(verified_total+adjustment_total,0);

  select case payment_requirement_type
    when 'percentage' then ceil(total_amount::numeric*payment_required_percentage/100)::bigint
    when 'fixed' then least(coalesce(payment_required_amount,0),total_amount::bigint)
    when 'deposit' then least(coalesce(payment_required_amount,0),total_amount::bigint)
    else total_amount::bigint
  end
  into required_total
  from public.orders
  where id=p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  update public.orders
  set payment_total_verified=verified_total,
      payment_effective_total=effective_total,
      payment_required_amount=required_total,
      payment_balance=greatest(total_amount::bigint-effective_total,0),
      payment_percentage=case
        when total_amount>0 then least(100,round((effective_total::numeric/total_amount::numeric)*100,2))
        else 0
      end,
      payment_requirement_met=effective_total>=required_total,
      payment_production_eligible=effective_total>=required_total,
      payment_status=case
        when has_pending then 'pending_verification'
        when effective_total>=total_amount::bigint and total_amount>0 then 'paid'
        when effective_total>0 then 'partially_paid'
        when has_rejected then 'rejected'
        else 'unpaid'
      end,
      status=case
        when effective_total>=total_amount::bigint
         and total_amount>0
         and status in ('awaiting_payment','processing') then 'confirmed'
        else status
      end,
      updated_at=now()
  where id=p_order_id
  returning * into result_order;

  if result_order.payment_status='paid'
     and result_order.checkout_source='public_checkout' then
    if result_order.archived_at is not null
       or result_order.status in ('cancelled','dibatalkan','expired') then
      raise exception 'Cancelled, expired, or archived order cannot complete payment';
    end if;

    if exists (
      select 1 from public.stock_reservations
      where order_id=p_order_id and status='active'
    ) then
      perform public.consume_paid_order_stock(p_order_id);
    elsif exists (
      select 1 from public.stock_reservations
      where order_id=p_order_id and status='consumed'
    ) then
      null;
    else
      raise exception 'Valid stock reservation is required before payment completion';
    end if;
  end if;

  return result_order;
end;
$$;

revoke all on function public.refresh_order_payment_summary(uuid)
  from public,anon,authenticated;
grant execute on function public.refresh_order_payment_summary(uuid)
  to service_role;

create or replace function public.verify_order_payment(
  p_payment_id uuid,
  p_admin_notes text default null
)
returns public.order_payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  result_payment public.order_payments;
  order_row public.orders;
  was_met boolean;
  now_met boolean;
begin
  if not public.has_permission('payment.verify') then
    raise exception 'Not authorized to verify';
  end if;

  select o.* into order_row
  from public.order_payments p
  join public.orders o on o.id=p.order_id
  where p.id=p_payment_id
  for update of p,o;

  if not found then
    raise exception 'Pending payment not found';
  end if;
  if order_row.archived_at is not null
     or order_row.status in ('cancelled','dibatalkan','expired') then
    raise exception 'Payment cannot be verified for cancelled, expired, or archived order';
  end if;

  was_met := order_row.payment_requirement_met;

  update public.order_payments
  set status='verified',
      admin_notes=coalesce(nullif(btrim(coalesce(p_admin_notes,'')),''),admin_notes),
      verified_at=now(),
      verified_by=auth.uid(),
      updated_by=auth.uid(),
      updated_at=now()
  where id=p_payment_id
    and status='pending'
    and archived_at is null
  returning * into result_payment;

  if not found then
    raise exception 'Pending payment not found';
  end if;

  perform public.refresh_order_payment_summary(result_payment.order_id);
  select payment_requirement_met into now_met
  from public.orders
  where id=result_payment.order_id;

  insert into public.payment_activity_history(
    order_id,payment_id,action,note,actor_id,actor_role,running_balance
  ) values (
    result_payment.order_id,result_payment.id,'payment_verified',
    'Pembayaran diverifikasi',auth.uid(),public.current_actor_role(),
    (select payment_balance from public.orders where id=result_payment.order_id)
  );

  if not coalesce(was_met,false) and coalesce(now_met,false) then
    insert into public.payment_activity_history(
      order_id,payment_id,action,note,actor_id,actor_role,running_balance
    ) values (
      result_payment.order_id,result_payment.id,'requirement_met',
      'Pembayaran memenuhi syarat produksi',auth.uid(),public.current_actor_role(),
      (select payment_balance from public.orders where id=result_payment.order_id)
    );
  end if;

  return result_payment;
end;
$$;

revoke all on function public.verify_order_payment(uuid,text)
  from public,anon,authenticated;
grant execute on function public.verify_order_payment(uuid,text)
  to authenticated,service_role;
