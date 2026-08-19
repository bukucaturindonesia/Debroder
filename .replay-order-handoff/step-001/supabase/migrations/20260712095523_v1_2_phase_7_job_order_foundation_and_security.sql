-- DEBRODER v1.2 Phase 7 — Job Order foundation, lifecycle, security, and audit.
-- Synchronized with the migration already installed on the connected Supabase project.

alter table public.job_orders
  add column if not exists ready_by uuid references auth.users(id) on delete set null,
  add column if not exists ready_at timestamptz,
  add column if not exists idempotency_key text;

create unique index if not exists job_orders_number_unique on public.job_orders(job_order_number);
create unique index if not exists job_orders_idempotency_unique
  on public.job_orders(idempotency_key) where idempotency_key is not null;
create unique index if not exists job_orders_one_active_per_order
  on public.job_orders(order_id) where archived_at is null and status <> 'cancelled';
create index if not exists job_orders_status_target_idx on public.job_orders(status,target_date);
create index if not exists job_orders_order_idx on public.job_orders(order_id);
create index if not exists job_orders_archive_idx on public.job_orders(archived_at,created_at desc);

create index if not exists job_order_history_idx
  on public.job_order_status_history(job_order_id,changed_at desc);
create index if not exists job_order_revisions_idx
  on public.job_order_revisions(job_order_id,revision_number desc);

create table if not exists public.job_order_deletion_audit (
  id uuid primary key default gen_random_uuid(),
  job_order_id uuid not null,
  job_order_number text,
  order_id uuid not null,
  snapshot jsonb not null,
  deleted_by uuid references auth.users(id) on delete set null,
  deleted_at timestamptz not null default now(),
  reason text not null default 'Hapus permanen dari Gudang Arsip'
);
create index if not exists job_order_deletion_audit_order_idx
  on public.job_order_deletion_audit(order_id,deleted_at desc);

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
  number_value text;
  order_snapshot_value jsonb;
  mockup_snapshot_value jsonb;
  normalized_key text:=nullif(btrim(coalesce(p_idempotency_key,'')),'');
