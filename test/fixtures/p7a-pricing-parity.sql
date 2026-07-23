with
fixtures(
  fixture_id,
  quantity,
  pricing_quantity,
  sales_mode,
  pricing_mode,
  tier_scope,
  product_status,
  variant_status,
  variant_size_status,
  size_status,
  base_price,
  variant_adjustment,
  variant_size_adjustment,
  tier_set,
  expected_status,
  expected_unit_price
) as (
  values
    ('tier_min_1', 1, 1, 'ready_stock', 'variant_based', 'product', 'active', 'active', 'active', 'active', 45000::bigint, 1000::bigint, 2000::bigint, 'standard', 'priced', 48000::bigint),
    ('tier_max_11', 11, 11, 'ready_stock', 'variant_based', 'product', 'active', 'active', 'active', 'active', 45000, 1000, 2000, 'standard', 'priced', 48000),
    ('tier_min_12', 12, 12, 'ready_stock', 'variant_based', 'product', 'active', 'active', 'active', 'active', 45000, 1000, 2000, 'standard', 'priced', 45000),
    ('tier_max_23', 23, 23, 'ready_stock', 'variant_based', 'product', 'active', 'active', 'active', 'active', 45000, 1000, 2000, 'standard', 'priced', 45000),
    ('tier_min_24', 24, 24, 'ready_stock', 'variant_based', 'product', 'active', 'active', 'active', 'active', 45000, 1000, 2000, 'standard', 'priced', 43000),
    ('tier_scope_none', 24, 24, 'ready_stock', 'variant_based', 'none', 'active', 'active', 'active', 'active', 45000, 1000, 2000, 'standard', 'priced', 48000),
    ('quotation_tier', 50, 50, 'ready_stock', 'variant_based', 'product', 'active', 'active', 'active', 'active', 45000, 1000, 2000, 'quotation', 'quotation_required', null::bigint),
    ('inactive_sku', 1, 1, 'ready_stock', 'variant_based', 'product', 'active', 'active', 'inactive', 'active', 45000, 1000, 2000, 'standard', 'unavailable', null),
    ('custom_mode', 1, 1, 'custom', 'custom_quote', 'none', 'active', 'active', 'active', 'active', 45000, 1000, 2000, 'standard', 'unavailable', null),
    ('negative_amount', 1, 1, 'ready_stock', 'fixed_price', 'none', 'active', 'active', 'active', 'active', 1000, -2000, 0, 'none', 'unavailable', null)
),
tiers(tier_set, tier_id, min_quantity, max_quantity, unit_price, quote_required) as (
  values
    ('standard', 'tier-1-11', 1, 11, 45000::bigint, false),
    ('standard', 'tier-12-23', 12, 23, 42000::bigint, false),
    ('standard', 'tier-24-plus', 24, null::integer, 40000::bigint, false),
    ('quotation', 'tier-1-49', 1, 49, 45000::bigint, false),
    ('quotation', 'tier-50-plus', 50, null::integer, null::bigint, true)
),
evaluated as (
  select
    fixture.*,
    active_tier.tier_id,
    case
      when fixture.quantity < 1 or fixture.pricing_quantity < 1 then 'unavailable'
      when fixture.product_status <> 'active' then 'unavailable'
      when fixture.sales_mode not in ('ready_stock', 'both')
        or fixture.pricing_mode in ('configurator_based', 'custom_quote')
        then 'unavailable'
      when fixture.variant_status <> 'active'
        or fixture.variant_size_status <> 'active'
        or fixture.size_status <> 'active'
        then 'unavailable'
      when active_tier.quote_required then 'quotation_required'
      when coalesce(active_tier.unit_price, fixture.base_price)
        + fixture.variant_adjustment
        + fixture.variant_size_adjustment < 0
        then 'unavailable'
      else 'priced'
    end as actual_status,
    case
      when active_tier.quote_required then null
      when fixture.product_status <> 'active'
        or fixture.sales_mode not in ('ready_stock', 'both')
        or fixture.pricing_mode in ('configurator_based', 'custom_quote')
        or fixture.variant_status <> 'active'
        or fixture.variant_size_status <> 'active'
        or fixture.size_status <> 'active'
        then null
      when coalesce(active_tier.unit_price, fixture.base_price)
        + fixture.variant_adjustment
        + fixture.variant_size_adjustment < 0
        then null
      else coalesce(active_tier.unit_price, fixture.base_price)
        + fixture.variant_adjustment
        + fixture.variant_size_adjustment
    end as actual_unit_price
  from fixtures fixture
  left join lateral (
    select tier.tier_id, tier.unit_price, tier.quote_required
    from tiers tier
    where fixture.tier_scope = 'product'
      and tier.tier_set = fixture.tier_set
      and fixture.pricing_quantity >= tier.min_quantity
      and (tier.max_quantity is null or fixture.pricing_quantity <= tier.max_quantity)
    order by tier.min_quantity desc
    limit 1
  ) active_tier on true
)
select
  count(*) as fixture_count,
  count(*) filter (
    where actual_status <> expected_status
      or actual_unit_price is distinct from expected_unit_price
  ) as mismatch_count,
  jsonb_agg(
    jsonb_build_object(
      'fixture_id', fixture_id,
      'input', jsonb_build_object(
        'quantity', quantity,
        'pricing_quantity', pricing_quantity,
        'sales_mode', sales_mode,
        'pricing_mode', pricing_mode,
        'tier_scope', tier_scope,
        'product_status', product_status,
        'variant_status', variant_status,
        'variant_size_status', variant_size_status,
        'size_status', size_status,
        'base_price', base_price,
        'variant_adjustment', variant_adjustment,
        'variant_size_adjustment', variant_size_adjustment,
        'tier_set', tier_set
      ),
      'actual', jsonb_build_object(
        'status', actual_status,
        'unit_price', actual_unit_price,
        'tier_id', tier_id
      ),
      'expected', jsonb_build_object(
        'status', expected_status,
        'unit_price', expected_unit_price
      )
    )
    order by fixture_id
  ) as results
from evaluated;
