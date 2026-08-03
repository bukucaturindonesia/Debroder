create or replace function public.notify_qc_history_trigger()
returns trigger language plpgsql security definer set search_path='' as $$
declare code_value text; reference_value text;
begin
  code_value:=case when new.to_result='passed' then 'qc_passed' when new.to_result in ('partial','failed','rework') then 'qc_failed' else null end;
  if code_value is null then return new; end if;
  select qc_number into reference_value from public.qc_records where id=new.qc_record_id;
  perform public.emit_notification_event(code_value,'qc_record',new.qc_record_id,jsonb_build_object('reference',coalesce(reference_value,new.qc_record_id::text)),code_value||':'||new.id::text,public.staff_notification_recipients(),'/admin/quality-control/'||new.qc_record_id::text);
  return new;
end $$;
create or replace function public.notify_fulfillment_history_trigger()
returns trigger language plpgsql security definer set search_path='' as $$
declare code_value text; reference_value text; tracking_value text; order_id_value uuid;
begin
  code_value:=case new.to_status when 'ready_to_ship' then 'ready_to_ship' when 'shipped' then 'tracking_available' when 'ready_for_pickup' then 'ready_for_pickup' when 'delivered' then 'order_completed' when 'picked_up' then 'order_completed' else null end;
  if code_value is null then return new; end if;
  select fulfillment_number,tracking_number,order_id into reference_value,tracking_value,order_id_value from public.fulfillments where id=new.fulfillment_id;
  perform public.emit_notification_event(code_value,'fulfillment',new.fulfillment_id,jsonb_build_object('reference',coalesce(reference_value,new.fulfillment_id::text),'tracking_number',tracking_value,'order_id',order_id_value),code_value||':'||new.id::text,public.staff_notification_recipients(),'/admin/fulfillments/'||new.fulfillment_id::text);
  return new;
end $$;;
