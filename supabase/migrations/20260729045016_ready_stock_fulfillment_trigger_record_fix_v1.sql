begin;

-- A later Instant Custom migration reintroduced a CASE expression that
-- references NEW.order_id while this trigger is also attached to orders.
-- PL/pgSQL resolves record fields before CASE can protect the other branch.
create or replace function public.trigger_ensure_ready_stock_fulfillment_v2()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  target_order_id uuid;
begin
  if tg_table_name = 'orders' then
    target_order_id := new.id;
  elsif tg_table_name in ('order_items', 'stock_reservations') then
    target_order_id := new.order_id;
  else
    raise exception
      'Trigger Ready Stock dipasang pada tabel yang tidak didukung: %',
      tg_table_name;
  end if;

  -- Preserve the Instant Custom production-bearing order guard.
  if exists (
    select 1
    from public.order_items oi
    where oi.order_id = target_order_id
      and oi.archived_at is null
      and jsonb_typeof(coalesce(oi.required_services, '[]'::jsonb)) = 'array'
      and jsonb_array_length(coalesce(oi.required_services, '[]'::jsonb)) > 0
  ) then
    return new;
  end if;

  perform public._ensure_ready_stock_fulfillment_v2(
    target_order_id,
    'trigger:' || tg_table_name || ':' || lower(tg_op)
  );
  return new;
end;
$function$;

revoke all on function public.trigger_ensure_ready_stock_fulfillment_v2()
from public, anon, authenticated;
grant execute on function public.trigger_ensure_ready_stock_fulfillment_v2()
to service_role;

insert into public.system_audit_log (
  entity_type,
  action,
  actor_role,
  source,
  reason,
  metadata
)
select
  'checkout_integrity',
  'ready_stock_fulfillment_trigger_record_fix_v1_applied',
  'system',
  'migration',
  'Restore table-specific NEW field resolution without removing the Instant Custom fulfillment guard.',
  jsonb_build_object(
    'orders_field', 'id',
    'order_items_field', 'order_id',
    'stock_reservations_field', 'order_id',
    'instant_custom_guard_preserved', true,
    'historical_orders_changed', false,
    'rls_changed', false
  )
where not exists (
  select 1
  from public.system_audit_log
  where action = 'ready_stock_fulfillment_trigger_record_fix_v1_applied'
);

commit;

;
