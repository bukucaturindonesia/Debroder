create or replace function public.build_custom_order_pricing_v1(
  p_order_id uuid,
  p_editable_lines jsonb,
  p_confirmations jsonb,
  p_valid_days integer,
  p_customer_note text,
  p_internal_note text
)
returns jsonb
language plpgsql
set search_path=''
as $$
declare
  order_row public.orders;
  item_row record;
  line_value jsonb;
  normalized_lines jsonb:='[]'::jsonb;
  product_lines jsonb:='[]'::jsonb;
  blockers jsonb:='[]'::jsonb;
  kind_value text;
  line_id text;
  label_value text;
  source_value text;
  service_code_value text;
  placement_value text;
  print_size_value text;
  reason_value text;
  unit_value text;
  quantity_value bigint;
  unit_price_value bigint;
  contribution bigint;
  product_total bigint:=0;
  service_total bigint:=0;
  personalization_total bigint:=0;
  setup_design_total bigint:=0;
  adjustment_total bigint:=0;
  discount_total bigint:=0;
  shipping_total bigint:=0;
  other_total bigint:=0;
  final_total bigint:=0;
  product_count integer:=0;
  valid_line boolean;
  service_required boolean:=false;
  duplicate_key text;
  has_dtf_generic boolean:=false;
  has_dtf_specific boolean:=false;
