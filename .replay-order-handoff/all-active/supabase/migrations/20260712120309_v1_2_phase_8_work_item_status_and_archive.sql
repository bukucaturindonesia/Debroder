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
  result_row public.work_items;
  job_row public.job_orders;
  old_status text;
  allowed boolean:=false;
  reason_value text:=nullif(btrim(coalesce(p_reason,'')),'');
begin
  if not public.has_permission('work_item.status') then raise exception 'Tidak berwenang mengubah status Work Item'; end if;
  select * into result_row from public.work_items
  where id=p_work_item_id and archived_at is null
  for update;
  if not found then raise exception 'Work Item aktif tidak ditemukan'; end if;
  select * into job_row from public.job_orders
  where id=result_row.job_order_id and archived_at is null
  for update;
  if not found then raise exception 'Job Order induk tidak ditemukan'; end if;
  if job_row.status not in ('draft','ready') then raise exception 'Status persiapan tidak dapat diubah setelah Job Order dirilis'; end if;

  old_status:=result_row.status;
  allowed:=case old_status
    when 'draft' then p_to_status in ('ready','cancelled')
    when 'ready' then p_to_status in ('draft','cancelled')
    else false end;
  if not allowed then raise exception 'Perubahan status Work Item tidak diizinkan pada Phase 8'; end if;
  if p_to_status='cancelled' and reason_value is null then raise exception 'Alasan pembatalan wajib diisi'; end if;
  if p_to_status='ready' then
    if result_row.assigned_to is null then raise exception 'Penanggung jawab wajib ditentukan sebelum Work Item siap'; end if;
    if result_row.target_date is null then raise exception 'Target pengerjaan wajib diisi sebelum Work Item siap'; end if;
    if result_row.quantity<=0 or btrim(result_row.title)='' then raise exception 'Data Work Item belum lengkap'; end if;
  end if;

  update public.work_items set
    status=p_to_status,updated_by=auth.uid(),updated_at=now(),
    ready_by=case when p_to_status='ready' then auth.uid() when p_to_status='draft' then null else ready_by end,
    ready_at=case when p_to_status='ready' then now() when p_to_status='draft' then null else ready_at end,
    cancelled_at=case when p_to_status='cancelled' then now() when p_to_status='draft' then null else cancelled_at end,
    cancel_reason=case when p_to_status='cancelled' then reason_value when p_to_status='draft' then null else cancel_reason end
  where id=result_row.id returning * into result_row;

  insert into public.work_item_status_history(work_item_id,from_status,to_status,note,reason,changed_by,metadata)
  values(result_row.id,old_status,p_to_status,nullif(btrim(coalesce(p_note,'')),''),reason_value,auth.uid(),
    jsonb_build_object('job_order_id',result_row.job_order_id,'phase','8'));
  return result_row;
end $$;

create or replace function public.archive_work_item(p_work_item_id uuid,p_reason text default null)
returns public.work_items
language plpgsql
security definer
set search_path=''
as $$
declare
  result_row public.work_items;
  reason_value text:=nullif(btrim(coalesce(p_reason,'')),'');
begin
  if not public.has_permission('work_item.archive') then raise exception 'Tidak berwenang mengarsipkan Work Item'; end if;
  if reason_value is null then raise exception 'Alasan arsip wajib diisi'; end if;
  update public.work_items set
    archived_at=now(),archived_by=auth.uid(),archive_reason=reason_value,updated_by=auth.uid(),updated_at=now()
  where id=p_work_item_id and archived_at is null and status in ('draft','completed','cancelled')
  returning * into result_row;
  if not found then raise exception 'Hanya Work Item Draft, Selesai, atau Dibatalkan yang dapat diarsipkan'; end if;
  insert into public.work_item_status_history(work_item_id,from_status,to_status,note,reason,changed_by,metadata)
  values(result_row.id,result_row.status,result_row.status,'Work Item dipindahkan ke Gudang Arsip',reason_value,auth.uid(),
    jsonb_build_object('action','archived'));
  perform public.refresh_job_order_progress(result_row.job_order_id);
  return result_row;
end $$;

create or replace function public.restore_work_item(p_work_item_id uuid)
returns public.work_items
language plpgsql
security definer
set search_path=''
as $$
declare
  result_row public.work_items;
  archived_row public.work_items;
  parent_status text;
begin
  if not public.has_permission('work_item.archive') then raise exception 'Tidak berwenang memulihkan Work Item'; end if;
  select * into archived_row from public.work_items
  where id=p_work_item_id and archived_at is not null
  for update;
  if not found then raise exception 'Work Item arsip tidak ditemukan'; end if;
  select status into parent_status from public.job_orders
  where id=archived_row.job_order_id and archived_at is null;
  if parent_status not in ('draft','ready') then raise exception 'Job Order induk sudah tidak dapat menerima Work Item yang dipulihkan'; end if;
  if archived_row.idempotency_key is not null and exists(
    select 1 from public.work_items other_row
    where other_row.id<>archived_row.id and other_row.idempotency_key=archived_row.idempotency_key and other_row.archived_at is null
  ) then raise exception 'Work Item pengganti dengan sumber yang sama sudah aktif'; end if;

  update public.work_items set
    archived_at=null,archived_by=null,archive_reason=null,updated_by=auth.uid(),updated_at=now()
  where id=p_work_item_id returning * into result_row;
  insert into public.work_item_status_history(work_item_id,from_status,to_status,note,changed_by,metadata)
  values(result_row.id,result_row.status,result_row.status,'Work Item dipulihkan dari Gudang Arsip',auth.uid(),
    jsonb_build_object('action','restored'));
  perform public.refresh_job_order_progress(result_row.job_order_id);
  return result_row;
end $$;

