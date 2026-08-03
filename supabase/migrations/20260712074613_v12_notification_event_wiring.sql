create or replace function public.staff_notification_recipients() returns uuid[] language sql stable security definer set search_path=public as $$
 select coalesce(array_agg(id),array[]::uuid[]) from public.profiles where role in ('owner','superadmin','super_admin','sales_admin','admin')
$$;

create or replace function public.notify_order_created_trigger() returns trigger language plpgsql security definer set search_path=public as $$ begin
 perform public.emit_notification_event('order_created','order',new.id,jsonb_build_object('reference',new.order_number),'order_created:'||new.id::text,public.staff_notification_recipients(),'/admin/orders/'||new.id::text); return new; end $$;
drop trigger if exists notify_order_created on public.orders;
create trigger notify_order_created after insert on public.orders for each row execute function public.notify_order_created_trigger();

create or replace function public.notify_quotation_history_trigger() returns trigger language plpgsql security definer set search_path=public as $$
declare code text; ref text; begin
 code:=case new.to_status when 'sent' then 'quotation_sent' when 'approved' then 'quotation_approved' else null end;
 if code is null then return new; end if;
 select quotation_number into ref from public.quotations where id=new.quotation_id;
 perform public.emit_notification_event(code,'quotation',new.quotation_id,jsonb_build_object('reference',coalesce(ref,new.quotation_id::text)),code||':'||new.id::text,public.staff_notification_recipients(),'/admin/orders/quotations/'||new.quotation_id::text); return new; end $$;
drop trigger if exists notify_quotation_history on public.quotation_status_history;
create trigger notify_quotation_history after insert on public.quotation_status_history for each row execute function public.notify_quotation_history_trigger();

create or replace function public.notify_mockup_history_trigger() returns trigger language plpgsql security definer set search_path=public as $$
declare code text; ref text; begin
 code:=case when new.to_status='ready_for_review' then 'mockup_ready' when new.to_status='revision_requested' then 'mockup_revision' when new.to_status='approved' then 'mockup_approved' else null end;
 if code is null then return new; end if;
 select title into ref from public.mockup_sets where id=new.mockup_set_id;
 perform public.emit_notification_event(code,'mockup',new.mockup_set_id,jsonb_build_object('reference',coalesce(ref,new.mockup_set_id::text)),code||':'||new.id::text,public.staff_notification_recipients(),null); return new; end $$;
drop trigger if exists notify_mockup_history on public.mockup_approval_history;
create trigger notify_mockup_history after insert on public.mockup_approval_history for each row execute function public.notify_mockup_history_trigger();

create or replace function public.notify_payment_history_trigger() returns trigger language plpgsql security definer set search_path=public as $$
declare code text; ref text; begin
 code:=case new.action when 'customer_submitted' then 'payment_submitted' when 'verified' then 'payment_verified' when 'payment_verified' then 'payment_verified' when 'rejected' then 'payment_rejected' when 'payment_rejected' then 'payment_rejected' when 'requirement_met' then 'payment_requirement_met' else null end;
 if code is null then return new; end if;
 select order_number into ref from public.orders where id=new.order_id;
 perform public.emit_notification_event(code,'order',new.order_id,jsonb_build_object('reference',coalesce(ref,new.order_id::text)),code||':'||new.id::text,public.staff_notification_recipients(),'/admin/orders/'||new.order_id::text); return new; end $$;
drop trigger if exists notify_payment_history on public.payment_activity_history;
create trigger notify_payment_history after insert on public.payment_activity_history for each row execute function public.notify_payment_history_trigger();

create or replace function public.notify_job_history_trigger() returns trigger language plpgsql security definer set search_path=public as $$
declare code text; ref text; begin
 code:=case new.to_status when 'draft' then 'job_order_created' when 'in_progress' then 'production_started' when 'on_hold' then 'production_on_hold' else null end;
 if code is null then return new; end if;
 select job_order_number into ref from public.job_orders where id=new.job_order_id;
 perform public.emit_notification_event(code,'job_order',new.job_order_id,jsonb_build_object('reference',coalesce(ref,new.job_order_id::text)),code||':'||new.id::text,public.staff_notification_recipients(),'/admin/production/job-orders/'||new.job_order_id::text); return new; end $$;
drop trigger if exists notify_job_history on public.job_order_status_history;
create trigger notify_job_history after insert on public.job_order_status_history for each row execute function public.notify_job_history_trigger();

create or replace function public.notify_qc_history_trigger() returns trigger language plpgsql security definer set search_path=public as $$
declare code text; ref text; begin
 code:=case when new.to_result='passed' then 'qc_passed' when new.to_result in ('partial','failed','rework') then 'qc_failed' else null end;
 if code is null then return new; end if;
 select qc_number into ref from public.qc_records where id=new.qc_record_id;
 perform public.emit_notification_event(code,'qc_record',new.qc_record_id,jsonb_build_object('reference',coalesce(ref,new.qc_record_id::text)),code||':'||new.id::text,public.staff_notification_recipients(),'/admin/quality-control'); return new; end $$;
drop trigger if exists notify_qc_history on public.qc_status_history;
create trigger notify_qc_history after insert on public.qc_status_history for each row execute function public.notify_qc_history_trigger();

create or replace function public.notify_fulfillment_history_trigger() returns trigger language plpgsql security definer set search_path=public as $$
declare code text; ref text; begin
 code:=case new.to_status when 'ready_to_ship' then 'ready_to_ship' when 'shipped' then 'tracking_available' when 'ready_for_pickup' then 'ready_for_pickup' when 'delivered' then 'order_completed' when 'picked_up' then 'order_completed' else null end;
 if code is null then return new; end if;
 select fulfillment_number into ref from public.fulfillments where id=new.fulfillment_id;
 perform public.emit_notification_event(code,'fulfillment',new.fulfillment_id,jsonb_build_object('reference',coalesce(ref,new.fulfillment_id::text)),code||':'||new.id::text,public.staff_notification_recipients(),'/admin/fulfillment'); return new; end $$;
drop trigger if exists notify_fulfillment_history on public.fulfillment_status_history;
create trigger notify_fulfillment_history after insert on public.fulfillment_status_history for each row execute function public.notify_fulfillment_history_trigger();;
