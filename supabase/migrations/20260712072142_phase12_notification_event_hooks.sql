create or replace function public.staff_notification_recipients(p_roles text[] default array['owner','superadmin','super_admin','admin'])
returns uuid[] language sql stable security definer set search_path=public as $$
 select coalesce(array_agg(id),array[]::uuid[]) from public.profiles where role=any(p_roles)
$$;

create or replace function public.notify_payment_change()
returns trigger language plpgsql security definer set search_path=public as $$
declare code text; ref text; recipients uuid[];
begin
 if tg_op='INSERT' then code:='payment_submitted';
 elsif new.status is distinct from old.status and new.status='verified' then code:='payment_verified';
 elsif new.status is distinct from old.status and new.status='rejected' then code:='payment_rejected';
 else return new; end if;
 select order_number into ref from public.orders where id=new.order_id;
 recipients:=public.staff_notification_recipients();
 perform public.emit_notification_event(code,'order_payment',new.id,jsonb_build_object('reference',coalesce(ref,new.id::text),'order_id',new.order_id),
   code||':'||new.id::text||':'||coalesce(new.status,'created'),recipients,'/admin/orders/'||new.order_id::text);
 return new;
end $$;
drop trigger if exists notify_order_payment_change on public.order_payments;
create trigger notify_order_payment_change after insert or update of status on public.order_payments for each row execute function public.notify_payment_change();

create or replace function public.notify_job_order_change()
returns trigger language plpgsql security definer set search_path=public as $$
declare code text; recipients uuid[];
begin
 if tg_op='INSERT' then code:='job_order_created';
 elsif new.status is distinct from old.status and new.status='in_progress' then code:='production_started';
 elsif new.status is distinct from old.status and new.status='on_hold' then code:='production_on_hold';
 else return new; end if;
 recipients:=public.staff_notification_recipients();
 perform public.emit_notification_event(code,'job_order',new.id,jsonb_build_object('reference',coalesce(new.job_order_number,new.id::text),'order_id',new.order_id),
   code||':'||new.id::text||':'||coalesce(new.status,'created'),recipients,'/admin/job-orders');
 return new;
end $$;
drop trigger if exists notify_job_order_change on public.job_orders;
create trigger notify_job_order_change after insert or update of status on public.job_orders for each row execute function public.notify_job_order_change();

create or replace function public.notify_qc_change()
returns trigger language plpgsql security definer set search_path=public as $$
declare code text; recipients uuid[];
begin
 if tg_op<>'UPDATE' or new.result is not distinct from old.result or new.result='pending' then return new; end if;
 code:=case when new.result='passed' then 'qc_passed' else 'qc_failed' end;
 recipients:=public.staff_notification_recipients();
 perform public.emit_notification_event(code,'qc_record',new.id,jsonb_build_object('reference',coalesce(new.qc_number,new.id::text),'work_item_id',new.work_item_id),
   code||':'||new.id::text||':'||new.result,recipients,'/admin/qc');
 return new;
end $$;
drop trigger if exists notify_qc_change on public.qc_records;
create trigger notify_qc_change after update of result on public.qc_records for each row execute function public.notify_qc_change();

create or replace function public.notify_fulfillment_change()
returns trigger language plpgsql security definer set search_path=public as $$
declare code text; recipients uuid[];
begin
 if tg_op='INSERT' and new.status='ready_for_pickup' then code:='ready_for_pickup';
 elsif tg_op='UPDATE' and new.status is distinct from old.status and new.status='ready_to_ship' then code:='ready_to_ship';
 elsif tg_op='UPDATE' and new.tracking_number is distinct from old.tracking_number and new.tracking_number is not null then code:='tracking_available';
 elsif tg_op='UPDATE' and new.status is distinct from old.status and new.status in ('delivered','picked_up') then code:='order_completed';
 else return new; end if;
 recipients:=public.staff_notification_recipients();
 perform public.emit_notification_event(code,'fulfillment',new.id,jsonb_build_object('reference',coalesce(new.fulfillment_number,new.id::text),'order_id',new.order_id),
   code||':'||new.id::text||':'||coalesce(new.status,'')||':'||coalesce(new.tracking_number,''),recipients,'/admin/fulfillments');
 return new;
end $$;
drop trigger if exists notify_fulfillment_change on public.fulfillments;
create trigger notify_fulfillment_change after insert or update of status,tracking_number on public.fulfillments for each row execute function public.notify_fulfillment_change();;