begin
  select * into order_row from public.orders where id=p_order_id and archived_at is null;
  if not found then raise exception 'Order aktif tidak ditemukan'; end if;
  if jsonb_array_length(coalesce(order_row.custom_project_snapshot,'[]'::jsonb))=0 then
    raise exception 'Custom Order tidak ditemukan';
  end if;

  if jsonb_typeof(coalesce(p_editable_lines,'[]'::jsonb))<>'array' then
    raise exception 'Rincian harga harus berupa array';
  end if;
  if jsonb_array_length(coalesce(p_editable_lines,'[]'::jsonb))>60 then
    raise exception 'Rincian harga melebihi batas operasional';
  end if;
  if jsonb_typeof(coalesce(p_confirmations,'{}'::jsonb))<>'object' then
    raise exception 'Konfirmasi pricing tidak valid';
  end if;

  for item_row in
    select id,product_name,variant_name,color,size,sku,quantity,unit_price,subtotal
    from public.order_items
    where order_id=p_order_id and archived_at is null
    order by created_at,id
  loop
    product_count:=product_count+1;
    contribution:=coalesce(item_row.subtotal::bigint,item_row.quantity::bigint*item_row.unit_price::bigint);
    product_lines:=product_lines||jsonb_build_array(jsonb_build_object(
      'id','product:'||item_row.id::text,
      'kind','PRODUCT_BASE',
      'label',coalesce(nullif(item_row.product_name,''),'Produk tanpa nama'),
      'source','order_item_snapshot',
      'quantity',item_row.quantity,
      'unit','pcs',
      'unit_price',item_row.unit_price,
      'subtotal',contribution,
      'editable',false,
      'sku',item_row.sku,
      'variant',item_row.variant_name,
      'color',item_row.color,
      'size',item_row.size
    ));
    if item_row.quantity is null or item_row.quantity<=0 or item_row.unit_price is null or item_row.unit_price<=0 or contribution<=0 then
      blockers:=blockers||jsonb_build_array('Harga dasar produk '||coalesce(nullif(item_row.product_name,''),'tanpa nama')||' belum tersedia atau tidak valid.');
    else
      product_total:=product_total+contribution;
    end if;
  end loop;

  if product_count=0 then blockers:=blockers||jsonb_build_array('Order belum memiliki product base line.'); end if;
  if coalesce(p_confirmations->'product','false'::jsonb)<>'true'::jsonb then
    blockers:=blockers||jsonb_build_array('Konfirmasi produk, varian, jumlah, dan harga dasar belum diberikan.');
  end if;

  select exists(
    select 1
    from jsonb_array_elements(coalesce(order_row.custom_project_snapshot,'[]'::jsonb)) project,
      lateral jsonb_array_elements(
        case when jsonb_typeof(project#>'{pricing,lines}')='array' then project#>'{pricing,lines}' else '[]'::jsonb end
      ) price_line
    where coalesce(price_line->>'kind','')<>'product'
  ) or jsonb_path_exists(order_row.custom_project_snapshot,'$[*].items[*].designPackages[*].services[*]')
    or jsonb_path_exists(order_row.custom_project_snapshot,'$[*].items[*].personalization ? (@.ruleId != null)')
  into service_required;
  if service_required and coalesce(p_confirmations->'service','false'::jsonb)<>'true'::jsonb then
    blockers:=blockers||jsonb_build_array('Konfirmasi layanan dan spesifikasi custom belum diberikan.');
  end if;
  if p_valid_days is null or p_valid_days<1 or p_valid_days>30 then
    blockers:=blockers||jsonb_build_array('Masa berlaku penawaran harus 1–30 hari.');
  end if;

  for line_value in select value from jsonb_array_elements(coalesce(p_editable_lines,'[]'::jsonb))
  loop
    valid_line:=true;
    if jsonb_typeof(line_value)<>'object' then
      blockers:=blockers||jsonb_build_array('Rincian harga tidak valid.');
      continue;
    end if;

    line_id:=coalesce(nullif(left(btrim(coalesce(line_value->>'id','')),160),''),gen_random_uuid()::text);
    kind_value:=upper(btrim(coalesce(line_value->>'kind','')));
    label_value:=left(btrim(coalesce(line_value->>'label','')),160);
    source_value:=left(coalesce(nullif(btrim(coalesce(line_value->>'source','')),''),'admin_manual'),160);
    service_code_value:=left(btrim(coalesce(line_value->>'service_code','')),120);
    placement_value:=left(btrim(coalesce(line_value->>'placement','')),120);
    print_size_value:=left(btrim(coalesce(line_value->>'print_size','')),120);
    reason_value:=left(btrim(coalesce(line_value->>'reason','')),500);
    unit_value:=left(coalesce(nullif(btrim(coalesce(line_value->>'unit','')),''),'pcs'),30);
    quantity_value:=0;
    unit_price_value:=0;

    if kind_value not in ('SERVICE','PERSONALIZATION','SETUP_FEE','DESIGN_FEE','DISCOUNT','ADJUSTMENT','SHIPPING','OTHER') then
      blockers:=blockers||jsonb_build_array('Jenis komponen '||coalesce(nullif(label_value,''),line_id)||' tidak valid.');
      valid_line:=false;
    end if;
    if label_value='' then
      blockers:=blockers||jsonb_build_array('Setiap komponen harga wajib memiliki label.');
      valid_line:=false;
    end if;

    if jsonb_typeof(line_value->'quantity')='number' then
      if (line_value->>'quantity')::numeric=trunc((line_value->>'quantity')::numeric)
         and (line_value->>'quantity')::numeric between 1 and 100000 then
        quantity_value:=(line_value->>'quantity')::bigint;
      else
        blockers:=blockers||jsonb_build_array(coalesce(nullif(label_value,''),'Komponen')||': quantity harus berupa integer positif.');
        valid_line:=false;
      end if;
    else
      blockers:=blockers||jsonb_build_array(coalesce(nullif(label_value,''),'Komponen')||': quantity harus berupa integer positif.');
      valid_line:=false;
    end if;

    if jsonb_typeof(line_value->'unit_price')='number' then
      if (line_value->>'unit_price')::numeric=trunc((line_value->>'unit_price')::numeric)
         and abs((line_value->>'unit_price')::numeric)<=2000000000 then
        unit_price_value:=(line_value->>'unit_price')::bigint;
      else
        blockers:=blockers||jsonb_build_array(coalesce(nullif(label_value,''),'Komponen')||': harga harus berupa integer Rupiah.');
        valid_line:=false;
      end if;
    else
      blockers:=blockers||jsonb_build_array(coalesce(nullif(label_value,''),'Komponen')||': harga harus berupa integer Rupiah.');
      valid_line:=false;
    end if;

    if kind_value<>'ADJUSTMENT' and unit_price_value<0 then
      blockers:=blockers||jsonb_build_array(coalesce(nullif(label_value,''),'Komponen')||': harga negatif hanya boleh digunakan pada adjustment.');
      valid_line:=false;
    end if;
    if kind_value in ('ADJUSTMENT','DISCOUNT','OTHER') and length(reason_value)<5 then
      blockers:=blockers||jsonb_build_array(coalesce(nullif(label_value,''),'Komponen')||': alasan minimal 5 karakter wajib diisi.');
      valid_line:=false;
    end if;

    contribution:=case when valid_line then quantity_value*unit_price_value else 0 end;
    if kind_value='SERVICE' then service_total:=service_total+abs(contribution);
    elsif kind_value='PERSONALIZATION' then personalization_total:=personalization_total+abs(contribution);
    elsif kind_value in ('SETUP_FEE','DESIGN_FEE') then setup_design_total:=setup_design_total+abs(contribution);
    elsif kind_value='DISCOUNT' then discount_total:=discount_total+abs(contribution);
    elsif kind_value='ADJUSTMENT' then adjustment_total:=adjustment_total+contribution;
    elsif kind_value='SHIPPING' then shipping_total:=shipping_total+abs(contribution);
    elsif kind_value='OTHER' then other_total:=other_total+abs(contribution);
    end if;

    normalized_lines:=normalized_lines||jsonb_build_array(jsonb_build_object(
      'id',line_id,'kind',kind_value,'label',label_value,'source',source_value,
      'quantity',quantity_value,'unit',unit_value,'unit_price',unit_price_value,
      'subtotal',case when kind_value='DISCOUNT' then -abs(contribution) else contribution end,
      'service_code',service_code_value,'placement',placement_value,'print_size',print_size_value,
      'reason',reason_value,'editable',true
    ));
  end loop;

  for duplicate_key in
    select identity_key from (
      select concat_ws('|',
        upper(value->>'kind'),
        regexp_replace(lower(coalesce(nullif(value->>'service_code',''),value->>'label','')),'[^a-z0-9]+','-','g'),
        regexp_replace(lower(coalesce(value->>'label','')),'[^a-z0-9]+','-','g'),
        regexp_replace(lower(coalesce(value->>'placement','')),'[^a-z0-9]+','-','g'),
        regexp_replace(lower(coalesce(value->>'print_size','')),'[^a-z0-9]+','-','g')
      ) identity_key,count(*)
      from jsonb_array_elements(normalized_lines)
      group by 1 having count(*)>1
    ) duplicates
  loop
    blockers:=blockers||jsonb_build_array('Komponen harga terduplikasi. Periksa identity '||duplicate_key||'.');
  end loop;

  for duplicate_key in
    select semantic_key from (
      select upper(value->>'kind') kind_value,
        regexp_replace(lower(coalesce(nullif(value->>'service_code',''),value->>'label','')),'[^a-z0-9]+','-','g') semantic_key,
        count(*)
      from jsonb_array_elements(normalized_lines)
      where upper(value->>'kind') in ('SETUP_FEE','PERSONALIZATION')
      group by 1,2 having count(*)>1
    ) duplicates
  loop
    blockers:=blockers||jsonb_build_array('Setup fee atau personalisasi terduplikasi: '||duplicate_key||'.');
  end loop;

  for duplicate_key in
    select semantic_key from (
      select concat_ws('|',
        regexp_replace(lower(coalesce(nullif(value->>'service_code',''),value->>'label','')),'[^a-z0-9]+','-','g'),
        regexp_replace(lower(coalesce(value->>'placement','')),'[^a-z0-9]+','-','g'),
        regexp_replace(lower(coalesce(value->>'print_size','')),'[^a-z0-9]+','-','g')
      ) semantic_key,count(*)
      from jsonb_array_elements(normalized_lines)
      where upper(value->>'kind')='SERVICE'
      group by 1 having count(*)>1
    ) duplicates
  loop
    blockers:=blockers||jsonb_build_array('Layanan atau placement terduplikasi: '||duplicate_key||'.');
  end loop;

  select
    coalesce(bool_or(coalesce(value->>'placement','')='' and coalesce(value->>'print_size','')=''),false),
    coalesce(bool_or(coalesce(value->>'placement','')<>'' or coalesce(value->>'print_size','')<>''),false)
  into has_dtf_generic,has_dtf_specific
  from jsonb_array_elements(normalized_lines)
  where upper(value->>'kind')='SERVICE'
    and lower(coalesce(value->>'service_code','')||' '||coalesce(value->>'label','')) ~ '(^|[^a-z0-9])dtf([^a-z0-9]|$)';
  if has_dtf_generic and has_dtf_specific then
    blockers:=blockers||jsonb_build_array('Biaya DTF generic bertabrakan dengan rincian DTF spesifik. Hapus biaya untuk pekerjaan yang sama.');
  end if;

  final_total:=product_total+service_total+personalization_total+setup_design_total+adjustment_total-discount_total+shipping_total+other_total;
  if final_total<=0 then blockers:=blockers||jsonb_build_array('Total final order berbayar harus lebih besar dari Rp0.'); end if;

  return jsonb_build_object(
    'schema_version',1,
    'currency','IDR',
    'product_lines',product_lines,
    'editable_lines',normalized_lines,
    'confirmations',jsonb_build_object(
      'product',coalesce(p_confirmations->'product','false'::jsonb)='true'::jsonb,
      'service',case when service_required then coalesce(p_confirmations->'service','false'::jsonb)='true'::jsonb else true end
    ),
    'valid_days',p_valid_days,
    'customer_note',nullif(left(btrim(coalesce(p_customer_note,'')),1000),''),
    'internal_note',nullif(left(btrim(coalesce(p_internal_note,'')),2000),''),
    'totals',jsonb_build_object(
      'product',product_total,'service',service_total,'personalization',personalization_total,
      'setupDesign',setup_design_total,'adjustment',adjustment_total,'discount',discount_total,
      'shipping',shipping_total,'other',other_total,'final',final_total
    ),
    'blockers',(select coalesce(jsonb_agg(distinct value),'[]'::jsonb) from jsonb_array_elements(blockers)),
    'server_validated_at',now()
  );
end $$;;
