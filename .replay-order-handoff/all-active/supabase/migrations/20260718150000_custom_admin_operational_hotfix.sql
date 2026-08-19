begin;

-- Compatibility-only bridge. Phase 7's two frozen trigger functions call the
-- canonical 27-argument writer with one legacy reserved NULL argument. Keep
-- the frozen migration untouched and delegate the 28-argument shape here.
create or replace function public.record_pim_audit_event_v1(
  p_event_code text,p_event_version integer,p_category text,p_status text,
  p_actor_id uuid,p_actor_role text,p_actor_label text,p_source_module text,
  p_request_id text,p_operation_id uuid,p_idempotency_key text,p_entity_type text,
  p_entity_id uuid,p_entity_label text,p_product_id uuid,p_product_color_id uuid,
  p_variant_id uuid,p_sku text,p_batch_id uuid,p_parent_audit_id uuid,
  p_legacy_reserved_id uuid,p_duration_ms bigint,p_summary text,p_failure_code text,
  p_metadata jsonb,p_changes jsonb,p_entities jsonb,p_retention_class text
)
returns uuid
language sql
security definer
set search_path=''
as $$
  select public.record_pim_audit_event_v1(
    p_event_code,p_event_version,p_category,p_status,p_actor_id,p_actor_role,
    p_actor_label,p_source_module,p_request_id,p_operation_id,p_idempotency_key,
    p_entity_type,p_entity_id,p_entity_label,p_product_id,p_product_color_id,
    p_variant_id,p_sku,p_batch_id,p_parent_audit_id,p_duration_ms,p_summary,
    p_failure_code,p_metadata,p_changes,p_entities,p_retention_class
  )
$$;
revoke all on function public.record_pim_audit_event_v1(text,integer,text,text,uuid,text,text,text,text,uuid,text,text,uuid,text,uuid,uuid,uuid,text,uuid,uuid,uuid,bigint,text,text,jsonb,jsonb,jsonb,text) from public,anon,authenticated;
grant execute on function public.record_pim_audit_event_v1(text,integer,text,text,uuid,text,text,text,text,uuid,text,text,uuid,text,uuid,uuid,uuid,text,uuid,uuid,uuid,bigint,text,text,jsonb,jsonb,jsonb,text) to service_role;

-- Exactly one system-managed payment link may be active for an order. Expired
-- system links are revoked before a replacement is inserted by the server.
create unique index if not exists payment_submission_links_one_system_active_idx
  on public.payment_submission_links(order_id)
  where created_by is null and revoked_at is null and archived_at is null;

alter table public.notifications
  add column if not exists seen_at timestamptz,
  add column if not exists acknowledged_at timestamptz,
  add column if not exists action_required boolean not null default false,
  add column if not exists resolved_at timestamptz,
  add column if not exists resolved_by uuid references auth.users(id) on delete set null,
  add column if not exists priority text not null default 'normal',
  add column if not exists action_type text;

alter table public.notifications drop constraint if exists notifications_priority_check;
alter table public.notifications add constraint notifications_priority_check
  check(priority in ('low','normal','high','critical'));
create index if not exists notifications_action_queue_idx
  on public.notifications(recipient_id,created_at desc)
  where action_required and resolved_at is null and archived_at is null;

create or replace function public.resolve_notification_related_path_v1(
  p_entity_type text,p_entity_id uuid,p_payload jsonb,p_related_path text
)
returns text language plpgsql immutable set search_path='' as $$
declare order_id_value text:=coalesce(p_payload->>'order_id',p_payload->>'orderId');
begin
  if coalesce(p_related_path,'') ~ '^/admin/(orders|payments|job-orders|quality-control|fulfillments)(/|\?|#|$)'
     and p_related_path !~ '(\.\.|//)' then return p_related_path; end if;
  if p_entity_type='order' then return '/admin/orders/'||p_entity_id::text; end if;
  if p_entity_type='order_payment' then
    if order_id_value ~ '^[0-9a-fA-F-]{36}$' then return '/admin/orders/'||order_id_value||'#payment'; end if;
    return '/admin/payments?payment='||p_entity_id::text;
  end if;
  if p_entity_type='quotation' then return '/admin/orders/quotations/'||p_entity_id::text; end if;
  if p_entity_type='job_order' then return '/admin/job-orders/'||p_entity_id::text; end if;
  if p_entity_type='qc_record' then return '/admin/quality-control?record='||p_entity_id::text; end if;
  if p_entity_type='fulfillment' then return '/admin/fulfillments/'||p_entity_id::text; end if;
  return null;
