-- DEBRODER PIM Phase 7 — canonical PIM audit and operations history.
-- Additive only. Existing system_audit_log remains the single audit parent.
begin;

alter table public.system_audit_log
  add column if not exists event_code text,
  add column if not exists event_version integer,
  add column if not exists category text,
  add column if not exists operation_status text,
  add column if not exists actor_label text,
  add column if not exists source_module text,
  add column if not exists entity_label text,
  add column if not exists product_id uuid,
  add column if not exists product_color_id uuid,
  add column if not exists variant_id uuid,
  add column if not exists sku text,
  add column if not exists batch_id uuid,
  add column if not exists operation_id uuid,
  add column if not exists parent_audit_id uuid references public.system_audit_log(id) on delete restrict,
  add column if not exists idempotency_key text,
  add column if not exists duration_ms bigint,
  add column if not exists event_summary text,
  add column if not exists failure_code text,
  add column if not exists retention_class text,
  add column if not exists search_text text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname='system_audit_log_pim_category_check') then
    alter table public.system_audit_log add constraint system_audit_log_pim_category_check check (
      category is null or category in ('PRODUCT','VARIANT','PRODUCT_COLOR','COLOR_MASTER','SIZE_MASTER','BULK_IMPORT','BULK_EDIT','EXPORT','RECONCILIATION','PUBLISHING','PERMISSION','SECURITY','SYSTEM')
    );
  end if;
  if not exists (select 1 from pg_constraint where conname='system_audit_log_pim_status_check') then
    alter table public.system_audit_log add constraint system_audit_log_pim_status_check check (
      operation_status is null or operation_status in ('STARTED','COMPLETED','FAILED','PARTIAL','ROLLED_BACK','DENIED','CANCELLED','EXPIRED','INCOMPLETE')
    );
  end if;
  if not exists (select 1 from pg_constraint where conname='system_audit_log_pim_event_version_check') then
    alter table public.system_audit_log add constraint system_audit_log_pim_event_version_check check (event_version is null or event_version > 0);
  end if;
  if not exists (select 1 from pg_constraint where conname='system_audit_log_pim_duration_check') then
    alter table public.system_audit_log add constraint system_audit_log_pim_duration_check check (duration_ms is null or duration_ms >= 0);
  end if;
end
$$;

create unique index if not exists system_audit_log_pim_idempotency_idx
  on public.system_audit_log(event_code,idempotency_key)
  where event_code is not null and idempotency_key is not null;
create index if not exists system_audit_log_pim_created_idx
  on public.system_audit_log(created_at desc,id desc)
  where event_code is not null;
create index if not exists system_audit_log_pim_product_idx
  on public.system_audit_log(product_id,created_at desc,id desc)
  where event_code is not null and product_id is not null;
create index if not exists system_audit_log_pim_variant_idx
  on public.system_audit_log(variant_id,created_at desc,id desc)
  where event_code is not null and variant_id is not null;
create index if not exists system_audit_log_pim_batch_idx
  on public.system_audit_log(batch_id,created_at desc)
  where event_code is not null and batch_id is not null;
create index if not exists system_audit_log_pim_operation_idx
  on public.system_audit_log(operation_id,created_at asc)
  where event_code is not null and operation_id is not null;

