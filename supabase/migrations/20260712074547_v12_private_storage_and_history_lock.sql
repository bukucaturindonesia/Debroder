create or replace function public.prevent_operational_history_change() returns trigger language plpgsql as $$ begin raise exception 'Operational history is append-only'; end $$;

drop trigger if exists prevent_job_order_status_history_mutation on public.job_order_status_history;
create trigger prevent_job_order_status_history_mutation before update or delete on public.job_order_status_history for each row execute function public.prevent_operational_history_change();
drop trigger if exists prevent_job_order_revisions_mutation on public.job_order_revisions;
create trigger prevent_job_order_revisions_mutation before update or delete on public.job_order_revisions for each row execute function public.prevent_operational_history_change();
drop trigger if exists prevent_work_item_assignment_history_mutation on public.work_item_assignment_history;
create trigger prevent_work_item_assignment_history_mutation before update or delete on public.work_item_assignment_history for each row execute function public.prevent_operational_history_change();
drop trigger if exists prevent_work_item_status_history_mutation on public.work_item_status_history;
create trigger prevent_work_item_status_history_mutation before update or delete on public.work_item_status_history for each row execute function public.prevent_operational_history_change();
drop trigger if exists prevent_qc_status_history_mutation on public.qc_status_history;
create trigger prevent_qc_status_history_mutation before update or delete on public.qc_status_history for each row execute function public.prevent_operational_history_change();
drop trigger if exists prevent_fulfillment_status_history_mutation on public.fulfillment_status_history;
create trigger prevent_fulfillment_status_history_mutation before update or delete on public.fulfillment_status_history for each row execute function public.prevent_operational_history_change();
drop trigger if exists prevent_notification_events_mutation on public.notification_events;
create trigger prevent_notification_events_mutation before update or delete on public.notification_events for each row execute function public.prevent_operational_history_change();
drop trigger if exists prevent_notification_deliveries_mutation on public.notification_deliveries;
create trigger prevent_notification_deliveries_mutation before update or delete on public.notification_deliveries for each row execute function public.prevent_operational_history_change();
drop trigger if exists prevent_repeat_order_history_mutation on public.repeat_order_history;
create trigger prevent_repeat_order_history_mutation before update or delete on public.repeat_order_history for each row execute function public.prevent_operational_history_change();

drop policy if exists "staff manage qc proof objects" on storage.objects;
drop policy if exists "staff manage fulfillment proof objects" on storage.objects;
drop policy if exists "staff read qc proof objects" on storage.objects;
drop policy if exists "staff upload qc proof objects" on storage.objects;
drop policy if exists "super admin delete qc proof objects" on storage.objects;
drop policy if exists "staff read fulfillment proof objects" on storage.objects;
drop policy if exists "staff upload fulfillment proof objects" on storage.objects;
drop policy if exists "super admin delete fulfillment proof objects" on storage.objects;
create policy "staff read qc proof objects" on storage.objects for select to authenticated using(bucket_id='qc-proofs' and public.has_permission('qc.inspect'));
create policy "staff upload qc proof objects" on storage.objects for insert to authenticated with check(bucket_id='qc-proofs' and owner=auth.uid() and public.has_permission('qc.inspect'));
create policy "super admin delete qc proof objects" on storage.objects for delete to authenticated using(bucket_id='qc-proofs' and public.has_permission('permanent_delete'));
create policy "staff read fulfillment proof objects" on storage.objects for select to authenticated using(bucket_id='fulfillment-proofs' and public.has_permission('shipping.update'));
create policy "staff upload fulfillment proof objects" on storage.objects for insert to authenticated with check(bucket_id='fulfillment-proofs' and owner=auth.uid() and public.has_permission('shipping.update'));
create policy "super admin delete fulfillment proof objects" on storage.objects for delete to authenticated using(bucket_id='fulfillment-proofs' and public.has_permission('permanent_delete'));

create or replace view public.actor_directory as
select p.id,p.email,p.role,coalesce(nullif(p.email,''),p.id::text) as display_name from public.profiles p
where public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']);
revoke all on public.actor_directory from public,anon;
grant select on public.actor_directory to authenticated;;
