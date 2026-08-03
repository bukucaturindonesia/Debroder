create table if not exists public.qc_records (
  id uuid primary key default gen_random_uuid(),
  qc_number text unique,
  job_order_id uuid not null references public.job_orders(id) on delete restrict,
  work_item_id uuid not null references public.work_items(id) on delete restrict,
  attempt_number integer not null,
  checked_quantity integer not null check (checked_quantity > 0),
  passed_quantity integer not null default 0 check (passed_quantity >= 0),
  failed_quantity integer not null default 0 check (failed_quantity >= 0),
  result text not null default 'pending' check (result in ('pending','passed','partial','failed','rework')),
  defect_notes text,
  inspector_id uuid references auth.users(id) on delete set null,
  inspected_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  archived_by uuid references auth.users(id) on delete set null,
  archive_reason text,
  unique(work_item_id,attempt_number),
  check (passed_quantity + failed_quantity <= checked_quantity)
);
create index if not exists qc_records_work_item_idx on public.qc_records(work_item_id,attempt_number desc);
create index if not exists qc_records_job_idx on public.qc_records(job_order_id,result);

create table if not exists public.qc_checklist_templates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  applies_to text not null default 'all',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  archived_by uuid references auth.users(id) on delete set null,
  archive_reason text
);

insert into public.qc_checklist_templates(code,label,applies_to,sort_order)
values
 ('color','Kesesuaian warna','all',10),
 ('size','Kesesuaian ukuran','all',20),
 ('quantity','Kesesuaian jumlah','all',30),
 ('design_position','Posisi desain','customization',40),
 ('embroidery_quality','Kualitas bordir','embroidery',50),
 ('print_quality','Kualitas sablon','printing',60),
 ('name_number','Nama dan nomor','personalization',70),
 ('stitching','Jahitan','all',80),
 ('defect','Noda atau cacat','all',90),
 ('finishing','Finishing','all',100),
 ('packing','Packing','all',110)
on conflict(code) do nothing;

create table if not exists public.qc_checklist_results (
  id uuid primary key default gen_random_uuid(),
  qc_record_id uuid not null references public.qc_records(id) on delete cascade,
  template_id uuid references public.qc_checklist_templates(id) on delete restrict,
  code text not null,
  label text not null,
  result text not null check (result in ('pass','fail','not_applicable')),
  note text,
  sort_order integer not null default 0,
  unique(qc_record_id,code)
);

create table if not exists public.qc_files (
  id uuid primary key default gen_random_uuid(),
  qc_record_id uuid not null references public.qc_records(id) on delete cascade,
  bucket text not null default 'qc-proofs' check (bucket='qc-proofs'),
  path text not null unique,
  file_name text not null,
  mime_type text not null check (mime_type in ('image/png','image/jpeg','image/webp','application/pdf')),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  uploaded_by uuid references auth.users(id) on delete set null,
  uploaded_at timestamptz not null default now()
);

create table if not exists public.qc_status_history (
  id uuid primary key default gen_random_uuid(),
  qc_record_id uuid not null references public.qc_records(id) on delete cascade,
  from_result text,
  to_result text not null,
  note text,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);

