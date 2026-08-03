begin;

-- Configured Jersey remains a public checkout line, but it is neither a
-- Ready Stock SKU nor a generic Custom Project. The existing commerce-mode
-- trigger is extended only for a server-priced configured snapshot.
create or replace function public.enforce_public_order_item_commerce_mode_v1()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  order_source text;
  product_sales_mode text;
  product_pricing_mode text;
  is_configured_checkout boolean;
begin
  select o.checkout_source into order_source
  from public.orders o where o.id = new.order_id;

  if coalesce(order_source, '') <> 'public_checkout' or new.product_id is null then
    return new;
  end if;

  select p.sales_mode, p.pricing_mode
  into product_sales_mode, product_pricing_mode
  from public.products p where p.id = new.product_id;

  if not found then raise exception 'Produk canonical tidak ditemukan'; end if;

  is_configured_checkout :=
    new.custom_project_id is null
    and new.product_type = 'configurable_product'
    and new.variant_id is null
    and new.variant_size_id is null
    and new.config_snapshot->>'checkout_mode' = 'configured_product'
    and jsonb_typeof(new.config_snapshot->'configured_product') = 'object'
    and jsonb_typeof(new.pricing_snapshot) = 'object'
    and new.pricing_snapshot <> '{}'::jsonb;

  if is_configured_checkout then
    if product_sales_mode not in ('custom', 'both')
       or product_pricing_mode <> 'configurator_based' then
      raise exception 'Produk ini tidak tersedia melalui configured checkout';
    end if;
    return new;
  end if;

  if new.custom_project_id is null then
    if product_sales_mode not in ('ready_stock','both') then
      raise exception 'Produk ini tidak tersedia melalui Ready Stock';
    end if;
    if product_pricing_mode in ('configurator_based','custom_quote') then
      raise exception 'Produk custom harus melalui Custom Project';
    end if;
  else
    if product_sales_mode not in ('custom','both') then
      raise exception 'Produk ini tidak tersedia melalui Custom Project';
    end if;
  end if;

  return new;
end;
$function$;

revoke all on function public.enforce_public_order_item_commerce_mode_v1()
from public, anon, authenticated;
grant execute on function public.enforce_public_order_item_commerce_mode_v1()
to service_role;

