-- P8B read-only post-mutation verification.

with
policy(size_key, target_adjustment) as (
  values
    ('S', 0::numeric),
    ('M', 0::numeric),
    ('L', 0::numeric),
    ('XL', 0::numeric),
    ('2XL', 10000::numeric),
    ('3XL', 20000::numeric),
    ('4XL', 30000::numeric)
),
normalized_master as (
  select
    master.id,
    case upper(regexp_replace(btrim(master.name), '[[:space:]_-]+', '', 'g'))
      when 'XXL' then '2XL'
      when 'XXXL' then '3XL'
      when 'XXXXL' then '4XL'
      else upper(regexp_replace(btrim(master.name), '[[:space:]_-]+', '', 'g'))
    end as size_key
  from public.product_size_master master
),
managed as (
  select
    sellable.id,
    sellable.price_adjustment,
    master.size_key,
    policy.target_adjustment
  from public.product_variant_sizes sellable
  join normalized_master master on master.id = sellable.size_id
  join policy on policy.size_key = master.size_key
),
audit as (
  select
    log.entity_id,
    log.old_value,
    log.new_value,
    log.metadata,
    log.batch_id
  from public.system_audit_log log
  where log.event_code = 'SIZE_ADJUSTMENT_POLICY_APPLIED'
    and log.source_module = 'p8b_size_adjustment_data_mutation'
    and log.metadata->>'preview_fingerprint' =
      'c8de001d6a246fe4465873326b7ad634'
)
select jsonb_build_object(
  'managed_sku_count', (select count(*) from managed),
  'managed_mismatch_count', (
    select count(*)
    from managed
    where price_adjustment is distinct from target_adjustment
  ),
  'managed_by_size', (
    select jsonb_object_agg(size_key, row_count)
    from (
      select size_key, count(*) as row_count
      from managed
      group by size_key
      order by size_key
    ) size_count
  ),
  'audit_row_count', (select count(*) from audit),
  'audit_batch_count', (select count(distinct batch_id) from audit),
  'audit_before_values', (
    select jsonb_object_agg(before_value, row_count)
    from (
      select old_value->>'price_adjustment' as before_value, count(*) row_count
      from audit
      group by old_value->>'price_adjustment'
    ) before_count
  ),
  'audit_after_by_size', (
    select jsonb_object_agg(size_key, row_count)
    from (
      select metadata->>'size_key' as size_key, count(*) row_count
      from audit
      group by metadata->>'size_key'
    ) after_count
  ),
  'audit_fingerprint', (
    select md5(string_agg(
      entity_id::text || ':' || (new_value->>'price_adjustment'),
      ',' order by entity_id
    ))
    from audit
  ),
  'unlinked_mix_size_count', (
    select count(*)
    from public.product_variant_sizes
    where size_id is null and size_name = 'Mix Size'
  ),
  'unlinked_mix_size_nonzero_adjustment_count', (
    select count(*)
    from public.product_variant_sizes
    where size_id is null
      and size_name = 'Mix Size'
      and price_adjustment <> 0
  )
) as p8b_verification;