create or replace function public.create_qc_record(
  p_work_item_id uuid,
  p_checked_quantity integer,
  p_checklist jsonb,
  p_defect_notes text default null
)
returns public.qc_records
language plpgsql security definer set search_path=public
as $$
declare wi public.work_items; jo public.job_orders; q public.qc_records; attempt int; n text; item jsonb;
begin
  if not public.has_staff_role(array['owner','superadmin','super_admin','admin']) then raise exception 'Not authorized'; end if;
  select * into wi from public.work_items where id=p_work_item_id and archived_at is null for update;
  if not found then raise exception 'Work Item not found'; end if;
  if wi.status<>'awaiting_qc' then raise exception 'Work Item must be awaiting QC'; end if;
  select * into jo from public.job_orders where id=wi.job_order_id and archived_at is null;
  if not found then raise exception 'Job Order not found'; end if;
  if p_checked_quantity<=0 or p_checked_quantity>wi.quantity then raise exception 'Invalid checked quantity'; end if;
  if jsonb_typeof(coalesce(p_checklist,'[]'::jsonb))<>'array' then raise exception 'Checklist must be array'; end if;
  select coalesce(max(attempt_number),0)+1 into attempt from public.qc_records where work_item_id=wi.id;

  insert into public.qc_records(job_order_id,work_item_id,attempt_number,checked_quantity,defect_notes,inspector_id,created_by)
  values(jo.id,wi.id,attempt,p_checked_quantity,nullif(btrim(coalesce(p_defect_notes,'')),''),auth.uid(),auth.uid())
  returning * into q;

  for item in select * from jsonb_array_elements(coalesce(p_checklist,'[]'::jsonb)) loop
    if coalesce(item->>'code','')='' or coalesce(item->>'label','')='' or coalesce(item->>'result','') not in ('pass','fail','not_applicable') then
      raise exception 'Invalid checklist item';
    end if;
    insert into public.qc_checklist_results(qc_record_id,code,label,result,note,sort_order)
    values(q.id,item->>'code',item->>'label',item->>'result',nullif(item->>'note',''),coalesce((item->>'sort_order')::int,0));
  end loop;

  n:=public.issue_document_number('qc','qc_record',q.id,'qc:'||q.id::text,jsonb_build_object('work_item_id',wi.id));
  update public.qc_records set qc_number=n where id=q.id returning * into q;
  insert into public.qc_status_history(qc_record_id,from_result,to_result,note,changed_by)
  values(q.id,null,'pending','Pemeriksaan QC dibuat',auth.uid());
  return q;
end $$;

create or replace function public.register_qc_file(
  p_qc_record_id uuid,p_path text,p_file_name text,p_mime_type text,p_size_bytes bigint
)
returns public.qc_files language plpgsql security definer set search_path=public
as $$
declare f public.qc_files;
begin
 if not public.has_staff_role(array['owner','superadmin','super_admin','admin']) then raise exception 'Not authorized'; end if;
 if p_mime_type not in ('image/png','image/jpeg','image/webp','application/pdf') then raise exception 'Invalid file type'; end if;
 if p_size_bytes<=0 or p_size_bytes>10485760 then raise exception 'Invalid file size'; end if;
 perform 1 from public.qc_records where id=p_qc_record_id and result='pending' and archived_at is null;
 if not found then raise exception 'Editable QC record not found'; end if;
 insert into public.qc_files(qc_record_id,path,file_name,mime_type,size_bytes,uploaded_by)
 values(p_qc_record_id,p_path,p_file_name,p_mime_type,p_size_bytes,auth.uid()) returning * into f;
 return f;
end $$;

create or replace function public.finalize_qc_record(
  p_qc_record_id uuid,
  p_passed_quantity integer,
  p_failed_quantity integer,
  p_result text,
  p_note text default null
)
returns public.qc_records language plpgsql security definer set search_path=public
as $$
declare q public.qc_records; wi public.work_items; old_result text;
begin
 if not public.has_staff_role(array['owner','superadmin','super_admin','admin']) then raise exception 'Not authorized'; end if;
 select * into q from public.qc_records where id=p_qc_record_id and archived_at is null for update;
 if not found or q.result<>'pending' then raise exception 'Pending QC record not found'; end if;
 if p_result not in ('passed','partial','failed','rework') then raise exception 'Invalid QC result'; end if;
 if p_passed_quantity<0 or p_failed_quantity<0 or p_passed_quantity+p_failed_quantity>q.checked_quantity then raise exception 'Invalid quantities'; end if;
 if p_result='passed' and p_failed_quantity<>0 then raise exception 'Passed QC cannot have failed quantity'; end if;
 if p_result in ('failed','rework') and p_failed_quantity=0 then raise exception 'Failed quantity required'; end if;
 old_result:=q.result;
 update public.qc_records set passed_quantity=p_passed_quantity,failed_quantity=p_failed_quantity,result=p_result,
   defect_notes=coalesce(nullif(btrim(coalesce(p_note,'')),''),defect_notes),inspected_at=now(),approved_by=auth.uid(),approved_at=now()
 where id=q.id returning * into q;
 insert into public.qc_status_history(qc_record_id,from_result,to_result,note,changed_by)
 values(q.id,old_result,p_result,p_note,auth.uid());
 select * into wi from public.work_items where id=q.work_item_id for update;
 if p_result='passed' then
   perform public.transition_work_item_status(wi.id,'completed','QC lulus',null);
 else
   perform public.transition_work_item_status(wi.id,'rework','QC memerlukan perbaikan',coalesce(nullif(btrim(coalesce(p_note,'')),''),'QC tidak lulus'));
 end if;
 return q;
