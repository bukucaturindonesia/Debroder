begin;

-- DEBRODER Order Integrity & Handoff Foundation v1.0 — Phase 4-13
-- Forward-only, additive, idempotent, and compatible with Phase 0-3.
-- This migration does not delete or rewrite historical order/payment records.

-- ---------------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------------
insert into public.permission_definitions(permission_key,module,label,description)
values
  ('operations.read','operations','Lihat operasional pesanan','Melihat tugas, pickup, stok lokasi, outbox, refund, dan kesehatan operasional.'),
  ('operations.manage','operations','Kelola operasional pesanan','Menjalankan handoff, pickup, transfer stok, SLA, dan rekonsiliasi.'),
  ('inventory.location.read','inventory','Lihat stok per lokasi','Melihat lokasi, saldo, perpindahan, dan transfer stok.'),
  ('inventory.location.manage','inventory','Kelola stok per lokasi','Membuat dan menerima transfer serta menyiapkan stok pickup.'),
  ('refund.read','payment','Lihat pembatalan dan refund','Melihat permintaan pembatalan, alokasi refund, dan bukti transfer refund.'),
  ('refund.manage','payment','Kelola pembatalan dan refund','Memutuskan pembatalan serta memproses refund dengan bukti transfer.'),
  ('customer.outbox.read','notification','Lihat outbox pelanggan','Melihat antrean komunikasi pelanggan.'),
  ('customer.outbox.manage','notification','Kelola outbox pelanggan','Menyiapkan, mengirim, gagal, dan mengulang komunikasi pelanggan.'),
  ('operations.health.read','operations','Lihat kesehatan operasional','Melihat hasil rekonsiliasi order, payment, task, pickup, refund, outbox, dan stok.'),
  ('operations.health.manage','operations','Jalankan rekonsiliasi operasional','Menjalankan SLA, pickup deadline, dan pemeriksaan kesehatan operasional.')
on conflict(permission_key) do update
set module=excluded.module,label=excluded.label,description=excluded.description;

insert into public.role_permissions(role,permission_key,granted,updated_by,updated_at)
select role_value, permission_value, true, null, now()
from unnest(array['owner','superadmin','super_admin','admin']) role_value
cross join unnest(array[
  'operations.read','operations.manage','inventory.location.read','inventory.location.manage',
  'refund.read','refund.manage','customer.outbox.read','customer.outbox.manage',
  'operations.health.read','operations.health.manage'
]) permission_value
on conflict(role,permission_key) do update set granted=true,updated_by=null,updated_at=now();

insert into public.role_permissions(role,permission_key,granted,updated_by,updated_at)
values
  ('sales_admin','operations.read',true,null,now()),
  ('sales_admin','operations.manage',true,null,now()),
  ('sales_admin','refund.read',true,null,now()),
  ('sales_admin','customer.outbox.read',true,null,now()),
  ('finance','operations.read',true,null,now()),
  ('finance','operations.manage',true,null,now()),
  ('finance','refund.read',true,null,now()),
  ('finance','refund.manage',true,null,now()),
  ('finance','customer.outbox.read',true,null,now()),
  ('finance','customer.outbox.manage',true,null,now()),
  ('production_admin','operations.read',true,null,now()),
  ('production_admin','operations.manage',true,null,now()),
  ('production_admin','inventory.location.read',true,null,now()),
  ('operator','operations.read',true,null,now()),
  ('quality_control','operations.read',true,null,now()),
  ('quality_control','operations.manage',true,null,now()),
  ('quality_control','order.task.read',true,null,now()),
  ('quality_control','order.task.manage',true,null,now()),
  ('store_staff','operations.read',true,null,now()),
  ('store_staff','operations.manage',true,null,now()),
  ('store_staff','inventory.location.read',true,null,now()),
  ('store_staff','inventory.location.manage',true,null,now()),
  ('store_staff','customer.outbox.read',true,null,now()),
  ('store_staff','customer.outbox.manage',true,null,now())
on conflict(role,permission_key) do update set granted=excluded.granted,updated_by=null,updated_at=now();

-- ---------------------------------------------------------------------------
-- Phase 11: SLA and stronger role-aware Task Ledger access
-- ---------------------------------------------------------------------------
alter table public.order_tasks drop constraint if exists order_tasks_task_type_check;
alter table public.order_tasks add constraint order_tasks_task_type_check check(task_type in (
  'review_new_order','review_custom_order','set_shipping_quote','prepare_custom_quote',
  'review_payment','resolve_payment_correction','create_job_order','prepare_ready_stock',
  'run_production','run_quality_control','pack_order','run_final_check','dispatch_shipping',
  'handover_pickup','resolve_integrity','stock_transfer','pickup_prepare',
  'pickup_extension_review','pickup_no_show','cancellation_review','refund_process',
  'customer_contact','shipping_exception','outbox_failure','health_reconcile'
));

