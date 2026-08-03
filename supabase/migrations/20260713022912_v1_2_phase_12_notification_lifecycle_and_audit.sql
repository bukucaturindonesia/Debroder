-- DEBRODER v1.2 Phase 12 — notification lifecycle, audit, RLS, and privilege hardening.

alter table public.notifications
  add column if not exists status_before_archive text
  check (
    status_before_archive is null
    or status_before_archive in ('queued','sent','failed','read','not_configured')
  );

create table if not exists public.notification_deletion_audit (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null,
  event_id uuid not null,
  recipient_id uuid not null,
  channel text not null,
  snapshot jsonb not null,
  deleted_by uuid references auth.users(id) on delete set null,
  deleted_at timestamptz not null default now(),
  reason text not null default 'Hapus permanen dari Gudang Arsip'
);
create index if not exists notification_deletion_audit_recipient_idx
  on public.notification_deletion_audit(recipient_id,deleted_at desc);

create table if not exists public.notification_template_deletion_audit (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null,
  event_code text not null,
  channel text not null,
  snapshot jsonb not null,
  deleted_by uuid references auth.users(id) on delete set null,
  deleted_at timestamptz not null default now(),
  reason text not null default 'Hapus permanen template dari Gudang Arsip'
);
create index if not exists notification_template_deletion_audit_event_idx
  on public.notification_template_deletion_audit(event_code,channel,deleted_at desc);

insert into public.permission_definitions(permission_key,module,label,description)
values(
  'notification.manage',
  'notification',
  'Kelola notifikasi',
  'Mengelola template, event, serta lifecycle notifikasi dalam aplikasi.'
)
on conflict(permission_key) do update
set module=excluded.module,label=excluded.label,description=excluded.description;

insert into public.role_permissions(role,permission_key,granted)
values
  ('owner','notification.manage',true),
  ('superadmin','notification.manage',true),
  ('super_admin','notification.manage',true),
  ('admin','notification.manage',true)
on conflict(role,permission_key) do update set granted=excluded.granted,updated_at=now();

create or replace function public.set_notification_template_updated_at()
returns trigger
language plpgsql
set search_path=''
as $$
begin
  new.updated_at=now();
  return new;
end $$;

drop trigger if exists set_notification_template_updated_at on public.notification_templates;
create trigger set_notification_template_updated_at
before update on public.notification_templates
for each row execute function public.set_notification_template_updated_at();

create or replace function public.prevent_notification_delivery_mutation()
returns trigger
language plpgsql
set search_path=''
as $$
begin
  if current_setting('debroder.notification_permanent_delete',true)='on'
     and tg_op='DELETE' then
    return old;
  end if;
  raise exception 'Riwayat delivery notifikasi bersifat permanen dan tidak dapat diubah';
end $$;

drop trigger if exists prevent_notification_deliveries_mutation on public.notification_deliveries;
create trigger prevent_notification_deliveries_mutation
before update or delete on public.notification_deliveries
for each row execute function public.prevent_notification_delivery_mutation();

create or replace function public.prevent_notification_audit_change()
returns trigger
language plpgsql
set search_path=''
as $$
begin
  raise exception 'Audit penghapusan notifikasi bersifat permanen';
end $$;

drop trigger if exists prevent_notification_deletion_audit_mutation
  on public.notification_deletion_audit;
create trigger prevent_notification_deletion_audit_mutation
before update or delete on public.notification_deletion_audit
for each row execute function public.prevent_notification_audit_change();

drop trigger if exists prevent_notification_template_deletion_audit_mutation
  on public.notification_template_deletion_audit;
create trigger prevent_notification_template_deletion_audit_mutation
before update or delete on public.notification_template_deletion_audit
for each row execute function public.prevent_notification_audit_change();

create or replace function public.create_notification_template(
  p_event_code text,
  p_channel text,
  p_title_template text,
  p_body_template text,
  p_provider_configured boolean default false
)
returns public.notification_templates
language plpgsql
security definer
set search_path=''
as $$
declare
  result_row public.notification_templates;
  event_code_value text;
