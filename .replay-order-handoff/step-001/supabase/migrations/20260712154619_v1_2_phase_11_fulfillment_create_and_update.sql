-- DEBRODER v1.2 Phase 11 — atomic creation and editable pre-handover details.

create or replace function public.create_fulfillment(
  p_order_id uuid,
  p_method text,
  p_receiver_name text,
  p_receiver_phone text,
  p_destination text,
  p_courier text,
  p_package_count integer,
  p_scheduled_at timestamptz,
  p_notes text,
  p_items jsonb,
  p_idempotency_key text default null
)
returns public.fulfillments
language plpgsql
security definer
set search_path=''
as $$
declare
  order_row public.orders;
  job_row public.job_orders;
  result_row public.fulfillments;
  work_row public.work_items;
  item jsonb;
  result_id uuid:=gen_random_uuid();
  number_value text;
  quantity_value integer;
  passed_limit integer;
  allocated_quantity integer;
  normalized_key text:=nullif(btrim(coalesce(p_idempotency_key,'')),'');
begin
  if not public.has_permission('shipping.create') then raise exception 'Tidak berwenang membuat pengiriman atau pickup'; end if;
  if p_method not in ('shipping','pickup') then raise exception 'Metode penyerahan tidak valid'; end if;
  if coalesce(p_package_count,0)<=0 then raise exception 'Jumlah paket harus lebih dari nol'; end if;
  if btrim(coalesce(p_receiver_name,''))='' then raise exception 'Nama penerima wajib diisi'; end if;
  if btrim(coalesce(p_receiver_phone,''))='' then raise exception 'Nomor penerima wajib diisi'; end if;
  if p_method='shipping' and btrim(coalesce(p_destination,''))='' then raise exception 'Alamat tujuan wajib diisi untuk pengiriman'; end if;

  if normalized_key is not null then
    select * into result_row from public.fulfillments where idempotency_key=normalized_key;
    if found then return result_row; end if;
  end if;

  select * into order_row
  from public.orders
  where id=p_order_id and archived_at is null and status not in ('dibatalkan','selesai')
  for update;
  if not found then raise exception 'Pesanan aktif tidak ditemukan'; end if;

  select * into job_row
  from public.job_orders
  where order_id=order_row.id and archived_at is null and status in ('in_progress','completed')
  order by created_at desc
  limit 1
  for update;
  if not found then raise exception 'Job Order yang sudah menjalani produksi wajib tersedia'; end if;

  if exists(
    select 1 from public.work_items
    where job_order_id=job_row.id and archived_at is null and status not in ('completed','cancelled')
  ) then raise exception 'Semua Work Item aktif harus menyelesaikan Quality Control'; end if;

  if jsonb_typeof(coalesce(p_items,'[]'::jsonb))<>'array'
     or jsonb_array_length(coalesce(p_items,'[]'::jsonb))=0 then
    raise exception 'Minimal satu item penyerahan wajib dipilih';
  end if;

  number_value:=public.issue_document_number(
    case when p_method='pickup' then 'pickup_handover' else 'delivery' end,
    'fulfillment',result_id,
    'fulfillment-number:'||result_id::text,
    jsonb_build_object('order_id',order_row.id,'method',p_method)
  );

  insert into public.fulfillments(
    id,fulfillment_number,order_id,job_order_id,method,status,
    receiver_name,receiver_phone,destination,courier,package_count,scheduled_at,notes,
    idempotency_key,created_by,updated_by
  ) values(
    result_id,number_value,order_row.id,job_row.id,p_method,'preparing',
    btrim(p_receiver_name),btrim(p_receiver_phone),nullif(btrim(coalesce(p_destination,'')),''),
    nullif(btrim(coalesce(p_courier,'')),''),p_package_count,p_scheduled_at,
    nullif(btrim(coalesce(p_notes,'')),''),coalesce(normalized_key,'fulfillment:'||result_id::text),auth.uid(),auth.uid()
  ) returning * into result_row;

  for item in select * from jsonb_array_elements(p_items) loop
    if coalesce(item->>'work_item_id','')='' then raise exception 'Work Item penyerahan tidak valid'; end if;
    quantity_value:=coalesce((item->>'quantity')::integer,0);
    if quantity_value<=0 then raise exception 'Jumlah penyerahan harus lebih dari nol'; end if;

    select * into work_row
    from public.work_items
    where id=(item->>'work_item_id')::uuid
      and job_order_id=job_row.id
      and archived_at is null
      and status='completed'
    for update;
    if not found then raise exception 'Work Item yang lulus QC tidak ditemukan'; end if;

    select q.passed_quantity into passed_limit
    from public.qc_records q
    where q.work_item_id=work_row.id and q.result='passed' and q.archived_at is null
    order by q.attempt_number desc
    limit 1;
    if coalesce(passed_limit,0)<=0 then raise exception 'Quality Control lulus wajib tersedia'; end if;

    select coalesce(sum(fi.quantity),0)::integer into allocated_quantity
    from public.fulfillment_items fi
    join public.fulfillments existing_row on existing_row.id=fi.fulfillment_id
    where fi.work_item_id=work_row.id
      and existing_row.status<>'cancelled'
      and (existing_row.archived_at is null or existing_row.status in ('delivered','picked_up'));

    if allocated_quantity+quantity_value>passed_limit then
      raise exception 'Jumlah penyerahan melebihi jumlah yang lulus Quality Control';
    end if;

    insert into public.fulfillment_items(fulfillment_id,work_item_id,order_item_id,quantity)
    values(result_row.id,work_row.id,work_row.source_order_item_id,quantity_value);
  end loop;

  insert into public.fulfillment_status_history(
    fulfillment_id,from_status,to_status,note,changed_by,metadata
  ) values(
    result_row.id,null,'preparing','Dokumen penyerahan dibuat',auth.uid(),
    jsonb_build_object('order_id',order_row.id,'method',p_method,'phase','11')
  );
  perform public.refresh_order_fulfillment_status(order_row.id);
  return result_row;
