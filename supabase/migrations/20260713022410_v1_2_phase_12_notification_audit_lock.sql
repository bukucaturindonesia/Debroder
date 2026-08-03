create or replace function public.prevent_notification_audit_mutation()
returns trigger language plpgsql set search_path='' as $$
begin
  raise exception 'Audit notifikasi bersifat permanen dan tidak dapat diubah';
end $$;
drop trigger if exists prevent_notification_deletion_audit_mutation on public.notification_deletion_audit;
create trigger prevent_notification_deletion_audit_mutation before update or delete on public.notification_deletion_audit for each row execute function public.prevent_notification_audit_mutation();
drop trigger if exists prevent_notification_template_deletion_audit_mutation on public.notification_template_deletion_audit;
create trigger prevent_notification_template_deletion_audit_mutation before update or delete on public.notification_template_deletion_audit for each row execute function public.prevent_notification_audit_mutation();;