end $$;

create or replace function public.archive_qc_record(p_qc_record_id uuid,p_reason text default null)
returns public.qc_records language plpgsql security definer set search_path=public
as $$
declare q public.qc_records;
begin
 if not public.has_staff_role(array['owner','superadmin','super_admin','admin']) then raise exception 'Not authorized'; end if;
 update public.qc_records set archived_at=now(),archived_by=auth.uid(),archive_reason=nullif(btrim(coalesce(p_reason,'')),'')
 where id=p_qc_record_id and archived_at is null and result in ('pending','passed','partial','failed','rework')
 returning * into q;
 if not found then raise exception 'QC record not found'; end if;
 return q;
end $$;

create or replace function public.restore_qc_record(p_qc_record_id uuid)
returns public.qc_records language plpgsql security definer set search_path=public
as $$
declare q public.qc_records;
begin
 if not public.has_staff_role(array['owner','superadmin','super_admin','admin']) then raise exception 'Not authorized'; end if;
 update public.qc_records set archived_at=null,archived_by=null,archive_reason=null
 where id=p_qc_record_id and archived_at is not null returning * into q;
 if not found then raise exception 'Archived QC record not found'; end if;
 return q;
end $$;

create or replace function public.permanently_delete_qc_record(p_qc_record_id uuid)
returns void language plpgsql security definer set search_path=public
as $$
begin
 if not public.has_staff_role(array['superadmin','super_admin']) then raise exception 'Only Super Admin'; end if;
 delete from public.qc_records where id=p_qc_record_id and archived_at is not null and result='pending';
 if not found then raise exception 'Only archived pending QC can be deleted'; end if;
end $$;

create or replace function public.transition_work_item_status(
 p_work_item_id uuid,p_to_status text,p_note text default null,p_reason text default null
)
returns public.work_items language plpgsql security definer set search_path=public
as $$
declare wi public.work_items; jo public.job_orders; old_status text; allowed boolean:=false;
begin
 if not public.has_staff_role(array['owner','superadmin','super_admin','admin']) then raise exception 'Not authorized'; end if;
 select * into wi from public.work_items where id=p_work_item_id and archived_at is null for update;
 if not found then raise exception 'Work Item not found'; end if;
 select * into jo from public.job_orders where id=wi.job_order_id and archived_at is null for update;
 if not found then raise exception 'Job Order not found'; end if;
 old_status:=wi.status;
 allowed:=case old_status
  when 'draft' then p_to_status in ('ready','cancelled')
  when 'ready' then p_to_status in ('draft','in_progress','cancelled')
  when 'in_progress' then p_to_status in ('on_hold','awaiting_qc','cancelled')
  when 'on_hold' then p_to_status in ('in_progress','cancelled')
  when 'awaiting_qc' then p_to_status in ('rework','completed')
  when 'rework' then p_to_status in ('in_progress','awaiting_qc','cancelled')
  else false end;
 if not allowed then raise exception 'Transition not allowed'; end if;
 if p_to_status in ('in_progress','on_hold','awaiting_qc','rework','completed') and jo.status not in ('released','in_progress','on_hold') then raise exception 'Job Order is not released'; end if;
 if jo.status='on_hold' and p_to_status in ('in_progress','awaiting_qc','completed') then raise exception 'Job Order is on hold'; end if;
 if exists(select 1 from public.work_item_dependencies d join public.work_items dep on dep.id=d.depends_on_work_item_id
   where d.work_item_id=wi.id and dep.status<>'completed') and p_to_status='in_progress' then raise exception 'Dependencies not completed'; end if;
 if p_to_status in ('on_hold','cancelled','rework') and btrim(coalesce(p_reason,''))='' then raise exception 'Reason required'; end if;
 if p_to_status='completed' and not exists(
   select 1 from public.qc_records where work_item_id=wi.id and result='passed' and archived_at is null
 ) then raise exception 'Passed QC required'; end if;
 update public.work_items set status=p_to_status,updated_by=auth.uid(),updated_at=now(),
   started_at=case when p_to_status='in_progress' and started_at is null then now() else started_at end,
   paused_at=case when p_to_status='on_hold' then now() else paused_at end,
   resumed_at=case when old_status='on_hold' and p_to_status='in_progress' then now() else resumed_at end,
   completed_at=case when p_to_status='completed' then now() else completed_at end,
   cancelled_at=case when p_to_status='cancelled' then now() else cancelled_at end,
   cancel_reason=case when p_to_status='cancelled' then p_reason else cancel_reason end
 where id=wi.id returning * into wi;
 insert into public.work_item_status_history(work_item_id,from_status,to_status,note,reason,changed_by)
 values(wi.id,old_status,p_to_status,nullif(btrim(coalesce(p_note,'')),''),nullif(btrim(coalesce(p_reason,'')),''),auth.uid());
 perform public.refresh_job_order_progress(wi.job_order_id);
 return wi;
