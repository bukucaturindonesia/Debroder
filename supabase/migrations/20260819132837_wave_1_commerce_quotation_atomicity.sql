begin;

-- Wave 1 commerce correctness: restore the quotation RPC boundary that the
-- current admin and Repeat Order workflows already call.  These functions
-- deliberately keep pricing and approval decisions inside the existing
-- quotation lifecycle; they do not introduce a second product or order
-- model.

create or replace function public.refresh_quotation_totals(p_quotation_id uuid)
returns public.quotations
language plpgsql
security definer
set search_path = ''
as $function$
declare
  quotation_row public.quotations;
  product_total bigint;
  service_total bigint;
  item_pending boolean;
  service_pending boolean;
  has_items boolean;
  has_services boolean;
  has_known_item_total boolean;
  has_known_service_total boolean;
  pending_pricing boolean;
  estimated_total_value bigint;
begin
  if not public.has_permission('quotation.write') then
    raise exception 'Not authorized to update quotation totals';
  end if;

  select * into quotation_row
  from public.quotations
  where id = p_quotation_id and archived_at is null
  for update;

  if not found then
    raise exception 'Quotation not found or archived';
  end if;

  select
    coalesce(sum(qi.subtotal), 0)::bigint,
    coalesce(bool_or(qi.pricing_status = 'pending' or qi.unit_price is null or qi.subtotal is null), false),
    count(*) > 0,
    coalesce(bool_or(qi.subtotal is not null), false)
  into product_total, item_pending, has_items, has_known_item_total
  from public.quotation_items qi
  where qi.quotation_id = quotation_row.id
    and qi.archived_at is null;

  select
    coalesce(sum(qis.subtotal), 0)::bigint,
    coalesce(bool_or(qis.pricing_status = 'pending' or qis.unit_price is null or qis.subtotal is null), false),
    count(*) > 0,
    coalesce(bool_or(qis.subtotal is not null), false)
  into service_total, service_pending, has_services, has_known_service_total
  from public.quotation_item_services qis
  join public.quotation_items qi on qi.id = qis.quotation_item_id
  where qi.quotation_id = quotation_row.id
    and qi.archived_at is null
    and qis.archived_at is null;

  pending_pricing := not has_items or item_pending or service_pending;
  estimated_total_value := case
    when has_known_item_total or has_known_service_total or not pending_pricing then
      greatest(product_total + service_total + quotation_row.additional_cost - quotation_row.discount_total, 0)
    else null
  end;

  update public.quotations
  set product_subtotal = product_total,
      service_subtotal = service_total,
      has_pending_pricing = pending_pricing,
      confirmed_total = case when not pending_pricing then estimated_total_value else null end,
      estimated_total = estimated_total_value,
      updated_at = now(),
      updated_by = auth.uid()
  where id = quotation_row.id
  returning * into quotation_row;

  return quotation_row;
end
$function$;

create or replace function public.create_repeat_order_quotation(
  p_source_order_id uuid,
  p_repeat_reason text,
  p_idempotency_key text
)
returns public.quotations
language plpgsql
security definer
set search_path = ''
as $function$
declare
  source_order public.orders;
  existing_quotation public.quotations;
  new_quotation public.quotations;
  new_item public.quotation_items;
  source_item record;
  source_service record;
  source_snapshot jsonb;
  normalized_reason text := nullif(btrim(coalesce(p_repeat_reason, '')), '');
  normalized_key text := nullif(btrim(coalesce(p_idempotency_key, '')), '');
  item_index integer := 0;
  service_index integer := 0;
