-- Fix all remaining cross-table trigger functions that used CASE
-- to access incompatible NEW record fields.

create or replace function public.refresh_order_integrity_task_trigger_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_order_id uuid;
begin
  if tg_table_name = 'orders' then
    target_order_id := new.id;
  elsif tg_table_name in ('order_payments','fulfillments','job_orders') then
    target_order_id := new.order_id;
  else
    return new;
  end if;

  if target_order_id is not null then
    perform public.sync_order_operational_task_v1(target_order_id,null);
  end if;
  return new;
end;
$$;

create or replace function public.sync_order_handoff_trigger_v2()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_order_id uuid;
begin
  if pg_trigger_depth() > 1 then return new; end if;

  if tg_table_name = 'orders' then
    target_order_id := new.id;
  elsif tg_table_name in ('order_payments','fulfillments','job_orders') then
    target_order_id := new.order_id;
  else
    return new;
  end if;

  if target_order_id is not null then
    perform public.sync_order_handoff_v2(target_order_id,null);
  end if;
  return new;
end;
$$;

create or replace function public.guard_active_cancellation_progress_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_order_id uuid;
  active_request boolean;
begin
  if tg_table_name = 'orders' then
    target_order_id := new.id;
  elsif tg_table_name in ('job_orders','fulfillments') then
    target_order_id := new.order_id;
  else
    return new;
  end if;

  if target_order_id is null then return new; end if;

  select exists(
    select 1
    from public.order_cancellation_requests r
    where r.order_id = target_order_id
      and r.status in ('pending','approved','approved_refund_required')
  ) into active_request;

  if not active_request then return new; end if;

  if tg_table_name = 'orders' then
    if new.status is distinct from old.status
       and new.status not in ('cancelled','dibatalkan') then
      raise exception 'Pesanan sedang dalam proses pembatalan';
    end if;
  elsif tg_table_name = 'job_orders' then
    if tg_op = 'INSERT' then
      if new.status not in ('cancelled') then
        raise exception 'Produksi diblokir selama proses pembatalan';
      end if;
    elsif new.status is distinct from old.status
       and new.status not in ('cancelled') then
      raise exception 'Produksi diblokir selama proses pembatalan';
    end if;
  elsif tg_table_name = 'fulfillments' then
    if tg_op = 'INSERT' then
      if new.status not in ('cancelled') then
        raise exception 'Penyerahan diblokir selama proses pembatalan';
      end if;
    elsif new.status is distinct from old.status
       and new.status not in ('cancelled') then
      raise exception 'Penyerahan diblokir selama proses pembatalan';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.refresh_order_integrity_task_trigger_v1()
  from public, anon, authenticated;
revoke all on function public.sync_order_handoff_trigger_v2()
  from public, anon, authenticated;
revoke all on function public.guard_active_cancellation_progress_v1()
  from public, anon, authenticated;

grant execute on function public.refresh_order_integrity_task_trigger_v1()
  to service_role;
grant execute on function public.sync_order_handoff_trigger_v2()
  to service_role;
grant execute on function public.guard_active_cancellation_progress_v1()
  to service_role;
