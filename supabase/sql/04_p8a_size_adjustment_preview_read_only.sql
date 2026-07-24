-- P8A Size Adjustment Policy Preview
-- READ ONLY: this query intentionally performs no product or SKU mutation.
-- Transaction authority remains product_variant_sizes.price_adjustment.

with
policy(size_key, target_adjustment, sort_order) as (
  values
    ('S', 0::numeric, 10),
    ('M', 0::numeric, 20),
    ('L', 0::numeric, 30),
    ('XL', 0::numeric, 40),
    ('2XL', 10000::numeric, 50),
    ('3XL', 20000::numeric, 60),
    ('4XL', 30000::numeric, 70)
),
size_master_base as (
  select
    master.id,
    master.name,
    master.slug,
    master.size_group,
    master.is_active,
    master.sort_order,
    upper(regexp_replace(btrim(master.name), '[[:space:]_-]+', '', 'g')) as name_token,
    upper(regexp_replace(btrim(master.slug), '[[:space:]_-]+', '', 'g')) as slug_token
  from public.product_size_master master
),
size_master_normalized as (
  select
    base.*,
    case base.name_token
      when 'XXL' then '2XL'
      when 'XXXL' then '3XL'
      when 'XXXXL' then '4XL'
      else base.name_token
    end as normalized_name,
    case base.slug_token
      when 'XXL' then '2XL'
      when 'XXXL' then '3XL'
      when 'XXXXL' then '4XL'
      else base.slug_token
    end as normalized_slug
  from size_master_base base
),
size_master as (
  select
    normalized.*,
    count(*) over (
      partition by normalized.size_group, normalized.normalized_name
    ) as normalized_alias_count
  from size_master_normalized normalized
),
sku_base as (
  select
    product.id as product_id,
    coalesce(product.name, product.nama) as product_name,
    product.status as product_status,
    variant.id as variant_id,
    coalesce(variant.name, variant.variant_name, variant.color_name) as variant_name,
    variant.is_active as variant_active,
    sellable.id as variant_size_id,
    sellable.size_id,
    sellable.size_name,
    sellable.sku,
    sellable.price_adjustment as before_adjustment,
    sellable.is_active,
    sellable.status,
    master.name as master_size_name,
    master.slug as master_size_slug,
    master.size_group,
    master.normalized_name as normalized_size,
    master.normalized_alias_count,
    master.normalized_name is distinct from master.normalized_slug
      as master_alias_conflict,
    upper(btrim(sellable.sku)) as normalized_sku,
    case upper(regexp_replace(btrim(sellable.size_name), '[[:space:]_-]+', '', 'g'))
      when 'XXL' then '2XL'
      when 'XXXL' then '3XL'
      when 'XXXXL' then '4XL'
      else upper(regexp_replace(btrim(sellable.size_name), '[[:space:]_-]+', '', 'g'))
    end as snapshot_size
  from public.product_variant_sizes sellable
  join public.product_variants variant on variant.id = sellable.variant_id
  join public.products product on product.id = variant.product_id
  left join size_master master on master.id = sellable.size_id
),
sku_counted as (
  select
    base.*,
    count(*) over (
      partition by base.variant_id, base.normalized_size
    ) as normalized_variant_size_count,
    count(*) over (
      partition by base.normalized_sku
    ) as normalized_sku_count
  from sku_base base
),
sku_with_override_evidence as (
  select
    counted.*,
    price_override.id as override_audit_event_id,
    price_override.reason as override_reason
  from sku_counted counted
  left join lateral (
    select audit.id, audit.reason
    from public.system_audit_log audit
    where audit.entity_type = 'product_variant_sizes'
      and audit.entity_id = counted.variant_size_id
      and audit.event_code = 'VARIANT_PRICE_CHANGED'
      and nullif(btrim(coalesce(audit.reason, '')), '') is not null
      and audit.new_value ? 'price_adjustment'
      and audit.new_value->>'price_adjustment' ~ '^[0-9]+([.][0-9]+)?$'
      and (audit.new_value->>'price_adjustment')::numeric =
        counted.before_adjustment
    order by audit.created_at desc, audit.id desc
    limit 1
  ) price_override on true
),
classified as (
  select
    sku.*,
    policy.target_adjustment as after_adjustment,
    policy.target_adjustment - sku.before_adjustment as adjustment_delta,
    array_remove(array[
      case when sku.size_id is null then 'MISSING_SIZE_MASTER' end,
      case when sku.size_id is not null and sku.master_size_name is null
        then 'SIZE_ID_UNKNOWN' end,
      case when sku.master_alias_conflict then 'SIZE_MASTER_ALIAS_CONFLICT' end,
      case when sku.master_size_name is not null
        and sku.snapshot_size is distinct from sku.normalized_size
        then 'SIZE_SNAPSHOT_CONFLICT' end,
      case when sku.normalized_alias_count > 1
        then 'DUPLICATE_NORMALIZED_SIZE_MASTER' end,
      case when sku.normalized_size is not null
        and sku.normalized_variant_size_count > 1
        then 'DUPLICATE_NORMALIZED_VARIANT_SIZE' end,
      case when sku.normalized_sku is not null
        and sku.normalized_sku_count > 1
        then 'DUPLICATE_NORMALIZED_SKU' end,
      case when sku.before_adjustment < 0
        or trunc(sku.before_adjustment) <> sku.before_adjustment
        then 'INVALID_CURRENT_ADJUSTMENT' end,
      case when sku.master_size_name is not null
        and policy.size_key is null then 'UNMANAGED_SIZE_POLICY' end,
      case when policy.target_adjustment is distinct from sku.before_adjustment
        and sku.override_audit_event_id is not null
        then 'EXPLICIT_OVERRIDE_REVIEW' end
    ], null) as issue_codes,
    case
      when sku.size_id is null
        or sku.master_size_name is null
        or sku.master_alias_conflict
        or sku.snapshot_size is distinct from sku.normalized_size
        or sku.normalized_alias_count > 1
        or (
          sku.normalized_size is not null
          and sku.normalized_variant_size_count > 1
        )
        or (
          sku.normalized_sku is not null
          and sku.normalized_sku_count > 1
        )
        or sku.before_adjustment < 0
        or trunc(sku.before_adjustment) <> sku.before_adjustment
        then 'BLOCKED'
      when policy.size_key is null then 'OUT_OF_POLICY'
      when sku.before_adjustment = policy.target_adjustment then 'ALIGNED'
      when sku.override_audit_event_id is not null then 'OVERRIDE_REVIEW'
      else 'PENDING_CHANGE'
    end as preview_status
  from sku_with_override_evidence sku
  left join policy on policy.size_key = sku.normalized_size
),
summary as (
  select
    count(*) as total_skus,
    count(*) filter (where preview_status = 'ALIGNED') as aligned_skus,
    count(*) filter (
      where after_adjustment is not null
        and before_adjustment is distinct from after_adjustment
    ) as affected_skus,
    count(*) filter (where preview_status = 'PENDING_CHANGE')
      as pending_change_skus,
    count(*) filter (where preview_status = 'OVERRIDE_REVIEW')
      as override_review_skus,
    count(*) filter (where preview_status = 'BLOCKED') as blocked_skus,
    count(*) filter (where preview_status = 'OUT_OF_POLICY')
      as out_of_policy_skus,
    count(*) filter (
      where 'DUPLICATE_NORMALIZED_SIZE_MASTER' = any(issue_codes)
        or 'DUPLICATE_NORMALIZED_VARIANT_SIZE' = any(issue_codes)
        or 'DUPLICATE_NORMALIZED_SKU' = any(issue_codes)
    ) as duplicate_skus
  from classified
)
select jsonb_build_object(
  'policy', (
    select jsonb_agg(
      jsonb_build_object(
        'size', policy.size_key,
        'after_adjustment', policy.target_adjustment
      )
      order by policy.sort_order
    )
    from policy
  ),
  'summary', (select to_jsonb(summary) from summary),
  'rows', (
    select jsonb_agg(
      jsonb_build_object(
        'product_id', row.product_id,
        'product_name', row.product_name,
        'product_status', row.product_status,
        'variant_id', row.variant_id,
        'variant_name', row.variant_name,
        'variant_size_id', row.variant_size_id,
        'size_id', row.size_id,
        'size_name', row.size_name,
        'master_size_name', row.master_size_name,
        'normalized_size', row.normalized_size,
        'sku', row.sku,
        'before_adjustment', row.before_adjustment,
        'after_adjustment', row.after_adjustment,
        'adjustment_delta', row.adjustment_delta,
        'preview_status', row.preview_status,
        'issue_codes', row.issue_codes,
        'override_audit_event_id', row.override_audit_event_id,
        'override_reason', row.override_reason
      )
      order by
        row.product_name,
        row.variant_name,
        row.normalized_size,
        row.sku,
        row.variant_size_id
    )
    from classified row
  )
) as p8a_size_adjustment_preview;