begin
  if not public.has_permission('quotation.write')
     or not public.has_permission('order.read') then
    raise exception 'Not authorized to create Repeat Order quotation';
  end if;

  if p_source_order_id is null then
    raise exception 'Source order is required';
  end if;
  if normalized_reason is null or char_length(normalized_reason) < 3 then
    raise exception 'Repeat Order reason must be at least 3 characters';
  end if;
  if char_length(normalized_reason) > 500 then
    raise exception 'Repeat Order reason must be at most 500 characters';
  end if;
  if normalized_key is null or char_length(normalized_key) < 12 or char_length(normalized_key) > 160 then
    raise exception 'Repeat Order idempotency key is invalid';
  end if;

  -- Serialize replays for the same key before reading or allocating a
  -- quotation number.  The unique indexes remain the final database guard.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(normalized_key, 0)
  );

  select * into existing_quotation
  from public.quotations
  where repeat_idempotency_key = normalized_key
  for update;

  if found then
    if existing_quotation.repeated_from_order_id <> p_source_order_id then
      raise exception 'Repeat Order idempotency key is bound to another source order';
    end if;
    return existing_quotation;
  end if;

  select * into source_order
  from public.orders
  where id = p_source_order_id and archived_at is null
  for update;

  if not found then
    raise exception 'Source order not found or archived';
  end if;
  if source_order.status not in ('siap_diambil', 'siap_dikirim', 'selesai') then
    raise exception 'Source order is not eligible for Repeat Order';
  end if;
  if not exists (
    select 1 from public.order_items oi
    where oi.order_id = source_order.id and oi.archived_at is null
  ) then
    raise exception 'Source order has no active items';
  end if;

  source_snapshot := jsonb_build_object(
    'order', jsonb_build_object(
      'id', source_order.id,
      'order_number', source_order.order_number,
      'customer_id', source_order.customer_id,
      'customer_name', source_order.customer_name,
      'company_name', source_order.company_name,
      'customer_phone', source_order.customer_phone,
      'customer_email', source_order.customer_email,
      'billing_address', source_order.billing_address,
      'shipping_address', source_order.shipping_address,
      'currency', source_order.currency,
      'status', source_order.status,
      'total_amount', source_order.total_amount
    ),
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', oi.id,
          'product_id', oi.product_id,
          'variant_id', oi.variant_id,
          'variant_size_id', oi.variant_size_id,
          'product_name', oi.product_name,
          'variant_name', oi.variant_name,
          'color', oi.color,
          'size', oi.size,
          'sku', oi.sku,
          'quantity', oi.quantity,
          'unit_price', oi.unit_price,
          'subtotal', oi.subtotal,
          'notes', oi.notes
        ) order by oi.created_at, oi.id
      )
      from public.order_items oi
      where oi.order_id = source_order.id and oi.archived_at is null
    ), '[]'::jsonb),
    'services', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', ois.id,
          'order_item_id', ois.order_item_id,
          'custom_service_id', ois.custom_service_id,
          'service_name', ois.service_name,
          'quantity', ois.quantity,
          'position', ois.position,
          'unit_price', ois.unit_price,
          'subtotal', ois.subtotal,
          'notes', ois.notes
        ) order by ois.created_at, ois.id
      )
      from public.order_item_services ois
      join public.order_items oi on oi.id = ois.order_item_id
      where oi.order_id = source_order.id
        and oi.archived_at is null
        and ois.archived_at is null
    ), '[]'::jsonb)
  );

  insert into public.quotations(
    customer_id,
    customer_name,
    company_name,
    customer_email,
    customer_phone,
    billing_address,
    shipping_address,
    status,
    currency,
    public_notes,
    internal_notes,
    has_pending_pricing,
    repeated_from_order_id,
    repeat_reason,
    repeat_idempotency_key,
    created_by,
    updated_by
  ) values (
    source_order.customer_id,
    source_order.customer_name,
    source_order.company_name,
    source_order.customer_email,
    source_order.customer_phone,
    source_order.billing_address,
    source_order.shipping_address,
    'draft',
    source_order.currency,
    source_order.customer_notes,
    source_order.admin_notes,
    true,
    source_order.id,
    normalized_reason,
    normalized_key,
    auth.uid(),
    auth.uid()
  ) returning * into new_quotation;

  for source_item in
    select
      oi.*,
      p.slug as product_slug,
      pv.name as current_variant_name,
      pv.hex_code as current_variant_hex
    from public.order_items oi
    left join public.products p on p.id = oi.product_id
    left join public.product_variants pv on pv.id = oi.variant_id
    where oi.order_id = source_order.id and oi.archived_at is null
    order by oi.created_at, oi.id
  loop
    item_index := item_index + 1;

    insert into public.quotation_items(
      quotation_id,
      product_id,
      product_variant_id,
      product_variant_size_id,
      product_name_snapshot,
      product_slug_snapshot,
      variant_name_snapshot,
      color_name_snapshot,
      color_hex_snapshot,
      size_name_snapshot,
      sku_snapshot,
      quantity,
      base_price_snapshot,
      tier_price_snapshot,
      variant_adjustment_snapshot,
      size_adjustment_snapshot,
      unit_price,
      pricing_status,
      subtotal,
      customer_notes,
      sort_order
    ) values (
      new_quotation.id,
      source_item.product_id,
      source_item.variant_id,
      source_item.variant_size_id,
      source_item.product_name,
      source_item.product_slug,
      nullif(btrim(coalesce(source_item.variant_name, source_item.current_variant_name, '')), ''),
      nullif(btrim(coalesce(source_item.color, '')), ''),
      source_item.current_variant_hex,
      nullif(btrim(coalesce(source_item.size, '')), ''),
      source_item.sku,
      source_item.quantity,
      null,
      null,
      0,
      0,
      null,
      'pending',
      null,
      nullif(btrim(coalesce(source_item.notes, '')), ''),
      item_index
    ) returning * into new_item;

    for source_service in
      select ois.*
      from public.order_item_services ois
      where ois.order_item_id = source_item.id
        and ois.archived_at is null
      order by ois.created_at, ois.id
    loop
      service_index := service_index + 1;
      insert into public.quotation_item_services(
        quotation_item_id,
        custom_service_id,
        service_name_snapshot,
        quantity,
        position,
        pricing_status,
        unit_price,
        flat_price,
        subtotal,
        notes,
        sort_order
      ) values (
        new_item.id,
        source_service.custom_service_id,
        source_service.service_name,
        source_service.quantity,
        source_service.position,
        'pending',
        null,
        null,
        null,
        source_service.notes,
        service_index
      );
    end loop;
  end loop;

  perform public.refresh_quotation_totals(new_quotation.id);

  insert into public.quotation_status_history(
    quotation_id, from_status, to_status, note, changed_by
  ) values (
    new_quotation.id, null, 'draft', 'Repeat Order quotation created', auth.uid()
  );

  insert into public.repeat_order_history(
    source_order_id,
    source_quotation_id,
    new_quotation_id,
    repeat_reason,
    source_snapshot,
    created_by,
    idempotency_key
  ) values (
    source_order.id,
    source_order.quotation_id,
    new_quotation.id,
    normalized_reason,
    source_snapshot,
    auth.uid(),
    normalized_key
  );

  select * into new_quotation from public.quotations where id = new_quotation.id;
  return new_quotation;
