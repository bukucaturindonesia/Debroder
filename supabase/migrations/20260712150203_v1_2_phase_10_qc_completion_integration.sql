-- DEBRODER v1.2 Phase 10 — QC final decision and production completion integration.

create or replace function public.refresh_job_order_qc_completion(p_job_order_id uuid)
returns public.job_orders
language plpgsql
security definer
set search_path=''
as $$
declare
  job_row public.job_orders;
  result_row public.job_orders;
  active_count integer:=0;
  incomplete_count integer:=0;
  missing_passed_qc integer:=0;
begin
  select * into job_row from public.job_orders where id=p_job_order_id for update;
  if not found then return null; end if;

  select
    count(*) filter(where status<>'cancelled'),
    count(*) filter(where status not in ('completed','cancelled'))
  into active_count,incomplete_count
  from public.work_items
  where job_order_id=job_row.id and archived_at is null;

  select count(*) into missing_passed_qc
  from public.work_items item_row
  where item_row.job_order_id=job_row.id
    and item_row.archived_at is null
    and item_row.status='completed'
    and not exists(
      select 1 from public.qc_records qc_row
      where qc_row.work_item_id=item_row.id and qc_row.result='passed'
        and qc_row.status='finalized' and qc_row.archived_at is null
    );

  if active_count>0 and incomplete_count=0 and missing_passed_qc=0
     and job_row.status in ('released','in_progress','on_hold') then
    update public.job_orders set
      status='completed',progress_percentage=100,completed_at=coalesce(completed_at,now()),
      updated_by=coalesce(auth.uid(),updated_by),updated_at=now()
    where id=job_row.id returning * into result_row;
    insert into public.job_order_status_history(job_order_id,from_status,to_status,note,changed_by,metadata)
    values(job_row.id,job_row.status,'completed','Seluruh Work Item lulus Quality Control',auth.uid(),jsonb_build_object('phase','10'));
    update public.orders set status='quality_check',updated_by=coalesce(auth.uid(),updated_by),updated_at=now()
    where id=job_row.order_id and archived_at is null and status not in ('dibatalkan','selesai');
    return result_row;
  end if;
  return job_row;
end $$;

create or replace function public.finalize_qc_record(
  p_qc_record_id uuid,
  p_passed_quantity integer,
  p_failed_quantity integer,
  p_result text,
  p_note text default null
)
returns public.qc_records
language plpgsql
security definer
set search_path=''
as $$
declare
  result_row public.qc_records;
  item_row public.work_items;
  old_result text;
  note_value text:=nullif(btrim(coalesce(p_note,'')),'');
  pending_check_count integer:=0;
  failed_check_count integer:=0;
  proof_count integer:=0;
  next_item_status text;
begin
  if not public.has_permission('qc.approve') then raise exception 'Tidak berwenang mengesahkan hasil QC'; end if;
  select * into result_row from public.qc_records
  where id=p_qc_record_id and archived_at is null
  for update;
  if not found or result_row.result<>'pending' or result_row.status<>'in_review' then
    raise exception 'Pemeriksaan QC belum siap difinalisasi';
  end if;
  if p_result not in ('passed','partial','failed','rework') then raise exception 'Hasil akhir QC tidak valid'; end if;

  select * into item_row from public.work_items
  where id=result_row.work_item_id and archived_at is null
  for update;
  if not found or item_row.status<>'awaiting_qc' then
    raise exception 'Work Item tidak lagi berada pada antrean QC';
  end if;
  if p_passed_quantity<0 or p_failed_quantity<0
     or p_passed_quantity+p_failed_quantity<>result_row.checked_quantity then
    raise exception 'Jumlah lulus dan gagal harus sama dengan jumlah yang diperiksa';
  end if;

  select count(*) filter(where result='pending'),count(*) filter(where result='fail')
  into pending_check_count,failed_check_count
  from public.qc_checklist_results where qc_record_id=result_row.id;
  if not exists(select 1 from public.qc_checklist_results where qc_record_id=result_row.id) then
    raise exception 'Checklist QC belum tersedia';
  end if;
  if pending_check_count>0 then raise exception 'Seluruh checklist QC harus diselesaikan'; end if;

  select count(*) into proof_count from public.qc_files where qc_record_id=result_row.id;
  if proof_count=0 then raise exception 'Minimal satu bukti foto atau dokumen QC wajib diunggah'; end if;

  if p_result='passed' then
    if result_row.checked_quantity<>item_row.quantity or p_failed_quantity<>0 or p_passed_quantity<>result_row.checked_quantity or failed_check_count>0 then
      raise exception 'QC Lulus membutuhkan seluruh jumlah dan checklist dalam kondisi lulus';
    end if;
    next_item_status:='completed';
  else
    if p_failed_quantity=0 then raise exception 'Jumlah gagal wajib diisi untuk hasil yang memerlukan perbaikan'; end if;
    if note_value is null then raise exception 'Catatan cacat atau alasan perbaikan wajib diisi'; end if;
    next_item_status:='rework';
  end if;

  old_result:=result_row.result;
  update public.qc_records set
    passed_quantity=p_passed_quantity,failed_quantity=p_failed_quantity,result=p_result,status='finalized',
    defect_notes=coalesce(note_value,defect_notes),inspected_at=now(),approved_by=auth.uid(),approved_at=now(),
    updated_by=auth.uid(),updated_at=now()
  where id=result_row.id returning * into result_row;

  insert into public.qc_status_history(qc_record_id,from_result,to_result,note,changed_by)
  values(result_row.id,old_result,p_result,note_value,auth.uid());

  select * into item_row from public.work_items
  where id=result_row.work_item_id and archived_at is null
  for update;
  if not found or item_row.status<>'awaiting_qc' then
    raise exception 'Work Item tidak lagi berada pada antrean QC';
  end if;

  update public.work_items set
    status=next_item_status,
    completed_at=case when next_item_status='completed' then now() else null end,
    updated_by=auth.uid(),updated_at=now()
  where id=item_row.id;

  insert into public.work_item_status_history(work_item_id,from_status,to_status,note,reason,changed_by,metadata)
  values(
    item_row.id,'awaiting_qc',next_item_status,
    case when next_item_status='completed' then 'Quality Control lulus' else 'Quality Control memerlukan perbaikan' end,
    case when next_item_status='rework' then note_value else null end,
    auth.uid(),jsonb_build_object('qc_record_id',result_row.id,'qc_number',result_row.qc_number,'phase','10')
  );

  perform public.refresh_job_order_progress(item_row.job_order_id);
  perform public.sync_order_production_status(item_row.job_order_id);
  perform public.refresh_job_order_qc_completion(item_row.job_order_id);
  return result_row;
end $$;

revoke all on function public.refresh_job_order_qc_completion(uuid) from public,anon,authenticated;
grant execute on function public.refresh_job_order_qc_completion(uuid) to service_role;
revoke all on function public.finalize_qc_record(uuid,integer,integer,text,text) from public,anon;
grant execute on function public.finalize_qc_record(uuid,integer,integer,text,text) to authenticated;
