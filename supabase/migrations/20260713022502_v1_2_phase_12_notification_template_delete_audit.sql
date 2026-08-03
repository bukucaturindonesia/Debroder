create or replace function public.permanently_delete_notification_template(p_template_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare target_row public.notification_templates;
begin
  if not public.has_permission('permanent_delete') or not public.has_staff_role(array['superadmin','super_admin']) then raise exception 'Hanya Super Admin yang dapat menghapus permanen'; end if;
  select * into target_row from public.notification_templates where id=p_template_id and archived_at is not null for update;
  if not found then raise exception 'Template harus berada di Gudang Arsip'; end if;
  insert into public.notification_template_deletion_audit(template_id,event_code,channel,snapshot,deleted_by)
  values(target_row.id,target_row.event_code,target_row.channel,to_jsonb(target_row),auth.uid());
  delete from public.notification_templates where id=target_row.id;
end $$;;