end
$function$;

create or replace function public.transition_quotation_status(
  p_quotation_id uuid,
  p_to_status text,
  p_note text
)
returns public.quotations
language plpgsql
security definer
set search_path = ''
as $function$
declare
  quotation_row public.quotations;
  latest_version public.quotation_versions;
  snapshot_value jsonb;
  target_status text := lower(btrim(coalesce(p_to_status, '')));
  note_value text := nullif(btrim(coalesce(p_note, '')), '');
  active_item_count integer;
  from_status text;
begin
  if not public.has_permission('quotation.write') then
    raise exception 'Not authorized to transition quotation';
  end if;

  select * into quotation_row
  from public.quotations
  where id = p_quotation_id and archived_at is null
  for update;
  if not found then
    raise exception 'Quotation not found or archived';
  end if;
  from_status := quotation_row.status;

  perform public.refresh_quotation_totals(quotation_row.id);
  select * into quotation_row from public.quotations where id = p_quotation_id for update;

  if not (
    (quotation_row.status = 'draft' and target_status = 'submitted') or
    (quotation_row.status = 'submitted' and target_status in ('under_review', 'draft')) or
    (quotation_row.status = 'under_review' and target_status in ('pricing', 'submitted')) or
    (quotation_row.status = 'pricing' and target_status in ('sent', 'under_review')) or
    (quotation_row.status = 'sent' and target_status in ('approved', 'revision_requested', 'rejected', 'expired'))
  ) then
    raise exception 'Invalid quotation transition';
  end if;

  if target_status in ('revision_requested', 'rejected') and note_value is null then
    raise exception 'A note is required for this quotation transition';
  end if;
  if target_status = 'expired'
     and quotation_row.valid_until is not null
     and quotation_row.valid_until > now()
     and note_value is null then
    raise exception 'Early expiration requires a reason';
  end if;

  if target_status in ('sent', 'approved') then
    select count(*) into active_item_count
    from public.quotation_items
    where quotation_id = quotation_row.id and archived_at is null;
    if active_item_count = 0 then
      raise exception 'At least one active quotation item is required';
    end if;
    if btrim(coalesce(quotation_row.customer_name, '')) = ''
       or btrim(coalesce(quotation_row.customer_phone, '')) = '' then
      raise exception 'Customer contact is required';
    end if;
  end if;

  if target_status = 'approved' then
    if quotation_row.has_pending_pricing then
      raise exception 'Pending pricing cannot be approved';
    end if;
    if quotation_row.latest_version_id is null then
      raise exception 'Latest quotation version has not been sent';
    end if;
    select * into latest_version
    from public.quotation_versions
    where id = quotation_row.latest_version_id and quotation_id = quotation_row.id
    for update;
    if not found or latest_version.version_status <> 'sent' then
      raise exception 'Latest quotation version has not been sent';
    end if;
  elsif target_status = 'sent' then
    if quotation_row.latest_version_id is null then
      snapshot_value := public.build_quotation_snapshot(quotation_row.id);
      if snapshot_value is null then
        raise exception 'Quotation snapshot could not be created';
      end if;
      insert into public.quotation_versions(
        quotation_id, version_number, version_status, snapshot, change_note,
        created_by, sent_at
      ) values (
        quotation_row.id, quotation_row.current_version, 'sent', snapshot_value,
        note_value, auth.uid(), now()
      ) returning * into latest_version;
      quotation_row.latest_version_id := latest_version.id;
    else
      update public.quotation_versions
      set version_status = 'sent', sent_at = coalesce(sent_at, now())
      where id = quotation_row.latest_version_id
        and quotation_id = quotation_row.id
      returning * into latest_version;
      if not found then
        raise exception 'Latest quotation version not found';
      end if;
    end if;
    quotation_row.sent_version_id := latest_version.id;
  elsif target_status in ('revision_requested', 'rejected', 'expired')
        and quotation_row.latest_version_id is not null then
    update public.quotation_versions
    set version_status = target_status
    where id = quotation_row.latest_version_id
      and quotation_id = quotation_row.id;
  end if;

  update public.quotations
  set status = target_status,
      latest_version_id = coalesce(quotation_row.latest_version_id, latest_version.id),
      sent_version_id = case when target_status = 'sent' then quotation_row.sent_version_id else sent_version_id end,
      approved_version_id = case when target_status = 'approved' then quotation_row.latest_version_id else null end,
      approved_at = case when target_status = 'approved' then now() else null end,
      updated_at = now(),
      updated_by = auth.uid()
  where id = quotation_row.id
  returning * into quotation_row;

  insert into public.quotation_status_history(
    quotation_id, from_status, to_status, note, changed_by
  ) values (
    quotation_row.id, from_status, target_status, note_value, auth.uid()
  );

  return quotation_row;
