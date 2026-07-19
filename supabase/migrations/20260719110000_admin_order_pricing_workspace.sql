begin;

-- Stage 3 pricing workspace persistence. The canonical order-first Custom
-- quotation tables remain the single quotation lifecycle for public checkout.
alter table public.orders
  add column if not exists custom_pricing_draft jsonb,
  add column if not exists custom_pricing_draft_version integer not null default 0,
  add column if not exists custom_pricing_draft_updated_at timestamptz,
  add column if not exists custom_pricing_draft_updated_by uuid references auth.users(id) on delete set null;

alter table public.orders drop constraint if exists orders_custom_pricing_draft_version_check;
alter table public.orders add constraint orders_custom_pricing_draft_version_check
  check(custom_pricing_draft_version >= 0);
alter table public.orders drop constraint if exists orders_custom_pricing_draft_shape_check;
alter table public.orders add constraint orders_custom_pricing_draft_shape_check
  check(custom_pricing_draft is null or jsonb_typeof(custom_pricing_draft)='object');

alter table public.custom_order_quotation_versions
  add column if not exists finalization_key text;
create unique index if not exists custom_order_quotation_finalization_key_idx
  on public.custom_order_quotation_versions(order_id,finalization_key)
  where finalization_key is not null;

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
end $$;

create or replace function public.approve_custom_order_review_v1(
  p_order_id uuid,p_checklist jsonb,p_note text,p_expected_updated_at timestamptz
)
returns public.orders
language plpgsql
security definer
set search_path=''
as $$
declare result_row public.orders;
begin
  if not public.has_permission('order.edit') then raise exception 'Tidak berwenang menyetujui review'; end if;
  select * into result_row from public.orders where id=p_order_id and archived_at is null for update;
  if not found or result_row.custom_review_started_at is null then raise exception 'Mulai review terlebih dahulu'; end if;
  if result_row.status in ('cancelled','dibatalkan','completed','selesai') then raise exception 'Tahap order tidak dapat direview'; end if;
  if result_row.updated_at is distinct from p_expected_updated_at then raise exception 'Order telah diperbarui oleh admin lain'; end if;
  if jsonb_typeof(p_checklist)<>'object'
     or coalesce(p_checklist->'product','false'::jsonb)<>'true'::jsonb
     or coalesce(p_checklist->'service','false'::jsonb)<>'true'::jsonb then
    raise exception 'Dua konfirmasi operasional belum lengkap';
  end if;
  update public.orders set
    custom_review_completed_at=now(),custom_reviewed_by=auth.uid(),status='under_review',
    updated_by=auth.uid(),updated_at=now()
  where id=p_order_id returning * into result_row;
  insert into public.system_audit_log(entity_type,entity_id,action,actor_id,actor_role,source,reason,new_value)
  values('order',p_order_id,'custom_order_review_approved',auth.uid(),public.current_actor_role(),'admin_order_pricing_workspace',nullif(left(btrim(coalesce(p_note,'')),1000),''),p_checklist);
  return result_row;
end $$;

create or replace function public.save_custom_order_pricing_draft_v1(
  p_order_id uuid,
  p_editable_lines jsonb,
  p_confirmations jsonb,
  p_valid_days integer,
  p_customer_note text,
  p_internal_note text,
  p_expected_updated_at timestamptz,
  p_expected_draft_version integer
)
returns public.orders
language plpgsql
security definer
set search_path=''
as $$
declare order_row public.orders; result_row public.orders; next_draft jsonb;
begin
  if not public.has_permission('order.edit') then raise exception 'Tidak berwenang menyimpan draft harga'; end if;
  select * into order_row from public.orders where id=p_order_id and archived_at is null for update;
  if not found then raise exception 'Order aktif tidak ditemukan'; end if;
  if order_row.status in ('cancelled','dibatalkan','completed','selesai') then raise exception 'Tahap order tidak dapat menetapkan harga'; end if;
  if order_row.status<>'under_review' or order_row.custom_review_completed_at is null then raise exception 'Tahap server bukan Penetapan Harga'; end if;
  if order_row.custom_quote_status in ('sent','locked') then raise exception 'Penawaran aktif tidak boleh ditimpa oleh draft'; end if;
  if order_row.updated_at is distinct from p_expected_updated_at then raise exception 'Order telah diperbarui oleh admin lain'; end if;
  if order_row.custom_pricing_draft_version is distinct from coalesce(p_expected_draft_version,0) then raise exception 'Versi draft telah diperbarui oleh admin lain'; end if;

  next_draft:=public.build_custom_order_pricing_v1(p_order_id,p_editable_lines,p_confirmations,p_valid_days,p_customer_note,p_internal_note);
  update public.orders set
    custom_pricing_draft=next_draft,
    custom_pricing_draft_version=custom_pricing_draft_version+1,
    custom_pricing_draft_updated_at=now(),custom_pricing_draft_updated_by=auth.uid(),
    custom_quote_status='draft',updated_by=auth.uid(),updated_at=now()
  where id=p_order_id returning * into result_row;

  insert into public.system_audit_log(entity_type,entity_id,action,actor_id,actor_role,source,old_value,new_value)
  values(
    'order',p_order_id,case when order_row.custom_pricing_draft_version=0 then 'custom_pricing_draft_created' else 'custom_pricing_draft_saved' end,auth.uid(),public.current_actor_role(),'admin_order_pricing_workspace',
    jsonb_build_object('draft_version',order_row.custom_pricing_draft_version,'line_count',jsonb_array_length(coalesce(order_row.custom_pricing_draft->'editable_lines','[]'::jsonb)),'totals',order_row.custom_pricing_draft->'totals'),
    jsonb_build_object(
      'draft_version',result_row.custom_pricing_draft_version,
      'line_count',jsonb_array_length(next_draft->'editable_lines'),
      'totals',next_draft->'totals',
      'blocker_count',jsonb_array_length(next_draft->'blockers'),
      'line_added',jsonb_array_length(next_draft->'editable_lines')>jsonb_array_length(coalesce(order_row.custom_pricing_draft->'editable_lines','[]'::jsonb)),
      'line_removed',jsonb_array_length(next_draft->'editable_lines')<jsonb_array_length(coalesce(order_row.custom_pricing_draft->'editable_lines','[]'::jsonb)),
      'line_changed',coalesce(order_row.custom_pricing_draft->'editable_lines','[]'::jsonb) is distinct from next_draft->'editable_lines',
      'adjustment_reasons',(
        select coalesce(jsonb_agg(value->>'reason'),'[]'::jsonb)
        from jsonb_array_elements(next_draft->'editable_lines')
        where value->>'kind' in ('ADJUSTMENT','DISCOUNT') and coalesce(value->>'reason','')<>''
      )
    )
  );
  return result_row;
