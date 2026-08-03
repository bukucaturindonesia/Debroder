-- DEBRODER v1.2 Phase 12 — remove duplicate emitters and align related admin paths.

create or replace function public.staff_notification_recipients()
returns uuid[]
language sql
stable
security definer
set search_path=''
as $$
  select coalesce(array_agg(profile_row.id),array[]::uuid[])
  from public.profiles profile_row
  where profile_row.role in ('owner','superadmin','super_admin','sales_admin','admin')
$$;

create or replace function public.staff_notification_recipients(p_roles text[])
returns uuid[]
language sql
stable
security definer
set search_path=''
as $$
  select coalesce(array_agg(profile_row.id),array[]::uuid[])
  from public.profiles profile_row
  where profile_row.role=any(p_roles)
$$;

-- Keep history-based event emitters as the authoritative source.
drop trigger if exists notify_order_payment_change on public.order_payments;
drop trigger if exists notify_job_order_change on public.job_orders;
drop trigger if exists notify_qc_change on public.qc_records;
drop trigger if exists notify_fulfillment_change on public.fulfillments;

create or replace function public.notify_order_created_trigger()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  perform public.emit_notification_event(
    'order_created',
    'order',
    new.id,
    jsonb_build_object(
      'reference',new.order_number,
      'customer_name',new.customer_name
    ),
    'order_created:'||new.id::text,
    public.staff_notification_recipients(),
    '/admin/orders/'||new.id::text
  );
  return new;
end $$;

drop trigger if exists notify_order_created on public.orders;
create trigger notify_order_created
after insert on public.orders
for each row execute function public.notify_order_created_trigger();

create or replace function public.notify_quotation_history_trigger()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  code_value text;
  reference_value text;
begin
  code_value:=case new.to_status
    when 'sent' then 'quotation_sent'
    when 'approved' then 'quotation_approved'
    else null
  end;
  if code_value is null then return new; end if;

  select quotation_row.quotation_number into reference_value
  from public.quotations quotation_row
  where quotation_row.id=new.quotation_id;

  perform public.emit_notification_event(
    code_value,
    'quotation',
    new.quotation_id,
    jsonb_build_object(
      'reference',coalesce(reference_value,new.quotation_id::text),
      'status',new.to_status
    ),
    code_value||':'||new.id::text,
    public.staff_notification_recipients(),
    '/admin/orders/quotations/'||new.quotation_id::text
  );
  return new;
end $$;

drop trigger if exists notify_quotation_history on public.quotation_status_history;
create trigger notify_quotation_history
after insert on public.quotation_status_history
for each row execute function public.notify_quotation_history_trigger();

create or replace function public.notify_mockup_history_trigger()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  code_value text;
  reference_value text;
  quotation_id_value uuid;
begin
  code_value:=case
    when new.to_status='ready_for_review' then 'mockup_ready'
    when new.to_status='revision_requested' then 'mockup_revision'
    when new.to_status='approved' then 'mockup_approved'
    else null
  end;
  if code_value is null then return new; end if;

  select mockup_row.title,mockup_row.quotation_id
  into reference_value,quotation_id_value
  from public.mockup_sets mockup_row
  where mockup_row.id=new.mockup_set_id;

  perform public.emit_notification_event(
    code_value,
    'mockup',
    new.mockup_set_id,
    jsonb_build_object(
      'reference',coalesce(reference_value,new.mockup_set_id::text),
      'quotation_id',quotation_id_value,
      'status',new.to_status
    ),
    code_value||':'||new.id::text,
    public.staff_notification_recipients(),
    case
      when quotation_id_value is null then null
      else '/admin/orders/quotations/'||quotation_id_value::text
    end
  );
  return new;
end $$;

drop trigger if exists notify_mockup_history on public.mockup_approval_history;
create trigger notify_mockup_history
after insert on public.mockup_approval_history
for each row execute function public.notify_mockup_history_trigger();

create or replace function public.notify_payment_history_trigger()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  code_value text;
  reference_value text;
begin
  code_value:=case new.action
    when 'customer_submitted' then 'payment_submitted'
    when 'verified' then 'payment_verified'
    when 'payment_verified' then 'payment_verified'
    when 'rejected' then 'payment_rejected'
    when 'payment_rejected' then 'payment_rejected'
    when 'requirement_met' then 'payment_requirement_met'
    else null
  end;
  if code_value is null then return new; end if;

  select order_row.order_number into reference_value
  from public.orders order_row
  where order_row.id=new.order_id;

  perform public.emit_notification_event(
    code_value,
    'order',
    new.order_id,
    jsonb_build_object(
      'reference',coalesce(reference_value,new.order_id::text),
      'action',new.action
    ),
    code_value||':'||new.id::text,
    public.staff_notification_recipients(),
    '/admin/orders/'||new.order_id::text
  );
  return new;
