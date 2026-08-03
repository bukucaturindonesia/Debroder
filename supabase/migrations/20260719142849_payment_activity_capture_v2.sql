create or replace function public.capture_order_payment_activity()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  action_value text;
  actor_value uuid:=coalesce(new.updated_by,new.created_by,(select auth.uid()));
  balance_value bigint;
begin
  if tg_op='INSERT' then
    if new.submission_source<>'admin' then return new; end if;
    action_value:='payment_created';
  elsif new.status is distinct from old.status then
    action_value:=case
      when new.status='verified' then 'payment_verified'
      when new.review_outcome='funds_not_found' then 'payment_funds_not_found'
      when new.review_outcome='correction_requested' then 'payment_correction_requested'
      when new.status='rejected' then 'payment_rejected'
      when new.status='refunded' then 'payment_refunded'
      else 'payment_status_changed' end;
  elsif new.archived_at is distinct from old.archived_at then
    action_value:=case when new.archived_at is null
      then 'payment_restored' else 'payment_archived' end;
  else
    return new;
  end if;

  perform public.refresh_order_payment_summary(new.order_id);
  select payment_balance into balance_value
  from public.orders where id=new.order_id;
  insert into public.payment_activity_history(
    order_id,payment_id,action,note,actor_id,actor_role,running_balance,metadata
  ) values (
    new.order_id,new.id,action_value,
    coalesce(new.rejection_reason,new.admin_notes),actor_value,
    public.payment_actor_role(actor_value),balance_value,
    jsonb_build_object(
      'from_status',case when tg_op='UPDATE' then old.status else null end,
      'to_status',new.status,
      'review_outcome',new.review_outcome,
      'verified_amount',new.verified_amount,
      'verified_reference',new.verified_reference,
      'settlement_classification',new.settlement_classification,
      'checks',jsonb_build_object(
        'funds_received',new.check_funds_received,
        'destination_account',new.check_destination_account,
        'amount',new.check_amount,
        'transaction_time',new.check_transaction_time,
        'reference_unique',new.check_reference_unique
      )
    )
  );
  return new;
end;
$$;;
