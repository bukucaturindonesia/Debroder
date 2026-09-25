-- DEBRODER v1.2 Phase 9 — Guard the existing Job Order lifecycle and synchronize production status.

do $$
begin
  if to_regprocedure('public.transition_job_order_status_phase8_core(uuid,text,text,text)') is null then
    alter function public.transition_job_order_status(uuid,text,text,text)
      rename to transition_job_order_status_phase8_core;
  end if;
end $$;

create or replace function public.transition_job_order_status(
  p_job_order_id uuid,
  p_to_status text,
  p_note text default null,
  p_reason text default null
)
returns public.job_orders
language plpgsql
security definer
set search_path=''
as $$
declare
  current_row public.job_orders;
  result_row public.job_orders;
  blocking_count integer:=0;
begin
  if not public.has_permission('job_order.status') then
    raise exception 'Tidak berwenang mengubah status Job Order';
  end if;

  select * into current_row
  from public.job_orders
  where id=p_job_order_id and archived_at is null
  for update;
  if not found then raise exception 'Job Order aktif tidak ditemukan'; end if;

  if p_to_status='completed' then
    raise exception 'Penyelesaian Job Order menunggu Quality Control Phase 10';
  end if;

  if p_to_status='cancelled' and current_row.status in ('released','in_progress','on_hold') then
    select count(*) into blocking_count
    from public.work_items
    where job_order_id=current_row.id
      and archived_at is null
      and status not in ('draft','ready','cancelled');
    if blocking_count>0 then
      raise exception 'Batalkan atau selesaikan status Work Item aktif terlebih dahulu';
    end if;
  end if;

  result_row:=public.transition_job_order_status_phase8_core(
    p_job_order_id,p_to_status,p_note,p_reason
  );

  if result_row.status='cancelled' then
    update public.orders
    set status=case when payment_production_eligible then 'sudah_dibayar' else 'menunggu_pembayaran' end,
        updated_by=auth.uid(),updated_at=now()
    where id=result_row.order_id
      and archived_at is null
      and status not in ('dibatalkan','selesai');
  else
    perform public.sync_order_production_status(result_row.id);
  end if;

  return result_row;
end $$;

revoke all on function public.transition_job_order_status_phase8_core(uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.transition_job_order_status(uuid,text,text,text) from public,anon;
grant execute on function public.transition_job_order_status(uuid,text,text,text) to authenticated;
