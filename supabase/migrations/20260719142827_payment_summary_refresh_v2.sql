create or replace function public.refresh_order_payment_summary(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path=''
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
  select coalesce(sum(coalesce(verified_amount,amount)),0)::bigint
  into verified_total
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

  effective_total:=greatest(verified_total+adjustment_total,0);
  select case payment_requirement_type
    when 'percentage' then ceil(total_amount::numeric*payment_required_percentage/100)::bigint
    when 'fixed' then least(coalesce(payment_required_amount,0),total_amount::bigint)
    when 'deposit' then least(coalesce(payment_required_amount,0),total_amount::bigint)
    else total_amount::bigint
  end into required_total
  from public.orders where id=p_order_id for update;
  if not found then raise exception 'Order not found'; end if;

  update public.orders set
    payment_total_verified=verified_total,
    payment_effective_total=effective_total,
    payment_required_amount=required_total,
    payment_balance=greatest(total_amount::bigint-effective_total,0),
    payment_percentage=case when total_amount>0
      then least(100,round((effective_total::numeric/total_amount::numeric)*100,2))
      else 0 end,
    payment_requirement_met=effective_total>=required_total,
    payment_production_eligible=effective_total>=required_total,
    payment_status=case
      when has_pending then 'pending_verification'
      when effective_total>=total_amount::bigint and total_amount>0 then 'paid'
      when effective_total>0 then 'partially_paid'
      when has_rejected then 'rejected'
      else 'unpaid' end,
    status=case
      when effective_total>=total_amount::bigint and total_amount>0
       and status in ('awaiting_payment','processing') then 'confirmed'
      else status end,
    updated_at=now()
  where id=p_order_id returning * into result_order;

  if result_order.payment_status='paid'
     and result_order.checkout_source='public_checkout' then
    if result_order.archived_at is not null
       or result_order.status in ('cancelled','dibatalkan','expired') then
      raise exception 'Cancelled, expired, or archived order cannot complete payment';
    end if;
    if exists(
      select 1 from public.stock_reservations
      where order_id=p_order_id and status='active'
    ) then
      perform public.consume_paid_order_stock(p_order_id);
    elsif exists(
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
$$;;
