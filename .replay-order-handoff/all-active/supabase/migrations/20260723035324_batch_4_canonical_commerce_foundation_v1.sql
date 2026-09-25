begin;

alter table public.products
  add column if not exists sales_mode text not null default 'ready_stock',
  add column if not exists tier_scope text not null default 'none';

update public.products
set sales_mode = case
  when pricing_mode in ('configurator_based','custom_quote') or uses_configurator then 'custom'
  else 'ready_stock'
end;

update public.products p
set tier_scope = case
  when exists (
    select 1 from public.product_price_tiers ppt
    where ppt.product_id = p.id and ppt.status = 'active'
  ) then 'product' else 'none'
end;

alter table public.products
  drop constraint if exists products_sales_mode_check,
  drop constraint if exists products_tier_scope_check;

alter table public.products
  add constraint products_sales_mode_check
    check (sales_mode in ('ready_stock','custom','both')),
  add constraint products_tier_scope_check
    check (tier_scope in ('none','product'));

alter table public.order_items
  add column if not exists pricing_snapshot jsonb not null default '{}'::jsonb;

alter table public.order_items
  drop constraint if exists order_items_pricing_snapshot_object_check;

alter table public.order_items
  add constraint order_items_pricing_snapshot_object_check
    check (jsonb_typeof(pricing_snapshot) = 'object');

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

drop trigger if exists trg_enforce_public_order_item_commerce_mode_v1
on public.order_items;

create trigger trg_enforce_public_order_item_commerce_mode_v1
before insert or update of product_id, custom_project_id
on public.order_items
for each row execute function public.enforce_public_order_item_commerce_mode_v1();

create or replace function public.finalize_public_ready_stock_pricing_v1()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  order_row public.orders;
  line_row record;
  tier_row record;
  has_ready boolean;
  has_custom boolean;
  scope_quantity integer;
  unit_price_value bigint;
  line_subtotal bigint;
  order_total bigint;
