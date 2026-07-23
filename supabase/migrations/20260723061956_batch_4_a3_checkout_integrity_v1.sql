begin;

-- B4-A3: additive Ready Stock structured-address overload.
-- Reuses public.order_address_snapshots; no new address table and no data deletion.

create or replace function public.create_public_checkout_order(
  p_idempotency_key text,
  p_access_token_hash text,
  p_whatsapp_confirmation_hash text,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_delivery_method text,
  p_shipping_address text,
  p_pickup_location_id uuid,
  p_payment_method text,
  p_customer_notes text,
  p_items jsonb,
  p_shipping_address_snapshot jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  result_value jsonb;
  province_row public.indonesia_regions;
  regency_row public.indonesia_regions;
  district_row public.indonesia_regions;
  village_row public.indonesia_regions;
  formatted_value text;
  postal_value text;
  recipient_name_value text;
  recipient_phone_value text;
  detail_value text;
  house_value text;
  rt_value text;
  rw_value text;
  landmark_value text;
  courier_note_value text;
begin
  if p_delivery_method <> 'shipping' then
    return public.create_public_checkout_order(
      p_idempotency_key,
      p_access_token_hash,
      p_whatsapp_confirmation_hash,
      p_customer_name,
      p_customer_phone,
      p_customer_email,
      p_delivery_method,
      p_shipping_address,
      p_pickup_location_id,
      p_payment_method,
      p_customer_notes,
      p_items
    );
  end if;

  if jsonb_typeof(p_shipping_address_snapshot) <> 'object' then
    raise exception 'Alamat terstruktur wajib diisi';
  end if;

  select *
  into province_row
  from public.indonesia_regions
  where code = p_shipping_address_snapshot->>'provinceId'
    and level = 'province'
    and parent_code is null
    and is_active;

  select *
  into regency_row
  from public.indonesia_regions
  where code = p_shipping_address_snapshot->>'regencyId'
    and level = 'regency'
    and parent_code = province_row.code
    and is_active;

  select *
  into district_row
  from public.indonesia_regions
  where code = p_shipping_address_snapshot->>'districtId'
    and level = 'district'
    and parent_code = regency_row.code
    and is_active;

  select *
  into village_row
  from public.indonesia_regions
  where code = p_shipping_address_snapshot->>'villageId'
    and level = 'village'
    and parent_code = district_row.code
    and is_active;

  if province_row.code is null
     or regency_row.code is null
     or district_row.code is null
     or village_row.code is null then
    raise exception 'Hierarki alamat tidak valid';
  end if;

  postal_value := btrim(coalesce(p_shipping_address_snapshot->>'postalCode', ''));
  if postal_value !~ '^[0-9]{5}$'
     or (
       cardinality(village_row.postal_codes) > 0
       and not postal_value = any(village_row.postal_codes)
     ) then
    raise exception 'Kode pos tidak valid';
  end if;

  recipient_name_value := left(btrim(coalesce(p_shipping_address_snapshot->>'recipientName', '')), 150);
  recipient_phone_value := regexp_replace(coalesce(p_shipping_address_snapshot->>'recipientPhone', ''), '[^0-9]', '', 'g');
  detail_value := left(btrim(coalesce(p_shipping_address_snapshot->>'addressDetail', '')), 500);
  house_value := nullif(left(btrim(coalesce(p_shipping_address_snapshot->>'houseNumber', '')), 80), '');
  rt_value := nullif(left(btrim(coalesce(p_shipping_address_snapshot->>'rt', '')), 3), '');
  rw_value := nullif(left(btrim(coalesce(p_shipping_address_snapshot->>'rw', '')), 3), '');
  landmark_value := nullif(left(btrim(coalesce(p_shipping_address_snapshot->>'landmark', '')), 300), '');
  courier_note_value := nullif(left(btrim(coalesce(p_shipping_address_snapshot->>'courierNote', '')), 500), '');

  if length(recipient_name_value) < 2
     or length(recipient_phone_value) < 9
     or length(detail_value) < 5
     or (rt_value is not null and rt_value !~ '^[0-9]{1,3}$')
     or (rw_value is not null and rw_value !~ '^[0-9]{1,3}$') then
    raise exception 'Detail alamat tidak valid';
  end if;

  formatted_value := concat_ws(
    ', ',
    detail_value,
    case when house_value is not null then 'No. ' || house_value end,
    case when rt_value is not null then 'RT ' || rt_value end,
    case when rw_value is not null then 'RW ' || rw_value end,
    village_row.name,
    district_row.name,
    regency_row.name,
    province_row.name,
    postal_value
  );

  result_value := public.create_public_checkout_order(
    p_idempotency_key,
    p_access_token_hash,
    p_whatsapp_confirmation_hash,
    p_customer_name,
    p_customer_phone,
    p_customer_email,
    p_delivery_method,
    formatted_value,
    p_pickup_location_id,
    p_payment_method,
    p_customer_notes,
    p_items
  );

  insert into public.order_address_snapshots(
    order_id,
    recipient_name,
    recipient_phone,
    province_id,
    province_name,
    regency_id,
    regency_name,
    district_id,
    district_name,
    village_id,
    village_name,
    postal_code,
    address_detail,
    house_number,
    rt,
    rw,
    landmark,
    courier_note,
    formatted_address,
    fulfillment_method
  )
  values(
    (result_value->>'order_id')::uuid,
    recipient_name_value,
    recipient_phone_value,
    province_row.code,
    province_row.name,
    regency_row.code,
    regency_row.name,
    district_row.code,
    district_row.name,
    village_row.code,
    village_row.name,
    postal_value,
    detail_value,
    house_value,
    rt_value,
    rw_value,
    landmark_value,
    courier_note_value,
    formatted_value,
    'shipping'
  )
  on conflict(order_id, version) do nothing;

  return result_value;
end;
$function$;

revoke all on function public.create_public_checkout_order(
  text,text,text,text,text,text,text,text,uuid,text,text,jsonb,jsonb
) from public, anon, authenticated;

grant execute on function public.create_public_checkout_order(
  text,text,text,text,text,text,text,text,uuid,text,text,jsonb,jsonb
) to service_role;

insert into public.system_audit_log(
  entity_type,
  action,
  actor_role,
  source,
  reason,
  metadata
)
values (
  'checkout_integrity',
  'ready_stock_structured_address_v1_applied',
  'system',
  'batch_4_a3',
  'Ready Stock shipping now stores an immutable structured address snapshot',
  jsonb_build_object(
    'reused_table', 'order_address_snapshots',
    'idempotent_overload', true,
    'delete_performed', false
  )
);

commit;
