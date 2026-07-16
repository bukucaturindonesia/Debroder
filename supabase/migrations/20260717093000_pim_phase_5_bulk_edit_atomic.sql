-- PIM Phase 5: guarded, idempotent, atomic Bulk Edit & Actions.
-- Additive only. This migration does not alter Jersey, checkout, order,
-- reservation, payment, production, fulfillment, CMS, or existing PIM paths.

begin;

create table if not exists public.pim_bulk_action_batches (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id),
  actor_role text not null,
  preview_hash text not null check (preview_hash ~ '^[0-9a-f]{64}$'),
  idempotency_key text not null unique check (idempotency_key ~ '^[0-9a-f]{64}$'),
  selection_mode text not null check (selection_mode in ('explicit', 'all_matching')),
  action_type text not null check (action_type in (
    'PRODUCT_SET_CATEGORY','PRODUCT_SET_STATUS','PRODUCT_PRICE',
    'VARIANT_SET_STATUS','VARIANT_PRICE','SELLABLE_STOCK'
  )),
  target_type text not null check (target_type in ('product','variant','sellable')),
  target_count integer not null check (target_count between 1 and 1000),
  status text not null default 'processing' check (status in ('processing','succeeded')),
  before_summary jsonb not null default '{}'::jsonb,
  after_summary jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists pim_bulk_action_batches_actor_created_idx
  on public.pim_bulk_action_batches(actor_id, created_at desc);

alter table public.pim_bulk_action_batches enable row level security;
revoke all on table public.pim_bulk_action_batches from public, anon, authenticated;
grant select, insert, update on table public.pim_bulk_action_batches to service_role;

