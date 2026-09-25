begin;

-- Fulfillment history emits notifications inside the same transaction. Keep a
-- malformed/ambiguous render from inserting NULL into required title/body.
create or replace function public.emit_notification_event(
  p_event_code text,p_entity_type text,p_entity_id uuid,p_payload jsonb,
  p_idempotency_key text,p_recipient_ids uuid[],p_related_path text default null
)
returns public.notification_events
language plpgsql
security definer
set search_path=''
as $$
declare
  ev public.notification_events;
  recipient uuid;
  tpl public.notification_templates;
  rendered_title text;
  rendered_body text;
begin
  if auth.uid() is not null and not public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']) then raise exception 'Not authorized'; end if;
  select * into ev from public.notification_events where idempotency_key=p_idempotency_key;
  if found then return ev; end if;
  insert into public.notification_events(event_code,entity_type,entity_id,payload,idempotency_key,created_by)
  values(p_event_code,p_entity_type,p_entity_id,coalesce(p_payload,'{}'::jsonb),p_idempotency_key,auth.uid()) returning * into ev;
  for recipient in select distinct unnest(coalesce(p_recipient_ids,array[]::uuid[])) loop
    for tpl in select nt.* from public.notification_templates nt where nt.event_code=p_event_code and nt.active and nt.archived_at is null loop
      rendered_title:=coalesce(nullif(public.render_notification_template(tpl.title_template,p_payload),''),nullif(tpl.title_template,''),p_event_code,'Notifikasi DEBRODER');
      rendered_body:=coalesce(nullif(public.render_notification_template(tpl.body_template,p_payload),''),nullif(tpl.body_template,''),rendered_title);
      insert into public.notifications(event_id,recipient_id,channel,title,body,related_path,status,sent_at)
      values(ev.id,recipient,tpl.channel,rendered_title,rendered_body,p_related_path,
        case when tpl.channel='in_app' then 'sent' when tpl.provider_configured then 'queued' else 'not_configured' end,
        case when tpl.channel='in_app' then now() else null end)
      on conflict(event_id,recipient_id,channel) do nothing;
    end loop;
  end loop;
  return ev;
end;
$$;

commit;

-- Recovery: re-apply the previous emitter only while notification-producing
-- traffic is stopped. Notification history should never be deleted.
