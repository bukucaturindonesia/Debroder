create or replace function public.notify_mockup_history_trigger()
returns trigger language plpgsql security definer set search_path='' as $$
declare code_value text; reference_value text; quotation_id_value uuid;
begin
  code_value:=case when new.to_status='ready_for_review' then 'mockup_ready' when new.to_status='revision_requested' then 'mockup_revision' when new.to_status='approved' then 'mockup_approved' else null end;
  if code_value is null then return new; end if;
  select title,quotation_id into reference_value,quotation_id_value from public.mockup_sets where id=new.mockup_set_id;
  perform public.emit_notification_event(code_value,'mockup',new.mockup_set_id,jsonb_build_object('reference',coalesce(reference_value,new.mockup_set_id::text),'quotation_id',quotation_id_value),code_value||':'||new.id::text,public.staff_notification_recipients(),case when quotation_id_value is null then null else '/admin/orders/quotations/'||quotation_id_value::text end);
  return new;
end $$;
create or replace function public.notify_job_history_trigger()
returns trigger language plpgsql security definer set search_path='' as $$
declare code_value text; reference_value text;
begin
  code_value:=case new.to_status when 'draft' then 'job_order_created' when 'in_progress' then 'production_started' when 'on_hold' then 'production_on_hold' else null end;
  if code_value is null then return new; end if;
  select job_order_number into reference_value from public.job_orders where id=new.job_order_id;
  perform public.emit_notification_event(code_value,'job_order',new.job_order_id,jsonb_build_object('reference',coalesce(reference_value,new.job_order_id::text)),code_value||':'||new.id::text,public.staff_notification_recipients(),'/admin/job-orders/'||new.job_order_id::text);
  return new;
end $$;;
