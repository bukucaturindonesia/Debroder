-- Phase 7 correction: allocate the immutable Job Order number before inserting the NOT NULL row.

create or replace function public.create_job_order(
  p_order_id uuid,
  p_target_date date default null,
  p_priority text default 'normal',
  p_internal_notes text default null,
  p_production_notes text default null,
  p_idempotency_key text default null
)
returns public.job_orders
language plpgsql
security definer
set search_path=''
as $$
declare
  order_row public.orders;
  mockup_row public.mockup_sets;
  result_row public.job_orders;
  result_id uuid:=gen_random_uuid();
  number_value text;
  order_snapshot_value jsonb;
  mockup_snapshot_value jsonb;
  normalized_key text:=nullif(btrim(coalesce(p_idempotency_key,'')),'');
begin
  if not public.has_staff_role(array['owner','superadmin','super_admin','admin']) then
    raise exception 'Tidak berwenang membuat Job Order';
  end if;
  if p_priority not in ('low','normal','high','urgent') then raise exception 'Prioritas Job Order tidak valid'; end if;
  if p_target_date is not null and p_target_date < current_date then raise exception 'Target produksi tidak boleh berada di masa lalu'; end if;

  if normalized_key is not null then
    select * into result_row from public.job_orders where idempotency_key=normalized_key;
    if found then return result_row; end if;
  end if;

  select * into order_row from public.orders
  where id=p_order_id and archived_at is null for update;
  if not found then raise exception 'Pesanan aktif tidak ditemukan'; end if;
  if order_row.status in ('dibatalkan','selesai') then raise exception 'Pesanan dengan status ini tidak dapat dibuatkan Job Order'; end if;
  if not coalesce(order_row.payment_production_eligible,false) then raise exception 'Syarat pembayaran produksi belum terpenuhi'; end if;
  if order_row.approved_mockup_set_id is null then raise exception 'Mockup yang disetujui wajib tersedia'; end if;

  select * into mockup_row from public.mockup_sets
  where id=order_row.approved_mockup_set_id
    and quotation_id=order_row.quotation_id
    and status='approved'
    and archived_at is null;
  if not found then raise exception 'Mockup yang disetujui tidak valid atau sudah diarsipkan'; end if;

  select * into result_row from public.job_orders
  where order_id=order_row.id and archived_at is null and status<>'cancelled'
  for update;
  if found then return result_row; end if;

  select jsonb_build_object(
    'order',to_jsonb(order_row),
    'items',coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'item',to_jsonb(item_row),
          'services',coalesce((
            select jsonb_agg(to_jsonb(service_row) order by service_row.created_at)
            from public.order_item_services service_row
            where service_row.order_item_id=item_row.id
          ),'[]'::jsonb)
        ) order by item_row.created_at
      )
      from public.order_items item_row
      where item_row.order_id=order_row.id and item_row.archived_at is null
    ),'[]'::jsonb)
  ) into order_snapshot_value;

  select jsonb_build_object(
    'mockup_set',to_jsonb(mockup_row),
    'parts',coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'part',to_jsonb(part_row),
          'files',coalesce((
            select jsonb_agg(to_jsonb(file_row) order by file_row.version_number)
            from public.mockup_files file_row
            where file_row.mockup_part_id=part_row.id
          ),'[]'::jsonb)
        ) order by part_row.sort_order,part_row.created_at
      )
      from public.mockup_parts part_row
      where part_row.mockup_set_id=mockup_row.id and part_row.archived_at is null
    ),'[]'::jsonb)
  ) into mockup_snapshot_value;

  if jsonb_array_length(coalesce(order_snapshot_value->'items','[]'::jsonb))=0 then
    raise exception 'Pesanan belum memiliki item produksi';
  end if;

  number_value:=public.issue_document_number(
    'job_order','job_orders',result_id,
    'job-order-number:'||order_row.id::text,
    jsonb_build_object('order_id',order_row.id,'order_number',order_row.order_number)
  );

  insert into public.job_orders(
    id,job_order_number,order_id,quotation_id,approved_mockup_set_id,status,priority,target_date,
    internal_notes,production_notes,order_snapshot,mockup_snapshot,payment_snapshot,
    idempotency_key,created_by,updated_by
  ) values(
    result_id,number_value,order_row.id,order_row.quotation_id,order_row.approved_mockup_set_id,'draft',p_priority,p_target_date,
    nullif(btrim(coalesce(p_internal_notes,'')),''),
    nullif(btrim(coalesce(p_production_notes,'')),''),
    order_snapshot_value,mockup_snapshot_value,
    jsonb_build_object(
      'effective_total',order_row.payment_effective_total,
      'required_amount',order_row.payment_required_amount,
      'balance',order_row.payment_balance,
      'requirement_type',order_row.payment_requirement_type,
      'requirement_met',order_row.payment_requirement_met,
      'production_eligible',order_row.payment_production_eligible,
      'captured_at',now()
    ),
    coalesce(normalized_key,'job-order:'||order_row.id::text),auth.uid(),auth.uid()
  ) returning * into result_row;

  insert into public.job_order_status_history(
    job_order_id,from_status,to_status,note,changed_by,metadata
  ) values(
    result_row.id,null,'draft','Job Order dibuat dari pesanan '||order_row.order_number,auth.uid(),
    jsonb_build_object('order_id',order_row.id,'mockup_set_id',mockup_row.id)
  );
  return result_row;
end $$;

revoke all on function public.create_job_order(uuid,date,text,text,text,text) from public,anon;
grant execute on function public.create_job_order(uuid,date,text,text,text,text) to authenticated;