end $$;

drop trigger if exists notify_payment_history on public.payment_activity_history;
create trigger notify_payment_history
after insert on public.payment_activity_history
for each row execute function public.notify_payment_history_trigger();

create or replace function public.notify_job_history_trigger()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  code_value text;
  reference_value text;
begin
  code_value:=case new.to_status
    when 'draft' then 'job_order_created'
    when 'in_progress' then 'production_started'
    when 'on_hold' then 'production_on_hold'
    else null
  end;
  if code_value is null then return new; end if;

  select job_row.job_order_number into reference_value
  from public.job_orders job_row
  where job_row.id=new.job_order_id;

  perform public.emit_notification_event(
    code_value,
    'job_order',
    new.job_order_id,
    jsonb_build_object(
      'reference',coalesce(reference_value,new.job_order_id::text),
      'status',new.to_status
    ),
    code_value||':'||new.id::text,
    public.staff_notification_recipients(),
    '/admin/job-orders/'||new.job_order_id::text
  );
  return new;
end $$;

drop trigger if exists notify_job_history on public.job_order_status_history;
create trigger notify_job_history
after insert on public.job_order_status_history
for each row execute function public.notify_job_history_trigger();

create or replace function public.notify_qc_history_trigger()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  code_value text;
  reference_value text;
begin
  code_value:=case
    when new.to_result='passed' then 'qc_passed'
    when new.to_result in ('partial','failed','rework') then 'qc_failed'
    else null
  end;
  if code_value is null then return new; end if;

  select qc_row.qc_number into reference_value
  from public.qc_records qc_row
  where qc_row.id=new.qc_record_id;

  perform public.emit_notification_event(
    code_value,
    'qc_record',
    new.qc_record_id,
    jsonb_build_object(
      'reference',coalesce(reference_value,new.qc_record_id::text),
      'result',new.to_result
    ),
    code_value||':'||new.id::text,
    public.staff_notification_recipients(),
    '/admin/quality-control/'||new.qc_record_id::text
  );
  return new;
end $$;

drop trigger if exists notify_qc_history on public.qc_status_history;
create trigger notify_qc_history
after insert on public.qc_status_history
for each row execute function public.notify_qc_history_trigger();

create or replace function public.notify_fulfillment_history_trigger()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  code_value text;
  reference_value text;
  order_id_value uuid;
  tracking_value text;
begin
  code_value:=case new.to_status
    when 'ready_to_ship' then 'ready_to_ship'
    when 'ready_for_pickup' then 'ready_for_pickup'
    when 'delivered' then 'order_completed'
    when 'picked_up' then 'order_completed'
    else null
  end;
  if code_value is null then return new; end if;

  select fulfillment_row.fulfillment_number,
         fulfillment_row.order_id,
         fulfillment_row.tracking_number
  into reference_value,order_id_value,tracking_value
  from public.fulfillments fulfillment_row
  where fulfillment_row.id=new.fulfillment_id;

  perform public.emit_notification_event(
    code_value,
    'fulfillment',
    new.fulfillment_id,
    jsonb_build_object(
      'reference',coalesce(reference_value,new.fulfillment_id::text),
      'order_id',order_id_value,
      'tracking_number',tracking_value,
      'status',new.to_status
    ),
    code_value||':'||new.id::text,
    public.staff_notification_recipients(),
    '/admin/fulfillments/'||new.fulfillment_id::text
  );
  return new;
end $$;

drop trigger if exists notify_fulfillment_history on public.fulfillment_status_history;
create trigger notify_fulfillment_history
after insert on public.fulfillment_status_history
for each row execute function public.notify_fulfillment_history_trigger();

create or replace function public.notify_fulfillment_tracking_trigger()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if new.tracking_number is not distinct from old.tracking_number
     or new.tracking_number is null
     or btrim(new.tracking_number)='' then
    return new;
  end if;

  perform public.emit_notification_event(
    'tracking_available',
    'fulfillment',
    new.id,
    jsonb_build_object(
      'reference',coalesce(new.fulfillment_number,new.id::text),
      'order_id',new.order_id,
      'tracking_number',new.tracking_number,
      'courier',new.courier
    ),
    'tracking_available:'||new.id::text||':'||new.tracking_number,
    public.staff_notification_recipients(),
    '/admin/fulfillments/'||new.id::text
  );
  return new;
end $$;

drop trigger if exists notify_fulfillment_tracking_change on public.fulfillments;
create trigger notify_fulfillment_tracking_change
after update of tracking_number on public.fulfillments
for each row execute function public.notify_fulfillment_tracking_trigger();;
