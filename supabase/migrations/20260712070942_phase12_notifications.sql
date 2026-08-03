create table if not exists public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  event_code text not null,
  channel text not null check (channel in ('in_app','email','whatsapp','sms','push')),
  title_template text not null,
  body_template text not null,
  active boolean not null default true,
  provider_configured boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  archived_by uuid references auth.users(id) on delete set null,
  archive_reason text,
  unique(event_code, channel)
);

create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  event_code text not null,
  entity_type text not null,
  entity_id uuid not null,
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text not null unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists notification_events_entity_idx on public.notification_events(entity_type,entity_id,created_at desc);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.notification_events(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  channel text not null default 'in_app' check (channel in ('in_app','email','whatsapp','sms','push')),
  title text not null,
  body text not null,
  related_path text,
  status text not null default 'queued' check (status in ('queued','sent','failed','read','archived','not_configured')),
  sent_at timestamptz,
  read_at timestamptz,
  archived_at timestamptz,
  archived_by uuid references auth.users(id) on delete set null,
  error_message text,
  created_at timestamptz not null default now(),
  unique(event_id,recipient_id,channel)
);
create index if not exists notifications_recipient_idx on public.notifications(recipient_id,status,created_at desc);

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  attempt_number integer not null default 1 check (attempt_number > 0),
  provider text,
  provider_message_id text,
  status text not null check (status in ('queued','sent','failed','not_configured')),
  error_message text,
  attempted_at timestamptz not null default now(),
  unique(notification_id,attempt_number)
);

insert into public.notification_templates(event_code,channel,title_template,body_template,provider_configured)
values
 ('quotation_sent','in_app','Quotation dikirim','Quotation {{reference}} telah dikirim.',true),
 ('quotation_approved','in_app','Quotation disetujui','Quotation {{reference}} telah disetujui.',true),
 ('mockup_ready','in_app','Mockup siap diperiksa','Mockup {{reference}} siap diperiksa.',true),
 ('mockup_revision','in_app','Revisi mockup','Mockup {{reference}} memerlukan revisi.',true),
 ('mockup_approved','in_app','Mockup disetujui','Mockup {{reference}} telah disetujui.',true),
 ('order_created','in_app','Pesanan dibuat','Pesanan {{reference}} telah dibuat.',true),
 ('payment_submitted','in_app','Pembayaran dikirim','Pembayaran untuk {{reference}} menunggu verifikasi.',true),
 ('payment_verified','in_app','Pembayaran diverifikasi','Pembayaran untuk {{reference}} telah diverifikasi.',true),
 ('payment_rejected','in_app','Pembayaran ditolak','Pembayaran untuk {{reference}} ditolak.',true),
 ('payment_requirement_met','in_app','Pembayaran memenuhi syarat','Pesanan {{reference}} dapat diproses ke produksi.',true),
 ('job_order_created','in_app','Job Order dibuat','Job Order {{reference}} telah dibuat.',true),
 ('production_started','in_app','Produksi dimulai','Produksi {{reference}} telah dimulai.',true),
 ('production_on_hold','in_app','Produksi ditahan','Produksi {{reference}} sedang ditahan.',true),
 ('qc_failed','in_app','QC tidak lulus','QC {{reference}} memerlukan perbaikan.',true),
 ('qc_passed','in_app','QC lulus','QC {{reference}} telah lulus.',true),
 ('ready_to_ship','in_app','Pesanan siap dikirim','Pesanan {{reference}} siap dikirim.',true),
 ('tracking_available','in_app','Nomor resi tersedia','Nomor resi untuk {{reference}} telah tersedia.',true),
 ('ready_for_pickup','in_app','Pesanan siap diambil','Pesanan {{reference}} siap diambil.',true),
 ('order_completed','in_app','Pesanan selesai','Pesanan {{reference}} telah selesai.',true)
on conflict(event_code,channel) do nothing;

create or replace function public.render_notification_template(p_template text,p_payload jsonb)
returns text language plpgsql immutable as $$
declare result text:=p_template; item record;
begin
 for item in select key,value from jsonb_each_text(coalesce(p_payload,'{}'::jsonb)) loop
   result:=replace(result,'{{'||item.key||'}}',item.value);
 end loop;
 return result;
end $$;

create or replace function public.emit_notification_event(
 p_event_code text,p_entity_type text,p_entity_id uuid,p_payload jsonb,p_idempotency_key text,
 p_recipient_ids uuid[],p_related_path text default null
)
returns public.notification_events
language plpgsql security definer set search_path=public
as $$
declare ev public.notification_events; recipient uuid; tpl public.notification_templates; rendered_title text; rendered_body text;
begin
 if auth.uid() is not null and not public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']) then raise exception 'Not authorized'; end if;
 select * into ev from public.notification_events where idempotency_key=p_idempotency_key;
 if found then return ev; end if;
 insert into public.notification_events(event_code,entity_type,entity_id,payload,idempotency_key,created_by)
 values(p_event_code,p_entity_type,p_entity_id,coalesce(p_payload,'{}'::jsonb),p_idempotency_key,auth.uid()) returning * into ev;

 for recipient in select distinct unnest(coalesce(p_recipient_ids,array[]::uuid[])) loop
   for tpl in select * from public.notification_templates where event_code=p_event_code and active and archived_at is null loop
     rendered_title:=public.render_notification_template(tpl.title_template,p_payload);
     rendered_body:=public.render_notification_template(tpl.body_template,p_payload);
     insert into public.notifications(event_id,recipient_id,channel,title,body,related_path,status,sent_at)
     values(ev.id,recipient,tpl.channel,rendered_title,rendered_body,p_related_path,
       case when tpl.channel='in_app' then 'sent' when tpl.provider_configured then 'queued' else 'not_configured' end,
       case when tpl.channel='in_app' then now() else null end)
     on conflict(event_id,recipient_id,channel) do nothing;
   end loop;
 end loop;
 return ev;