begin
  if not public.has_permission('notification.manage') then
    raise exception 'Tidak berwenang membuat template notifikasi';
  end if;
  if p_channel not in ('in_app','email','whatsapp','sms','push') then
    raise exception 'Channel notifikasi tidak valid';
  end if;

  event_code_value:=lower(regexp_replace(btrim(coalesce(p_event_code,'')),'[^a-zA-Z0-9_]+','_','g'));
  event_code_value:=trim(both '_' from event_code_value);

  if event_code_value='' then raise exception 'Kode event wajib diisi'; end if;
  if btrim(coalesce(p_title_template,''))='' then raise exception 'Judul template wajib diisi'; end if;
  if btrim(coalesce(p_body_template,''))='' then raise exception 'Isi template wajib diisi'; end if;
  if length(btrim(p_title_template))>160 then raise exception 'Judul template maksimal 160 karakter'; end if;
  if length(btrim(p_body_template))>2000 then raise exception 'Isi template maksimal 2000 karakter'; end if;

  insert into public.notification_templates(
    event_code,channel,title_template,body_template,active,provider_configured,
    created_by,updated_by
  )
  values(
    event_code_value,p_channel,btrim(p_title_template),btrim(p_body_template),true,
    case when p_channel='in_app' then true else coalesce(p_provider_configured,false) end,
    auth.uid(),auth.uid()
  )
  returning * into result_row;

  return result_row;
exception
  when unique_violation then
    raise exception 'Template untuk event dan channel tersebut sudah tersedia';
end $$;

create or replace function public.update_notification_template(
  p_template_id uuid,
  p_title_template text,
  p_body_template text,
  p_active boolean,
  p_provider_configured boolean
)
returns public.notification_templates
language plpgsql
security definer
set search_path=''
as $$
declare
  result_row public.notification_templates;
begin
  if not public.has_permission('notification.manage') then
    raise exception 'Tidak berwenang mengubah template notifikasi';
  end if;
  if btrim(coalesce(p_title_template,''))='' then raise exception 'Judul template wajib diisi'; end if;
  if btrim(coalesce(p_body_template,''))='' then raise exception 'Isi template wajib diisi'; end if;
  if length(btrim(p_title_template))>160 then raise exception 'Judul template maksimal 160 karakter'; end if;
  if length(btrim(p_body_template))>2000 then raise exception 'Isi template maksimal 2000 karakter'; end if;

  update public.notification_templates
  set title_template=btrim(p_title_template),
      body_template=btrim(p_body_template),
      active=coalesce(p_active,true),
      provider_configured=case
        when channel='in_app' then true
        else coalesce(p_provider_configured,false)
      end,
      updated_by=auth.uid(),
      updated_at=now()
  where id=p_template_id and archived_at is null
  returning * into result_row;

  if not found then raise exception 'Template aktif tidak ditemukan'; end if;
  return result_row;
end $$;

create or replace function public.archive_notification_template(
  p_template_id uuid,
  p_reason text default null
)
returns public.notification_templates
language plpgsql
security definer
set search_path=''
as $$
declare
  result_row public.notification_templates;
  reason_value text:=nullif(btrim(coalesce(p_reason,'')),'');
begin
  if not public.has_permission('notification.manage') then
    raise exception 'Tidak berwenang mengarsipkan template notifikasi';
  end if;
  if reason_value is null then raise exception 'Alasan arsip wajib diisi'; end if;

  update public.notification_templates
  set archived_at=now(),archived_by=auth.uid(),archive_reason=reason_value,
      active=false,updated_by=auth.uid(),updated_at=now()
  where id=p_template_id and archived_at is null
  returning * into result_row;

  if not found then raise exception 'Template aktif tidak ditemukan'; end if;
  return result_row;
end $$;

create or replace function public.restore_notification_template(p_template_id uuid)
returns public.notification_templates
language plpgsql
security definer
set search_path=''
as $$
declare
  result_row public.notification_templates;
begin
  if not public.has_permission('notification.manage') then
    raise exception 'Tidak berwenang memulihkan template notifikasi';
  end if;

  update public.notification_templates
  set archived_at=null,archived_by=null,archive_reason=null,active=true,
      updated_by=auth.uid(),updated_at=now()
  where id=p_template_id and archived_at is not null
  returning * into result_row;

  if not found then raise exception 'Template arsip tidak ditemukan'; end if;
  return result_row;
end $$;

create or replace function public.permanently_delete_notification_template(
  p_template_id uuid
)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare
  target_row public.notification_templates;
