-- Fix trigger record resolution for automatic Ready Stock fulfillment.
-- Root cause: CASE referenced NEW.order_id while running on public.orders,
-- where the row only has NEW.id.

create or replace function public.trigger_ensure_ready_stock_fulfillment_v2()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  target_order_id uuid;
begin
  if tg_table_name = 'orders' then
    target_order_id := new.id;
  elsif tg_table_name in ('order_items', 'stock_reservations') then
    target_order_id := new.order_id;
  else
    raise exception 'Trigger Ready Stock dipasang pada tabel yang tidak didukung: %', tg_table_name;
  end if;

  perform public._ensure_ready_stock_fulfillment_v2(
    target_order_id,
    'trigger:' || tg_table_name || ':' || lower(tg_op)
  );
  return new;
end;
$$;

revoke all on function public.trigger_ensure_ready_stock_fulfillment_v2()
  from public, anon, authenticated;
grant execute on function public.trigger_ensure_ready_stock_fulfillment_v2()
  to service_role;
