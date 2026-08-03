create or replace function public.permanently_delete_notification(p_notification_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare target_row public.notifications;
begin
  if not public.has_permission('permanent_delete') or not public.has_staff_role(array['superadmin','super_admin']) then raise exception 'Hanya Super Admin yang dapat menghapus permanen'; end if;
  select * into target_row from public.notifications where id=p_notification_id and archived_at is not null for update;
  if not found then raise exception 'Notifikasi harus berada di Gudang Arsip'; end if;
  insert into public.notification_deletion_audit(notification_id,event_id,recipient_id,snapshot,deleted_by)
  values(target_row.id,target_row.event_id,target_row.recipient_id,to_jsonb(target_row),auth.uid());
  delete from public.notifications where id=target_row.id;
end $$;;