end $$;

create or replace function public.finalize_custom_order_pricing_v1(
  p_order_id uuid,
  p_expected_updated_at timestamptz,
  p_expected_draft_version integer,
  p_idempotency_key text
)
returns public.custom_order_quotation_versions
language plpgsql
security definer
set search_path=''
as $$
declare
  order_row public.orders;
  result_row public.custom_order_quotation_versions;
  validated_draft jsonb;
  customer_components jsonb;
  next_version integer;
  previous_total bigint;
  final_total bigint;
  shipping_total bigint;
  subtotal_total bigint;
  design_snapshot jsonb;
  normalized_key text:=nullif(left(btrim(coalesce(p_idempotency_key,'')),160),'');
begin
  if not public.has_permission('order.edit') then raise exception 'Tidak berwenang memfinalisasi harga'; end if;
  if normalized_key is null or length(normalized_key)<16 then raise exception 'Kunci idempotensi tidak valid'; end if;

  select * into result_row from public.custom_order_quotation_versions
  where order_id=p_order_id and finalization_key=normalized_key;
  if found then return result_row; end if;

  select * into order_row from public.orders where id=p_order_id and archived_at is null for update;
  if not found then raise exception 'Order aktif tidak ditemukan'; end if;
  select * into result_row from public.custom_order_quotation_versions
  where order_id=p_order_id and finalization_key=normalized_key;
  if found then return result_row; end if;

  if order_row.status<>'under_review' or order_row.custom_review_completed_at is null then raise exception 'Tahap server bukan Penetapan Harga'; end if;
  if order_row.custom_quote_status in ('sent','locked') then raise exception 'Penawaran aktif sudah dikirim atau dikunci'; end if;
  if order_row.whatsapp_confirmed_at is null then raise exception 'Pelanggan belum diverifikasi'; end if;
  if order_row.updated_at is distinct from p_expected_updated_at then raise exception 'Order telah diperbarui oleh admin lain'; end if;
  if order_row.custom_pricing_draft_version is distinct from p_expected_draft_version then raise exception 'Versi draft telah diperbarui oleh admin lain'; end if;
  if order_row.custom_pricing_draft is null then raise exception 'Draft harga belum disimpan'; end if;

  validated_draft:=public.build_custom_order_pricing_v1(
    p_order_id,
    order_row.custom_pricing_draft->'editable_lines',
    order_row.custom_pricing_draft->'confirmations',
    (order_row.custom_pricing_draft->>'valid_days')::integer,
    order_row.custom_pricing_draft->>'customer_note',
    order_row.custom_pricing_draft->>'internal_note'
  );
  if jsonb_array_length(validated_draft->'blockers')>0 then raise exception 'Pricing server validation failed'; end if;
  final_total:=(validated_draft#>>'{totals,final}')::bigint;
  shipping_total:=(validated_draft#>>'{totals,shipping}')::bigint;
  subtotal_total:=final_total-shipping_total;
  if final_total<=0 or subtotal_total<0 then raise exception 'Total final tidak valid'; end if;

  select coalesce(max(version_number),0)+1,max(quoted_total) filter(where status in ('locked','sent'))
  into next_version,previous_total
  from public.custom_order_quotation_versions where order_id=p_order_id;
  update public.custom_order_quotation_versions set status='superseded'
  where order_id=p_order_id and status='sent';
  select coalesce(jsonb_agg(jsonb_build_object('upload_id',id,'design_version',design_version,'design_stage',design_stage) order by design_version),'[]'::jsonb)
  into design_snapshot from public.customer_uploads where linked_order_id=p_order_id and status='linked';

  customer_components:=(validated_draft-'internal_note'-'blockers')||jsonb_build_object('finalized_at',now());
  insert into public.custom_order_quotation_versions(
    order_id,version_number,status,previous_total,quoted_total,pricing_components,
    review_checklist,design_version_snapshot,valid_until,sent_by,finalization_key
  ) values(
    p_order_id,next_version,'sent',previous_total,final_total,customer_components,
    validated_draft->'confirmations',design_snapshot,
    now()+make_interval(days=>(validated_draft->>'valid_days')::integer),auth.uid(),normalized_key
  ) returning * into result_row;

  update public.orders set
    custom_pricing_draft=validated_draft,
    pricing_status='final',subtotal_amount=subtotal_total,total_amount=final_total,
    shipping_cost=case when shipping_total>0 then shipping_total else null end,
    custom_quote_version=next_version,custom_quote_status='sent',custom_quote_locked_at=null,
    custom_quote_locked_total=null,final_total_approved_at=null,status='awaiting_customer_approval',
    payment_required_amount=0,payment_balance=0,updated_by=auth.uid(),updated_at=now()
  where id=p_order_id;

  insert into public.order_status_history(order_id,from_status,to_status,note,changed_by)
  values(p_order_id,order_row.status,'awaiting_customer_approval','Harga final dan penawaran Custom versi '||next_version||' disiapkan untuk pelanggan.',auth.uid());
  insert into public.system_audit_log(entity_type,entity_id,action,actor_id,actor_role,source,old_value,new_value)
  values(
    'order',p_order_id,'custom_quotation_finalized_and_sent',auth.uid(),public.current_actor_role(),'admin_order_pricing_workspace',
    jsonb_build_object('status',order_row.status,'pricing_status',order_row.pricing_status,'total',order_row.total_amount,'draft_version',order_row.custom_pricing_draft_version),
    jsonb_build_object('status','awaiting_customer_approval','pricing_status','final','total',final_total,'quotation_id',result_row.id,'quotation_version',next_version,'draft_version',order_row.custom_pricing_draft_version)
  );
  return result_row;
end $$;

-- Retire the old checkbox-only send path. Existing callers receive an explicit
-- operational error and cannot bypass server-calculated draft finalization.
create or replace function public.send_custom_order_quotation_v1(
  p_order_id uuid,p_checklist jsonb,p_valid_days integer,p_expected_updated_at timestamptz
)
returns public.custom_order_quotation_versions
language plpgsql
security definer
set search_path=''
as $$
begin
  raise exception 'Gunakan workspace Penetapan Harga dan finalisasi draft server';
end $$;

revoke all on function public.build_custom_order_pricing_v1(uuid,jsonb,jsonb,integer,text,text) from public,anon,authenticated;
revoke all on function public.approve_custom_order_review_v1(uuid,jsonb,text,timestamptz) from public,anon,authenticated;
revoke all on function public.save_custom_order_pricing_draft_v1(uuid,jsonb,jsonb,integer,text,text,timestamptz,integer) from public,anon;
revoke all on function public.finalize_custom_order_pricing_v1(uuid,timestamptz,integer,text) from public,anon;
revoke all on function public.send_custom_order_quotation_v1(uuid,jsonb,integer,timestamptz) from public,anon,authenticated;
grant execute on function public.approve_custom_order_review_v1(uuid,jsonb,text,timestamptz) to authenticated,service_role;
grant execute on function public.save_custom_order_pricing_draft_v1(uuid,jsonb,jsonb,integer,text,text,timestamptz,integer) to authenticated,service_role;
grant execute on function public.finalize_custom_order_pricing_v1(uuid,timestamptz,integer,text) to authenticated,service_role;
grant execute on function public.send_custom_order_quotation_v1(uuid,jsonb,integer,timestamptz) to authenticated,service_role;

commit;

-- OWNER PREVIEW VERIFICATION (read-only after applying locally/Preview):
-- select id,custom_pricing_draft_version,custom_quote_version,custom_quote_status,status,pricing_status,total_amount
-- from public.orders where id='<controlled-custom-order-id>'::uuid;
-- select order_id,version_number,status,quoted_total,finalization_key,pricing_components
-- from public.custom_order_quotation_versions where order_id='<controlled-custom-order-id>'::uuid order by version_number;
-- select action,actor_id,old_value,new_value,created_at from public.system_audit_log
-- where entity_type='order' and entity_id='<controlled-custom-order-id>'::uuid order by created_at desc;

-- ROLLBACK (owner-run only before production use): restore the previous
-- approve/send RPC definitions from 20260718180000, drop the two new RPCs and
-- build helper, then drop finalization_key/index and the four draft columns.
-- Once draft/version rows exist, preserve them and use a forward correction;
-- never delete orders, quote versions, approvals, payments, PIM, or Jersey data.