end $$;
revoke all on function public.resolve_notification_related_path_v1(text,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.resolve_notification_related_path_v1(text,uuid,jsonb,text) to service_role;

create or replace function public.mark_notification_seen(p_notification_id uuid)
returns public.notifications language plpgsql security definer set search_path='' as $$
declare result_row public.notifications;
begin
  update public.notifications set seen_at=coalesce(seen_at,now())
  where id=p_notification_id and recipient_id=auth.uid() and archived_at is null
  returning * into result_row;
  if not found then raise exception 'Notifikasi aktif tidak ditemukan'; end if;
  return result_row;
end $$;

create or replace function public.acknowledge_notification(p_notification_id uuid)
returns public.notifications language plpgsql security definer set search_path='' as $$
declare result_row public.notifications;
begin
  update public.notifications set
    seen_at=coalesce(seen_at,now()),acknowledged_at=coalesce(acknowledged_at,now()),
    read_at=coalesce(read_at,now()),status=case when status='sent' then 'read' else status end
  where id=p_notification_id and recipient_id=auth.uid() and archived_at is null
  returning * into result_row;
  if not found then raise exception 'Notifikasi aktif tidak ditemukan'; end if;
  return result_row;
end $$;

revoke all on function public.mark_notification_seen(uuid),public.acknowledge_notification(uuid) from public,anon,authenticated;
grant execute on function public.mark_notification_seen(uuid),public.acknowledge_notification(uuid) to authenticated,service_role;

create or replace function public.emit_notification_event(
  p_event_code text,p_entity_type text,p_entity_id uuid,p_payload jsonb,
  p_idempotency_key text,p_recipient_ids uuid[],p_related_path text default null
)
returns public.notification_events language plpgsql security definer set search_path='' as $$
declare
  ev public.notification_events; recipient uuid; tpl public.notification_templates;
  rendered_title text; rendered_body text; actionable boolean;
  priority_value text; action_value text; target_value text;
begin
  if auth.uid() is not null and not public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin','finance','designer','production_admin','operator','quality_control','store_staff']) then raise exception 'Not authorized'; end if;
  select * into ev from public.notification_events where idempotency_key=p_idempotency_key;
  if found then return ev; end if;
  insert into public.notification_events(event_code,entity_type,entity_id,payload,idempotency_key,created_by)
  values(p_event_code,p_entity_type,p_entity_id,coalesce(p_payload,'{}'::jsonb),p_idempotency_key,auth.uid()) returning * into ev;
  actionable:=p_event_code in ('order_created','quotation_approved','mockup_revision','payment_submitted','payment_requirement_met','job_order_created','production_on_hold','qc_failed','ready_to_ship','ready_for_pickup');
  priority_value:=case when p_event_code in ('payment_submitted','production_on_hold','qc_failed') then 'high' when actionable then 'normal' else 'low' end;
  action_value:=case when actionable then 'open_entity' else null end;
  target_value:=public.resolve_notification_related_path_v1(p_entity_type,p_entity_id,coalesce(p_payload,'{}'::jsonb),p_related_path);
  for recipient in select distinct unnest(coalesce(p_recipient_ids,array[]::uuid[])) loop
    for tpl in select nt.* from public.notification_templates nt where nt.event_code=p_event_code and nt.active and nt.archived_at is null loop
      rendered_title:=coalesce(nullif(public.render_notification_template(tpl.title_template,p_payload),''),nullif(tpl.title_template,''),p_event_code,'Notifikasi DEBRODER');
      rendered_body:=coalesce(nullif(public.render_notification_template(tpl.body_template,p_payload),''),nullif(tpl.body_template,''),rendered_title);
      insert into public.notifications(event_id,recipient_id,channel,title,body,related_path,status,sent_at,action_required,priority,action_type)
      values(ev.id,recipient,tpl.channel,rendered_title,rendered_body,target_value,
        case when tpl.channel='in_app' then 'sent' when tpl.provider_configured then 'queued' else 'not_configured' end,
        case when tpl.channel='in_app' then now() else null end,actionable,priority_value,action_value)
      on conflict(event_id,recipient_id,channel) do nothing;
    end loop;
  end loop;
  return ev;
end $$;

create or replace function public.sync_payment_notifications_v1()
returns trigger language plpgsql security definer set search_path='' as $$
declare recipients uuid[]; order_number_value text;
begin
  if tg_op='INSERT' and new.status='pending' then
    select order_number into order_number_value from public.orders where id=new.order_id;
    recipients:=public.staff_notification_recipients(array['owner','superadmin','super_admin','admin','finance']);
    perform public.emit_notification_event('payment_submitted','order_payment',new.id,
      jsonb_build_object('order_id',new.order_id,'order_number',order_number_value,'payment_number',new.payment_number,'amount',new.amount),
      'payment_submitted:'||new.id::text,recipients,'/admin/orders/'||new.order_id::text||'#payment');
  elsif tg_op='UPDATE' and old.status is distinct from new.status and new.status in ('verified','rejected','refunded') then
    update public.notifications notification set action_required=false,resolved_at=coalesce(notification.resolved_at,now()),resolved_by=coalesce(notification.resolved_by,auth.uid())
    from public.notification_events event
    where notification.event_id=event.id and event.entity_type='order_payment' and event.entity_id=new.id and notification.resolved_at is null;
  end if;
  return new;
end $$;
drop trigger if exists sync_payment_notifications_v1 on public.order_payments;
create trigger sync_payment_notifications_v1 after insert or update of status on public.order_payments
for each row execute function public.sync_payment_notifications_v1();
revoke all on function public.sync_payment_notifications_v1() from public,anon,authenticated;

do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

commit;

-- ROLLBACK (owner-run only, after source rollback): drop the payment trigger,
-- publication membership only if added exclusively here, helper/RPC overloads,
-- partial indexes, constraints, and new notification columns. Do not drop
-- notification rows, payment rows, audit rows, orders, or Phase 7 objects.
