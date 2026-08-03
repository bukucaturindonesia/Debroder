create or replace function public.archive_notification(p_notification_id uuid,p_reason text)
returns public.notifications language plpgsql security definer set search_path='' as $$
declare result_row public.notifications;
begin
  update public.notifications set archived_at=now(),archived_by=auth.uid(),archive_reason=nullif(btrim(coalesce(p_reason,'')),''),status='archived'
  where id=p_notification_id and recipient_id=auth.uid() and archived_at is null returning * into result_row;
  if not found then raise exception 'Notifikasi aktif tidak ditemukan'; end if;
  return result_row;
end $$;
create or replace function public.archive_notification(p_notification_id uuid)
returns public.notifications language sql security definer set search_path='' as $$
  select public.archive_notification(p_notification_id,null)
$$;
create or replace function public.restore_notification(p_notification_id uuid)
returns public.notifications language plpgsql security definer set search_path='' as $$
declare result_row public.notifications;
begin
  update public.notifications set archived_at=null,archived_by=null,archive_reason=null,status=case when read_at is null then 'sent' else 'read' end
  where id=p_notification_id and recipient_id=auth.uid() and archived_at is not null returning * into result_row;
  if not found then raise exception 'Notifikasi arsip tidak ditemukan'; end if;
  return result_row;
end $$;;