begin
  if not public.has_staff_role(array['owner','superadmin','super_admin','admin']) then
    raise exception 'Tidak berwenang membuat Job Order';
  end if;
  if p_priority not in ('low','normal','high','urgent') then
    raise exception 'Prioritas Job Order tidak valid';
  end if;
  if p_target_date is not null and p_target_date < current_date then
    raise exception 'Target produksi tidak boleh berada di masa lalu';
  end if;

  if normalized_key is not null then
    select * into result_row from public.job_orders where idempotency_key=normalized_key;
    if found then return result_row; end if;
  end if;

  select * into order_row
  from public.orders
  where id=p_order_id and archived_at is null
  for update;
  if not found then raise exception 'Pesanan aktif tidak ditemukan'; end if;
  if order_row.status in ('dibatalkan','selesai') then
    raise exception 'Pesanan dengan status ini tidak dapat dibuatkan Job Order';
  end if;
  if not coalesce(order_row.payment_production_eligible,false) then
    raise exception 'Syarat pembayaran produksi belum terpenuhi';
  end if;
  if order_row.approved_mockup_set_id is null then
    raise exception 'Mockup yang disetujui wajib tersedia';
  end if;

  select * into mockup_row
  from public.mockup_sets
  where id=order_row.approved_mockup_set_id
    and quotation_id=order_row.quotation_id
    and status='approved'
    and archived_at is null;
  if not found then raise exception 'Mockup yang disetujui tidak valid atau sudah diarsipkan'; end if;

  select * into result_row
  from public.job_orders
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

  insert into public.job_orders(
    order_id,quotation_id,approved_mockup_set_id,status,priority,target_date,
    internal_notes,production_notes,order_snapshot,mockup_snapshot,payment_snapshot,
    idempotency_key,created_by,updated_by
  ) values(
    order_row.id,order_row.quotation_id,order_row.approved_mockup_set_id,'draft',p_priority,p_target_date,
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

  number_value:=public.issue_document_number(
    'job_order','job_orders',result_row.id,
    'job-order-number:'||order_row.id::text,
    jsonb_build_object('order_id',order_row.id,'order_number',order_row.order_number)
  );
  update public.job_orders
  set job_order_number=number_value,updated_at=now()
  where id=result_row.id
  returning * into result_row;

  insert into public.job_order_status_history(
    job_order_id,from_status,to_status,note,changed_by,metadata
  ) values(
    result_row.id,null,'draft','Job Order dibuat dari pesanan '||order_row.order_number,auth.uid(),
    jsonb_build_object('order_id',order_row.id,'mockup_set_id',mockup_row.id)
  );
  return result_row;
end $$;

create or replace function public.update_job_order_draft(
  p_job_order_id uuid,
  p_target_date date,
  p_priority text,
  p_internal_notes text,
  p_production_notes text,
  p_reason text default null
)
returns public.job_orders
language plpgsql
security definer
set search_path=''
as $$
declare
  old_row public.job_orders;
  result_row public.job_orders;
  revision_value integer;
  reason_value text:=nullif(btrim(coalesce(p_reason,'')),'');
begin
  if not public.has_staff_role(array['owner','superadmin','super_admin','admin']) then
    raise exception 'Tidak berwenang mengubah Job Order';
  end if;
  if p_priority not in ('low','normal','high','urgent') then raise exception 'Prioritas tidak valid'; end if;
  if p_target_date is not null and p_target_date < current_date then raise exception 'Target produksi tidak boleh berada di masa lalu'; end if;

  select * into old_row from public.job_orders
  where id=p_job_order_id and archived_at is null
  for update;
  if not found then raise exception 'Job Order aktif tidak ditemukan'; end if;
  if old_row.status not in ('draft','ready') then
    raise exception 'Job Order yang sudah dirilis tidak dapat diedit langsung';
  end if;
  if old_row.status='ready' and reason_value is null then
    raise exception 'Alasan perubahan wajib diisi untuk Job Order siap dirilis';
  end if;

  update public.job_orders set
    target_date=p_target_date,
    priority=p_priority,
    internal_notes=nullif(btrim(coalesce(p_internal_notes,'')),''),
    production_notes=nullif(btrim(coalesce(p_production_notes,'')),''),
    updated_by=auth.uid(),updated_at=now()
  where id=p_job_order_id
  returning * into result_row;

  select coalesce(max(revision_number),0)+1 into revision_value
  from public.job_order_revisions where job_order_id=p_job_order_id;
  insert into public.job_order_revisions(
    job_order_id,revision_number,reason,previous_snapshot,new_snapshot,created_by
  ) values(
    p_job_order_id,revision_value,coalesce(reason_value,'Pembaruan draft'),
    to_jsonb(old_row),to_jsonb(result_row),auth.uid()
  );
  return result_row;
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
  job_row public.job_orders;
  order_row public.orders;
  old_status text;
  allowed boolean:=false;
  active_work_count integer:=0;
  incomplete_work_count integer:=0;
  reason_value text:=nullif(btrim(coalesce(p_reason,'')),'');
begin
  if not public.has_staff_role(array['owner','superadmin','super_admin','admin']) then
    raise exception 'Tidak berwenang mengubah status Job Order';
  end if;
  select * into job_row from public.job_orders
  where id=p_job_order_id and archived_at is null
  for update;
  if not found then raise exception 'Job Order aktif tidak ditemukan'; end if;
  old_status:=job_row.status;
  allowed:=case old_status
    when 'draft' then p_to_status in ('ready','cancelled')
    when 'ready' then p_to_status in ('draft','released','cancelled')
    when 'released' then p_to_status in ('in_progress','on_hold','cancelled')
    when 'in_progress' then p_to_status in ('on_hold','completed','cancelled')
    when 'on_hold' then p_to_status in ('in_progress','cancelled')
    else false end;
  if not allowed then raise exception 'Perubahan status Job Order tidak diizinkan'; end if;
  if p_to_status in ('on_hold','cancelled') and reason_value is null then raise exception 'Alasan wajib diisi'; end if;

  select * into order_row from public.orders where id=job_row.order_id for update;
  if not found or order_row.archived_at is not null or order_row.status in ('dibatalkan','selesai') then
    raise exception 'Pesanan tidak lagi memenuhi syarat produksi';
  end if;

  if p_to_status='ready' then
    if job_row.target_date is null then raise exception 'Target produksi wajib diisi sebelum Job Order siap dirilis'; end if;
    if jsonb_array_length(coalesce(job_row.order_snapshot->'items','[]'::jsonb))=0 then raise exception 'Snapshot item produksi belum lengkap'; end if;
    if not order_row.payment_production_eligible then raise exception 'Syarat pembayaran produksi belum terpenuhi'; end if;
    if not exists(
      select 1 from public.mockup_sets
      where id=job_row.approved_mockup_set_id and status='approved' and archived_at is null
    ) then raise exception 'Mockup yang disetujui tidak lagi tersedia'; end if;
  end if;

  if p_to_status='released' then
    if not order_row.payment_production_eligible then raise exception 'Syarat pembayaran produksi belum terpenuhi'; end if;
    select count(*) into active_work_count from public.work_items
    where job_order_id=job_row.id and archived_at is null and status<>'cancelled';
    if active_work_count=0 then raise exception 'Work Item wajib dibuat sebelum Job Order dirilis'; end if;
    if exists(select 1 from public.work_items where job_order_id=job_row.id and archived_at is null and status<>'ready') then
      raise exception 'Semua Work Item aktif harus berstatus Siap Dikerjakan';
    end if;
  end if;

  if p_to_status='completed' then
    select count(*) into active_work_count from public.work_items
    where job_order_id=job_row.id and archived_at is null and status<>'cancelled';
    select count(*) into incomplete_work_count from public.work_items
    where job_order_id=job_row.id and archived_at is null and status not in ('completed','cancelled');
    if active_work_count=0 or incomplete_work_count>0 then raise exception 'Seluruh Work Item aktif harus selesai'; end if;
  end if;

  update public.job_orders set
    status=p_to_status,updated_by=auth.uid(),updated_at=now(),
    ready_by=case when p_to_status='ready' then auth.uid() when p_to_status='draft' then null else ready_by end,
    ready_at=case when p_to_status='ready' then now() when p_to_status='draft' then null else ready_at end,
    released_by=case when p_to_status='released' then auth.uid() else released_by end,
    released_at=case when p_to_status='released' then now() else released_at end,
    started_at=case when p_to_status='in_progress' and started_at is null then now() else started_at end,
    paused_at=case when p_to_status='on_hold' then now() else paused_at end,
    resumed_at=case when old_status='on_hold' and p_to_status='in_progress' then now() else resumed_at end,
    completed_at=case when p_to_status='completed' then now() else completed_at end,
    cancelled_at=case when p_to_status='cancelled' then now() else cancelled_at end,
    cancel_reason=case when p_to_status='cancelled' then reason_value when p_to_status='draft' then null else cancel_reason end
  where id=job_row.id returning * into job_row;

  if p_to_status='released' then
    update public.orders set status='masuk_produksi',updated_by=auth.uid(),updated_at=now()
    where id=job_row.order_id and status not in ('dibatalkan','selesai');
  end if;

  insert into public.job_order_status_history(
    job_order_id,from_status,to_status,note,reason,changed_by,metadata
  ) values(
    job_row.id,old_status,p_to_status,nullif(btrim(coalesce(p_note,'')),''),reason_value,auth.uid(),
    jsonb_build_object('order_id',job_row.order_id)
  );
  return job_row;
end $$;

create or replace function public.archive_job_order(p_job_order_id uuid,p_reason text default null)
returns public.job_orders
language plpgsql
security definer
set search_path=''
as $$
declare result_row public.job_orders; reason_value text:=nullif(btrim(coalesce(p_reason,'')),'');
begin
  if not public.has_staff_role(array['owner','superadmin','super_admin','admin']) then raise exception 'Tidak berwenang mengarsipkan Job Order'; end if;
  if reason_value is null then raise exception 'Alasan arsip wajib diisi'; end if;
  update public.job_orders set
    archived_at=now(),archived_by=auth.uid(),archive_reason=reason_value,updated_by=auth.uid(),updated_at=now()
  where id=p_job_order_id and archived_at is null and status in ('draft','completed','cancelled')
  returning * into result_row;
  if not found then raise exception 'Hanya Job Order Draft, Selesai, atau Dibatalkan yang dapat diarsipkan'; end if;
  insert into public.job_order_status_history(job_order_id,from_status,to_status,note,reason,changed_by,metadata)
  values(result_row.id,result_row.status,result_row.status,'Job Order dipindahkan ke Gudang Arsip',reason_value,auth.uid(),jsonb_build_object('action','archived'));
  return result_row;
end $$;

create or replace function public.restore_job_order(p_job_order_id uuid)
returns public.job_orders
language plpgsql
security definer
set search_path=''
as $$
declare result_row public.job_orders; archived_row public.job_orders;
begin
  if not public.has_staff_role(array['owner','superadmin','super_admin','admin']) then raise exception 'Tidak berwenang memulihkan Job Order'; end if;
  select * into archived_row from public.job_orders where id=p_job_order_id and archived_at is not null for update;
  if not found then raise exception 'Job Order arsip tidak ditemukan'; end if;
  if archived_row.status<>'cancelled' and exists(
    select 1 from public.job_orders other_row
    where other_row.order_id=archived_row.order_id and other_row.id<>archived_row.id
      and other_row.archived_at is null and other_row.status<>'cancelled'
  ) then raise exception 'Pesanan sudah memiliki Job Order aktif'; end if;
  update public.job_orders set
    archived_at=null,archived_by=null,archive_reason=null,updated_by=auth.uid(),updated_at=now()
  where id=p_job_order_id returning * into result_row;
  insert into public.job_order_status_history(job_order_id,from_status,to_status,note,changed_by,metadata)
  values(result_row.id,result_row.status,result_row.status,'Job Order dipulihkan dari Gudang Arsip',auth.uid(),jsonb_build_object('action','restored'));
  return result_row;
end $$;

create or replace function public.prevent_job_order_history_mutation()
returns trigger
language plpgsql
set search_path=''
as $$
begin
  if current_setting('debroder.job_order_permanent_delete',true)='on' then
    if tg_op='DELETE' then return old; end if;
    return new;
  end if;
  raise exception 'Riwayat Job Order bersifat permanen dan tidak dapat diubah';
end $$;

drop trigger if exists prevent_job_order_status_history_mutation on public.job_order_status_history;
create trigger prevent_job_order_status_history_mutation
before update or delete on public.job_order_status_history
for each row execute function public.prevent_job_order_history_mutation();

drop trigger if exists prevent_job_order_revision_mutation on public.job_order_revisions;
create trigger prevent_job_order_revision_mutation
before update or delete on public.job_order_revisions
for each row execute function public.prevent_job_order_history_mutation();

drop trigger if exists prevent_job_order_deletion_audit_mutation on public.job_order_deletion_audit;
create trigger prevent_job_order_deletion_audit_mutation
before update or delete on public.job_order_deletion_audit
for each row execute function public.prevent_job_order_history_mutation();

create or replace function public.permanently_delete_job_order(p_job_order_id uuid)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare target_row public.job_orders;
begin
  if not public.has_staff_role(array['superadmin','super_admin']) then raise exception 'Hanya Super Admin yang dapat menghapus permanen'; end if;
  select * into target_row from public.job_orders
  where id=p_job_order_id and archived_at is not null and status in ('draft','cancelled')
  for update;
  if not found then raise exception 'Hanya Job Order Draft atau Dibatalkan di Gudang Arsip yang dapat dihapus permanen'; end if;
  if exists(select 1 from public.work_items where job_order_id=target_row.id) then
    raise exception 'Job Order yang sudah mempunyai Work Item tidak dapat dihapus permanen';
  end if;
  insert into public.job_order_deletion_audit(job_order_id,job_order_number,order_id,snapshot,deleted_by)
  values(target_row.id,target_row.job_order_number,target_row.order_id,to_jsonb(target_row),auth.uid());
  perform set_config('debroder.job_order_permanent_delete','on',true);
  delete from public.job_order_revisions where job_order_id=target_row.id;
  delete from public.job_order_status_history where job_order_id=target_row.id;
  delete from public.job_orders where id=target_row.id;
end $$;

create or replace function public.set_job_order_updated_at()
returns trigger
language plpgsql
set search_path=''
as $$
begin new.updated_at=now(); return new; end $$;

drop trigger if exists set_job_order_updated_at on public.job_orders;
create trigger set_job_order_updated_at
before update on public.job_orders
for each row execute function public.set_job_order_updated_at();

alter table public.job_orders enable row level security;
alter table public.job_order_status_history enable row level security;
alter table public.job_order_revisions enable row level security;
alter table public.job_order_deletion_audit enable row level security;

drop policy if exists "staff read job_orders" on public.job_orders;
drop policy if exists "production staff read job_orders" on public.job_orders;
create policy "production staff read job_orders" on public.job_orders
for select to authenticated
using(public.has_staff_role(array['owner','superadmin','super_admin','admin']));

drop policy if exists "staff read job_order_status_history" on public.job_order_status_history;
drop policy if exists "production staff read job_order_status_history" on public.job_order_status_history;
create policy "production staff read job_order_status_history" on public.job_order_status_history
for select to authenticated
using(public.has_staff_role(array['owner','superadmin','super_admin','admin']));

drop policy if exists "staff read job_order_revisions" on public.job_order_revisions;
drop policy if exists "production staff read job_order_revisions" on public.job_order_revisions;
create policy "production staff read job_order_revisions" on public.job_order_revisions
for select to authenticated
using(public.has_staff_role(array['owner','superadmin','super_admin','admin']));

drop policy if exists "production staff read job_order_deletion_audit" on public.job_order_deletion_audit;
create policy "production staff read job_order_deletion_audit" on public.job_order_deletion_audit
for select to authenticated
using(public.has_staff_role(array['owner','superadmin','super_admin','admin']));

revoke all on public.job_orders,public.job_order_status_history,public.job_order_revisions,public.job_order_deletion_audit from public,anon;
revoke insert,update,delete,truncate,references,trigger
  on public.job_orders,public.job_order_status_history,public.job_order_revisions,public.job_order_deletion_audit
  from authenticated;
grant select on public.job_orders,public.job_order_status_history,public.job_order_revisions,public.job_order_deletion_audit to authenticated;

revoke all on function public.create_job_order(uuid,date,text,text,text,text) from public,anon;
revoke all on function public.update_job_order_draft(uuid,date,text,text,text,text) from public,anon;
revoke all on function public.transition_job_order_status(uuid,text,text,text) from public,anon;
revoke all on function public.archive_job_order(uuid,text) from public,anon;
revoke all on function public.restore_job_order(uuid) from public,anon;
revoke all on function public.permanently_delete_job_order(uuid) from public,anon;
grant execute on function public.create_job_order(uuid,date,text,text,text,text) to authenticated;
grant execute on function public.update_job_order_draft(uuid,date,text,text,text,text) to authenticated;
grant execute on function public.transition_job_order_status(uuid,text,text,text) to authenticated;
grant execute on function public.archive_job_order(uuid,text) to authenticated;
grant execute on function public.restore_job_order(uuid) to authenticated;
grant execute on function public.permanently_delete_job_order(uuid) to authenticated;

alter table public.job_orders alter column job_order_number set not null;