end $$;

create or replace function public.update_fulfillment_details(
  p_fulfillment_id uuid,
  p_receiver_name text,
  p_receiver_phone text,
  p_destination text,
  p_courier text,
  p_tracking_number text,
  p_package_count integer,
  p_scheduled_at timestamptz,
  p_notes text,
  p_reason text default null
)
returns public.fulfillments
language plpgsql
security definer
set search_path=''
as $$
declare
  old_row public.fulfillments;
  result_row public.fulfillments;
  revision_value integer;
  reason_value text:=nullif(btrim(coalesce(p_reason,'')),'');
begin
  if not public.has_permission('shipping.update') then raise exception 'Tidak berwenang mengubah penyerahan'; end if;
  if coalesce(p_package_count,0)<=0 then raise exception 'Jumlah paket harus lebih dari nol'; end if;
  if btrim(coalesce(p_receiver_name,''))='' or btrim(coalesce(p_receiver_phone,''))='' then
    raise exception 'Nama dan nomor penerima wajib diisi';
  end if;

  select * into old_row from public.fulfillments
  where id=p_fulfillment_id and archived_at is null
    and status in ('preparing','packing','ready_to_ship','ready_for_pickup','problem')
  for update;
  if not found then raise exception 'Dokumen penyerahan tidak dapat diedit pada status ini'; end if;
  if old_row.method='shipping' and btrim(coalesce(p_destination,''))='' then raise exception 'Alamat tujuan wajib diisi'; end if;
  if old_row.status<>'preparing' and reason_value is null then raise exception 'Alasan perubahan wajib diisi'; end if;

  update public.fulfillments set
    receiver_name=btrim(p_receiver_name),
    receiver_phone=btrim(p_receiver_phone),
    destination=nullif(btrim(coalesce(p_destination,'')),''),
    courier=nullif(btrim(coalesce(p_courier,'')),''),
    tracking_number=nullif(btrim(coalesce(p_tracking_number,'')),''),
    package_count=p_package_count,
    scheduled_at=p_scheduled_at,
    notes=nullif(btrim(coalesce(p_notes,'')),''),
    updated_by=auth.uid(),updated_at=now()
  where id=old_row.id
  returning * into result_row;

  select coalesce(max(revision_number),0)+1 into revision_value
  from public.fulfillment_revisions where fulfillment_id=old_row.id;
  insert into public.fulfillment_revisions(
    fulfillment_id,revision_number,reason,previous_snapshot,new_snapshot,created_by
  ) values(
    old_row.id,revision_value,coalesce(reason_value,'Pembaruan draft penyerahan'),
    to_jsonb(old_row),to_jsonb(result_row),auth.uid()
  );
  return result_row;
end $$;
