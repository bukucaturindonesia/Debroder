begin;

lock table public.product_size_master in share mode;
lock table public.products in share mode;
lock table public.product_variants in share mode;
lock table public.product_variant_sizes in share row exclusive mode;

create temporary table p8b_size_policy (
  size_key text primary key,
  target_adjustment numeric not null,
  expected_count integer not null
) on commit drop;

insert into p8b_size_policy (size_key, target_adjustment, expected_count)
values
  ('S', 0, 0),
  ('M', 0, 0),
  ('L', 0, 0),
  ('XL', 0, 0),
  ('2XL', 10000, 190),
  ('3XL', 20000, 76),
  ('4XL', 30000, 21);

create temporary table p8b_approved_candidates on commit drop as
with normalized_master as (
  select
    master.id,
    case upper(regexp_replace(btrim(master.name), '[[:space:]_-]+', '', 'g'))
      when 'XXL' then '2XL'
      when 'XXXL' then '3XL'
      when 'XXXXL' then '4XL'
      else upper(regexp_replace(btrim(master.name), '[[:space:]_-]+', '', 'g'))
    end as size_key
  from public.product_size_master master
)
select
  sellable.id,
  sellable.variant_id,
  variant.product_id,
  sellable.size_id,
  sellable.size_name,
  sellable.sku,
  product.status as product_status,
  master.size_key,
  sellable.price_adjustment as before_adjustment,
  policy.target_adjustment as after_adjustment
from public.product_variant_sizes sellable
join normalized_master master on master.id = sellable.size_id
join p8b_size_policy policy on policy.size_key = master.size_key
join public.product_variants variant on variant.id = sellable.variant_id
join public.products product on product.id = variant.product_id
where sellable.price_adjustment is distinct from policy.target_adjustment;

do $$
declare
  candidate_count integer;
  active_count integer;
  draft_count integer;
  invalid_before_count integer;
  null_sku_count integer;
  duplicate_master_count integer;
  duplicate_variant_size_count integer;
  duplicate_sku_count integer;
  override_evidence_count integer;
  actual_fingerprint text;
  expected record;
  actual_size_count integer;
begin
  select
    count(*),
    count(*) filter (where product_status = 'active'),
    count(*) filter (where product_status = 'draft'),
    count(*) filter (where before_adjustment <> 0),
    count(*) filter (where sku is null or btrim(sku) = ''),
    md5(string_agg(
      id::text || ':' || after_adjustment::text,
      ',' order by id
    ))
  into
    candidate_count,
    active_count,
    draft_count,
    invalid_before_count,
    null_sku_count,
    actual_fingerprint
  from p8b_approved_candidates;

  if candidate_count <> 287 then
    raise exception
      'P8B_ABORT_CANDIDATE_COUNT: expected 287, received %',
      candidate_count;
  end if;

  if actual_fingerprint <> 'c8de001d6a246fe4465873326b7ad634' then
    raise exception
      'P8B_ABORT_PREVIEW_DRIFT: approved fingerprint mismatch';
  end if;

  if active_count <> 45 or draft_count <> 242 then
    raise exception
      'P8B_ABORT_STATUS_DRIFT: expected active/draft 45/242, received %/%',
      active_count,
      draft_count;
  end if;

  if invalid_before_count <> 0 then
    raise exception
      'P8B_ABORT_BEFORE_VALUE_DRIFT: all approved rows must still be Rp0';
  end if;

  if null_sku_count <> 0 then
    raise exception
      'P8B_ABORT_MISSING_SKU: approved rows require canonical SKU';
  end if;

  for expected in
    select size_key, expected_count
    from p8b_size_policy
    where expected_count > 0
  loop
    select count(*)
    into actual_size_count
    from p8b_approved_candidates candidate
    where candidate.size_key = expected.size_key;

    if actual_size_count <> expected.expected_count then
      raise exception
        'P8B_ABORT_SIZE_COUNT: size % expected %, received %',
        expected.size_key,
        expected.expected_count,
        actual_size_count;
    end if;
  end loop;

  select count(*)
  into duplicate_master_count
  from (
    select
      master.size_group,
      case upper(regexp_replace(btrim(master.name), '[[:space:]_-]+', '', 'g'))
        when 'XXL' then '2XL'
        when 'XXXL' then '3XL'
        when 'XXXXL' then '4XL'
        else upper(regexp_replace(btrim(master.name), '[[:space:]_-]+', '', 'g'))
      end as size_key
    from public.product_size_master master
    group by
      master.size_group,
      case upper(regexp_replace(btrim(master.name), '[[:space:]_-]+', '', 'g'))
        when 'XXL' then '2XL'
        when 'XXXL' then '3XL'
        when 'XXXXL' then '4XL'
        else upper(regexp_replace(btrim(master.name), '[[:space:]_-]+', '', 'g'))
      end
    having count(*) > 1
  ) duplicate_master;

  if duplicate_master_count <> 0 then
    raise exception
      'P8B_ABORT_DUPLICATE_MASTER: normalized size master is ambiguous';
  end if;

  select count(*)
  into duplicate_variant_size_count
  from (
    select candidate.variant_id, candidate.size_key
    from p8b_approved_candidates candidate
    group by candidate.variant_id, candidate.size_key
    having count(*) > 1
  ) duplicate_variant_size;

  if duplicate_variant_size_count <> 0 then
    raise exception
      'P8B_ABORT_DUPLICATE_VARIANT_SIZE: normalized combination is ambiguous';
  end if;

  select count(*)
  into duplicate_sku_count
  from (
    select upper(btrim(candidate.sku))
    from p8b_approved_candidates candidate
    group by upper(btrim(candidate.sku))
    having count(*) > 1
  ) duplicate_sku;

  if duplicate_sku_count <> 0 then
    raise exception
      'P8B_ABORT_DUPLICATE_SKU: normalized SKU is ambiguous';
  end if;

  select count(distinct audit.entity_id)
  into override_evidence_count
  from public.system_audit_log audit
  join p8b_approved_candidates candidate on candidate.id = audit.entity_id
  where audit.entity_type = 'product_variant_sizes'
    and audit.event_code = 'VARIANT_PRICE_CHANGED'
    and nullif(btrim(coalesce(audit.reason, '')), '') is not null
    and audit.new_value ? 'price_adjustment'
    and audit.new_value->>'price_adjustment' ~ '^[0-9]+([.][0-9]+)?$'
    and (audit.new_value->>'price_adjustment')::numeric =
      candidate.before_adjustment;

  if override_evidence_count <> 0 then
    raise exception
      'P8B_ABORT_OVERRIDE_EVIDENCE: % approved rows now require owner review',
      override_evidence_count;
  end if;
