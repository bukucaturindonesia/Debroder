begin;

-- A quotation can produce at most one transaction order.  This is a
-- canonical identity constraint, not a second idempotency subsystem.
create unique index if not exists orders_quotation_conversion_unique
  on public.orders(quotation_id)
  where quotation_id is not null;

create unique index if not exists orders_quotation_conversion_idempotency_unique
  on public.orders(idempotency_key)
  where checkout_source = 'quotation' and idempotency_key is not null;

create or replace function public.convert_quotation_to_order(
  p_quotation_id uuid,
  p_customer_id uuid,
  p_customer_name text,
  p_company_name text,
  p_customer_phone text,
  p_customer_email text,
  p_billing_address text,
  p_delivery_method text,
  p_pickup_location_id uuid,
  p_shipping_address text,
  p_payment_method text,
  p_shipping_cost bigint,
  p_resolved_price bigint,
  p_transaction_status text,
  p_idempotency_key text
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $function$
declare
  quotation_row public.quotations;
  version_row public.quotation_versions;
  mockup_row public.mockup_sets;
  existing_order public.orders;
  new_order public.orders;
  item_row public.quotation_items;
  service_row public.quotation_item_services;
  new_order_id uuid := gen_random_uuid();
  new_order_number text;
  normalized_key text := nullif(btrim(coalesce(p_idempotency_key, '')), '');
  normalized_customer_name text := nullif(btrim(coalesce(p_customer_name, '')), '');
  normalized_company_name text := nullif(btrim(coalesce(p_company_name, '')), '');
  normalized_customer_phone text := nullif(btrim(coalesce(p_customer_phone, '')), '');
  normalized_customer_email text := nullif(btrim(coalesce(p_customer_email, '')), '');
  normalized_billing_address text := nullif(btrim(coalesce(p_billing_address, '')), '');
  normalized_delivery text := lower(btrim(coalesce(p_delivery_method, '')));
  normalized_shipping_address text := nullif(btrim(coalesce(p_shipping_address, '')), '');
  normalized_payment text := lower(btrim(coalesce(p_payment_method, '')));
  normalized_status text := lower(btrim(coalesce(p_transaction_status, '')));
  conversion_snapshot jsonb;
  source_snapshot jsonb;
  required_services_snapshot jsonb;
  item_product_type text;
  item_count integer;
  approved_mockup_count integer;
  item_id uuid;
  service_unit_price bigint;
begin
  -- The RPC is callable only through the authenticated admin boundary.  The
  -- service role grant is retained for trusted server-side jobs, but it does
  -- not weaken the authenticated permission contract.
  if auth.role() <> 'service_role'
     and (
       not public.has_permission('quotation.write')
       or not public.has_permission('order.edit')
     ) then
    raise exception 'Not authorized to convert quotation to order';
  end if;

  if p_quotation_id is null then
    raise exception 'Quotation is required';
  end if;
  if normalized_key is null
     or normalized_key !~ '^[A-Za-z0-9_-]{12,160}$' then
    raise exception 'Quotation conversion idempotency key is invalid';
  end if;

  -- Serialize both the material request identity and the quotation identity.
  -- The unique indexes remain the final database guard for races that cross
  -- transaction boundaries.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('quotation-order-conversion:key:' || normalized_key, 0)
  );

  select * into existing_order
  from public.orders
  where checkout_source = 'quotation'
    and idempotency_key = normalized_key
  for update;

  if found and existing_order.quotation_id is distinct from p_quotation_id then
    raise exception 'Quotation conversion idempotency key is bound to another quotation';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('quotation-order-conversion:quotation:' || p_quotation_id::text, 0)
  );

  select * into quotation_row
  from public.quotations
  where id = p_quotation_id and archived_at is null
  for update;

  if not found then
    raise exception 'Quotation not found or archived';
  end if;

  select * into existing_order
  from public.orders
  where quotation_id = quotation_row.id
  for update;

  if found then
    -- A replay returns the same order only when every material conversion
    -- input matches the immutable conversion evidence.  Any conflict fails
    -- closed rather than silently mutating the existing transaction.
    if existing_order.checkout_source <> 'quotation'
       or jsonb_typeof(existing_order.source_snapshot->'conversion') <> 'object' then
      raise exception 'Quotation already has an order outside the conversion contract';
    end if;
    if (existing_order.source_snapshot #>> '{conversion,idempotency_key}') is distinct from normalized_key
       or (existing_order.source_snapshot #>> '{conversion,customer_id}') is distinct from p_customer_id::text
       or (existing_order.source_snapshot #>> '{conversion,customer_name}') is distinct from normalized_customer_name
       or (existing_order.source_snapshot #>> '{conversion,company_name}') is distinct from normalized_company_name
       or (existing_order.source_snapshot #>> '{conversion,customer_phone}') is distinct from normalized_customer_phone
       or (existing_order.source_snapshot #>> '{conversion,customer_email}') is distinct from normalized_customer_email
       or (existing_order.source_snapshot #>> '{conversion,billing_address}') is distinct from normalized_billing_address
       or (existing_order.source_snapshot #>> '{conversion,delivery_method}') is distinct from normalized_delivery
       or (existing_order.source_snapshot #>> '{conversion,pickup_location_id}') is distinct from p_pickup_location_id::text
       or (existing_order.source_snapshot #>> '{conversion,shipping_address}') is distinct from normalized_shipping_address
       or (existing_order.source_snapshot #>> '{conversion,payment_method}') is distinct from normalized_payment
       or (existing_order.source_snapshot #>> '{conversion,shipping_cost}') is distinct from p_shipping_cost::text
       or (existing_order.source_snapshot #>> '{conversion,resolved_price}') is distinct from p_resolved_price::text
       or (existing_order.source_snapshot #>> '{conversion,transaction_status}') is distinct from normalized_status then
      raise exception 'Conflicting quotation conversion replay';
    end if;
    return existing_order;
  end if;

  if quotation_row.status <> 'approved' then
    raise exception 'Quotation is not approved for conversion';
  end if;
  if quotation_row.has_pending_pricing
     or quotation_row.confirmed_total is null
     or p_resolved_price is null
     or p_resolved_price < 0
     or p_resolved_price <> quotation_row.confirmed_total then
    raise exception 'Quotation has unresolved or conflicting pricing';
  end if;

  if normalized_customer_name is null
     or normalized_customer_name is distinct from nullif(btrim(quotation_row.customer_name), '')
     or normalized_customer_phone is null
     or normalized_customer_phone is distinct from nullif(btrim(quotation_row.customer_phone), '')
     or p_customer_id is distinct from quotation_row.customer_id
     or normalized_company_name is distinct from nullif(btrim(quotation_row.company_name), '')
     or normalized_customer_email is distinct from nullif(btrim(quotation_row.customer_email), '')
     or normalized_billing_address is distinct from nullif(btrim(quotation_row.billing_address), '') then
    raise exception 'Customer identity does not match the approved quotation';
  end if;

  if normalized_delivery not in ('pickup', 'shipping') then
    raise exception 'Delivery method must be pickup or shipping';
  end if;
  if normalized_payment not in ('bank_transfer', 'pay_at_store') then
    raise exception 'Payment method is not supported by the current order contract';
  end if;
  if normalized_status <> 'under_review' then
    raise exception 'Quotation conversion transaction status must be under_review';
  end if;

  if normalized_delivery = 'pickup' then
    if p_pickup_location_id is null then
      raise exception 'Pickup store is required';
    end if;
    if normalized_shipping_address is not null then
      raise exception 'Pickup cannot include a competing shipping destination';
    end if;
    if p_shipping_cost is distinct from 0 then
      raise exception 'Pickup requires an explicit zero shipping cost';
    end if;
    if normalized_payment not in ('bank_transfer', 'pay_at_store') then
      raise exception 'Pickup payment method is invalid';
    end if;
    if not exists (
      select 1
      from public.stores
      where id = p_pickup_location_id
        and status_aktif = true
        and coalesce(status, 'published') in ('published', 'active')
        and archived_at is null
    ) then
      raise exception 'Pickup store is not active';
    end if;
    if auth.role() <> 'service_role'
       and not public.can_access_store(p_pickup_location_id) then
      raise exception 'Pickup store is outside the actor store scope';
    end if;
  else
    if p_pickup_location_id is not null then
      raise exception 'Shipping cannot include a competing pickup store';
    end if;
    if normalized_shipping_address is null
       or char_length(normalized_shipping_address) < 10 then
      raise exception 'Shipping destination is required';
    end if;
    if p_shipping_cost is null or p_shipping_cost < 0 then
      raise exception 'Resolved shipping cost is required';
    end if;
    if normalized_payment <> 'bank_transfer' then
      raise exception 'Shipping currently supports bank_transfer only';
    end if;
  end if;

  -- The approved parent status and approved_version_id are the current
  -- quotation authority.  W1 status transition keeps the active version in
  -- sent state while the parent is approved, so sent and approved are both
  -- valid only when the approved pointer is also the current version.
  if quotation_row.approved_version_id is null
     or quotation_row.latest_version_id is null
     or quotation_row.approved_version_id <> quotation_row.latest_version_id then
    raise exception 'Approved quotation version is invalid';
  end if;

  select * into version_row
  from public.quotation_versions
  where id = quotation_row.approved_version_id
    and quotation_id = quotation_row.id
    and version_number = quotation_row.current_version
    and version_status in ('sent', 'approved')
  for update;

  if not found or jsonb_typeof(version_row.snapshot) <> 'object' then
    raise exception 'Approved quotation version is invalid';
  end if;

  select count(*) into item_count
  from public.quotation_items
  where quotation_id = quotation_row.id and archived_at is null;
  if item_count < 1 then
    raise exception 'Quotation has no active items';
  end if;
  if exists (
    select 1
    from public.quotation_items
    where quotation_id = quotation_row.id
      and archived_at is null
      and (pricing_status <> 'confirmed' or unit_price is null or subtotal is null)
  ) then
    raise exception 'Quotation item pricing is unresolved';
  end if;
  if exists (
    select 1
    from public.quotation_item_services qis
    join public.quotation_items qi on qi.id = qis.quotation_item_id
    where qi.quotation_id = quotation_row.id
      and qi.archived_at is null
      and qis.archived_at is null
      and (
        qis.pricing_status <> 'confirmed'
        or coalesce(qis.unit_price, qis.flat_price) is null
        or qis.subtotal is null
      )
  ) then
    raise exception 'Quotation service pricing is unresolved';
  end if;

  select count(*) into approved_mockup_count
  from public.mockup_sets
  where quotation_id = quotation_row.id
    and status = 'approved'
    and archived_at is null;
  if approved_mockup_count <> 1 then
    raise exception 'Exactly one active approved mockup is required';
  end if;

  select * into mockup_row
  from public.mockup_sets
  where quotation_id = quotation_row.id
    and status = 'approved'
    and archived_at is null
  order by updated_at desc, id desc
  limit 1
  for update;

  new_order_number := public.issue_document_number(
    'order',
    'order',
    new_order_id,
    'quotation-order:' || normalized_key,
    jsonb_build_object('quotation_id', quotation_row.id, 'source', 'quotation_conversion')
  );

  conversion_snapshot := jsonb_build_object(
    'contract', 'wave_1_quotation_to_order_v1',
    'idempotency_key', normalized_key,
    'customer_id', p_customer_id,
    'customer_name', normalized_customer_name,
    'company_name', normalized_company_name,
    'customer_phone', normalized_customer_phone,
    'customer_email', normalized_customer_email,
    'billing_address', normalized_billing_address,
    'delivery_method', normalized_delivery,
    'pickup_location_id', p_pickup_location_id,
    'shipping_address', normalized_shipping_address,
    'payment_method', normalized_payment,
    'shipping_cost', p_shipping_cost,
    'resolved_price', p_resolved_price,
    'transaction_status', normalized_status,
    'actor_id', auth.uid(),
    'converted_at', now()
  );

  source_snapshot := jsonb_build_object(
    'source', 'quotation_conversion',
    'quotation', to_jsonb(quotation_row),
    'quotation_version', jsonb_build_object(
      'id', version_row.id,
      'quotation_id', version_row.quotation_id,
      'version_number', version_row.version_number,
      'version_status', version_row.version_status,
      'snapshot', version_row.snapshot
    ),
    'approved_mockup', to_jsonb(mockup_row),
    'conversion', conversion_snapshot
  );

  insert into public.orders(
    id,
    order_number,
    customer_user_id,
    customer_id,
    customer_name,
    company_name,
    customer_phone,
    customer_email,
    billing_address,
    shipping_address,
    status,
    total_amount,
    subtotal_amount,
    shipping_cost,
    shipping_quoted_at,
    discount_amount,
    tax_amount,
    admin_notes,
    customer_notes,
    delivery_method,
    fulfillment_method,
    checkout_source,
    payment_method,
    currency,
    payment_status,
    payment_total_verified,
    payment_balance,
    payment_percentage,
    payment_requirement_met,
    payment_requirement_type,
    payment_required_percentage,
    payment_required_amount,
    payment_effective_total,
    payment_production_eligible,
    quotation_id,
    approved_mockup_set_id,
    custom_quote_status,
    custom_quote_version,
    custom_quote_locked_at,
    custom_quote_locked_total,
    custom_project_snapshot,
    source_snapshot,
    pricing_status,
    pickup_location_id,
    final_total_approved_at,
    idempotency_key,
    created_by,
    updated_by
  ) values (
    new_order_id,
    new_order_number,
    quotation_row.customer_id,
    p_customer_id,
    normalized_customer_name,
    normalized_company_name,
    normalized_customer_phone,
    normalized_customer_email,
    normalized_billing_address,
    case when normalized_delivery = 'shipping' then normalized_shipping_address else null end,
    normalized_status,
    p_resolved_price + p_shipping_cost,
    p_resolved_price,
    p_shipping_cost,
    case when normalized_delivery = 'shipping' then now() else null end,
    quotation_row.discount_total,
    0,
    coalesce(quotation_row.internal_notes, ''),
    coalesce(quotation_row.public_notes, ''),
    normalized_delivery,
    normalized_delivery,
    'quotation',
    normalized_payment,
    quotation_row.currency,
    'unpaid',
    0,
    p_resolved_price + p_shipping_cost,
    0,
    false,
    'full',
    100,
    p_resolved_price + p_shipping_cost,
    0,
    false,
    quotation_row.id,
    mockup_row.id,
    'approved',
    version_row.version_number,
    now(),
    p_resolved_price + p_shipping_cost,
    case
      when jsonb_typeof(version_row.snapshot->'custom_project_snapshot') = 'array'
        then version_row.snapshot->'custom_project_snapshot'
      else '[]'::jsonb
    end,
    source_snapshot,
    'final',
    case when normalized_delivery = 'pickup' then p_pickup_location_id else null end,
    now(),
    normalized_key,
    auth.uid(),
    auth.uid()
  ) returning * into new_order;

  for item_row in
    select qi.*
    from public.quotation_items qi
    where qi.quotation_id = quotation_row.id and qi.archived_at is null
    order by qi.sort_order, qi.created_at, qi.id
  loop
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

    item_product_type := 'configurable_product';
    select case
      when p.product_type in ('standard_product', 'configurable_product', 'production_service')
        then p.product_type
      else 'standard_product'
    end
    into item_product_type
    from public.products p
    where p.id = item_row.product_id;

    item_id := gen_random_uuid();
    insert into public.order_items(
      id,
      order_id,
      product_id,
      variant_id,
      variant_size_id,
      product_name,
      product_type,
      variant_name,
      sku,
      quantity,
      unit_price,
      subtotal,
      color,
      size,
      notes,
      config_snapshot,
      required_services,
      estimated_total,
      snapshot,
      pricing_status,
      pricing_snapshot
    ) values (
      item_id,
      new_order_id,
      item_row.product_id,
      item_row.product_variant_id,
      item_row.product_variant_size_id,
      item_row.product_name_snapshot,
      item_product_type,
      coalesce(item_row.variant_name_snapshot, ''),
      item_row.sku_snapshot,
      item_row.quantity,
      item_row.unit_price,
      item_row.subtotal,
      coalesce(item_row.color_name_snapshot, ''),
      coalesce(item_row.size_name_snapshot, ''),
      coalesce(item_row.customer_notes, ''),
      jsonb_build_object(
        'quotation_id', quotation_row.id,
        'quotation_version_id', version_row.id,
        'quotation_item_id', item_row.id,
        'quotation_item_snapshot', to_jsonb(item_row),
        'services', required_services_snapshot
      ),
      required_services_snapshot,
      item_row.subtotal,
      jsonb_build_object(
        'source', 'quotation_conversion',
        'quotation_item_id', item_row.id,
        'quotation_version_id', version_row.id,
        'product_name', item_row.product_name_snapshot,
        'variant_name', item_row.variant_name_snapshot,
        'color', item_row.color_name_snapshot,
        'size', item_row.size_name_snapshot,
        'sku', item_row.sku_snapshot,
        'quantity', item_row.quantity,
        'unit_price', item_row.unit_price,
        'subtotal', item_row.subtotal
      ),
      'final',
      jsonb_build_object(
        'source', 'quotation',
        'quotation_id', quotation_row.id,
        'quotation_version_id', version_row.id,
        'quotation_item_id', item_row.id,
        'unit_price', item_row.unit_price,
        'subtotal', item_row.subtotal,
        'currency', quotation_row.currency
      )
    );

    for service_row in
      select qis.*
      from public.quotation_item_services qis
      where qis.quotation_item_id = item_row.id and qis.archived_at is null
      order by qis.sort_order, qis.created_at, qis.id
    loop
      service_unit_price := coalesce(service_row.unit_price, service_row.flat_price);
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
      ) values (
        item_id,
        service_row.custom_service_id,
        service_row.service_name_snapshot,
        service_row.quantity,
        service_row.position,
        service_row.notes,
        service_unit_price,
        service_row.subtotal,
        jsonb_build_object(
          'source', 'quotation_conversion',
          'quotation_id', quotation_row.id,
          'quotation_version_id', version_row.id,
          'quotation_item_id', item_row.id,
          'quotation_item_service_id', service_row.id,
          'service_name', service_row.service_name_snapshot,
          'quantity', service_row.quantity,
          'position', service_row.position,
          'unit_price', service_unit_price,
          'subtotal', service_row.subtotal,
          'notes', service_row.notes
        )
      );
    end loop;
  end loop;

  insert into public.order_status_history(
    order_id, from_status, to_status, note, changed_by
  ) values (
    new_order.id,
    null,
    normalized_status,
    'Order dibuat melalui konversi quotation atomik.',
    auth.uid()
  );

  update public.quotations
  set status = 'converted_to_order',
      converted_at = now(),
      updated_at = now(),
      updated_by = auth.uid()
  where id = quotation_row.id;

  insert into public.quotation_status_history(
    quotation_id, from_status, to_status, note, changed_by
  ) values (
    quotation_row.id,
    'approved',
    'converted_to_order',
    'Quotation dikonversi menjadi order melalui kontrak transaksi atomik.',
    auth.uid()
  );

  perform public.write_audit_log(
    'quotation',
    quotation_row.id,
    'quotation_converted_to_order',
    jsonb_build_object('status', 'approved'),
    jsonb_build_object(
      'status', 'converted_to_order',
      'order_id', new_order.id,
      'order_number', new_order.order_number,
      'idempotency_key', normalized_key,
      'delivery_method', normalized_delivery,
      'payment_method', normalized_payment
    ),
    'Atomic quotation to order conversion',
    'wave_1_quotation_order_conversion',
    normalized_key,
    jsonb_build_object(
      'order_id', new_order.id,
      'quotation_version_id', version_row.id,
      'approved_mockup_set_id', mockup_row.id
    )
  );

  return new_order;
end
$function$;

revoke all on function public.convert_quotation_to_order(
  uuid, uuid, text, text, text, text, text, text, uuid, text, text, bigint, bigint, text, text
) from public, anon;
grant execute on function public.convert_quotation_to_order(
  uuid, uuid, text, text, text, text, text, text, uuid, text, text, bigint, bigint, text, text
) to authenticated, service_role;

commit;


