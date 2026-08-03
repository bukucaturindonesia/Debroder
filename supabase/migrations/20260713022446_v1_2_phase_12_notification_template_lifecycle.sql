create or replace function public.archive_notification_template(p_template_id uuid,p_reason text default null)
returns public.notification_templates language plpgsql security definer set search_path='' as $$
declare result_row public.notification_templates; reason_value text:=nullif(btrim(coalesce(p_reason,'')),'');
begin
  if not public.has_permission('notification.manage') then raise exception 'Tidak berwenang mengarsipkan template notifikasi'; end if;
  if reason_value is null then raise exception 'Alasan arsip wajib diisi'; end if;
  update public.notification_templates set archived_at=now(),archived_by=auth.uid(),archive_reason=reason_value,active=false,updated_by=auth.uid(),updated_at=now()
  where id=p_template_id and archived_at is null returning * into result_row;
  if not found then raise exception 'Template notifikasi aktif tidak ditemukan'; end if;
  return result_row;
end $$;
create or replace function public.restore_notification_template(p_template_id uuid)
returns public.notification_templates language plpgsql security definer set search_path='' as $$
declare result_row public.notification_templates;
begin
  if not public.has_permission('notification.manage') then raise exception 'Tidak berwenang memulihkan template notifikasi'; end if;
  update public.notification_templates set archived_at=null,archived_by=null,archive_reason=null,active=true,updated_by=auth.uid(),updated_at=now()
  where id=p_template_id and archived_at is not null returning * into result_row;
  if not found then raise exception 'Template notifikasi arsip tidak ditemukan'; end if;
  return result_row;
end $$;;
