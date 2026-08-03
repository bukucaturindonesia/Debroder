create table if not exists public.job_orders (
  id uuid primary key default gen_random_uuid(),
  job_order_number text unique,
  order_id uuid not null references public.orders(id) on delete restrict,
  quotation_id uuid references public.quotations(id) on delete restrict,
  approved_mockup_set_id uuid references public.mockup_sets(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft','ready','released','in_progress','on_hold','completed','cancelled')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  target_date date,
  internal_notes text,
  production_notes text,
  order_snapshot jsonb not null default '{}'::jsonb,
  mockup_snapshot jsonb not null default '{}'::jsonb,
  payment_snapshot jsonb not null default '{}'::jsonb,
  released_by uuid references auth.users(id) on delete set null,
  released_at timestamptz,
  started_at timestamptz,
  paused_at timestamptz,
  resumed_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  progress_percentage numeric(5,2) not null default 0 check (progress_percentage between 0 and 100),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  archived_by uuid references auth.users(id) on delete set null,
  archive_reason text
);
create unique index if not exists job_orders_one_active_per_order
on public.job_orders(order_id)
where archived_at is null and status <> 'cancelled';
create index if not exists job_orders_status_idx on public.job_orders(status, target_date);
create index if not exists job_orders_order_idx on public.job_orders(order_id);

create table if not exists public.job_order_status_history (
  id uuid primary key default gen_random_uuid(),
  job_order_id uuid not null references public.job_orders(id) on delete cascade,
  from_status text,
  to_status text not null,
  note text,
  reason text,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists job_order_history_idx on public.job_order_status_history(job_order_id,changed_at desc);

create table if not exists public.job_order_revisions (
  id uuid primary key default gen_random_uuid(),
  job_order_id uuid not null references public.job_orders(id) on delete restrict,
  revision_number integer not null,
  reason text not null check (btrim(reason) <> ''),
  previous_snapshot jsonb not null,
  new_snapshot jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(job_order_id,revision_number)
);

create table if not exists public.work_items (
  id uuid primary key default gen_random_uuid(),
  work_item_number text unique,
  job_order_id uuid not null references public.job_orders(id) on delete restrict,
  source_order_item_id uuid references public.order_items(id) on delete restrict,
  source_order_item_service_id uuid references public.order_item_services(id) on delete restrict,
  source_mockup_part_id uuid references public.mockup_parts(id) on delete restrict,
  title text not null check (btrim(title) <> ''),
  description text,
  quantity integer not null default 1 check (quantity > 0),
  unit text not null default 'pcs',
  assigned_to uuid references auth.users(id) on delete set null,
  target_date date,
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  status text not null default 'draft' check (status in ('draft','ready','in_progress','on_hold','awaiting_qc','rework','completed','cancelled')),
  instruction_snapshot jsonb not null default '{}'::jsonb,
  approved_design_snapshot jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  paused_at timestamptz,
  resumed_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  archived_by uuid references auth.users(id) on delete set null,
  archive_reason text
);
create index if not exists work_items_job_idx on public.work_items(job_order_id,status);
create index if not exists work_items_assigned_idx on public.work_items(assigned_to,status);

create table if not exists public.work_item_dependencies (
  work_item_id uuid not null references public.work_items(id) on delete cascade,
  depends_on_work_item_id uuid not null references public.work_items(id) on delete restrict,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key(work_item_id,depends_on_work_item_id),
  check(work_item_id <> depends_on_work_item_id)
);

create table if not exists public.work_item_assignment_history (
  id uuid primary key default gen_random_uuid(),
  work_item_id uuid not null references public.work_items(id) on delete cascade,
  from_user_id uuid references auth.users(id) on delete set null,
  to_user_id uuid references auth.users(id) on delete set null,
  reason text,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);

create table if not exists public.work_item_status_history (
  id uuid primary key default gen_random_uuid(),
  work_item_id uuid not null references public.work_items(id) on delete cascade,
  from_status text,
  to_status text not null,
  note text,
  reason text,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists work_item_history_idx on public.work_item_status_history(work_item_id,changed_at desc);

create or replace function public.create_job_order(
  p_order_id uuid,
  p_target_date date default null,
  p_priority text default 'normal',
  p_internal_notes text default null,
  p_production_notes text default null,
  p_idempotency_key text default null
)
returns public.job_orders
language plpgsql security definer set search_path=public
as $$
declare o public.orders; m public.mockup_sets; jo public.job_orders; n text;
begin
  if not public.has_staff_role(array['owner','superadmin','super_admin','admin']) then raise exception 'Not authorized'; end if;
  select * into o from public.orders where id=p_order_id and archived_at is null for update;
  if not found then raise exception 'Active order not found'; end if;
  if o.status='dibatalkan' then raise exception 'Cancelled order cannot create Job Order'; end if;
  if not o.payment_production_eligible then raise exception 'Payment requirement not met'; end if;
  select * into m from public.mockup_sets
  where id=o.approved_mockup_set_id and status='approved' and archived_at is null;
  if not found then raise exception 'Approved mockup required'; end if;
  select * into jo from public.job_orders where order_id=o.id and archived_at is null and status<>'cancelled';
  if found then return jo; end if;
  if p_priority not in ('low','normal','high','urgent') then raise exception 'Invalid priority'; end if;

  insert into public.job_orders(
    order_id,quotation_id,approved_mockup_set_id,target_date,priority,internal_notes,production_notes,
    order_snapshot,mockup_snapshot,payment_snapshot,created_by,updated_by
  ) values(
    o.id,o.quotation_id,o.approved_mockup_set_id,p_target_date,p_priority,
    nullif(btrim(coalesce(p_internal_notes,'')),''),nullif(btrim(coalesce(p_production_notes,'')),''),
    to_jsonb(o),to_jsonb(m),
    jsonb_build_object('effective_total',o.payment_effective_total,'required_amount',o.payment_required_amount,
      'requirement_type',o.payment_requirement_type,'eligible',o.payment_production_eligible),
    auth.uid(),auth.uid()
  ) returning * into jo;

  n:=public.issue_document_number('job_order','job_order',jo.id,
    coalesce(nullif(p_idempotency_key,''),'job-order:'||o.id::text),jsonb_build_object('order_id',o.id));
  update public.job_orders set job_order_number=n where id=jo.id returning * into jo;

  insert into public.job_order_status_history(job_order_id,from_status,to_status,note,changed_by)
  values(jo.id,null,'draft','Job Order dibuat dari pesanan '||o.order_number,auth.uid());
  return jo;
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
language plpgsql security definer set search_path=public
as $$
declare old_row public.job_orders; new_row public.job_orders; rev int;
begin
  if not public.has_staff_role(array['owner','superadmin','super_admin','admin']) then raise exception 'Not authorized'; end if;
  select * into old_row from public.job_orders where id=p_job_order_id and archived_at is null for update;
  if not found then raise exception 'Job Order not found'; end if;
  if old_row.status not in ('draft','ready') then raise exception 'Released Job Order requires revision'; end if;
  if p_priority not in ('low','normal','high','urgent') then raise exception 'Invalid priority'; end if;

  update public.job_orders set target_date=p_target_date,priority=p_priority,
    internal_notes=nullif(btrim(coalesce(p_internal_notes,'')),''),
    production_notes=nullif(btrim(coalesce(p_production_notes,'')),''),
    updated_by=auth.uid(),updated_at=now()
  where id=p_job_order_id returning * into new_row;

  select coalesce(max(revision_number),0)+1 into rev from public.job_order_revisions where job_order_id=p_job_order_id;
  insert into public.job_order_revisions(job_order_id,revision_number,reason,previous_snapshot,new_snapshot,created_by)
  values(p_job_order_id,rev,coalesce(nullif(btrim(coalesce(p_reason,'')),''),'Pembaruan draft'),to_jsonb(old_row),to_jsonb(new_row),auth.uid());
  return new_row;
end $$;

create or replace function public.generate_job_order_work_items(p_job_order_id uuid)
returns integer
language plpgsql security definer set search_path=public
as $$
declare jo public.job_orders; oi public.order_items; os public.order_item_services; wi public.work_items; n text; count_created int:=0;
begin
  if not public.has_staff_role(array['owner','superadmin','super_admin','admin']) then raise exception 'Not authorized'; end if;
  select * into jo from public.job_orders where id=p_job_order_id and archived_at is null for update;
  if not found then raise exception 'Job Order not found'; end if;
  if jo.status not in ('draft','ready') then raise exception 'Work items can only be generated before release'; end if;

  for oi in select * from public.order_items where order_id=jo.order_id and archived_at is null order by created_at loop
    if not exists(select 1 from public.work_items where job_order_id=jo.id and source_order_item_id=oi.id and source_order_item_service_id is null and archived_at is null) then
      insert into public.work_items(job_order_id,source_order_item_id,title,description,quantity,unit,target_date,priority,
        instruction_snapshot,approved_design_snapshot,created_by,updated_by)
      values(jo.id,oi.id,oi.product_name,
        concat_ws(' · ',nullif(oi.variant_name,''),nullif(oi.color,''),nullif(oi.size,'')),
        oi.quantity,'pcs',jo.target_date,jo.priority,to_jsonb(oi),jo.mockup_snapshot,auth.uid(),auth.uid())
      returning * into wi;
      n:=public.issue_document_number('work_item','work_item',wi.id,'work-item:'||wi.id::text,jsonb_build_object('job_order_id',jo.id));
      update public.work_items set work_item_number=n where id=wi.id;
      count_created:=count_created+1;
    end if;

    for os in select * from public.order_item_services where order_item_id=oi.id order by created_at loop
      if not exists(select 1 from public.work_items where job_order_id=jo.id and source_order_item_service_id=os.id and archived_at is null) then
        insert into public.work_items(job_order_id,source_order_item_id,source_order_item_service_id,title,description,quantity,unit,
          target_date,priority,instruction_snapshot,approved_design_snapshot,created_by,updated_by)
        values(jo.id,oi.id,os.id,os.service_name,concat_ws(' · ',os.position,os.notes),os.quantity,'pcs',
          jo.target_date,jo.priority,to_jsonb(os),jo.mockup_snapshot,auth.uid(),auth.uid())
        returning * into wi;
        n:=public.issue_document_number('work_item','work_item',wi.id,'work-item:'||wi.id::text,jsonb_build_object('job_order_id',jo.id));
        update public.work_items set work_item_number=n where id=wi.id;
        count_created:=count_created+1;
      end if;
    end loop;
  end loop;
  return count_created;
end $$;

create or replace function public.create_work_item(
  p_job_order_id uuid,p_title text,p_description text,p_quantity integer,p_unit text,
  p_target_date date,p_priority text,p_source_mockup_part_id uuid default null
)
returns public.work_items language plpgsql security definer set search_path=public
as $$
declare jo public.job_orders; wi public.work_items; n text;
begin
 if not public.has_staff_role(array['owner','superadmin','super_admin','admin']) then raise exception 'Not authorized'; end if;
 select * into jo from public.job_orders where id=p_job_order_id and archived_at is null;
 if not found or jo.status not in ('draft','ready') then raise exception 'Editable Job Order required'; end if;
 if btrim(coalesce(p_title,''))='' or p_quantity<=0 then raise exception 'Invalid work item'; end if;
 insert into public.work_items(job_order_id,source_mockup_part_id,title,description,quantity,unit,target_date,priority,
   approved_design_snapshot,created_by,updated_by)
 values(jo.id,p_source_mockup_part_id,btrim(p_title),nullif(btrim(coalesce(p_description,'')),''),p_quantity,
   coalesce(nullif(btrim(coalesce(p_unit,'')),''),'pcs'),p_target_date,p_priority,jo.mockup_snapshot,auth.uid(),auth.uid())
 returning * into wi;
 n:=public.issue_document_number('work_item','work_item',wi.id,'work-item:'||wi.id::text,jsonb_build_object('job_order_id',jo.id));
 update public.work_items set work_item_number=n where id=wi.id returning * into wi;
 insert into public.work_item_status_history(work_item_id,from_status,to_status,note,changed_by)
 values(wi.id,null,'draft','Work Item dibuat',auth.uid());
 return wi;
end $$;

create or replace function public.assign_work_item(p_work_item_id uuid,p_assigned_to uuid,p_reason text default null)
returns public.work_items language plpgsql security definer set search_path=public
as $$
declare wi public.work_items; old_assignee uuid;
begin
 if not public.has_staff_role(array['owner','superadmin','super_admin','admin']) then raise exception 'Not authorized'; end if;
 perform 1 from public.profiles where id=p_assigned_to;
 if not found then raise exception 'Assignee not found'; end if;
 select * into wi from public.work_items where id=p_work_item_id and archived_at is null for update;
 if not found then raise exception 'Work Item not found'; end if;
 old_assignee:=wi.assigned_to;
 update public.work_items set assigned_to=p_assigned_to,updated_by=auth.uid(),updated_at=now()
 where id=wi.id returning * into wi;
 insert into public.work_item_assignment_history(work_item_id,from_user_id,to_user_id,reason,changed_by)
 values(wi.id,old_assignee,p_assigned_to,nullif(btrim(coalesce(p_reason,'')),''),auth.uid());
 return wi;
end $$;

create or replace function public.refresh_job_order_progress(p_job_order_id uuid)
returns public.job_orders language plpgsql security definer set search_path=public
as $$
declare total_count int; done_count int; pct numeric; jo public.job_orders;
begin
 select count(*),count(*) filter(where status='completed') into total_count,done_count
 from public.work_items where job_order_id=p_job_order_id and archived_at is null and status<>'cancelled';
 pct:=case when total_count=0 then 0 else round(done_count::numeric/total_count*100,2) end;
 update public.job_orders set progress_percentage=pct,updated_at=now() where id=p_job_order_id returning * into jo;
 return jo;
end $$;

create or replace function public.transition_job_order_status(
  p_job_order_id uuid,p_to_status text,p_note text default null,p_reason text default null
)
returns public.job_orders language plpgsql security definer set search_path=public
as $$
declare jo public.job_orders; old_status text; allowed boolean:=false; pending_count int; o public.orders;
begin
 if not public.has_staff_role(array['owner','superadmin','super_admin','admin']) then raise exception 'Not authorized'; end if;
 select * into jo from public.job_orders where id=p_job_order_id and archived_at is null for update;
 if not found then raise exception 'Job Order not found'; end if;
 old_status:=jo.status;
 allowed:=case old_status
  when 'draft' then p_to_status in ('ready','cancelled')
  when 'ready' then p_to_status in ('draft','released','cancelled')
  when 'released' then p_to_status in ('in_progress','on_hold','cancelled')
  when 'in_progress' then p_to_status in ('on_hold','completed','cancelled')
  when 'on_hold' then p_to_status in ('in_progress','cancelled')
  else false end;
 if not allowed then raise exception 'Transition not allowed'; end if;
 if p_to_status in ('on_hold','cancelled') and btrim(coalesce(p_reason,''))='' then raise exception 'Reason required'; end if;
 if p_to_status='ready' and not exists(select 1 from public.work_items where job_order_id=jo.id and archived_at is null) then raise exception 'Work Items required'; end if;
 if p_to_status='released' then
   select * into o from public.orders where id=jo.order_id for update;
   if o.archived_at is not null or o.status='dibatalkan' or not o.payment_production_eligible then raise exception 'Order is not production eligible'; end if;
   if exists(select 1 from public.work_items where job_order_id=jo.id and archived_at is null and status<>'ready') then raise exception 'All Work Items must be ready'; end if;
 end if;
 if p_to_status='completed' then
   select count(*) into pending_count from public.work_items where job_order_id=jo.id and archived_at is null and status not in ('completed','cancelled');
   if pending_count>0 then raise exception 'Active Work Items remain'; end if;
 end if;
 update public.job_orders set status=p_to_status,updated_by=auth.uid(),updated_at=now(),
   released_by=case when p_to_status='released' then auth.uid() else released_by end,
   released_at=case when p_to_status='released' then now() else released_at end,
   started_at=case when p_to_status='in_progress' and started_at is null then now() else started_at end,
   paused_at=case when p_to_status='on_hold' then now() else paused_at end,
   resumed_at=case when old_status='on_hold' and p_to_status='in_progress' then now() else resumed_at end,
   completed_at=case when p_to_status='completed' then now() else completed_at end,
   cancelled_at=case when p_to_status='cancelled' then now() else cancelled_at end,
   cancel_reason=case when p_to_status='cancelled' then p_reason else cancel_reason end
 where id=jo.id returning * into jo;
 insert into public.job_order_status_history(job_order_id,from_status,to_status,note,reason,changed_by)
 values(jo.id,old_status,p_to_status,nullif(btrim(coalesce(p_note,'')),''),nullif(btrim(coalesce(p_reason,'')),''),auth.uid());
 return jo;
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
 if p_to_status in ('in_progress','on_hold','awaiting_qc','rework','completed') and jo.status not in ('released','in_progress','on_hold') then
   raise exception 'Job Order is not released';
 end if;
 if jo.status='on_hold' and p_to_status in ('in_progress','awaiting_qc','completed') then raise exception 'Job Order is on hold'; end if;
 if exists(select 1 from public.work_item_dependencies d join public.work_items dep on dep.id=d.depends_on_work_item_id
   where d.work_item_id=wi.id and dep.status<>'completed') and p_to_status='in_progress' then raise exception 'Dependencies not completed'; end if;
 if p_to_status in ('on_hold','cancelled','rework') and btrim(coalesce(p_reason,''))='' then raise exception 'Reason required'; end if;

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

create or replace function public.archive_job_order(p_job_order_id uuid,p_reason text default null)
returns public.job_orders language plpgsql security definer set search_path=public
as $$
declare jo public.job_orders;
begin
 if not public.has_staff_role(array['owner','superadmin','super_admin','admin']) then raise exception 'Not authorized'; end if;
 update public.job_orders set archived_at=now(),archived_by=auth.uid(),archive_reason=nullif(btrim(coalesce(p_reason,'')),'')
 where id=p_job_order_id and archived_at is null and status in ('draft','completed','cancelled')
 returning * into jo;
 if not found then raise exception 'Job Order must be draft, completed, or cancelled'; end if;
 return jo;
end $$;

create or replace function public.restore_job_order(p_job_order_id uuid)
returns public.job_orders language plpgsql security definer set search_path=public
as $$
declare jo public.job_orders;
begin
 if not public.has_staff_role(array['owner','superadmin','super_admin','admin']) then raise exception 'Not authorized'; end if;
 update public.job_orders set archived_at=null,archived_by=null,archive_reason=null,updated_by=auth.uid(),updated_at=now()
 where id=p_job_order_id and archived_at is not null returning * into jo;
 if not found then raise exception 'Archived Job Order not found'; end if;
 return jo;
end $$;

create or replace function public.permanently_delete_job_order(p_job_order_id uuid)
returns void language plpgsql security definer set search_path=public
as $$
begin
 if not public.has_staff_role(array['superadmin','super_admin']) then raise exception 'Only Super Admin'; end if;
 if exists(select 1 from public.job_orders where id=p_job_order_id and archived_at is null) then raise exception 'Job Order must be archived'; end if;
 if exists(select 1 from public.job_orders where id=p_job_order_id and status not in ('draft','cancelled')) then raise exception 'Only draft or cancelled Job Order can be deleted'; end if;
 delete from public.job_orders where id=p_job_order_id and archived_at is not null;
 if not found then raise exception 'Archived Job Order not found'; end if;
end $$;

create or replace function public.archive_work_item(p_work_item_id uuid,p_reason text default null)
returns public.work_items language plpgsql security definer set search_path=public
as $$
declare wi public.work_items;
begin
 if not public.has_staff_role(array['owner','superadmin','super_admin','admin']) then raise exception 'Not authorized'; end if;
 update public.work_items set archived_at=now(),archived_by=auth.uid(),archive_reason=nullif(btrim(coalesce(p_reason,'')),'')
 where id=p_work_item_id and archived_at is null and status in ('draft','completed','cancelled')
 returning * into wi;
 if not found then raise exception 'Work Item must be draft, completed, or cancelled'; end if;
 perform public.refresh_job_order_progress(wi.job_order_id); return wi;
end $$;

create or replace function public.restore_work_item(p_work_item_id uuid)
returns public.work_items language plpgsql security definer set search_path=public
as $$
declare wi public.work_items;
begin
 if not public.has_staff_role(array['owner','superadmin','super_admin','admin']) then raise exception 'Not authorized'; end if;
 update public.work_items set archived_at=null,archived_by=null,archive_reason=null,updated_by=auth.uid(),updated_at=now()
 where id=p_work_item_id and archived_at is not null returning * into wi;
 if not found then raise exception 'Archived Work Item not found'; end if;
 perform public.refresh_job_order_progress(wi.job_order_id); return wi;
end $$;

create or replace function public.permanently_delete_work_item(p_work_item_id uuid)
returns void language plpgsql security definer set search_path=public
as $$
begin
 if not public.has_staff_role(array['superadmin','super_admin']) then raise exception 'Only Super Admin'; end if;
 delete from public.work_items where id=p_work_item_id and archived_at is not null and status in ('draft','cancelled');
 if not found then raise exception 'Archived draft/cancelled Work Item not found'; end if;
end $$;

alter table public.job_orders enable row level security;
alter table public.job_order_status_history enable row level security;
alter table public.job_order_revisions enable row level security;
alter table public.work_items enable row level security;
alter table public.work_item_dependencies enable row level security;
alter table public.work_item_assignment_history enable row level security;
alter table public.work_item_status_history enable row level security;

do $$
declare t text;
begin
 foreach t in array array['job_orders','job_order_status_history','job_order_revisions','work_items','work_item_dependencies','work_item_assignment_history','work_item_status_history']
 loop
   execute format('drop policy if exists "staff read %s" on public.%I',t,t);
   execute format('create policy "staff read %s" on public.%I for select to authenticated using(public.has_staff_role(array[''owner'',''superadmin'',''super_admin'',''sales_admin'',''admin'']))',t,t);
 end loop;
end $$;

grant select on public.job_orders,public.job_order_status_history,public.job_order_revisions,
 public.work_items,public.work_item_dependencies,public.work_item_assignment_history,public.work_item_status_history to authenticated;
grant execute on function public.create_job_order(uuid,date,text,text,text,text),
 public.update_job_order_draft(uuid,date,text,text,text,text),
 public.generate_job_order_work_items(uuid),
 public.create_work_item(uuid,text,text,integer,text,date,text,uuid),
 public.assign_work_item(uuid,uuid,text),
 public.transition_job_order_status(uuid,text,text,text),
 public.transition_work_item_status(uuid,text,text,text),
 public.archive_job_order(uuid,text),public.restore_job_order(uuid),public.permanently_delete_job_order(uuid),
 public.archive_work_item(uuid,text),public.restore_work_item(uuid),public.permanently_delete_work_item(uuid) to authenticated;;