create table if not exists public.order_task_sla_policies(
  task_type text primary key,
  duration_minutes integer not null check(duration_minutes between 5 and 43200),
  warning_minutes integer not null default 15 check(warning_minutes >= 0),
  escalation_role text not null default 'admin',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

insert into public.order_task_sla_policies(task_type,duration_minutes,warning_minutes,escalation_role)
values
  ('review_new_order',15,5,'admin'),('review_custom_order',30,10,'admin'),
  ('set_shipping_quote',120,30,'admin'),('prepare_custom_quote',240,60,'admin'),
  ('review_payment',30,10,'admin'),('resolve_payment_correction',120,30,'admin'),
  ('create_job_order',120,30,'admin'),('prepare_ready_stock',240,60,'admin'),
  ('run_production',1440,120,'production_admin'),('run_quality_control',240,60,'quality_control'),
  ('pack_order',240,60,'store_staff'),('run_final_check',120,30,'store_staff'),
  ('dispatch_shipping',240,60,'store_staff'),('handover_pickup',4320,720,'store_staff'),
  ('resolve_integrity',60,15,'super_admin'),('stock_transfer',480,120,'store_staff'),
  ('pickup_prepare',240,60,'store_staff'),('pickup_extension_review',120,30,'admin'),
  ('pickup_no_show',240,60,'admin'),('cancellation_review',120,30,'admin'),
  ('refund_process',1440,240,'finance'),('customer_contact',240,60,'sales_admin'),
  ('shipping_exception',120,30,'admin'),('outbox_failure',120,30,'admin'),
  ('health_reconcile',120,30,'super_admin')
on conflict(task_type) do update
set duration_minutes=excluded.duration_minutes,warning_minutes=excluded.warning_minutes,
    escalation_role=excluded.escalation_role,active=true,updated_at=now();

create or replace function public.apply_order_task_sla_v1()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare policy_row public.order_task_sla_policies;
begin
  if new.due_at is null or tg_op='INSERT' or new.task_type is distinct from old.task_type then
    select * into policy_row from public.order_task_sla_policies
    where task_type=new.task_type and active=true;
    if found then new.due_at:=coalesce(new.created_at,now())+make_interval(mins=>policy_row.duration_minutes); end if;
  end if;
  return new;
end
$$;
revoke all on function public.apply_order_task_sla_v1() from public,anon,authenticated;
grant execute on function public.apply_order_task_sla_v1() to service_role;
drop trigger if exists apply_order_task_sla_v1 on public.order_tasks;
create trigger apply_order_task_sla_v1 before insert or update of task_type,due_at on public.order_tasks
for each row execute function public.apply_order_task_sla_v1();

-- RLS is role/assignment aware. Broad managers can see every task. Operational
-- staff only see tasks assigned to their role or user. This closes direct-table
-- access outside the UI.
drop policy if exists "order tasks readable by permitted staff" on public.order_tasks;
drop policy if exists "order task history readable by permitted staff" on public.order_task_history;
drop policy if exists "order tasks readable by role or assignment" on public.order_tasks;
drop policy if exists "order task history readable through visible task" on public.order_task_history;
create policy "order tasks readable by role or assignment"
on public.order_tasks for select to authenticated
using (
  public.has_permission('order.task.read') and (
    public.current_actor_role() in ('owner','superadmin','super_admin','admin')
    or assigned_to=auth.uid()
    or (assigned_to is null and assigned_role=public.current_actor_role())
  )
);
create policy "order task history readable through visible task"
on public.order_task_history for select to authenticated
using (
  public.has_permission('order.task.read') and exists(
    select 1 from public.order_tasks t where t.id=order_task_history.task_id and (
      public.current_actor_role() in ('owner','superadmin','super_admin','admin')
      or t.assigned_to=auth.uid()
      or (t.assigned_to is null and t.assigned_role=public.current_actor_role())
    )
  )
);

create or replace function public.update_order_task_v1(
  p_task_id uuid,
  p_action text,
  p_assigned_to uuid default null,
  p_reason text default null
)
returns public.order_tasks
language plpgsql
security definer
set search_path=''
as $$
declare
  row_value public.order_tasks;
  actor_role_value text;
  broad_manager boolean := false;
begin
  if not public.has_permission('order.task.manage') then
    raise exception 'Tidak berwenang mengelola tugas pesanan';
  end if;
  if p_action not in ('acknowledge','start','block','resolve','cancel','assign') then
    raise exception 'Aksi tugas tidak valid';
  end if;
  if p_action in ('block','resolve','cancel') and length(trim(coalesce(p_reason,''))) < 3 then
    raise exception 'Alasan wajib diisi';
  end if;

  select * into row_value from public.order_tasks where id=p_task_id and archived_at is null for update;
  if not found then raise exception 'Tugas tidak ditemukan'; end if;

  actor_role_value := public.current_actor_role();
  broad_manager := actor_role_value in ('owner','superadmin','super_admin','admin');
  if not broad_manager and (
    (row_value.assigned_to is not null and row_value.assigned_to is distinct from auth.uid())
    or (row_value.assigned_to is null and row_value.assigned_role is distinct from actor_role_value)
  ) then
    raise exception 'Tugas berada di luar kewenangan Anda';
  end if;
  if p_action='assign' and not broad_manager
     and (p_assigned_to is distinct from auth.uid() or row_value.assigned_role is distinct from actor_role_value) then
    raise exception 'Role operasional hanya dapat mengambil tugasnya sendiri';
  end if;

  update public.order_tasks set
    status = case p_action
      when 'acknowledge' then 'acknowledged'
      when 'start' then 'in_progress'
      when 'block' then 'blocked'
      when 'resolve' then 'resolved'
      when 'cancel' then 'cancelled'
      else status end,
    assigned_to = case when p_action='assign' then p_assigned_to when p_action='start' and assigned_to is null then auth.uid() else assigned_to end,
    acknowledged_at = case when p_action='acknowledge' then now() else acknowledged_at end,
    acknowledged_by = case when p_action='acknowledge' then auth.uid() else acknowledged_by end,
    started_at = case when p_action='start' then now() else started_at end,
    blocked_at = case when p_action='block' then now() else blocked_at end,
    blocked_reason = case when p_action='block' then trim(p_reason) when p_action in ('start','resolve') then null else blocked_reason end,
    resolved_at = case when p_action in ('resolve','cancel') then now() else resolved_at end,
    resolved_by = case when p_action in ('resolve','cancel') then auth.uid() else resolved_by end,
    resolution = case when p_action in ('resolve','cancel') then trim(p_reason) else resolution end,
    updated_at = now(),
    updated_by = auth.uid()
  where id=p_task_id
  returning * into row_value;

  insert into public.system_audit_log(entity_type,entity_id,action,actor_id,actor_role,source,reason,new_value)
  values('order_task',row_value.id,'order_task_'||p_action,auth.uid(),public.current_actor_role(),'order_task_ledger',p_reason,to_jsonb(row_value));
  return row_value;
end
$$;
revoke all on function public.update_order_task_v1(uuid,text,uuid,text) from public,anon;
grant execute on function public.update_order_task_v1(uuid,text,uuid,text) to authenticated,service_role;

create or replace function public.escalate_overdue_order_tasks_v1()
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare affected integer;
begin
  if auth.role()<>'service_role' and not public.has_permission('operations.health.manage') then
    raise exception 'Tidak berwenang menjalankan eskalasi tugas';
  end if;
  update public.order_tasks t
  set escalated_at=coalesce(t.escalated_at,now()),priority='urgent',updated_at=now(),updated_by=auth.uid(),
      assigned_role=case when t.assigned_to is null then coalesce(p.escalation_role,t.assigned_role) else t.assigned_role end
  from public.order_task_sla_policies p
  where p.task_type=t.task_type and p.active=true and t.archived_at is null
    and t.status in ('open','acknowledged','in_progress','blocked')
    and t.due_at is not null and t.due_at<now() and t.escalated_at is null;
  get diagnostics affected=row_count;
  return affected;
end
$$;
revoke all on function public.escalate_overdue_order_tasks_v1() from public,anon;
grant execute on function public.escalate_overdue_order_tasks_v1() to authenticated,service_role;

-- ---------------------------------------------------------------------------
-- Phase 9: Customer notification outbox
-- ---------------------------------------------------------------------------
create table if not exists public.customer_notification_outbox(
  id uuid primary key default gen_random_uuid(),
  event_key text not null,
  order_id uuid not null references public.orders(id) on delete restrict,
  event_type text not null,
  channel text not null check(channel in ('whatsapp_manual','email_manual','in_app')),
  recipient text not null,
  template_code text not null default 'order_stage_changed',
  payload jsonb not null default '{}'::jsonb,
  prepared_content text,
  status text not null default 'queued' check(status in ('queued','prepared','sent','failed','cancelled')),
  attempt_count integer not null default 0 check(attempt_count>=0),
  next_attempt_at timestamptz,
  prepared_at timestamptz,
  sent_at timestamptz,
  failed_at timestamptz,
  last_error text,
  related_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  unique(event_key,channel)
);
create index if not exists customer_outbox_queue_idx on public.customer_notification_outbox(status,next_attempt_at,created_at)
where status in ('queued','prepared','failed');
create index if not exists customer_outbox_order_idx on public.customer_notification_outbox(order_id,created_at desc);

alter table public.customer_notification_outbox enable row level security;
revoke all on public.customer_notification_outbox from public,anon,authenticated;
grant select on public.customer_notification_outbox to authenticated;
grant all on public.customer_notification_outbox to service_role;
drop policy if exists "customer outbox readable by permitted staff" on public.customer_notification_outbox;
create policy "customer outbox readable by permitted staff" on public.customer_notification_outbox
for select to authenticated using(public.has_permission('customer.outbox.read'));

create or replace function public.enqueue_customer_notification_v1(
  p_order_id uuid,p_event_type text,p_event_key text,p_payload jsonb default '{}'::jsonb
)
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare o public.orders; inserted_count integer:=0; path_value text;
begin
  select * into o from public.orders where id=p_order_id;
  if not found then raise exception 'Pesanan tidak ditemukan'; end if;
  path_value:=format('/track-order/%s',o.order_number);
  if nullif(btrim(coalesce(o.customer_phone,'')),'') is not null then
    insert into public.customer_notification_outbox(event_key,order_id,event_type,channel,recipient,payload,related_path)
    values(p_event_key,p_order_id,p_event_type,'whatsapp_manual',o.customer_phone,
      coalesce(p_payload,'{}'::jsonb)||jsonb_build_object('order_number',o.order_number,'customer_name',o.customer_name),path_value)
    on conflict(event_key,channel) do update set recipient=excluded.recipient,payload=excluded.payload,related_path=excluded.related_path,updated_at=now();
    inserted_count:=inserted_count+1;
  end if;
  if nullif(btrim(coalesce(o.customer_email,'')),'') is not null then
    insert into public.customer_notification_outbox(event_key,order_id,event_type,channel,recipient,payload,related_path)
    values(p_event_key,p_order_id,p_event_type,'email_manual',o.customer_email,
      coalesce(p_payload,'{}'::jsonb)||jsonb_build_object('order_number',o.order_number,'customer_name',o.customer_name),path_value)
    on conflict(event_key,channel) do update set recipient=excluded.recipient,payload=excluded.payload,related_path=excluded.related_path,updated_at=now();
    inserted_count:=inserted_count+1;
  end if;
  return inserted_count;
end
$$;
revoke all on function public.enqueue_customer_notification_v1(uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.enqueue_customer_notification_v1(uuid,text,text,jsonb) to service_role;

create or replace function public.update_customer_outbox_v1(
  p_outbox_id uuid,p_action text,p_content text default null,p_error text default null
)
returns public.customer_notification_outbox
language plpgsql
security definer
set search_path=''
as $$
declare row_value public.customer_notification_outbox;
begin
  if not public.has_permission('customer.outbox.manage') then raise exception 'Tidak berwenang mengelola outbox pelanggan'; end if;
  if p_action not in ('prepare','sent','failed','retry','cancel') then raise exception 'Aksi outbox tidak valid'; end if;
  select * into row_value from public.customer_notification_outbox where id=p_outbox_id for update;
  if not found then raise exception 'Outbox tidak ditemukan'; end if;
  update public.customer_notification_outbox set
    status=case p_action when 'prepare' then 'prepared' when 'sent' then 'sent' when 'failed' then 'failed' when 'retry' then 'queued' else 'cancelled' end,
    prepared_content=case when p_action='prepare' then nullif(btrim(coalesce(p_content,'')),'') else prepared_content end,
    prepared_at=case when p_action='prepare' then now() else prepared_at end,
    sent_at=case when p_action='sent' then now() when p_action='retry' then null else sent_at end,
    failed_at=case when p_action='failed' then now() when p_action='retry' then null else failed_at end,
    last_error=case when p_action='failed' then left(coalesce(p_error,'Pengiriman gagal'),1000) when p_action='retry' then null else last_error end,
    attempt_count=case when p_action in ('sent','failed') then attempt_count+1 else attempt_count end,
    next_attempt_at=case when p_action='retry' then now() else next_attempt_at end,
    updated_at=now(),updated_by=auth.uid()
  where id=p_outbox_id returning * into row_value;
  return row_value;
end
$$;
revoke all on function public.update_customer_outbox_v1(uuid,text,text,text) from public,anon;
grant execute on function public.update_customer_outbox_v1(uuid,text,text,text) to authenticated,service_role;

create or replace function public.sync_customer_outbox_failure_task_v1()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare key_value text:=format('order:%s:outbox_failure:%s',new.order_id,new.id);
begin
  if new.status='failed' then
    insert into public.order_tasks(
      task_key,order_id,task_type,status,priority,assigned_role,title,description,related_path,stage_snapshot
    ) values (
      key_value,new.order_id,'outbox_failure','open','high','admin',
      'Ulangi Komunikasi Pelanggan',
      coalesce(nullif(btrim(new.last_error),''),'Komunikasi pelanggan gagal dan perlu diperiksa.'),
      format('/admin/customer-outbox?order=%s',new.order_id),
      jsonb_build_object('outbox_id',new.id,'channel',new.channel,'attempt_count',new.attempt_count,'next_attempt_at',new.next_attempt_at)
    )
    on conflict(task_key) do update
    set status=case when public.order_tasks.status in ('resolved','cancelled') then 'open' else public.order_tasks.status end,
        priority='high',description=excluded.description,stage_snapshot=excluded.stage_snapshot,
        resolved_at=case when public.order_tasks.status in ('resolved','cancelled') then null else public.order_tasks.resolved_at end,
        resolved_by=case when public.order_tasks.status in ('resolved','cancelled') then null else public.order_tasks.resolved_by end,
        resolution=case when public.order_tasks.status in ('resolved','cancelled') then null else public.order_tasks.resolution end,
        updated_at=now();
  else
    update public.order_tasks
    set status='resolved',resolved_at=now(),resolution='Outbox tidak lagi berstatus gagal',updated_at=now()
    where task_key=key_value and status in ('open','acknowledged','in_progress','blocked');
  end if;
  return new;
end
$$;
revoke all on function public.sync_customer_outbox_failure_task_v1() from public,anon,authenticated;
grant execute on function public.sync_customer_outbox_failure_task_v1() to service_role;
drop trigger if exists sync_customer_outbox_failure_task_v1 on public.customer_notification_outbox;
create trigger sync_customer_outbox_failure_task_v1
after insert or update of status,last_error,attempt_count,next_attempt_at on public.customer_notification_outbox
for each row execute function public.sync_customer_outbox_failure_task_v1();

-- ---------------------------------------------------------------------------
-- Phase 4: transactional customer-admin handoff
-- ---------------------------------------------------------------------------
create table if not exists public.order_handoff_state(
  order_id uuid primary key references public.orders(id) on delete restrict,
  stage_key text not null,
  stage_snapshot jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz not null default now()
);
alter table public.order_handoff_state enable row level security;
revoke all on public.order_handoff_state from public,anon,authenticated;
grant select on public.order_handoff_state to authenticated;
grant all on public.order_handoff_state to service_role;
drop policy if exists "handoff state readable by operations" on public.order_handoff_state;
create policy "handoff state readable by operations" on public.order_handoff_state
for select to authenticated using(public.has_permission('operations.read'));

create or replace function public.customer_event_type_for_stage_v1(p_stage jsonb)
returns text language sql immutable set search_path='' as $$
  select case p_stage->>'activeStage'
    when 'whatsapp_confirmation' then 'order_created'
    when 'order_review' then 'order_under_review'
    when 'custom_pricing' then 'custom_pricing_started'
    when 'shipping_quote' then 'shipping_quote_update'
    when 'customer_approval' then 'customer_approval_required'
    when 'payment_pending' then 'payment_instructions_available'
    when 'payment_review' then 'payment_submitted'
    when 'payment_correction' then 'payment_correction_requested'
    when 'payment_balance_due' then 'payment_balance_due'
    when 'job_order_required' then 'payment_verified'
    when 'preparing_goods' then 'goods_preparing'
    when 'production' then 'production_started'
    when 'quality_control' then 'quality_control'
    when 'packing' then 'packing'
    when 'final_check' then 'final_check'
    when 'final_check_completed' then 'final_check_completed'
    when 'ready_to_ship' then 'ready_to_ship'
    when 'shipping' then 'shipping_update'
    when 'ready_for_pickup' then 'ready_for_pickup'
    when 'completed' then 'completed'
    when 'cancelled' then 'cancelled'
    when 'expired' then 'expired'
    when 'integrity_review' then 'status_under_review'
    else 'order_stage_changed' end
$$;

-- Phase 4 preserves exception tasks (refund, cancellation, no-show, outbox,
-- health) until their own workflow resolves them. Canonical stage changes only
-- close the single lifecycle task from Phase 0-3.
create or replace function public.sync_order_operational_task_v1(
  p_order_id uuid,
  p_source_event_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  stage jsonb;
  key_value text;
  type_value text;
  task_id_value uuid;
  terminal_value boolean;
  priority_value text := 'normal';
begin
  perform public.refresh_order_integrity_v1(p_order_id);
  stage := public._resolve_order_active_stage_v1(p_order_id);
  key_value := nullif(stage->>'taskKey','');
  type_value := nullif(stage->>'adminTaskType','');
  terminal_value := coalesce((stage->>'isTerminal')::boolean,false);

  if stage->>'activeStage' in ('payment_review','integrity_review') or stage->>'warning' is not null then
    priority_value := 'high';
  end if;

  update public.order_tasks
  set status = case when terminal_value then 'cancelled' else 'resolved' end,
      resolved_at = now(),
      resolved_by = auth.uid(),
      resolution = case when terminal_value then 'Order terminal; tugas lifecycle ditutup otomatis.' else 'Tahap canonical telah berubah.' end,
      updated_at = now(),
      updated_by = auth.uid()
  where order_id=p_order_id
    and archived_at is null
    and status in ('open','acknowledged','in_progress','blocked')
    and task_type in (
      'review_new_order','review_custom_order','set_shipping_quote','prepare_custom_quote',
      'review_payment','resolve_payment_correction','create_job_order','prepare_ready_stock',
      'run_production','run_quality_control','pack_order','run_final_check',
      'dispatch_shipping','handover_pickup','resolve_integrity'
    )
    and (key_value is null or task_key<>key_value);

  if key_value is null or type_value is null then return null; end if;

  insert into public.order_tasks(
    task_key,order_id,task_type,status,priority,assigned_role,source_event_id,
    title,description,related_path,stage_snapshot,created_at,updated_at
  ) values (
    key_value,p_order_id,type_value,'open',priority_value,
    case type_value
      when 'review_new_order' then 'sales_admin'
      when 'review_custom_order' then 'sales_admin'
      when 'set_shipping_quote' then 'sales_admin'
      when 'prepare_custom_quote' then 'sales_admin'
      when 'review_payment' then 'finance'
      when 'resolve_payment_correction' then 'finance'
      when 'create_job_order' then 'production_admin'
      when 'run_production' then 'production_admin'
      when 'run_quality_control' then 'quality_control'
      when 'prepare_ready_stock' then 'store_staff'
      when 'pack_order' then 'store_staff'
      when 'run_final_check' then 'store_staff'
      when 'dispatch_shipping' then 'store_staff'
      when 'handover_pickup' then 'store_staff'
      else 'admin'
    end,
    p_source_event_id,
    stage->>'adminStatusLabel',
    coalesce(stage->>'blockingReason','Tindak lanjuti tahap aktif pesanan.'),
    format('/admin/orders/%s',p_order_id),
    stage,now(),now()
  )
  on conflict(task_key) do update
  set status=case when public.order_tasks.status in ('resolved','cancelled') then 'open' else public.order_tasks.status end,
      priority=excluded.priority,
      assigned_role=excluded.assigned_role,
      source_event_id=coalesce(excluded.source_event_id,public.order_tasks.source_event_id),
      title=excluded.title,
      description=excluded.description,
      related_path=excluded.related_path,
      stage_snapshot=excluded.stage_snapshot,
      resolved_at=case when public.order_tasks.status in ('resolved','cancelled') then null else public.order_tasks.resolved_at end,
      resolved_by=case when public.order_tasks.status in ('resolved','cancelled') then null else public.order_tasks.resolved_by end,
      resolution=case when public.order_tasks.status in ('resolved','cancelled') then null else public.order_tasks.resolution end,
      updated_at=now()
  returning id into task_id_value;
  return task_id_value;
end
$$;
revoke all on function public.sync_order_operational_task_v1(uuid,uuid) from public,anon,authenticated;
grant execute on function public.sync_order_operational_task_v1(uuid,uuid) to service_role;

create or replace function public.sync_order_handoff_v2(p_order_id uuid,p_source_event_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare stage jsonb; previous public.order_handoff_state; key_value text; event_type_value text; task_id_value uuid;
begin
  task_id_value:=public.sync_order_operational_task_v1(p_order_id,p_source_event_id);
  stage:=public._resolve_order_active_stage_v1(p_order_id);
  key_value:=concat_ws(':',coalesce(stage->>'activeStage','unknown'),coalesce(stage->>'taskKey','none'),coalesce(stage->>'customerStatusLabel','status'));
  select * into previous from public.order_handoff_state where order_id=p_order_id for update;
  if not found then
    insert into public.order_handoff_state(order_id,stage_key,stage_snapshot,last_synced_at)
    values(p_order_id,key_value,stage,now());
  elsif previous.stage_key is distinct from key_value then
    update public.order_handoff_state set stage_key=key_value,stage_snapshot=stage,last_synced_at=now() where order_id=p_order_id;
    event_type_value:=public.customer_event_type_for_stage_v1(stage);
    perform public.enqueue_customer_notification_v1(
      p_order_id,event_type_value,format('order:%s:stage:%s',p_order_id,encode(digest(key_value,'sha256'),'hex')),
      jsonb_build_object('stage',stage)
    );
  else
    update public.order_handoff_state set stage_snapshot=stage,last_synced_at=now() where order_id=p_order_id;
  end if;
  return jsonb_build_object('stage',stage,'task_id',task_id_value,'stage_key',key_value);
end
$$;
revoke all on function public.sync_order_handoff_v2(uuid,uuid) from public,anon,authenticated;
grant execute on function public.sync_order_handoff_v2(uuid,uuid) to service_role;

create or replace function public.sync_order_handoff_trigger_v2()
returns trigger language plpgsql security definer set search_path='' as $$
declare target_order_id uuid;
begin
  if pg_trigger_depth()>1 then return new; end if;
  target_order_id:=case tg_table_name
    when 'orders' then new.id
    when 'order_payments' then new.order_id
    when 'fulfillments' then new.order_id
    when 'job_orders' then new.order_id
    else null end;
  if target_order_id is not null then perform public.sync_order_handoff_v2(target_order_id,null); end if;
  return new;
end
$$;
revoke all on function public.sync_order_handoff_trigger_v2() from public,anon,authenticated;
grant execute on function public.sync_order_handoff_trigger_v2() to service_role;

do $$ declare t text; begin
  foreach t in array array['orders','order_payments','fulfillments','job_orders'] loop
    execute format('drop trigger if exists sync_order_handoff_v2 on public.%I',t);
    execute format('create trigger sync_order_handoff_v2 after insert or update on public.%I for each row execute function public.sync_order_handoff_trigger_v2()',t);
  end loop;
end $$;

create or replace function public.sync_qc_order_handoff_trigger_v2()
returns trigger language plpgsql security definer set search_path='' as $$
declare target_order_id uuid; begin
  select order_id into target_order_id from public.job_orders where id=new.job_order_id;
  if target_order_id is not null then perform public.sync_order_handoff_v2(target_order_id,null); end if;
  return new;
end $$;
revoke all on function public.sync_qc_order_handoff_trigger_v2() from public,anon,authenticated;
grant execute on function public.sync_qc_order_handoff_trigger_v2() to service_role;
drop trigger if exists sync_qc_order_handoff_v2 on public.qc_records;
create trigger sync_qc_order_handoff_v2 after insert or update on public.qc_records
for each row execute function public.sync_qc_order_handoff_trigger_v2();

-- Initialize stage state without sending historical customer messages.
insert into public.order_handoff_state(order_id,stage_key,stage_snapshot,last_synced_at)
select o.id,
  concat_ws(':',coalesce(s.stage->>'activeStage','unknown'),coalesce(s.stage->>'taskKey','none'),coalesce(s.stage->>'customerStatusLabel','status')),
  s.stage,now()
from public.orders o
cross join lateral (select public._resolve_order_active_stage_v1(o.id) stage) s
where o.archived_at is null
on conflict(order_id) do nothing;

-- ---------------------------------------------------------------------------
-- Phase 6 + 10: location-aware inventory, pickup preparation, no-show
-- ---------------------------------------------------------------------------
create table if not exists public.inventory_locations(
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  location_type text not null check(location_type in ('store','warehouse','production','transit','pickup_desk','legacy')),
  store_id uuid references public.stores(id) on delete set null,
  is_pickup_enabled boolean not null default false,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
create unique index if not exists inventory_locations_store_unique on public.inventory_locations(store_id) where store_id is not null;

create table if not exists public.inventory_balances(
  location_id uuid not null references public.inventory_locations(id) on delete restrict,
  variant_size_id uuid not null references public.product_variant_sizes(id) on delete restrict,
  on_hand_quantity integer not null default 0 check(on_hand_quantity>=0),
  reserved_quantity integer not null default 0 check(reserved_quantity>=0 and reserved_quantity<=on_hand_quantity),
  available_quantity integer generated always as (on_hand_quantity-reserved_quantity) stored,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  primary key(location_id,variant_size_id)
);

create sequence if not exists public.stock_transfer_number_seq;
create table if not exists public.stock_transfers(
  id uuid primary key default gen_random_uuid(),
  transfer_number text not null unique,
  idempotency_key text not null unique,
  order_id uuid references public.orders(id) on delete restrict,
  from_location_id uuid not null references public.inventory_locations(id) on delete restrict,
  to_location_id uuid not null references public.inventory_locations(id) on delete restrict,
  status text not null default 'in_transit' check(status in ('draft','in_transit','received','cancelled')),
  notes text,
  requested_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  shipped_at timestamptz,
  received_at timestamptz,
  received_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  check(from_location_id<>to_location_id)
);
create table if not exists public.stock_transfer_items(
  id uuid primary key default gen_random_uuid(),
  transfer_id uuid not null references public.stock_transfers(id) on delete restrict,
  variant_size_id uuid not null references public.product_variant_sizes(id) on delete restrict,
  quantity integer not null check(quantity>0),
  received_quantity integer not null default 0 check(received_quantity>=0),
  unique(transfer_id,variant_size_id)
);
create table if not exists public.inventory_movements(
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  variant_size_id uuid not null references public.product_variant_sizes(id) on delete restrict,
  location_id uuid not null references public.inventory_locations(id) on delete restrict,
  order_id uuid references public.orders(id) on delete restrict,
  transfer_id uuid references public.stock_transfers(id) on delete restrict,
  movement_type text not null check(movement_type in ('initial','adjustment','transfer_out','transfer_in','reserve','release','consume','restore')),
  quantity_delta integer not null check(quantity_delta<>0),
  balance_after integer not null check(balance_after>=0),
  reason text not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table if not exists public.pickup_preparations(
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete restrict,
  location_id uuid not null references public.inventory_locations(id) on delete restrict,
  fulfillment_id uuid references public.fulfillments(id) on delete set null,
  status text not null default 'requested' check(status in ('requested','locating_stock','transfer_required','in_transfer','received_at_store','checking','ready_for_pickup','handed_over','cancelled','no_show')),
  ready_at timestamptz,
  pickup_deadline timestamptz,
  reminder_at timestamptz,
  reminder_sent_at timestamptz,
  extension_requested_at timestamptz,
  requested_deadline timestamptz,
  extension_reason text,
  extension_approved_at timestamptz,
  extension_approved_by uuid references auth.users(id) on delete set null,
  expired_at timestamptz,
  released_at timestamptz,
  no_show_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
create table if not exists public.pickup_preparation_items(
  id uuid primary key default gen_random_uuid(),
  preparation_id uuid not null references public.pickup_preparations(id) on delete restrict,
  order_item_id uuid not null references public.order_items(id) on delete restrict,
  variant_size_id uuid not null references public.product_variant_sizes(id) on delete restrict,
  required_quantity integer not null check(required_quantity>0),
  reserved_quantity integer not null default 0 check(reserved_quantity>=0 and reserved_quantity<=required_quantity),
  unique(preparation_id,order_item_id)
);

create index if not exists inventory_movements_lookup_idx on public.inventory_movements(location_id,variant_size_id,created_at desc);
create index if not exists stock_transfers_order_idx on public.stock_transfers(order_id,created_at desc);
create index if not exists pickup_preparations_queue_idx on public.pickup_preparations(status,pickup_deadline,updated_at);

alter table public.inventory_locations enable row level security;
alter table public.inventory_balances enable row level security;
alter table public.stock_transfers enable row level security;
alter table public.stock_transfer_items enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.pickup_preparations enable row level security;
alter table public.pickup_preparation_items enable row level security;

do $$ declare t text; begin
  foreach t in array array['inventory_locations','inventory_balances','stock_transfers','stock_transfer_items','inventory_movements','pickup_preparations','pickup_preparation_items'] loop
    execute format('revoke all on public.%I from public,anon,authenticated',t);
    execute format('grant select on public.%I to authenticated',t);
    execute format('grant all on public.%I to service_role',t);
  end loop;
end $$;

drop policy if exists "inventory locations readable" on public.inventory_locations;
drop policy if exists "inventory balances readable" on public.inventory_balances;
drop policy if exists "stock transfers readable" on public.stock_transfers;
drop policy if exists "stock transfer items readable" on public.stock_transfer_items;
drop policy if exists "inventory movements readable" on public.inventory_movements;
drop policy if exists "pickup preparations readable" on public.pickup_preparations;
drop policy if exists "pickup preparation items readable" on public.pickup_preparation_items;
create policy "inventory locations readable" on public.inventory_locations for select to authenticated using(public.has_permission('inventory.location.read'));
create policy "inventory balances readable" on public.inventory_balances for select to authenticated using(public.has_permission('inventory.location.read'));
create policy "stock transfers readable" on public.stock_transfers for select to authenticated using(public.has_permission('inventory.location.read'));
create policy "stock transfer items readable" on public.stock_transfer_items for select to authenticated using(public.has_permission('inventory.location.read'));
create policy "inventory movements readable" on public.inventory_movements for select to authenticated using(public.has_permission('inventory.location.read'));
create policy "pickup preparations readable" on public.pickup_preparations for select to authenticated using(public.has_permission('operations.read'));
create policy "pickup preparation items readable" on public.pickup_preparation_items for select to authenticated using(public.has_permission('operations.read'));

insert into public.inventory_locations(code,name,location_type,is_pickup_enabled,active,metadata)
values('LEGACY-SYSTEM','Stok Sistem Legacy','legacy',false,true,jsonb_build_object('source','product_variant_sizes'))
on conflict(code) do nothing;
insert into public.inventory_locations(code,name,location_type,store_id,is_pickup_enabled,active,metadata)
select 'STORE-'||upper(substr(s.id::text,1,8)),s.nama_store,'store',s.id,true,s.status_aktif,jsonb_build_object('address',s.alamat)
from public.stores s
on conflict(store_id) where store_id is not null do update
set name=excluded.name,active=excluded.active,metadata=excluded.metadata,updated_at=now();
insert into public.inventory_balances(location_id,variant_size_id,on_hand_quantity,reserved_quantity)
select l.id,v.id,greatest(coalesce(v.stock_quantity,v.stock,0),0),0
from public.inventory_locations l cross join public.product_variant_sizes v
where l.code='LEGACY-SYSTEM'
on conflict(location_id,variant_size_id) do nothing;

create or replace function public.inventory_location_available_for_order_v1(
  p_location_id uuid,p_variant_size_id uuid,p_order_id uuid default null
)
returns integer
language plpgsql
stable
security definer
set search_path=''
as $$
declare location_kind text; base_available integer; other_reserved integer:=0;
begin
  select l.location_type,b.available_quantity
  into location_kind,base_available
  from public.inventory_locations l
  join public.inventory_balances b on b.location_id=l.id
  where l.id=p_location_id and b.variant_size_id=p_variant_size_id and l.active=true;
  if not found then return 0; end if;

  -- The legacy/global reservation ledger has no location dimension. Subtract
  -- reservations belonging to other orders from warehouse/legacy sources,
  -- while allowing the current order to move its own reserved quantity.
  if location_kind in ('legacy','warehouse') then
    select coalesce(sum(sr.quantity),0)::integer into other_reserved
    from public.stock_reservations sr
    where sr.variant_size_id=p_variant_size_id
      and sr.status='active'
      and sr.expires_at>now()
      and (p_order_id is null or sr.order_id<>p_order_id);
  end if;
  return greatest(base_available-other_reserved,0);
end
$$;
revoke all on function public.inventory_location_available_for_order_v1(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.inventory_location_available_for_order_v1(uuid,uuid,uuid) to service_role;

create or replace function public.sync_legacy_inventory_from_variant_v1()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare legacy_location uuid; old_quantity integer:=0; new_quantity integer:=0; delta_value integer; balance_value public.inventory_balances;
begin
  if coalesce(current_setting('debroder.skip_inventory_legacy_sync',true),'')='1' then return new; end if;
  if tg_op='UPDATE' then old_quantity:=greatest(coalesce(old.stock_quantity,old.stock,0),0); end if;
  new_quantity:=greatest(coalesce(new.stock_quantity,new.stock,0),0);
  delta_value:=new_quantity-old_quantity;
  if delta_value=0 then return new; end if;
  select id into legacy_location from public.inventory_locations where code='LEGACY-SYSTEM' and active=true;
  if legacy_location is null then return new; end if;
  insert into public.inventory_balances(location_id,variant_size_id,on_hand_quantity,reserved_quantity)
  values(legacy_location,new.id,0,0) on conflict do nothing;
  select * into balance_value from public.inventory_balances
  where location_id=legacy_location and variant_size_id=new.id for update;
  if balance_value.on_hand_quantity+delta_value<balance_value.reserved_quantity then
    raise exception 'Perubahan stok akan membuat saldo lokasi lebih kecil dari reservasi';
  end if;
  update public.inventory_balances
  set on_hand_quantity=on_hand_quantity+delta_value,updated_at=now(),updated_by=auth.uid()
  where location_id=legacy_location and variant_size_id=new.id returning * into balance_value;
  insert into public.inventory_movements(
    idempotency_key,variant_size_id,location_id,movement_type,quantity_delta,balance_after,reason,created_by
  ) values (
    'variant-sync:'||gen_random_uuid()::text,new.id,legacy_location,'adjustment',delta_value,
    balance_value.on_hand_quantity,'Sinkronisasi perubahan stok katalog ke ledger lokasi legacy',auth.uid()
  );
  return new;
end
$$;
revoke all on function public.sync_legacy_inventory_from_variant_v1() from public,anon,authenticated;
grant execute on function public.sync_legacy_inventory_from_variant_v1() to service_role;
drop trigger if exists sync_legacy_inventory_from_variant_v1 on public.product_variant_sizes;
create trigger sync_legacy_inventory_from_variant_v1
after insert or update of stock,stock_quantity on public.product_variant_sizes
for each row execute function public.sync_legacy_inventory_from_variant_v1();

create or replace function public.next_stock_transfer_number_v1()
returns text language sql security definer set search_path='' as $$
  select 'TRF-DEB-'||to_char(now(),'YYYY')||'-'||lpad(nextval('public.stock_transfer_number_seq')::text,5,'0')
$$;
revoke all on function public.next_stock_transfer_number_v1() from public,anon,authenticated;
grant execute on function public.next_stock_transfer_number_v1() to service_role;

create or replace function public.reserve_pickup_stock_v1(p_preparation_id uuid)
returns public.pickup_preparations
language plpgsql security definer set search_path='' as $$
declare prep public.pickup_preparations; line record; bal public.inventory_balances; all_reserved boolean:=true;
begin
  select * into prep from public.pickup_preparations where id=p_preparation_id for update;
  if not found then raise exception 'Persiapan pickup tidak ditemukan'; end if;
  for line in select * from public.pickup_preparation_items where preparation_id=p_preparation_id order by variant_size_id for update loop
    if line.reserved_quantity>=line.required_quantity then continue; end if;
    insert into public.inventory_balances(location_id,variant_size_id,on_hand_quantity,reserved_quantity)
    values(prep.location_id,line.variant_size_id,0,0) on conflict do nothing;
    select * into bal from public.inventory_balances where location_id=prep.location_id and variant_size_id=line.variant_size_id for update;
    if bal.available_quantity >= line.required_quantity-line.reserved_quantity then
      update public.inventory_balances set reserved_quantity=reserved_quantity+(line.required_quantity-line.reserved_quantity),updated_at=now(),updated_by=auth.uid()
      where location_id=prep.location_id and variant_size_id=line.variant_size_id returning * into bal;
      insert into public.inventory_movements(idempotency_key,variant_size_id,location_id,order_id,movement_type,quantity_delta,balance_after,reason,created_by)
      values(format('pickup:%s:reserve:%s',prep.id,line.variant_size_id),line.variant_size_id,prep.location_id,prep.order_id,'reserve',-(line.required_quantity-line.reserved_quantity),bal.available_quantity,'Reservasi untuk pickup',auth.uid())
      on conflict(idempotency_key) do nothing;
      update public.pickup_preparation_items set reserved_quantity=required_quantity where id=line.id;
    else all_reserved:=false; end if;
  end loop;
  update public.pickup_preparations set status=case when all_reserved then 'checking' else 'transfer_required' end,updated_at=now(),updated_by=auth.uid()
  where id=p_preparation_id returning * into prep;
  return prep;
end $$;
revoke all on function public.reserve_pickup_stock_v1(uuid) from public,anon,authenticated;
grant execute on function public.reserve_pickup_stock_v1(uuid) to service_role;

create or replace function public.initialize_pickup_preparation_v1(p_order_id uuid)
returns public.pickup_preparations
language plpgsql security definer set search_path='' as $$
declare o public.orders; location_value public.inventory_locations; prep public.pickup_preparations; fulfillment_value uuid;
begin
  if not public.has_permission('inventory.location.manage') then raise exception 'Tidak berwenang menyiapkan pickup'; end if;
  select * into o from public.orders where id=p_order_id and archived_at is null for update;
  if not found or o.delivery_method<>'pickup' or o.pickup_location_id is null then raise exception 'Pesanan bukan pickup yang valid'; end if;
  select * into location_value from public.inventory_locations where store_id=o.pickup_location_id and active=true and is_pickup_enabled=true;
  if not found then raise exception 'Lokasi pickup belum terhubung ke stok lokasi'; end if;
  select id into fulfillment_value from public.fulfillments where order_id=p_order_id and archived_at is null and method='pickup' and status<>'cancelled' order by created_at desc limit 1;
  insert into public.pickup_preparations(order_id,location_id,fulfillment_id,status,updated_by)
  values(p_order_id,location_value.id,fulfillment_value,'requested',auth.uid())
  on conflict(order_id) do update set location_id=excluded.location_id,fulfillment_id=coalesce(excluded.fulfillment_id,public.pickup_preparations.fulfillment_id),updated_at=now(),updated_by=auth.uid()
  returning * into prep;
  insert into public.pickup_preparation_items(preparation_id,order_item_id,variant_size_id,required_quantity)
  select prep.id,oi.id,oi.variant_size_id,oi.quantity
  from public.order_items oi where oi.order_id=p_order_id and oi.archived_at is null and oi.variant_size_id is not null
  on conflict(preparation_id,order_item_id) do update set required_quantity=excluded.required_quantity;
  prep:=public.reserve_pickup_stock_v1(prep.id);
  perform public.sync_order_handoff_v2(p_order_id,null);
  return prep;
end $$;
revoke all on function public.initialize_pickup_preparation_v1(uuid) from public,anon;
grant execute on function public.initialize_pickup_preparation_v1(uuid) to authenticated,service_role;

create or replace function public.create_stock_transfer_v1(
  p_order_id uuid,p_from_location_id uuid,p_to_location_id uuid,p_items jsonb,p_idempotency_key text,p_notes text default null
)
returns public.stock_transfers
language plpgsql security definer set search_path='' as $$
declare transfer_value public.stock_transfers; entry jsonb; variant_value uuid; qty integer; bal public.inventory_balances;
begin
  if not public.has_permission('inventory.location.manage') then raise exception 'Tidak berwenang membuat transfer stok'; end if;
  if p_idempotency_key !~ '^[a-zA-Z0-9:_-]{16,150}$' then raise exception 'Kunci transfer tidak valid'; end if;
  select * into transfer_value from public.stock_transfers where idempotency_key=p_idempotency_key;
  if found then return transfer_value; end if;
  if p_from_location_id=p_to_location_id then raise exception 'Lokasi asal dan tujuan harus berbeda'; end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'Item transfer wajib diisi'; end if;
  insert into public.stock_transfers(transfer_number,idempotency_key,order_id,from_location_id,to_location_id,status,notes,requested_by,shipped_at,updated_by)
  values(public.next_stock_transfer_number_v1(),p_idempotency_key,p_order_id,p_from_location_id,p_to_location_id,'in_transit',nullif(btrim(coalesce(p_notes,'')),''),auth.uid(),now(),auth.uid())
  returning * into transfer_value;
  for entry in select value from jsonb_array_elements(p_items) loop
    variant_value:=(entry->>'variant_size_id')::uuid; qty:=(entry->>'quantity')::integer;
    if qty<=0 then raise exception 'Jumlah transfer tidak valid'; end if;
    perform 1 from public.product_variant_sizes where id=variant_value for update;
    select * into bal from public.inventory_balances where location_id=p_from_location_id and variant_size_id=variant_value for update;
    if not found or public.inventory_location_available_for_order_v1(p_from_location_id,variant_value,p_order_id)<qty then
      raise exception 'Stok lokasi asal tidak mencukupi setelah memperhitungkan reservasi aktif';
    end if;
    update public.inventory_balances set on_hand_quantity=on_hand_quantity-qty,updated_at=now(),updated_by=auth.uid()
    where location_id=p_from_location_id and variant_size_id=variant_value returning * into bal;
    insert into public.stock_transfer_items(transfer_id,variant_size_id,quantity) values(transfer_value.id,variant_value,qty);
    insert into public.inventory_movements(idempotency_key,variant_size_id,location_id,order_id,transfer_id,movement_type,quantity_delta,balance_after,reason,created_by)
    values(format('transfer:%s:out:%s',transfer_value.id,variant_value),variant_value,p_from_location_id,p_order_id,transfer_value.id,'transfer_out',-qty,bal.on_hand_quantity,'Stok dikirim ke lokasi lain',auth.uid());
  end loop;
  update public.pickup_preparations set status='in_transfer',updated_at=now(),updated_by=auth.uid() where order_id=p_order_id and status in ('transfer_required','locating_stock');
  return transfer_value;
end $$;
revoke all on function public.create_stock_transfer_v1(uuid,uuid,uuid,jsonb,text,text) from public,anon;
grant execute on function public.create_stock_transfer_v1(uuid,uuid,uuid,jsonb,text,text) to authenticated,service_role;

create or replace function public.create_pickup_transfer_v1(p_preparation_id uuid,p_idempotency_key text)
returns public.stock_transfers
language plpgsql security definer set search_path='' as $$
declare prep public.pickup_preparations; source_location uuid; items_value jsonb;
begin
  if not public.has_permission('inventory.location.manage') then raise exception 'Tidak berwenang membuat transfer pickup'; end if;
  select * into prep from public.pickup_preparations where id=p_preparation_id for update;
  if not found then raise exception 'Persiapan pickup tidak ditemukan'; end if;
  select l.id into source_location from public.inventory_locations l
  where l.active=true and l.location_type in ('warehouse','legacy')
    and exists(
      select 1 from public.pickup_preparation_items pi
      where pi.preparation_id=prep.id and pi.required_quantity>pi.reserved_quantity
    )
    and not exists(
      select 1 from public.pickup_preparation_items pi
      where pi.preparation_id=prep.id
        and pi.required_quantity>pi.reserved_quantity
        and public.inventory_location_available_for_order_v1(
          l.id,pi.variant_size_id,prep.order_id
        ) < pi.required_quantity-pi.reserved_quantity
    )
  order by case l.location_type when 'warehouse' then 0 else 1 end,l.created_at limit 1;
  if source_location is null then raise exception 'Tidak ada lokasi sumber dengan stok yang mencukupi'; end if;
  select jsonb_agg(jsonb_build_object('variant_size_id',pi.variant_size_id,'quantity',pi.required_quantity-pi.reserved_quantity))
  into items_value from public.pickup_preparation_items pi where pi.preparation_id=prep.id and pi.required_quantity>pi.reserved_quantity;
  return public.create_stock_transfer_v1(prep.order_id,source_location,prep.location_id,items_value,p_idempotency_key,'Transfer otomatis untuk pickup');
end $$;
revoke all on function public.create_pickup_transfer_v1(uuid,text) from public,anon;
grant execute on function public.create_pickup_transfer_v1(uuid,text) to authenticated,service_role;

create or replace function public.receive_stock_transfer_v1(p_transfer_id uuid,p_note text default null)
returns public.stock_transfers
language plpgsql security definer set search_path='' as $$
declare transfer_value public.stock_transfers; item record; bal public.inventory_balances; prep_id uuid;
begin
  if not public.has_permission('inventory.location.manage') then raise exception 'Tidak berwenang menerima transfer stok'; end if;
  select * into transfer_value from public.stock_transfers where id=p_transfer_id for update;
  if not found then raise exception 'Transfer tidak ditemukan'; end if;
  if transfer_value.status='received' then return transfer_value; end if;
  if transfer_value.status<>'in_transit' then raise exception 'Transfer tidak dapat diterima pada status ini'; end if;
  for item in select * from public.stock_transfer_items where transfer_id=p_transfer_id for update loop
    insert into public.inventory_balances(location_id,variant_size_id,on_hand_quantity,reserved_quantity)
    values(transfer_value.to_location_id,item.variant_size_id,0,0) on conflict do nothing;
    update public.inventory_balances set on_hand_quantity=on_hand_quantity+item.quantity,updated_at=now(),updated_by=auth.uid()
    where location_id=transfer_value.to_location_id and variant_size_id=item.variant_size_id returning * into bal;
    update public.stock_transfer_items set received_quantity=item.quantity where id=item.id;
    insert into public.inventory_movements(idempotency_key,variant_size_id,location_id,order_id,transfer_id,movement_type,quantity_delta,balance_after,reason,created_by)
    values(format('transfer:%s:in:%s',transfer_value.id,item.variant_size_id),item.variant_size_id,transfer_value.to_location_id,transfer_value.order_id,transfer_value.id,'transfer_in',item.quantity,bal.on_hand_quantity,coalesce(nullif(btrim(p_note),''),'Transfer diterima'),auth.uid())
    on conflict(idempotency_key) do nothing;
  end loop;
  update public.stock_transfers set status='received',received_at=now(),received_by=auth.uid(),updated_at=now(),updated_by=auth.uid()
  where id=p_transfer_id returning * into transfer_value;
  select id into prep_id from public.pickup_preparations where order_id=transfer_value.order_id;
  if prep_id is not null then
    update public.pickup_preparations set status='received_at_store',updated_at=now(),updated_by=auth.uid() where id=prep_id;
    perform public.reserve_pickup_stock_v1(prep_id);
  end if;
  return transfer_value;
end $$;
revoke all on function public.receive_stock_transfer_v1(uuid,text) from public,anon;
grant execute on function public.receive_stock_transfer_v1(uuid,text) to authenticated,service_role;

create or replace function public.mark_pickup_ready_v1(p_preparation_id uuid,p_deadline_hours integer default 72)
returns public.pickup_preparations
language plpgsql security definer set search_path='' as $$
declare prep public.pickup_preparations; f public.fulfillments;
begin
  if not public.has_permission('inventory.location.manage') then raise exception 'Tidak berwenang menetapkan pickup siap'; end if;
  if p_deadline_hours<12 or p_deadline_hours>168 then raise exception 'Batas pickup harus 12 sampai 168 jam'; end if;
  select * into prep from public.pickup_preparations where id=p_preparation_id for update;
  if not found then raise exception 'Persiapan pickup tidak ditemukan'; end if;
  if exists(select 1 from public.pickup_preparation_items where preparation_id=prep.id and reserved_quantity<required_quantity) then
    raise exception 'Stok fisik di lokasi pickup belum lengkap';
  end if;
  select * into f from public.fulfillments where id=prep.fulfillment_id for update;
  if not found or f.final_verified_at is null then raise exception 'Pengecekan akhir fulfillment wajib selesai'; end if;
  update public.pickup_preparations set status='ready_for_pickup',ready_at=now(),pickup_deadline=now()+make_interval(hours=>p_deadline_hours),
    reminder_at=now()+make_interval(hours=>greatest(p_deadline_hours-24,1)),reminder_sent_at=null,updated_at=now(),updated_by=auth.uid()
  where id=prep.id returning * into prep;
  update public.fulfillments set status='ready_for_pickup',ready_at=now(),updated_at=now(),updated_by=auth.uid() where id=f.id;
  perform public.sync_order_handoff_v2(prep.order_id,null);
  return prep;
end $$;
revoke all on function public.mark_pickup_ready_v1(uuid,integer) from public,anon;
grant execute on function public.mark_pickup_ready_v1(uuid,integer) to authenticated,service_role;

create or replace function public.guard_pickup_location_readiness_v1()
returns trigger language plpgsql security definer set search_path='' as $$
declare prep public.pickup_preparations;
begin
  if new.status='ready_for_pickup' and (tg_op='INSERT' or old.status is distinct from new.status) then
    select * into prep from public.pickup_preparations where order_id=new.order_id;
    if not found or prep.status<>'ready_for_pickup' then raise exception 'Barang belum dinyatakan siap pada lokasi pickup'; end if;
  end if;
  return new;
end $$;
revoke all on function public.guard_pickup_location_readiness_v1() from public,anon,authenticated;
grant execute on function public.guard_pickup_location_readiness_v1() to service_role;
drop trigger if exists guard_pickup_location_readiness_v1 on public.fulfillments;
create trigger guard_pickup_location_readiness_v1 before insert or update of status on public.fulfillments
for each row execute function public.guard_pickup_location_readiness_v1();

create or replace function public.request_pickup_extension_for_order_v1(p_order_id uuid,p_requested_deadline timestamptz,p_reason text)
returns public.pickup_preparations
language plpgsql security definer set search_path='' as $$
declare prep public.pickup_preparations;
begin
  if length(btrim(coalesce(p_reason,'')))<5 then raise exception 'Alasan perpanjangan wajib diisi'; end if;
  select * into prep from public.pickup_preparations where order_id=p_order_id for update;
  if not found or prep.status not in ('ready_for_pickup','no_show') then raise exception 'Perpanjangan belum tersedia pada status ini'; end if;
  if p_requested_deadline<=now() or p_requested_deadline>now()+interval '7 days' then raise exception 'Batas waktu perpanjangan tidak valid'; end if;
  update public.pickup_preparations set extension_requested_at=now(),requested_deadline=p_requested_deadline,extension_reason=btrim(p_reason),updated_at=now()
  where id=prep.id returning * into prep;
  insert into public.order_tasks(task_key,order_id,task_type,status,priority,assigned_role,title,description,related_path,stage_snapshot)
  values(format('order:%s:pickup_extension_review:%s',p_order_id,extract(epoch from prep.extension_requested_at)::bigint),p_order_id,'pickup_extension_review','open','high','admin',
    'Periksa Perpanjangan Pickup',btrim(p_reason),format('/admin/inventory-operations?order=%s',p_order_id),jsonb_build_object('requested_deadline',p_requested_deadline))
  on conflict(task_key) do nothing;
  perform public.enqueue_customer_notification_v1(p_order_id,'pickup_extension_requested',format('order:%s:pickup-extension:%s',p_order_id,extract(epoch from prep.extension_requested_at)::bigint),jsonb_build_object('requested_deadline',p_requested_deadline));
  return prep;
end $$;
revoke all on function public.request_pickup_extension_for_order_v1(uuid,timestamptz,text) from public,anon,authenticated;
grant execute on function public.request_pickup_extension_for_order_v1(uuid,timestamptz,text) to service_role;

create or replace function public.decide_pickup_extension_v1(p_preparation_id uuid,p_approve boolean,p_deadline timestamptz,p_reason text)
returns public.pickup_preparations
language plpgsql security definer set search_path='' as $$
declare prep public.pickup_preparations;
begin
  if not public.has_permission('operations.manage') then raise exception 'Tidak berwenang memutuskan perpanjangan pickup'; end if;
  select * into prep from public.pickup_preparations where id=p_preparation_id for update;
  if not found or prep.extension_requested_at is null then raise exception 'Permintaan perpanjangan tidak ditemukan'; end if;
  if p_approve and (p_deadline<=now() or p_deadline>now()+interval '7 days') then raise exception 'Batas waktu baru tidak valid'; end if;
  update public.pickup_preparations set
    status=case when p_approve and status='no_show' then 'ready_for_pickup' else status end,
    pickup_deadline=case when p_approve then p_deadline else pickup_deadline end,
    reminder_at=case when p_approve then greatest(now(),p_deadline-interval '24 hours') else reminder_at end,
    extension_approved_at=now(),extension_approved_by=auth.uid(),
    extension_reason=coalesce(nullif(btrim(p_reason),''),extension_reason),requested_deadline=null,extension_requested_at=null,
    updated_at=now(),updated_by=auth.uid()
  where id=prep.id returning * into prep;
  update public.order_tasks set status='resolved',resolved_at=now(),resolved_by=auth.uid(),resolution=case when p_approve then 'Perpanjangan disetujui' else 'Perpanjangan ditolak' end,updated_at=now()
  where order_id=prep.order_id and task_type='pickup_extension_review' and status in ('open','acknowledged','in_progress','blocked');
  perform public.enqueue_customer_notification_v1(prep.order_id,case when p_approve then 'pickup_extension_approved' else 'pickup_extension_rejected' end,
    format('order:%s:pickup-extension-decision:%s',prep.order_id,extract(epoch from now())::bigint),jsonb_build_object('approved',p_approve,'deadline',p_deadline,'reason',p_reason));
  return prep;
end $$;
revoke all on function public.decide_pickup_extension_v1(uuid,boolean,timestamptz,text) from public,anon;
grant execute on function public.decide_pickup_extension_v1(uuid,boolean,timestamptz,text) to authenticated,service_role;

create or replace function public.complete_pickup_handover_v1(p_preparation_id uuid,p_note text default null)
returns public.orders
language plpgsql security definer set search_path='' as $$
declare prep public.pickup_preparations; o public.orders; f public.fulfillments; line record; bal public.inventory_balances; payment_id uuid; old_status text;
begin
  if not public.has_permission('shipping.complete') and not public.has_permission('operations.manage') then raise exception 'Tidak berwenang menyelesaikan pickup'; end if;
  select * into prep from public.pickup_preparations where id=p_preparation_id for update;
  if not found or prep.status not in ('ready_for_pickup','no_show') then raise exception 'Pickup belum siap diserahkan'; end if;
  select * into o from public.orders where id=prep.order_id for update;
  old_status:=o.status;
  select * into f from public.fulfillments where id=prep.fulfillment_id for update;
  if o.payment_method='pay_at_store' and not exists(select 1 from public.order_payments where order_id=o.id and archived_at is null and (status='verified' or review_outcome='verified')) then
    insert into public.order_payments(order_id,amount,reported_amount,paid_at,method,channel_name,reference_number,status,submission_source,review_outcome,
      check_funds_received,check_destination_account,check_amount,check_transaction_time,check_reference_unique,verified_amount,verified_destination_account,
      verified_transaction_at,verified_reference,verified_at,verified_by,reviewed_at,reviewed_by,admin_notes,created_by,updated_by)
    values(o.id,o.total_amount::bigint,o.total_amount::bigint,now(),'cash','Toko',format('CASH-%s-%s',o.order_number,to_char(now(),'YYYYMMDDHH24MISS')),
      'verified','admin','verified',true,true,true,true,true,o.total_amount::bigint,'Kas Toko',now(),format('CASH-%s',o.order_number),now(),auth.uid(),now(),auth.uid(),
      coalesce(nullif(btrim(p_note),''),'Pembayaran tunai diterima saat pickup'),auth.uid(),auth.uid()) returning id into payment_id;
    perform public.refresh_order_payment_summary(o.id);
    select * into o from public.orders where id=o.id for update;
  end if;
  if not o.payment_production_eligible then raise exception 'Pembayaran belum memenuhi syarat'; end if;
  for line in select * from public.pickup_preparation_items where preparation_id=prep.id order by variant_size_id for update loop
    select * into bal from public.inventory_balances where location_id=prep.location_id and variant_size_id=line.variant_size_id for update;
    if not found or bal.reserved_quantity<line.required_quantity or bal.on_hand_quantity<line.required_quantity then raise exception 'Saldo stok pickup tidak konsisten'; end if;
    update public.inventory_balances set on_hand_quantity=on_hand_quantity-line.required_quantity,reserved_quantity=reserved_quantity-line.required_quantity,updated_at=now(),updated_by=auth.uid()
    where location_id=prep.location_id and variant_size_id=line.variant_size_id returning * into bal;
    insert into public.inventory_movements(idempotency_key,variant_size_id,location_id,order_id,movement_type,quantity_delta,balance_after,reason,created_by)
    values(format('pickup:%s:consume:%s',prep.id,line.variant_size_id),line.variant_size_id,prep.location_id,o.id,'consume',-line.required_quantity,bal.on_hand_quantity,'Barang diserahkan kepada pelanggan',auth.uid())
    on conflict(idempotency_key) do nothing;
  end loop;
  if exists(select 1 from public.stock_reservations where order_id=o.id and status='active') then
    -- The pickup-location movement already reduced physical location stock.
    -- Suppress the catalog-to-legacy mirror for this one consumption to avoid
    -- counting the same handover twice.
    perform set_config('debroder.skip_inventory_legacy_sync','1',true);
    perform public.consume_paid_order_stock(o.id);
  end if;
  update public.pickup_preparations set status='handed_over',updated_at=now(),updated_by=auth.uid() where id=prep.id;
  update public.fulfillments set status='picked_up',picked_up_at=now(),updated_at=now(),updated_by=auth.uid(),notes=concat_ws(E'\n',notes,nullif(btrim(p_note),'')) where id=f.id;
  update public.orders set status='completed',updated_at=now(),updated_by=auth.uid() where id=o.id returning * into o;
  insert into public.order_status_history(order_id,from_status,to_status,note,changed_by) values(o.id,old_status,'completed',coalesce(nullif(btrim(p_note),''),'Pickup selesai'),auth.uid());
  perform public.sync_order_handoff_v2(o.id,null);
  return o;
end $$;
revoke all on function public.complete_pickup_handover_v1(uuid,text) from public,anon;
grant execute on function public.complete_pickup_handover_v1(uuid,text) to authenticated,service_role;

create or replace function public.process_pickup_deadlines_v1()
returns jsonb
language plpgsql security definer set search_path='' as $$
declare r record; reminders integer:=0; no_shows integer:=0;
begin
  if auth.role()<>'service_role' and not public.has_permission('operations.health.manage') then raise exception 'Tidak berwenang menjalankan pickup deadline'; end if;
  for r in select * from public.pickup_preparations where status='ready_for_pickup' and reminder_at<=now() and reminder_sent_at is null for update loop
    perform public.enqueue_customer_notification_v1(r.order_id,'pickup_reminder',format('order:%s:pickup-reminder:%s',r.order_id,extract(epoch from r.pickup_deadline)::bigint),jsonb_build_object('pickup_deadline',r.pickup_deadline));
    update public.pickup_preparations set reminder_sent_at=now(),updated_at=now() where id=r.id; reminders:=reminders+1;
  end loop;
  for r in select * from public.pickup_preparations where status='ready_for_pickup' and pickup_deadline<now() for update loop
    update public.pickup_preparations set status='no_show',expired_at=now(),no_show_reason='Melewati batas pickup',updated_at=now() where id=r.id;
    insert into public.order_tasks(task_key,order_id,task_type,status,priority,assigned_role,title,description,related_path,stage_snapshot)
    values(format('order:%s:pickup_no_show:%s',r.order_id,extract(epoch from r.pickup_deadline)::bigint),r.order_id,'pickup_no_show','open','high','admin',
      'Tangani Pickup Terlambat','Pelanggan belum mengambil barang sampai batas waktu.',format('/admin/inventory-operations?order=%s',r.order_id),jsonb_build_object('pickup_deadline',r.pickup_deadline))
    on conflict(task_key) do nothing;
    perform public.enqueue_customer_notification_v1(r.order_id,'pickup_no_show',format('order:%s:pickup-no-show:%s',r.order_id,extract(epoch from r.pickup_deadline)::bigint),jsonb_build_object('pickup_deadline',r.pickup_deadline));
    no_shows:=no_shows+1;
  end loop;
  return jsonb_build_object('reminders',reminders,'no_shows',no_shows);
end $$;
revoke all on function public.process_pickup_deadlines_v1() from public,anon;
grant execute on function public.process_pickup_deadlines_v1() to authenticated,service_role;

-- ---------------------------------------------------------------------------
-- Phase 8: cancellation and refund consistency
-- ---------------------------------------------------------------------------
create table if not exists public.order_cancellation_requests(
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  request_key text not null unique,
  reason text not null,
  status text not null default 'pending' check(status in ('pending','approved','approved_refund_required','rejected','completed','cancelled')),
  requires_refund boolean not null default false,
  verified_amount_snapshot bigint not null default 0 check(verified_amount_snapshot>=0),
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users(id) on delete set null,
  decision_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists cancellation_one_active_per_order on public.order_cancellation_requests(order_id)
where status in ('pending','approved','approved_refund_required');
create table if not exists public.refund_cases(
  id uuid primary key default gen_random_uuid(),
  refund_number text not null unique,
  cancellation_request_id uuid not null unique references public.order_cancellation_requests(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  amount bigint not null check(amount>0),
  status text not null default 'under_review' check(status in ('under_review','approved','processing','sent','confirmed','failed','rejected','cancelled')),
  destination_name text,
  destination_account text,
  destination_bank text,
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  sent_at timestamptz,
  sent_by uuid references auth.users(id) on delete set null,
  confirmed_at timestamptz,
  failed_reason text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
create sequence if not exists public.refund_number_seq;
create table if not exists public.refund_allocations(
  id uuid primary key default gen_random_uuid(),
  refund_case_id uuid not null references public.refund_cases(id) on delete restrict,
  source_payment_id uuid not null references public.order_payments(id) on delete restrict,
  amount bigint not null check(amount>0),
  adjustment_id uuid references public.payment_adjustments(id) on delete set null,
  unique(refund_case_id,source_payment_id)
);
create table if not exists public.refund_evidence(
  id uuid primary key default gen_random_uuid(),
  refund_case_id uuid not null references public.refund_cases(id) on delete restrict,
  bucket text not null,
  object_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check(size_bytes>0),
  transfer_reference text not null,
  transferred_at timestamptz not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  unique(bucket,object_path)
);

alter table public.order_cancellation_requests enable row level security;
alter table public.refund_cases enable row level security;
alter table public.refund_allocations enable row level security;
alter table public.refund_evidence enable row level security;
do $$ declare t text; begin
  foreach t in array array['order_cancellation_requests','refund_cases','refund_allocations','refund_evidence'] loop
    execute format('revoke all on public.%I from public,anon,authenticated',t);
    execute format('grant select on public.%I to authenticated',t);
    execute format('grant all on public.%I to service_role',t);
  end loop;
end $$;
drop policy if exists "cancellation requests readable" on public.order_cancellation_requests;
drop policy if exists "refund cases readable" on public.refund_cases;
drop policy if exists "refund allocations readable" on public.refund_allocations;
drop policy if exists "refund evidence readable" on public.refund_evidence;
create policy "cancellation requests readable" on public.order_cancellation_requests for select to authenticated using(public.has_permission('refund.read'));
create policy "refund cases readable" on public.refund_cases for select to authenticated using(public.has_permission('refund.read'));
create policy "refund allocations readable" on public.refund_allocations for select to authenticated using(public.has_permission('refund.read'));
create policy "refund evidence readable" on public.refund_evidence for select to authenticated using(public.has_permission('refund.read'));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('refund-evidence','refund-evidence',false,5242880,array['image/png','image/jpeg','application/pdf'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create or replace function public.guard_active_cancellation_progress_v1()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare target_order_id uuid; active_request boolean;
begin
  target_order_id:=case tg_table_name
    when 'orders' then new.id
    when 'job_orders' then new.order_id
    when 'fulfillments' then new.order_id
    else null end;
  if target_order_id is null then return new; end if;
  select exists(
    select 1 from public.order_cancellation_requests r
    where r.order_id=target_order_id and r.status in ('pending','approved','approved_refund_required')
  ) into active_request;
  if not active_request then return new; end if;

  if tg_table_name='orders' then
    if new.status is distinct from old.status and new.status not in ('cancelled','dibatalkan') then
      raise exception 'Pesanan sedang dalam proses pembatalan';
    end if;
  elsif tg_table_name='job_orders' then
    if tg_op='INSERT' then
      if new.status not in ('cancelled') then raise exception 'Produksi diblokir selama proses pembatalan'; end if;
    elsif new.status is distinct from old.status and new.status not in ('cancelled') then
      raise exception 'Produksi diblokir selama proses pembatalan';
    end if;
  elsif tg_table_name='fulfillments' then
    if tg_op='INSERT' then
      if new.status not in ('cancelled') then raise exception 'Penyerahan diblokir selama proses pembatalan'; end if;
    elsif new.status is distinct from old.status and new.status not in ('cancelled') then
      raise exception 'Penyerahan diblokir selama proses pembatalan';
    end if;
  end if;
  return new;
end
$$;
revoke all on function public.guard_active_cancellation_progress_v1() from public,anon,authenticated;
grant execute on function public.guard_active_cancellation_progress_v1() to service_role;

drop trigger if exists guard_active_cancellation_order_progress_v1 on public.orders;
create trigger guard_active_cancellation_order_progress_v1
before update of status on public.orders
for each row execute function public.guard_active_cancellation_progress_v1();
drop trigger if exists guard_active_cancellation_job_progress_v1 on public.job_orders;
create trigger guard_active_cancellation_job_progress_v1
before insert or update of status on public.job_orders
for each row execute function public.guard_active_cancellation_progress_v1();
drop trigger if exists guard_active_cancellation_fulfillment_progress_v1 on public.fulfillments;
create trigger guard_active_cancellation_fulfillment_progress_v1
before insert or update of status on public.fulfillments
for each row execute function public.guard_active_cancellation_progress_v1();

create or replace function public.order_verified_funds_v1(p_order_id uuid)
returns bigint language sql stable security definer set search_path='' as $$
  select coalesce(sum(coalesce(p.verified_amount,p.amount)),0)::bigint
  from public.order_payments p
  where p.order_id=p_order_id and p.archived_at is null and (p.status='verified' or p.review_outcome='verified')
$$;
revoke all on function public.order_verified_funds_v1(uuid) from public,anon,authenticated;
grant execute on function public.order_verified_funds_v1(uuid) to service_role;

create or replace function public.request_order_cancellation_for_order_v1(p_order_id uuid,p_reason text)
returns public.order_cancellation_requests
language plpgsql security definer set search_path='' as $$
declare o public.orders; row_value public.order_cancellation_requests; verified_value bigint; key_value text;
begin
  if length(btrim(coalesce(p_reason,'')))<5 then raise exception 'Alasan pembatalan wajib diisi'; end if;
  select * into o from public.orders where id=p_order_id and archived_at is null for update;
  if not found then raise exception 'Pesanan tidak ditemukan'; end if;
  if o.status in ('cancelled','dibatalkan','expired','completed','selesai','picked_up') then raise exception 'Pesanan terminal tidak dapat dibatalkan'; end if;
  select * into row_value from public.order_cancellation_requests where order_id=p_order_id and status in ('pending','approved','approved_refund_required') order by created_at desc limit 1;
  if found then return row_value; end if;
  verified_value:=public.order_verified_funds_v1(p_order_id);
  key_value:=format('cancel:%s:%s:%s',p_order_id,encode(digest(btrim(p_reason),'sha256'),'hex'),extract(epoch from clock_timestamp())::bigint);
  insert into public.order_cancellation_requests(order_id,request_key,reason,status,requires_refund,verified_amount_snapshot)
  values(p_order_id,key_value,btrim(p_reason),'pending',verified_value>0,verified_value) returning * into row_value;
  insert into public.order_tasks(task_key,order_id,task_type,status,priority,assigned_role,title,description,related_path,stage_snapshot)
  values(format('order:%s:cancellation_review:%s',p_order_id,row_value.id),p_order_id,'cancellation_review','open','high','admin','Periksa Permintaan Pembatalan',btrim(p_reason),
    format('/admin/refunds?order=%s',p_order_id),jsonb_build_object('cancellation_request_id',row_value.id,'verified_amount',verified_value))
  on conflict(task_key) do nothing;
  perform public.enqueue_customer_notification_v1(p_order_id,'cancellation_requested',format('order:%s:cancellation:%s',p_order_id,row_value.id),jsonb_build_object('request_id',row_value.id));
  return row_value;
end $$;
revoke all on function public.request_order_cancellation_for_order_v1(uuid,text) from public,anon,authenticated;
grant execute on function public.request_order_cancellation_for_order_v1(uuid,text) to service_role;

create or replace function public.decide_order_cancellation_v1(p_request_id uuid,p_approve boolean,p_reason text)
returns jsonb
language plpgsql security definer set search_path='' as $$
declare req public.order_cancellation_requests; o public.orders; verified_value bigint; case_value public.refund_cases; remaining bigint; p record; allocation_value bigint;
begin
  if not public.has_permission('refund.manage') and not public.has_permission('order.cancel') then raise exception 'Tidak berwenang memutuskan pembatalan'; end if;
  if length(btrim(coalesce(p_reason,'')))<3 then raise exception 'Alasan keputusan wajib diisi'; end if;
  select * into req from public.order_cancellation_requests where id=p_request_id for update;
  if not found or req.status<>'pending' then raise exception 'Permintaan pembatalan tidak aktif'; end if;
  select * into o from public.orders where id=req.order_id for update;
  if p_approve and exists(
    select 1 from public.fulfillments
    where order_id=req.order_id and archived_at is null and status in ('shipped','in_transit','delivered','picked_up')
  ) then
    raise exception 'Pesanan yang sudah diserahkan ke kurir atau pelanggan memerlukan workflow retur';
  end if;
  if p_approve and exists(
    select 1 from public.order_payments p
    where p.order_id=req.order_id and p.archived_at is null
      and p.status='pending' and p.review_outcome='pending'
  ) then
    raise exception 'Bukti pembayaran yang sedang diperiksa harus diselesaikan sebelum pembatalan diputuskan';
  end if;
  if not p_approve then
    update public.order_cancellation_requests set status='rejected',decided_at=now(),decided_by=auth.uid(),decision_reason=btrim(p_reason),updated_at=now() where id=req.id returning * into req;
    update public.order_tasks set status='resolved',resolved_at=now(),resolved_by=auth.uid(),resolution='Permintaan pembatalan ditolak',updated_at=now()
    where order_id=req.order_id and task_type='cancellation_review' and status in ('open','acknowledged','in_progress','blocked');
    perform public.enqueue_customer_notification_v1(req.order_id,'cancellation_rejected',format('order:%s:cancellation-rejected:%s',req.order_id,req.id),jsonb_build_object('reason',p_reason));
    return jsonb_build_object('cancellation',to_jsonb(req));
  end if;
  verified_value:=public.order_verified_funds_v1(req.order_id);
  if verified_value<=0 then
    if exists(
      select 1 from public.fulfillments
      where order_id=req.order_id and archived_at is null and status in ('shipped','in_transit','delivered','picked_up')
    ) then
      raise exception 'Pesanan yang sudah diserahkan ke kurir atau pelanggan memerlukan workflow retur';
    end if;
    update public.fulfillments
    set status='cancelled',cancelled_at=now(),cancel_reason=btrim(p_reason),updated_at=now(),updated_by=auth.uid()
    where order_id=req.order_id and archived_at is null and status<>'cancelled';
    update public.job_orders
    set status='cancelled',cancelled_at=now(),cancel_reason=btrim(p_reason),updated_at=now(),updated_by=auth.uid()
    where order_id=req.order_id and archived_at is null and status not in ('completed','cancelled');
    perform public.cancel_order_transactional(req.order_id,btrim(p_reason));
    update public.order_cancellation_requests set status='completed',requires_refund=false,verified_amount_snapshot=0,decided_at=now(),decided_by=auth.uid(),decision_reason=btrim(p_reason),updated_at=now() where id=req.id returning * into req;
    update public.order_tasks set status='resolved',resolved_at=now(),resolved_by=auth.uid(),resolution='Pesanan dibatalkan tanpa refund',updated_at=now()
    where order_id=req.order_id and task_type='cancellation_review' and status in ('open','acknowledged','in_progress','blocked');
    perform public.enqueue_customer_notification_v1(req.order_id,'cancelled',format('order:%s:cancelled:%s',req.order_id,req.id),jsonb_build_object('reason',p_reason));
    return jsonb_build_object('cancellation',to_jsonb(req));
  end if;
  update public.order_cancellation_requests set status='approved_refund_required',requires_refund=true,verified_amount_snapshot=verified_value,decided_at=now(),decided_by=auth.uid(),decision_reason=btrim(p_reason),updated_at=now() where id=req.id returning * into req;
  insert into public.refund_cases(refund_number,cancellation_request_id,order_id,amount,status,approved_at,approved_by,notes,updated_by)
  values('RFD-DEB-'||to_char(now(),'YYYY')||'-'||lpad(nextval('public.refund_number_seq')::text,5,'0'),req.id,req.order_id,verified_value,'approved',now(),auth.uid(),btrim(p_reason),auth.uid())
  on conflict(cancellation_request_id) do update set amount=excluded.amount,notes=excluded.notes,updated_at=now(),updated_by=auth.uid()
  returning * into case_value;
  remaining:=verified_value;
  for p in select id,coalesce(verified_amount,amount)::bigint amount_value from public.order_payments
    where order_id=req.order_id and archived_at is null and (status='verified' or review_outcome='verified') order by paid_at,id for update loop
    exit when remaining<=0; allocation_value:=least(remaining,p.amount_value);
    insert into public.refund_allocations(refund_case_id,source_payment_id,amount) values(case_value.id,p.id,allocation_value)
    on conflict(refund_case_id,source_payment_id) do update set amount=excluded.amount;
    remaining:=remaining-allocation_value;
  end loop;
  if remaining>0 then raise exception 'Alokasi refund tidak dapat menutup dana terverifikasi'; end if;
  update public.order_tasks set status='resolved',resolved_at=now(),resolved_by=auth.uid(),resolution='Pembatalan disetujui; lanjut refund',updated_at=now()
  where order_id=req.order_id and task_type='cancellation_review' and status in ('open','acknowledged','in_progress','blocked');
  insert into public.order_tasks(task_key,order_id,task_type,status,priority,assigned_role,title,description,related_path,stage_snapshot)
  values(format('order:%s:refund_process:%s',req.order_id,case_value.id),req.order_id,'refund_process','open','urgent','finance','Proses Refund Pelanggan',
    format('Refund %s sebesar %s',case_value.refund_number,case_value.amount),format('/admin/refunds?order=%s',req.order_id),jsonb_build_object('refund_case_id',case_value.id,'amount',case_value.amount))
  on conflict(task_key) do nothing;
  perform public.enqueue_customer_notification_v1(req.order_id,'refund_approved',format('order:%s:refund-approved:%s',req.order_id,case_value.id),jsonb_build_object('refund_number',case_value.refund_number,'amount',case_value.amount));
  return jsonb_build_object('cancellation',to_jsonb(req),'refund',to_jsonb(case_value));
end $$;
revoke all on function public.decide_order_cancellation_v1(uuid,boolean,text) from public,anon;
grant execute on function public.decide_order_cancellation_v1(uuid,boolean,text) to authenticated,service_role;

create or replace function public.restore_refunded_order_stock_v1(p_order_id uuid,p_reason text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r record; restored integer:=0; prep public.pickup_preparations;
begin
  for r in select * from public.stock_reservations where order_id=p_order_id and status='consumed' order by variant_size_id for update loop
    update public.product_variant_sizes set stock=coalesce(stock_quantity,stock,0)+r.quantity,stock_quantity=coalesce(stock_quantity,stock,0)+r.quantity,updated_at=now()
    where id=r.variant_size_id;
    update public.stock_reservations set status='released',released_at=now(),extension_reason='Dipulihkan setelah refund',updated_at=now(),updated_by=auth.uid() where id=r.id;
    restored:=restored+1;
  end loop;
  if exists(select 1 from public.stock_reservations where order_id=p_order_id and status='active') then perform public.release_public_order_stock(p_order_id,p_reason,auth.uid()); end if;
  select * into prep from public.pickup_preparations where order_id=p_order_id for update;
  if found then
    for r in select * from public.pickup_preparation_items where preparation_id=prep.id and reserved_quantity>0 for update loop
      update public.inventory_balances set reserved_quantity=greatest(reserved_quantity-r.reserved_quantity,0),updated_at=now(),updated_by=auth.uid()
      where location_id=prep.location_id and variant_size_id=r.variant_size_id;
      update public.pickup_preparation_items set reserved_quantity=0 where id=r.id;
    end loop;
    update public.pickup_preparations set status='cancelled',released_at=now(),updated_at=now(),updated_by=auth.uid() where id=prep.id;
  end if;
  return jsonb_build_object('legacy_reservations_restored',restored);
end $$;
revoke all on function public.restore_refunded_order_stock_v1(uuid,text) from public,anon,authenticated;
grant execute on function public.restore_refunded_order_stock_v1(uuid,text) to service_role;

create or replace function public.record_refund_evidence_v1(
  p_refund_case_id uuid,p_bucket text,p_object_path text,p_file_name text,p_mime_type text,p_size_bytes bigint,p_transfer_reference text,p_transferred_at timestamptz
)
returns public.refund_cases
language plpgsql security definer set search_path='' as $$
declare case_value public.refund_cases; allocation record; adjustment_value uuid; req public.order_cancellation_requests; o public.orders;
begin
  if not public.has_permission('refund.manage') then raise exception 'Tidak berwenang mencatat bukti refund'; end if;
  select * into case_value from public.refund_cases where id=p_refund_case_id for update;
  if not found or case_value.status not in ('approved','processing','failed') then raise exception 'Kasus refund tidak siap diproses'; end if;
  if p_bucket<>'refund-evidence' then raise exception 'Bucket bukti refund tidak valid'; end if;
  if length(btrim(coalesce(p_transfer_reference,'')))<3 or length(btrim(p_transfer_reference))>120 then
    raise exception 'Referensi transfer refund tidak valid';
  end if;
  if p_transferred_at is null or p_transferred_at>now()+interval '5 minutes' then
    raise exception 'Waktu transfer refund tidak valid';
  end if;
  if p_size_bytes<=0 or p_size_bytes>5242880 or p_mime_type not in ('image/png','image/jpeg','application/pdf') then
    raise exception 'File bukti refund tidak valid';
  end if;
  if nullif(btrim(coalesce(p_object_path,'')),'') is null
     or p_object_path not like case_value.id::text || '/%'
     or not exists(
       select 1 from storage.objects so
       where so.bucket_id=p_bucket and so.name=p_object_path
     ) then
    raise exception 'Bukti transfer refund tidak ditemukan di storage';
  end if;
  insert into public.refund_evidence(refund_case_id,bucket,object_path,file_name,mime_type,size_bytes,transfer_reference,transferred_at,created_by)
  values(case_value.id,p_bucket,p_object_path,p_file_name,p_mime_type,p_size_bytes,btrim(p_transfer_reference),p_transferred_at,auth.uid())
  on conflict(bucket,object_path) do nothing;
  if not exists(
    select 1 from public.refund_evidence e
    where e.refund_case_id=case_value.id and e.bucket=p_bucket and e.object_path=p_object_path
  ) then
    raise exception 'Bukti refund sudah terikat pada kasus lain';
  end if;
  for allocation in select * from public.refund_allocations where refund_case_id=case_value.id order by id for update loop
    if allocation.adjustment_id is null then
      insert into public.payment_adjustments(order_id,source_payment_id,adjustment_type,amount,effect_amount,status,reason,created_by,approved_by,approved_at)
      values(case_value.order_id,allocation.source_payment_id,'refund',allocation.amount,-allocation.amount,'approved',
        format('Refund %s; referensi %s',case_value.refund_number,p_transfer_reference),auth.uid(),auth.uid(),now()) returning id into adjustment_value;
      update public.refund_allocations set adjustment_id=adjustment_value where id=allocation.id;
    end if;
    update public.order_payments set status='refunded',updated_at=now(),updated_by=auth.uid(),admin_notes=concat_ws(E'\n',admin_notes,format('Refund %s',case_value.refund_number))
    where id=allocation.source_payment_id and (status='verified' or review_outcome='verified');
  end loop;
  perform public.refresh_order_payment_summary(case_value.order_id);
  update public.refund_cases set status='sent',sent_at=now(),sent_by=auth.uid(),updated_at=now(),updated_by=auth.uid(),failed_reason=null
  where id=case_value.id returning * into case_value;
  select * into req from public.order_cancellation_requests where id=case_value.cancellation_request_id for update;
  select * into o from public.orders where id=case_value.order_id for update;
  if exists(select 1 from public.fulfillments where order_id=o.id and archived_at is null and status in ('shipped','in_transit','delivered','picked_up')) then
    raise exception 'Pesanan yang sudah dikirim memerlukan workflow retur, bukan pembatalan langsung';
  end if;
  update public.fulfillments set status='cancelled',cancelled_at=now(),cancel_reason='Dibatalkan setelah refund',updated_at=now(),updated_by=auth.uid()
  where order_id=o.id and archived_at is null and status not in ('cancelled','delivered','picked_up');
  perform public.restore_refunded_order_stock_v1(o.id,'Stok dipulihkan setelah refund');
  update public.orders set status='cancelled',payment_status='refunded',payment_requirement_met=false,payment_production_eligible=false,
    payment_balance=total_amount::bigint,updated_at=now(),updated_by=auth.uid() where id=o.id;
  update public.order_cancellation_requests set status='completed',updated_at=now() where id=req.id;
  update public.order_tasks set status='resolved',resolved_at=now(),resolved_by=auth.uid(),resolution='Refund dikirim dan pembatalan selesai',updated_at=now()
  where order_id=o.id and task_type='refund_process' and status in ('open','acknowledged','in_progress','blocked');
  perform public.enqueue_customer_notification_v1(o.id,'refund_sent',format('order:%s:refund-sent:%s',o.id,case_value.id),jsonb_build_object('refund_number',case_value.refund_number,'amount',case_value.amount,'reference',p_transfer_reference));
  perform public.sync_order_handoff_v2(o.id,null);
  return case_value;
end $$;
revoke all on function public.record_refund_evidence_v1(uuid,text,text,text,text,bigint,text,timestamptz) from public,anon;
grant execute on function public.record_refund_evidence_v1(uuid,text,text,text,text,bigint,text,timestamptz) to authenticated,service_role;

-- ---------------------------------------------------------------------------
-- Phase 13: reconciliation and system health
-- ---------------------------------------------------------------------------
create table if not exists public.operations_health_runs(
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'running' check(status in ('running','healthy','warning','critical','failed')),
  summary jsonb not null default '{}'::jsonb,
  triggered_by uuid references auth.users(id) on delete set null,
  error_message text
);
create table if not exists public.operations_health_findings(
  id uuid primary key default gen_random_uuid(),
  finding_key text not null unique,
  run_id uuid not null references public.operations_health_runs(id) on delete restrict,
  order_id uuid references public.orders(id) on delete restrict,
  category text not null,
  severity text not null check(severity in ('warning','critical')),
  code text not null,
  message text not null,
  details jsonb not null default '{}'::jsonb,
  status text not null default 'open' check(status in ('open','resolved','ignored')),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists operations_health_findings_open_idx on public.operations_health_findings(status,severity,last_seen_at desc);
alter table public.operations_health_runs enable row level security;
alter table public.operations_health_findings enable row level security;
revoke all on public.operations_health_runs from public,anon,authenticated;
revoke all on public.operations_health_findings from public,anon,authenticated;
grant select on public.operations_health_runs,public.operations_health_findings to authenticated;
grant all on public.operations_health_runs,public.operations_health_findings to service_role;
drop policy if exists "health runs readable" on public.operations_health_runs;
drop policy if exists "health findings readable" on public.operations_health_findings;
create policy "health runs readable" on public.operations_health_runs for select to authenticated using(public.has_permission('operations.health.read'));
create policy "health findings readable" on public.operations_health_findings for select to authenticated using(public.has_permission('operations.health.read'));

create or replace function public.run_order_operations_health_v1()
returns jsonb
language plpgsql security definer set search_path='' as $$
declare run_value public.operations_health_runs; finding record; current_keys text[]:=array[]::text[]; warning_count integer:=0; critical_count integer:=0; task_key_value text;
begin
  if auth.role()<>'service_role' and not public.has_permission('operations.health.manage') then raise exception 'Tidak berwenang menjalankan rekonsiliasi'; end if;
  insert into public.operations_health_runs(triggered_by) values(auth.uid()) returning * into run_value;
  begin
  perform public.escalate_overdue_order_tasks_v1();
  perform public.process_pickup_deadlines_v1();

  for finding in
    select format('order:%s:terminal-pending-payment',o.id) finding_key,o.id order_id,'payment' category,'critical' severity,'terminal_pending_payment' code,
      'Order terminal masih memiliki pembayaran pending.' message,jsonb_build_object('order_status',o.status) details
    from public.orders o where o.archived_at is null and o.status in ('cancelled','dibatalkan','expired','completed','selesai')
      and exists(select 1 from public.order_payments p where p.order_id=o.id and p.archived_at is null and p.status='pending')
    union all
    select format('order:%s:terminal-open-task',o.id),o.id,'task','warning','terminal_open_task','Order terminal masih memiliki tugas aktif.',jsonb_build_object('status',o.status)
    from public.orders o where o.archived_at is null and o.status in ('cancelled','dibatalkan','expired','completed','selesai')
      and exists(select 1 from public.order_tasks t where t.order_id=o.id and t.archived_at is null and t.status in ('open','acknowledged','in_progress','blocked') and t.task_type<>'health_reconcile')
    union all
    select format('order:%s:failed-outbox',x.order_id),x.order_id,'outbox','warning','failed_outbox','Komunikasi pelanggan gagal dan perlu diulang.',jsonb_build_object('outbox_id',x.id,'attempt_count',x.attempt_count)
    from public.customer_notification_outbox x where x.status='failed' and coalesce(x.next_attempt_at,x.failed_at,now())<=now()
    union all
    select format('order:%s:pickup-overdue',p.order_id),p.order_id,'pickup','warning','pickup_overdue','Pickup melewati batas waktu.',jsonb_build_object('preparation_id',p.id,'deadline',p.pickup_deadline)
    from public.pickup_preparations p where p.status='no_show'
    union all
    select format('order:%s:refund-sent-no-evidence',r.order_id),r.order_id,'refund','critical','refund_sent_without_evidence','Refund berstatus dikirim tanpa bukti storage.',jsonb_build_object('refund_case_id',r.id)
    from public.refund_cases r where r.status='sent' and not exists(select 1 from public.refund_evidence e where e.refund_case_id=r.id)
    union all
    select format('variant:%s:active-reservation-overbooked',v.id),null::uuid,'inventory','critical','active_reservation_overbooked',
      'Reservasi aktif melebihi stok katalog.',
      jsonb_build_object('variant_size_id',v.id,'physical_stock',greatest(coalesce(v.stock_quantity,v.stock,0),0),'active_reserved',coalesce(r.active_reserved,0))
    from public.product_variant_sizes v
    left join lateral(
      select coalesce(sum(sr.quantity),0)::integer active_reserved
      from public.stock_reservations sr
      where sr.variant_size_id=v.id and sr.status='active' and sr.expires_at>now()
    )r on true
    where coalesce(r.active_reserved,0)>greatest(coalesce(v.stock_quantity,v.stock,0),0)
    union all
    select format('variant:%s:location-ledger-mismatch',v.id),null::uuid,'inventory','warning','location_ledger_mismatch',
      'Total stok lokasi tidak sama dengan stok katalog.',
      jsonb_build_object(
        'variant_size_id',v.id,'catalog_stock',greatest(coalesce(v.stock_quantity,v.stock,0),0),
        'location_on_hand',coalesce(b.location_on_hand,0),'in_transit',coalesce(tr.in_transit,0)
      )
    from public.product_variant_sizes v
    left join lateral(
      select coalesce(sum(ib.on_hand_quantity),0)::integer location_on_hand
      from public.inventory_balances ib where ib.variant_size_id=v.id
    )b on true
    left join lateral(
      select coalesce(sum(sti.quantity-sti.received_quantity),0)::integer in_transit
      from public.stock_transfer_items sti
      join public.stock_transfers st on st.id=sti.transfer_id
      where sti.variant_size_id=v.id and st.status='in_transit'
    )tr on true
    where greatest(coalesce(v.stock_quantity,v.stock,0),0)<>coalesce(b.location_on_hand,0)+coalesce(tr.in_transit,0)
    union all
    select format('order:%s:location-stock-negative',coalesce(m.order_id,'00000000-0000-0000-0000-000000000000'::uuid)),m.order_id,'inventory','critical','inventory_balance_invalid','Saldo stok lokasi tidak valid.',jsonb_build_object('location_id',b.location_id,'variant_size_id',b.variant_size_id)
    from public.inventory_balances b left join lateral(select order_id from public.inventory_movements im where im.location_id=b.location_id and im.variant_size_id=b.variant_size_id order by created_at desc limit 1)m on true
    where b.on_hand_quantity<0 or b.reserved_quantity<0 or b.reserved_quantity>b.on_hand_quantity
  loop
    current_keys:=array_append(current_keys,finding.finding_key);
    if finding.severity='critical' then critical_count:=critical_count+1; else warning_count:=warning_count+1; end if;
    insert into public.operations_health_findings(finding_key,run_id,order_id,category,severity,code,message,details,status,first_seen_at,last_seen_at,resolved_at)
    values(finding.finding_key,run_value.id,finding.order_id,finding.category,finding.severity,finding.code,finding.message,finding.details,'open',now(),now(),null)
    on conflict(finding_key) do update set run_id=excluded.run_id,order_id=excluded.order_id,category=excluded.category,severity=excluded.severity,
      code=excluded.code,message=excluded.message,details=excluded.details,status='open',last_seen_at=now(),resolved_at=null;
    if finding.order_id is not null and finding.severity='critical' then
      task_key_value:=format('order:%s:health_reconcile:%s',finding.order_id,finding.code);
      insert into public.order_tasks(task_key,order_id,task_type,status,priority,assigned_role,title,description,related_path,stage_snapshot)
      values(task_key_value,finding.order_id,'health_reconcile','open','urgent','super_admin','Perbaiki Temuan Rekonsiliasi',finding.message,
        format('/admin/operations-health?order=%s',finding.order_id),finding.details)
      on conflict(task_key) do update set status=case when public.order_tasks.status in ('resolved','cancelled') then 'open' else public.order_tasks.status end,
        priority='urgent',description=excluded.description,stage_snapshot=excluded.stage_snapshot,updated_at=now();
    end if;
  end loop;

  update public.operations_health_findings set status='resolved',resolved_at=now(),last_seen_at=now()
  where status='open' and not(finding_key=any(current_keys));
  update public.order_tasks t set status='resolved',resolved_at=now(),resolution='Temuan rekonsiliasi tidak lagi terdeteksi',updated_at=now()
  where t.task_type='health_reconcile' and t.status in ('open','acknowledged','in_progress','blocked')
    and not exists(select 1 from public.operations_health_findings f where f.order_id=t.order_id and f.status='open' and f.severity='critical');
  update public.operations_health_runs set completed_at=now(),status=case when critical_count>0 then 'critical' when warning_count>0 then 'warning' else 'healthy' end,
    summary=jsonb_build_object('critical',critical_count,'warning',warning_count,'checked_at',now()) where id=run_value.id;
  return jsonb_build_object('run_id',run_value.id,'status',case when critical_count>0 then 'critical' when warning_count>0 then 'warning' else 'healthy' end,'critical',critical_count,'warning',warning_count);
exception when others then
  update public.operations_health_runs
  set completed_at=now(),status='failed',error_message=left(sqlerrm,1000),
      summary=jsonb_build_object('failed_at',now())
  where id=run_value.id;
  return jsonb_build_object('run_id',run_value.id,'status','failed');
  end;
end $$;
revoke all on function public.run_order_operations_health_v1() from public,anon;
grant execute on function public.run_order_operations_health_v1() to authenticated,service_role;

commit;