begin
  if not public.has_permission('permanent_delete')
     or not public.has_staff_role(array['superadmin','super_admin']) then
    raise exception 'Hanya Super Admin yang dapat menghapus permanen';
  end if;

  select * into target_row
  from public.notification_templates
  where id=p_template_id and archived_at is not null
  for update;
  if not found then raise exception 'Template wajib berada di Gudang Arsip'; end if;

  insert into public.notification_template_deletion_audit(
    template_id,event_code,channel,snapshot,deleted_by
  )
  values(
    target_row.id,target_row.event_code,target_row.channel,to_jsonb(target_row),auth.uid()
  );

  delete from public.notification_templates where id=target_row.id;
end $$;

create or replace function public.mark_notification_read(p_notification_id uuid)
returns public.notifications
language plpgsql
security definer
set search_path=''
as $$
declare
  result_row public.notifications;
begin
  update public.notifications
  set status='read',read_at=coalesce(read_at,now())
  where id=p_notification_id
    and recipient_id=auth.uid()
    and archived_at is null
  returning * into result_row;

  if not found then raise exception 'Notifikasi aktif tidak ditemukan'; end if;
  return result_row;
end $$;

create or replace function public.mark_all_notifications_read()
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare
  affected_count integer;
begin
  update public.notifications
  set status='read',read_at=coalesce(read_at,now())
  where recipient_id=auth.uid()
    and archived_at is null
    and read_at is null;

  get diagnostics affected_count=row_count;
  return affected_count;
end $$;

create or replace function public.archive_notification(p_notification_id uuid)
returns public.notifications
language plpgsql
security definer
set search_path=''
as $$
declare
  result_row public.notifications;
begin
  update public.notifications
  set status_before_archive=case when status='archived' then status_before_archive else status end,
      archived_at=now(),archived_by=auth.uid(),status='archived'
  where id=p_notification_id
    and recipient_id=auth.uid()
    and archived_at is null
  returning * into result_row;

  if not found then raise exception 'Notifikasi aktif tidak ditemukan'; end if;
  return result_row;
end $$;

create or replace function public.restore_notification(p_notification_id uuid)
returns public.notifications
language plpgsql
security definer
set search_path=''
as $$
declare
  result_row public.notifications;
begin
  update public.notifications
  set archived_at=null,
      archived_by=null,
      status=coalesce(
        status_before_archive,
        case when read_at is null then 'sent' else 'read' end
      ),
      status_before_archive=null
  where id=p_notification_id
    and recipient_id=auth.uid()
    and archived_at is not null
  returning * into result_row;

  if not found then raise exception 'Notifikasi arsip tidak ditemukan'; end if;
  return result_row;
end $$;

create or replace function public.permanently_delete_notification(
  p_notification_id uuid
)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare
  target_row public.notifications;
begin
  if not public.has_permission('permanent_delete')
     or not public.has_staff_role(array['superadmin','super_admin']) then
    raise exception 'Hanya Super Admin yang dapat menghapus permanen';
  end if;

  select * into target_row
  from public.notifications
  where id=p_notification_id and archived_at is not null
  for update;
  if not found then raise exception 'Notifikasi wajib berada di Gudang Arsip'; end if;

  insert into public.notification_deletion_audit(
    notification_id,event_id,recipient_id,channel,snapshot,deleted_by
  )
  values(
    target_row.id,target_row.event_id,target_row.recipient_id,target_row.channel,
    to_jsonb(target_row),auth.uid()
  );

  perform set_config('debroder.notification_permanent_delete','on',true);
  delete from public.notification_deliveries where notification_id=target_row.id;
  delete from public.notifications where id=target_row.id;
end $$;

alter table public.notification_deletion_audit enable row level security;
alter table public.notification_template_deletion_audit enable row level security;

drop policy if exists "super admin read notification deletion audit"
  on public.notification_deletion_audit;
create policy "super admin read notification deletion audit"
on public.notification_deletion_audit
for select to authenticated
using(
  public.has_permission('permanent_delete')
  and public.has_staff_role(array['superadmin','super_admin'])
);

drop policy if exists "super admin read notification template deletion audit"
  on public.notification_template_deletion_audit;
create policy "super admin read notification template deletion audit"
on public.notification_template_deletion_audit
for select to authenticated
using(
  public.has_permission('permanent_delete')
  and public.has_staff_role(array['superadmin','super_admin'])
);;