create or replace function public.pim_bulk_edit_apply_v1(
  p_actor_id uuid,
  p_preview_hash text,
  p_idempotency_key text,
  p_selection_mode text,
  p_action jsonb,
  p_target_ids uuid[],
  p_before_state jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  actor_role text;
  action_type text := coalesce(p_action->>'type', '');
  target_type text := coalesce(p_action->>'targetType', '');
  action_mode text := coalesce(p_action->>'mode', '');
  action_status text := coalesce(p_action->>'status', '');
  action_value numeric;
  category_id uuid;
  target_count integer := coalesce(cardinality(p_target_ids), 0);
  existing_batch public.pim_bulk_action_batches%rowtype;
  batch_id uuid;
  changed_count integer := 0;
  result_value jsonb;
begin
  if p_actor_id is null then raise exception 'PERMISSION_DENIED_BULK_COMMIT'; end if;
  select lower(profile.role) into actor_role
  from public.profiles profile where profile.id = p_actor_id for share;
  if actor_role is null or not (actor_role = any(array['owner','superadmin','super_admin']::text[])) then
    raise exception 'PERMISSION_DENIED_BULK_COMMIT';
  end if;
  if p_preview_hash !~ '^[0-9a-f]{64}$' or p_idempotency_key !~ '^[0-9a-f]{64}$' then
    raise exception 'INVALID_BULK_IDENTITY';
  end if;
  if p_selection_mode not in ('explicit','all_matching') then raise exception 'INVALID_SELECTION_MODE'; end if;
  if action_type not in (
    'PRODUCT_SET_CATEGORY','PRODUCT_SET_STATUS','PRODUCT_PRICE',
    'VARIANT_SET_STATUS','VARIANT_PRICE','SELLABLE_STOCK'
  ) then raise exception 'INVALID_ACTION'; end if;
  if (action_type like 'PRODUCT_%' and target_type <> 'product')
     or (action_type like 'VARIANT_%' and target_type <> 'variant')
     or (action_type = 'SELLABLE_STOCK' and target_type <> 'sellable') then
    raise exception 'INVALID_TARGET_TYPE';
  end if;
  if target_count < 1
     or (target_type = 'product' and target_count > 250)
     or (target_type = 'variant' and target_count > 500)
     or (target_type = 'sellable' and target_count > 1000) then
    raise exception 'BATCH_LIMIT_EXCEEDED';
  end if;
  if (select count(distinct item) from unnest(p_target_ids) item) <> target_count then
    raise exception 'DUPLICATE_TARGET_ID';
  end if;
  if jsonb_typeof(p_before_state) <> 'array'
     or jsonb_array_length(p_before_state) <> target_count
     or exists (
       select 1 from jsonb_array_elements(p_before_state) expected
       where coalesce(expected->>'id','') !~ '^[0-9a-fA-F-]{36}$'
          or not ((expected->>'id')::uuid = any(p_target_ids))
     )
     or exists (
       select expected->>'id' from jsonb_array_elements(p_before_state) expected
       group by expected->>'id' having count(*) > 1
     ) then
    raise exception 'INVALID_BEFORE_STATE';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key, 0));
  select * into existing_batch
  from public.pim_bulk_action_batches batch where batch.idempotency_key = p_idempotency_key;
  if found then
    if existing_batch.actor_id <> p_actor_id
       or existing_batch.preview_hash <> p_preview_hash
       or existing_batch.action_type <> action_type
       or existing_batch.target_type <> target_type then
      raise exception 'IDEMPOTENCY_CONFLICT';
    end if;
    return existing_batch.result || jsonb_build_object('replayed', true, 'batchId', existing_batch.id);
  end if;

  -- Lock every target and compare the server preview's exact canonical state.
  if target_type = 'product' then
    perform 1 from public.products product where product.id = any(p_target_ids) for update;
    if (select count(*) from public.products product where product.id = any(p_target_ids)) <> target_count
       or exists (
         select 1
         from public.products product
         join jsonb_array_elements(p_before_state) expected on (expected->>'id')::uuid = product.id
         where product.id = any(p_target_ids)
           and (
             product.updated_at is distinct from (expected->>'updatedAt')::timestamptz
             or product.status::text is distinct from expected->>'status'
             or product.product_category_id is distinct from nullif(expected->>'categoryId','')::uuid
             or product.base_price is distinct from (expected->>'basePrice')::integer
           )
       ) then raise exception 'CONCURRENT_MODIFICATION'; end if;
  elsif target_type = 'variant' then
    if action_type = 'VARIANT_SET_STATUS' and action_status = 'inactive' then
      -- Serialize siblings in a stable order before the last-active check.
      perform 1 from public.product_variants sibling
      where sibling.product_id in (
        select target.product_id from public.product_variants target where target.id = any(p_target_ids)
      ) order by sibling.id for update;
    else
      perform 1 from public.product_variants variant
      where variant.id = any(p_target_ids) order by variant.id for update;
    end if;
    if (select count(*) from public.product_variants variant where variant.id = any(p_target_ids)) <> target_count
       or exists (
         select 1
         from public.product_variants variant
         join jsonb_array_elements(p_before_state) expected on (expected->>'id')::uuid = variant.id
         where variant.id = any(p_target_ids)
           and (
             variant.updated_at is distinct from (expected->>'updatedAt')::timestamptz
             or (case when variant.status::text = 'inactive' or variant.is_active = false then 'inactive' else 'active' end) is distinct from expected->>'status'
             or variant.price_adjustment is distinct from (expected->>'priceAdjustment')::integer
           )
       ) then raise exception 'CONCURRENT_MODIFICATION'; end if;
  else
    perform 1 from public.product_variant_sizes sellable where sellable.id = any(p_target_ids) for update;
    if (select count(*) from public.product_variant_sizes sellable where sellable.id = any(p_target_ids)) <> target_count
       or exists (
         select 1
         from public.product_variant_sizes sellable
         join jsonb_array_elements(p_before_state) expected on (expected->>'id')::uuid = sellable.id
         where sellable.id = any(p_target_ids)
           and (
             sellable.updated_at is distinct from (expected->>'updatedAt')::timestamptz
             or (case when sellable.status::text = 'inactive' or sellable.is_active = false then 'inactive' else 'active' end) is distinct from expected->>'status'
             or sellable.stock_quantity is distinct from (expected->>'stockQuantity')::integer
           )
       ) then raise exception 'CONCURRENT_MODIFICATION'; end if;
  end if;

  insert into public.pim_bulk_action_batches(
    actor_id,actor_role,preview_hash,idempotency_key,selection_mode,
    action_type,target_type,target_count,status,before_summary
  ) values (
    p_actor_id,actor_role,p_preview_hash,p_idempotency_key,p_selection_mode,
    action_type,target_type,target_count,'processing',
    jsonb_build_object('targetCount',target_count,'previewHash',p_preview_hash)
  ) returning id into batch_id;

  if action_type = 'PRODUCT_SET_CATEGORY' then
    begin category_id := (p_action->>'categoryId')::uuid;
    exception when others then raise exception 'INVALID_CATEGORY'; end;
    perform 1 from public.product_categories category
    where category.id = category_id
       or category.id in (select product.product_category_id from public.products product where product.id = any(p_target_ids))
    order by category.id for share;
    if not exists (
      select 1 from public.product_categories category
      where category.id = category_id
        and coalesce(category.is_active, true) = true
        and category.status <> 'inactive'
        and lower(category.slug) not like '%jersey%'
    ) then raise exception 'INVALID_CATEGORY'; end if;
    if exists (
      select 1 from public.products product
      join public.product_categories category on category.id = product.product_category_id
      where product.id = any(p_target_ids)
        and (lower(category.slug) like '%jersey%' or lower(coalesce(product.product_type,'')) like '%jersey%')
    ) then raise exception 'CATEGORY_COMPATIBILITY_ERROR'; end if;
    update public.products product
    set product_category_id = category_id,
        kategori = category.name
    from public.product_categories category
    where category.id = category_id and product.id = any(p_target_ids)
      and product.product_category_id is distinct from category_id;
    get diagnostics changed_count = row_count;

  elsif action_type = 'PRODUCT_SET_STATUS' then
    if action_status not in ('draft','active','archived') then raise exception 'INVALID_STATUS'; end if;
    if action_status = 'active' then
      -- Lock the complete Publish dependency graph so readiness cannot change
      -- between validation and product lifecycle update.
      perform 1 from public.product_categories category
      where category.id in (select product.product_category_id from public.products product where product.id = any(p_target_ids))
      order by category.id for share;
      perform 1 from public.product_variants variant
      where variant.product_id = any(p_target_ids) order by variant.id for share;
      perform 1 from public.product_variant_images image
      where image.variant_id in (select variant.id from public.product_variants variant where variant.product_id = any(p_target_ids))
      order by image.id for share;
      perform 1 from public.product_variant_sizes sellable
      where sellable.variant_id in (select variant.id from public.product_variants variant where variant.product_id = any(p_target_ids))
      order by sellable.id for share;
      perform 1 from public.product_size_master size_master
      where size_master.id in (
        select sellable.size_id from public.product_variant_sizes sellable
        join public.product_variants variant on variant.id = sellable.variant_id
        where variant.product_id = any(p_target_ids)
      ) order by size_master.id for share;
      if exists (select 1 from public.products product where product.id = any(p_target_ids) and product.status::text <> 'draft') then
        raise exception 'PRODUCT_STATE_CONFLICT';
      end if;
      if exists (
        select 1 from public.products product
        left join public.product_categories category on category.id = product.product_category_id
        where product.id = any(p_target_ids)
          and (length(btrim(coalesce(product.name,''))) < 2
            or coalesce(product.slug,'') = ''
            or product.base_price < 0
            or category.id is null
            or coalesce(category.is_active, true) = false
            or category.status = 'inactive'
            or not exists (
              select 1 from public.product_variants variant
              where variant.product_id = product.id and variant.status::text = 'active' and variant.is_active = true
            )
            or exists (
              select 1 from public.product_variants variant
              where variant.product_id = product.id and variant.status::text = 'active' and variant.is_active = true
                and (
                  not exists (
                    select 1 from public.product_variant_images image
                    where image.variant_id = variant.id and coalesce(image.image_url,'') <> ''
                      and (image.image_role::text = 'front' or image.is_cover = true)
                  )
                  or not exists (
                    select 1 from public.product_variant_sizes sellable
                    join public.product_size_master size_master on size_master.id = sellable.size_id
                    where sellable.variant_id = variant.id
                      and sellable.status::text = 'active' and sellable.is_active = true
                      and coalesce(sellable.sku,'') <> '' and sellable.stock_quantity >= 0
                      and size_master.is_active = true
                  )
                )
            )
          )
      ) then raise exception 'PUBLISH_VALIDATION_FAILED'; end if;
    elsif action_status = 'archived' and exists (
      select 1 from public.products product where product.id = any(p_target_ids) and product.status::text <> 'active'
    ) then raise exception 'PRODUCT_STATE_CONFLICT'; end if;
    update public.products product set status = action_status::public.product_status
    where product.id = any(p_target_ids) and product.status::text <> action_status;
    get diagnostics changed_count = row_count;

  elsif action_type in ('PRODUCT_PRICE','VARIANT_PRICE') then
    if action_mode not in ('SET','INCREASE_FIXED','DECREASE_FIXED','INCREASE_PERCENT','DECREASE_PERCENT')
       or jsonb_typeof(p_action->'value') <> 'number' then raise exception 'INVALID_PRICE'; end if;
    action_value := (p_action->>'value')::numeric;
    if action_value < 0 or action_value <> trunc(action_value)
       or (action_mode like '%PERCENT' and action_value > 1000)
       or (action_mode not like '%PERCENT' and action_value > 2147483647) then
      raise exception 'INVALID_PRICE';
    end if;
    if action_type = 'PRODUCT_PRICE' then
      if exists (
        select 1 from public.products product where product.id = any(p_target_ids)
          and (case
            when action_mode = 'SET' then action_value
            when action_mode = 'INCREASE_FIXED' then product.base_price::numeric + action_value
            when action_mode = 'DECREASE_FIXED' then product.base_price::numeric - action_value
            when action_mode = 'INCREASE_PERCENT' then product.base_price::numeric + product.base_price::numeric * action_value / 100
            else product.base_price::numeric - product.base_price::numeric * action_value / 100 end
          ) not between 0 and 2147483647
      ) then raise exception 'NEGATIVE_PRICE_RESULT'; end if;
      if action_mode like '%PERCENT' and exists (
        select 1 from public.products product where product.id = any(p_target_ids)
          and mod(product.base_price::numeric * action_value, 100) <> 0
      ) then raise exception 'PRICE_ROUNDING_RULE_MISSING'; end if;
      update public.products product set base_price = (case
        when action_mode = 'SET' then action_value
        when action_mode = 'INCREASE_FIXED' then product.base_price::numeric + action_value
        when action_mode = 'DECREASE_FIXED' then product.base_price::numeric - action_value
        when action_mode = 'INCREASE_PERCENT' then product.base_price::numeric + product.base_price::numeric * action_value / 100
        else product.base_price::numeric - product.base_price::numeric * action_value / 100 end)::integer
      where product.id = any(p_target_ids);
    else
      if exists (
        select 1 from public.product_variants variant where variant.id = any(p_target_ids)
          and (case
            when action_mode = 'SET' then action_value
            when action_mode = 'INCREASE_FIXED' then variant.price_adjustment::numeric + action_value
            when action_mode = 'DECREASE_FIXED' then variant.price_adjustment::numeric - action_value
            when action_mode = 'INCREASE_PERCENT' then variant.price_adjustment::numeric + variant.price_adjustment::numeric * action_value / 100
            else variant.price_adjustment::numeric - variant.price_adjustment::numeric * action_value / 100 end
          ) not between 0 and 2147483647
      ) then raise exception 'NEGATIVE_PRICE_RESULT'; end if;
      if action_mode like '%PERCENT' and exists (
        select 1 from public.product_variants variant where variant.id = any(p_target_ids)
          and mod(variant.price_adjustment::numeric * action_value, 100) <> 0
      ) then raise exception 'PRICE_ROUNDING_RULE_MISSING'; end if;
      update public.product_variants variant set price_adjustment = (case
        when action_mode = 'SET' then action_value
        when action_mode = 'INCREASE_FIXED' then variant.price_adjustment::numeric + action_value
        when action_mode = 'DECREASE_FIXED' then variant.price_adjustment::numeric - action_value
        when action_mode = 'INCREASE_PERCENT' then variant.price_adjustment::numeric + variant.price_adjustment::numeric * action_value / 100
        else variant.price_adjustment::numeric - variant.price_adjustment::numeric * action_value / 100 end)::integer
      where variant.id = any(p_target_ids);
    end if;
    get diagnostics changed_count = row_count;

  elsif action_type = 'VARIANT_SET_STATUS' then
    if action_status not in ('active','inactive') then raise exception 'INVALID_STATUS'; end if;
    if action_status = 'inactive' and exists (
      select 1 from public.products product
      where product.status::text = 'active'
        and exists (
          select 1 from public.product_variants targeted
          where targeted.product_id = product.id and targeted.id = any(p_target_ids)
        )
        and not exists (
          select 1 from public.product_variants remaining
          where remaining.product_id = product.id and remaining.id <> all(p_target_ids)
            and remaining.status::text = 'active' and remaining.is_active = true
        )
    ) then raise exception 'VARIANT_INACTIVE_CONFLICT'; end if;
    update public.product_variants variant
    set status = action_status::public.variant_status,
        is_active = (action_status = 'active')
    where variant.id = any(p_target_ids)
      and (variant.status::text <> action_status or variant.is_active is distinct from (action_status = 'active'));
    get diagnostics changed_count = row_count;

  else
    if action_mode not in ('SET','INCREASE','DECREASE')
       or jsonb_typeof(p_action->'value') <> 'number' then raise exception 'INVALID_STOCK'; end if;
    action_value := (p_action->>'value')::numeric;
    if action_value < 0 or action_value <> trunc(action_value) or action_value > 2147483647 then
      raise exception 'INVALID_STOCK';
    end if;
    if exists (
      select 1 from public.product_variant_sizes sellable where sellable.id = any(p_target_ids)
        and (case when action_mode = 'SET' then action_value
                  when action_mode = 'INCREASE' then sellable.stock_quantity::numeric + action_value
                  else sellable.stock_quantity::numeric - action_value end) not between 0 and 2147483647
    ) then raise exception 'INSUFFICIENT_STOCK_FOR_BULK_DECREASE'; end if;
    update public.product_variant_sizes sellable
    set stock_quantity = (case when action_mode = 'SET' then action_value
                               when action_mode = 'INCREASE' then sellable.stock_quantity::numeric + action_value
                               else sellable.stock_quantity::numeric - action_value end)::integer,
        stock = (case when action_mode = 'SET' then action_value
                      when action_mode = 'INCREASE' then sellable.stock_quantity::numeric + action_value
                      else sellable.stock_quantity::numeric - action_value end)::integer
    where sellable.id = any(p_target_ids);
    get diagnostics changed_count = row_count;
  end if;

  result_value := jsonb_build_object(
    'batchId',batch_id,'transactionStatus','committed','replayed',false,
    'actionType',action_type,'targetType',target_type,'targetCount',target_count,
    'updatedCount',changed_count,'skippedCount',target_count - changed_count
  );
  update public.pim_bulk_action_batches
  set status='succeeded',after_summary=jsonb_build_object('updatedCount',changed_count,'skippedCount',target_count - changed_count),
      result=result_value,completed_at=now()
  where id=batch_id;

  begin
    insert into public.system_audit_log(
      entity_type,entity_id,action,old_value,new_value,actor_id,actor_role,source,reason,request_id,metadata
    ) values (
      'pim_bulk_action_batch',batch_id,'updated',
      jsonb_build_object('targetCount',target_count,'previewHash',p_preview_hash),result_value,
      p_actor_id,actor_role,'pim_bulk_edit','Atomic Bulk Edit & Actions',p_idempotency_key,
      jsonb_build_object('selectionMode',p_selection_mode,'actionType',action_type,'targetType',target_type)
    );
  exception when others then
    raise exception 'AUDIT_WRITE_FAILED';
  end;
  return result_value;
exception
  when others then
    raise;
end;
$function$;

revoke all on function public.pim_bulk_edit_apply_v1(uuid,text,text,text,jsonb,uuid[],jsonb) from public, anon, authenticated;
grant execute on function public.pim_bulk_edit_apply_v1(uuid,text,text,text,jsonb,uuid[],jsonb) to service_role;

comment on table public.pim_bulk_action_batches is 'Minimal idempotency, summary, and result metadata for PIM Phase 5 atomic bulk actions. Full target payloads are not retained.';
comment on function public.pim_bulk_edit_apply_v1(uuid,text,text,text,jsonb,uuid[],jsonb) is 'Service-role-only, security-invoker PIM Phase 5 commit. Revalidates role, action allowlist, limits, concurrency, lifecycle, Jersey isolation, publish readiness, price/stock safety, idempotency, and audit in one transaction.';

commit;