end $$;

create table if not exists public.fulfillments (
  id uuid primary key default gen_random_uuid(),
  fulfillment_number text unique,
  order_id uuid not null references public.orders(id) on delete restrict,
  job_order_id uuid references public.job_orders(id) on delete restrict,
  method text not null check (method in ('shipping','pickup')),
  status text not null default 'preparing' check (status in ('preparing','packing','ready_to_ship','shipped','in_transit','delivered','ready_for_pickup','picked_up','problem','cancelled')),
  receiver_name text,
  receiver_phone text,
  destination text,
  courier text,
  tracking_number text,
  package_count integer not null default 1 check (package_count > 0),
  scheduled_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  picked_up_at timestamptz,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  archived_by uuid references auth.users(id) on delete set null,
  archive_reason text
);
create index if not exists fulfillments_order_idx on public.fulfillments(order_id,status);

create table if not exists public.fulfillment_items (
  id uuid primary key default gen_random_uuid(),
  fulfillment_id uuid not null references public.fulfillments(id) on delete cascade,
  work_item_id uuid references public.work_items(id) on delete restrict,
  order_item_id uuid references public.order_items(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.fulfillment_files (
  id uuid primary key default gen_random_uuid(),
  fulfillment_id uuid not null references public.fulfillments(id) on delete cascade,
  file_type text not null check (file_type in ('handover','signature','photo','document')),
  bucket text not null default 'fulfillment-proofs' check (bucket='fulfillment-proofs'),
  path text not null unique,
  file_name text not null,
  mime_type text not null check (mime_type in ('image/png','image/jpeg','image/webp','application/pdf')),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  uploaded_by uuid references auth.users(id) on delete set null,
  uploaded_at timestamptz not null default now()
);

create table if not exists public.fulfillment_status_history (
  id uuid primary key default gen_random_uuid(),
  fulfillment_id uuid not null references public.fulfillments(id) on delete cascade,
  from_status text,
  to_status text not null,
  note text,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);

create or replace function public.create_fulfillment(
  p_order_id uuid,p_method text,p_receiver_name text,p_receiver_phone text,p_destination text,
  p_courier text,p_package_count integer,p_scheduled_at timestamptz,p_notes text,p_items jsonb
)
returns public.fulfillments language plpgsql security definer set search_path=public
as $$
declare o public.orders; jo public.job_orders; f public.fulfillments; item jsonb; wi public.work_items; n text; qty int;
begin
 if not public.has_staff_role(array['owner','superadmin','super_admin','admin']) then raise exception 'Not authorized'; end if;
 if p_method not in ('shipping','pickup') then raise exception 'Invalid method'; end if;
 select * into o from public.orders where id=p_order_id and archived_at is null and status<>'dibatalkan' for update;
 if not found then raise exception 'Active order not found'; end if;
 select * into jo from public.job_orders where order_id=o.id and archived_at is null order by created_at desc limit 1;
 if not found then raise exception 'Job Order required'; end if;
 if exists(select 1 from public.work_items where job_order_id=jo.id and archived_at is null and status not in ('completed','cancelled')) then raise exception 'All Work Items must pass QC'; end if;
 if jsonb_typeof(coalesce(p_items,'[]'::jsonb))<>'array' or jsonb_array_length(coalesce(p_items,'[]'::jsonb))=0 then raise exception 'Fulfillment items required'; end if;

 insert into public.fulfillments(order_id,job_order_id,method,status,receiver_name,receiver_phone,destination,courier,package_count,scheduled_at,notes,created_by,updated_by)
 values(o.id,jo.id,p_method,case when p_method='pickup' then 'ready_for_pickup' else 'preparing' end,
   nullif(btrim(coalesce(p_receiver_name,'')),''),nullif(btrim(coalesce(p_receiver_phone,'')),''),
   nullif(btrim(coalesce(p_destination,'')),''),nullif(btrim(coalesce(p_courier,'')),''),
   greatest(coalesce(p_package_count,1),1),p_scheduled_at,nullif(btrim(coalesce(p_notes,'')),''),auth.uid(),auth.uid())
 returning * into f;

 for item in select * from jsonb_array_elements(p_items) loop
   select * into wi from public.work_items where id=(item->>'work_item_id')::uuid and job_order_id=jo.id and status='completed' and archived_at is null;
   if not found then raise exception 'Completed Work Item required'; end if;
   qty:=coalesce((item->>'quantity')::int,0);
   if qty<=0 or qty>wi.quantity then raise exception 'Invalid fulfillment quantity'; end if;
   if (select coalesce(sum(fi.quantity),0) from public.fulfillment_items fi join public.fulfillments fx on fx.id=fi.fulfillment_id
      where fi.work_item_id=wi.id and fx.archived_at is null and fx.status<>'cancelled') + qty > wi.quantity then
      raise exception 'Fulfillment quantity exceeds passed quantity';
   end if;
   insert into public.fulfillment_items(fulfillment_id,work_item_id,order_item_id,quantity)
   select f.id,wi.id,wi.source_order_item_id,qty;
 end loop;

 n:=public.issue_document_number('delivery','fulfillment',f.id,'fulfillment:'||f.id::text,jsonb_build_object('order_id',o.id));
 update public.fulfillments set fulfillment_number=n where id=f.id returning * into f;
 insert into public.fulfillment_status_history(fulfillment_id,from_status,to_status,note,changed_by)
 values(f.id,null,f.status,'Fulfillment dibuat',auth.uid());
 return f;
end $$;

create or replace function public.update_fulfillment_tracking(
  p_fulfillment_id uuid,p_courier text,p_tracking_number text,p_notes text default null
)
returns public.fulfillments language plpgsql security definer set search_path=public
as $$
declare f public.fulfillments;
begin
 if not public.has_staff_role(array['owner','superadmin','super_admin','admin']) then raise exception 'Not authorized'; end if;
 update public.fulfillments set courier=nullif(btrim(coalesce(p_courier,'')),''),
   tracking_number=nullif(btrim(coalesce(p_tracking_number,'')),''),
   notes=coalesce(nullif(btrim(coalesce(p_notes,'')),''),notes),updated_by=auth.uid(),updated_at=now()
 where id=p_fulfillment_id and archived_at is null and status not in ('delivered','picked_up','cancelled')
 returning * into f;
 if not found then raise exception 'Editable fulfillment not found'; end if;
 return f;
end $$;

create or replace function public.transition_fulfillment_status(
  p_fulfillment_id uuid,p_to_status text,p_note text default null
)
returns public.fulfillments language plpgsql security definer set search_path=public
as $$
declare f public.fulfillments; old_status text; allowed boolean:=false;
begin
 if not public.has_staff_role(array['owner','superadmin','super_admin','admin']) then raise exception 'Not authorized'; end if;
 select * into f from public.fulfillments where id=p_fulfillment_id and archived_at is null for update;
 if not found then raise exception 'Fulfillment not found'; end if;
 old_status:=f.status;
 allowed:=case old_status
   when 'preparing' then p_to_status in ('packing','cancelled','problem')
   when 'packing' then p_to_status in ('ready_to_ship','ready_for_pickup','problem','cancelled')
   when 'ready_to_ship' then p_to_status in ('shipped','problem','cancelled')
   when 'shipped' then p_to_status in ('in_transit','delivered','problem')
   when 'in_transit' then p_to_status in ('delivered','problem')
   when 'ready_for_pickup' then p_to_status in ('picked_up','problem','cancelled')
   when 'problem' then p_to_status in ('preparing','packing','ready_to_ship','ready_for_pickup','cancelled')
   else false end;
 if not allowed then raise exception 'Transition not allowed'; end if;
 if p_to_status='shipped' and (coalesce(f.courier,'')='' or coalesce(f.tracking_number,'')='') then raise exception 'Courier and tracking number required'; end if;
 if p_to_status in ('delivered','picked_up') and not exists(select 1 from public.fulfillment_files where fulfillment_id=f.id and file_type in ('handover','signature','photo')) then raise exception 'Handover proof required'; end if;
 update public.fulfillments set status=p_to_status,updated_by=auth.uid(),updated_at=now(),
   shipped_at=case when p_to_status='shipped' then now() else shipped_at end,
   delivered_at=case when p_to_status='delivered' then now() else delivered_at end,
   picked_up_at=case when p_to_status='picked_up' then now() else picked_up_at end
 where id=f.id returning * into f;
 insert into public.fulfillment_status_history(fulfillment_id,from_status,to_status,note,changed_by)
 values(f.id,old_status,p_to_status,nullif(btrim(coalesce(p_note,'')),''),auth.uid());
 if not exists(select 1 from public.fulfillments where order_id=f.order_id and archived_at is null and status not in ('delivered','picked_up','cancelled')) then
   update public.orders set status='selesai',updated_at=now(),updated_by=auth.uid() where id=f.order_id;
 end if;
 return f;
end $$;

create or replace function public.register_fulfillment_file(
 p_fulfillment_id uuid,p_file_type text,p_path text,p_file_name text,p_mime_type text,p_size_bytes bigint
)
returns public.fulfillment_files language plpgsql security definer set search_path=public
as $$
declare ff public.fulfillment_files;
begin
 if not public.has_staff_role(array['owner','superadmin','super_admin','admin']) then raise exception 'Not authorized'; end if;
 if p_file_type not in ('handover','signature','photo','document') then raise exception 'Invalid file type'; end if;
 if p_mime_type not in ('image/png','image/jpeg','image/webp','application/pdf') then raise exception 'Invalid MIME type'; end if;
 if p_size_bytes<=0 or p_size_bytes>10485760 then raise exception 'Invalid file size'; end if;
 perform 1 from public.fulfillments where id=p_fulfillment_id and archived_at is null;
 if not found then raise exception 'Fulfillment not found'; end if;
 insert into public.fulfillment_files(fulfillment_id,file_type,path,file_name,mime_type,size_bytes,uploaded_by)
 values(p_fulfillment_id,p_file_type,p_path,p_file_name,p_mime_type,p_size_bytes,auth.uid()) returning * into ff;
 return ff;
end $$;

create or replace function public.archive_fulfillment(p_fulfillment_id uuid,p_reason text default null)
returns public.fulfillments language plpgsql security definer set search_path=public
as $$
declare f public.fulfillments;
begin
 if not public.has_staff_role(array['owner','superadmin','super_admin','admin']) then raise exception 'Not authorized'; end if;
 update public.fulfillments set archived_at=now(),archived_by=auth.uid(),archive_reason=nullif(btrim(coalesce(p_reason,'')),'')
 where id=p_fulfillment_id and archived_at is null and status in ('preparing','delivered','picked_up','cancelled')
 returning * into f;
 if not found then raise exception 'Fulfillment cannot be archived in current status'; end if;
 return f;
end $$;

create or replace function public.restore_fulfillment(p_fulfillment_id uuid)
returns public.fulfillments language plpgsql security definer set search_path=public
as $$
declare f public.fulfillments;
begin
 if not public.has_staff_role(array['owner','superadmin','super_admin','admin']) then raise exception 'Not authorized'; end if;
 update public.fulfillments set archived_at=null,archived_by=null,archive_reason=null,updated_by=auth.uid(),updated_at=now()
 where id=p_fulfillment_id and archived_at is not null returning * into f;
 if not found then raise exception 'Archived fulfillment not found'; end if;
 return f;
end $$;

create or replace function public.permanently_delete_fulfillment(p_fulfillment_id uuid)
returns void language plpgsql security definer set search_path=public
as $$
begin
 if not public.has_staff_role(array['superadmin','super_admin']) then raise exception 'Only Super Admin'; end if;
 delete from public.fulfillments where id=p_fulfillment_id and archived_at is not null and status in ('preparing','cancelled');
 if not found then raise exception 'Only archived preparing/cancelled fulfillment can be deleted'; end if;
end $$;

alter table public.qc_records enable row level security;
alter table public.qc_checklist_templates enable row level security;
alter table public.qc_checklist_results enable row level security;
alter table public.qc_files enable row level security;
alter table public.qc_status_history enable row level security;
alter table public.fulfillments enable row level security;
alter table public.fulfillment_items enable row level security;
alter table public.fulfillment_files enable row level security;
alter table public.fulfillment_status_history enable row level security;

do $$
declare t text;
begin
 foreach t in array array['qc_records','qc_checklist_templates','qc_checklist_results','qc_files','qc_status_history','fulfillments','fulfillment_items','fulfillment_files','fulfillment_status_history']
 loop
   execute format('drop policy if exists "staff read %s" on public.%I',t,t);
   execute format('create policy "staff read %s" on public.%I for select to authenticated using(public.has_staff_role(array[''owner'',''superadmin'',''super_admin'',''sales_admin'',''admin'']))',t,t);
 end loop;
end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('qc-proofs','qc-proofs',false,10485760,array['image/png','image/jpeg','image/webp','application/pdf'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('fulfillment-proofs','fulfillment-proofs',false,10485760,array['image/png','image/jpeg','image/webp','application/pdf'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "staff manage qc proof objects" on storage.objects;
create policy "staff manage qc proof objects" on storage.objects for all to authenticated
using(bucket_id='qc-proofs' and public.has_staff_role(array['owner','superadmin','super_admin','admin']))
with check(bucket_id='qc-proofs' and public.has_staff_role(array['owner','superadmin','super_admin','admin']));

drop policy if exists "staff manage fulfillment proof objects" on storage.objects;
create policy "staff manage fulfillment proof objects" on storage.objects for all to authenticated
using(bucket_id='fulfillment-proofs' and public.has_staff_role(array['owner','superadmin','super_admin','admin']))
with check(bucket_id='fulfillment-proofs' and public.has_staff_role(array['owner','superadmin','super_admin','admin']));

grant select on public.qc_records,public.qc_checklist_templates,public.qc_checklist_results,public.qc_files,public.qc_status_history,
 public.fulfillments,public.fulfillment_items,public.fulfillment_files,public.fulfillment_status_history to authenticated;
grant execute on function public.create_qc_record(uuid,integer,jsonb,text),public.register_qc_file(uuid,text,text,text,bigint),
 public.finalize_qc_record(uuid,integer,integer,text,text),public.archive_qc_record(uuid,text),public.restore_qc_record(uuid),
 public.permanently_delete_qc_record(uuid),public.create_fulfillment(uuid,text,text,text,text,text,integer,timestamptz,text,jsonb),
 public.update_fulfillment_tracking(uuid,text,text,text),public.transition_fulfillment_status(uuid,text,text),
 public.register_fulfillment_file(uuid,text,text,text,text,bigint),public.archive_fulfillment(uuid,text),
 public.restore_fulfillment(uuid),public.permanently_delete_fulfillment(uuid) to authenticated;;
