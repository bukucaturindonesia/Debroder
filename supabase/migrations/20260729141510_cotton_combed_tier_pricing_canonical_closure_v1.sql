do $migration$
declare
  target_product record;
  expected_active_tier_count integer;
  unexpected_active_tier_count integer;
  duplicate_active_range_count integer;
begin
  select p.id, p.slug, p.sku, p.pricing_mode, p.sales_mode, p.tier_scope
  into target_product
  from public.products p
  where p.slug = 'cotton-combed-24s'
    and upper(btrim(p.sku)) = 'DBR-CC24'
  for update;

  if not found then
    raise exception 'COTTON_TIER_SCOPE_ABORT_IDENTITY: canonical Cotton Combed product not found';
  end if;

  if target_product.pricing_mode <> 'variant_based'
     or target_product.sales_mode not in ('ready_stock', 'both')
     or target_product.tier_scope not in ('none', 'product') then
    raise exception
      'COTTON_TIER_SCOPE_ABORT_CONTRACT: pricing_mode %, sales_mode %, tier_scope %',
      target_product.pricing_mode,
      target_product.sales_mode,
      target_product.tier_scope;
  end if;

  select count(*)
  into expected_active_tier_count
  from public.product_price_tiers ppt
  where ppt.product_id = target_product.id
    and ppt.status = 'active'
    and (
      (ppt.min_quantity = 1 and ppt.max_quantity = 11 and ppt.unit_price = 45000 and not ppt.quote_required)
      or (ppt.min_quantity = 12 and ppt.max_quantity = 23 and ppt.unit_price = 42000 and not ppt.quote_required)
      or (ppt.min_quantity = 24 and ppt.max_quantity is null and ppt.unit_price = 40000 and not ppt.quote_required)
    );

  select count(*)
  into unexpected_active_tier_count
  from public.product_price_tiers ppt
  where ppt.product_id = target_product.id
    and ppt.status = 'active'
    and not (
      (ppt.min_quantity = 1 and ppt.max_quantity = 11 and ppt.unit_price = 45000 and not ppt.quote_required)
      or (ppt.min_quantity = 12 and ppt.max_quantity = 23 and ppt.unit_price = 42000 and not ppt.quote_required)
      or (ppt.min_quantity = 24 and ppt.max_quantity is null and ppt.unit_price = 40000 and not ppt.quote_required)
    );

  select count(*)
  into duplicate_active_range_count
  from (
    select ppt.min_quantity, ppt.max_quantity
    from public.product_price_tiers ppt
    where ppt.product_id = target_product.id
      and ppt.status = 'active'
    group by ppt.min_quantity, ppt.max_quantity
    having count(*) > 1
  ) duplicated;

  if expected_active_tier_count <> 3
     or unexpected_active_tier_count <> 0
     or duplicate_active_range_count <> 0 then
    raise exception
      'COTTON_TIER_SCOPE_ABORT_TIERS: expected %, unexpected %, duplicate ranges %',
      expected_active_tier_count,
      unexpected_active_tier_count,
      duplicate_active_range_count;
  end if;

  update public.products
  set tier_scope = 'product',
      updated_at = now()
  where id = target_product.id
    and tier_scope = 'none';

  if not exists (
    select 1
    from public.products p
    where p.id = target_product.id
      and p.tier_scope = 'product'
  ) then
    raise exception 'COTTON_TIER_SCOPE_ABORT_POSTCHECK: product scope was not applied';
  end if;
end
$migration$;
