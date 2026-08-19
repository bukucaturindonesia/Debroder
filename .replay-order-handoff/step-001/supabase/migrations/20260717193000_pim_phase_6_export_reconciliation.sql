-- DEBRODER PIM Phase 6 — Product Export & Reconciliation.
-- Additive operational metadata only. Canonical PIM, order, checkout,
-- reservation, inventory ledger, Public UI, CMS, and Jersey are not mutated.

begin;

create table if not exists public.pim_export_jobs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id),
  actor_role text not null,
  job_kind text not null check (job_kind in ('product_export','reconciliation_report')),
  format text not null check (format in ('xlsx','csv')),
  idempotency_key text not null unique check (idempotency_key ~ '^[0-9a-f]{64}$'),
  request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  scope jsonb not null check (jsonb_typeof(scope) = 'object'),
  scope_hash text not null check (scope_hash ~ '^[0-9a-f]{64}$'),
  schema_version text not null,
  status text not null check (status in ('QUEUED','PROCESSING','COMPLETED','FAILED','EXPIRED','CANCELLED')),
  snapshot_at timestamptz not null,
  product_count integer not null default 0 check (product_count >= 0),
  variant_count integer not null default 0 check (variant_count >= 0),
  file_bucket text,
  file_path text,
  file_name text,
  file_mime text,
  file_size bigint check (file_size is null or file_size >= 0),
  file_sha256 text check (file_sha256 is null or file_sha256 ~ '^[0-9a-f]{64}$'),
  failure_code text,
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  expires_at timestamptz not null,
  constraint pim_export_jobs_completed_file_check check (
    status <> 'COMPLETED' or (
      file_bucket is not null and file_path is not null and file_name is not null and
      file_mime is not null and file_size is not null and file_sha256 is not null and completed_at is not null
    )
  )
);

create index if not exists pim_export_jobs_actor_created_idx
  on public.pim_export_jobs(actor_id, created_at desc);
create index if not exists pim_export_jobs_expiry_idx
  on public.pim_export_jobs(status, expires_at)
  where status in ('COMPLETED','PROCESSING');

create table if not exists public.pim_reconciliation_runs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id),
  actor_role text not null,
  idempotency_key text not null unique check (idempotency_key ~ '^[0-9a-f]{64}$'),
  request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  scope jsonb not null check (jsonb_typeof(scope) = 'object'),
  scope_hash text not null check (scope_hash ~ '^[0-9a-f]{64}$'),
  snapshot_at timestamptz not null,
  rule_set_version text not null,
  status text not null check (status in ('PASS','WARNING','ERROR','INCOMPLETE')),
  completeness text not null check (completeness in ('COMPLETE','INCOMPLETE')),
  product_count integer not null default 0 check (product_count >= 0),
  variant_count integer not null default 0 check (variant_count >= 0),
  applicable_rule_count integer not null default 0 check (applicable_rule_count >= 0),
  executed_rule_count integer not null default 0 check (executed_rule_count >= 0),
  failed_rule_count integer not null default 0 check (failed_rule_count >= 0),
  pass_count integer not null default 0 check (pass_count >= 0),
  warning_count integer not null default 0 check (warning_count >= 0),
  error_count integer not null default 0 check (error_count >= 0),
  total_findings integer not null default 0 check (total_findings >= 0),
  new_findings integer not null default 0 check (new_findings >= 0),
  existing_findings integer not null default 0 check (existing_findings >= 0),
  resolved_findings integer not null default 0 check (resolved_findings >= 0),
  failure_code text,
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists pim_reconciliation_runs_actor_started_idx
  on public.pim_reconciliation_runs(actor_id, started_at desc);
create index if not exists pim_reconciliation_runs_comparable_idx
  on public.pim_reconciliation_runs(actor_id, scope_hash, rule_set_version, completed_at desc)
  where completeness = 'COMPLETE';

create table if not exists public.pim_reconciliation_findings (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.pim_reconciliation_runs(id) on delete cascade,
  fingerprint text not null check (fingerprint ~ '^[0-9a-f]{64}$'),
  issue_code text not null,
  rule_version text not null,
  severity text not null check (severity in ('WARNING','ERROR')),
  lifecycle_status text not null check (lifecycle_status in ('NEW','EXISTING','RESOLVED','NOT_EVALUATED')),
  product_id uuid not null,
  product_name text not null,
  product_category_id uuid,
  category_name text not null default '',
  product_status text not null default '',
  variant_id uuid,
  sku text,
  field text not null,
  current_value jsonb,
  value_state text not null check (value_state in ('VALUE','ZERO','NULL','EMPTY','NOT_APPLICABLE')),
  message text not null,
  recommendation text not null,
  detected_at timestamptz not null,
  source_level text not null check (source_level in ('PRODUCT_ROOT','PRODUCT_COLOR','PRODUCT_VARIANT','DERIVED_READ_ONLY')),
  editor_destination text not null check (editor_destination in ('/admin/products','/admin/products/bulk-edit')),
  evaluation_status text not null check (evaluation_status in ('EVALUATED','NOT_APPLICABLE','SKIPPED','FAILED')),
  rule_applies_to text not null,
  created_at timestamptz not null default now(),
  unique(run_id, fingerprint)
);

