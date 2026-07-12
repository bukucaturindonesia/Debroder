-- DEBRODER v1.2 Phase 9 — Production status, progress, hold/resume, and QC handoff.
-- This phase stops at awaiting_qc. QC approval and completion remain Phase 10 responsibilities.

insert into public.permission_definitions(permission_key,module,label,description)
values
  ('job_order.status','production','Ubah Status Job Order','Mengendalikan rilis, mulai, tahan, lanjutkan, dan pembatalan Job Order.'),
  ('production.view','production','Lihat Dashboard Produksi','Melihat status Job Order dan Work Item produksi aktif.')
on conflict(permission_key) do update set
  module=excluded.module,
  label=excluded.label,
  description=excluded.description;

insert into public.role_permissions(role,permission_key,granted)
select role_name,permission_key,true
from unnest(array['owner','superadmin','super_admin','admin']) role_name
cross join unnest(array['job_order.status','production.view']) permission_key
on conflict(role,permission_key) do update set granted=true,updated_at=now();

create index if not exists job_orders_production_board_idx
  on public.job_orders(status,target_date,updated_at desc)
  where archived_at is null;

create index if not exists work_items_production_board_idx
  on public.work_items(status,target_date,assigned_to,updated_at desc)
  where archived_at is null;

create or replace function public.refresh_job_order_progress(p_job_order_id uuid)
returns public.job_orders
language plpgsql
security definer
set search_path=''
as $$
declare
  total_quantity numeric:=0;
  weighted_total numeric:=0;
  progress_value numeric:=0;
  result_row public.job_orders;
begin
  select
    coalesce(sum(greatest(quantity,1)),0),
    coalesce(sum(
      greatest(quantity,1) *
      case status
        when 'draft' then 0
        when 'ready' then 10
        when 'in_progress' then 50
        when 'on_hold' then 50
        when 'rework' then 60
        when 'awaiting_qc' then 90
        when 'completed' then 100
        else 0
      end
    ),0)
  into total_quantity,weighted_total
  from public.work_items
  where job_order_id=p_job_order_id
    and archived_at is null
    and status<>'cancelled';

  progress_value:=case
    when total_quantity=0 then 0
    else round(weighted_total/total_quantity,2)
  end;

  update public.job_orders
  set progress_percentage=least(100,greatest(0,progress_value)),
      updated_by=coalesce(auth.uid(),updated_by),
      updated_at=now()
  where id=p_job_order_id
  returning * into result_row;

  if not found then raise exception 'Job Order tidak ditemukan'; end if;
  return result_row;
end $$;

create or replace function public.sync_order_production_status(p_job_order_id uuid)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare
  job_row public.job_orders;
  active_count integer:=0;
  waiting_qc_count integer:=0;
  next_order_status text;
begin
  select * into job_row
  from public.job_orders
  where id=p_job_order_id;
  if not found then return; end if;

  select
    count(*) filter(where status<>'cancelled'),
    count(*) filter(where status in ('awaiting_qc','completed'))
  into active_count,waiting_qc_count
  from public.work_items
  where job_order_id=job_row.id and archived_at is null;

  next_order_status:=case
    when job_row.status='released' then 'masuk_produksi'
    when job_row.status in ('in_progress','on_hold') and active_count>0 and waiting_qc_count=active_count then 'quality_check'
    when job_row.status in ('in_progress','on_hold') then 'proses_produksi'
    else null
  end;

  if next_order_status is not null then
    update public.orders
    set status=next_order_status,
        updated_by=coalesce(auth.uid(),updated_by),
        updated_at=now()
    where id=job_row.order_id
      and archived_at is null
      and status not in ('dibatalkan','selesai');
  end if;
end $$;

revoke all on function public.refresh_job_order_progress(uuid) from public,anon,authenticated;
revoke all on function public.sync_order_production_status(uuid) from public,anon,authenticated;
grant execute on function public.refresh_job_order_progress(uuid) to service_role;
grant execute on function public.sync_order_production_status(uuid) to service_role;