end $$;

create or replace function public.mark_notification_read(p_notification_id uuid)
returns public.notifications language plpgsql security definer set search_path=public
as $$
declare n public.notifications;
begin
 update public.notifications set status='read',read_at=coalesce(read_at,now())
 where id=p_notification_id and recipient_id=auth.uid() and archived_at is null
 returning * into n;
 if not found then raise exception 'Notification not found'; end if;
 return n;
end $$;

create or replace function public.mark_all_notifications_read()
returns integer language plpgsql security definer set search_path=public
as $$
declare c int;
begin
 update public.notifications set status='read',read_at=coalesce(read_at,now())
 where recipient_id=auth.uid() and archived_at is null and status in ('sent','queued');
 get diagnostics c=row_count; return c;
end $$;

create or replace function public.archive_notification(p_notification_id uuid)
returns public.notifications language plpgsql security definer set search_path=public
as $$
declare n public.notifications;
begin
 update public.notifications set archived_at=now(),archived_by=auth.uid(),status='archived'
 where id=p_notification_id and recipient_id=auth.uid() and archived_at is null returning * into n;
 if not found then raise exception 'Notification not found'; end if; return n;
end $$;

create or replace function public.restore_notification(p_notification_id uuid)
returns public.notifications language plpgsql security definer set search_path=public
as $$
declare n public.notifications;
begin
 update public.notifications set archived_at=null,archived_by=null,status=case when read_at is null then 'sent' else 'read' end
 where id=p_notification_id and recipient_id=auth.uid() and archived_at is not null returning * into n;
 if not found then raise exception 'Archived notification not found'; end if; return n;
end $$;

create or replace function public.permanently_delete_notification(p_notification_id uuid)
returns void language plpgsql security definer set search_path=public
as $$
begin
 if not public.has_staff_role(array['superadmin','super_admin']) then raise exception 'Only Super Admin'; end if;
 delete from public.notifications where id=p_notification_id and archived_at is not null;
 if not found then raise exception 'Notification must be archived'; end if;
end $$;

create or replace function public.archive_notification_template(p_template_id uuid,p_reason text default null)
returns public.notification_templates language plpgsql security definer set search_path=public
as $$
declare t public.notification_templates;
begin
 if not public.has_staff_role(array['superadmin','super_admin']) then raise exception 'Only Super Admin'; end if;
 update public.notification_templates set archived_at=now(),archived_by=auth.uid(),archive_reason=nullif(btrim(coalesce(p_reason,'')),''),active=false,updated_by=auth.uid(),updated_at=now()
 where id=p_template_id and archived_at is null returning * into t;
 if not found then raise exception 'Template not found'; end if; return t;
end $$;

create or replace function public.restore_notification_template(p_template_id uuid)
returns public.notification_templates language plpgsql security definer set search_path=public
as $$
declare t public.notification_templates;
begin
 if not public.has_staff_role(array['superadmin','super_admin']) then raise exception 'Only Super Admin'; end if;
 update public.notification_templates set archived_at=null,archived_by=null,archive_reason=null,active=true,updated_by=auth.uid(),updated_at=now()
 where id=p_template_id and archived_at is not null returning * into t;
 if not found then raise exception 'Archived template not found'; end if; return t;
end $$;

alter table public.notification_templates enable row level security;
alter table public.notification_events enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_deliveries enable row level security;

drop policy if exists "staff read notification templates" on public.notification_templates;
create policy "staff read notification templates" on public.notification_templates for select to authenticated
using(public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']));

drop policy if exists "staff read notification events" on public.notification_events;
create policy "staff read notification events" on public.notification_events for select to authenticated
using(public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']));

drop policy if exists "recipient read notifications" on public.notifications;
create policy "recipient read notifications" on public.notifications for select to authenticated
using(recipient_id=auth.uid() or public.has_staff_role(array['superadmin','super_admin']));

drop policy if exists "recipient read deliveries" on public.notification_deliveries;
create policy "recipient read deliveries" on public.notification_deliveries for select to authenticated
using(exists(select 1 from public.notifications n where n.id=notification_id and (n.recipient_id=auth.uid() or public.has_staff_role(array['superadmin','super_admin']))));

grant select on public.notification_templates,public.notification_events,public.notifications,public.notification_deliveries to authenticated;
grant execute on function public.emit_notification_event(text,text,uuid,jsonb,text,uuid[],text),public.mark_notification_read(uuid),
 public.mark_all_notifications_read(),public.archive_notification(uuid),public.restore_notification(uuid),public.permanently_delete_notification(uuid),
 public.archive_notification_template(uuid,text),public.restore_notification_template(uuid) to authenticated;;
