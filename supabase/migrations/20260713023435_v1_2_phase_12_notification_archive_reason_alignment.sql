create or replace function public.archive_notification(p_notification_id uuid,p_reason text)
returns public.notifications
language plpgsql
security definer
set search_path=''
as $$
declare result_row public.notifications;
begin
  update public.notifications
  set status_before_archive=case when status='archived' then status_before_archive else status end,
      archived_at=now(),
      archived_by=auth.uid(),
      archive_reason=nullif(btrim(coalesce(p_reason,'')),''),
      status='archived'
  where id=p_notification_id
    and recipient_id=auth.uid()
    and archived_at is null
  returning * into result_row;
  if not found then raise exception 'Notifikasi aktif tidak ditemukan'; end if;
  return result_row;
end $$;

create or replace function public.archive_notification(p_notification_id uuid)
returns public.notifications
language sql
security definer
set search_path=''
as $$
  select public.archive_notification(p_notification_id,null)
$$;

revoke all on function public.archive_notification(uuid) from public,anon;
revoke all on function public.archive_notification(uuid,text) from public,anon;
grant execute on function public.archive_notification(uuid) to authenticated;
grant execute on function public.archive_notification(uuid,text) to authenticated;;