begin
  select * into order_row
  from public.orders
  where id = new.order_id
  for update;

  if not found or order_row.checkout_source <> 'public_checkout' then
    return null;
  end if;

  select
    exists (
      select 1 from public.order_items oi
      where oi.order_id = new.order_id
        and oi.archived_at is null
        and oi.custom_project_id is null
    ),
    exists (
      select 1 from public.order_items oi
      where oi.order_id = new.order_id
        and oi.archived_at is null
        and oi.custom_project_id is not null
    ) or jsonb_array_length(coalesce(order_row.custom_project_snapshot, '[]'::jsonb)) > 0
  into has_ready, has_custom;

  if has_ready and has_custom then
    raise exception 'Ready Stock dan Custom Project harus dibuat sebagai pesanan terpisah';
  end if;

  if not has_ready then return null; end if;

  for line_row in
    select
      oi.id, oi.product_id, oi.variant_id, oi.variant_size_id, oi.quantity,
      p.sales_mode, p.pricing_mode, p.tier_scope,
      coalesce(p.base_price, p.price, p.harga, 0)::bigint as base_price,
      coalesce(pv.price_adjustment, 0)::bigint as variant_adjustment,
      coalesce(pvs.price_adjustment, 0)::bigint as size_adjustment
    from public.order_items oi
    join public.products p on p.id = oi.product_id
    left join public.product_variants pv on pv.id = oi.variant_id
    left join public.product_variant_sizes pvs on pvs.id = oi.variant_size_id
    where oi.order_id = new.order_id
      and oi.archived_at is null
      and oi.custom_project_id is null
      and oi.pricing_snapshot = '{}'::jsonb
    order by oi.created_at, oi.id
    for update of oi
  loop
    if line_row.sales_mode not in ('ready_stock','both') then
      raise exception 'Produk ini tidak tersedia melalui Ready Stock';
    end if;
    if line_row.pricing_mode in ('configurator_based','custom_quote') then
      raise exception 'Produk custom harus melalui Custom Project';
    end if;
    if line_row.variant_id is null or line_row.variant_size_id is null then
      raise exception 'Ready Stock memerlukan variant dan SKU canonical';
    end if;

    if line_row.tier_scope = 'product' then
      select coalesce(sum(oi.quantity), 0)::integer
      into scope_quantity
      from public.order_items oi
      where oi.order_id = new.order_id
        and oi.archived_at is null
        and oi.custom_project_id is null
        and oi.product_id = line_row.product_id;

      select ppt.id, ppt.min_quantity, ppt.max_quantity,
             ppt.unit_price, ppt.quote_required
      into tier_row
      from public.product_price_tiers ppt
      where ppt.product_id = line_row.product_id
        and ppt.status = 'active'
        and scope_quantity >= ppt.min_quantity
        and (ppt.max_quantity is null or scope_quantity <= ppt.max_quantity)
      order by ppt.min_quantity desc
      limit 1;
    else
      scope_quantity := line_row.quantity;
      tier_row := null;
    end if;

    if tier_row.quote_required then
      raise exception 'Jumlah produk memerlukan quotation';
    end if;

    unit_price_value :=
      coalesce(tier_row.unit_price::bigint, line_row.base_price)
      + line_row.variant_adjustment
      + line_row.size_adjustment;

    if unit_price_value < 0 then
      raise exception 'Harga canonical produk tidak valid';
    end if;

    line_subtotal := unit_price_value * line_row.quantity;

    update public.order_items
    set unit_price = unit_price_value,
        subtotal = line_subtotal,
        pricing_status = 'final',
        pricing_snapshot = jsonb_build_object(
          'schema_version', 1,
          'calculated_by', 'server',
          'sales_mode', line_row.sales_mode,
          'pricing_mode', line_row.pricing_mode,
          'tier_scope', line_row.tier_scope,
          'pricing_quantity', scope_quantity,
          'product_id', line_row.product_id,
          'variant_id', line_row.variant_id,
          'variant_size_id', line_row.variant_size_id,
          'base_price', line_row.base_price,
          'tier', case when tier_row.id is null then null else jsonb_build_object(
            'id', tier_row.id,
            'min_quantity', tier_row.min_quantity,
            'max_quantity', tier_row.max_quantity,
            'unit_price', tier_row.unit_price,
            'quote_required', tier_row.quote_required
          ) end,
          'variant_adjustment', line_row.variant_adjustment,
          'size_adjustment', line_row.size_adjustment,
          'unit_price', unit_price_value,
          'quantity', line_row.quantity,
          'subtotal', line_subtotal
        ),
        updated_at = now()
    where id = line_row.id;
  end loop;

  select coalesce(sum(oi.subtotal), 0)::bigint
  into order_total
  from public.order_items oi
  where oi.order_id = new.order_id
    and oi.archived_at is null;

  update public.orders
  set subtotal_amount = order_total,
      total_amount = order_total,
      payment_required_amount = order_total,
      payment_balance = greatest(order_total - coalesce(payment_effective_total, 0), 0),
      pricing_status = 'final',
      updated_at = now()
  where id = new.order_id
    and jsonb_array_length(coalesce(custom_project_snapshot, '[]'::jsonb)) = 0;

  return null;
end;
$function$;

revoke all on function public.finalize_public_ready_stock_pricing_v1()
from public, anon, authenticated;
grant execute on function public.finalize_public_ready_stock_pricing_v1()
to service_role;

drop trigger if exists trg_finalize_public_ready_stock_pricing_v1
on public.order_items;

create constraint trigger trg_finalize_public_ready_stock_pricing_v1
after insert on public.order_items
deferrable initially deferred
for each row execute function public.finalize_public_ready_stock_pricing_v1();

insert into public.system_audit_log(
  entity_type, action, actor_role, source, reason, metadata
) values (
  'commerce_foundation',
  'canonical_commerce_foundation_v1_applied',
  'system',
  'batch_4',
  'Owner-approved additive foundation for Ready Stock and Custom separation',
  jsonb_build_object(
    'sales_mode_values', jsonb_build_array('ready_stock','custom','both'),
    'tier_scope_values', jsonb_build_array('none','product'),
    'pricing_snapshot', true,
    'mixed_checkout_blocked', true,
    'delete_performed', false
  )
);

commit;
