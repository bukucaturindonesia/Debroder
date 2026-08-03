-- DEBRODER v1.2 Phase 12 — RLS and explicit privilege boundary.

alter table public.notification_templates enable row level security;
alter table public.notification_events enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.notification_deletion_audit enable row level security;
alter table public.notification_template_deletion_audit enable row level security;

drop policy if exists "staff read notification templates" on public.notification_templates;
drop policy if exists "notification managers read templates" on public.notification_templates;
create policy "notification managers read templates"
on public.notification_templates
for select to authenticated
using(public.has_permission('notification.manage'));

drop policy if exists "staff read notification events" on public.notification_events;
create policy "staff read notification events"
on public.notification_events
for select to authenticated
using(public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']));

drop policy if exists "recipient read notifications" on public.notifications;
create policy "recipient read notifications"
on public.notifications
for select to authenticated
using(
  recipient_id=auth.uid()
  or public.has_staff_role(array['superadmin','super_admin'])
);

drop policy if exists "recipient read deliveries" on public.notification_deliveries;
create policy "recipient read deliveries"
on public.notification_deliveries
for select to authenticated
using(
  exists(
    select 1
    from public.notifications notification_row
    where notification_row.id=notification_id
      and (
        notification_row.recipient_id=auth.uid()
        or public.has_staff_role(array['superadmin','super_admin'])
      )
  )
);

revoke all on public.notification_templates,public.notification_events,
  public.notifications,public.notification_deliveries,
  public.notification_deletion_audit,public.notification_template_deletion_audit
from public,anon;

revoke insert,update,delete,truncate,references,trigger
on public.notification_templates,public.notification_events,
  public.notifications,public.notification_deliveries,
  public.notification_deletion_audit,public.notification_template_deletion_audit
from authenticated;

grant select on public.notification_templates,public.notification_events,
  public.notifications,public.notification_deliveries,
  public.notification_deletion_audit,public.notification_template_deletion_audit
to authenticated;

revoke all on function public.render_notification_template(text,jsonb)
from public,anon,authenticated;
revoke all on function public.emit_notification_event(text,text,uuid,jsonb,text,uuid[],text)
from public,anon,authenticated;
revoke all on function public.staff_notification_recipients()
from public,anon,authenticated;
revoke all on function public.staff_notification_recipients(text[])
from public,anon,authenticated;

grant execute on function public.render_notification_template(text,jsonb) to service_role;
grant execute on function public.emit_notification_event(text,text,uuid,jsonb,text,uuid[],text)
to service_role;
grant execute on function public.staff_notification_recipients() to service_role;
grant execute on function public.staff_notification_recipients(text[]) to service_role;

revoke all on function public.mark_notification_read(uuid) from public,anon;
revoke all on function public.mark_all_notifications_read() from public,anon;
revoke all on function public.archive_notification(uuid) from public,anon;
revoke all on function public.restore_notification(uuid) from public,anon;
revoke all on function public.permanently_delete_notification(uuid) from public,anon;
revoke all on function public.create_notification_template(text,text,text,text,boolean)
from public,anon;
revoke all on function public.update_notification_template(uuid,text,text,boolean,boolean)
from public,anon;
revoke all on function public.archive_notification_template(uuid,text)
from public,anon;
revoke all on function public.restore_notification_template(uuid)
from public,anon;
revoke all on function public.permanently_delete_notification_template(uuid)
from public,anon;

grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;
grant execute on function public.archive_notification(uuid) to authenticated;
grant execute on function public.restore_notification(uuid) to authenticated;
grant execute on function public.permanently_delete_notification(uuid) to authenticated;
grant execute on function public.create_notification_template(text,text,text,text,boolean)
to authenticated;
grant execute on function public.update_notification_template(uuid,text,text,boolean,boolean)
to authenticated;
grant execute on function public.archive_notification_template(uuid,text)
to authenticated;
grant execute on function public.restore_notification_template(uuid)
to authenticated;
grant execute on function public.permanently_delete_notification_template(uuid)
to authenticated;

do $$
declare
  function_name_value text;
begin
  foreach function_name_value in array array[
    'notify_payment_change',
    'notify_job_order_change',
    'notify_qc_change',
    'notify_fulfillment_change',
    'notify_order_created_trigger',
    'notify_quotation_history_trigger',
    'notify_mockup_history_trigger',
    'notify_payment_history_trigger',
    'notify_job_history_trigger',
    'notify_qc_history_trigger',
    'notify_fulfillment_history_trigger',
    'notify_fulfillment_tracking_trigger',
    'set_notification_template_updated_at',
    'prevent_notification_delivery_mutation',
    'prevent_notification_audit_change'
  ] loop
    execute format(
      'revoke all on function public.%I() from public,anon,authenticated',
      function_name_value
    );
  end loop;
end $$;;
