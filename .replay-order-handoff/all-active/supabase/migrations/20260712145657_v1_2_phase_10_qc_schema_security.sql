-- DEBRODER v1.2 Phase 10 — QC schema, lifecycle, audit, permissions, RLS, and storage security.

create table if not exists public.qc_records (
  id uuid primary key default gen_random_uuid(),
  qc_number text unique,
  job_order_id uuid not null references public.job_orders(id) on delete restrict,
  work_item_id uuid not null references public.work_items(id) on delete restrict,
  attempt_number integer not null,
  checked_quantity integer not null check (checked_quantity > 0),
  passed_quantity integer not null default 0 check (passed_quantity >= 0),
  failed_quantity integer not null default 0 check (failed_quantity >= 0),
  result text not null default 'pending' check (result in ('pending','passed','partial','failed','rework')),
  status text not null default 'draft' check (status in ('draft','in_review','finalized')),
  defect_notes text,
  inspector_id uuid references auth.users(id) on delete set null,
  inspection_started_at timestamptz,
  inspected_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  idempotency_key text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  archived_by uuid references auth.users(id) on delete set null,
  archive_reason text,
  unique(work_item_id,attempt_number),
  check (passed_quantity + failed_quantity <= checked_quantity)
);

alter table public.qc_records
  add column if not exists status text not null default 'draft',
  add column if not exists inspection_started_at timestamptz,
  add column if not exists idempotency_key text,
  add column if not exists updated_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.qc_records'::regclass and conname='qc_records_status_check'
  ) then
    alter table public.qc_records
      add constraint qc_records_status_check
      check (status in ('draft','in_review','finalized'));
  end if;
end $$;

create table if not exists public.qc_checklist_templates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  applies_to text not null default 'all',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  archived_by uuid references auth.users(id) on delete set null,
  archive_reason text
);

create table if not exists public.qc_checklist_results (
  id uuid primary key default gen_random_uuid(),
  qc_record_id uuid not null references public.qc_records(id) on delete cascade,
  template_id uuid references public.qc_checklist_templates(id) on delete restrict,
  code text not null,
  label text not null,
  result text not null,
  note text,
  sort_order integer not null default 0,
  unique(qc_record_id,code)
);

alter table public.qc_checklist_results
  drop constraint if exists qc_checklist_results_result_check;
alter table public.qc_checklist_results
  add constraint qc_checklist_results_result_check
  check (result in ('pending','pass','fail','not_applicable'));

create table if not exists public.qc_files (
  id uuid primary key default gen_random_uuid(),
  qc_record_id uuid not null references public.qc_records(id) on delete cascade,
  bucket text not null default 'qc-proofs' check (bucket='qc-proofs'),
  path text not null unique,
  file_name text not null,
  mime_type text not null check (mime_type in ('image/png','image/jpeg','image/webp','application/pdf')),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  uploaded_by uuid references auth.users(id) on delete set null,
  uploaded_at timestamptz not null default now()
);

create table if not exists public.qc_status_history (
  id uuid primary key default gen_random_uuid(),
  qc_record_id uuid not null references public.qc_records(id) on delete cascade,
  from_result text,
  to_result text not null,
  note text,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);

create table if not exists public.qc_record_revisions (
  id uuid primary key default gen_random_uuid(),
  qc_record_id uuid not null references public.qc_records(id) on delete restrict,
  revision_number integer not null,
  reason text not null check (btrim(reason)<>''),
  previous_snapshot jsonb not null,
  new_snapshot jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(qc_record_id,revision_number)
);

create table if not exists public.qc_deletion_audit (
  id uuid primary key default gen_random_uuid(),
  qc_record_id uuid not null,
  qc_number text,
  work_item_id uuid not null,
  job_order_id uuid not null,
  snapshot jsonb not null,
  deleted_by uuid references auth.users(id) on delete set null,
  deleted_at timestamptz not null default now(),
  reason text not null default 'Hapus permanen dari Gudang Arsip QC'
);

create index if not exists qc_records_work_item_idx on public.qc_records(work_item_id,attempt_number desc);
create index if not exists qc_records_job_idx on public.qc_records(job_order_id,result);
create index if not exists qc_records_archive_idx on public.qc_records(archived_at,created_at desc);
create unique index if not exists qc_records_idempotency_unique
  on public.qc_records(idempotency_key) where idempotency_key is not null;
create unique index if not exists qc_records_one_active_pending_per_work_item
  on public.qc_records(work_item_id)
  where archived_at is null and result='pending';
create index if not exists qc_record_revisions_idx on public.qc_record_revisions(qc_record_id,revision_number desc);
create index if not exists qc_deletion_audit_work_item_idx on public.qc_deletion_audit(work_item_id,deleted_at desc);

-- The production database has no QC rows when this alignment runs. Keep fresh rows strict.
do $$
begin
  if not exists(select 1 from public.qc_records where qc_number is null) then
    alter table public.qc_records alter column qc_number set not null;
  end if;
end $$;

