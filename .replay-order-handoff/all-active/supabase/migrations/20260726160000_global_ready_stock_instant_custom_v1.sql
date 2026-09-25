begin;

-- Additive metadata on the existing reusable service catalog.
alter table public.custom_services
  add column if not exists input_schema jsonb not null default '[]'::jsonb;

alter table public.custom_services
  drop constraint if exists custom_services_input_schema_array_check;
alter table public.custom_services
  add constraint custom_services_input_schema_array_check
  check (jsonb_typeof(input_schema) = 'array');

update public.custom_services
set input_schema = case slug
  when 'tambah-nama' then
    '[{"key":"name","label":"Nama yang dicetak","type":"text","required":true,"maxLength":80}]'::jsonb
  when 'tambah-nomor' then
    '[{"key":"number","label":"Nomor yang dicetak","type":"number","required":true,"maxLength":3}]'::jsonb
  when 'tambah-logo' then
    '[{"key":"placement","label":"Posisi logo","type":"text","required":true,"maxLength":80}]'::jsonb
  else input_schema
end
where slug in ('tambah-nama', 'tambah-nomor', 'tambah-logo')
  and input_schema = '[]'::jsonb;

-- Owner-authorized repair of the audited Jersey QA product. No product fact,
-- media, SKU, stock, or price is invented or rewritten.
update public.custom_categories
set supports_quick_custom = true,
    supports_full_custom = true,
    updated_at = now()
where slug = 'jersey'
  and status = 'published'
  and is_active;

update public.products
set name = 'Jersey Eksperimental DEBRODER',
    nama = 'Jersey Eksperimental DEBRODER',
    description = 'Produk QA / EXPERIMENTAL untuk verifikasi Ready Stock, Custom Instan, dan Full Custom. OWNER REVIEW REQUIRED.',
    deskripsi = 'Produk QA / EXPERIMENTAL untuk verifikasi Ready Stock, Custom Instan, dan Full Custom. OWNER REVIEW REQUIRED.',
    public_description = 'QA / EXPERIMENTAL — OWNER REVIEW REQUIRED.',
    sales_mode = 'both',
    pricing_mode = 'variant_based',
    uses_configurator = true,
    admin_notes = 'OWNER OVERRIDE 2026-07-26 — QA / EXPERIMENTAL. Ready Stock dan Custom Instan memakai SKU canonical; Full Custom tetap melalui Jersey Configurator.',
    updated_at = now()
where slug = 'jersey-custom-pilot'
  and status = 'active'
  and status_aktif
  and admin_notes like 'BATCH 4 PILOT%';

