alter table public.notifications add column if not exists archive_reason text;
create table if not exists public.notification_deletion_audit (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null,
  event_id uuid not null,
  recipient_id uuid not null,
  snapshot jsonb not null,
  deleted_by uuid references auth.users(id) on delete set null,
  deleted_at timestamptz not null default now(),
  reason text not null default 'Hapus permanen dari Gudang Arsip'
);
create index if not exists notification_deletion_audit_recipient_idx on public.notification_deletion_audit(recipient_id,deleted_at desc);
create table if not exists public.notification_template_deletion_audit (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null,
  event_code text not null,
  channel text not null,
  snapshot jsonb not null,
  deleted_by uuid references auth.users(id) on delete set null,
  deleted_at timestamptz not null default now(),
  reason text not null default 'Hapus permanen dari Gudang Arsip'
);
create index if not exists notification_template_deletion_audit_event_idx on public.notification_template_deletion_audit(event_code,channel,deleted_at desc);
alter table public.notification_deletion_audit enable row level security;
alter table public.notification_template_deletion_audit enable row level security;
drop policy if exists "production staff read notification_deletion_audit" on public.notification_deletion_audit;
create policy "production staff read notification_deletion_audit" on public.notification_deletion_audit for select to authenticated using(public.has_staff_role(array['owner','superadmin','super_admin','admin']));
drop policy if exists "production staff read notification_template_deletion_audit" on public.notification_template_deletion_audit;
create policy "production staff read notification_template_deletion_audit" on public.notification_template_deletion_audit for select to authenticated using(public.has_staff_role(array['owner','superadmin','super_admin','admin']));;