create index if not exists pim_reconciliation_findings_run_filter_idx
  on public.pim_reconciliation_findings(run_id, severity, lifecycle_status, issue_code, product_name);
create index if not exists pim_reconciliation_findings_scope_filter_idx
  on public.pim_reconciliation_findings(run_id, product_category_id, product_status, product_id, variant_id);
create index if not exists pim_reconciliation_findings_fingerprint_idx
  on public.pim_reconciliation_findings(fingerprint, rule_version);

alter table public.pim_export_jobs enable row level security;
alter table public.pim_reconciliation_runs enable row level security;
alter table public.pim_reconciliation_findings enable row level security;

revoke all on table public.pim_export_jobs from public, anon, authenticated;
revoke all on table public.pim_reconciliation_runs from public, anon, authenticated;
revoke all on table public.pim_reconciliation_findings from public, anon, authenticated;
grant select, insert, update, delete on table public.pim_export_jobs to service_role;
grant select, insert, update, delete on table public.pim_reconciliation_runs to service_role;
grant select, insert, update, delete on table public.pim_reconciliation_findings to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values(
  'pim-phase6-files',
  'pim-phase6-files',
  false,
  26214400,
  array['text/csv','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
on conflict(id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- No authenticated storage policy is created. All file operations pass through
-- an authenticated server route using service_role and enforce actor ownership.

create or replace function public.pim_phase6_snapshot_v1(
  p_actor_id uuid,
  p_scope jsonb,
  p_product_limit integer,
  p_variant_limit integer
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  actor_role text;
  scope_kind text := coalesce(p_scope->>'kind','');
  filters jsonb := coalesce(p_scope->'filters','{}'::jsonb);
begin
  select lower(profile.role) into actor_role
  from public.profiles profile
  where profile.id = p_actor_id
  for share;

  if actor_role is null or not (actor_role = any(array['owner','superadmin','super_admin','admin','admin_guest']::text[])) then
    raise exception 'PIM_PHASE6_PERMISSION_DENIED';
  end if;
  if jsonb_typeof(p_scope) <> 'object'
     or jsonb_typeof(coalesce(p_scope->'ids','[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_scope->'excludedIds','[]'::jsonb)) <> 'array'
     or scope_kind not in ('selected','current_page','all_matching','category','status','updated_range','full') then
    raise exception 'PIM_PHASE6_INVALID_SCOPE';
  end if;
  if p_product_limit < 1 or p_product_limit > 1000 or p_variant_limit < 1 or p_variant_limit > 20000 then
    raise exception 'PIM_PHASE6_LIMIT_INVALID';
  end if;
  if nullif(filters->>'updatedFrom','') is not null then
    perform (filters->>'updatedFrom')::timestamptz;
  end if;
  if nullif(filters->>'updatedTo','') is not null then
    perform (filters->>'updatedTo')::timestamptz;
  end if;

  return (
    with
    selected_ids as (
      select value::uuid id
      from jsonb_array_elements_text(coalesce(p_scope->'ids','[]'::jsonb)) value
      where value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    ),
    excluded_ids as (
      select value::uuid id
      from jsonb_array_elements_text(coalesce(p_scope->'excludedIds','[]'::jsonb)) value
      where value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    ),
    candidate_products as materialized (
      select product.*
      from public.products product
      where (
        (scope_kind in ('selected','current_page') and product.id in (select id from selected_ids))
        or
        (scope_kind not in ('selected','current_page')
          and (coalesce(filters->>'status','all') = 'all' or product.status::text = filters->>'status')
          and (nullif(filters->>'categoryId','') is null or product.product_category_id = (filters->>'categoryId')::uuid)
          and (nullif(filters->>'updatedFrom','') is null or product.updated_at >= (filters->>'updatedFrom')::timestamptz)
          and (nullif(filters->>'updatedTo','') is null or product.updated_at <= (filters->>'updatedTo')::timestamptz)
          and (
            nullif(btrim(coalesce(filters->>'query','')),'') is null
            or lower(coalesce(product.name,product.nama,'')) like '%' || lower(btrim(filters->>'query')) || '%'
            or lower(coalesce(product.slug,'')) like '%' || lower(btrim(filters->>'query')) || '%'
            or lower(coalesce(product.sku,'')) like '%' || lower(btrim(filters->>'query')) || '%'
          )
        )
      )
      and product.id not in (select id from excluded_ids)
    ),
    product_total as (
      select count(*)::integer count from candidate_products
    ),
    selected_products as materialized (
      select product.*
      from candidate_products product
      order by lower(coalesce(product.name,product.nama,'')), product.id
      limit p_product_limit
    ),
    variant_roots_raw as materialized (
      select
        variant.id variant_id,
        variant.product_id,
        coalesce(nullif(variant.name,''),nullif(variant.variant_name,''),nullif(variant.color_name,''),'Variant') variant_name,
        coalesce(variant.slug,'') variant_slug,
        case when variant.status::text = 'inactive' or variant.is_active = false then 'inactive' else 'active' end variant_status,
        not (variant.status::text = 'inactive' or variant.is_active = false) variant_active,
        color_master.id color_master_id,
        coalesce(color_master.slug,variant.slug,'') color_code,
        coalesce(color_master.name,variant.name,variant.variant_name,variant.color_name,'') color_name,
        color_master.sort_order color_display_order,
        color_master.is_active color_master_active,
        color_master.id is not null color_master_matched,
        coalesce(variant.sort_order,0) variant_sort_order,
        exists(
          select 1 from public.product_variant_images image
          where image.variant_id = variant.id
            and image.image_url is not null
            and btrim(image.image_url) <> ''
            and (image.image_role::text = 'front' or image.is_cover = true)
        ) has_front_image,
        (select count(*)::integer from public.product_variant_sizes sellable where sellable.variant_id = variant.id) sellable_count,
        (select count(*)::integer from public.product_variant_sizes sellable where sellable.variant_id = variant.id and sellable.status::text = 'active' and sellable.is_active is not false) active_sellable_count
      from public.product_variants variant
      join selected_products product on product.id = variant.product_id
      left join public.product_color_master color_master on color_master.slug = variant.slug
    ),
    variant_roots as (
      select * from variant_roots_raw
      order by product_id, variant_sort_order, color_code, variant_id
      limit p_variant_limit
    ),
    sellable_rows_raw as materialized (
      select
        variant.variant_id,
        sellable.id variant_size_id,
        product.id product_id,
        coalesce(product.name,product.nama,'Produk') product_name,
        coalesce(product.slug,'') product_slug,
        product.status::text product_status,
        coalesce(product.product_type,'standard_product') product_type,
        product.product_category_id category_id,
        coalesce(category.slug,'') category_code,
        coalesce(category.name,'') category_name,
        variant.variant_name,
        variant.variant_slug,
        variant.variant_status,
        variant.variant_active,
        variant.variant_sort_order,
        variant.color_master_id,
        variant.color_code,
        variant.color_name,
        variant.color_display_order,
        variant.color_master_active,
        variant.color_master_matched,
        size_master.id size_master_id,
        coalesce(size_master.slug,'') size_code,
        coalesce(size_master.name,sellable.size_name,'') size_name,
        size_master.sort_order size_display_order,
        size_master.is_active size_master_active,
        size_master.id is not null size_master_matched,
        coalesce(sellable.sku,'') sku,
        (select count(*)::integer from public.product_variant_sizes duplicate where duplicate.sku = sellable.sku and nullif(btrim(sellable.sku),'') is not null) duplicate_sku_count,
        product.base_price,
        variant_source.price_adjustment variant_price_adjustment,
        sellable.price_adjustment size_price_adjustment,
        case when product.base_price is null or variant_source.price_adjustment is null or sellable.price_adjustment is null then null
          else product.base_price + variant_source.price_adjustment + sellable.price_adjustment end effective_price,
        coalesce(sellable.stock_quantity,sellable.stock) stock,
        sellable.status::text sellable_status,
        sellable.status::text = 'active' and sellable.is_active is not false sellable_active,
        coalesce(sellable.sort_order,0) sellable_sort_order,
        variant.has_front_image,
        sellable.created_at,
        sellable.updated_at
      from variant_roots_raw variant
      join public.product_variants variant_source on variant_source.id = variant.variant_id
      join public.products product on product.id = variant.product_id
      left join public.product_categories category on category.id = product.product_category_id
      join public.product_variant_sizes sellable on sellable.variant_id = variant.variant_id
      left join public.product_size_master size_master on size_master.id = sellable.size_id
    ),
    variant_total as (
      select greatest(
        (select count(*) from variant_roots_raw),
        (select count(*) from sellable_rows_raw)
      )::integer count
    ),
    sellable_rows as (
      select * from sellable_rows_raw
      order by lower(product_name), product_id, color_display_order nulls last, color_code, size_display_order nulls last, size_code, sku, variant_id, variant_size_id
      limit p_variant_limit
    ),
    product_rows as (
      select
        product.id product_id,
        coalesce(product.name,product.nama,'Produk') product_name,
        coalesce(product.slug,'') slug,
        product.product_category_id category_id,
        coalesce(category.slug,'') category_code,
        coalesce(category.name,'') category_name,
        category.id is not null and category.is_active is not false and category.status::text <> 'inactive' category_active,
        product.status::text status,
        product.status::text = 'active' active,
        coalesce(product.product_type,'standard_product') product_type,
        coalesce(product.pricing_mode,'fixed_price') pricing_mode,
        product.base_price,
        product.created_at,
        product.updated_at,
        (select count(*)::integer from variant_roots_raw variant where variant.product_id = product.id) variant_count,
        (select count(*)::integer from variant_roots_raw variant where variant.product_id = product.id and variant.variant_active) active_variant_count,
        (select count(*)::integer from sellable_rows_raw sellable where sellable.product_id = product.id and sellable.variant_active and sellable.sellable_active) active_sellable_count,
        (select count(*)::integer from variant_roots_raw variant where variant.product_id = product.id and variant.variant_active and variant.has_front_image) front_image_count,
        (select count(*)::integer from public.products duplicate where duplicate.slug = product.slug and nullif(btrim(product.slug),'') is not null) duplicate_slug_count
      from selected_products product
      left join public.product_categories category on category.id = product.product_category_id
    ),
    category_rows as (
      select category.id, category.slug code, category.name, coalesce(category.sort_order,0) display_order,
        category.is_active is not false and category.status::text <> 'inactive' active
      from public.product_categories category
      order by category.sort_order, category.slug, category.id
    ),
    color_rows as (
      select master.id, master.slug code, master.name, coalesce(master.sort_order,0) display_order,
        master.is_active active, master.color_group "group", master.color_hex hex
      from public.product_color_master master
      order by master.sort_order, master.slug, master.id
    ),
    size_rows as (
      select master.id, master.slug code, master.name, coalesce(master.sort_order,0) display_order,
        master.is_active active, master.size_group "group"
      from public.product_size_master master
      order by master.sort_order, master.size_group, master.slug, master.id
    )
    select jsonb_build_object(
      'snapshot_at', statement_timestamp(),
      'product_count', (select count from product_total),
      'variant_count', (select count from variant_total),
      'product_limit_exceeded', (select count from product_total) > p_product_limit,
      'variant_limit_exceeded', (select count from variant_total) > p_variant_limit,
      'products', coalesce((select jsonb_agg(to_jsonb(row_value) order by lower(row_value.product_name), row_value.product_id) from product_rows row_value),'[]'::jsonb),
      'variant_roots', coalesce((select jsonb_agg(to_jsonb(row_value) order by row_value.product_id, row_value.variant_sort_order, row_value.color_code, row_value.variant_id) from variant_roots row_value),'[]'::jsonb),
      'variants', coalesce((select jsonb_agg(to_jsonb(row_value) order by lower(row_value.product_name), row_value.product_id, row_value.color_display_order nulls last, row_value.color_code, row_value.size_display_order nulls last, row_value.size_code, row_value.sku, row_value.variant_id, row_value.variant_size_id) from sellable_rows row_value),'[]'::jsonb),
      'categories', coalesce((select jsonb_agg(to_jsonb(row_value) order by row_value.display_order, row_value.code, row_value.id) from category_rows row_value),'[]'::jsonb),
      'colors', coalesce((select jsonb_agg(to_jsonb(row_value) order by row_value.display_order, row_value.code, row_value.id) from color_rows row_value),'[]'::jsonb),
      'sizes', coalesce((select jsonb_agg(to_jsonb(row_value) order by row_value.display_order, row_value."group", row_value.code, row_value.id) from size_rows row_value),'[]'::jsonb)
    )
  );
exception
  when invalid_text_representation or datetime_field_overflow then
    raise exception 'PIM_PHASE6_INVALID_SCOPE';
end;
$function$;

revoke all on function public.pim_phase6_snapshot_v1(uuid,jsonb,integer,integer) from public, anon, authenticated;
grant execute on function public.pim_phase6_snapshot_v1(uuid,jsonb,integer,integer) to service_role;

comment on table public.pim_export_jobs is 'PIM Phase 6 operational export/report metadata only. Raw product payloads are not retained.';
comment on table public.pim_reconciliation_runs is 'PIM Phase 6 read-only reconciliation run metadata.';
comment on table public.pim_reconciliation_findings is 'Versioned read-only findings; no auto-fix or PIM mutation capability.';
comment on function public.pim_phase6_snapshot_v1(uuid,jsonb,integer,integer) is 'Service-role-only, security-invoker, single-statement canonical PIM snapshot for bounded direct export/reconciliation.';

commit;
