-- PIM Phase 4: atomic, create-only bulk import for canonical Product Manager.
-- Additive only. Does not alter order, checkout, reservation, inventory ledger,
-- Jersey, CMS, or existing PIM write paths.

begin;

create table if not exists public.pim_bulk_import_batches (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id),
  file_name text not null,
  file_sha256 text not null check (file_sha256 ~ '^[0-9a-f]{64}$'),
  payload_hash text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  idempotency_key text not null unique check (length(idempotency_key) = 64),
  import_mode text not null default 'create_only' check (import_mode = 'create_only'),
  total_rows integer not null check (total_rows between 1 and 2000),
  product_count integer not null check (product_count between 1 and 250),
  status text not null default 'processing' check (status in ('processing', 'succeeded')),
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists pim_bulk_import_batches_actor_created_idx
  on public.pim_bulk_import_batches(actor_id, created_at desc);

alter table public.pim_bulk_import_batches enable row level security;
revoke all on table public.pim_bulk_import_batches from public, anon, authenticated;
grant select, insert, update on table public.pim_bulk_import_batches to service_role;

create or replace function public.pim_bulk_import_create_v1(
  p_actor_id uuid,
  p_file_name text,
  p_file_sha256 text,
  p_payload_hash text,
  p_idempotency_key text,
  p_products jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  actor_role text;
  existing_batch public.pim_bulk_import_batches%rowtype;
  batch_id uuid;
  product_data jsonb;
  color_data jsonb;
  size_data jsonb;
  product_id uuid;
  variant_id uuid;
  category_name text;
  color_row public.product_color_master%rowtype;
  size_row public.product_size_master%rowtype;
  product_index integer := 0;
  color_index integer;
  total_rows integer;
  total_colors integer := 0;
  result_value jsonb;
begin
  if p_actor_id is null then raise exception 'PERMISSION_DENIED: actor required'; end if;
  select lower(p.role) into actor_role from public.profiles p where p.id = p_actor_id for share;
  if actor_role is null or not (actor_role = any(array['owner','superadmin','super_admin']::text[])) then
    raise exception 'PERMISSION_DENIED: PIM dependency role required';
  end if;
  if coalesce(p_file_name, '') = '' or length(p_file_name) > 180 then raise exception 'INVALID_FILE_NAME'; end if;
  if p_file_sha256 !~ '^[0-9a-f]{64}$' or p_payload_hash !~ '^[0-9a-f]{64}$' or p_idempotency_key !~ '^[0-9a-f]{64}$' then
    raise exception 'INVALID_IMPORT_IDENTITY';
  end if;
  if jsonb_typeof(p_products) <> 'array' or jsonb_array_length(p_products) not between 1 and 250 then
    raise exception 'INVALID_PRODUCT_PAYLOAD';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key, 0));
  select * into existing_batch from public.pim_bulk_import_batches where idempotency_key = p_idempotency_key;
  if found then
    if existing_batch.actor_id <> p_actor_id or existing_batch.file_sha256 <> p_file_sha256 or existing_batch.payload_hash <> p_payload_hash then
      raise exception 'IDEMPOTENCY_CONFLICT';
    end if;
    return existing_batch.result || jsonb_build_object('replayed', true, 'batchId', existing_batch.id);
  end if;

  select count(*)::integer into total_rows
  from jsonb_array_elements(p_products) product,
       jsonb_array_elements(product -> 'colors') color,
       jsonb_array_elements(color -> 'sizes') size;
  if total_rows not between 1 and 2000 then raise exception 'ROW_LIMIT_EXCEEDED'; end if;

  -- Revalidate payload shape and canonical values before any business insert.
  if exists (
    select 1 from jsonb_array_elements(p_products) product
    where coalesce(product->>'productKey','') !~ '^[A-Z0-9][A-Z0-9._-]{0,63}$'
       or length(btrim(coalesce(product->>'productName',''))) not between 2 and 180
       or coalesce(product->>'slug','') !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
       or coalesce(product->>'categoryId','') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
       or coalesce(product->>'categoryCode','') !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
       or jsonb_typeof(product->'basePrice') <> 'number'
       or (product->>'basePrice')::numeric < 0
       or (product->>'basePrice')::numeric <> trunc((product->>'basePrice')::numeric)
       or jsonb_typeof(product->'colors') <> 'array'
       or jsonb_array_length(product->'colors') = 0
  ) then raise exception 'INVALID_PRODUCT_ROOT'; end if;

  if exists (
    select 1 from jsonb_array_elements(p_products) product,
                  jsonb_array_elements(product->'colors') color
    where coalesce(color->>'colorMasterId','') !~ '^[0-9a-fA-F-]{36}$'
       or coalesce(color->>'colorCode','') !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
       or jsonb_typeof(color->'sizes') <> 'array'
       or jsonb_array_length(color->'sizes') = 0
  ) then raise exception 'INVALID_COLOR_PAYLOAD'; end if;

  if exists (
    select 1 from jsonb_array_elements(p_products) product,
                  jsonb_array_elements(product->'colors') color,
                  jsonb_array_elements(color->'sizes') size
    where coalesce(size->>'sizeMasterId','') !~ '^[0-9a-fA-F-]{36}$'
       or coalesce(size->>'sizeCode','') !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
       or coalesce(size->>'sku','') !~ '^[A-Z0-9]+(-[A-Z0-9]+)*$'
       or jsonb_typeof(size->'stock') <> 'number'
       or (size->>'stock')::numeric < 0
       or (size->>'stock')::numeric <> trunc((size->>'stock')::numeric)
       or jsonb_typeof(size->'priceAdjustment') <> 'number'
       or (size->>'priceAdjustment')::numeric <> trunc((size->>'priceAdjustment')::numeric)
  ) then raise exception 'INVALID_SELLABLE_PAYLOAD'; end if;

  if exists (select product->>'slug' from jsonb_array_elements(p_products) product group by product->>'slug' having count(*) > 1) then
    raise exception 'DUPLICATE_SLUG_IN_FILE';
  end if;
  if exists (
    select size->>'sku' from jsonb_array_elements(p_products) product,
      jsonb_array_elements(product->'colors') color,
      jsonb_array_elements(color->'sizes') size
    group by size->>'sku' having count(*) > 1
  ) then raise exception 'DUPLICATE_SKU_IN_FILE'; end if;
  if exists (
    select product->>'productKey', color->>'colorMasterId'
    from jsonb_array_elements(p_products) product,
         jsonb_array_elements(product->'colors') color
    group by product->>'productKey', color->>'colorMasterId' having count(*) > 1
  ) then raise exception 'DUPLICATE_COLOR_IN_FILE'; end if;
  if exists (
    select product->>'productKey', color->>'colorMasterId', size->>'sizeMasterId'
    from jsonb_array_elements(p_products) product,
         jsonb_array_elements(product->'colors') color,
         jsonb_array_elements(color->'sizes') size
    group by product->>'productKey', color->>'colorMasterId', size->>'sizeMasterId' having count(*) > 1
  ) then raise exception 'DUPLICATE_VARIANT_IN_FILE'; end if;

  if exists (
    select 1 from public.products p
    join jsonb_array_elements(p_products) product on p.slug = product->>'slug'
  ) then raise exception 'DUPLICATE_SLUG_DATABASE'; end if;
  if exists (
    select 1 from public.product_variant_sizes pvs
    join (
      select size->>'sku' sku from jsonb_array_elements(p_products) product,
        jsonb_array_elements(product->'colors') color,
        jsonb_array_elements(color->'sizes') size
    ) incoming on incoming.sku = pvs.sku
  ) then raise exception 'DUPLICATE_SKU_DATABASE'; end if;

  if exists (
    select 1 from jsonb_array_elements(p_products) product
    left join public.product_categories category on category.id = (product->>'categoryId')::uuid
    where category.id is null or category.slug <> product->>'categoryCode'
       or coalesce(category.is_active, true) = false or category.status = 'inactive'
  ) then raise exception 'INVALID_CATEGORY_REFERENCE'; end if;
  if exists (
    select 1 from jsonb_array_elements(p_products) product,
      jsonb_array_elements(product->'colors') color
    left join public.product_color_master master on master.id = (color->>'colorMasterId')::uuid
    where master.id is null or master.slug <> color->>'colorCode' or master.is_active = false
  ) then raise exception 'INVALID_COLOR_REFERENCE'; end if;
  if exists (
    select 1 from jsonb_array_elements(p_products) product,
      jsonb_array_elements(product->'colors') color,
      jsonb_array_elements(color->'sizes') size
    left join public.product_size_master master on master.id = (size->>'sizeMasterId')::uuid
    where master.id is null or master.slug <> size->>'sizeCode' or master.is_active = false
  ) then raise exception 'INVALID_SIZE_REFERENCE'; end if;

  insert into public.pim_bulk_import_batches(
    actor_id,file_name,file_sha256,payload_hash,idempotency_key,total_rows,product_count,status
  ) values (
    p_actor_id,p_file_name,p_file_sha256,p_payload_hash,p_idempotency_key,total_rows,jsonb_array_length(p_products),'processing'
  ) returning id into batch_id;

  for product_data in select value from jsonb_array_elements(p_products) loop
    product_index := product_index + 1;
    select category.name into category_name from public.product_categories category where category.id = (product_data->>'categoryId')::uuid for share;
    insert into public.products(
      name,nama,slug,product_category_id,kategori,base_price,price,harga,
      description,deskripsi,sku,status,status_aktif,product_type,pricing_mode,
      minimum_order_qty,has_variants,updated_at
    ) values (
      btrim(product_data->>'productName'),btrim(product_data->>'productName'),product_data->>'slug',
      (product_data->>'categoryId')::uuid,category_name,(product_data->>'basePrice')::integer,
      (product_data->>'basePrice')::integer,(product_data->>'basePrice')::integer,
      null,'',null,'draft',false,'standard_product','fixed_price',1,true,now()
    ) returning id into product_id;

    color_index := 0;
    for color_data in select value from jsonb_array_elements(product_data->'colors') loop
      color_index := color_index + 1;
      select * into color_row from public.product_color_master master
        where master.id = (color_data->>'colorMasterId')::uuid and master.slug = color_data->>'colorCode' and master.is_active = true for share;
      if not found then raise exception 'INVALID_COLOR_REFERENCE'; end if;
      insert into public.product_variants(
        product_id,name,variant_name,color_name,slug,hex_code,color_hex,sku,
        price_adjustment,status,is_active,is_default,sort_order,updated_at
      ) values (
        product_id,color_row.name,color_row.name,color_row.name,color_row.slug,color_row.color_hex,color_row.color_hex,null,
        coalesce((color_data->>'priceAdjustment')::integer,0),'active',true,color_index = 1,color_index - 1,now()
      ) returning id into variant_id;
      total_colors := total_colors + 1;

      for size_data in select value from jsonb_array_elements(color_data->'sizes') loop
        select * into size_row from public.product_size_master master
          where master.id = (size_data->>'sizeMasterId')::uuid and master.slug = size_data->>'sizeCode' and master.is_active = true for share;
        if not found then raise exception 'INVALID_SIZE_REFERENCE'; end if;
        insert into public.product_variant_sizes(
          variant_id,size_id,size_name,sku,stock_quantity,stock,price_adjustment,
          status,is_active,sort_order,updated_at
        ) values (
          variant_id,size_row.id,size_row.name,size_data->>'sku',(size_data->>'stock')::integer,(size_data->>'stock')::integer,
          (size_data->>'priceAdjustment')::integer,'active',true,coalesce((size_data->>'rowNumber')::integer,0),now()
        );
      end loop;
    end loop;
  end loop;

  result_value := jsonb_build_object(
    'batchId',batch_id,'transactionStatus','committed','replayed',false,
    'productRootsCreated',jsonb_array_length(p_products),'colorsCreated',total_colors,
    'variantsCreated',total_colors,'rowsImported',total_rows,'productsStatus','draft'
  );
  update public.pim_bulk_import_batches set status='succeeded',result=result_value,completed_at=now() where id=batch_id;

  insert into public.system_audit_log(
    entity_type,entity_id,action,old_value,new_value,actor_id,actor_role,source,reason,request_id,metadata
  ) values (
    'pim_bulk_import_batch',batch_id,'created',null,result_value,p_actor_id,actor_role,
    'pim_bulk_import','Create-only atomic Draft import',p_idempotency_key,
    jsonb_build_object('file_sha256',p_file_sha256,'payload_hash',p_payload_hash,'import_mode','create_only')
  );
  return result_value;
end;
$function$;

revoke all on function public.pim_bulk_import_create_v1(uuid,text,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.pim_bulk_import_create_v1(uuid,text,text,text,text,jsonb) to service_role;

comment on table public.pim_bulk_import_batches is 'Minimal idempotency and result metadata for PIM Phase 4 bulk imports. Raw files and duplicate product payloads are not stored.';
comment on function public.pim_bulk_import_create_v1(uuid,text,text,text,text,jsonb) is 'Service-role-only atomic create-only import into canonical PIM tables. Revalidates role, masters, uniqueness, Draft status, price, stock, and idempotency.';

commit;
