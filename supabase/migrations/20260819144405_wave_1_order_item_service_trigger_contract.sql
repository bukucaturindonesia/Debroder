-- W1 forward correction for the existing canonical order-item service
-- trigger. The applied instant-custom migration targeted a superseded table
-- shape (pricing_status/flat_price) and omitted custom_service_id. Keep the
-- current order_item_services table as the authority and map the established
-- required_services snapshot into its actual columns.

begin;

create or replace function public.sync_instant_custom_order_item_services_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  service_snapshot jsonb;
  service_quantity integer;
  resolved_total bigint;
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

    service_quantity := greatest(
      1,
      coalesce(nullif(service_snapshot->>'charged_quantity', '')::integer, new.quantity)
    );
    resolved_total := coalesce(nullif(service_snapshot->>'total', '')::bigint, 0);

    insert into public.order_item_services(
      order_item_id,
      custom_service_id,
      service_name,
      quantity,
      position,
      notes,
      unit_price,
      subtotal,
      snapshot
    )
    select
      new.id,
      (service_snapshot->>'service_id')::uuid,
      service_snapshot->>'service_name',
      service_quantity,
      nullif(service_snapshot->'inputs'->>'placement', ''),
      nullif(service_snapshot->>'note', ''),
      coalesce(
        nullif(service_snapshot->>'unit_price', '')::bigint,
        (resolved_total::numeric / service_quantity)::bigint,
        0
      ),
      resolved_total,
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

commit;
