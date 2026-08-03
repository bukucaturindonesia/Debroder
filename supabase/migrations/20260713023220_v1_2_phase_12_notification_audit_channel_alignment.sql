alter table public.notification_deletion_audit add column if not exists channel text;
update public.notification_deletion_audit set channel=coalesce(channel,snapshot->>'channel','in_app') where channel is null;
alter table public.notification_deletion_audit alter column channel set not null;;
