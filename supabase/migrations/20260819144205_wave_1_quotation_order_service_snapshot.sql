-- W1 forward correction: quotation conversion must emit the established
-- order-item service snapshot contract and let the canonical order-item
-- trigger create order_item_services exactly once.
--
-- The preceding conversion migration is already applied and is not edited.
-- This migration normalizes its live definition, replaces only the service
-- snapshot block, removes the competing direct service insert, and fails
-- closed if the expected prior definition is not present.

do $$
declare
  function_definition text;
  normalized_definition text;
  old_snapshot_block text := $old$
    required_services_snapshot := coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', qis.id,
          'custom_service_id', qis.custom_service_id,
          'service_name', qis.service_name_snapshot,
          'quantity', qis.quantity,
          'position', qis.position,
          'unit_price', coalesce(qis.unit_price, qis.flat_price),
          'subtotal', qis.subtotal,
          'notes', qis.notes
        ) order by qis.sort_order, qis.created_at, qis.id
      )
      from public.quotation_item_services qis
      where qis.quotation_item_id = item_row.id and qis.archived_at is null
    ), '[]'::jsonb);
$old$;
  new_snapshot_block text := $new$
    required_services_snapshot := coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'service_id', qis.custom_service_id,
          'service_name', qis.service_name_snapshot,
          'charged_quantity', qis.quantity,
          'inputs', jsonb_build_object('placement', qis.position),
          'pricing_type', coalesce(cs.pricing_type::text, 'fixed_per_item'),
          'unit_price', coalesce(qis.unit_price, qis.flat_price),
          'total', qis.subtotal,
          'note', qis.notes
        ) order by qis.sort_order, qis.created_at, qis.id
      )
      from public.quotation_item_services qis
      left join public.custom_services cs on cs.id = qis.custom_service_id
      where qis.quotation_item_id = item_row.id and qis.archived_at is null
    ), '[]'::jsonb);
$new$;
  service_loop_start integer;
  service_loop_end integer;
begin
  select pg_get_functiondef(
    'public.convert_quotation_to_order(uuid,uuid,text,text,text,text,text,text,uuid,text,text,bigint,bigint,text,text)'::regprocedure
  ) into function_definition;

  normalized_definition := replace(replace(function_definition, chr(13) || chr(10), chr(10)), chr(13), chr(10));
  if position(old_snapshot_block in normalized_definition) = 0 then
    raise exception 'W1 conversion service snapshot correction guard did not match';
  end if;
  normalized_definition := replace(normalized_definition, old_snapshot_block, new_snapshot_block);

  service_loop_start := position(E'\n    for service_row in' in normalized_definition);
  if service_loop_start = 0 then
    raise exception 'W1 conversion direct service loop correction guard did not match';
  end if;
  service_loop_end := position(E'\n    end loop;' in substring(normalized_definition from service_loop_start));
  if service_loop_end = 0 then
    raise exception 'W1 conversion direct service loop terminator was not found';
  end if;
  service_loop_end := service_loop_start + service_loop_end + length(E'\n    end loop;') - 1;
  normalized_definition := left(normalized_definition, service_loop_start - 1)
    || substring(normalized_definition from service_loop_end + 1);

  if position('insert into public.order_item_services' in normalized_definition) <> 0 then
    raise exception 'W1 conversion still contains a competing direct service insert';
  end if;

  execute normalized_definition;

  revoke all on function public.convert_quotation_to_order(
    uuid, uuid, text, text, text, text, text, text, uuid, text, text, bigint, bigint, text, text
  ) from public, anon;
  grant execute on function public.convert_quotation_to_order(
    uuid, uuid, text, text, text, text, text, text, uuid, text, text, bigint, bigint, text, text
  ) to authenticated, service_role;
end;
$$;
