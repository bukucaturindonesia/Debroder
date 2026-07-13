-- DEBRODER v1.2 Phase 11 — method-aware lifecycle and order status synchronization.

create or replace function public.refresh_order_fulfillment_status(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path=''
as $$
declare
  order_row public.orders;
  remaining_quantity bigint:=0;
  open_count integer:=0;
  completed_count integer:=0;
  preferred_method text;
  next_status text;
begin
  select * into order_row from public.orders where id=p_order_id for update;
  if not found then raise exception 'Pesanan tidak ditemukan'; end if;

  select coalesce(sum(greatest(source.passed_quantity-coalesce(delivery.delivered_quantity,0),0)),0)::bigint
  into remaining_quantity
  from (
    select wi.id,
      coalesce((
        select q.passed_quantity
        from public.qc_records q
        where q.work_item_id=wi.id and q.result='passed' and q.archived_at is null
        order by q.attempt_number desc limit 1
      ),0)::bigint passed_quantity
    from public.work_items wi
    join public.job_orders jo on jo.id=wi.job_order_id
    where jo.order_id=p_order_id and jo.archived_at is null
      and wi.archived_at is null and wi.status='completed'
  ) source
  left join lateral (
    select coalesce(sum(fi.quantity),0)::bigint delivered_quantity
    from public.fulfillment_items fi
    join public.fulfillments f on f.id=fi.fulfillment_id
    where fi.work_item_id=source.id and f.status in ('delivered','picked_up')
  ) delivery on true;

  select count(*) into open_count
  from public.fulfillments
  where order_id=p_order_id and archived_at is null
    and status not in ('delivered','picked_up','cancelled');

  select count(*) into completed_count
  from public.fulfillments
  where order_id=p_order_id and status in ('delivered','picked_up');

  select method into preferred_method
  from public.fulfillments
  where order_id=p_order_id and archived_at is null and status<>'cancelled'
  order by created_at desc limit 1;
  preferred_method:=coalesce(preferred_method,order_row.delivery_method,'shipping');

  next_status:=case
    when remaining_quantity=0 and open_count=0 and completed_count>0 then 'selesai'
    when preferred_method='pickup' then 'siap_diambil'
    else 'siap_dikirim'
  end;

  update public.orders set
    status=case when status='dibatalkan' then status else next_status end,
    updated_by=coalesce(auth.uid(),updated_by),updated_at=now()
  where id=p_order_id
  returning * into order_row;
  return order_row;
end $$;

create or replace function public.transition_fulfillment_status(
  p_fulfillment_id uuid,
  p_to_status text,
  p_note text default null,
  p_reason text default null
)
returns public.fulfillments
language plpgsql
security definer
set search_path=''
as $$
declare
  result_row public.fulfillments;
  old_status text;
  allowed boolean:=false;
  reason_value text:=nullif(btrim(coalesce(p_reason,'')),'');
begin
  if not public.has_permission(case when p_to_status in ('delivered','picked_up') then 'shipping.complete' else 'shipping.update' end) then
    raise exception 'Tidak berwenang mengubah status penyerahan';
  end if;

  select * into result_row from public.fulfillments
  where id=p_fulfillment_id and archived_at is null
  for update;
  if not found then raise exception 'Dokumen penyerahan aktif tidak ditemukan'; end if;
  old_status:=result_row.status;

  allowed:=case old_status
    when 'preparing' then p_to_status in ('packing','problem','cancelled')
    when 'packing' then p_to_status in (
      case when result_row.method='pickup' then 'ready_for_pickup' else 'ready_to_ship' end,
      'problem','cancelled'
    )
    when 'ready_to_ship' then p_to_status in ('shipped','problem','cancelled')
    when 'shipped' then p_to_status in ('in_transit','delivered','problem')
    when 'in_transit' then p_to_status in ('delivered','problem')
    when 'ready_for_pickup' then p_to_status in ('picked_up','problem','cancelled')
    when 'problem' then p_to_status in ('preparing','packing',case when result_row.method='pickup' then 'ready_for_pickup' else 'ready_to_ship' end,'cancelled')
    else false
  end;
  if not allowed then raise exception 'Perubahan status penyerahan tidak diizinkan'; end if;
  if p_to_status in ('problem','cancelled') and reason_value is null then raise exception 'Alasan wajib diisi'; end if;
  if p_to_status='shipped' and (coalesce(result_row.courier,'')='' or coalesce(result_row.tracking_number,'')='') then
    raise exception 'Kurir dan nomor resi wajib diisi sebelum dikirim';
  end if;
  if p_to_status in ('delivered','picked_up') then
    if coalesce(result_row.receiver_name,'')='' or coalesce(result_row.receiver_phone,'')='' then
      raise exception 'Identitas penerima wajib diisi';
    end if;
    if not exists(
      select 1 from public.fulfillment_files
      where fulfillment_id=result_row.id and file_type in ('handover','signature','photo')
    ) then raise exception 'Bukti serah terima wajib diunggah'; end if;
  end if;

  update public.fulfillments set
    status=p_to_status,updated_by=auth.uid(),updated_at=now(),
    packing_at=case when p_to_status='packing' then now() else packing_at end,
    ready_at=case when p_to_status in ('ready_to_ship','ready_for_pickup') then now() else ready_at end,
    shipped_at=case when p_to_status='shipped' then now() else shipped_at end,
    delivered_at=case when p_to_status='delivered' then now() else delivered_at end,
    picked_up_at=case when p_to_status='picked_up' then now() else picked_up_at end,
    problem_at=case when p_to_status='problem' then now() else problem_at end,
    cancelled_at=case when p_to_status='cancelled' then now() else cancelled_at end,
    cancel_reason=case when p_to_status='cancelled' then reason_value else cancel_reason end
  where id=result_row.id
  returning * into result_row;

  insert into public.fulfillment_status_history(
    fulfillment_id,from_status,to_status,note,reason,changed_by,metadata
  ) values(
    result_row.id,old_status,p_to_status,nullif(btrim(coalesce(p_note,'')),''),reason_value,auth.uid(),
    jsonb_build_object('order_id',result_row.order_id,'method',result_row.method,'phase','11')
  );
  perform public.refresh_order_fulfillment_status(result_row.order_id);
  return result_row;
end $$;