end
$function$;

create or replace function public.create_quotation_revision(
  p_quotation_id uuid,
  p_note text
)
returns public.quotations
language plpgsql
security definer
set search_path = ''
as $function$
declare
  quotation_row public.quotations;
  prior_version public.quotation_versions;
  revision_version public.quotation_versions;
  snapshot_value jsonb;
  note_value text := nullif(btrim(coalesce(p_note, '')), '');
  next_version integer;
begin
  if not public.has_permission('quotation.write') then
    raise exception 'Not authorized to create quotation revision';
  end if;
  if note_value is null then
    raise exception 'A revision note is required';
  end if;

  select * into quotation_row
  from public.quotations
  where id = p_quotation_id and archived_at is null
  for update;
  if not found then
    raise exception 'Quotation not found or archived';
  end if;
  if quotation_row.status <> 'revision_requested' then
    raise exception 'Quotation revision can only start after a revision request';
  end if;

  snapshot_value := public.build_quotation_snapshot(quotation_row.id);
  if snapshot_value is null then
    raise exception 'Quotation snapshot could not be created';
  end if;

  next_version := greatest(quotation_row.current_version + 1, 1);
  if quotation_row.latest_version_id is not null then
    update public.quotation_versions
    set version_status = 'superseded'
    where id = quotation_row.latest_version_id
      and quotation_id = quotation_row.id
    returning * into prior_version;
  end if;

  insert into public.quotation_versions(
    quotation_id, version_number, version_status, snapshot, change_note, created_by
  ) values (
    quotation_row.id,
    next_version,
    'draft',
    jsonb_set(
      jsonb_set(snapshot_value, '{quotation,status}', '"draft"'::jsonb),
      '{quotation,current_version}', to_jsonb(next_version)
    ),
    note_value,
    auth.uid()
  ) returning * into revision_version;

  update public.quotations
  set status = 'draft',
      current_version = next_version,
      latest_version_id = revision_version.id,
      sent_version_id = null,
      approved_version_id = null,
      approved_at = null,
      updated_at = now(),
      updated_by = auth.uid()
  where id = quotation_row.id
  returning * into quotation_row;

  insert into public.quotation_status_history(
    quotation_id, from_status, to_status, note, changed_by
  ) values (
    quotation_row.id, 'revision_requested', 'draft', note_value, auth.uid()
  );

  return quotation_row;
end
$function$;

revoke all on function public.refresh_quotation_totals(uuid) from public, anon;
grant execute on function public.refresh_quotation_totals(uuid) to authenticated, service_role;
revoke all on function public.create_repeat_order_quotation(uuid, text, text) from public, anon;
grant execute on function public.create_repeat_order_quotation(uuid, text, text) to authenticated, service_role;
revoke all on function public.transition_quotation_status(uuid, text, text) from public, anon;
grant execute on function public.transition_quotation_status(uuid, text, text) to authenticated, service_role;
revoke all on function public.create_quotation_revision(uuid, text) from public, anon;
grant execute on function public.create_quotation_revision(uuid, text) to authenticated, service_role;

commit;