-- The wrapper delegates base order/address/idempotency/inventory behavior to
-- the existing canonical checkout, then validates and snapshots reusable
-- services in the same database transaction before the deferred P7B policy
-- trigger runs. Existing no-service checkout remains untouched.
create or replace function public.create_public_instant_checkout_order(
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
  existing_order_id uuid;
  target_order_id uuid;
  item_value jsonb;
  service_value jsonb;
  field_value jsonb;
  order_item_value public.order_items;
  product_value record;
  service_record record;
  product_tier_id uuid;
  product_tier_unit_price bigint;
  product_tier_quote_required boolean;
  service_tier_id uuid;
  service_tier_unit_price bigint;
  service_tier_flat_price bigint;
  service_tier_quote_required boolean;
  pricing_quantity_value integer;
  product_unit_price bigint;
  product_subtotal bigint;
  service_unit_price bigint;
  service_charge_quantity integer;
  service_total bigint;
  line_service_total bigint;
  order_total bigint := 0;
  service_snapshots jsonb;
  input_value text;
  upload_ids jsonb;
  upload_count integer;
  selected_service_ids uuid[];
begin
  select id into existing_order_id
  from public.orders
  where public_idempotency_key = p_idempotency_key;

  if existing_order_id is not null then
    select jsonb_build_object('order_id', o.id, 'order_number', o.order_number, 'status', o.status)
    into result_value from public.orders o where o.id = existing_order_id;
    return result_value;
  end if;

  if jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) < 1
     or jsonb_array_length(p_items) > 50 then
    raise exception 'Isi keranjang tidak valid';
  end if;
  if (select coalesce(sum((entry->>'quantity')::integer), 0) from jsonb_array_elements(p_items) entry) > 500 then
    raise exception 'Total quantity keranjang tidak valid';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_items) entry
    where jsonb_typeof(coalesce(entry->'services', '[]'::jsonb)) <> 'array'
       or jsonb_array_length(coalesce(entry->'services', '[]'::jsonb)) > 10
       or (entry->>'quantity')::integer > 100
  ) then
    raise exception 'Pilihan layanan atau quantity tidak valid';
  end if;

  result_value := public.create_public_checkout_order(
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
    p_items,
    p_shipping_address_snapshot
  );
  target_order_id := (result_value->>'order_id')::uuid;

  for item_value in select value from jsonb_array_elements(p_items)
  loop
    select oi.* into order_item_value
    from public.order_items oi
    where oi.order_id = target_order_id
      and oi.variant_size_id = (item_value->>'variant_size_id')::uuid
      and oi.archived_at is null
    for update;

    if not found then raise exception 'Baris order Ready Stock tidak ditemukan'; end if;

    select
      p.sales_mode, p.pricing_mode, p.tier_scope,
      p.product_category_id,
      coalesce(p.base_price, p.price, p.harga, 0)::bigint as base_price,
      coalesce(pv.price_adjustment, 0)::bigint as variant_adjustment,
      coalesce(pvs.price_adjustment, 0)::bigint as size_adjustment
    into product_value
    from public.products p
    join public.product_variants pv on pv.product_id = p.id
    join public.product_variant_sizes pvs on pvs.variant_id = pv.id
    where pvs.id = order_item_value.variant_size_id;

    if product_value.sales_mode not in ('ready_stock', 'both')
       or product_value.pricing_mode in ('custom_quote', 'configurator_based') then
      raise exception 'Produk ini tidak tersedia melalui Ready Stock';
    end if;

    if product_value.tier_scope = 'product' then
      select coalesce(sum((entry->>'quantity')::integer), 0)
      into pricing_quantity_value
      from jsonb_array_elements(p_items) entry
      join public.product_variant_sizes pvs on pvs.id = (entry->>'variant_size_id')::uuid
      join public.product_variants pv on pv.id = pvs.variant_id
      where pv.product_id = order_item_value.product_id;
    else
      pricing_quantity_value := order_item_value.quantity;
    end if;

    product_tier_id := null;
    product_tier_unit_price := null;
    product_tier_quote_required := false;
    select ppt.id, ppt.unit_price, ppt.quote_required
    into product_tier_id, product_tier_unit_price, product_tier_quote_required
    from public.product_price_tiers ppt
    where ppt.product_id = order_item_value.product_id
      and ppt.status = 'active'
      and pricing_quantity_value >= ppt.min_quantity
      and (ppt.max_quantity is null or pricing_quantity_value <= ppt.max_quantity)
    order by ppt.min_quantity desc
    limit 1;
    if product_tier_quote_required then raise exception 'Jumlah produk memerlukan quotation'; end if;

    product_unit_price := coalesce(product_tier_unit_price, product_value.base_price)
      + product_value.variant_adjustment + product_value.size_adjustment;
    if product_unit_price < 0 then raise exception 'Harga canonical produk tidak valid'; end if;
    product_subtotal := product_unit_price * order_item_value.quantity;
    line_service_total := 0;
    service_snapshots := '[]'::jsonb;
    selected_service_ids := array[]::uuid[];

    for service_value in
      select value from jsonb_array_elements(coalesce(item_value->'services', '[]'::jsonb))
    loop
      if coalesce(service_value->>'serviceId', '') !~ '^[0-9a-fA-F-]{36}$' then
        raise exception 'Layanan Custom Instan tidak valid';
      end if;
      if (service_value->>'serviceId')::uuid = any(selected_service_ids) then
        raise exception 'Layanan Custom Instan duplikat';
      end if;
      selected_service_ids := array_append(selected_service_ids, (service_value->>'serviceId')::uuid);

      select cs.* into service_record
      from public.custom_services cs
      where cs.id = (service_value->>'serviceId')::uuid
        and cs.status = 'active'
        and not cs.requires_review
        and cs.pricing_type in ('fixed_per_item', 'fixed_per_order', 'tiered')
        and exists (
          select 1 from public.custom_service_compatibilities csc
          where csc.service_id = cs.id and csc.is_active
            and (
              csc.product_id = order_item_value.product_id
              or csc.custom_category_id in (
                select cc.id from public.custom_categories cc
                where cc.source_product_category_id = product_value.product_category_id
                  and cc.status = 'published' and cc.is_active and cc.supports_quick_custom
              )
            )
        )
      for share;
      if not found then raise exception 'Layanan tidak aktif atau tidak berlaku untuk produk'; end if;
      if order_item_value.quantity < service_record.minimum_quantity
         or (service_record.maximum_quantity is not null and order_item_value.quantity > service_record.maximum_quantity) then
        raise exception 'Quantity layanan tidak valid';
      end if;

      if jsonb_typeof(coalesce(service_value->'inputs', '{}'::jsonb)) <> 'object' then
        raise exception 'Input layanan tidak valid';
      end if;
      for field_value in select value from jsonb_array_elements(service_record.input_schema)
      loop
        input_value := btrim(coalesce(service_value->'inputs'->>(field_value->>'key'), ''));
        if coalesce((field_value->>'required')::boolean, false) and input_value = '' then
          raise exception 'Input layanan wajib diisi';
        end if;
        if nullif(field_value->>'maxLength', '') is not null
           and length(input_value) > (field_value->>'maxLength')::integer then
          raise exception 'Input layanan terlalu panjang';
        end if;
        if field_value->>'type' = 'number' and input_value <> '' and input_value !~ '^[0-9]+$' then
          raise exception 'Input angka layanan tidak valid';
        end if;
        if field_value->>'type' = 'select' and input_value <> ''
           and not (coalesce(field_value->'options', '[]'::jsonb) ? input_value) then
          raise exception 'Pilihan input layanan tidak valid';
        end if;
      end loop;
      if service_record.requires_notes and length(btrim(coalesce(service_value->>'note', ''))) < 1 then
        raise exception 'Catatan layanan wajib diisi';
      end if;

      upload_ids := coalesce(service_value->'uploadIds', '[]'::jsonb);
      if jsonb_typeof(upload_ids) <> 'array' or jsonb_array_length(upload_ids) > 10 then
        raise exception 'Referensi upload layanan tidak valid';
      end if;
      if service_record.requires_upload and (
        jsonb_array_length(upload_ids) < 1
        or length(coalesce(service_value->>'uploadSessionToken', '')) < 8
      ) then
        raise exception 'File layanan wajib diunggah';
      end if;
      if jsonb_array_length(upload_ids) > 0 then
        select count(*) into upload_count
        from public.customer_uploads cu
        where cu.id in (select value::uuid from jsonb_array_elements_text(upload_ids))
          and cu.session_token = service_value->>'uploadSessionToken'
          and cu.status in ('uploaded', 'linked');
        if upload_count <> jsonb_array_length(upload_ids) then
          raise exception 'Referensi upload layanan tidak valid';
        end if;
      end if;

      service_tier_id := null;
      service_tier_unit_price := null;
      service_tier_flat_price := null;
      service_tier_quote_required := false;
      if service_record.pricing_type = 'tiered' then
        select spr.id, spr.unit_price, spr.flat_price, spr.quote_required
        into service_tier_id, service_tier_unit_price, service_tier_flat_price, service_tier_quote_required
        from public.service_pricing_rules spr
        where spr.service_id = service_record.id
          and spr.status = 'active'
          and order_item_value.quantity >= spr.min_quantity
          and (spr.max_quantity is null or order_item_value.quantity <= spr.max_quantity)
        order by spr.min_quantity desc limit 1;
        if service_tier_id is null or service_tier_quote_required then
          raise exception 'Layanan memerlukan quotation';
        end if;
      end if;

      service_unit_price := case
        when service_record.pricing_type = 'tiered'
          then coalesce(service_tier_unit_price, service_tier_flat_price)
        else service_record.base_price
      end;
      service_charge_quantity := case
        when service_record.pricing_type = 'fixed_per_order'
          or (service_record.pricing_type = 'tiered' and service_tier_flat_price is not null) then 1
        else order_item_value.quantity
      end;
      if service_unit_price is null or service_unit_price < 0 then
        raise exception 'Harga layanan tidak valid';
      end if;
      service_total := service_unit_price * service_charge_quantity;
      line_service_total := line_service_total + service_total;
      service_snapshots := service_snapshots || jsonb_build_array(jsonb_build_object(
        'schema_version', 1,
        'service_id', service_record.id,
        'service_code', service_record.slug,
        'service_name', service_record.name,
        'pricing_type', service_record.pricing_type,
        'source_rule_id', coalesce(service_tier_id::text, 'service:' || service_record.id::text),
        'unit_price', service_unit_price,
        'charged_quantity', service_charge_quantity,
        'total', service_total,
        'inputs', coalesce(service_value->'inputs', '{}'::jsonb),
        'upload_ids', upload_ids,
        'note', nullif(left(btrim(coalesce(service_value->>'note', '')), 1000), ''),
        'definition_version', service_record.updated_at
      ));
    end loop;

    update public.order_items
    set unit_price = product_unit_price,
        subtotal = product_subtotal + line_service_total,
        pricing_status = 'final',
        required_services = service_snapshots,
        config_snapshot = config_snapshot || jsonb_build_object(
          'instant_custom', jsonb_build_object(
            'version', 1,
            'requires_service', jsonb_array_length(service_snapshots) > 0,
            'services', service_snapshots
          )
        ),
        pricing_snapshot = jsonb_build_object(
          'schema_version', 2,
          'calculated_by', 'server',
          'sales_mode', product_value.sales_mode,
          'pricing_mode', product_value.pricing_mode,
          'tier_scope', product_value.tier_scope,
          'pricing_quantity', pricing_quantity_value,
          'product_id', order_item_value.product_id,
          'variant_id', order_item_value.variant_id,
          'variant_size_id', order_item_value.variant_size_id,
          'base_price', product_value.base_price,
          'tier', case when product_tier_id is null then null else jsonb_build_object(
            'id', product_tier_id, 'unit_price', product_tier_unit_price,
            'quote_required', product_tier_quote_required
          ) end,
          'variant_adjustment', product_value.variant_adjustment,
          'size_adjustment', product_value.size_adjustment,
          'unit_price', product_unit_price,
          'quantity', order_item_value.quantity,
          'product_subtotal', product_subtotal,
          'service_subtotal', line_service_total,
          'services', service_snapshots,
          'subtotal', product_subtotal + line_service_total
        ),
        updated_at = now()
    where id = order_item_value.id;
    order_total := order_total + product_subtotal + line_service_total;
  end loop;

  update public.orders
  set subtotal_amount = order_total,
      total_amount = order_total,
      payment_required_amount = order_total,
      payment_balance = order_total,
      source_snapshot = source_snapshot || jsonb_build_object('instant_custom_version', 1),
      updated_at = now()
  where id = target_order_id;

  insert into public.system_audit_log(
    entity_type, entity_id, action, actor_role, source, request_id, new_value
  ) values (
    'order', target_order_id, 'instant_custom_services_priced',
    'customer', 'global_ready_stock_instant_custom_v1', p_idempotency_key,
    jsonb_build_object('subtotal', order_total)
  );

  return result_value;
end;
$function$;

revoke all on function public.create_public_instant_checkout_order(
  text,text,text,text,text,text,text,text,uuid,text,text,jsonb,jsonb
) from public, anon, authenticated;
grant execute on function public.create_public_instant_checkout_order(
  text,text,text,text,text,text,text,text,uuid,text,text,jsonb,jsonb
) to service_role;

insert into public.system_audit_log(
  entity_type, action, actor_role, source, reason, metadata
) values (
  'commerce_policy',
  'global_ready_stock_instant_custom_v1_applied',
  'system',
  'migration',
  'Reusable fixed/tier service add-ons now support server-authoritative Ready Stock checkout without changing Full Custom.',
  jsonb_build_object(
    'additive_schema', true,
    'historical_rows_rewritten', false,
    'rls_weakened', false,
    'jersey_qa_owner_override', true
  )
);

commit;