insert into public.permission_definitions(permission_key,module,label,description)
values
 ('qc.view','qc','Lihat Quality Control','Melihat antrean, detail, riwayat, dan Gudang Arsip QC.'),
 ('qc.create','qc','Buat Pemeriksaan QC','Membuat pemeriksaan QC dari Work Item yang menunggu QC.'),
 ('qc.update','qc','Ubah Draft QC','Mengubah jumlah pemeriksaan, checklist, catatan, dan bukti sebelum finalisasi.'),
 ('qc.inspect','qc','Lakukan QC','Memulai pemeriksaan dan mengelola bukti QC.'),
 ('qc.approve','qc','Sahkan QC','Menetapkan hasil akhir lulus atau perlu perbaikan.'),
 ('qc.rework','qc','Kirim ke Perbaikan','Mengembalikan Work Item ke alur perbaikan.'),
 ('qc.archive','qc','Arsipkan QC','Memindahkan draft QC ke Gudang Arsip dan memulihkannya.'),
 ('qc.delete','qc','Hapus Permanen QC','Menghapus permanen draft QC dari Gudang Arsip; khusus Super Admin.')
on conflict(permission_key) do update
set module=excluded.module,label=excluded.label,description=excluded.description;

insert into public.role_permissions(role,permission_key,granted)
select role_name,permission_key,true
from unnest(array['owner','superadmin','super_admin','admin']) role_name
cross join unnest(array['qc.view','qc.create','qc.update','qc.inspect','qc.approve','qc.rework','qc.archive']) permission_key
on conflict(role,permission_key) do update set granted=excluded.granted,updated_at=now();

insert into public.role_permissions(role,permission_key,granted)
values ('superadmin','qc.delete',true),('super_admin','qc.delete',true)
on conflict(role,permission_key) do update set granted=excluded.granted,updated_at=now();

create or replace function public.set_qc_updated_at()
returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now(); return new; end $$;

drop trigger if exists set_qc_updated_at on public.qc_records;
create trigger set_qc_updated_at
before update on public.qc_records
for each row execute function public.set_qc_updated_at();

create or replace function public.prevent_qc_history_mutation()
returns trigger language plpgsql set search_path='' as $$
begin
  if current_setting('debroder.qc_permanent_delete',true)='on' then
    if tg_op='DELETE' then return old; end if;
    return new;
  end if;
  raise exception 'Riwayat Quality Control bersifat permanen dan tidak dapat diubah';
end $$;

drop trigger if exists prevent_qc_status_history_mutation on public.qc_status_history;
create trigger prevent_qc_status_history_mutation
before update or delete on public.qc_status_history
for each row execute function public.prevent_qc_history_mutation();

drop trigger if exists prevent_qc_record_revisions_mutation on public.qc_record_revisions;
create trigger prevent_qc_record_revisions_mutation
before update or delete on public.qc_record_revisions
for each row execute function public.prevent_qc_history_mutation();

drop trigger if exists prevent_qc_deletion_audit_mutation on public.qc_deletion_audit;
create trigger prevent_qc_deletion_audit_mutation
before update or delete on public.qc_deletion_audit
for each row execute function public.prevent_qc_history_mutation();

alter table public.qc_records enable row level security;
alter table public.qc_checklist_templates enable row level security;
alter table public.qc_checklist_results enable row level security;
alter table public.qc_files enable row level security;
alter table public.qc_status_history enable row level security;
alter table public.qc_record_revisions enable row level security;
alter table public.qc_deletion_audit enable row level security;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'qc_records','qc_checklist_templates','qc_checklist_results','qc_files',
    'qc_status_history','qc_record_revisions','qc_deletion_audit'
  ] loop
    execute format('drop policy if exists "staff read %s" on public.%I',table_name,table_name);
    execute format('drop policy if exists "production staff read %s" on public.%I',table_name,table_name);
    execute format('drop policy if exists "quality staff read %s" on public.%I',table_name,table_name);
    execute format(
      'create policy "quality staff read %s" on public.%I for select to authenticated using(public.has_permission(''qc.view''))',
      table_name,table_name
    );
  end loop;
end $$;

revoke all on public.qc_records,public.qc_checklist_templates,public.qc_checklist_results,
 public.qc_files,public.qc_status_history,public.qc_record_revisions,public.qc_deletion_audit
from public,anon;
revoke insert,update,delete,truncate,references,trigger on public.qc_records,public.qc_checklist_templates,
 public.qc_checklist_results,public.qc_files,public.qc_status_history,public.qc_record_revisions,
 public.qc_deletion_audit from authenticated;
grant select on public.qc_records,public.qc_checklist_templates,public.qc_checklist_results,
 public.qc_files,public.qc_status_history,public.qc_record_revisions,public.qc_deletion_audit
to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('qc-proofs','qc-proofs',false,10485760,array['image/png','image/jpeg','image/webp','application/pdf'])
on conflict(id) do update
set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "staff manage qc proof objects" on storage.objects;
drop policy if exists "staff read qc proof objects" on storage.objects;
drop policy if exists "staff upload qc proof objects" on storage.objects;
drop policy if exists "super admin delete qc proof objects" on storage.objects;
drop policy if exists "staff delete editable qc proof objects" on storage.objects;

create policy "staff read qc proof objects" on storage.objects
for select to authenticated
using(bucket_id='qc-proofs' and public.has_permission('qc.view'));

create policy "staff upload qc proof objects" on storage.objects
for insert to authenticated
with check(bucket_id='qc-proofs' and owner=auth.uid() and public.has_permission('qc.inspect'));

create policy "staff delete editable qc proof objects" on storage.objects
for delete to authenticated
using(bucket_id='qc-proofs' and owner=auth.uid() and public.has_permission('qc.update'));

create policy "super admin delete qc proof objects" on storage.objects
for delete to authenticated
using(bucket_id='qc-proofs' and public.has_permission('qc.delete'));