end
$$;

create temporary table p8b_batch on commit drop as
select gen_random_uuid() as id;

insert into public.system_audit_log (
  entity_type,
  entity_id,
  action,
  old_value,
  new_value,
  actor_role,
  source,
  reason,
  request_id,
  metadata,
  event_code,
  event_version,
  category,
  operation_status,
  actor_label,
  source_module,
  entity_label,
  product_id,
  variant_id,
  sku,
  batch_id,
  operation_id,
  idempotency_key,
  event_summary,
  search_text
)
select
  'product_variant_sizes',
  candidate.id,
  'update',
  jsonb_build_object(
    'price_adjustment', candidate.before_adjustment,
    'size_name', candidate.size_name,
    'size_id', candidate.size_id,
    'sku', candidate.sku
  ),
  jsonb_build_object(
    'price_adjustment', candidate.after_adjustment,
    'size_name', candidate.size_name,
    'size_id', candidate.size_id,
    'sku', candidate.sku
  ),
  'owner',
  'migration',
  'Owner approved the exact P8A global size-adjustment preview cohort.',
  'P8B-20260724-SIZE-ADJUSTMENT-V1',
  jsonb_build_object(
    'package', 'P8B',
    'policy_version', 'size-adjustment-v1',
    'preview_fingerprint', 'c8de001d6a246fe4465873326b7ad634',
    'approved_candidate_count', 287,
    'size_key', candidate.size_key,
    'before_adjustment', candidate.before_adjustment,
    'after_adjustment', candidate.after_adjustment
  ),
  'SIZE_ADJUSTMENT_POLICY_APPLIED',
  1,
  'VARIANT',
  'COMPLETED',
  'Owner-approved P8A cohort',
  'p8b_size_adjustment_data_mutation',
  candidate.sku,
  candidate.product_id,
  candidate.variant_id,
  candidate.sku,
  batch.id,
  batch.id,
  'p8b-size-adjustment-v1:' || candidate.id::text,
  'Applied approved global size adjustment for ' || candidate.size_key,
  concat_ws(' ', 'P8B', candidate.sku, candidate.size_name)
from p8b_approved_candidates candidate
cross join p8b_batch batch
order by candidate.id
on conflict (event_code, idempotency_key)
  where event_code is not null and idempotency_key is not null
  do nothing;

do $$
declare
  inserted_audit_count integer;
  updated_count integer;
  residual_count integer;
begin
  select count(*)
  into inserted_audit_count
  from public.system_audit_log audit
  join p8b_batch batch on batch.id = audit.batch_id
  where audit.event_code = 'SIZE_ADJUSTMENT_POLICY_APPLIED';

  if inserted_audit_count <> 287 then
    raise exception
      'P8B_ABORT_AUDIT_COUNT: expected 287, received %',
      inserted_audit_count;
  end if;

  update public.product_variant_sizes sellable
  set
    price_adjustment = candidate.after_adjustment,
    updated_at = now()
  from p8b_approved_candidates candidate
  where sellable.id = candidate.id
    and sellable.price_adjustment = candidate.before_adjustment;

  get diagnostics updated_count = row_count;

  if updated_count <> 287 then
    raise exception
      'P8B_ABORT_UPDATE_COUNT: expected 287, received %',
      updated_count;
  end if;

  select count(*)
  into residual_count
  from p8b_approved_candidates candidate
  join public.product_variant_sizes sellable on sellable.id = candidate.id
  where sellable.price_adjustment is distinct from candidate.after_adjustment;

  if residual_count <> 0 then
    raise exception
      'P8B_ABORT_POSTCHECK: % approved rows did not reach target',
      residual_count;
  end if;
end
$$;

commit;
