-- DEBRODER v1.2 Phase 8 — Work Item foundation, lifecycle, assignment, dependency, audit, and security.
-- This migration is intentionally non-destructive and preserves existing operational data.

alter table public.work_items
  add column if not exists idempotency_key text,
  add column if not exists ready_by uuid references auth.users(id) on delete set null,
  add column if not exists ready_at timestamptz;

create unique index if not exists work_items_number_unique
  on public.work_items(work_item_number);
create unique index if not exists work_items_idempotency_unique
  on public.work_items(idempotency_key)
  where idempotency_key is not null;
create index if not exists work_items_archive_created_idx
  on public.work_items(archived_at,created_at desc);
create index if not exists work_items_job_status_target_idx
  on public.work_items(job_order_id,status,target_date);
create index if not exists work_items_assignee_status_target_idx
  on public.work_items(assigned_to,status,target_date);

create table if not exists public.work_item_revisions (
  id uuid primary key default gen_random_uuid(),
  work_item_id uuid not null references public.work_items(id) on delete restrict,
  revision_number integer not null,
  reason text not null check (btrim(reason) <> ''),
  previous_snapshot jsonb not null,
  new_snapshot jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(work_item_id,revision_number)
);
create index if not exists work_item_revisions_item_idx
  on public.work_item_revisions(work_item_id,revision_number desc);

create table if not exists public.work_item_dependency_history (
  id uuid primary key default gen_random_uuid(),
  work_item_id uuid not null,
  depends_on_work_item_id uuid not null,
  action text not null check (action in ('added','removed')),
  actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists work_item_dependency_history_item_idx
  on public.work_item_dependency_history(work_item_id,created_at desc);

create table if not exists public.work_item_deletion_audit (
  id uuid primary key default gen_random_uuid(),
  work_item_id uuid not null,
  work_item_number text,
  job_order_id uuid not null,
  snapshot jsonb not null,
  deleted_by uuid references auth.users(id) on delete set null,
  deleted_at timestamptz not null default now(),
  reason text not null default 'Hapus permanen dari Gudang Arsip'
);
create index if not exists work_item_deletion_audit_job_idx
  on public.work_item_deletion_audit(job_order_id,deleted_at desc);

insert into public.permission_definitions(permission_key,module,label,description)
values
  ('work_item.create','production','Buat Work Item','Membuat Work Item manual atau dari sumber Job Order.'),
  ('work_item.update','production','Perbarui Work Item','Mengubah detail Work Item sebelum dirilis.'),
  ('work_item.assign','production','Tugaskan Work Item','Menetapkan atau melepas penanggung jawab Work Item.'),
  ('work_item.archive','production','Arsipkan Work Item','Memindahkan dan memulihkan Work Item melalui Gudang Arsip.'),
  ('work_item.dependency','production','Kelola Dependensi Work Item','Menambah atau menghapus ketergantungan antar Work Item.'),
  ('work_item.status','production','Ubah Status Persiapan Work Item','Mengubah status Draft, Siap Dikerjakan, atau Dibatalkan sebelum produksi.'),
  ('work_item.delete','production','Hapus Permanen Work Item','Menghapus permanen Work Item arsip yang masih aman dihapus.')
on conflict(permission_key) do update set
  module=excluded.module,
  label=excluded.label,
  description=excluded.description;

insert into public.role_permissions(role,permission_key,granted)
select role_value,permission_key,true
from unnest(array['owner','superadmin','super_admin','admin']) role_value
cross join unnest(array[
  'work_item.create','work_item.update','work_item.assign','work_item.archive',
  'work_item.dependency','work_item.status'
]) permission_key
on conflict(role,permission_key) do update set granted=excluded.granted,updated_at=now();

insert into public.role_permissions(role,permission_key,granted)
select role_value,'work_item.delete',true
from unnest(array['superadmin','super_admin']) role_value
on conflict(role,permission_key) do update set granted=excluded.granted,updated_at=now();

create or replace function public.prevent_work_item_history_mutation()
returns trigger
language plpgsql
set search_path=''
as $$
begin
  if current_setting('debroder.work_item_permanent_delete',true)='on' then
    if tg_op='DELETE' then return old; end if;
    return new;
  end if;
  raise exception 'Riwayat Work Item bersifat permanen dan tidak dapat diubah';
end $$;

drop trigger if exists prevent_work_item_status_history_mutation on public.work_item_status_history;
create trigger prevent_work_item_status_history_mutation
before update or delete on public.work_item_status_history
for each row execute function public.prevent_work_item_history_mutation();

drop trigger if exists prevent_work_item_assignment_history_mutation on public.work_item_assignment_history;
create trigger prevent_work_item_assignment_history_mutation
before update or delete on public.work_item_assignment_history
for each row execute function public.prevent_work_item_history_mutation();

drop trigger if exists prevent_work_item_revision_mutation on public.work_item_revisions;
create trigger prevent_work_item_revision_mutation
before update or delete on public.work_item_revisions
for each row execute function public.prevent_work_item_history_mutation();

drop trigger if exists prevent_work_item_dependency_history_mutation on public.work_item_dependency_history;
create trigger prevent_work_item_dependency_history_mutation
before update or delete on public.work_item_dependency_history
for each row execute function public.prevent_work_item_history_mutation();

drop trigger if exists prevent_work_item_deletion_audit_mutation on public.work_item_deletion_audit;
create trigger prevent_work_item_deletion_audit_mutation
before update or delete on public.work_item_deletion_audit
for each row execute function public.prevent_work_item_history_mutation();

create or replace function public.set_work_item_updated_at()
returns trigger
language plpgsql
set search_path=''
as $$
begin
  new.updated_at=now();
  return new;
end $$;

drop trigger if exists set_work_item_updated_at on public.work_items;
create trigger set_work_item_updated_at
before update on public.work_items
for each row execute function public.set_work_item_updated_at();

