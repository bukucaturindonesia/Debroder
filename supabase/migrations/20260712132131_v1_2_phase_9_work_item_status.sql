-- DEBRODER v1.2 Phase 9 — Work Item execution and QC handoff.

do $$
begin
  if to_regprocedure('public.transition_work_item_status_phase8_core(uuid,text,text,text)') is null then
    alter function public.transition_work_item_status(uuid,text,text,text)
      rename to transition_work_item_status_phase8_core;
  end if;
end $$;

create or replace function public.transition_work_item_status(
  p_work_item_id uuid,
  p_to_status text,
  p_note text default null,
  p_reason text default null
)
returns public.work_items
language plpgsql
security definer
set search_path=''
as $$
declare
  item_row public.work_items;
  job_row public.job_orders;
  result_row public.work_items;
  old_status text;
  reason_value text:=nullif(btrim(coalesce(p_reason,'')),'');
  blocker_count integer:=0;
begin
  if not public.has_permission('work_item.status') then
    raise exception 'Tidak berwenang mengubah status Work Item';
  end if;

  select * into item_row
  from public.work_items
  where id=p_work_item_id and archived_at is null
  for update;
  if not found then raise exception 'Work Item aktif tidak ditemukan'; end if;

  if (item_row.status='draft' and p_to_status in ('ready','cancelled'))
     or (item_row.status='ready' and p_to_status in ('draft','cancelled')) then
    return public.transition_work_item_status_phase8_core(
      p_work_item_id,p_to_status,p_note,p_reason
    );
  end if;

  select * into job_row
  from public.job_orders
  where id=item_row.job_order_id and archived_at is null
  for update;
  if not found then raise exception 'Job Order induk tidak ditemukan'; end if;

  old_status:=item_row.status;
  if not (
    (old_status='ready' and p_to_status in ('in_progress','cancelled')) or
    (old_status='in_progress' and p_to_status in ('on_hold','awaiting_qc','cancelled')) or
    (old_status='on_hold' and p_to_status in ('in_progress','cancelled')) or
    (old_status='rework' and p_to_status in ('in_progress','awaiting_qc','cancelled'))
  ) then
    raise exception 'Perubahan status Work Item tidak diizinkan pada Phase 9';
  end if;

  if p_to_status in ('on_hold','cancelled','rework') and reason_value is null then
    raise exception 'Alasan wajib diisi';
  end if;
  if job_row.status not in ('released','in_progress','on_hold') then
    raise exception 'Job Order belum dirilis ke produksi';
  end if;
  if job_row.status='on_hold' and p_to_status in ('in_progress','awaiting_qc') then
    raise exception 'Lanjutkan Job Order terlebih dahulu';
  end if;

  if p_to_status='in_progress' then
    select count(*) into blocker_count
    from public.work_item_dependencies dependency
    join public.work_items required_item on required_item.id=dependency.depends_on_work_item_id
    where dependency.work_item_id=item_row.id
      and required_item.archived_at is null
      and required_item.status not in ('awaiting_qc','completed');
    if blocker_count>0 then
      raise exception 'Dependensi Work Item belum menyelesaikan tahap produksi';
    end if;
  end if;

  update public.work_items set
    status=p_to_status,updated_by=auth.uid(),updated_at=now(),
    started_at=case when p_to_status='in_progress' and started_at is null then now() else started_at end,
    paused_at=case when p_to_status='on_hold' then now() else paused_at end,
    resumed_at=case when old_status='on_hold' and p_to_status='in_progress' then now() else resumed_at end,
    cancelled_at=case when p_to_status='cancelled' then now() else cancelled_at end,
    cancel_reason=case when p_to_status='cancelled' then reason_value else cancel_reason end
  where id=item_row.id
  returning * into result_row;

  if p_to_status='in_progress' and job_row.status='released' then
    update public.job_orders
    set status='in_progress',started_at=coalesce(started_at,now()),updated_by=auth.uid(),updated_at=now()
    where id=job_row.id;
    insert into public.job_order_status_history(job_order_id,from_status,to_status,note,changed_by,metadata)
    values(job_row.id,'released','in_progress','Produksi dimulai saat Work Item pertama dikerjakan',auth.uid(),jsonb_build_object('work_item_id',result_row.id,'phase','9'));
  end if;

  insert into public.work_item_status_history(work_item_id,from_status,to_status,note,reason,changed_by,metadata)
  values(result_row.id,old_status,p_to_status,nullif(btrim(coalesce(p_note,'')),''),reason_value,auth.uid(),jsonb_build_object('job_order_id',result_row.job_order_id,'phase','9'));

  perform public.refresh_job_order_progress(result_row.job_order_id);
  perform public.sync_order_production_status(result_row.job_order_id);
  return result_row;
end $$;

revoke all on function public.transition_work_item_status_phase8_core(uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.transition_work_item_status(uuid,text,text,text) from public,anon;
grant execute on function public.transition_work_item_status(uuid,text,text,text) to authenticated;