create or replace function public.create_public_configured_checkout_order(
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
  p_shipping_address_snapshot jsonb,
  p_configured_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  existing_order public.orders;
  new_order_id uuid := gen_random_uuid();
  new_order_number text;
  normalized_phone text := regexp_replace(coalesce(p_customer_phone,''),'[^0-9]','','g');
  item_value jsonb;
  snapshot_value jsonb;
  product_row record;
  quantity_value integer;
  unit_price_value bigint;
  item_subtotal bigint;
  subtotal_value bigint := 0;
  active_unpaid integer;
  fingerprint_value text;
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
  if p_idempotency_key !~ '^[a-zA-Z0-9_-]{16,100}$' then
    raise exception 'Kunci checkout tidak valid';
  end if;
  if p_access_token_hash !~ '^[0-9a-f]{64}$'
     or p_whatsapp_confirmation_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Token checkout tidak valid';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_idempotency_key, 0)
  );
  select * into existing_order
  from public.orders
  where public_idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object(
      'order_id', existing_order.id,
      'order_number', existing_order.order_number,
      'status', existing_order.status
    );
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) <> 0 then
    raise exception 'Configured checkout tidak boleh berisi Ready Stock';
  end if;
  if jsonb_typeof(p_configured_items) <> 'array'
     or jsonb_array_length(p_configured_items) < 1
     or jsonb_array_length(p_configured_items) > 50 then
    raise exception 'Configured item tidak valid';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_configured_items) entry
    group by entry->>'line_id' having count(*) > 1
  ) then
    raise exception 'Configured item duplikat';
  end if;
  if (
    select coalesce(sum((entry#>>'{snapshot,draft,quantity}')::integer), 0)
    from jsonb_array_elements(p_configured_items) entry
  ) > 500 then
    raise exception 'Total quantity configured item tidak valid';
  end if;

  if length(btrim(coalesce(p_customer_name,''))) < 2 then
    raise exception 'Nama pelanggan tidak valid';
  end if;
  if length(normalized_phone) < 9 or length(normalized_phone) > 15 then
    raise exception 'Nomor WhatsApp tidak valid';
  end if;
  if nullif(btrim(coalesce(p_customer_email,'')),'') is not null
     and p_customer_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Email tidak valid';
  end if;
  if p_delivery_method not in ('pickup','shipping') then
    raise exception 'Metode fulfillment tidak valid';
  end if;
  if p_delivery_method = 'pickup'
     and (
       p_pickup_location_id is null
       or not exists (
         select 1 from public.stores
         where id = p_pickup_location_id
           and status_aktif = true
           and coalesce(status,'published') in ('published','active')
       )
     ) then
    raise exception 'Lokasi pickup tidak aktif';
  end if;
  if p_payment_method not in ('bank_transfer','pay_at_store')
     or (p_delivery_method = 'shipping' and p_payment_method <> 'bank_transfer') then
    raise exception 'Metode pembayaran tidak valid';
  end if;

  formatted_value := '';
  if p_delivery_method = 'shipping' then
    if jsonb_typeof(p_shipping_address_snapshot) <> 'object' then
      raise exception 'Alamat terstruktur wajib diisi';
    end if;

    select * into province_row
    from public.indonesia_regions
    where code = p_shipping_address_snapshot->>'provinceId'
      and level = 'province' and parent_code is null and is_active;
    select * into regency_row
    from public.indonesia_regions
    where code = p_shipping_address_snapshot->>'regencyId'
      and level = 'regency' and parent_code = province_row.code and is_active;
    select * into district_row
    from public.indonesia_regions
    where code = p_shipping_address_snapshot->>'districtId'
      and level = 'district' and parent_code = regency_row.code and is_active;
    select * into village_row
    from public.indonesia_regions
    where code = p_shipping_address_snapshot->>'villageId'
      and level = 'village' and parent_code = district_row.code and is_active;

    if province_row.code is null or regency_row.code is null
       or district_row.code is null or village_row.code is null then
      raise exception 'Hierarki alamat tidak valid';
    end if;

    postal_value := btrim(coalesce(p_shipping_address_snapshot->>'postalCode',''));
    if postal_value !~ '^[0-9]{5}$'
       or (
         cardinality(village_row.postal_codes) > 0
         and not postal_value = any(village_row.postal_codes)
       ) then
      raise exception 'Kode pos tidak valid';
    end if;

    recipient_name_value := left(btrim(coalesce(p_shipping_address_snapshot->>'recipientName','')),150);
    recipient_phone_value := regexp_replace(coalesce(p_shipping_address_snapshot->>'recipientPhone',''),'[^0-9]','','g');
    detail_value := left(btrim(coalesce(p_shipping_address_snapshot->>'addressDetail','')),500);
    house_value := nullif(left(btrim(coalesce(p_shipping_address_snapshot->>'houseNumber','')),80),'');
    rt_value := nullif(left(btrim(coalesce(p_shipping_address_snapshot->>'rt','')),3),'');
    rw_value := nullif(left(btrim(coalesce(p_shipping_address_snapshot->>'rw','')),3),'');
    landmark_value := nullif(left(btrim(coalesce(p_shipping_address_snapshot->>'landmark','')),300),'');
    courier_note_value := nullif(left(btrim(coalesce(p_shipping_address_snapshot->>'courierNote','')),500),'');

    if length(recipient_name_value) < 2
       or length(recipient_phone_value) < 9
       or length(detail_value) < 5
       or (rt_value is not null and rt_value !~ '^[0-9]{1,3}$')
       or (rw_value is not null and rw_value !~ '^[0-9]{1,3}$') then
      raise exception 'Detail alamat tidak valid';
    end if;

    formatted_value := concat_ws(
      ', ', detail_value,
      case when house_value is not null then 'No. ' || house_value end,
      case when rt_value is not null then 'RT ' || rt_value end,
      case when rw_value is not null then 'RW ' || rw_value end,
      village_row.name, district_row.name, regency_row.name,
      province_row.name, postal_value
    );
  end if;

  select count(*) into active_unpaid
  from public.orders
  where regexp_replace(customer_phone,'[^0-9]','','g') = normalized_phone
    and archived_at is null
    and status not in ('completed','cancelled','expired','selesai','dibatalkan')
    and payment_status not in ('paid','terverifikasi','refunded');
  if active_unpaid >= 2 then
    raise exception 'Maksimal dua pesanan belum dibayar per nomor WhatsApp';
  end if;

  new_order_number := public.next_order_number();
  insert into public.orders(
    id, order_number, customer_name, customer_phone, customer_email, status,
    total_amount, subtotal_amount, customer_notes, delivery_method,
    shipping_address, payment_status, payment_requirement_type,
    payment_required_percentage, payment_method, pickup_location_id,
    public_idempotency_key, public_access_token_hash,
    whatsapp_confirmation_hash, whatsapp_confirmation_expires_at,
    checkout_source, source_snapshot, pricing_status
  ) values (
    new_order_id, new_order_number, btrim(p_customer_name), normalized_phone,
    nullif(btrim(coalesce(p_customer_email,'')),''),
    'pending_confirmation', 0, 0,
    left(btrim(coalesce(p_customer_notes,'')),2000),
    p_delivery_method,
    case when p_delivery_method = 'shipping' then formatted_value else '' end,
    'unpaid', 'full', 100, p_payment_method, p_pickup_location_id,
    p_idempotency_key, p_access_token_hash,
    p_whatsapp_confirmation_hash, now() + interval '60 minutes',
    'public_checkout',
    jsonb_build_object(
      'channel','web',
      'checkout_version','configured_product_v1',
      'configured_item_count',jsonb_array_length(p_configured_items)
    ),
    'final'
  );

  for item_value in select value from jsonb_array_elements(p_configured_items)
  loop
    snapshot_value := item_value->'snapshot';
    fingerprint_value := snapshot_value->>'inputFingerprint';

    if coalesce(item_value->>'line_id','') = ''
       or coalesce(item_value->>'product_id','') !~ '^[0-9a-fA-F-]{36}$'
       or jsonb_typeof(snapshot_value) <> 'object'
       or snapshot_value->>'immutable' <> 'true'
       or fingerprint_value !~ '^[0-9a-f]{64}$'
       or snapshot_value#>>'{definition,productId}' <> item_value->>'product_id'
       or snapshot_value#>>'{definition,id}' <> item_value->>'product_id'
       or snapshot_value#>>'{definition,pricingMode}' <> 'server_priced'
       or snapshot_value#>>'{draft,definitionId}' <> item_value->>'product_id'
       or snapshot_value#>>'{draft,definitionVersion}' <> snapshot_value#>>'{definition,version}'
       or snapshot_value#>>'{validation,valid}' <> 'true'
       or snapshot_value#>>'{validation,pricingStatus}' <> 'priced'
       or snapshot_value#>>'{pricing,immutable}' <> 'true'
       or snapshot_value#>>'{pricing,status}' <> 'priced'
       or snapshot_value#>>'{pricing,inputFingerprint}' <> fingerprint_value
       or snapshot_value#>>'{pricing,totals,grandTotal,currency}' <> 'IDR' then
      raise exception 'Configured snapshot tidak valid';
    end if;

    quantity_value := (snapshot_value#>>'{draft,quantity}')::integer;
    if quantity_value < 1 or quantity_value > 100
       or (snapshot_value#>>'{pricing,quantity}')::integer <> quantity_value then
      raise exception 'Quantity configured item tidak valid';
    end if;

    select
      p.id, coalesce(nullif(p.name,''),p.nama) product_name,
      p.sku, p.sales_mode, p.pricing_mode, p.product_type,
      p.uses_configurator,
      coalesce(p.base_price,p.price,p.harga,0)::bigint base_price,
      p.minimum_order_qty
    into product_row
    from public.products p
    where p.id = (item_value->>'product_id')::uuid
      and p.status = 'active'
      and p.status_aktif = true
      and p.product_type = 'configurable_product'
      and p.pricing_mode = 'configurator_based'
      and p.sales_mode in ('custom','both')
      and p.uses_configurator = true
      and p.config_schema @> '{"entry_type":"jersey_configurator"}'::jsonb
    for share;
    if not found then
      raise exception 'Produk configured tidak lagi aktif';
    end if;
    if quantity_value < coalesce(product_row.minimum_order_qty,1) then
      raise exception 'Minimum quantity configured item tidak terpenuhi';
    end if;

    unit_price_value := product_row.base_price;
    item_subtotal := unit_price_value * quantity_value;
    if unit_price_value < 0
       or item_subtotal <> (snapshot_value#>>'{pricing,totals,grandTotal,amount}')::bigint
       or item_subtotal <> (snapshot_value#>>'{pricing,totals,subtotal,amount}')::bigint then
      raise exception 'Harga configured item berubah';
    end if;

    insert into public.order_items(
      id, order_id, product_id, product_name, product_type,
      variant_id, variant_size_id, variant_name, color, size, sku,
      quantity, unit_price, subtotal, notes, config_snapshot,
      required_services, pricing_status, pricing_snapshot
    ) values (
      gen_random_uuid(), new_order_id, product_row.id,
      product_row.product_name, 'configurable_product',
      null, null, 'Configured Jersey', '', '',
      product_row.sku, quantity_value, unit_price_value, item_subtotal,
      left(coalesce(snapshot_value#>>'{draft,note}',''),1000),
      jsonb_build_object(
        'checkout_mode','configured_product',
        'configured_product',snapshot_value
      ),
      coalesce(snapshot_value#>'{definition,serviceRequirements}','[]'::jsonb),
      'final',
      snapshot_value->'pricing'
    );
    subtotal_value := subtotal_value + item_subtotal;
  end loop;

  update public.orders
  set subtotal_amount = subtotal_value,
      total_amount = subtotal_value,
      payment_required_amount = subtotal_value,
      payment_balance = subtotal_value,
      updated_at = now()
  where id = new_order_id;

  if p_delivery_method = 'shipping' then
    insert into public.order_address_snapshots(
      order_id, recipient_name, recipient_phone,
      province_id, province_name, regency_id, regency_name,
      district_id, district_name, village_id, village_name,
      postal_code, address_detail, house_number, rt, rw,
      landmark, courier_note, formatted_address, fulfillment_method
    ) values (
      new_order_id, recipient_name_value, recipient_phone_value,
      province_row.code, province_row.name, regency_row.code, regency_row.name,
      district_row.code, district_row.name, village_row.code, village_row.name,
      postal_value, detail_value, house_value, rt_value, rw_value,
      landmark_value, courier_note_value, formatted_value, 'shipping'
    )
    on conflict(order_id, version) do nothing;
  end if;

  insert into public.order_status_history(order_id,from_status,to_status,note)
  values(
    new_order_id,null,'pending_confirmation',
    'Configured Jersey dibuat dengan harga pasti dan snapshot server.'
  );
  insert into public.system_audit_log(
    entity_type,entity_id,action,actor_role,source,request_id,new_value
  ) values (
    'order',new_order_id,'public_configured_checkout_created',
    'customer','configured_jersey_checkout_v1',p_idempotency_key,
    jsonb_build_object(
      'order_number',new_order_number,
      'subtotal',subtotal_value,
      'configured_item_count',jsonb_array_length(p_configured_items)
    )
  );

  return jsonb_build_object(
    'order_id',new_order_id,
    'order_number',new_order_number,
    'status','pending_confirmation'
  );
end;
$function$;

revoke all on function public.create_public_configured_checkout_order(
  text,text,text,text,text,text,text,text,uuid,text,text,jsonb,jsonb,jsonb
) from public, anon, authenticated;
grant execute on function public.create_public_configured_checkout_order(
  text,text,text,text,text,text,text,text,uuid,text,text,jsonb,jsonb,jsonb
) to service_role;

insert into public.system_audit_log(
  entity_type, action, actor_role, source, reason, metadata
) values (
  'checkout_integrity',
  'configured_jersey_checkout_v1_applied',
  'owner',
  'migration',
  'Configured Jersey now reuses public checkout, order, payment, tracking, and immutable pricing snapshot architecture.',
  jsonb_build_object(
    'additive_rpc',true,
    'client_price_trusted',false,
    'order_before_payment',true,
    'idempotency_lock',true,
    'payment_architecture_changed',false,
    'historical_orders_changed',false,
    'rls_changed',false
  )
);

commit;

;