create table if not exists public.pim_audit_retention_policies (
  retention_class text primary key,
  retention_months smallint not null check (retention_months between 1 and 120),
  applies_to text not null check (applies_to in ('AUDIT','SECURITY','CHILD')),
  cleanup_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.pim_audit_retention_policies(retention_class,retention_months,applies_to,cleanup_enabled)
values
  ('PIM_24_MONTHS',24,'AUDIT',false),
  ('SECURITY_12_MONTHS',12,'SECURITY',false),
  ('PIM_CHILD_12_MONTHS',12,'CHILD',false)
on conflict (retention_class) do nothing;

create table if not exists public.pim_audit_changes (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.system_audit_log(id) on delete restrict,
  field_name text not null,
  before_value jsonb,
  after_value jsonb,
  before_state text not null,
  after_state text not null,
  created_at timestamptz not null default now(),
  constraint pim_audit_changes_field_check check (field_name ~ '^[A-Za-z0-9_.-]{1,100}$'),
  constraint pim_audit_changes_before_state_check check (before_state in ('VALUE','NULL','EMPTY_STRING','ZERO','NOT_APPLICABLE','REDACTED')),
  constraint pim_audit_changes_after_state_check check (after_state in ('VALUE','NULL','EMPTY_STRING','ZERO','NOT_APPLICABLE','REDACTED')),
  unique(audit_id,field_name)
);

create table if not exists public.pim_audit_entities (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.system_audit_log(id) on delete restrict,
  entity_type text not null,
  entity_id uuid,
  entity_label text,
  product_id uuid,
  variant_id uuid,
  sku text,
  result_status text,
  failure_code text,
  created_at timestamptz not null default now(),
  constraint pim_audit_entities_status_check check (result_status is null or result_status in ('STARTED','COMPLETED','FAILED','PARTIAL','ROLLED_BACK','DENIED','CANCELLED','EXPIRED','INCOMPLETE'))
);

create unique index if not exists pim_audit_entities_identity_idx
  on public.pim_audit_entities(
    audit_id,
    entity_type,
    coalesce(entity_id,'00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(product_id,'00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(variant_id,'00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(sku,'')
  );
create index if not exists pim_audit_entities_product_idx on public.pim_audit_entities(product_id,created_at desc) where product_id is not null;
create index if not exists pim_audit_entities_variant_idx on public.pim_audit_entities(variant_id,created_at desc) where variant_id is not null;
create index if not exists pim_audit_changes_audit_idx on public.pim_audit_changes(audit_id,field_name);

alter table public.pim_audit_changes enable row level security;
alter table public.pim_audit_entities enable row level security;
alter table public.pim_audit_retention_policies enable row level security;
alter table public.system_audit_log enable row level security;

revoke insert,update,delete on table public.system_audit_log from anon,authenticated;
grant select on table public.system_audit_log to authenticated;
revoke all on table public.pim_audit_changes from public,anon,authenticated;
revoke all on table public.pim_audit_entities from public,anon,authenticated;
grant select,insert on table public.pim_audit_changes to service_role;
grant select,insert on table public.pim_audit_entities to service_role;
grant select on table public.pim_audit_changes to authenticated;
grant select on table public.pim_audit_entities to authenticated;
revoke all on table public.pim_audit_retention_policies from public,anon,authenticated;
grant select on table public.pim_audit_retention_policies to service_role;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='system_audit_log' and policyname='phase7 pim audit operational read') then
    create policy "phase7 pim audit operational read" on public.system_audit_log
      for select to authenticated using (
        event_code is not null and public.current_actor_role() in ('owner','superadmin','super_admin','admin','admin_guest')
      );
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pim_audit_changes' and policyname='phase7 pim audit changes read') then
    create policy "phase7 pim audit changes read" on public.pim_audit_changes
      for select to authenticated using (
        public.current_actor_role() in ('owner','superadmin','super_admin','admin','admin_guest')
        and exists(select 1 from public.system_audit_log audit where audit.id=pim_audit_changes.audit_id and audit.event_code is not null)
      );
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pim_audit_entities' and policyname='phase7 pim audit entities read') then
    create policy "phase7 pim audit entities read" on public.pim_audit_entities
      for select to authenticated using (
        public.current_actor_role() in ('owner','superadmin','super_admin','admin','admin_guest')
        and exists(select 1 from public.system_audit_log audit where audit.id=pim_audit_entities.audit_id and audit.event_code is not null)
      );
  end if;
end
$$;

create or replace function public.pim_audit_value_state_v1(p_value jsonb)
returns text
language sql
immutable
set search_path=''
as $$
  select case
    when p_value is null or p_value='null'::jsonb then 'NULL'
    when jsonb_typeof(p_value)='string' and p_value='""'::jsonb then 'EMPTY_STRING'
    when jsonb_typeof(p_value)='number' and p_value='0'::jsonb then 'ZERO'
    else 'VALUE'
  end
$$;

create or replace function public.pim_audit_payload_is_safe_v1(p_value jsonb)
returns boolean
language sql
immutable
set search_path=''
as $$
  select coalesce(p_value::text,'') !~* '"(password|passphrase|secret|token|cookie|authorization|service[_-]?role|api[_-]?key|signed[_-]?url|raw[_-]?(file|spreadsheet|export)|customer|order|payment)[^"]*"[[:space:]]*:'
    and coalesce(p_value::text,'') !~* '(x-amz-signature|x-amz-credential|service_role)'
$$;

create or replace function public.record_pim_audit_event_v1(
  p_event_code text,
  p_event_version integer,
  p_category text,
  p_status text,
  p_actor_id uuid,
  p_actor_role text,
  p_actor_label text,
  p_source_module text,
  p_request_id text,
  p_operation_id uuid,
  p_idempotency_key text,
  p_entity_type text,
  p_entity_id uuid,
  p_entity_label text,
  p_product_id uuid,
  p_product_color_id uuid,
  p_variant_id uuid,
  p_sku text,
  p_batch_id uuid,
  p_parent_audit_id uuid,
  p_duration_ms bigint,
  p_summary text,
  p_failure_code text,
  p_metadata jsonb,
  p_changes jsonb,
  p_entities jsonb,
  p_retention_class text
)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  audit_id_value uuid;
  change_row jsonb;
  entity_row jsonb;
  profile_role text;
begin
  if p_event_code is null or p_event_code !~ '^[A-Z][A-Z0-9_]{2,99}$' then raise exception 'INVALID_AUDIT_EVENT'; end if;
  if p_event_version is null or p_event_version < 1 then raise exception 'INVALID_EVENT_VERSION'; end if;
  if p_category not in ('PRODUCT','VARIANT','PRODUCT_COLOR','COLOR_MASTER','SIZE_MASTER','BULK_IMPORT','BULK_EDIT','EXPORT','RECONCILIATION','PUBLISHING','PERMISSION','SECURITY','SYSTEM') then raise exception 'INVALID_AUDIT_CATEGORY'; end if;
  if p_status not in ('STARTED','COMPLETED','FAILED','PARTIAL','ROLLED_BACK','DENIED','CANCELLED','EXPIRED','INCOMPLETE') then raise exception 'INVALID_AUDIT_STATUS'; end if;
  if p_operation_id is null or p_idempotency_key is null or length(p_idempotency_key) < 16 then raise exception 'INVALID_AUDIT_IDENTITY'; end if;
  if not exists(select 1 from public.pim_audit_retention_policies policy where policy.retention_class=p_retention_class) then raise exception 'INVALID_RETENTION_CLASS'; end if;
  if length(coalesce(p_summary,''))=0 or length(p_summary)>500 then raise exception 'INVALID_AUDIT_SUMMARY'; end if;
  if not public.pim_audit_payload_is_safe_v1(coalesce(p_metadata,'{}'::jsonb))
     or not public.pim_audit_payload_is_safe_v1(coalesce(p_changes,'[]'::jsonb))
     or not public.pim_audit_payload_is_safe_v1(coalesce(p_entities,'[]'::jsonb)) then
    raise exception 'SENSITIVE_AUDIT_PAYLOAD_REJECTED';
  end if;
  if jsonb_typeof(coalesce(p_changes,'[]'::jsonb))<>'array' or jsonb_array_length(coalesce(p_changes,'[]'::jsonb))>200 then raise exception 'INVALID_AUDIT_CHANGES'; end if;
  if jsonb_typeof(coalesce(p_entities,'[]'::jsonb))<>'array' or jsonb_array_length(coalesce(p_entities,'[]'::jsonb))>2000 then raise exception 'INVALID_AUDIT_ENTITIES'; end if;

  select lower(profile.role) into profile_role from public.profiles profile where profile.id=p_actor_id;
  if profile_role is null or profile_role<>lower(p_actor_role) then raise exception 'AUDIT_ACTOR_MISMATCH'; end if;

  insert into public.system_audit_log(
    entity_type,entity_id,action,old_value,new_value,actor_id,actor_role,source,reason,request_id,metadata,
    event_code,event_version,category,operation_status,actor_label,source_module,entity_label,product_id,
    product_color_id,variant_id,sku,batch_id,operation_id,parent_audit_id,idempotency_key,duration_ms,
    event_summary,failure_code,retention_class,search_text
  ) values (
    left(p_entity_type,80),p_entity_id,lower(p_event_code),null,jsonb_build_object('summary',left(p_summary,500)),
    p_actor_id,lower(p_actor_role),'pim_phase_7',null,left(p_request_id,120),coalesce(p_metadata,'{}'::jsonb),
    p_event_code,p_event_version,p_category,p_status,left(p_actor_label,120),left(p_source_module,80),left(p_entity_label,180),
    p_product_id,p_product_color_id,p_variant_id,left(p_sku,100),p_batch_id,p_operation_id,p_parent_audit_id,
    left(p_idempotency_key,160),p_duration_ms,left(p_summary,500),left(p_failure_code,100),left(p_retention_class,40),
    left(concat_ws(' ',p_event_code,p_summary,p_entity_type,p_entity_label,p_sku,p_actor_label,p_actor_role,p_batch_id,p_operation_id,p_request_id),1000)
  )
  on conflict (event_code,idempotency_key) where event_code is not null and idempotency_key is not null do nothing
  returning id into audit_id_value;

  if audit_id_value is null then
    select id into audit_id_value from public.system_audit_log where event_code=p_event_code and idempotency_key=p_idempotency_key;
  end if;

  for change_row in select value from jsonb_array_elements(coalesce(p_changes,'[]'::jsonb)) loop
    if coalesce(change_row->>'field','') !~ '^[A-Za-z0-9_.-]{1,100}$' then raise exception 'INVALID_AUDIT_CHANGE_FIELD'; end if;
    insert into public.pim_audit_changes(audit_id,field_name,before_value,after_value,before_state,after_state)
    values (
      audit_id_value,change_row->>'field',change_row->'beforeValue',change_row->'afterValue',
      change_row->>'beforeState',change_row->>'afterState'
    ) on conflict (audit_id,field_name) do nothing;
  end loop;

  for entity_row in select value from jsonb_array_elements(coalesce(p_entities,'[]'::jsonb)) loop
    insert into public.pim_audit_entities(audit_id,entity_type,entity_id,entity_label,product_id,variant_id,sku,result_status,failure_code)
    values (
      audit_id_value,left(entity_row->>'entityType',80),nullif(entity_row->>'entityId','')::uuid,left(entity_row->>'entityLabel',180),
      nullif(entity_row->>'productId','')::uuid,nullif(entity_row->>'variantId','')::uuid,left(entity_row->>'sku',100),
      nullif(entity_row->>'resultStatus',''),left(entity_row->>'failureCode',100)
    ) on conflict do nothing;
  end loop;
  return audit_id_value;
end
$$;

revoke all on function public.record_pim_audit_event_v1(text,integer,text,text,uuid,text,text,text,text,uuid,text,text,uuid,text,uuid,uuid,uuid,text,uuid,uuid,bigint,text,text,jsonb,jsonb,jsonb,text) from public,anon,authenticated;
grant execute on function public.record_pim_audit_event_v1(text,integer,text,text,uuid,text,text,text,text,uuid,text,text,uuid,text,uuid,uuid,uuid,text,uuid,uuid,bigint,text,text,jsonb,jsonb,jsonb,text) to service_role;

create or replace function public.link_pim_audit_entities_v1(p_event_code text,p_idempotency_key text,p_entities jsonb)
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare
  audit_id_value uuid;
  entity_row jsonb;
  inserted_count integer:=0;
begin
  if not public.pim_audit_payload_is_safe_v1(coalesce(p_entities,'[]'::jsonb)) then raise exception 'SENSITIVE_AUDIT_PAYLOAD_REJECTED'; end if;
  if jsonb_typeof(coalesce(p_entities,'[]'::jsonb))<>'array' or jsonb_array_length(coalesce(p_entities,'[]'::jsonb))>2000 then raise exception 'INVALID_AUDIT_ENTITIES'; end if;
  select id into audit_id_value from public.system_audit_log where event_code=p_event_code and idempotency_key=p_idempotency_key;
  if audit_id_value is null then raise exception 'AUDIT_PARENT_NOT_FOUND'; end if;
  for entity_row in select value from jsonb_array_elements(p_entities) loop
    insert into public.pim_audit_entities(audit_id,entity_type,entity_id,entity_label,product_id,variant_id,sku,result_status,failure_code)
    values (
      audit_id_value,left(entity_row->>'entityType',80),nullif(entity_row->>'entityId','')::uuid,left(entity_row->>'entityLabel',180),
      nullif(entity_row->>'productId','')::uuid,nullif(entity_row->>'variantId','')::uuid,left(entity_row->>'sku',100),
      nullif(entity_row->>'resultStatus',''),left(entity_row->>'failureCode',100)
    ) on conflict do nothing;
    inserted_count:=inserted_count+1;
  end loop;
  return inserted_count;
end
$$;

revoke all on function public.link_pim_audit_entities_v1(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.link_pim_audit_entities_v1(text,text,jsonb) to service_role;

create or replace function public.canonicalize_legacy_pim_audit_v1()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if new.event_code is null and new.source='pim_bulk_import' then
    new.event_code:='BULK_IMPORT_COMPLETED'; new.event_version:=1; new.category:='BULK_IMPORT'; new.operation_status:='COMPLETED';
    new.source_module:='Bulk Import'; new.batch_id:=new.entity_id; new.operation_id:=new.entity_id; new.idempotency_key:=new.request_id;
    new.event_summary:='Bulk Import selesai'; new.retention_class:='PIM_24_MONTHS';
  elsif new.event_code is null and new.source='pim_bulk_edit' then
    new.event_code:='BULK_EDIT_COMPLETED'; new.event_version:=1; new.category:='BULK_EDIT'; new.operation_status:='COMPLETED';
    new.source_module:='Bulk Edit'; new.batch_id:=new.entity_id; new.operation_id:=new.entity_id; new.idempotency_key:=new.request_id;
    new.event_summary:='Bulk Edit selesai'; new.retention_class:='PIM_24_MONTHS';
  end if;
  if new.event_code is not null then
    new.search_text:=left(concat_ws(' ',new.event_code,new.event_summary,new.entity_type,new.entity_label,new.sku,new.actor_label,new.actor_role,new.batch_id,new.operation_id,new.request_id),1000);
  end if;
  return new;
end
$$;

drop trigger if exists canonicalize_legacy_pim_audit_v1 on public.system_audit_log;
create trigger canonicalize_legacy_pim_audit_v1 before insert on public.system_audit_log
for each row execute function public.canonicalize_legacy_pim_audit_v1();
revoke all on function public.canonicalize_legacy_pim_audit_v1() from public,anon,authenticated;

create or replace function public.audit_direct_pim_row_v1()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  before_data jsonb:=case when tg_op='INSERT' then '{}'::jsonb else to_jsonb(old) end;
  after_data jsonb:=case when tg_op='DELETE' then '{}'::jsonb else to_jsonb(new) end;
  row_data jsonb:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
  field_name text;
  allowed_fields text[];
  changes_value jsonb:='[]'::jsonb;
  event_code_value text;
  category_value text;
  module_value text;
  entity_type_value text:=tg_table_name;
  entity_id_value uuid:=(row_data->>'id')::uuid;
  product_id_value uuid;
  variant_id_value uuid;
  operation_id_value uuid:=gen_random_uuid();
  actor_role_value text;
begin
  if auth.uid() is null then return new; end if;
  actor_role_value:=public.current_actor_role();
  if actor_role_value not in ('owner','superadmin','super_admin','admin') then return new; end if;

  if tg_table_name='products' then
    allowed_fields:=array['name','nama','slug','product_category_id','base_price','sku','status','product_type','pricing_mode','minimum_order_qty'];
    product_id_value:=entity_id_value; category_value:='PRODUCT'; module_value:='Product Manager';
    if tg_op='INSERT' then event_code_value:='PRODUCT_CREATED';
    elsif before_data->'status' is distinct from after_data->'status' and after_data->>'status'='active' then event_code_value:='PRODUCT_PUBLISHED'; category_value:='PUBLISHING'; module_value:='Unified Product Workflow';
    elsif before_data->'status' is distinct from after_data->'status' and after_data->>'status'='archived' then event_code_value:='PRODUCT_ARCHIVED'; module_value:='Unified Product Workflow';
    elsif before_data->'product_category_id' is distinct from after_data->'product_category_id' then event_code_value:='PRODUCT_CATEGORY_CHANGED'; module_value:='Unified Product Workflow';
    elsif before_data->'status' is distinct from after_data->'status' then event_code_value:='PRODUCT_STATUS_CHANGED'; module_value:='Unified Product Workflow';
    else event_code_value:='PRODUCT_UPDATED'; end if;
  elsif tg_table_name='product_variants' then
    allowed_fields:=array['name','variant_name','color_name','slug','sku','price_adjustment','status','is_active','sort_order'];
    product_id_value:=(row_data->>'product_id')::uuid; variant_id_value:=entity_id_value; category_value:='VARIANT'; module_value:='Product Manager';
    if tg_op='INSERT' then event_code_value:='VARIANT_CREATED';
    elsif before_data->'sku' is distinct from after_data->'sku' then event_code_value:='VARIANT_SKU_CHANGED';
    elsif before_data->'price_adjustment' is distinct from after_data->'price_adjustment' then event_code_value:='VARIANT_PRICE_CHANGED';
    elsif before_data->'status' is distinct from after_data->'status' or before_data->'is_active' is distinct from after_data->'is_active' then event_code_value:='VARIANT_STATUS_CHANGED';
    else event_code_value:='VARIANT_UPDATED'; end if;
  elsif tg_table_name='product_variant_sizes' then
    allowed_fields:=array['size_id','size_name','sku','stock_quantity','stock','price_adjustment','status','is_active','sort_order'];
    variant_id_value:=(row_data->>'variant_id')::uuid;
    select variant.product_id into product_id_value from public.product_variants variant where variant.id=variant_id_value;
    category_value:='VARIANT'; module_value:='Product Manager';
    if tg_op='INSERT' then event_code_value:='VARIANT_CREATED';
    elsif before_data->'stock_quantity' is distinct from after_data->'stock_quantity' then event_code_value:='VARIANT_STOCK_CHANGED';
    elsif before_data->'price_adjustment' is distinct from after_data->'price_adjustment' then event_code_value:='VARIANT_PRICE_CHANGED';
    elsif before_data->'sku' is distinct from after_data->'sku' then event_code_value:='VARIANT_SKU_CHANGED';
    elsif before_data->'size_id' is distinct from after_data->'size_id' then event_code_value:='VARIANT_SIZE_CHANGED';
    elsif before_data->'status' is distinct from after_data->'status' or before_data->'is_active' is distinct from after_data->'is_active' then event_code_value:='VARIANT_STATUS_CHANGED';
    else event_code_value:='VARIANT_UPDATED'; end if;
  elsif tg_table_name='product_color_master' then
    allowed_fields:=array['name','slug','color_hex','color_group','is_active','sort_order']; category_value:='COLOR_MASTER'; module_value:='Color Master';
    if tg_op='INSERT' then event_code_value:='COLOR_MASTER_CREATED';
    elsif before_data->'is_active' is distinct from after_data->'is_active' then event_code_value:='COLOR_MASTER_STATUS_CHANGED';
    elsif before_data->'sort_order' is distinct from after_data->'sort_order' then event_code_value:='COLOR_MASTER_ORDER_CHANGED';
    else event_code_value:='COLOR_MASTER_UPDATED'; end if;
  elsif tg_table_name='product_size_master' then
    allowed_fields:=array['name','slug','size_group','is_active','sort_order']; category_value:='SIZE_MASTER'; module_value:='Size Master';
    if tg_op='INSERT' then event_code_value:='SIZE_MASTER_CREATED';
    elsif before_data->'is_active' is distinct from after_data->'is_active' then event_code_value:='SIZE_MASTER_STATUS_CHANGED';
    elsif before_data->'sort_order' is distinct from after_data->'sort_order' then event_code_value:='SIZE_MASTER_ORDER_CHANGED';
    else event_code_value:='SIZE_MASTER_UPDATED'; end if;
  else
    return new;
  end if;

  foreach field_name in array allowed_fields loop
    if before_data->field_name is distinct from after_data->field_name then
      changes_value:=changes_value||jsonb_build_array(jsonb_build_object(
        'field',field_name,'beforeValue',before_data->field_name,'afterValue',after_data->field_name,
        'beforeState',public.pim_audit_value_state_v1(before_data->field_name),
        'afterState',public.pim_audit_value_state_v1(after_data->field_name)
      ));
    end if;
  end loop;

  perform public.record_pim_audit_event_v1(
    event_code_value,1,category_value,'COMPLETED',auth.uid(),actor_role_value,null,module_value,
    operation_id_value::text,operation_id_value,encode(extensions.digest(operation_id_value::text||':'||event_code_value,'sha256'),'hex'),
    entity_type_value,entity_id_value,coalesce(row_data->>'name',row_data->>'sku'),product_id_value,null,variant_id_value,
    row_data->>'sku',null,null,null,0,replace(initcap(lower(event_code_value)),'_',' '),null,
    jsonb_build_object('timezone','Asia/Makassar'),changes_value,
    jsonb_build_array(jsonb_build_object('entityType',entity_type_value,'entityId',entity_id_value,'productId',product_id_value,'variantId',variant_id_value,'sku',row_data->>'sku','resultStatus','COMPLETED')),
    'PIM_24_MONTHS'
  );
  return new;
end
$$;

do $$
declare target_table text;
begin
  foreach target_table in array array['products','product_variants','product_variant_sizes','product_color_master','product_size_master'] loop
    if to_regclass('public.'||target_table) is not null and not exists(
      select 1 from pg_trigger where tgrelid=to_regclass('public.'||target_table) and tgname='phase7_audit_'||target_table and not tgisinternal
    ) then
      execute format('create trigger %I after insert or update on public.%I for each row execute function public.audit_direct_pim_row_v1()', 'phase7_audit_'||target_table,target_table);
    end if;
  end loop;
end
$$;
revoke all on function public.audit_direct_pim_row_v1() from public,anon,authenticated;

create or replace function public.audit_pim_phase6_operation_v1()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  event_code_value text;
  category_value text;
  status_value text;
  module_value text;
  summary_value text;
  failure_value text;
  metadata_value jsonb;
  operation_id_value uuid:=new.id;
begin
  if tg_table_name='pim_export_jobs' then
    category_value:=case when new.job_kind='reconciliation_report' then 'RECONCILIATION' else 'EXPORT' end;
    module_value:=case when new.job_kind='reconciliation_report' then 'Reconciliation' else 'Product Export' end;
    metadata_value:=jsonb_build_object(
      'jobKind',new.job_kind,'format',new.format,'scopeHash',new.scope_hash,'schemaVersion',new.schema_version,
      'productCount',new.product_count,'variantCount',new.variant_count,'fileSize',new.file_size,'fileSha256',new.file_sha256,
      'timezone','Asia/Makassar'
    );
    if tg_op='INSERT' and new.job_kind='product_export' then
      event_code_value:='EXPORT_REQUESTED'; status_value:='STARTED'; summary_value:='Export diminta';
    elsif tg_op='UPDATE' and old.status is distinct from new.status and new.status='COMPLETED' and new.job_kind='product_export' then
      event_code_value:='EXPORT_COMPLETED'; status_value:='COMPLETED'; summary_value:='Export selesai';
    elsif tg_op='UPDATE' and old.status is distinct from new.status and new.status='COMPLETED' and new.job_kind='reconciliation_report' then
      event_code_value:='RECONCILIATION_REPORT_GENERATED'; status_value:='COMPLETED'; summary_value:='Laporan reconciliation dibuat';
    elsif tg_op='UPDATE' and old.status is distinct from new.status and new.status='FAILED' then
      event_code_value:=case when new.job_kind='reconciliation_report' then 'RECONCILIATION_REPORT_GENERATED' else 'EXPORT_FAILED' end;
      status_value:='FAILED'; summary_value:=case when new.job_kind='reconciliation_report' then 'Pembuatan laporan reconciliation gagal' else 'Export gagal' end;
      failure_value:=new.failure_code;
    elsif tg_op='UPDATE' and old.status is distinct from new.status and new.status='EXPIRED' then
      event_code_value:='EXPORT_EXPIRED'; status_value:='EXPIRED'; summary_value:='Export kedaluwarsa';
    else
      return new;
    end if;
  elsif tg_table_name='pim_reconciliation_runs' then
    category_value:='RECONCILIATION'; module_value:='Reconciliation';
    metadata_value:=jsonb_build_object(
      'scopeHash',new.scope_hash,'ruleSetVersion',new.rule_set_version,'productCount',new.product_count,'variantCount',new.variant_count,
      'findingCount',new.total_findings,'warningCount',new.warning_count,'errorCount',new.error_count,'completeness',new.completeness,
      'timezone','Asia/Makassar'
    );
    if tg_op='INSERT' then
      event_code_value:='RECONCILIATION_STARTED'; status_value:='STARTED'; summary_value:='Reconciliation dimulai';
    elsif tg_op='UPDATE' and old.completed_at is null and new.completed_at is not null and new.failure_code is not null then
      event_code_value:='RECONCILIATION_FAILED'; status_value:='FAILED'; summary_value:='Reconciliation gagal'; failure_value:=new.failure_code;
    elsif tg_op='UPDATE' and old.completed_at is null and new.completed_at is not null then
      event_code_value:='RECONCILIATION_COMPLETED'; status_value:=case when new.completeness='COMPLETE' then 'COMPLETED' else 'INCOMPLETE' end; summary_value:='Reconciliation selesai';
    else
      return new;
    end if;
  else
    return new;
  end if;

  perform public.record_pim_audit_event_v1(
    event_code_value,1,category_value,status_value,new.actor_id,new.actor_role,null,module_value,
    coalesce(new.request_hash,new.idempotency_key,operation_id_value::text),operation_id_value,
    encode(extensions.digest(operation_id_value::text||':'||event_code_value,'sha256'),'hex'),tg_table_name,new.id,summary_value,
    null,null,null,null,new.id,null,null,new.duration_ms,summary_value,failure_value,metadata_value,'[]'::jsonb,
    jsonb_build_array(jsonb_build_object('entityType',tg_table_name,'entityId',new.id,'entityLabel',summary_value,'resultStatus',status_value)),
    'PIM_24_MONTHS'
  );
  return new;
end
$$;

do $$
declare target_table text;
begin
  foreach target_table in array array['pim_export_jobs','pim_reconciliation_runs'] loop
    if to_regclass('public.'||target_table) is not null and not exists(
      select 1 from pg_trigger where tgrelid=to_regclass('public.'||target_table) and tgname='phase7_audit_'||target_table and not tgisinternal
    ) then
      execute format('create trigger %I after insert or update on public.%I for each row execute function public.audit_pim_phase6_operation_v1()', 'phase7_audit_'||target_table,target_table);
    end if;
  end loop;
end
$$;
revoke all on function public.audit_pim_phase6_operation_v1() from public,anon,authenticated;

create or replace function public.prevent_pim_audit_child_mutation_v1()
returns trigger
language plpgsql
set search_path=''
as $$
begin
  raise exception 'PIM audit history is append-only';
end
$$;

drop trigger if exists prevent_pim_audit_changes_mutation_v1 on public.pim_audit_changes;
create trigger prevent_pim_audit_changes_mutation_v1 before update or delete on public.pim_audit_changes
for each row execute function public.prevent_pim_audit_child_mutation_v1();
drop trigger if exists prevent_pim_audit_entities_mutation_v1 on public.pim_audit_entities;
create trigger prevent_pim_audit_entities_mutation_v1 before update or delete on public.pim_audit_entities
for each row execute function public.prevent_pim_audit_child_mutation_v1();
revoke all on function public.prevent_pim_audit_child_mutation_v1() from public,anon,authenticated;

comment on table public.pim_audit_changes is 'Immutable field-level changes belonging to the canonical system_audit_log parent.';
comment on table public.pim_audit_entities is 'Immutable entity relations for product, variant, and bounded bulk-operation history.';
comment on function public.record_pim_audit_event_v1 is 'Service-role-only append-only PIM audit writer. Rejects unsafe payloads and deduplicates by event code plus idempotency key.';

commit;

-- OWNER DATABASE ACTION REQUIRED.
-- Apply after pending PIM Phase 4, Phase 5, and Phase 6 migrations.
-- NO HISTORICAL BACKFILL. Existing PIM audit rows remain unchanged; future legacy
-- Phase 4/5 parent inserts are canonicalized by the additive insert trigger.
-- Rollback must remove only Phase 7 triggers/functions/policies/indexes/columns and
-- the two empty child tables. Preserve all audit rows; never delete history.
