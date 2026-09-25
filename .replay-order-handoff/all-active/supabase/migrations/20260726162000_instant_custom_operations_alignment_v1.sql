begin;

create or replace function public.sync_instant_custom_order_item_services_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  service_snapshot jsonb;
begin
  if jsonb_typeof(coalesce(new.required_services, '[]'::jsonb)) <> 'array' then
    raise exception 'Snapshot layanan order tidak valid';
  end if;

  for service_snapshot in
    select value from jsonb_array_elements(coalesce(new.required_services, '[]'::jsonb))
  loop
    if coalesce(service_snapshot->>'service_id', '') !~ '^[0-9a-fA-F-]{36}$'
       or length(btrim(coalesce(service_snapshot->>'service_name', ''))) < 1 then
      raise exception 'Snapshot layanan order tidak lengkap';
    end if;

    insert into public.order_item_services(
      order_item_id,
      service_name,
      quantity,
      position,
      pricing_status,
      unit_price,
      flat_price,
      subtotal,
      notes,
      snapshot
    )
    select
      new.id,
      service_snapshot->>'service_name',
      greatest(1, coalesce((service_snapshot->>'charged_quantity')::integer, new.quantity)),
      nullif(service_snapshot->'inputs'->>'placement', ''),
      'confirmed',
      case
        when service_snapshot->>'pricing_type' = 'fixed_per_order' then null
        else (service_snapshot->>'unit_price')::numeric
      end,
      case
        when service_snapshot->>'pricing_type' = 'fixed_per_order'
          then (service_snapshot->>'unit_price')::numeric
        else null
      end,
      (service_snapshot->>'total')::numeric,
      nullif(service_snapshot->>'note', ''),
      service_snapshot
    where not exists (
      select 1
      from public.order_item_services existing
      where existing.order_item_id = new.id
        and existing.snapshot->>'service_id' = service_snapshot->>'service_id'
    );
  end loop;

  return new;
end;
$function$;

revoke all on function public.sync_instant_custom_order_item_services_v1()
from public, anon, authenticated;
grant execute on function public.sync_instant_custom_order_item_services_v1()
to service_role;

drop trigger if exists sync_instant_custom_order_item_services_v1
on public.order_items;
create trigger sync_instant_custom_order_item_services_v1
after insert or update of required_services on public.order_items
for each row execute function public.sync_instant_custom_order_item_services_v1();

create or replace function public.trigger_ensure_ready_stock_fulfillment_v2()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  target_order_id uuid;
begin
  target_order_id := case
    when tg_table_name = 'orders' then new.id
    else new.order_id
  end;

  -- A Ready Stock SKU with service work is a production-bearing order.
  -- It must enter the existing Job Order / Work Item path and may not bypass
  -- that work through the automatic pure Ready Stock fulfillment helper.
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

create or replace function public.create_ready_stock_fulfillment(p_order_id uuid)
returns public.fulfillments
language plpgsql
security definer
set search_path = ''
as $function$
declare
  result_row public.fulfillments;
begin
  if not public.has_permission('shipping.create') then
    raise exception 'Tidak berwenang mengelola pengiriman atau pickup';
  end if;
  if exists (
    select 1
    from public.order_items oi
    where oi.order_id = p_order_id
      and oi.archived_at is null
      and jsonb_typeof(coalesce(oi.required_services, '[]'::jsonb)) = 'array'
      and jsonb_array_length(coalesce(oi.required_services, '[]'::jsonb)) > 0
  ) then
    raise exception 'Order memiliki layanan wajib dan harus diselesaikan melalui Job Order sebelum fulfillment';
  end if;
  result_row := public._ensure_ready_stock_fulfillment_v2(p_order_id, 'compatibility_rpc');
  if result_row.id is null then
    raise exception 'Dokumen belum dapat dibuat karena syarat konfirmasi, pembayaran, reservasi, alamat, atau item belum lengkap';
  end if;
  return result_row;
end;
$function$;

revoke all on function public.trigger_ensure_ready_stock_fulfillment_v2()
from public, anon, authenticated;
revoke all on function public.create_ready_stock_fulfillment(uuid)
from public, anon;
grant execute on function public.create_ready_stock_fulfillment(uuid)
to authenticated, service_role;

insert into public.system_audit_log(
  entity_type, action, actor_role, source, reason, metadata
) values (
  'commerce_policy',
  'instant_custom_operations_alignment_v1_applied',
  'system',
  'migration',
  'Instant Custom service snapshots feed the existing order_item_services production path and cannot bypass work through pure Ready Stock fulfillment.',
  jsonb_build_object(
    'parallel_service_table_created', false,
    'existing_order_item_services_reused', true,
    'rls_weakened', false
  )
);

commit;
